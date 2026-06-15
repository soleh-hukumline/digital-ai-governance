"""
build_radial_incident.py — data for the radial (chord) Insiden↔Regulasi view
============================================================================
Feeds a radial visualization (à la "Quran bil Quran"): incidents + the
regulations that govern them placed around a ring, warrants drawn as chords,
with rich per-edge metadata (role / confidence / reason from the few-shot LLM
judge) and per-node centrality — so the side panel can mirror the reference
model's Degree/In/Out/Betweenness/Closeness + Category/Explanation.

Edges = high-confidence warrants (P>=95) from llm_edge_confidence.json
(regulation --governs--> incident). Centrality via networkx on that digraph.

Output: data/network/radial_incident.json
Run:    python build_radial_incident.py
"""
import os, json, re
import networkx as nx

NET = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network')
INC = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'incidents', 'indonesia_incidents.json')
LLM = os.path.join(NET, 'llm_edge_confidence.json')
OUT = os.path.join(NET, 'radial_incident.json')
CALIB_P = 95

SECTOR_LABEL = {
    'government': 'Pemerintahan', 'finance': 'Keuangan', 'ecommerce_telco': 'E-Commerce/Telco',
    'health': 'Kesehatan', 'ai_misuse': 'Penyalahgunaan AI', 'education': 'Pendidikan',
    'judicial': 'Peradilan', 'other': 'Lainnya',
}
INSTRUMENT_ABBR = [
    (r'UU_PDP', 'UU PDP'), (r'UU_ITE_No1_2024', 'UU ITE 2024'), (r'UU_ITE_No19_2016', 'UU ITE 2016'),
    (r'UU_ITE', 'UU ITE'), (r'PP_PSTE', 'PP PSTE'), (r'POJK', 'POJK'), (r'SE_Komdigi', 'SE Komdigi'),
    (r'Stranas_AI', 'Stranas AI'), (r'UU_Perdagangan', 'UU Dagang'), (r'EU_AI_Act', 'EU AI Act'),
    (r'OECD', 'OECD AI'), (r'UNESCO', 'UNESCO'), (r'Council_of_Europe|CETS2?25', 'CoE FCAI'),
    (r'ASEAN', 'ASEAN Guide'), (r'UNGA_Res', 'UNGA Res'), (r'ISO.*42001', 'ISO 42001'),
    (r'WHO', 'WHO'), (r'G7.*Hiroshima', 'G7 Hiroshima'), (r'Global_Digital|UN_Global', 'UN GDC'),
]
# binding hard law vs soft law (for optional visual weighting)
BINDING = re.compile(r'UU_|PP_|POJK|EU_AI_Act|UU_ITE|UU_PDP|PP_PSTE', re.I)
SOFT = re.compile(r'Stranas|Komdigi|OECD|UNESCO|ASEAN|UNGA|ISO|WHO|G7|Global', re.I)


def abbr_inst(s):
    for pat, ab in INSTRUMENT_ABBR:
        if re.search(pat, s, re.I):
            return ab
    return re.sub(r'_', ' ', s).strip()


def reg_code(label):
    inst, _, prov = label.partition(' - ')
    ps = re.sub(r'Article\s*', 'Art.', prov)
    ps = re.sub(r'Pasal\s*', 'Ps.', ps)
    ps = re.sub(r'Bagian\s*', '§', ps)
    ps = re.sub(r'\s+', '', ps).strip()
    return (abbr_inst(inst) + (' ' + ps if ps else '')).strip()


def inc_short(iid):
    toks = iid.replace('_', '-').split('-')
    yr = next((t for t in toks if re.fullmatch(r'(19|20)\d{2}', t)), '')
    head = ' '.join(w.capitalize() for w in toks[:2] if not re.fullmatch(r'(19|20)\d{2}', w))
    return (head + (" '" + yr[2:] if yr else '')).strip()


def main():
    incidents = json.load(open(INC, encoding='utf-8'))['incidents']
    inc_by = {i['id']: i for i in incidents}
    j = json.load(open(LLM, encoding='utf-8'))
    llm = j['incidents']

    G = nx.DiGraph()
    edges = []
    reg_label = {}
    for iid, rows in llm.items():
        if iid not in inc_by:
            continue
        for r in rows:
            if not (r.get('relevant') and int(r.get('confidence', 0)) >= CALIB_P):
                continue
            rid = r['regulation_id']
            reg_label[rid] = r['regulation_label']
            G.add_edge(rid, 'CASE_' + iid)
            edges.append({
                'source': rid, 'target': 'CASE_' + iid,
                'roles': [x for x in (r.get('roles') or [])],
                'confidence': int(r.get('confidence', 0)),
                'reason': str(r.get('reason', ''))[:240],
            })

    # ensure every incident is a node even if it has no warrant (structural hole)
    for i in incidents:
        G.add_node('CASE_' + i['id'])

    # in/out-degree from the DIRECTED graph (reg=out, incident=in); but
    # betweenness/closeness from the UNDIRECTED projection — the directed graph is
    # bipartite (reg→incident, no multi-hop) so directed path metrics are all 0.
    U = G.to_undirected()
    deg = nx.degree_centrality(U)
    ind = nx.in_degree_centrality(G)
    outd = nx.out_degree_centrality(G)
    btw = nx.betweenness_centrality(U)
    clo = nx.closeness_centrality(U)
    raw_deg = dict(G.degree())

    nodes = []
    # regulations first (grouped by instrument), then incidents (grouped by sector)
    regs = sorted(reg_label, key=lambda r: (abbr_inst(reg_label[r]), reg_label[r]))
    for rid in regs:
        lbl = reg_label[rid]
        nodes.append({
            'id': rid, 'type': 'regulation', 'label': lbl, 'code': reg_code(lbl),
            'group': abbr_inst(lbl), 'binding': bool(BINDING.search(rid) and not SOFT.search(rid)),
            'degree': raw_deg.get(rid, 0),
            'cent': {'degree': round(deg.get(rid, 0), 4), 'in': round(ind.get(rid, 0), 4),
                     'out': round(outd.get(rid, 0), 4), 'betweenness': round(btw.get(rid, 0), 4),
                     'closeness': round(clo.get(rid, 0), 4)},
        })
    incs = sorted(incidents, key=lambda i: (i.get('sector', 'other'), i.get('year', 0), i['id']))
    for i in incs:
        nid = 'CASE_' + i['id']
        nodes.append({
            'id': nid, 'type': 'incident', 'label': i['id'].upper(), 'code': inc_short(i['id']),
            'group': SECTOR_LABEL.get(i.get('sector', 'other'), i.get('sector', 'other')),
            'sector': i.get('sector', 'other'), 'inc_type': i.get('type', ''),
            'title': i.get('title_en', ''), 'year': i.get('year', ''),
            'chronology': ' '.join(str(i.get('peristiwa_hukum_kronologi', '')).split())[:600],
            'degree': raw_deg.get(nid, 0),
            'cent': {'degree': round(deg.get(nid, 0), 4), 'in': round(ind.get(nid, 0), 4),
                     'out': round(outd.get(nid, 0), 4), 'betweenness': round(btw.get(nid, 0), 4),
                     'closeness': round(clo.get(nid, 0), 4)},
        })
    for k, n in enumerate(nodes):
        n['order'] = k

    holes = [n['id'] for n in nodes if n['type'] == 'incident' and n['degree'] == 0]
    out = {
        'operating_point': f'few-shot, P>={CALIB_P}',
        'n_incidents': len(incidents), 'n_regulations': len(regs),
        'n_edges': len(edges), 'structural_holes': len(holes),
        'nodes': nodes, 'edges': edges,
    }
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"✅ radial_incident.json: {len(nodes)} nodes ({len(regs)} reg + {len(incidents)} inc), "
          f"{len(edges)} edges, {len(holes)} structural holes")


if __name__ == '__main__':
    main()
