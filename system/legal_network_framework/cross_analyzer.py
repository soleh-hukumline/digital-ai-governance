import json
import networkx as nx

def analyze_cross_only():
    G = nx.Graph()
    try:
        with open('../../data/network/legal_graph.json', 'r', encoding='utf-8') as f:
            data = json.load(f)

        for n in data['nodes']:
            G.add_node(n['id'], label=n['label'], group=n.get('group', ''),
                       classification=n.get('classification', n.get('group', '')))

        cross_edges = [e for e in data['edges'] if 'cross jurisdiction' in e.get('label', '')]
        edge_scores = {}
        for e in cross_edges:
            weight = 0.05
            label_txt = e.get('label', '')
            if 'Sim' in label_txt:
                try:
                    weight = float(label_txt.split('Sim')[1].split('%')[0].strip()) / 100.0
                except:
                    pass
            G.add_edge(e['from'], e['to'], weight=weight, type="cross jurisdiction",
                       score=weight, label=label_txt)
            edge_scores[(e['from'], e['to'])] = weight

        # Classify by tier
        full_adoption   = [(u, v, s) for (u, v), s in edge_scores.items() if s >= 0.30]
        partial_adoption = [(u, v, s) for (u, v), s in edge_scores.items() if 0.10 <= s < 0.30]
        pseudo_adoption  = [(u, v, s) for (u, v), s in edge_scores.items() if s < 0.10]

        # Export
        degree_dict = dict(G.degree())
        orig_nodes = {n['id']: n for n in data['nodes']}
        nodes_export = []
        for node in G.nodes():
            n_data = orig_nodes.get(node, {})
            deg = degree_dict.get(node, 1)
            nodes_export.append({
                "id": node, "label": n_data.get("label", node),
                "group": n_data.get("group", "Unknown"),
                "classification": n_data.get("classification", "Unknown"),
                "value": 10 + (deg * 4),
                "title": f"Degree: {deg}"
            })
        edges_export = []
        for u, v, attrs in G.edges(data=True):
            score = attrs.get('score', 0.05)
            edges_export.append({
                "from": u, "to": v,
                "label": f"Semantic Sim {score*100:.1f}%",
                "arrows": "to",
                "value": score
            })
        with open('../../data/network/cross_graph.json', 'w', encoding='utf-8') as f:
            json.dump({"nodes": nodes_export, "edges": edges_export}, f, indent=2)

    except Exception as e:
        print(f"Error: {e}")
        return

    # === GENERATE REPORT ===
    intl_degrees = {}
    natl_degrees = {}
    for u, v in G.edges():
        grp_u = G.nodes[u].get('classification', '')
        grp_v = G.nodes[v].get('classification', '')
        if grp_u.startswith('Intl:'):
            intl_degrees[u] = intl_degrees.get(u, 0) + 1
        if grp_u.startswith('Natl:'):
            natl_degrees[u] = natl_degrees.get(u, 0) + 1
        if grp_v.startswith('Intl:'):
            intl_degrees[v] = intl_degrees.get(v, 0) + 1
        if grp_v.startswith('Natl:'):
            natl_degrees[v] = natl_degrees.get(v, 0) + 1

    sorted_intl = sorted(intl_degrees.items(), key=lambda x: x[1], reverse=True)
    sorted_natl = sorted(natl_degrees.items(), key=lambda x: x[1], reverse=True)
    total = G.number_of_edges()

    report = []
    report.append("# Analisis Lintas Yurisdiksi (Cross-Jurisdiction)\n")
    report.append(
        "Laporan ini mengukur koneksi semantik antara regulasi internasional dan nasional "
        "menggunakan multilingual sentence embeddings. Setiap koneksi diklasifikasikan ke dalam "
        "tiga tier berdasarkan skor similarity.\n"
    )

    pseudo_rate = len(pseudo_adoption) / max(total, 1) * 100
    partial_rate = len(partial_adoption) / max(total, 1) * 100
    full_rate = len(full_adoption) / max(total, 1) * 100

    report.append("## 1. Distribusi Tier Similarity")
    report.append("| Tier | Skor Similarity | Jumlah Koneksi | Persentase |")
    report.append("| --- | --- | --- | --- |")
    report.append(f"| **Full Adoption** | ≥30% | {len(full_adoption)} | {full_rate:.1f}% |")
    report.append(f"| **Partial Adoption** | 10–29% | {len(partial_adoption)} | {partial_rate:.1f}% |")
    report.append(f"| **Low Similarity** | <10% | {len(pseudo_adoption)} | {pseudo_rate:.1f}% |")
    report.append(f"| **Total** | — | {total} | 100% |\n")

    report.append("## 2. Node Internasional dengan Koneksi Terbanyak ke Nasional")
    report.append("| Peringkat | Node | Instrumen | Jumlah Koneksi | Avg Similarity |")
    report.append("| --- | --- | --- | --- | --- |")
    for idx, (node_id, degree) in enumerate(sorted_intl[:10]):
        label = G.nodes[node_id].get('label', node_id)
        grp = G.nodes[node_id].get('group', '')
        node_scores = [edge_scores.get((node_id, v), edge_scores.get((v, node_id), 0.05))
                       for _, v in G.edges(node_id)]
        avg_score = sum(node_scores) / max(len(node_scores), 1)
        report.append(f"| {idx+1} | {label} | {grp} | {degree} | {avg_score*100:.1f}% |")

    report.append("\n## 3. Node Nasional dengan Koneksi Terbanyak ke Internasional")
    report.append("| Peringkat | Node | Instrumen | Jumlah Koneksi | Avg Similarity |")
    report.append("| --- | --- | --- | --- | --- |")
    for idx, (node_id, degree) in enumerate(sorted_natl[:10]):
        label = G.nodes[node_id].get('label', node_id)
        grp = G.nodes[node_id].get('group', '')
        node_scores = [edge_scores.get((node_id, v), edge_scores.get((v, node_id), 0.05))
                       for _, v in G.edges(node_id)]
        avg_score = sum(node_scores) / max(len(node_scores), 1)
        report.append(f"| {idx+1} | {label} | {grp} | {degree} | {avg_score*100:.1f}% |")

    # Data-driven gaps: international nodes with 0 cross-jurisdiction connections
    report.append("\n## 4. Node Internasional Tanpa Koneksi Lintas Yurisdiksi")
    intl_isolated = [n for n in G.nodes()
                     if G.nodes[n].get('classification','').startswith('Intl:') and G.degree(n) == 0]
    report.append(f"Total: **{len(intl_isolated)}** node internasional tanpa koneksi ke regulasi nasional.\n")
    if intl_isolated:
        report.append("| Node | Instrumen | Klasifikasi |")
        report.append("| --- | --- | --- |")
        for nid in intl_isolated[:15]:
            label = G.nodes[nid].get('label', nid)
            grp = G.nodes[nid].get('group', '')
            cls = G.nodes[nid].get('classification', '')
            report.append(f"| {label} | {grp} | {cls} |")
        if len(intl_isolated) > 15:
            report.append(f"| *(+{len(intl_isolated)-15} lainnya)* | | |")

    report.append("\n---\n*Laporan ini dihasilkan dari analisis cross-jurisdiction pada dataset LNA "
                  "menggunakan multilingual sentence embeddings. Metrik dihitung dari data graf aktual.*")

    with open('laporan_khusus_transnasional.md', 'w', encoding='utf-8') as f:
        f.write("\n".join(report))
    print("Cross-jurisdiction report done.")


if __name__ == "__main__":
    analyze_cross_only()
