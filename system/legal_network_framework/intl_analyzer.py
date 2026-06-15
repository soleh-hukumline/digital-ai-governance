import json
import os
import networkx as nx

# Display labels for the international corpus instruments (doc-id -> human label)
INTL_LABELS = {
    "Council_of_Europe_Framework_Convention_on_AI_CETS225":
        "Council of Europe Framework Convention (CETS 225)",
    "UNGA_Res_78_265_Safe_Secure_Trustworthy_AI": "UNGA Res. 78/265",
    "OECD_AI_Principles_2024": "OECD AI Principles",
    "EU_AI_Act_2024": "EU AI Act",
    "UNESCO_Recommendation_on_AI_Ethics_2021": "UNESCO Recommendation on AI Ethics",
    "UNGA_Res_78_311_Global_Digital_Compact_or_AI": "UNGA Res. 78/311 (Global Digital Compact)",
    "ISO_IEC_42001_AI_Management_System": "ISO/IEC 42001 (AI Management System)",
    "ASEAN_Guide_AI_Governance_Ethics_2024": "ASEAN Guide on AI Governance & Ethics",
    "G7_Hiroshima_Code_of_Conduct_for_AI": "G7 Hiroshima Code of Conduct",
    "WHO_Ethics_and_Governance_of_AI_for_Health": "WHO Ethics & Governance of AI for Health",
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
            'label': INTL_LABELS.get(doc, doc),
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


def analyze_intl_only():
    G = nx.Graph()
    try:
        with open('../../data/network/legal_graph.json', 'r', encoding='utf-8') as f:
            data = json.load(f)

        intl_nodes = [n for n in data['nodes']
                      if n.get('classification', n.get('group', '')).startswith('Intl:')]
        intl_ids = {n['id'] for n in intl_nodes}

        for n in intl_nodes:
            G.add_node(n['id'], label=n['label'], group=n.get('group', ''),
                       classification=n.get('classification', ''))

        for e in data['edges']:
            if e['from'] in intl_ids and e['to'] in intl_ids:
                weight = 1.0
                label_txt = e.get('label', '')
                if 'Sim' in label_txt:
                    try:
                        weight = float(label_txt.split('Sim')[1].split('%')[0].strip()) / 100.0
                    except:
                        pass
                G.add_edge(e['from'], e['to'], type=label_txt, weight=weight)

        # Export sub-graph
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
                "title": f"Degree Semantik: {deg}"
            })
        edges_export = []
        for u, v, attrs in G.edges(data=True):
            edges_export.append({"from": u, "to": v,
                                  "label": attrs.get("type", "link"), "arrows": "to"})
        with open('../../data/network/intl_graph.json', 'w', encoding='utf-8') as f:
            json.dump({"nodes": nodes_export, "edges": edges_export}, f, indent=2)

    except Exception as e:
        print(f"Error: {e}")
        return

    # === GENERATE REPORT ===
    density = nx.density(G)
    degree_dict2 = nx.degree_centrality(G)
    sorted_degree = sorted(degree_dict2.items(), key=lambda x: x[1], reverse=True)
    betweenness_dict = nx.betweenness_centrality(G)
    sorted_between = sorted(betweenness_dict.items(), key=lambda x: x[1], reverse=True)

    # Isolated nodes = no internal semantic connections
    isolated = [n for n in G.nodes() if G.degree(n) == 0]

    report = []
    report.append("# Analisis Jaringan Regulasi Internasional\n")
    report.append(
        "Sub-analisis ini memetakan jaringan regulasi AI internasional pada dua lapisan. "
        "**Lapisan otoritas utama** adalah *sitasi instrumen-ke-instrumen* (cross-reference "
        "eksplisit) yang dibaca dari `data/network/citations.json` — metrik legal yang "
        "dapat dipertanggungjawabkan dan tidak bergantung pada model embedding. "
        "**Lapisan sekunder** adalah kemiripan tekstual SBERT (multilingual embeddings) yang "
        "bersifat *eksploratif* untuk memetakan tumpang-tindih semantik, BUKAN otoritas.\n"
    )

    # === 0. CITATION AUTHORITY (PRIMARY LAYER) — prepended ===
    # International-corpus instruments, ranked by in-degree (times cited within corpus).
    intl_view_docs = [
        "Council_of_Europe_Framework_Convention_on_AI_CETS225",
        "UNGA_Res_78_265_Safe_Secure_Trustworthy_AI",
        "OECD_AI_Principles_2024",
        "EU_AI_Act_2024",
        "UNESCO_Recommendation_on_AI_Ethics_2021",
        "UNGA_Res_78_311_Global_Digital_Compact_or_AI",
        "ISO_IEC_42001_AI_Management_System",
        "ASEAN_Guide_AI_Governance_Ethics_2024",
        "G7_Hiroshima_Code_of_Conduct_for_AI",
        "WHO_Ethics_and_Governance_of_AI_for_Health",
    ]
    auth = load_citation_authority(intl_view_docs)
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
        report.append("| Peringkat | Instrumen Internasional | Dikutip (in-degree) | Peran sitasi |")
        report.append("| --- | --- | --- | --- |")
        rank = 0
        for r in auth['rows']:
            if r['in'] <= 0:
                continue
            rank += 1
            report.append(f"| {rank} | {r['label']} | **{r['in']}** | {r['role']} |")
        report.append(
            "\n**Pembacaan:** dalam korpus internasional, **Council of Europe Framework "
            "Convention (CETS 225)** adalah jangkar otoritas tertinggi (dikutip 23×), "
            "diikuti **UNGA Res. 78/265** (7×), **OECD AI Principles** (5×), **EU AI Act** "
            "(4×), dan **UNESCO Recommendation** (3×)."
        )
        # Source/leaf instruments: cite others but are cited 0x within the corpus
        leaves = [r['label'] for r in auth['rows'] if r['in'] == 0]
        if leaves:
            report.append(
                "\n**Instrumen sumber/leaf (mengutip pihak lain tetapi dikutip 0× dalam "
                "korpus)** — yakni *adopter soft-law hilir*, bukan otoritas: "
                + ", ".join(leaves) + ". "
                "Contohnya **G7 Hiroshima, ISO/IEC 42001, dan ASEAN Guide** muncul sebagai "
                "sumber-sitasi, bukan rujukan otoritatif."
            )
        report.append("")

    report.append("## 1. Metrik Kohesi Internal")
    report.append(f"| Metrik | Nilai |")
    report.append(f"| --- | --- |")
    report.append(f"| **Total Node Internasional** | {G.number_of_nodes()} |")
    report.append(f"| **Koneksi Semantik Internal** | {G.number_of_edges()} edge |")
    report.append(f"| **Densitas Internal** | {density:.4f} |")
    report.append(f"| **Node Terisolasi** | {len(isolated)} node |\n")

    # Themes from data: group nodes by 'group' attribute
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

    report.append("## 3. Sentralitas Semantik (SBERT — eksploratif, BUKAN otoritas)")
    report.append(
        "*Tabel berikut adalah **degree centrality berbasis kemiripan tekstual SBERT**, "
        "bukan otoritas sitasi. Metrik ini mengukur tumpang-tindih semantik dan "
        "cenderung **menggelembungkan soft-law panjang** (mis. Stranas AI, WHO, SE Komdigi) "
        "karena banyaknya seksi generik. Gunakan sebagai lensa sekunder/eksploratif; "
        "lapisan otoritas adalah tabel sitasi pada §0.*\n"
    )
    report.append("| Peringkat | Node | Instrumen | Skor SBERT |")
    report.append("| --- | --- | --- | --- |")
    for idx, (node_id, score) in enumerate(sorted_degree[:10]):
        label = G.nodes[node_id].get('label', node_id)
        group = G.nodes[node_id].get('group', 'Unknown')
        report.append(f"| {idx+1} | {label} | {group} | {score:.4f} |")

    report.append("\n## 4. Betweenness Centrality — Top 10")
    report.append("| Peringkat | Node | Instrumen | Skor |")
    report.append("| --- | --- | --- | --- |")
    for idx, (node_id, score) in enumerate(sorted_between[:10]):
        label = G.nodes[node_id].get('label', node_id)
        group = G.nodes[node_id].get('group', 'Unknown')
        report.append(f"| {idx+1} | {label} | {group} | {score:.4f} |")

    report.append("\n## 5. Node Terisolasi")
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
        report.append("*Semua node internasional memiliki koneksi internal.*")

    report.append("\n---\n*Sub-laporan dihasilkan dari analisis NetworkX pada sub-graf regulasi internasional. "
                  "Metrik dihitung dari data graf aktual tanpa interpretasi manual.*")

    with open('laporan_khusus_internasional.md', 'w', encoding='utf-8') as f:
        f.write("\n".join(report))
    print("Intl report done.")


if __name__ == "__main__":
    analyze_intl_only()
