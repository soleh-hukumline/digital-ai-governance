import json
import networkx as nx

def analyze_gap():
    G_raw = nx.Graph()
    try:
        with open('../../data/network/legal_graph.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
        for n in data['nodes']:
            G_raw.add_node(n['id'], label=n['label'], group=n.get('group',''),
                           classification=n.get('classification',''))
        for e in data['edges']:
            G_raw.add_edge(e['from'], e['to'], type=e.get('label','link'))

        # Build aggregated gap graph
        G_gap = nx.Graph()
        group_weights = {}
        for n, attr in G_raw.nodes(data=True):
            grp = attr.get('group','Unknown')
            cls = attr.get('classification','Unknown')
            if grp not in group_weights:
                group_weights[grp] = {'count': 0, 'classification': cls}
            group_weights[grp]['count'] += 1
        for grp, meta in group_weights.items():
            G_gap.add_node(grp, label=grp, group=grp,
                           classification=meta['classification'], value=meta['count']*5)
        for u, v, attr in G_raw.edges(data=True):
            grp_u = G_raw.nodes[u].get('group','Unknown')
            grp_v = G_raw.nodes[v].get('group','Unknown')
            if grp_u != grp_v:
                if G_gap.has_edge(grp_u, grp_v):
                    G_gap[grp_u][grp_v]['weight'] += 1
                else:
                    G_gap.add_edge(grp_u, grp_v, weight=1, type=attr.get('type','link'))

        nodes_export = []
        for node, attr in G_gap.nodes(data=True):
            nodes_export.append({
                "id": node, "label": attr.get('label'),
                "group": attr.get('group'), "classification": attr.get('classification'),
                "value": attr.get('value', 10),
                "title": f"Klaster: {attr.get('classification')}"
            })
        edges_export = []
        for u, v, attr in G_gap.edges(data=True):
            edges_export.append({
                "from": u, "to": v,
                "label": f"korelasi ({attr.get('weight',1)} edge)",
                "value": attr.get('weight',1),
                "arrows": "to" if "Incid" in u or "Incid" in v else ""
            })
        with open('../../data/network/gap_graph.json', 'w', encoding='utf-8') as f:
            json.dump({"nodes": nodes_export, "edges": edges_export}, f, indent=2)

    except Exception as e:
        print(f"Error: {e}")
        return

    # === GENERATE REPORT ===
    report = []
    report.append("# Gap Analysis — Konsolidasi Temuan LNA\n")
    report.append(
        "Laporan ini mengkonsolidasikan temuan dari seluruh sub-analisis LNA. "
        "Seluruh metrik dihitung dari topologi graf aktual menggunakan NetworkX "
        "dan multilingual sentence embeddings.\n"
    )

    # 1. Macro summary
    intl_nodes = [n for n, a in G_raw.nodes(data=True) if a.get('classification','').startswith('Intl:')]
    natl_nodes = [n for n, a in G_raw.nodes(data=True) if a.get('classification','').startswith('Natl:')]
    inc_nodes = [n for n, a in G_raw.nodes(data=True) if a.get('classification','') == 'Insiden Kasus']

    report.append("## 1. Ringkasan Makro")
    report.append("| Metrik | Nilai |")
    report.append("| --- | --- |")
    report.append(f"| **Total Node** | {G_raw.number_of_nodes()} |")
    report.append(f"| **Total Edge** | {G_raw.number_of_edges()} |")
    report.append(f"| **Node Internasional** | {len(intl_nodes)} |")
    report.append(f"| **Node Nasional** | {len(natl_nodes)} |")
    report.append(f"| **Node Insiden** | {len(inc_nodes)} |")
    report.append(f"| **Densitas** | {nx.density(G_raw):.5f} |")
    report.append(f"| **Klaster (Aggregated)** | {G_gap.number_of_nodes()} |")
    report.append(f"| **Koneksi Antar-Klaster** | {G_gap.number_of_edges()} |\n")

    # 2. Coverage per group (data-driven)
    report.append("## 2. Coverage per Klaster Regulasi")
    report.append("| Klaster | Klasifikasi | Total Node | Node Terhubung | Cross-Group Edge | Coverage |")
    report.append("| --- | --- | --- | --- | --- | --- |")

    group_stats = {}
    for n, attr in G_raw.nodes(data=True):
        grp = attr.get('group', 'Unknown')
        cls = attr.get('classification', 'Unknown')
        if grp not in group_stats:
            group_stats[grp] = {'total': 0, 'connected': 0, 'cross_edges': 0, 'classification': cls}
        group_stats[grp]['total'] += 1
        if G_raw.degree(n) > 0:
            group_stats[grp]['connected'] += 1
            for neighbor in G_raw.neighbors(n):
                if G_raw.nodes[neighbor].get('group', '') != grp:
                    group_stats[grp]['cross_edges'] += 1

    for grp in sorted(group_stats.keys()):
        s = group_stats[grp]
        cov = (s['connected'] / max(s['total'], 1)) * 100
        report.append(f"| {grp} | {s['classification']} | {s['total']} | {s['connected']} | {s['cross_edges']} | {cov:.1f}% |")

    # 3. Isolated groups (gap graph nodes with no edges)
    report.append("\n## 3. Klaster Terisolasi (Tanpa Koneksi Antar-Klaster)")
    isolated_groups = [n for n in G_gap.nodes() if G_gap.degree(n) == 0]
    if isolated_groups:
        report.append("| Klaster | Klasifikasi | Jumlah Node |")
        report.append("| --- | --- | --- |")
        for grp in isolated_groups:
            cls = G_gap.nodes[grp].get('classification', '')
            count = group_weights.get(grp, {}).get('count', 0)
            report.append(f"| {grp} | {cls} | {count} |")
    else:
        report.append("*Semua klaster memiliki setidaknya satu koneksi antar-klaster.*\n")

    # 4. Inter-cluster connectivity matrix
    report.append("\n## 4. Matriks Konektivitas Antar-Klaster (Top 15 Pasangan)")
    report.append("| Klaster A | Klaster B | Jumlah Edge |")
    report.append("| --- | --- | --- |")
    sorted_gap_edges = sorted(G_gap.edges(data=True), key=lambda x: x[2].get('weight', 0), reverse=True)
    for u, v, attr in sorted_gap_edges[:15]:
        report.append(f"| {u} | {v} | {attr.get('weight', 0)} |")

    # 5. Nodes with zero connections in raw graph
    all_isolated = [n for n in G_raw.nodes() if G_raw.degree(n) == 0]
    report.append(f"\n## 5. Node Terisolasi (degree=0)")
    report.append(f"Total: **{len(all_isolated)}** node dari {G_raw.number_of_nodes()} "
                  f"({len(all_isolated)/max(G_raw.number_of_nodes(),1)*100:.1f}%)\n")

    # Break down by classification
    iso_by_cls = {}
    for n in all_isolated:
        cls = G_raw.nodes[n].get('classification', 'Unknown')
        iso_by_cls[cls] = iso_by_cls.get(cls, 0) + 1

    if iso_by_cls:
        report.append("| Klasifikasi | Jumlah Terisolasi |")
        report.append("| --- | --- |")
        for cls in sorted(iso_by_cls.keys()):
            report.append(f"| {cls} | {iso_by_cls[cls]} |")

    # 6. Connected Components
    components = list(nx.connected_components(G_raw))
    report.append(f"\n## 6. Connected Components")
    report.append(f"| Metrik | Nilai |")
    report.append(f"| --- | --- |")
    report.append(f"| **Jumlah Komponen** | {len(components)} |")
    if components:
        sorted_comps = sorted(components, key=len, reverse=True)
        report.append(f"| **Komponen Terbesar** | {len(sorted_comps[0])} node |")
        if len(sorted_comps) > 1:
            report.append(f"| **Komponen Ke-2** | {len(sorted_comps[1])} node |")
        report.append(f"| **Komponen Singleton** | {len([c for c in components if len(c) == 1])} |")

    report.append("\n---\n*Laporan ini di-generate otomatis dari dataset LNA + NetworkX. "
                  "Seluruh angka dihitung dari topologi graf aktual tanpa interpretasi manual.*")

    with open('laporan_gap_analysis.md', 'w', encoding='utf-8') as f:
        f.write("\n".join(report))
    print("Gap analysis report generated.")


if __name__ == "__main__":
    analyze_gap()
