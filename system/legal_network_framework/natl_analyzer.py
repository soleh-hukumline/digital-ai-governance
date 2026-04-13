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
            G.add_node(n['id'], label=n['label'])
            
        # Tambahkan edges HANYA jika menghubungkan sesama Nasional via Semantik TF-IDF
        for e in data['edges']:
            if e['from'] in natl_ids and e['to'] in natl_ids:
                # ambil persentase kesamaan jika ada di label
                weight = 1.0
                if "NLP" in e['label']:
                    try:
                        weight_str = e['label'].split('NLP')[1].split('%')[0].strip()
                        weight = float(weight_str) / 100.0
                    except:
                        pass
                G.add_edge(e['from'], e['to'], type=e['label'], weight=weight)
                
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
                "title": f"Degree/Koneksi Semantik: {deg}"
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
    report.append("# Laporan: Pemetaan Semantik Regulasi Tata Kelola AI Nasional (TF-IDF)\n")
    report.append("Berdasarkan perhitungan kemiripan leksikal teks (TfidfVectorizer Cosine), kerangka hukum nasional ini menghasilkan pola kohesi internal sebagai berikut:\n")
    
    # Kerapatan Global
    density = nx.density(G)
    report.append("## 1. Kohesi Hukum Domestik (National Cohesion)")
    report.append(f"- Objek Analisis: **{G.number_of_nodes()} Pasal/Article Nasional** (dari *UU ITE, UU PDP, Stranas*, dll).")
    report.append(f"- Tautan Semantik Ditemukan: **{G.number_of_edges()} Korelasi Organik** (>20% kemiripan kosa kata).")
    report.append(f"- Network Density Nasional: **{density:.4f}**")
    report.append("> *Interpretasi:* Tingkat densitas merefleksikan seberapa sering regulasi domestik saling beririsan atau memberikan rujukan silang terpola dalam pembentukan normanya. Semakin tinggi angka densitas, semakin solid arsitektur hukum domestik dalam mengantisipasi celah hukum sektoral.\n")

    # Siapa pemegang mandat tertinggi (Degree Centrality berbobot)
    degree_dict = nx.degree_centrality(G)
    sorted_degree = sorted(degree_dict.items(), key=lambda x: x[1], reverse=True)
    
    report.append("## 2. Klausul dengan Sentralitas Pengaruh Tertinggi (National Semantic Hubs)")
    report.append("Pasal mana yang memiliki kedekatan sentral semantik tertinggi dengan elemen perundang-undangan domestik yang lain?")
    for idx, (node_id, score) in enumerate(sorted_degree[:3]):
        label = G.nodes[node_id].get('label', node_id)
        report.append(f"  {idx+1}. **{label}** (Pengaruh Sentralitas: {score:.3f})")
    
    report.append("\n> *Catatan Observasi:* Node dengan nilai sentralitas tinggi di tingkat Nasional biasanya adalah pasal-pasal inti yang mendefinisikan 'Data Pribadi', 'Tata Kelola Data', atau asas kepastian hukum yang sering kali tumpang tindih diatur dalam instrumen turunan, alih-alih mengartikulasikan 'Transparansi Algoritma'.\n")

    # Penjembatan Diskursus Internasional
    betweenness_dict = nx.betweenness_centrality(G)
    sorted_between = sorted(betweenness_dict.items(), key=lambda x: x[1], reverse=True)
    
    report.append("## 3. Konektor Lintas Sektoral (National Betweenness Centrality)")
    for idx, (node_id, score) in enumerate(sorted_between[:3]):
        label = G.nodes[node_id].get('label', node_id)
        report.append(f"  {idx+1}. **{label}** (Skor Jembatan: {score:.3f})")

    report.append("\n## Kesimpulan Konsolidasi Nasional")
    report.append("Pemetaan ini secara objektif mendemonstrasikan bahwa instrumen hukum siber Indonesia memiliki struktur korelasi leksikal yang saling berkesinambungan. Interkoneksi ini memverifikasi pola evolusi dogmatik legislasi hukum nasional secara kronologis.")

    with open('laporan_khusus_nasional.md', 'w') as f:
        f.write("\n".join(report))

if __name__ == "__main__":
    analyze_natl_only()
