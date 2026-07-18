"""
build_citations.py — explicit regulatory CROSS-REFERENCE (citation) extractor
=============================================================================
Why: for guidance/soft-law documents (Stranas AI, SE Komdigi, ASEAN, OECD ...)
semantic similarity is ambiguous and over-connects. A defensible link is an
EXPLICIT mention: where a document cites a real regulation by number/year, e.g.
  "...sebagaimana diatur dalam Peraturan Menteri Kominfo Nomor 3 Tahun 2021..."
This scans every corpus document's full text for such mentions and builds a
directed citation network (document -> cited regulation), separating regulations
that are IN the corpus from those merely REFERENCED (a corpus-completeness gap).

Output: data/network/citations.json (+ console summary).
Run:    python build_citations.py
"""
import os, glob, re, json
import builder
from pdfminer.high_level import extract_text

NET = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network')
OUT = os.path.join(NET, 'citations.json')

YEAR = r'(\d[\d\s]{2,4}\d)'  # tolerate scan-garble like "Tahun 202 1"
PATS = [
    # full form: "<Instrumen> Nomor N Tahun YYYY"
    ('UU',      r'Undang[-\s]?Undang(?:\s+Republik\s+Indonesia)?\s+Nomor\s+(\d+)\s+Tahun\s+' + YEAR),
    ('PP',      r'Peraturan\s+Pemerintah(?:\s+Republik\s+Indonesia)?\s+Nomor\s+(\d+)\s+Tahun\s+' + YEAR),
    ('Permen',  r'Peraturan\s+Menteri\s+[A-Za-z ]{3,40}?\s+Nomor\s+(\d+)\s+Tahun\s+' + YEAR),
    ('Perpres', r'Peraturan\s+Presiden(?:\s+Republik\s+Indonesia)?\s+Nomor\s+(\d+)\s+Tahun\s+' + YEAR),
    ('Keppres', r'Keputusan\s+Presiden(?:\s+Republik\s+Indonesia)?\s+Nomor\s+(\d+)\s+Tahun\s+' + YEAR),
    ('Inpres',  r'Instruksi\s+Presiden(?:\s+Republik\s+Indonesia)?\s+Nomor\s+(\d+)\s+Tahun\s+' + YEAR),
    ('Permenkes', r'Peraturan\s+Menteri\s+Kesehatan[\w\s]{0,20}?Nomor\s+(\d+)\s+Tahun\s+' + YEAR),
    ('Perban',  r'Peraturan\s+Badan[\w\s]{0,40}?Nomor\s+(\d+)\s+Tahun\s+' + YEAR),
    ('POJK',    r'(?:Peraturan\s+Otoritas\s+Jasa\s+Keuangan|POJK)\s+Nomor\s+([\w./]+)\s+Tahun\s+' + YEAR),
    ('SE',      r'Surat\s+Edaran\s+[A-Za-z ]{3,40}?\s+Nomor\s+([\w./]+)\s+Tahun\s+' + YEAR),
    # abbreviated/slash forms: "UU 27/2022", "UU No. 27 Tahun 2022", "PP 71/2019"
    ('UU',      r'\bUU\s+(?:No\.?\s*|Nomor\s+)?(\d+)\s*/\s*' + YEAR),
    ('UU',      r'\bUU\s+(?:No\.?\s*|Nomor\s+)(\d+)\s+Tahun\s+' + YEAR),
    ('PP',      r'\bPP\s+(?:No\.?\s*|Nomor\s+)?(\d+)\s*/\s*' + YEAR),
    ('Perpres', r'\bPerpres\s+(?:No\.?\s*|Nomor\s+)?(\d+)\s*/\s*' + YEAR),
]

# friendly names + which cited ids map to a document already in the corpus
NAME = {
    'UU 11/2008': 'UU ITE (asli)', 'UU 19/2016': 'UU ITE (perubahan I)',
    'UU 1/2024': 'UU ITE (perubahan II)', 'UU 27/2022': 'UU PDP',
    'PP 71/2019': 'PP PSTE', 'PP 82/2012': 'PP PSTE (lama, dicabut)',
    'Permen 3/2021': 'Permenkominfo 3/2021 (Standar Kegiatan Usaha)',
    'Permen 5/2020': 'Permenkominfo 5/2020 (PSE Lingkup Privat)',
    'UU 4/2023': 'UU P2SK', 'UU 21/2011': 'UU OJK', 'UU 6/2023': 'UU Cipta Kerja',
    'Perpres 38/2018': 'Perpres 38/2018 (Riset Prioritas)',
}
# cited id -> corpus document id (lineage-aware: ITE original/amendments share docs)
TO_CORPUS = {
    'UU 27/2022': 'UU_PDP_No27_2022', 'PP 71/2019': 'PP_PSTE_No71_2019',
    'UU 19/2016': 'UU_ITE_No19_2016', 'UU 1/2024': 'UU_ITE_No1_2024',
    'UU 11/2008': 'UU_ITE_No19_2016',  # original ITE, represented by its consolidations
}


# ── named-instrument gazetteer: pedoman/guidelines cite each other by NAME,
#    not "Nomor/Tahun". `doc` is a prefix matched against actual corpus basenames;
#    None = referenced instrument not present as its own document.
INSTR = [
    {'id': 'OECD AI Principles', 'doc': 'OECD_AI_Principles', 'aliases': [
        r'OECD\s+AI\s+Principles', r'Prinsip[- ]?prinsip\s+AI\s+OECD',
        r'Recommendation\s+of\s+the\s+Council\s+on\s+Artificial\s+Intelligence']},
    {'id': 'G20 AI Principles', 'doc': None, 'note': '≈ OECD AI Principles (G20 mengadopsi 2019)',
     'aliases': [r'G20\s+AI\s+Principles', r'prinsip[- ]?prinsip\s+Kecerdasan\s+Artifisial\s+G20',
                 r'Prinsip\s+AI\s+G20']},
    {'id': 'UNESCO Recommendation on AI Ethics', 'doc': 'UNESCO_Recommendation', 'aliases': [
        r'UNESCO\s+Recommendation', r'Rekomendasi\s+UNESCO',
        r'Recommendation\s+on\s+the\s+Ethics\s+of\s+Artificial\s+Intelligence']},
    {'id': 'EU AI Act', 'doc': 'EU_AI_Act', 'aliases': [
        r'EU\s+AI\s+Act', r'Artificial\s+Intelligence\s+Act', r'\bAI\s+Act\b',
        r'Regulation\s+\(EU\)\s+2024/1689']},
    {'id': 'G7 Hiroshima Code of Conduct', 'doc': 'G7_Hiroshima', 'aliases': [
        r'Hiroshima', r'G7\s+.{0,30}Code\s+of\s+Conduct']},
    {'id': 'ASEAN Guide on AI Governance', 'doc': 'ASEAN_Guide', 'aliases': [
        r'ASEAN\s+Guide\s+on\s+AI', r'ASEAN\s+.{0,20}AI\s+Governance\s+and\s+Ethics',
        r'Panduan\s+ASEAN']},
    {'id': 'ISO/IEC 42001', 'doc': 'ISO_IEC_42001', 'aliases': [r'ISO/?\s?IEC\s*42001', r'ISO\s*42001']},
    # Audit 2026-07-18: alias longgar r'Council\s+of\s+Europe' menghasilkan 23 false
    # positive (22 baris AFILIASI di WHO 2021 — terbit sebelum Konvensi diadopsi
    # 17 Mei 2024 — dan 1 penyebutan organisasi di OECD). Wajibkan nama Konvensi/CETS.
    {'id': 'Council of Europe Framework Convention on AI', 'doc': 'Council_of_Europe', 'aliases': [
        r'Council\s+of\s+Europe\s+Framework\s+Convention',
        r'Framework\s+Convention\s+on\s+Artificial\s+Intelligence', r'CETS\s*(?:No\.?\s*)?225']},
    # Audit 2026-07-18: alias frasa generik 'Safe, Secure and Trustworthy' kena wording
    # G7 Hiroshima CoC (Okt 2023 — mendahului resolusi 21 Mar 2024). Cukup by-number.
    {'id': 'UNGA Res 78/265 (Safe, Secure, Trustworthy AI)', 'doc': 'UNGA_Res_78_265', 'aliases': [
        r'78/265']},
    {'id': 'Global Digital Compact (UNGA 78/311)', 'doc': 'UNGA_Res_78_311', 'aliases': [
        r'Global\s+Digital\s+Compact', r'78/311']},
    {'id': 'WHO Ethics & Governance of AI for Health', 'doc': 'WHO_Ethics', 'aliases': [
        r'WHO\s+.{0,30}AI\s+for\s+Health',
        r'Ethics\s+and\s+Governance\s+of\s+Artificial\s+Intelligence\s+for\s+Health']},
    {'id': 'Strategi Nasional KA (Stranas AI)', 'doc': 'Stranas_AI', 'aliases': [
        r'Strategi\s+Nasional\s+Kecerdasan\s+Artifisial', r'Stranas\s+(?:AI|KA)']},
    {'id': 'SE Komdigi Etika AI', 'doc': 'SE_Komdigi', 'aliases': [
        r'Surat\s+Edaran\s+.{0,40}Etika\s+Kecerdasan\s+Artifisial']},
    {'id': 'UU PDP', 'doc': 'UU_PDP', 'aliases': [
        r'Undang[- ]?Undang\s+(?:tentang\s+)?Pelindungan\s+Data\s+Pribadi', r'\bUU\s+PDP\b']},
    {'id': 'UU ITE', 'doc': 'UU_ITE_No19_2016', 'aliases': [
        r'\bUU\s+ITE\b', r'tentang\s+Informasi\s+dan\s+Transaksi\s+Elektronik',
        r'\bITE\s+Law\b']},
    {'id': 'PP PSTE', 'doc': 'PP_PSTE', 'aliases': [
        r'tentang\s+Penyelenggaraan\s+Sistem\s+dan\s+Transaksi\s+Elektronik', r'\bPP\s+PSTE\b']},
    # ── constitutional / foundational ──
    {'id': 'UUD 1945', 'doc': None, 'aliases': [
        r'Undang[- ]?Undang\s+Dasar\s+(?:Negara\s+Republik\s+Indonesia\s+)?(?:Tahun\s+)?1945',
        r'\bUUD\s+(?:Negara\s+Republik\s+Indonesia\s+)?(?:Tahun\s+)?1945', r'\bUUD\s*1945']},
    # ── international legal instruments cited by guidelines (different styles) ──
    {'id': 'GDPR (EU 2016/679)', 'doc': None, 'aliases': [
        r'\bGDPR\b', r'General\s+Data\s+Protection\s+Regulation', r'Regulation\s+\(EU\)\s+2016/679']},
    {'id': 'Universal Declaration of Human Rights', 'doc': None, 'aliases': [
        r'Universal\s+Declaration\s+of\s+Human\s+Rights', r'\bUDHR\b',
        r'Deklarasi\s+Universal\s+Hak[- ]?Hak\s+Asasi\s+Manusia']},
    {'id': 'ICCPR', 'doc': None, 'aliases': [
        r'International\s+Covenant\s+on\s+Civil\s+and\s+Political\s+Rights', r'\bICCPR\b']},
    {'id': 'Sustainable Development Goals (2030 Agenda)', 'doc': None, 'aliases': [
        r'Sustainable\s+Development\s+Goals', r'\bSDGs?\b', r'2030\s+Agenda',
        r'Tujuan\s+Pembangunan\s+Berkelanjutan']},
    {'id': 'CoE Convention 108 (Data Protection)', 'doc': None, 'aliases': [
        r'Convention\s+108', r'Convention\s+for\s+the\s+Protection\s+of\s+Individuals']},
    {'id': 'Budapest Convention on Cybercrime', 'doc': None, 'aliases': [
        r'Budapest\s+Convention', r'Convention\s+on\s+Cybercrime']},
    {'id': 'NIST AI Risk Management Framework', 'doc': None, 'aliases': [
        r'NIST\s+AI\s+Risk\s+Management', r'\bAI\s+RMF\b']},
    {'id': 'Bletchley Declaration', 'doc': None, 'aliases': [r'Bletchley\s+Declaration']},
    {'id': 'OECD Privacy Guidelines', 'doc': None, 'aliases': [
        r'OECD\s+Privacy\s+Guidelines', r'OECD\s+Guidelines\s+on\s+.{0,20}Privacy']},
]


def _resolve(prefix, basenames):
    if not prefix:
        return None
    for b in basenames:
        if b.startswith(prefix):
            return b
    return None


def _norm(kind, num, yr):
    return f"{kind} {num}/{re.sub(r'\\s', '', yr)}"


def _year_ok(cid):
    m = re.search(r'/(\d{4})$', cid)
    return bool(m) and 1945 <= int(m.group(1)) <= 2025


def main():
    pdfs = sorted(glob.glob(os.path.join(builder.REG_BASE, '**', '*.pdf'), recursive=True))
    basenames = [os.path.basename(p)[:-4] for p in pdfs]
    docs, edges, agg = {}, [], {}
    for p in pdfs:
        doc = os.path.basename(p)[:-4]
        try:
            t = ' '.join((extract_text(p) or '').split())
        except Exception:
            continue
        seen = {}
        # ── pass 1: numbered Indonesian regulations ("Nomor X Tahun Y") ──
        for kind, pat in PATS:
            for m in re.finditer(pat, t, re.I):
                cid = _norm(kind, m.group(1), m.group(2))
                rec = seen.setdefault(cid, {'id': cid, 'count': 0, 'context': '', 'type': 'numbered'})
                rec['count'] += 1
                if not rec['context']:
                    s = max(0, m.start() - 90)
                    rec['context'] = ('…' + t[s:m.end() + 90] + '…').strip()
        for cid, rec in list(seen.items()):
            rec['suspect_year'] = not _year_ok(cid)
            rec['corpus_doc'] = TO_CORPUS.get(cid)
            rec['in_corpus'] = bool(rec['corpus_doc'])
            rec['name'] = NAME.get(cid, cid)
            rec['self_ref'] = (rec['corpus_doc'] == doc) or (cid.split()[1].split('/')[1] in doc)
        # ── pass 2: named instruments (gazetteer) — pedoman cite each other ──
        for ins in INSTR:
            tgt_doc = _resolve(ins['doc'], basenames)
            if tgt_doc == doc:                       # a document mentioning itself
                continue
            cnt, ctx = 0, ''
            for alias in ins['aliases']:
                for m in re.finditer(alias, t, re.I):
                    cnt += 1
                    if not ctx:
                        s = max(0, m.start() - 80)
                        ctx = ('…' + t[s:m.end() + 90] + '…').strip()
            if cnt:
                seen[ins['id']] = {'id': ins['id'], 'count': cnt, 'context': ctx, 'type': 'named',
                                   'name': ins['id'] + (f"  [{ins['note']}]" if ins.get('note') else ''),
                                   'in_corpus': bool(tgt_doc), 'corpus_doc': tgt_doc,
                                   'self_ref': False, 'suspect_year': False}
        # ── finalize edges for this document ──
        cites = []
        for cid, rec in seen.items():
            cites.append(rec)
            if not rec['self_ref'] and not rec['suspect_year']:
                agg[cid] = agg.get(cid, 0) + rec['count']
                edges.append({'source': doc, 'target': cid, 'name': rec['name'],
                              'type': rec['type'], 'in_corpus': rec['in_corpus'],
                              'corpus_doc': rec['corpus_doc'], 'count': rec['count']})
        if cites:
            docs[doc] = sorted(cites, key=lambda c: -c['count'])

    ext = {}                       # target -> (name, count) for targets never in corpus
    incorp = {e['target'] for e in edges if e['in_corpus']}
    for e in edges:
        if e['target'] not in incorp:
            n, c = ext.get(e['target'], (e['name'], 0))
            ext[e['target']] = (n, c + e['count'])
    external = sorted(([nm, cid, n] for cid, (nm, n) in ext.items()), key=lambda x: -x[2])
    # per-document participation across ALL corpus docs (out=cites, in=cited within corpus)
    out_c, in_c = {}, {}
    for e in edges:
        out_c[e['source']] = out_c.get(e['source'], 0) + e['count']
        if e.get('corpus_doc'):
            in_c[e['corpus_doc']] = in_c.get(e['corpus_doc'], 0) + e['count']
    coverage = []
    for b in basenames:
        o, i = out_c.get(b, 0), in_c.get(b, 0)
        role = 'isolated' if (o == 0 and i == 0) else ('source' if i == 0 else ('sink' if o == 0 else 'both'))
        coverage.append({'doc': b, 'out': o, 'in': i, 'role': role})
    coverage.sort(key=lambda c: -(c['out'] + c['in']))

    payload = {'docs': docs, 'edges': edges,
               'in_corpus_targets': sorted(incorp),
               'external_referenced': [{'id': c, 'name': nm, 'count': n} for nm, c, n in external],
               'coverage': coverage, 'n_docs': len(basenames),
               'n_isolated': sum(1 for c in coverage if c['role'] == 'isolated')}
    json.dump(payload, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

    named = sum(1 for e in edges if e['type'] == 'named')

    # record provenance in methods_config.json: citations = PRIMARY authority, SBERT = exploratory
    mc_path = os.path.join(NET, 'methods_config.json')
    try:
        mc = json.load(open(mc_path, encoding='utf-8'))
    except Exception:
        mc = {}
    top_auth = sorted(coverage, key=lambda c: -c['in'])[:5]
    mc['citation_network'] = {
        'n_edges': len(edges), 'n_by_name': named, 'n_by_number': len(edges) - named,
        'n_docs': len(basenames), 'n_isolated': payload['n_isolated'],
        'top_authorities_by_in_degree': {c['doc']: c['in'] for c in top_auth if c['in'] > 0},
        'role': 'PRIMARY authority layer (explicit cross-citation); SBERT textual similarity is exploratory/secondary',
        'source_script': 'build_citations.py', 'output': 'data/network/citations.json',
    }
    json.dump(mc, open(mc_path, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

    print(f"✅ citations.json: {len(edges)} edge sitasi ({named} by-name, {len(edges)-named} by-number) dari {len(docs)} dokumen")
    print("   ↳ methods_config.json: blok 'citation_network' diperbarui")
    print("\n— Sitasi ke instrumen/regulasi YANG ADA di korpus (tautan defensible) —")
    for e in sorted([e for e in edges if e['in_corpus']], key=lambda x: -x['count']):
        tag = '◆' if e['type'] == 'named' else '#'
        print(f"   {tag} {e['source'][:30]:30s} ─cites→ {e['name'][:38]:38s} ({e['count']}x)")
    print("\n— DIRUJUK tapi TIDAK ADA di korpus (gap kelengkapan) —")
    for x in payload['external_referenced'][:16]:
        print(f"   {x['count']:>2d}x  {x['id']:16s} {x['name'] if x['name'] != x['id'] else ''}")
    role_id = {'both': '↔ dua arah', 'source': '→ menyitir', 'sink': '← disitir', 'isolated': '● isolated'}
    print(f"\n— Partisipasi: {payload['n_docs']} dokumen, {payload['n_docs'] - payload['n_isolated']} ikut, {payload['n_isolated']} isolated —")
    for c in coverage:
        print(f"   out={c['out']:>2d} in={c['in']:>2d}  {role_id[c['role']]:11s} {c['doc'][:46]}")


if __name__ == '__main__':
    main()
