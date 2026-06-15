import json
import networkx as nx

def analyze_incidents():
    G = nx.Graph()
    try:
        with open('../../data/network/legal_graph.json', 'r', encoding='utf-8') as f:
            data = json.load(f)

        for n in data['nodes']:
            G.add_node(n['id'], label=n['label'], group=n.get('group', ''),
                       classification=n.get('classification', n.get('group', '')))

        for e in data['edges']:
            if "governs" in e.get('label', ''):
                G.add_edge(e['from'], e['to'], type="governs")

        # Export
        degree_dict = dict(G.degree())
        orig_nodes  = {n['id']: n for n in data['nodes']}
        valid_nodes = set()
        for u, v in G.edges():
            valid_nodes.add(u); valid_nodes.add(v)

        nodes_export = []
        for node in valid_nodes:
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
            edges_export.append({"from": u, "to": v,
                                  "label": attrs.get("type", "governs"), "arrows": "to"})
        # NOTE: this is the EXPLORATORY cosine baseline graph. The canonical
        # incident_graph.json (used by the dashboard) is built by
        # build_incident_graph_fewshot.py from the validated few-shot judge.
        # Write to a clearly-named backup so this never clobbers the few-shot graph.
        with open('../../data/network/incident_graph_cosine.json', 'w', encoding='utf-8') as f:
            json.dump({"nodes": nodes_export, "edges": edges_export}, f, indent=2)

    except Exception as e:
        print(f"Error: {e}")
        return

    # === ANALYSIS ===
    incidents = [n for n, d in G.nodes(data=True)
                 if d.get('classification', d.get('group')) == 'Insiden Kasus']
    incident_coverage = {inc: [] for inc in incidents}
    reg_captures      = {}

    for u, v in G.edges():
        grp_u = G.nodes[u].get('classification', '')
        grp_v = G.nodes[v].get('classification', '')
        inc_node = u if grp_u == 'Insiden Kasus' else (v if grp_v == 'Insiden Kasus' else None)
        if inc_node:
            reg_node = v if inc_node == u else u
            incident_coverage[inc_node].append(reg_node)
            reg_captures[reg_node] = reg_captures.get(reg_node, 0) + 1

    vacuum_incidents = [i for i, r in incident_coverage.items() if len(r) == 0]
    natl_only = []
    intl_only  = []
    mixed_warrant = []
    for inc, regs in incident_coverage.items():
        if not regs: continue
        has_natl = any(G.nodes[r].get('classification','').startswith('Natl:') for r in regs)
        has_intl = any(G.nodes[r].get('classification','').startswith('Intl:') for r in regs)
        if has_natl and has_intl:
            mixed_warrant.append(inc)
        elif has_natl:
            natl_only.append(inc)
        elif has_intl:
            intl_only.append(inc)

    vacuum_rate   = len(vacuum_incidents)  / max(len(incidents), 1) * 100
    natl_rate     = len(natl_only)         / max(len(incidents), 1) * 100
    intl_dep_rate = len(intl_only)         / max(len(incidents), 1) * 100
    mixed_rate    = len(mixed_warrant)     / max(len(incidents), 1) * 100

    sorted_regs = sorted(reg_captures.items(), key=lambda x: x[1], reverse=True)

    report = []
    report.append("# Analisis Insiden — Pemetaan Warrant per Kasus\n")
    report.append(
        "Laporan ini memetakan distribusi warrant normatif (dasar hukum) untuk setiap insiden "
        "siber berbasis AI di Indonesia. Metrik di bawah dihitung dari koneksi 'governs' "
        "pada graf LNA, yaitu hasil *retrieval* kemiripan semantik (SBERT/cosine) — bersifat "
        "EKSPLORATIF, BUKAN lapisan otoritas hukum.\n"
    )
    report.append(
        "> ⚠️ **Catatan otoritas & koreksi.** Angka 'tanpa warrant' di bawah adalah baseline "
        "*cosine retrieval* (≈44,4% insiden tanpa edge `governs`). Ini **artefak retrieval, "
        "BUKAN kekosongan hukum**: cosine gagal me-ranking pasal yang berlaku (mis. UU PDP "
        "Pasal 35 sempat di peringkat 154). Setelah pemetaan tervalidasi (judge few-shot, "
        "kandidat recall-complete, ambang P≥95), **88,9% insiden (40/45) memiliki dasar hukum** "
        "dan celah riil bersifat **asimetris-subjek + spesifik-AI** (lih. REVIEWER_RESPONSE.md §2.3/§2.5). "
        "Klaim '55,6% vacuum / structural holes' DITARIK. Lapisan **otoritas eksplisit** (sitasi "
        "antar-instrumen) ada di `../../data/network/citations.json` — bukan pada edge `governs` di sini.\n"
    )

    report.append("## 1. Distribusi Warrant per Insiden (baseline cosine — eksploratif)")
    report.append("| Kategori | Jumlah | Persentase |")
    report.append("| --- | --- | --- |")
    report.append(f"| Tanpa edge `governs` cosine (degree=0; ≠ kekosongan hukum) | {len(vacuum_incidents)} | {vacuum_rate:.1f}% |")
    report.append(f"| Warrant nasional saja | {len(natl_only)} | {natl_rate:.1f}% |")
    report.append(f"| Warrant internasional saja | {len(intl_only)} | {intl_dep_rate:.1f}% |")
    report.append(f"| Warrant ganda (Natl + Intl) | {len(mixed_warrant)} | {mixed_rate:.1f}% |")
    report.append(f"| **Total Insiden** | **{len(incidents)}** | **100%** |\n")

    report.append("## 2. Regulasi yang Paling Sering Menjadi Warrant (baseline cosine — eksploratif)")
    report.append(
        "*Peringkat berikut adalah artefak presisi cosine (pasal definitional bisa menonjol). "
        "Untuk otoritas eksplisit antar-instrumen lihat `../../data/network/citations.json`.*"
    )
    report.append("| Peringkat | Regulasi | Klasifikasi | Jumlah Insiden |")
    report.append("| --- | --- | --- | --- |")
    for idx, (reg_id, count) in enumerate(sorted_regs[:15]):
        label = G.nodes[reg_id].get('label', reg_id)
        cls = G.nodes[reg_id].get('classification', '')
        report.append(f"| {idx+1} | {label} | {cls} | {count} |")
    report.append("")

    report.append("## 3. Insiden Tanpa Edge `governs` Cosine (artefak retrieval — BUKAN structural holes)")
    report.append(
        f"Total: **{len(vacuum_incidents)}** insiden tanpa edge `governs` cosine (≈{vacuum_rate:.1f}%). "
        "Ini **bukan** kekosongan hukum: di pemetaan tervalidasi (judge P≥95) hanya **5/45 (11,1%)** "
        "yang benar-benar tanpa dasar hukum berkepercayaan-tinggi (lih. REVIEWER_RESPONSE.md §2.3).\n"
    )
    if vacuum_incidents:
        report.append("| No | Insiden |")
        report.append("| --- | --- |")
        for i, inc_id in enumerate(vacuum_incidents[:20]):
            label = G.nodes[inc_id].get('label', inc_id)
            report.append(f"| {i+1} | {label} |")
        if len(vacuum_incidents) > 20:
            report.append(f"| | *(+{len(vacuum_incidents)-20} lainnya)* |")
    else:
        report.append("*Semua insiden memiliki setidaknya satu warrant semantik.*")

    # Per-incident detail
    connected_incidents = [(inc, regs) for inc, regs in incident_coverage.items() if regs]
    connected_incidents.sort(key=lambda x: len(x[1]), reverse=True)

    report.append("\n## 4. Insiden dengan Warrant Terbanyak")
    report.append("| Peringkat | Insiden | Jumlah Warrant | Klasifikasi Warrant |")
    report.append("| --- | --- | --- | --- |")
    for idx, (inc_id, regs) in enumerate(connected_incidents[:10]):
        label = G.nodes[inc_id].get('label', inc_id)
        cls_list = set(G.nodes[r].get('classification', '')[:4] for r in regs)
        report.append(f"| {idx+1} | {label} | {len(regs)} | {', '.join(cls_list)} |")

    report.append("\n---\n*Laporan dihasilkan dari edge 'governs' (kemiripan semantik SBERT/cosine, "
                  "EKSPLORATIF) pada graf LNA. Coverage tervalidasi = 88,9% (40/45), bukan 'vacuum'; "
                  "lihat REVIEWER_RESPONSE.md §2.3/§2.5. Otoritas eksplisit (sitasi antar-instrumen): "
                  "../../data/network/citations.json.*")

    with open('laporan_khusus_insiden.md', 'w', encoding='utf-8') as f:
        f.write("\n".join(report))
    print("Incident report done.")


if __name__ == "__main__":
    analyze_incidents()
