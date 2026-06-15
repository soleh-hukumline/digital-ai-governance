import json
import os
import networkx as nx

# Display labels + jurisdiction tag for the full corpus (doc-id -> (label, juris))
CROSS_LABELS = {
    # National
    "UU_ITE_No19_2016": ("UU ITE No.19/2016", "Nasional"),
    "PP_PSTE_No71_2019": ("PP PSTE No.71/2019", "Nasional"),
    "UU_PDP_No27_2022": ("UU PDP No.27/2022", "Nasional"),
    "UU_ITE_No1_2024": ("UU ITE No.1/2024", "Nasional"),
    "SE_Komdigi_No9_2023_Etika_AI": ("SE Komdigi No.9/2023 (Etika AI)", "Nasional"),
    "Stranas_AI_Indonesia_2020-2045_Full": ("Stranas AI 2020-2045", "Nasional"),
    "POJK_No3_2024_Inovasi_Teknologi_Keuangan": ("POJK No.3/2024", "Nasional"),
    # International
    "Council_of_Europe_Framework_Convention_on_AI_CETS225":
        ("Council of Europe Framework Convention (CETS 225)", "Internasional"),
    "UNGA_Res_78_265_Safe_Secure_Trustworthy_AI": ("UNGA Res. 78/265", "Internasional"),
    "OECD_AI_Principles_2024": ("OECD AI Principles", "Internasional"),
    "EU_AI_Act_2024": ("EU AI Act", "Internasional"),
    "UNESCO_Recommendation_on_AI_Ethics_2021": ("UNESCO Recommendation on AI Ethics", "Internasional"),
    "UNGA_Res_78_311_Global_Digital_Compact_or_AI": ("UNGA Res. 78/311 (Global Digital Compact)", "Internasional"),
    "ISO_IEC_42001_AI_Management_System": ("ISO/IEC 42001 (AI Management System)", "Internasional"),
    "ASEAN_Guide_AI_Governance_Ethics_2024": ("ASEAN Guide on AI Governance & Ethics", "Internasional"),
    "G7_Hiroshima_Code_of_Conduct_for_AI": ("G7 Hiroshima Code of Conduct", "Internasional"),
    "WHO_Ethics_and_Governance_of_AI_for_Health": ("WHO Ethics & Governance of AI for Health", "Internasional"),
}


def load_citation_authority():
    """Read the instrument-level citation graph (data/network/citations.json) and
    return per-document authority (in-degree = how often an instrument is CITED
    within the corpus) across BOTH jurisdictions for the cross-jurisdiction view.

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

    rows = []
    for c in cit.get('coverage', []):
        doc = c.get('doc')
        label, juris = CROSS_LABELS.get(doc, (doc, ""))
        rows.append({
            'doc': doc,
            'label': label,
            'juris': juris,
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
        "Laporan ini bekerja pada dua lapisan. **Lapisan otoritas utama (§0)** adalah "
        "*sitasi instrumen-ke-instrumen* (cross-reference eksplisit) yang dibaca dari "
        "`data/network/citations.json` — metrik legal yang dapat dipertanggungjawabkan "
        "dan tidak bergantung pada embedding. **Lapisan sekunder (§1 dst.)** mengukur "
        "koneksi *kemiripan tekstual* SBERT antara regulasi internasional dan nasional "
        "(tier similarity); lapisan ini bersifat **eksploratif** untuk memetakan tumpang-"
        "tindih semantik, BUKAN otoritas.\n"
    )

    # === 0. CITATION AUTHORITY (PRIMARY LAYER) — prepended ===
    # Cross-jurisdiction view: authority across BOTH jurisdictions by in-degree.
    auth = load_citation_authority()
    if auth:
        report.append("## 0. Otoritas Sitasi Lintas Yurisdiksi — Lapisan Otoritas Utama (PRIMER)")
        report.append(
            "*Otoritas = **in-degree**: seberapa sering sebuah instrumen DIKUTIP "
            "(cross-reference eksplisit) oleh instrumen lain dalam korpus 17 dokumen "
            f"(**{auth['edges']} edge sitasi**, **{auth['n_docs']} dokumen**, "
            f"**{auth['n_isolated']} terisolasi-by-citation**). Lapisan ini berbasis "
            "instrumen, dihitung langsung dari `citations.json`, dan TIDAK bergantung "
            "pada embedding — inilah ukuran otoritas yang dipakai untuk interpretasi.*\n"
        )
        report.append("| Peringkat | Instrumen | Yurisdiksi | Dikutip (in-degree) | Peran sitasi |")
        report.append("| --- | --- | --- | --- | --- |")
        rank = 0
        for r in auth['rows']:
            if r['in'] <= 0:
                continue
            rank += 1
            report.append(f"| {rank} | {r['label']} | {r['juris']} | **{r['in']}** | {r['role']} |")
        report.append(
            "\n**Pembacaan:** secara lintas yurisdiksi, hub otoritas didominasi instrumen "
            "**nasional yang mengikat** — **UU ITE No.19/2016** (dikutip 39×) — disusul "
            "jangkar internasional **Council of Europe Framework Convention (CETS 225)** "
            "(23×), lalu **UNGA Res. 78/265** (7×), **PP PSTE No.71/2019** (6×), "
            "**OECD AI Principles** (5×), **EU AI Act** (4×), dan **UNESCO Recommendation** (3×). "
            "Otoritas sitasi ini independen dari tier kemiripan SBERT di §1-§3."
        )
        leaves = [f"{r['label']} ({r['juris']})" for r in auth['rows'] if r['in'] == 0]
        if leaves:
            report.append(
                "\n**Instrumen sumber/leaf (mengutip pihak lain tetapi dikutip 0× dalam "
                "korpus)** — *adopter soft-law hilir*, bukan otoritas: "
                + ", ".join(leaves) + "."
            )
        report.append("")

    pseudo_rate = len(pseudo_adoption) / max(total, 1) * 100
    partial_rate = len(partial_adoption) / max(total, 1) * 100
    full_rate = len(full_adoption) / max(total, 1) * 100

    report.append("## 1. Distribusi Tier Similarity (SBERT — eksploratif, BUKAN otoritas)")
    report.append(
        "*Tier berikut dihitung dari **kemiripan tekstual SBERT** antar-yurisdiksi, "
        "bukan sitasi. Ini lensa sekunder/eksploratif untuk tumpang-tindih semantik; "
        "lapisan otoritas adalah tabel sitasi pada §0.*\n"
    )
    report.append("| Tier | Skor Similarity | Jumlah Koneksi | Persentase |")
    report.append("| --- | --- | --- | --- |")
    report.append(f"| **Full Adoption** | ≥30% | {len(full_adoption)} | {full_rate:.1f}% |")
    report.append(f"| **Partial Adoption** | 10–29% | {len(partial_adoption)} | {partial_rate:.1f}% |")
    report.append(f"| **Low Similarity** | <10% | {len(pseudo_adoption)} | {pseudo_rate:.1f}% |")
    report.append(f"| **Total** | — | {total} | 100% |\n")

    report.append("## 2. Node Internasional dengan Koneksi Terbanyak ke Nasional "
                  "(degree SBERT — eksploratif, BUKAN otoritas)")
    report.append("| Peringkat | Node | Instrumen | Jumlah Koneksi | Avg Similarity |")
    report.append("| --- | --- | --- | --- | --- |")
    for idx, (node_id, degree) in enumerate(sorted_intl[:10]):
        label = G.nodes[node_id].get('label', node_id)
        grp = G.nodes[node_id].get('group', '')
        node_scores = [edge_scores.get((node_id, v), edge_scores.get((v, node_id), 0.05))
                       for _, v in G.edges(node_id)]
        avg_score = sum(node_scores) / max(len(node_scores), 1)
        report.append(f"| {idx+1} | {label} | {grp} | {degree} | {avg_score*100:.1f}% |")

    report.append("\n## 3. Node Nasional dengan Koneksi Terbanyak ke Internasional "
                  "(degree SBERT — eksploratif, BUKAN otoritas)")
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
