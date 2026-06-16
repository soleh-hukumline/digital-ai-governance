"""
judge_citations.py — Gemini (LLM-as-judge) validation of pasal-level citations
==============================================================================
Why: the auto-extractor (build_provision_citations.py) over-detects in scanned
soft-law PDFs that were split into "Bagian" chunks — the chunks include
front-matter, so the named-instrument gazetteer fires on CONTRIBUTOR LISTS
("…Lee Hibbard, Council of Europe, France…") and ACRONYM GLOSSARIES
("…EU GDPR HIC IP LMIC NHS OECD…"), which are NOT real citations. This judge
reads each candidate's verbatim context and decides REAL citation vs NOISE.

Mirrors llm_judge.py exactly: Gemini 2.5 Flash via curl, key from ../../.gemini_key,
temperature 0, JSON output. Soft-law "chunk" documents are judged first (that is
where the noise concentrates).

Output: data/network/citation_judgments.json
  { model, n, judgments: { <record id>: {is_citation, context_type, confidence,
    reason, source_doc, source_prov, cited_ref, kind} }, by_doc: {...} }

Run (sandbox OFF for network egress):
  python judge_citations.py                 # all cross-doc candidates (chunk docs first)
  python judge_citations.py --doc WHO       # only documents whose name contains "WHO"
  python judge_citations.py --limit 8       # cap candidates (quick test)
  python judge_citations.py --all-kinds     # also judge internal pasal->pasal refs
"""
import os, re, sys, json, time
from llm_judge import gemini, parse_json, KEY_PATH, MODEL

NET = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network')
PC = os.path.join(NET, 'provision_citations.json')
OUT = os.path.join(NET, 'citation_judgments.json')
CROSS = ('named', 'regulation', 'pasal_external')
BATCH = 10                      # candidates per Gemini call

CTX_TYPES = ('normative_citation', 'legal_basis_list', 'affiliation_list',
             'acronym_glossary', 'toc_bibliography', 'incidental')


def _friendly(doc):
    from build_citations import _norm  # noqa: F401 (ensure module import path)
    return doc.replace('_', ' ')


def snippet(rec, width=230):
    """A focused verbatim window around the detected citation, for the judge."""
    t = rec.get('source_text') or ''
    keys = []
    if rec['kind'] in ('regulation', 'pasal_external'):
        m = re.search(r'(\d+)\s*/\s*(\d{4})', rec.get('cited_norm', ''))
        if m:
            keys += [rf"{m.group(1)}\s+Tahun\s+{m.group(2)}", rf"{re.escape(m.group(1))}/{m.group(2)}"]
        mp = re.search(r'Pasal\s+\d+[A-Za-z]?', rec.get('cited_ref', ''))
        if mp:
            keys.append(re.escape(mp.group(0)))
    else:  # named — first words of the instrument name
        words = (rec.get('cited_ref') or '').split()
        if words:
            keys += [re.escape(' '.join(words[:3])), re.escape(words[0])]
    pos = -1
    for k in keys:
        try:
            m = re.search(k, t, re.I)
        except re.error:
            m = None
        if m:
            pos = m.start(); break
    if pos < 0:
        return t[:2 * width].strip()
    s = max(0, pos - width)
    return ('…' if s > 0 else '') + t[s:pos + width].strip() + ('…' if pos + width < len(t) else '')


def build_prompt(doc, batch):
    lines = []
    for i, r in enumerate(batch):
        tgt = r.get('cited_ref', '')
        lines.append(f'{i}. TARGET: "{tgt}"  | SNIPPET: {snippet(r)}')
    return (
        'You audit automatically-extracted legal CITATIONS from Indonesian AI-governance '
        'documents (often scanned PDFs split into sections, so front-matter leaks in). '
        f'Every candidate below comes from the document "{_friendly(doc)}" and allegedly '
        'cites/refers to a TARGET legal instrument. For EACH, decide whether the SNIPPET '
        'genuinely invokes that instrument as a legal/normative reference, or is a FALSE '
        'POSITIVE where the name merely appears incidentally.\n\n'
        'FALSE POSITIVE (is_citation=false): author/contributor/affiliation roster '
        '("…Lee Hibbard, Council of Europe, France…"); acronym/abbreviation glossary '
        '("…EU GDPR HIC IP LMIC OECD…"); table of contents / heading; bibliography; a '
        'country/organisation name in a list; unrelated incidental mention.\n'
        'TRUE (is_citation=true): the text invokes the instrument as a legal basis, an '
        'aligned/prior framework, a standard to comply with, or a substantive cross-reference.\n\n'
        'context_type ∈ {normative_citation, legal_basis_list, affiliation_list, '
        'acronym_glossary, toc_bibliography, incidental}.\n\n'
        f'CANDIDATES:\n' + '\n'.join(lines) + '\n\n'
        'Return ONLY a JSON array, one object per candidate index i: '
        '[{"i":0,"is_citation":true,"context_type":"normative_citation","confidence":0-100,'
        '"reason":"<=14 words"}].')


def main():
    argv = sys.argv[1:]
    doc_filter = argv[argv.index('--doc') + 1].lower() if '--doc' in argv else None
    limit = int(argv[argv.index('--limit') + 1]) if '--limit' in argv else None
    for a in argv:
        if a.isdigit():
            limit = int(a)
    all_kinds = '--all-kinds' in argv

    data = json.load(open(PC, encoding='utf-8'))
    recs = data['records']
    # merge with prior judgments by default (incremental runs accumulate); --fresh resets
    judgments = {}
    if '--fresh' not in argv and os.path.exists(OUT):
        try:
            judgments = json.load(open(OUT, encoding='utf-8')).get('judgments', {})
        except Exception:
            judgments = {}
    kinds = (CROSS + ('pasal_internal',)) if all_kinds else CROSS
    cand = [r for r in recs if r['kind'] in kinds and r.get('id')]
    if doc_filter:
        cand = [r for r in cand if doc_filter in r['source_doc'].lower()]
    # skip candidates already judged (incremental); --fresh or --rejudge re-judges all
    if '--fresh' not in argv and '--rejudge' not in argv:
        prior = set(judgments)
        cand = [r for r in cand if r['id'] not in prior]

    # group by document; soft-law "chunk" docs (source_prov starts with "Bagian") FIRST
    docs = {}
    for r in cand:
        docs.setdefault(r['source_doc'], []).append(r)
    is_chunk = {d: any(r['source_prov'].startswith('Bagian') for r in rs) for d, rs in docs.items()}
    order = sorted(docs, key=lambda d: (not is_chunk[d], d))

    key = open(KEY_PATH).read().strip()
    judged = 0
    for d in order:
        rows = docs[d]
        for b0 in range(0, len(rows), BATCH):
            if limit and judged >= limit:
                break
            batch = rows[b0:b0 + BATCH]
            if limit:
                batch = batch[:max(0, limit - judged)]
            resp = gemini(build_prompt(d, batch), key)
            arr = parse_json(resp) or []
            byi = {int(o.get('i', -1)): o for o in arr if isinstance(o, dict)}
            for i, r in enumerate(batch):
                o = byi.get(i, {})
                ct = str(o.get('context_type', '')).strip()
                judgments[r['id']] = {
                    'is_citation': bool(o.get('is_citation', True)),
                    'context_type': ct if ct in CTX_TYPES else 'unknown',
                    'confidence': int(o.get('confidence', 0) or 0),
                    'reason': str(o.get('reason', ''))[:140],
                    'source_doc': r['source_doc'], 'source_prov': r['source_prov'],
                    'cited_ref': r.get('cited_ref', ''), 'kind': r['kind'],
                }
            judged += len(batch)
            tag = 'chunk' if is_chunk[d] else 'struct'
            real = sum(1 for r in batch if judgments[r['id']]['is_citation'])
            print(f'  [{tag}] {_friendly(d)[:40]:40s} batch {len(batch):2d} → {real} real / {len(batch) - real} noise')
            time.sleep(0.4)
        if limit and judged >= limit:
            break

    by_doc = {}
    for jid, j in judgments.items():
        d = j['source_doc']
        s = by_doc.setdefault(d, {'real': 0, 'noise': 0})
        s['real' if j['is_citation'] else 'noise'] += 1
    json.dump({'model': MODEL, 'n': len(judgments), 'judgments': judgments, 'by_doc': by_doc},
              open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

    n_noise = sum(1 for j in judgments.values() if not j['is_citation'])
    print(f'\n✅ {OUT}\n   {len(judgments)} candidates judged · {len(judgments) - n_noise} real · {n_noise} NOISE')
    print('   — per dokumen (real/noise) —')
    for d in sorted(by_doc, key=lambda x: -by_doc[x]['noise']):
        s = by_doc[d]
        print(f'   {s["real"]:>3} real  {s["noise"]:>3} noise   {_friendly(d)}')


if __name__ == '__main__':
    main()
