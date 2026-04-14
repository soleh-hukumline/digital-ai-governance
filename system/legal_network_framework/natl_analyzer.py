import json
import networkx as nx

def analyze_natl_only():
    G = nx.Graph()
    try:
        with open('../../data/network/legal_graph.json', 'r', encoding='utf-8') as f:
            data = json.load(f)

        # Filter HANYA node Nasional based on hierarchical groups
        natl_nodes = [n for n in data['nodes'] if n.get('classification', n.get('group', '')).startswith('Natl:')]
        natl_ids = {n['id'] for n in natl_nodes}

        for n in natl_nodes:
            G.add_node(n['id'], label=n['label'], group=n.get('group', ''),
                       classification=n.get('classification', ''))

        for e in data['edges']:
            if e['from'] in natl_ids and e['to'] in natl_ids:
                weight = 1.0
                label_txt = e.get('label', '')
                if 'Sim' in label_txt:
                    try:
                        weight = float(label_txt.split('Sim')[1].split('%')[0].strip()) / 100.0
                    except:
                        pass
                G.add_edge(e['from'], e['to'], type=label_txt, weight=weight)

        # Export as separate graph
        degree_dict = dict(G.degree(G.nodes()))
        orig_nodes = {n['id']: n for n in data['nodes']}
        nodes_export = []
        for node in G.nodes():
            n_data = orig_nodes.get(node, {})
            deg = degree_dict.get(node, 1)
            nodes_export.append({
                "id": node,
                "label": n_data.get("label", node),
                "group": n_data.get("group", "Unknown"),
                "classification": n_data.get("classification", "Unknown"),
                "value": 10 + (deg * 4),
                "title": f"Degree Semantik: {deg}"
            })

        edges_export = []
        for u, v, attrs in G.edges(data=True):
            edges_export.append({
                "from": u, "to": v,
                "label": attrs.get("type", "link"),
                "arrows": "to"
            })

        with open('../../data/network/natl_graph.json', 'w', encoding='utf-8') as f:
            json.dump({"nodes": nodes_export, "edges": edges_export}, f, indent=2)

    except Exception as e:
        print(f"Error: {e}")
        return

    report = []
    report.append("# Analisis Jaringan Regulasi Nasional Indonesia\n")
    report.append(
        "Sub-analisis ini memetakan struktur internal regulasi nasional Indonesia "
        "berdasarkan semantic similarity (multilingual embeddings). Seluruh metrik "
        "dihitung langsung dari topologi sub-graf nasional.\n"
    )

    # Kohesi Internal
    density = nx.density(G)
    report.append("## 1. Metrik Kohesi Nasional")
    report.append(f"| Metrik | Nilai |")
    report.append(f"| --- | --- |")
    report.append(f"| **Total Node Nasional** | {G.number_of_nodes()} |")
    report.append(f"| **Koneksi Semantik Internal** | {G.number_of_edges()} edge |")
    report.append(f"| **Densitas Internal** | {density:.4f} |\n")

    # Distribusi per Instrumen
    report.append("## 2. Distribusi per Instrumen")
    group_counts = {}
    for n in G.nodes():
        grp = G.nodes[n].get('group', 'Unknown')
        if grp not in group_counts:
            group_counts[grp] = {'total': 0, 'connected': 0, 'edges': 0}
        group_counts[grp]['total'] += 1
        if G.degree(n) > 0:
            group_counts[grp]['connected'] += 1
        group_counts[grp]['edges'] += G.degree(n)

    report.append("| Instrumen | Node | Terhubung | Edge (total degree) | Coverage |")
    report.append("| --- | --- | --- | --- | --- |")
    for grp in sorted(group_counts.keys()):
        s = group_counts[grp]
        cov = s['connected'] / max(s['total'], 1) * 100
        report.append(f"| {grp} | {s['total']} | {s['connected']} | {s['edges']} | {cov:.1f}% |")
    report.append("")

    # Degree Centrality
    degree_dict = nx.degree_centrality(G)
    sorted_degree = sorted(degree_dict.items(), key=lambda x: x[1], reverse=True)

    report.append("## 3. Degree Centrality — Top 10")
    report.append("| Peringkat | Node | Instrumen | Skor |")
    report.append("| --- | --- | --- | --- |")
    for idx, (node_id, score) in enumerate(sorted_degree[:10]):
        label = G.nodes[node_id].get('label', node_id)
        grp = G.nodes[node_id].get('group', 'Unknown')
        report.append(f"| {idx+1} | {label} | {grp} | {score:.4f} |")

    # Betweenness Centrality
    betweenness_dict = nx.betweenness_centrality(G)
    sorted_between = sorted(betweenness_dict.items(), key=lambda x: x[1], reverse=True)

    report.append("\n## 4. Betweenness Centrality — Top 10")
    report.append("| Peringkat | Node | Instrumen | Skor |")
    report.append("| --- | --- | --- | --- |")
    for idx, (node_id, score) in enumerate(sorted_between[:10]):
        label = G.nodes[node_id].get('label', node_id)
        grp = G.nodes[node_id].get('group', 'Unknown')
        report.append(f"| {idx+1} | {label} | {grp} | {score:.4f} |")

    # Isolated nodes
    isolated = [n for n in G.nodes() if G.degree(n) == 0]
    report.append(f"\n## 5. Node Terisolasi ({len(isolated)} node)")
    if isolated:
        report.append("| Node | Instrumen | Klasifikasi |")
        report.append("| --- | --- | --- |")
        for nid in isolated[:15]:
            label = G.nodes[nid].get('label', nid)
            grp = G.nodes[nid].get('group', '')
            cls = G.nodes[nid].get('classification', '')
            report.append(f"| {label} | {grp} | {cls} |")
        if len(isolated) > 15:
            report.append(f"| *(+{len(isolated)-15} lainnya)* | | |")
    else:
        report.append("*Semua node nasional memiliki koneksi internal.*")

    report.append("\n---\n*Sub-laporan dihasilkan dari analisis NetworkX pada sub-graf regulasi nasional. "
                  "Metrik dihitung dari data graf aktual tanpa interpretasi manual.*")

    with open('laporan_khusus_nasional.md', 'w') as f:
        f.write("\n".join(report))
    print("National report done.")

if __name__ == "__main__":
    analyze_natl_only()
