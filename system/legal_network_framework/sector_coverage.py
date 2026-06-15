"""
sector_coverage.py — EMPIRICAL per-sector coverage from the few-shot LLM judge
==============================================================================
Replaces the old hand-set "Coverage Score" per sector (which did not even match
the pasals displayed) with a reproducible, data-driven figure: for each sector of
the 45 real incidents, what share has >=1 applicable legal warrant, broken down by
legal subject, plus the regulations that actually serve as warrants there.

Coverage uses the production few-shot judge (llm_edge_confidence.json, fewshot:true,
validated F1=0.83 on held-out gold). A pair counts if the judge flagged it relevant
(its raw operating point — the validated one for the few-shot judge).

Output: data/network/sector_coverage.json
Run:    python sector_coverage.py
"""
import os, json
from collections import defaultdict, Counter

NET = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network')
INC = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'incidents', 'indonesia_incidents.json')
LLM = os.path.join(NET, 'llm_edge_confidence.json')
ROLES = ['pelaku', 'pse', 'konsumen', 'regulator']

# Human-readable sector metadata (keys = incident `sector` field). Bilingual.
SECTOR_META = {
    'government':       {'id': 'Pemerintahan & Layanan Publik', 'en': 'Government & Public Services', 'icon': '🏛️'},
    'finance':          {'id': 'Keuangan & Perbankan',          'en': 'Finance & Banking',           'icon': '🏦'},
    'ecommerce_telco':  {'id': 'E-Commerce & Telekomunikasi',   'en': 'E-Commerce & Telecom',        'icon': '🛒'},
    'health':           {'id': 'Kesehatan',                     'en': 'Health',                      'icon': '🏥'},
    'ai_misuse':        {'id': 'Penyalahgunaan AI (Deepfake/Disinformasi)', 'en': 'AI Misuse (Deepfake/Disinformation)', 'icon': '🤖'},
    'education':        {'id': 'Pendidikan',                    'en': 'Education',                   'icon': '🎓'},
    'judicial':         {'id': 'Peradilan & Penegakan Hukum',   'en': 'Justice & Law Enforcement',   'icon': '⚖️'},
}
ROLE_LABEL = {
    'pelaku':    {'id': 'Pelaku (pidana)',        'en': 'Perpetrator (criminal)'},
    'pse':       {'id': 'Operator/PSE',            'en': 'Operator/PSE'},
    'konsumen':  {'id': 'Konsumen/korban',         'en': 'Consumer/victim'},
    'regulator': {'id': 'Regulator/negara',        'en': 'Regulator/state'},
}


def main():
    incidents = json.load(open(INC, encoding='utf-8'))['incidents']
    sec = {i['id']: i.get('sector', 'other') for i in incidents}
    title = {i['id']: i.get('title_en', i['id']) for i in incidents}
    j = json.load(open(LLM, encoding='utf-8'))
    llm = j['incidents']

    by_sector = defaultdict(list)
    for iid, s in sec.items():
        by_sector[s].append(iid)

    out = {'source': os.path.basename(LLM), 'fewshot': bool(j.get('fewshot')),
           'n_incidents': len(incidents), 'sectors': []}

    for s in sorted(by_sector, key=lambda x: -len(by_sector[x])):
        ids = by_sector[s]
        n = len(ids)
        any_cov = 0
        role_cov = {r: 0 for r in ROLES}
        warrant_counter = Counter()
        uncovered = []
        for iid in ids:
            rel = [r for r in llm.get(iid, []) if r.get('relevant')]
            if rel:
                any_cov += 1
            else:
                uncovered.append(iid)
            for r in ROLES:
                if any(r in (x.get('roles') or []) for x in rel):
                    role_cov[r] += 1
            for x in rel:
                warrant_counter[x['regulation_label']] += 1

        meta = SECTOR_META.get(s, {'id': s, 'en': s, 'icon': '📁'})
        per_role = {r: {'covered': role_cov[r], 'coverage_pct': round(100 * role_cov[r] / n, 1)} for r in ROLES}
        # the legal subject with the weakest coverage is the headline gap
        worst = min(ROLES, key=lambda r: role_cov[r])
        out['sectors'].append({
            'key': s,
            'title_id': meta['id'], 'title_en': meta['en'], 'icon': meta['icon'],
            'n_incidents': n,
            'coverage_pct': round(100 * any_cov / n, 1),        # >=1 warrant for ANY subject
            'covered': any_cov,
            'per_role': per_role,
            'weakest_role': worst, 'weakest_pct': round(100 * role_cov[worst] / n, 1),
            'top_warrants': [{'label': k, 'count': c} for k, c in warrant_counter.most_common(6)],
            'incident_ids': ids,
            'uncovered_ids': uncovered,
        })

    out['role_label'] = ROLE_LABEL
    with open(os.path.join(NET, 'sector_coverage.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    print(f"{'sector':16s} {'n':>3s} {'any%':>5s}  " + ' '.join(f'{r:>9s}' for r in ROLES))
    for sc in out['sectors']:
        print(f"{sc['key']:16s} {sc['n_incidents']:>3d} {sc['coverage_pct']:>4.0f}%  "
              + ' '.join(f"{sc['per_role'][r]['coverage_pct']:>8.0f}%" for r in ROLES)
              + f"   weakest={sc['weakest_role']}")
    print(f"\n✅ wrote sector_coverage.json ({len(out['sectors'])} sectors, few-shot judge)")


if __name__ == '__main__':
    main()
