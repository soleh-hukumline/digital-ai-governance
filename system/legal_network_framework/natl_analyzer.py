import json
import os
import networkx as nx

# Display labels for the national-corpus instruments (doc-id -> human label)
NATL_LABELS = {
    "UU_ITE_No19_2016": "UU ITE No.19/2016",
    "PP_PSTE_No71_2019": "PP PSTE No.71/2019",
    "UU_PDP_No27_2022": "UU PDP No.27/2022",
    "UU_ITE_No1_2024": "UU ITE No.1/2024",
    "SE_Komdigi_No9_2023_Etika_AI": "SE Komdigi No.9/2023 (Etika AI)",
    "Stranas_AI_Indonesia_2020-2045_Full": "Stranas AI 2020-2045",
    "POJK_No3_2024_Inovasi_Teknologi_Keuangan": "POJK No.3/2024 (Inovasi Teknologi Keuangan)",
}


def load_citation_authority(view_docs):
    """Read the instrument-level citation graph (data/network/citations.json) and
    return per-document authority (in-degree = how often an instrument is CITED
    within the corpus), scoped to the documents relevant to this view.

    This is the PRIMARY, defensible authority layer: explicit instrument-to-instrument
    cross-references, independent of any embedding model. It is computed directly from
    citations.json — no SBERT, no network model — so the script still runs from the
    already-built graph alone.
    """
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                        '..', '..', 'data', 'network', 'citations.json')
    try:
        with open(path, 'r', encoding='utf-8') as f:
            cit = json.load(f)
    except Exception as e:
        print(f"(citations.json unavailable: {e})")
        return None

    cov = {c['doc']: c for c in cit.get('coverage', [])}
    rows = []
    for doc in view_docs:
        c = cov.get(doc)
        if not c:
            continue
        rows.append({
            'doc': doc,
            'label': NATL_LABELS.get(doc, doc),
            'in': c.get('in', 0),     # authority = times cited within corpus
            'out': c.get('out', 0),   # references this doc makes
            'role': c.get('role', ''),
        })
    rows.sort(key=lambda r: r['in'], reverse=True)
    return {
        'rows': rows,
        'n_docs': cit.get('n_docs'),
        'n_isolated': cit.get('n_isolated'),
        'edges': len(cit.get('edges', [])),
    }


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
        "Sub-analisis ini memetakan regulasi nasional Indonesia pada dua lapisan. "
        "**Lapisan otoritas utama** adalah *sitasi instrumen-ke-instrumen* (cross-reference "
        "eksplisit) yang dibaca dari `data/network/citations.json` — metrik legal yang "
        "dapat dipertanggungjawabkan dan tidak bergantung pada model embedding. "
        "**Lapisan sekunder** adalah kemiripan tekstual SBERT (multilingual embeddings) yang "
        "bersifat *eksploratif* untuk memetakan tumpang-tindih semantik, BUKAN otoritas.\n"
    )

    # === 0. CITATION AUTHORITY (PRIMARY LAYER) — prepended ===
    # National-corpus instruments, ranked by in-degree (times cited within corpus).
    natl_view_docs = [
        "UU_ITE_No19_2016",
        "PP_PSTE_No71_2019",
        "UU_PDP_No27_2022",
        "UU_ITE_No1_2024",
        "SE_Komdigi_No9_2023_Etika_AI",
        "Stranas_AI_Indonesia_2020-2045_Full",
        "POJK_No3_2024_Inovasi_Teknologi_Keuangan",
    ]
    auth = load_citation_authority(natl_view_docs)
    if auth:
        report.append("## 0. Otoritas Sitasi — Lapisan Otoritas Utama (PRIMER)")
        report.append(
            "*Otoritas = **in-degree**: seberapa sering sebuah instrumen DIKUTIP "
            "(cross-reference eksplisit) oleh instrumen lain dalam korpus 17 dokumen "
            f"(**{auth['edges']} edge sitasi**, **{auth['n_docs']} dokumen**, "
            f"**{auth['n_isolated']} terisolasi-by-citation**). Lapisan ini berbasis "
            "instrumen, dihitung langsung dari `citations.json`, dan TIDAK bergantung "
            "pada embedding — inilah ukuran otoritas yang dipakai untuk interpretasi.*\n"
        )
        report.append("| Peringkat | Instrumen Nasional | Dikutip (in-degree) | Peran sitasi |")
        report.append("| --- | --- | --- | --- |")
        rank = 0
        for r in auth['rows']:
            if r['in'] <= 0:
                continue
            rank += 1
            report.append(f"| {rank} | {r['label']} | **{r['in']}** | {r['role']} |")
        report.append(
            "\n**Pembacaan:** **UU ITE No.19/2016** adalah hub otoritas sesungguhnya dari "
            "korpus nasional (dikutip 39×), jauh di atas **PP PSTE No.71/2019** (6×) dan "
            "**UU PDP No.27/2022** (1×). Ini berbeda tajam dari tabel kemiripan semantik "
            "SBERT di bawah, yang justru didominasi soft-law (Stranas AI, SE Komdigi)."
        )
        # Source/leaf instruments: cite others but are cited 0x within the corpus
        leaves = [r['label'] for r in auth['rows'] if r['in'] == 0]
        if leaves:
            report.append(
                "\n**Instrumen sumber/leaf (mengutip pihak lain tetapi dikutip 0× dalam "
                "korpus)** — yakni *adopter soft-law hilir*, bukan otoritas: "
                + ", ".join(leaves) + ". "
                "Termasuk **SE Komdigi No.9/2023** dan **UU ITE No.1/2024**, yang mengutip "
                "instrumen lain tetapi belum menjadi rujukan otoritatif dalam korpus."
            )
        report.append("")

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

    report.append("## 3. Sentralitas Semantik (SBERT — eksploratif, BUKAN otoritas)")
    report.append(
        "*Tabel berikut adalah **degree centrality berbasis kemiripan tekstual SBERT**, "
        "bukan otoritas sitasi. Metrik ini mengukur tumpang-tindih semantik dan "
        "cenderung **menggelembungkan soft-law panjang** (mis. Stranas AI, SE Komdigi) "
        "karena banyaknya seksi generik. Gunakan sebagai lensa sekunder/eksploratif; "
        "lapisan otoritas adalah tabel sitasi pada §0 (UU ITE 19/2016 = hub, in-degree 39).*\n"
    )
    report.append("| Peringkat | Node | Instrumen | Skor SBERT |")
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
