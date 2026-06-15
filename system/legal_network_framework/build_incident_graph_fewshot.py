"""
build_incident_graph_fewshot.py — incident↔regulation graph from the few-shot judge
===================================================================================
The "Analisis Kasus Forensik" tab previously rendered incident_graph.json built
from the COSINE cut-off (>=0.50): only 20/45 incidents appeared and the other 25
were silently dropped — a 44.4% coverage that the validated few-shot judge (F1=0.83
on held-out gold) contradicts (86.7% any-subject coverage). That made the graph
inconsistent with the incident cards and the sector tab.

This rebuilds incident_graph.json from the few-shot judge so the whole dashboard
tells one story:
  * edges = few-shot RELEVANT warrants (regulation --governs--> incident),
  * ALL 45 incidents are nodes, so the few incidents with no warrant for ANY
    subject appear as genuine, validated STRUCTURAL HOLES (isolated nodes),
  * regulation node definitions (label/group/classification) are reused verbatim
    from legal_graph.json so colours/grouping match the other graphs.

Vis-network schema (matches the other *_graph.json):
  nodes: {id,label,group,classification,value,title}
  edges: {from,to,label,arrows,title}

Run:  python build_incident_graph_fewshot.py
"""
import os, json
from collections import defaultdict

NET = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network')
INC = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'incidents', 'indonesia_incidents.json')
LLM = os.path.join(NET, 'llm_edge_confidence.json')
LEGAL = os.path.join(NET, 'legal_graph.json')
OUT = os.path.join(NET, 'incident_graph.json')
# High-confidence operating point (P>=95) — matches role_coverage/sector_coverage
# and the reframed thesis; edges below this are screened out so the remaining
# isolated incidents are credible high-confidence structural holes.
CALIB_P = 95


def main():
    incidents = json.load(open(INC, encoding='utf-8'))['incidents']
    llm = json.load(open(LLM, encoding='utf-8'))
    fewshot = bool(llm.get('fewshot'))
    llm = llm['incidents']
    legal_nodes = {n['id']: n for n in json.load(open(LEGAL, encoding='utf-8'))['nodes']}

    nodes, edges = {}, []
    degree = defaultdict(int)

    # incident nodes (ALL 45 — isolated ones are the structural holes)
    for inc in incidents:
        cid = 'CASE_' + inc['id']
        kron = ' '.join(str(inc.get('peristiwa_hukum_kronologi', '')).split())
        nodes[cid] = {
            'id': cid,
            'label': f"{inc['id'].upper()} - {kron[:60]}...",
            'group': 'Insiden Kasus',
            'classification': 'Insiden Kasus',
            'value': 0, 'title': '',
        }

    # edges from few-shot RELEVANT warrants
    missing_reg = set()
    for inc in incidents:
        cid = 'CASE_' + inc['id']
        for r in llm.get(inc['id'], []):
            if not (r.get('relevant') and int(r.get('confidence', 0)) >= CALIB_P):
                continue
            rid = r['regulation_id']
            reg = legal_nodes.get(rid)
            if reg is None:
                missing_reg.add(rid)
                continue
            if rid not in nodes:
                nodes[rid] = {k: reg.get(k) for k in ('id', 'label', 'group', 'classification')}
                nodes[rid]['value'] = 0
                nodes[rid]['title'] = ''
            roles = '/'.join(r.get('roles') or []) or '—'
            edges.append({
                'from': rid, 'to': cid, 'label': 'governs', 'arrows': 'to',
                'title': f"{roles} · {r.get('confidence', 0)}% (few-shot LLM judge)",
            })
            degree[rid] += 1
            degree[cid] += 1

    # node size + degree tooltip
    for nid, nd in nodes.items():
        d = degree[nid]
        nd['value'] = 10 + 4 * d
        nd['title'] = f"Degree: {d}"

    out = {'nodes': list(nodes.values()), 'edges': edges}
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)

    n_inc = sum(1 for n in nodes.values() if n['group'] == 'Insiden Kasus')
    connected = sum(1 for n in nodes.values() if n['group'] == 'Insiden Kasus' and degree[n['id']] > 0)
    holes = [n['id'].replace('CASE_', '') for n in nodes.values()
             if n['group'] == 'Insiden Kasus' and degree[n['id']] == 0]
    print(f"source: {os.path.basename(LLM)} (fewshot={fewshot})")
    print(f"nodes: {len(nodes)} ({n_inc} incidents + {len(nodes)-n_inc} regulations) | edges: {len(edges)}")
    print(f"incident coverage: {connected}/{n_inc} = {100*connected/n_inc:.1f}%  | structural holes: {len(holes)}")
    print("  holes:", ', '.join(holes) if holes else '(none)')
    if missing_reg:
        print("  ⚠ regulation ids not found in legal_graph:", missing_reg)
    print(f"✅ wrote {os.path.basename(OUT)}")


if __name__ == '__main__':
    main()
