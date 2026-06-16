"""
build_citation_authority.py — single source of truth for citation-based topology
=================================================================================
Rolls the VALIDATED pasal-level ground truth (provision_citations.json — deduped,
Gemini-judged, preamble-recall) up to the instrument level so the dashboard's
network/topology/authority all read ONE coherent, auditable layer (vs the older
inflated citations.json instrument scan where UU ITE showed "39"). Here UU ITE = 3
inbound, matching the clickable pasal evidence.

Also computes the cross-jurisdiction (Intl↔Natl) picture — which is the headline
"gap" finding: ZERO explicit cross-jurisdiction citations.

Output: data/network/citation_authority.json
  { by_doc: {doc:{in,out,role,juris}}, edges:[{source,target,count,cross_juris}],
    summary: {intl,natl,cross}, n_internal }
Run:  python build_citation_authority.py
"""
import os, json
from collections import defaultdict

NET = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network')
PC = os.path.join(NET, 'provision_citations.json')
OUT = os.path.join(NET, 'citation_authority.json')

# jurisdiction of every corpus instrument (single source — JS reads this file, not its own copy)
INTL = {
    'Council_of_Europe_Framework_Convention_on_AI_CETS225', 'EU_AI_Act_2024', 'OECD_AI_Principles_2024',
    'UNGA_Res_78_265_Safe_Secure_Trustworthy_AI', 'UNGA_Res_78_311_Global_Digital_Compact_or_AI',
    'UNESCO_Recommendation_on_AI_Ethics_2021', 'WHO_Ethics_and_Governance_of_AI_for_Health',
    'ISO_IEC_42001_AI_Management_System', 'ASEAN_Guide_AI_Governance_Ethics_2024',
    'G7_Hiroshima_Code_of_Conduct_for_AI',
}
NATL = {
    'UU_ITE_No19_2016', 'UU_ITE_No1_2024', 'UU_PDP_No27_2022', 'PP_PSTE_No71_2019',
    'POJK_No3_2024_Inovasi_Teknologi_Keuangan', 'SE_Komdigi_No9_2023_Etika_AI',
    'Stranas_AI_Indonesia_2020-2045_Full',
}
CROSS_KINDS = ('named', 'regulation', 'pasal_external')


def juris(doc):
    return 'INTL' if doc in INTL else ('NATL' if doc in NATL else '?')


def main():
    recs = json.load(open(PC, encoding='utf-8'))['records']
    all_docs = INTL | NATL

    # inter-instrument edges (in-corpus, cross-document) aggregated from pasal-level
    edge_w = defaultdict(int)
    n_internal = 0
    for r in recs:
        if r['kind'] == 'pasal_internal':
            n_internal += 1
            continue
        cd = r.get('cited_doc')
        if cd and cd in all_docs and r['source_doc'] != cd and r['kind'] in CROSS_KINDS:
            # count DISTINCT citing passages (records), matching the PRIMER authority
            # table's per-record Disitir/Menyitir — so every layer agrees (UU ITE = 3).
            edge_w[(r['source_doc'], cd)] += 1

    edges = [{'source': s, 'target': t, 'count': w,
              'cross_juris': juris(s) != juris(t) and juris(s) != '?' and juris(t) != '?'}
             for (s, t), w in sorted(edge_w.items(), key=lambda x: -x[1])]

    by_doc = {}
    for d in sorted(all_docs):
        inn = sum(e['count'] for e in edges if e['target'] == d)
        out = sum(e['count'] for e in edges if e['source'] == d)
        role = 'isolated' if (inn == 0 and out == 0) else ('source' if inn == 0 else ('sink' if out == 0 else 'both'))
        by_doc[d] = {'in': inn, 'out': out, 'role': role, 'juris': juris(d)}

    def _summ(docset):
        de = [e for e in edges if e['source'] in docset and e['target'] in docset]
        iso = [d for d in docset if by_doc[d]['in'] == 0 and by_doc[d]['out'] == 0]
        top = max(docset, key=lambda d: by_doc[d]['in'], default=None)
        return {'n_docs': len(docset), 'n_edges': len(de),
                'isolated': sorted(iso),
                'top_authority': top, 'top_authority_in': by_doc.get(top, {}).get('in', 0)}

    cross_edges = [e for e in edges if e['cross_juris']]
    summary = {
        'intl': _summ(INTL), 'natl': _summ(NATL),
        'cross': {'n_edges': len(cross_edges), 'edges': cross_edges,
                  'intl_docs': len(INTL), 'natl_docs': len(NATL),
                  'gap': len(cross_edges) == 0},
    }
    payload = {'source': 'provision_citations.json (validated pasal-level)',
               'by_doc': by_doc, 'edges': edges, 'summary': summary, 'n_internal': n_internal}
    json.dump(payload, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)

    print(f"✅ citation_authority.json — {len(edges)} edge antar-instrumen, {n_internal} internal pasal→pasal")
    print(f"   INTL: {summary['intl']['n_edges']} edge · NATL: {summary['natl']['n_edges']} edge · "
          f"LINTAS-YURISDIKSI: {summary['cross']['n_edges']} ({'GAP ✓' if summary['cross']['gap'] else 'ada'})")
    print(f"   Otoritas teratas — INTL: {summary['intl']['top_authority']} ({summary['intl']['top_authority_in']}×) · "
          f"NATL: {summary['natl']['top_authority']} ({summary['natl']['top_authority_in']}×)")


if __name__ == '__main__':
    main()
