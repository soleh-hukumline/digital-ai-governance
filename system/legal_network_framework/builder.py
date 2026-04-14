"""
builder.py — Deep Multilingual Legal Network Analysis Builder
=============================================================
Pipeline:
  1. Extract ALL PDFs (no page limit) with expanded regex
  2. Encode each provision using multilingual sentence embeddings
     (paraphrase-multilingual-MiniLM-L12-v2 — 50+ languages incl. ID+EN)
  3. Compute cosine similarity between embeddings
  4. Build network edges using percentile-based thresholds
  5. Export legal_graph.json for the dashboard

Methodology Reference:
  - Maastricht Legal Network Analysis (van Dijck et al.)
  - Sentence-BERT: Reimers & Gurevych, 2019
"""

import json
import networkx as nx
import os
import re
import numpy as np
import PyPDF2
import glob
from sentence_transformers import SentenceTransformer
from sklearn.metrics.pairwise import cosine_similarity

# ─── CONFIGURATION ────────────────────────────────────────────────
EMBEDDING_MODEL = 'paraphrase-multilingual-MiniLM-L12-v2'

# Absolute cosine similarity thresholds — tiered by register & language
# Tier Classification:
#   Identik       : 0.95 - 1.00 (teks sama persis atau copy-paste)
#   Sangat Kuat   : 0.80 - 0.94 (topik dan isi sama, beda pilihan kata/bahasa)
#   Koneksi Lemah : threshold - 0.79 (subjek sama, konteks berbeda)
#   < threshold   : Tidak terhubung (abaikan)
THRESHOLD_INTL_INTRA   = 0.70   # Intl↔Intl — same register, same language
THRESHOLD_NATL_INTRA   = 0.70   # Natl↔Natl — same register, same language
THRESHOLD_CROSS_JURIS  = 0.55   # Intl↔Natl — cross-lingual (EN↔ID), same register
THRESHOLD_INC_REG      = 0.50   # Incident↔Regulation — cross-register + cross-lingual

REG_BASE = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'regulations')
INC_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'incidents', 'indonesia_incidents.json')
OUT_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network', 'legal_graph.json')


# ─── PDF EXTRACTION ───────────────────────────────────────────────
def extract_provisions(pdf_path):
    """
    Extract article/pasal/section provisions from a PDF.
    Uses expanded regex to catch diverse formats across jurisdictions.
    No page limit — processes entire document.
    """
    provisions = {}
    if not os.path.exists(pdf_path):
        return provisions

    try:
        with open(pdf_path, 'rb') as f:
            reader = PyPDF2.PdfReader(f)
            full_text = ''
            for page in reader.pages:
                pg_text = page.extract_text()
                if pg_text:
                    full_text += pg_text + '\n'

        # Expanded regex: covers
        #   Article 1, Art. 1, Section 1, Principle 1, Pasal 1,
        #   Bab 1, Bagian 1, Ayat 1, Paragraph 1, Recommendation 1,
        #   Rec. 1, Annex 1, Chapter 1, Value 1
        pattern = r'((?:Article|Art\.|Section|Principle|Paragraph|Pasal|Bab|Bagian|Ayat|Recommendation|Rec\.|Annex|Chapter|Value|Guideline)\s+\d+[a-z]?)'
        chunks = re.split(pattern, full_text, flags=re.IGNORECASE)

        if len(chunks) > 1:
            for i in range(1, len(chunks) - 1, 2):
                title = ' '.join(chunks[i].split()).strip()
                # Normalize: "Art. 5" → "Article 5", "Rec. 3" → "Recommendation 3"
                title = re.sub(r'^Art\.\s*', 'Article ', title, flags=re.IGNORECASE)
                title = re.sub(r'^Rec\.\s*', 'Recommendation ', title, flags=re.IGNORECASE)
                title = title.capitalize()

                content = chunks[i + 1][:2000]  # Slightly more context than before
                if len(content.strip()) > 30:
                    provisions[title] = content.strip()

    except Exception as e:
        print(f'  ⚠️ Error extracting {os.path.basename(pdf_path)}: {e}')

    return provisions


def get_threshold(scores_flat, threshold_val):
    """Get threshold value. Supports:
       - float (0.80) → absolute cosine similarity cutoff
       - str ('p80')  → percentile-based cutoff
    """
    if isinstance(threshold_val, float) or isinstance(threshold_val, int):
        return float(threshold_val)
    # Legacy percentile support
    p = int(str(threshold_val).replace('p', ''))
    return float(np.percentile(scores_flat, p))


# ─── MAIN BUILDER ─────────────────────────────────────────────────
def build_deep_network():
    G = nx.Graph()

    print('═' * 60)
    print('  DEEP MULTILINGUAL LEGAL NETWORK ANALYSIS BUILDER')
    print('═' * 60)

    # ── STEP 0: Load Embedding Model ──────────────────────────────
    print(f'\n🧠 Loading multilingual embedding model: {EMBEDDING_MODEL}')
    model = SentenceTransformer(EMBEDDING_MODEL)
    print('   ✅ Model loaded (384-dim, 50+ languages)')

    # ── STEP 1: EXTRACT ALL INTERNATIONAL PDFs ────────────────────
    intl_base = os.path.join(REG_BASE, 'international')
    intl_pdfs = glob.glob(os.path.join(intl_base, '**', '*.pdf'), recursive=True)

    intl_corpus = {}  # {node_id: text}
    print(f'\n📄 Memproses {len(intl_pdfs)} PDF Regulasi Internasional...')

    for pdf in sorted(intl_pdfs):
        doc_name = os.path.basename(pdf).replace('.pdf', '')

        # Determine hierarchy classification from folder structure
        classification = 'Intl: General'
        if 'a_binding_international_instrument' in pdf:
            classification = 'Intl: Binding Law'
        elif 'b_global_soft_law' in pdf:
            classification = 'Intl: Soft Law'
        elif 'c_sectoral_international_guidance' in pdf:
            classification = 'Intl: Sectoral Guidance'
        elif 'd_international_technical_standards' in pdf:
            classification = 'Intl: Technical Standard'

        # Extract year
        year_match = re.search(r'\d{4}', doc_name)
        year = int(year_match.group(0)) if year_match else 2023

        provisions = extract_provisions(pdf)
        print(f'   📋 {doc_name}: {len(provisions)} pasal/article terdeteksi')

        for title, text in provisions.items():
            node_id = f'{doc_name}_{title.replace(" ", "_")}'
            G.add_node(node_id, label=f'{doc_name} - {title}',
                       group=doc_name, classification=classification,
                       year=year)
            intl_corpus[node_id] = text

    # ── STEP 2: EXTRACT ALL NATIONAL PDFs ─────────────────────────
    natl_base = os.path.join(REG_BASE, 'indonesia')
    natl_pdfs = glob.glob(os.path.join(natl_base, '**', '*.pdf'), recursive=True)

    natl_corpus = {}
    print(f'\n📄 Memproses {len(natl_pdfs)} PDF Regulasi Nasional Indonesia...')

    for pdf in sorted(natl_pdfs):
        doc_name = os.path.basename(pdf).replace('.pdf', '')

        classification = 'Natl: General'
        if 'a_binding_national_regulation' in pdf:
            classification = 'Natl: Binding Law'
        elif 'b_national_soft_law_and_strategies' in pdf:
            classification = 'Natl: Strategy & Soft Law'
        elif 'c_sectoral_national_guidance' in pdf:
            classification = 'Natl: Sectoral/Agency Guidance'
        elif 'd_judicial_decisions' in pdf:
            classification = 'Natl: Judicial Decision'

        year_match = re.search(r'\d{4}', doc_name)
        year = int(year_match.group(0)) if year_match else 2020

        provisions = extract_provisions(pdf)
        print(f'   📋 {doc_name}: {len(provisions)} pasal terdeteksi')

        for title, text in provisions.items():
            node_id = f'IDN_{doc_name}_{title.replace(" ", "_")}'
            G.add_node(node_id, label=f'{doc_name} - {title}',
                       group=doc_name, classification=classification,
                       year=year)
            natl_corpus[node_id] = text

    # ── STEP 3: LOAD INCIDENT DATA ────────────────────────────────
    inc_corpus = {}
    if os.path.exists(INC_PATH):
        with open(INC_PATH, 'r', encoding='utf-8') as f:
            inc_data = json.load(f)

        incidents = inc_data.get('incidents', [])
        print(f'\n📄 Memproses {len(incidents)} Insiden Kasus...')

        for inc in incidents:
            if 'pemetaan_fakta_hukum' not in inc:
                continue
            krono = inc.get('peristiwa_hukum_kronologi', '')
            fakta = ' '.join(inc['pemetaan_fakta_hukum'].values())
            kual = inc.get('kualifikasi_peristiwa', '')
            full_text = f'{krono} {fakta} {kual}'

            short_krono = krono[:45] + '...' if len(krono) > 45 else krono
            node_id = f"CASE_{inc['id']}"
            G.add_node(node_id,
                       label=f"{inc['id'].upper()} - {short_krono}",
                       group='Insiden Kasus',
                       classification='Insiden Kasus',
                       year=inc.get('year', 2024))
            inc_corpus[node_id] = full_text

    # ── STEP 4: ENCODE ALL TEXTS ──────────────────────────────────
    print(f'\n🧠 Encoding {len(intl_corpus) + len(natl_corpus) + len(inc_corpus)} dokumen dengan multilingual embeddings...')

    all_ids = []
    all_texts = []
    all_types = []  # 'intl', 'natl', 'inc'

    for uid, text in intl_corpus.items():
        all_ids.append(uid)
        all_texts.append(text)
        all_types.append('intl')
    for uid, text in natl_corpus.items():
        all_ids.append(uid)
        all_texts.append(text)
        all_types.append('natl')
    for uid, text in inc_corpus.items():
        all_ids.append(uid)
        all_texts.append(text)
        all_types.append('inc')

    if not all_texts:
        print('❌ Tidak ada teks untuk di-encode!')
        return

    # Encode with sentence-transformers (batched, efficient)
    embeddings = model.encode(all_texts, show_progress_bar=True, batch_size=32,
                              normalize_embeddings=True)
    print(f'   ✅ Embedding selesai: {embeddings.shape[0]} vectors × {embeddings.shape[1]} dims')

    # ── STEP 5: COMPUTE SIMILARITY & BUILD EDGES ──────────────────
    print('\n🔗 Menghitung cosine similarity & membangun edges...')

    # Full cosine similarity matrix (using normalized embeddings → dot product = cosine)
    sim_matrix = cosine_similarity(embeddings)

    # Build index maps
    intl_idx = [i for i, t in enumerate(all_types) if t == 'intl']
    natl_idx = [i for i, t in enumerate(all_types) if t == 'natl']
    inc_idx  = [i for i, t in enumerate(all_types) if t == 'inc']

    def add_edges_for_pairs(idx_set_a, idx_set_b, threshold_str, edge_type, cross_doc_only=True):
        """Add edges for pairs above percentile threshold."""
        scores = []
        pairs = []
        for i in idx_set_a:
            for j in idx_set_b:
                if i >= j:
                    continue
                # Skip intra-document pairs if required
                if cross_doc_only:
                    doc_i = G.nodes[all_ids[i]].get('group', '')
                    doc_j = G.nodes[all_ids[j]].get('group', '')
                    if doc_i == doc_j:
                        continue
                score = float(sim_matrix[i][j])
                scores.append(score)
                pairs.append((i, j, score))

        if not scores:
            return 0

        threshold = get_threshold(scores, threshold_str)
        count = 0
        for i, j, score in pairs:
            if score >= threshold:
                G.add_edge(all_ids[i], all_ids[j],
                           type=edge_type,
                           weight=round(score, 4))
                count += 1
        print(f'   {edge_type}: threshold={threshold:.4f} ({threshold_str}), {count} edges dari {len(pairs)} pasangan')
        return count

    # 5a. Intra-International edges
    add_edges_for_pairs(intl_idx, intl_idx, THRESHOLD_INTL_INTRA, 'semantic_similarity')

    # 5b. Intra-National edges
    add_edges_for_pairs(natl_idx, natl_idx, THRESHOLD_NATL_INTRA, 'semantic_similarity')

    # 5c. Cross-Jurisdiction edges (International ↔ National)
    add_edges_for_pairs(intl_idx, natl_idx, THRESHOLD_CROSS_JURIS, 'cross_jurisdiction')

    # 5d. Regulation ↔ Incident edges
    reg_idx = intl_idx + natl_idx
    add_edges_for_pairs(reg_idx, inc_idx, THRESHOLD_INC_REG, 'governs', cross_doc_only=False)

    # ── STEP 6: EXPORT ────────────────────────────────────────────
    print(f'\n📊 Graph Final: {G.number_of_nodes()} nodes, {G.number_of_edges()} edges')

    degree_dict = dict(G.degree())
    nodes_export = []
    for node, attrs in G.nodes(data=True):
        deg = degree_dict.get(node, 0)
        nodes_export.append({
            'id': node,
            'label': attrs.get('label', node),
            'group': attrs.get('group', 'Unknown'),
            'classification': attrs.get('classification', 'Unknown'),
            'value': 10 + (deg * 4),
            'title': f'Degree: {deg}'
        })

    edges_export = []
    for u, v, attrs in G.edges(data=True):
        weight = attrs.get('weight', 0)
        edge_type = attrs.get('type', 'link')

        # Tier classification label
        if weight >= 0.95:
            tier = 'Identik'
        elif weight >= 0.80:
            tier = 'Sangat Kuat'
        else:
            tier = 'Lemah'
        weight_label = f' ({tier} {weight*100:.1f}%)' if weight else ''

        # Chronological direction (older → newer)
        year_u = G.nodes[u].get('year', 2020)
        year_v = G.nodes[v].get('year', 2020)
        if year_u < year_v:
            final_u, final_v = u, v
            arr = 'to'
        elif year_v < year_u:
            final_u, final_v = v, u
            arr = 'to'
        else:
            final_u, final_v = u, v
            arr = ''

        edges_export.append({
            'from': final_u,
            'to': final_v,
            'label': edge_type.replace('_', ' ') + weight_label,
            'arrows': arr
        })

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump({'nodes': nodes_export, 'edges': edges_export}, f, indent=2, ensure_ascii=False)

    file_size = os.path.getsize(OUT_PATH) / 1024
    print(f'   ✅ Exported: {OUT_PATH} ({file_size:.0f} KB)')
    print(f'   📈 Nodes: {len(nodes_export)} (Intl: {len(intl_corpus)}, Natl: {len(natl_corpus)}, Inc: {len(inc_corpus)})')
    print(f'   📈 Edges: {len(edges_export)}')
    print('═' * 60)


if __name__ == '__main__':
    build_deep_network()
