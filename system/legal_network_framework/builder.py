import json
import networkx as nx
import os
import re
import PyPDF2
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import glob

def extract_semantic_provisions(pdf_path):
    """Mengekstrak blok berulang dengan regex luas untuk segala jenis instrumen Internasional"""
    provisions = {} 
    if not os.path.exists(pdf_path): return provisions
        
    try:
        with open(pdf_path, "rb") as f:
            reader = PyPDF2.PdfReader(f)
            full_text = ""
            for i in range(min(40, len(reader.pages))): # limit 40 halaman agar tidak nge-hang
                pg_text = reader.pages[i].extract_text()
                if pg_text: full_text += pg_text + "\n"
                
            # Regex mencari "Article X", "Pasal X", "Bab X"
            pattern = r"((?:Article|Principle|Section|Paragraph|Pasal|Bab|Bagian|Ayat)\s+\d+)"
            chunks = re.split(pattern, full_text, flags=re.IGNORECASE)
            
            if len(chunks) > 1:
                # Ambil semua pasal tanpa batasan count
                for i in range(1, len(chunks)-1, 2):
                    
                    title = " ".join(chunks[i].split()).capitalize()
                    content_clean = chunks[i+1][:1500] 
                    if len(content_clean) > 30: 
                        provisions[title] = content_clean
                        
    except Exception as e:
        print(f"Error parsing semantics in {pdf_path}: {e}")
        
    return provisions

def build_deep_network():
    G = nx.Graph()
    reg_base = "../../data/regulations"
    
    # 1. LOAD ALL INTERNATIONAL PDFS
    intl_base = os.path.join(reg_base, "international")
    intl_pdfs = glob.glob(os.path.join(intl_base, "**", "*.pdf"), recursive=True)
    
    intl_semantic_corpus = {}
    print(f">> Menemukan {len(intl_pdfs)} Dokumen PDF Regulasi Internasional...")

    for pdf in intl_pdfs:
        doc_name = os.path.basename(pdf).replace(".pdf", "")
        
        # Filter Data: Singkirkan instrumen kesehatan spesifik agar tidak merusak model AI Governance Murni
        if "WHO" in doc_name:
            continue
            
        # EXTRACT METADATA: Year and Hierarchy
        year_match = re.search(r'\d{4}', doc_name)
        if year_match:
            year = int(year_match.group(0))
        elif "ISO_" in pdf:
            year = 2023
        else:
            year = 2020 # Default
            
        group_name = "Intl: General"
        if "a_binding_international_instrument" in pdf:
            group_name = "Intl: Binding Law"
        elif "b_global_soft_law" in pdf:
            group_name = "Intl: Soft Law"
        elif "c_sectoral_international_guidance" in pdf:
            group_name = "Intl: Sectoral Guidance"
        elif "d_international_technical_standards" in pdf:
            group_name = "Intl: Technical Standard"

        extracted_data = extract_semantic_provisions(pdf)
        
        # Build Nodes for each extracted provision
        for provision_title, text in extracted_data.items():
            u_id = f"{doc_name}_{provision_title.replace(' ', '_')}"
            G.add_node(u_id, label=f"{doc_name} - {provision_title}", group=doc_name, classification=group_name, year=year, content=text)
            intl_semantic_corpus[u_id] = text

    # [EXECUTE KORELASI TF-IDF SEMANTIK UNTUK SELURUH INTERNASIONAL]
    documents = list(intl_semantic_corpus.values())
    node_ids = list(intl_semantic_corpus.keys())
    
    if len(documents) > 1:
        vectorizer = TfidfVectorizer(stop_words='english')
        tfidf_matrix = vectorizer.fit_transform(documents)
        cosine_sim = cosine_similarity(tfidf_matrix, tfidf_matrix)
        
        similarity_threshold = 0.14 # Menggunakan 0.14 untuk mendapatkan sekitar ~40 relasi solid lintas PDF
        links_created = 0
        
        for i in range(len(node_ids)):
            for j in range(i+1, len(node_ids)):
                score = cosine_sim[i][j]
                if score > similarity_threshold:
                    # Menghindari relasi internal di PDF yang sama
                    doc_i = node_ids[i].split("_")[0]
                    doc_j = node_ids[j].split("_")[0]
                    if doc_i != doc_j:
                        G.add_edge(node_ids[i], node_ids[j], type="semantic_similarity", weight=round(float(score), 2))
                        links_created += 1
                        
        print(f">> Berhasil mengalkulasi {links_created} tautan semantik (Cross-Pollination) TF-IDF antar regulasi global.")

    # 2. LOAD ALL NATIONAL PDFS
    natl_base = os.path.join(reg_base, "indonesia")
    natl_pdfs = glob.glob(os.path.join(natl_base, "**", "*.pdf"), recursive=True)
    
    natl_semantic_corpus = {}
    print(f">> Menemukan {len(natl_pdfs)} Dokumen PDF Regulasi Nasional...")

    for pdf in natl_pdfs:
        doc_name = os.path.basename(pdf).replace(".pdf", "")
        
        # EXTRACT METADATA: Year and Hierarchy
        year_match = re.search(r'\d{4}', doc_name)
        if year_match:
            year = int(year_match.group(0))
        elif "Stranas_AI" in pdf:
            year = 2020
        else:
            year = 2020 # Default
            
        group_name = "Natl: General"
        if "a_binding_national_regulation" in pdf:
            group_name = "Natl: Binding Law"
        elif "b_national_soft_law_and_strategies" in pdf:
            group_name = "Natl: Strategy & Soft Law"
        elif "c_sectoral_national_guidance" in pdf:
            group_name = "Natl: Sectoral/Agency Guidance"
        elif "d_judicial_decisions" in pdf:
            group_name = "Natl: Judicial Decision"

        extracted_data = extract_semantic_provisions(pdf)
        
        # Build Nodes
        for provision_title, text in extracted_data.items():
            u_id = f"IDN_{doc_name}_{provision_title.replace(' ', '_')}"
            G.add_node(u_id, label=f"{doc_name} - {provision_title}", group=doc_name, classification=group_name, year=year, content=text)
            natl_semantic_corpus[u_id] = text

    # [EXECUTE KORELASI TF-IDF SEMANTIK UNTUK SELURUH NASIONAL]
    natl_docs = list(natl_semantic_corpus.values())
    natl_node_ids = list(natl_semantic_corpus.keys())
    
    if len(natl_docs) > 1:
        # Pengecekan kemiripan semantik intra-nasional
        import idna # just a dummy to avoid warning, wait no we don't need
        vectorizer_natl = TfidfVectorizer(stop_words='english')
        tfidf_matrix_natl = vectorizer_natl.fit_transform(natl_docs)
        cosine_sim_natl = cosine_similarity(tfidf_matrix_natl, tfidf_matrix_natl)
        
        # Sesuai rencana, threshold dinaikkan ke 0.20
        similarity_threshold_natl = 0.20 
        links_created_natl = 0
        
        for i in range(len(natl_node_ids)):
            for j in range(i+1, len(natl_node_ids)):
                score = cosine_sim_natl[i][j]
                if score > similarity_threshold_natl:
                    # Menghindari relasi internal di PDF yang sama. ID format: IDN_docname_pasal
                    doc_i = natl_node_ids[i].split("_")[1]
                    doc_j = natl_node_ids[j].split("_")[1]
                    if doc_i != doc_j:
                        G.add_edge(natl_node_ids[i], natl_node_ids[j], type="semantic_similarity", weight=round(float(score), 2))
                        links_created_natl += 1
                        
        print(f">> Berhasil mengalkulasi {links_created_natl} tautan semantik (Cross-Pollination) TF-IDF antar regulasi Nasional (Threshold: 0.20).")

    # [EXECUTE KORELASI TF-IDF SEMANTIK LINTAS YURISDIKSI (BIPARTITE: INTL <-> NATL)]
    all_docs = []
    all_node_ids = []
    for uid, text in intl_semantic_corpus.items():
        all_docs.append(text)
        all_node_ids.append((uid, "intl"))
    for uid, text in natl_semantic_corpus.items():
        all_docs.append(text)
        all_node_ids.append((uid, "natl"))
        
    if len(intl_semantic_corpus) > 0 and len(natl_semantic_corpus) > 0:
        vectorizer_cross = TfidfVectorizer(stop_words='english')
        tfidf_matrix_cross = vectorizer_cross.fit_transform(all_docs)
        cosine_sim_cross = cosine_similarity(tfidf_matrix_cross, tfidf_matrix_cross)
        
        # Threshold rendah khusus untuk akomodasi kata serapan lintas bahasa (0.08)
        similarity_threshold_cross = 0.09
        links_created_cross = 0
        
        for i in range(len(all_node_ids)):
            for j in range(i+1, len(all_node_ids)):
                id_i, type_i = all_node_ids[i]
                id_j, type_j = all_node_ids[j]
                
                # Bipartite: Hanya jika satu node dari Intl dan satu dari Natl
                if type_i != type_j:
                    score = cosine_sim_cross[i][j]
                    if score > similarity_threshold_cross:
                        G.add_edge(id_i, id_j, type="cross_jurisdiction", weight=round(float(score), 2))
                        links_created_cross += 1
                        
        print(f">> Berhasil mengalkulasi {links_created_cross} tautan jembatan transnasional (Threshold: {similarity_threshold_cross}).")
    # 3. LOAD INCIDENTS REAL WORLD CASES
    incidents_path = "../../data/incidents/indonesia_incidents.json"
    incident_semantic_corpus = {}
    if os.path.exists(incidents_path):
        with open(incidents_path, 'r', encoding='utf-8') as f:
            inc_data = json.load(f)
            
        print(f">> Menemukan {len(inc_data.get('incidents', []))} Insiden Kasus Riil...")
        for inc in inc_data.get("incidents", []):
            if "pemetaan_fakta_hukum" in inc:
                krono = inc.get("peristiwa_hukum_kronologi", "")
                fakta = " ".join(inc["pemetaan_fakta_hukum"].values())
                kual = inc.get("kualifikasi_peristiwa", "")
                
                full_narrative = f"{krono} {fakta} {kual}"
                short_krono = krono[:45] + "..." if len(krono) > 45 else krono
                label_text = f"{inc['id'].upper()} - {short_krono}"
                u_id = f"CASE_{inc['id']}"
                G.add_node(u_id, label=label_text, group="Insiden Kasus", classification="Insiden Kasus", year=inc.get('year', 2024), content=full_narrative)
                incident_semantic_corpus[u_id] = full_narrative

    # [EXECUTE KORELASI INCIDENT <-> REGULATION]
    all_reg_docs = []
    all_reg_ids = []
    for uid, text in intl_semantic_corpus.items():
        all_reg_docs.append(text)
        all_reg_ids.append((uid, "regulation"))
    for uid, text in natl_semantic_corpus.items():
        all_reg_docs.append(text)
        all_reg_ids.append((uid, "regulation"))
        
    all_inc_docs = []
    all_inc_ids = []
    for uid, text in incident_semantic_corpus.items():
        all_inc_docs.append(text)
        all_inc_ids.append((uid, "incident"))
        
    if len(all_reg_docs) > 0 and len(all_inc_docs) > 0:
        vectorizer_inc = TfidfVectorizer(stop_words='english')
        total_docs = all_reg_docs + all_inc_docs
        tfidf_matrix_inc = vectorizer_inc.fit_transform(total_docs)
        
        cosine_sim_inc = cosine_similarity(tfidf_matrix_inc, tfidf_matrix_inc)
        
        similarity_threshold_inc = 0.13 
        links_created_inc = 0
        
        num_regs = len(all_reg_docs)
        for i in range(num_regs):
            for j in range(num_regs, len(total_docs)):
                reg_id, _ = all_reg_ids[i]
                inc_id, _ = all_inc_ids[j - num_regs]
                
                score = cosine_sim_inc[i][j]
                if score > similarity_threshold_inc:
                    # Arrow Direction: Regulation -> Incident
                    G.add_edge(reg_id, inc_id, type="governs", weight=round(float(score), 2))
                    links_created_inc += 1
                    
        print(f">> Berhasil mengalkulasi {links_created_inc} jaring tangkapan hukum pembuktian empiris (Regulasi -> Kasus) (Threshold: 0.06).")

    # Topological export
    degree_dict = dict(G.degree(G.nodes()))
    nodes_export = []
    for node, attrs in G.nodes(data=True):
        deg = degree_dict.get(node, 1)
        nodes_export.append({
            "id": node,
            "label": attrs.get("label", node),
            "group": attrs.get("group", "Unknown"),
            "classification": attrs.get("classification", "Unknown"),
            "value": 10 + (deg * 4), 
            "title": f"Degree/Koneksi Semantik: {deg}",
            "content": attrs.get("content", "")
        })
        
    edges_export = []
    for u, v, attrs in G.edges(data=True):
        weight_lbl = f" (TF-IDF {int(attrs.get('weight', 0)*100)}%)" if 'weight' in attrs else ""
        
        # Handle chronology for directional flow (Older -> Newer)
        year_u = G.nodes[u].get('year', 2020)
        year_v = G.nodes[v].get('year', 2020)
        
        if year_u < year_v:
             final_u, final_v = u, v
             arr = "to"
        elif year_v < year_u:
             final_u, final_v = v, u
             arr = "to"
        else:
             final_u, final_v = u, v
             arr = ""
             
        edges_export.append({
            "from": final_u, "to": final_v,
            "label": attrs.get("type", "").replace("_"," ") + weight_lbl,
            "arrows": arr
        })

    with open("../../data/network/legal_graph.json", "w", encoding="utf-8") as f:
        json.dump({"nodes": nodes_export, "edges": edges_export}, f, indent=2)

if __name__ == "__main__":
    build_deep_network()
