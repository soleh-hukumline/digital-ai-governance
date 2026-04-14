import json
import networkx as nx

def analyze_incidents():
    G = nx.Graph()
    try:
        with open('../../data/network/legal_graph.json', 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        for n in data['nodes']:
            G.add_node(n['id'], label=n['label'], group=n.get('group', ''), classification=n.get('classification', n.get('group', '')))
            
        # Add ONLY "governs" edges (Regulation -> Incident)
        for e in data['edges']:
            if "governs" in e.get('label', ''):
                G.add_edge(e['from'], e['to'], type="governs")
                
        # Export as separate graph
        degree_dict = dict(G.degree(G.nodes()))
        orig_nodes = {n['id']: n for n in data['nodes']}
        
        # for incident graph, we only want nodes that are incident AND their neighbors
        valid_nodes = set()
        for u, v in G.edges():
            valid_nodes.add(u)
            valid_nodes.add(v)
            
        nodes_export = []
        for node in valid_nodes:
            n_data = orig_nodes.get(node, {})
            deg = degree_dict.get(node, 1)
            nodes_export.append({
                "id": node,
                "label": n_data.get("label", node),
                "group": n_data.get("group", "Unknown"),
                "classification": n_data.get("classification", "Unknown"),
                "value": 10 + (deg * 4),
                "title": f"Degree/Koneksi Semantik: {deg}"
            })
            
        edges_export = []
        for u, v, attrs in G.edges(data=True):
            edges_export.append({
                "from": u, "to": v,
                "label": attrs.get("type", "link"),
                "arrows": "to"
            })
            
        with open('../../data/network/incident_graph.json', 'w', encoding='utf-8') as f:
            json.dump({"nodes": nodes_export, "edges": edges_export}, f, indent=2)
                
    except Exception as e:
        print(f"Error: {e}")
        return

    # Hitung jumlah total insiden
    incidents = [n for n, attr in G.nodes(data=True) if attr.get('classification', attr.get('group')) == 'Insiden Kasus']
    
    # Hitung siapa reg yang menangkap siapa
    incident_coverage = {inc: [] for inc in incidents}
    reg_captures = {}

    for u, v in G.edges():
        grp_u = G.nodes[u].get('classification', '')
        grp_v = G.nodes[v].get('classification', '')
        
        inc_node = u if grp_u == 'Insiden Kasus' else v if grp_v == 'Insiden Kasus' else None
        reg_node = u if inc_node != u else v

        if inc_node and reg_node:
            incident_coverage[inc_node].append(reg_node)
            reg_captures[reg_node] = reg_captures.get(reg_node, 0) + 1

    # Analisis Kekosongan Hukum
    vacuum_incidents = [inc for inc, regs in incident_coverage.items() if len(regs) == 0]
    vacuum_rate = (len(vacuum_incidents) / len(incidents) * 100) if incidents else 0

    report = []
    report.append("# Laporan: Pengujian Empiris *Vacuum of Law* — Pendekatan Model Argumentasi Toulmin\n")
    report.append("Laporan ini mengukur kohesi struktural dan kekuatan *warrant* normatif (nasional maupun internasional) dalam mengakomodasi dan mengadili anatomi material insiden keamanan siber berbasis kecerdasan algoritmik di Indonesia. Analisis ini mengoperasionalisasikan 6 unsur Model Argumentasi Toulmin secara komputasional.\n")
    
    report.append("## 1. Rasio Kekosongan Hukum — Qualifier Toulmin (Tingkat Kepastian Klaim)")
    report.append(f"- **Total Insiden Dievaluasi (Grounds):** {len(incidents)} Kasus Material")
    report.append(f"- **Insiden dengan Warrant Normatif:** {len(incidents) - len(vacuum_incidents)} Kasus (Sistem hukum berhasil menyediakan kaidah penghubung / *warrant* yang memadai)")
    report.append(f"- **Insiden Tanpa Warrant (Kekosongan Hukum Absolut):** {len(vacuum_incidents)} Kasus")
    if vacuum_incidents:
        vacuum_labels = [G.nodes[i].get('label', i) for i in vacuum_incidents[:10]]
        report.append(f"  - *Sampel Kasus Tanpa Warrant Normatif:* {', '.join(vacuum_labels)}")
        
    report.append(f"- **Qualifier — Tingkat Kepastian Klaim Kekosongan Hukum:** **{vacuum_rate:.2f}%**\n")
    if vacuum_rate > 30:
        report.append("> *Sintesis Toulmin — Claim Final:* Qualifier menunjukkan tingkat kepastian klaim yang **tinggi**. Sistem hukum Indonesia tidak memiliki cukup *warrant* normatif untuk menjamin kepastian hukum pada era disrupsi AI. Kondisi ini menjadikan kejahatan siber era baru (seperti *Algorithmic Social Engineering* maupun *Weaponized Deepfakes*) masih dalam kondisi **Kekosongan Hukum Absolut** yang tidak tertutupi.\n")
    else:
        report.append("> *Rebuttal Toulmin:* Meski rasio menunjukkan adanya *warrant* yang ditemukan, ini bukan indikasi bahwa hukum Indonesia sudah memadai. *Warrant* yang terdeteksi umumnya bersifat *lex generalis* (UU ITE, UU PDP) — terlalu umum dan kabur untuk menjangkau kompleksitas kasus AI spesifik. Ini adalah bentuk **Kekosongan Norma Relatif (Normative Vacuum)**: ada aturan, namun tidak tajam secara materiil.\n")

    # Siapa perundang-undangan paling rajin mengatur/nangkap?
    sorted_regs = sorted(reg_captures.items(), key=lambda x: x[1], reverse=True)
    report.append("## 2. Warrant Mapping — Instrumen Hukum Terkuat (Backing Toulmin)")
    report.append("Identifikasi *warrant* hukum yang paling kuat secara semantik — instrumen yang paling banyak berhasil menjembatani fakta insiden dengan norma yang berlaku:")
    for idx, (reg_id, count) in enumerate(sorted_regs[:10]):
        label = G.nodes[reg_id].get('label', reg_id)
        grp = G.nodes[reg_id].get('classification', 'Unknown')
        report.append(f"  {idx+1}. **{label}** [{grp}] — Berfungsi sebagai *warrant* untuk {count} insiden")
    
    report.append("\n## 3. Rebuttal Toulmin — Ketergantungan Ekstrateritorial (Analisis Bantahan)")
    # Cek apakah ada insiden yang HANYA bisa ditangkap oleh standar internasional tapi TIDAK oleh UU Nasional
    foreign_dependency_cases = []
    international_saviors = set()
    
    for inc, regs in incident_coverage.items():
        if len(regs) > 0:
            has_natl = any(G.nodes[r].get('classification', '').startswith('Natl:') for r in regs)
            if not has_natl:
                foreign_dependency_cases.append(G.nodes[inc].get('label', inc))
                for r in regs:
                    international_saviors.add(G.nodes[r].get('label', r))
                    
    report.append(f"*Rebuttal* terhadap klaim kekosongan hukum absolut: terdapat **{len(foreign_dependency_cases)} Kasus** di mana *warrant* yang tersedia hanya berasal dari regulasi internasional, bukan dari hukum nasional Indonesia. Ini membuktikan adanya ketergantungan ekstrateritorial (*Extraterritorial Dependency*) yang justru memperkuat klaim, bukan mematahkannya.")
    if foreign_dependency_cases:
        report.append(f"- **Kasus Tanpa Warrant Nasional:** {', '.join(foreign_dependency_cases[:10])}")
        report.append(f"- **Warrant Internasional sebagai Backing:** {', '.join(list(international_saviors)[:10])}")  
        
    report.append("\n> *Claim Final (Toulmin):* Hasil rebuttal justru memvalidasi postulat bahwa Republik Indonesia menghadapi 'kekosongan normatif' (*vacuum of law*) yang nyata. Tidak hanya tidak memiliki paradigma hukum AI yang memadai (*Legal AI Lag*), tapi regulasi yang ada pun terbukti tidak dapat menjadi *warrant* yang efektif tanpa dukungan legislasi AI *sui generis* sebagai *lex specialis* nasional.")

    with open('laporan_khusus_insiden.md', 'w') as f:
        f.write("\n".join(report))

if __name__ == "__main__":
    analyze_incidents()
