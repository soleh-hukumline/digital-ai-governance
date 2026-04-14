import json
import networkx as nx

def analyze_network():
    G = nx.Graph()
    try:
        with open('../../data/network/legal_graph.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        for node in data['nodes']:
            G.add_node(node['id'], group=node['group'], label=node['label'],
                       classification=node.get('classification', ''))
        for edge in data['edges']:
            G.add_edge(edge['from'], edge['to'], type=edge.get('label', 'link'))
    except Exception as e:
        print(f"Error reading graph JSON: {e}")
        return

    report = []
    report.append("# Laporan Master Legal Network Analysis (LNA)\n")
    report.append(
        "Laporan ini dihasilkan secara otomatis menggunakan **Legal Network Analysis (LNA)** "
        "berbasis multilingual sentence embeddings (paraphrase-multilingual-MiniLM-L12-v2) "
        "dan NetworkX. Seluruh metrik dihitung langsung dari topologi graf.\n"
    )

    # 1. Macro Metrics
    density = nx.density(G)
    num_nodes = G.number_of_nodes()
    num_edges = G.number_of_edges()

    # Classify nodes
    intl_nodes = [n for n, d in G.nodes(data=True) if str(d.get('classification','')).startswith('Intl')]
    natl_nodes = [n for n, d in G.nodes(data=True) if str(d.get('classification','')).startswith('Natl')]
    incident_nodes = [n for n, d in G.nodes(data=True) if d.get('group') == 'Insiden Kasus']

    connected_incidents = len([n for n in incident_nodes if G.degree(n) > 0])
    incident_coverage = connected_incidents / max(len(incident_nodes), 1) * 100

    report.append("## 1. Topologi Jaringan Makro")
    report.append(f"| Metrik | Nilai |")
    report.append(f"| --- | --- |")
    report.append(f"| **Total Node** | {num_nodes} |")
    report.append(f"| **Node Internasional** | {len(intl_nodes)} |")
    report.append(f"| **Node Nasional** | {len(natl_nodes)} |")
    report.append(f"| **Node Insiden** | {len(incident_nodes)} |")
    report.append(f"| **Total Edge** | {num_edges} |")
    report.append(f"| **Densitas Jaringan** | {density:.5f} |")
    report.append(f"| **Insiden Terhubung ke ≥1 Regulasi** | {connected_incidents}/{len(incident_nodes)} ({incident_coverage:.1f}%) |\n")

    # 2. Hub Regulasi
    degree_dict = nx.degree_centrality(G)
    sorted_degree = sorted(degree_dict.items(), key=lambda x: x[1], reverse=True)

    report.append("## 2. Degree Centrality — Top 10")
    report.append("| Peringkat | Node | Klasifikasi | Skor |")
    report.append("| --- | --- | --- | --- |")
    for idx, (node_id, score) in enumerate(sorted_degree[:10]):
        label = G.nodes[node_id].get('label', node_id)
        cls = G.nodes[node_id].get('classification', '')
        report.append(f"| {idx+1} | {label} | {cls} | {score:.4f} |")
    report.append("")

    # 3. Betweenness
    betweenness_dict = nx.betweenness_centrality(G)
    sorted_between = sorted(betweenness_dict.items(), key=lambda x: x[1], reverse=True)

    report.append("## 3. Betweenness Centrality — Top 10")
    report.append("| Peringkat | Node | Klasifikasi | Skor |")
    report.append("| --- | --- | --- | --- |")
    for idx, (node_id, score) in enumerate(sorted_between[:10]):
        label = G.nodes[node_id].get('label', node_id)
        cls = G.nodes[node_id].get('classification', '')
        report.append(f"| {idx+1} | {label} | {cls} | {score:.5f} |")
    report.append("")

    # 4. Isolasi Klaster Internasional
    intl_degrees = {n: G.degree(n) for n in intl_nodes}
    isolated_intl = [n for n, d in intl_degrees.items() if d == 0]

    report.append("## 4. Isolasi Node Internasional")
    report.append(f"| Metrik | Nilai |")
    report.append(f"| --- | --- |")
    report.append(f"| **Total Node Internasional** | {len(intl_nodes)} |")
    report.append(f"| **Node Terisolasi (degree=0)** | {len(isolated_intl)} ({len(isolated_intl)/max(len(intl_nodes),1)*100:.1f}%) |")
    report.append(f"| **Node Terhubung** | {len(intl_nodes) - len(isolated_intl)} |\n")

    if isolated_intl:
        report.append("### Daftar Node Internasional Terisolasi")
        report.append("| Node | Group |")
        report.append("| --- | --- |")
        for nid in isolated_intl[:20]:
            label = G.nodes[nid].get('label', nid)
            grp = G.nodes[nid].get('group', '')
            report.append(f"| {label} | {grp} |")
        if len(isolated_intl) > 20:
            report.append(f"| *(+{len(isolated_intl)-20} lainnya)* | |")
        report.append("")

    # 5. Coverage per Group (data-driven)
    report.append("## 5. Coverage per Klaster Regulasi")
    report.append("| Klaster | Total Node | Node Terhubung | Coverage |")
    report.append("| --- | --- | --- | --- |")

    group_stats = {}
    for n, attr in G.nodes(data=True):
        grp = attr.get('group', 'Unknown')
        if grp not in group_stats:
            group_stats[grp] = {'total': 0, 'connected': 0}
        group_stats[grp]['total'] += 1
        if G.degree(n) > 0:
            group_stats[grp]['connected'] += 1

    for grp in sorted(group_stats.keys()):
        s = group_stats[grp]
        cov = s['connected'] / max(s['total'], 1) * 100
        report.append(f"| {grp} | {s['total']} | {s['connected']} | {cov:.1f}% |")

    # 6. Connected Components
    components = list(nx.connected_components(G))
    report.append(f"\n## 6. Connected Components")
    report.append(f"| Metrik | Nilai |")
    report.append(f"| --- | --- |")
    report.append(f"| **Jumlah Komponen** | {len(components)} |")
    if components:
        largest = max(components, key=len)
        report.append(f"| **Komponen Terbesar** | {len(largest)} node |")
        report.append(f"| **Node Terisolasi Total** | {len([c for c in components if len(c) == 1])} |")

    report.append("\n---\n*Laporan ini di-generate otomatis menggunakan NetworkX + multilingual sentence embeddings. "
                  "Seluruh angka dihitung langsung dari topologi graf tanpa interpretasi manual.*")

    output_content = "\n".join(report)
    with open('laporan_hasil_lna.md', 'w', encoding='utf-8') as f:
        f.write(output_content)
    print(output_content)


if __name__ == "__main__":
    analyze_network()
