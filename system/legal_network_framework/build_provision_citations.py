"""
build_provision_citations.py — PASAL-LEVEL citation ground truth (full text)
============================================================================
Why: the instrument-level layer (build_citations.py → citations.json) only
records "document X cites instrument Y" with a 90-char snippet. For a defensible
ground truth we need finer granularity and the VERBATIM provision text:

    find a PASAL (in any pedoman/regulation) that mentions ANOTHER pasal or a
    regulation, and extract that pasal's FULL paragraph text — one whole
    paragraph as written — per citation (per sitiran).

Three kinds of citation are detected inside every provision:
  • pasal_internal  — "…sebagaimana dimaksud dalam Pasal 2 ayat (2)…" with no
                      regulation qualifier → a pasal in the SAME document.
  • pasal_external  — "Pasal 26 Undang-Undang Nomor 19 Tahun 2016" → a pasal in
                      ANOTHER regulation (qualifier follows the pasal number).
  • regulation/named — the whole instrument is cited by number ("UU 11/2008")
                      or by name ("OECD AI Principles", "EU AI Act").

Source text = the full provision text from provision_texts.json (cleaned,
the same text the dashboard shows when a node is clicked). The instrument-level
citations.json is NOT touched, so the validated Disitir/Menyitir authority
numbers stay intact; this is an additional, richer layer.

Output:
  data/network/provision_citations.json   (structured: every sitiran + full text)
  data/network/provision_citations.csv    (flat ground-truth table)
  data/network/provision_citations.md      (human-readable ground truth)
Run:  python build_provision_citations.py
"""
import os, re, json, csv

# reuse the numbered-regulation patterns + named-instrument gazetteer + resolvers
from build_citations import PATS, INSTR, NAME, TO_CORPUS, _resolve, _norm, _year_ok
from prov_cite_overrides import record_id, load_overrides, apply_overrides

NET = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network')
PROV_TEXTS = os.path.join(NET, 'provision_texts.json')
OUT_JSON = os.path.join(NET, 'provision_citations.json')
OUT_CSV = os.path.join(NET, 'provision_citations.csv')
OUT_MD = os.path.join(NET, 'provision_citations.md')

YEAR = r'(\d[\d\s]{2,4}\d)'

# a "Pasal N [ayat (M)] [huruf x]" reference token
PASAL_RE = re.compile(r'Pasal\s+(\d+[A-Za-z]?)((?:\s+ayat\s*\(\s*\d+\s*\))?(?:\s+huruf\s+[a-z])?)', re.I)

# "Undang-Undang Dasar … 1945" / "UUD 1945" right after a pasal token
UUD_RE = re.compile(r'^\s*(?:Undang[-\s]?Undang\s+Dasar\b[\w\s]{0,40}?1945|UUD\s*(?:1945|Negara))', re.I)


def _doc_prov(label):
    doc, _, prov = label.partition(' - ')
    return doc, prov


def _pasal_title(num):
    return f'Pasal {num}'


def _ocr_num(num):
    """Conservative OCR digit-repair for matching a cited pasal number against the
    extracted provision titles only (the verbatim cited_ref keeps the raw form).
    Scanned PDFs garble digits: O→0, l/L/I→1. e.g. 'Pasal 4O' → 'Pasal 40'."""
    return num.translate(str.maketrans({'O': '0', 'o': '0', 'l': '1', 'L': '1', 'I': '1'}))


def _qualifier_after(tail):
    """A regulation that qualifies a preceding "Pasal N" → makes it an EXTERNAL
    pasal reference. Returns (qualifier_label, corpus_doc_or_None) or None.
    Looks only at text immediately after the pasal token (a 'jo.' bridge is ok)."""
    head = tail[:140]
    for cid, nm, s, e in _detect_numbered(head):
        if s <= 8:                                   # must hug the pasal token
            return cid, TO_CORPUS.get(cid)
    if UUD_RE.match(head):
        return 'UUD 1945', None
    return None


def _detect_numbered(text):
    """All numbered-regulation citations in a provision → list of (cid, name, span)."""
    out = []
    for kind, pat in PATS:
        for m in re.finditer(pat, text, re.I):
            cid = _norm(kind, m.group(1), m.group(2))
            if not _year_ok(cid):
                continue
            out.append((cid, NAME.get(cid, cid), m.start(), m.end()))
    return out


def _detect_named(text, basenames, self_doc):
    """All named-instrument citations (gazetteer) in a provision."""
    out = []
    for ins in INSTR:
        tgt = _resolve(ins['doc'], basenames)
        if tgt == self_doc:
            continue
        for alias in ins['aliases']:
            for m in re.finditer(alias, text, re.I):
                out.append((ins['id'], tgt, ins.get('note'), m.start(), m.end()))
                break  # one representative span per alias is enough
    return out


def main():
    if not os.path.exists(PROV_TEXTS):
        raise SystemExit('provision_texts.json tidak ditemukan — jalankan build_provision_texts.py dulu.')
    prov_texts = json.load(open(PROV_TEXTS, encoding='utf-8'))

    # index: doc -> set of provision titles it actually has (for internal resolution)
    doc_provs = {}
    for label in prov_texts:
        doc, prov = _doc_prov(label)
        doc_provs.setdefault(doc, set()).add(prov)
    basenames = list(doc_provs.keys())

    # a doc is "structured" if it was split on real Pasal/Article/Section headings;
    # chunked soft-law (titles = "Bagian N") has no own pasal, so any "Pasal N" it
    # mentions is an EXTERNAL reference to another law in prose, never a self-citation.
    structured = {doc for doc, provs in doc_provs.items()
                  if any(p.split()[0] in ('Pasal', 'Article', 'Section', 'Principle') for p in provs)}

    records = []
    for label, text in prov_texts.items():
        src_doc, src_prov = _doc_prov(label)
        src_num = None
        mnum = re.match(r'Pasal\s+(\d+[A-Za-z]?)', src_prov, re.I)
        if mnum:
            src_num = mnum.group(1).lower()

        seen = set()  # dedupe per (kind, normalized-ref) within this provision

        def add(kind, cited_ref, cited_norm, cited_doc, cited_prov, in_corpus, note=None):
            key = (kind, cited_norm)
            if key in seen:
                for r in records:
                    if r['source_label'] == label and r['kind'] == kind and r['cited_norm'] == cited_norm:
                        r['count'] += 1
                        return
            seen.add(key)
            records.append({
                'source_doc': src_doc, 'source_prov': src_prov, 'source_label': label,
                'source_text': text,
                'kind': kind, 'cited_ref': cited_ref, 'cited_norm': cited_norm,
                'cited_doc': cited_doc, 'cited_prov': cited_prov,
                'cited_in_corpus': in_corpus, 'note': note, 'count': 1,
            })

        # ── 1) numbered-regulation citations (instrument level, external) ──
        for cid, nm, s, e in _detect_numbered(text):
            corpus_doc = TO_CORPUS.get(cid)
            if corpus_doc == src_doc:
                continue  # self
            add('regulation', cid, cid, corpus_doc, None, bool(corpus_doc), nm if nm != cid else None)

        # ── 2) named-instrument citations (gazetteer) ──
        for cid, tgt, note, s, e in _detect_named(text, basenames, src_doc):
            add('named', cid, cid, tgt, None, bool(tgt), note)

        # ── 3) pasal references: classify internal vs external ──
        for m in PASAL_RE.finditer(text):
            num = m.group(1)
            suffix = (m.group(2) or '').strip()
            base = f'Pasal {num}' + (f' {suffix}' if suffix else '')
            base = ' '.join(base.split())
            qual = _qualifier_after(text[m.end():m.end() + 150])
            if qual:
                # EXTERNAL: "Pasal N <Regulation>" — keep the qualifier in the ref
                qlabel, cited_doc = qual
                if cited_doc == src_doc:
                    continue  # self (e.g. UU ITE citing its own number)
                ref = f'{base} {qlabel}'
                add('pasal_external', ref, ref, cited_doc, _pasal_title(num), bool(cited_doc))
            elif src_doc not in structured or src_prov == 'Pembukaan':
                # chunk soft-law (or a preamble/dasar-hukum block) mentioning "Pasal N"
                # with no qualifier → external; the referenced law isn't this document
                add('pasal_external', base, base, None, _pasal_title(num), False)
            else:
                # INTERNAL pasal ref (same statute); skip self-reference
                ref = base
                if src_num and num.lower() == src_num:
                    continue
                cited_prov = _pasal_title(num)
                fixed = _pasal_title(_ocr_num(num))        # OCR-repaired title for linkage
                provs_here = doc_provs.get(src_doc, set())
                in_corpus = cited_prov in provs_here or fixed in provs_here
                resolved = cited_prov if cited_prov in provs_here else (fixed if fixed in provs_here else cited_prov)
                add('pasal_internal', ref, resolved, src_doc, resolved, in_corpus)

    # ── collapse DOUBLE-COUNTS: one passage citing the SAME corpus instrument via
    # multiple surface forms (e.g. named "UU ITE" + numbered "UU 11/2008", which both
    # resolve to UU_ITE_No19_2016) is ONE citation. Keep the most specific form
    # (numbered/pasal_external > named), fold the rest into merged_refs, drop them.
    _KEEP_PRI = {'regulation': 0, 'pasal_external': 1, 'named': 2}
    groups, kept = {}, []
    for r in records:
        if r['kind'] in _KEEP_PRI and r.get('cited_doc'):
            groups.setdefault((r['source_label'], r['cited_doc']), []).append(r)
        else:
            kept.append(r)
    n_collapsed = 0
    for g in groups.values():
        if len(g) == 1:
            kept.append(g[0]); continue
        g.sort(key=lambda r: (_KEEP_PRI.get(r['kind'], 9), -r.get('count', 1)))
        win = g[0]
        win['merged_refs'] = [x['cited_ref'] for x in g[1:]]   # transparency: what was folded in
        kept.append(win)
        n_collapsed += len(g) - 1
    records = kept

    # stable id per record, then merge human overrides (edits/deletes/adds win)
    for r in records:
        r['id'] = record_id(r)
    ov = load_overrides()
    n_auto = len(records)
    records = apply_overrides(records, ov)
    n_manual = sum(1 for r in records if r.get('manual'))
    n_edited = sum(1 for r in records if r.get('edited'))

    records.sort(key=lambda r: (r['source_doc'], _provsort(r['source_prov']), r['kind']))

    # ── stats ──
    by_kind = {}
    for r in records:
        by_kind[r['kind']] = by_kind.get(r['kind'], 0) + 1
    payload = {
        'n_records': len(records),
        'by_kind': by_kind,
        'n_source_provisions': len({r['source_label'] for r in records}),
        'n_auto': n_auto, 'n_manual': n_manual, 'n_edited': n_edited,
        'records': records,
    }
    json.dump(payload, open(OUT_JSON, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

    # ── flat CSV (ground truth) ──
    with open(OUT_CSV, 'w', encoding='utf-8', newline='') as f:
        w = csv.writer(f)
        w.writerow(['source_doc', 'source_prov', 'kind', 'cited_ref', 'cited_doc',
                    'cited_prov', 'cited_in_corpus', 'count', 'source_text'])
        for r in records:
            w.writerow([r['source_doc'], r['source_prov'], r['kind'], r['cited_ref'],
                        r['cited_doc'] or '', r['cited_prov'] or '', r['cited_in_corpus'],
                        r['count'], r['source_text']])

    # ── human-readable markdown ground truth ──
    KIND_ID = {'pasal_internal': 'pasal→pasal (internal)', 'pasal_external': 'pasal→pasal (antar-regulasi)',
               'regulation': 'pasal→regulasi (bernomor)', 'named': 'pasal→instrumen (bernama)'}
    with open(OUT_MD, 'w', encoding='utf-8') as f:
        f.write('# Ground Truth Sitiran Antar-Pasal (teks paragraf utuh)\n\n')
        f.write(f'Total **{len(records)} sitiran** dari **{payload["n_source_provisions"]} pasal sumber**. '
                'Tiap baris = satu pasal yang menyebut pasal/regulasi lain, dengan teks paragraf pasal sumber **apa adanya**.\n\n')
        f.write('| Jenis | Jumlah |\n| --- | --- |\n')
        for k, v in sorted(by_kind.items(), key=lambda x: -x[1]):
            f.write(f'| {KIND_ID.get(k, k)} | {v} |\n')
        f.write('\n---\n\n')
        cur = None
        for r in records:
            if r['source_doc'] != cur:
                cur = r['source_doc']
                f.write(f'\n## {cur}\n\n')
            tgt = r['cited_doc'] or ('(eksternal/di luar korpus)' if r['kind'] in ('pasal_external', 'regulation', 'named') else '')
            f.write(f"### {r['source_prov']} → {r['cited_ref']}  ·  _{KIND_ID.get(r['kind'], r['kind'])}_\n")
            f.write(f"- **Menyebut:** `{r['cited_ref']}`"
                    + (f" → `{tgt}`" if tgt else '')
                    + (f" ({r['count']}×)" if r['count'] > 1 else '') + '\n')
            f.write(f"- **Teks utuh {r['source_prov']} ({r['source_doc']}):**\n\n")
            f.write(f"  > {r['source_text']}\n\n")

    print(f"✅ provision_citations: {len(records)} sitiran dari {payload['n_source_provisions']} pasal sumber"
          + (f"  (double-count diciutkan: {n_collapsed})" if n_collapsed else "")
          + (f"  (auto {n_auto}, manual +{n_manual}, diedit {n_edited})" if (n_manual or n_edited) else ""))
    for k, v in sorted(by_kind.items(), key=lambda x: -x[1]):
        print(f"   • {KIND_ID.get(k, k):32s} {v}")
    print(f"   ↳ {OUT_JSON}")
    print(f"   ↳ {OUT_CSV}")
    print(f"   ↳ {OUT_MD}")


def _provsort(prov):
    m = re.search(r'(\d+)', prov)
    return (int(m.group(1)) if m else 9999, prov)


if __name__ == '__main__':
    main()
