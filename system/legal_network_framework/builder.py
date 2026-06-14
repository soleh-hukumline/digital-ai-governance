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
# Embedding model: Sentence-BERT multilingual, 384 dimensions, 50+ languages
# incl. Indonesian & English (Reimers & Gurevych, 2019).
EMBEDDING_MODEL = 'paraphrase-multilingual-MiniLM-L12-v2'
EMBEDDING_DIM   = 384

# ─── COSINE-SIMILARITY THRESHOLDS (SINGLE SOURCE OF TRUTH) ────────────────────
# IMPORTANT (data-integrity / reproducibility):
#   These TIERED, REGISTER-AWARE absolute cosine cut-offs are the AUTHORITATIVE
#   values used to build every edge in legal_graph.json. Any threshold quoted in
#   the manuscript MUST match the numbers below. (An earlier manuscript draft
#   cited a single ">0.75 / <0.50" rule, which never matched the code — that text
#   must be replaced with this tiered scheme. See REVIEWER_RESPONSE.md.)
#
# Rationale — why a single global cut-off is wrong here:
#   Cosine similarity between MiniLM embeddings is systematically LOWER when the
#   two texts differ in (a) language and (b) register/genre, even when they are
#   topically equivalent. Our corpus mixes three pairings, so one cut-off would
#   over-connect like-with-like and under-connect cross-lingual / cross-register
#   pairs. We therefore set the cut-off per pairing:
#
#     Pairing                         Language     Register        Threshold
#     ------------------------------  -----------  --------------  ---------
#     Intl ↔ Intl                     same (EN)    same (statute)    0.70
#     Natl ↔ Natl                     same (ID)    same (statute)    0.70
#     Intl ↔ Natl (cross-juris)       EN ↔ ID      same (statute)    0.55
#     Incident ↔ Regulation           ID ↔ EN/ID   narrative↔statute 0.50
#
#   The relative ordering (intra > cross-lingual > cross-register) is theory-
#   driven; the exact values are a DESIGN CHOICE that must be validated, not
#   asserted. validation.py measures precision/recall/F1 and inter-annotator
#   agreement against a manually-coded sample and sweeps the cut-off so the
#   chosen value can be justified empirically rather than by fiat.
THRESHOLD_INTL_INTRA   = 0.70   # Intl↔Intl — same register, same language (EN)
THRESHOLD_NATL_INTRA   = 0.70   # Natl↔Natl — same register, same language (ID)
THRESHOLD_CROSS_JURIS  = 0.55   # Intl↔Natl — cross-lingual (EN↔ID), same register
THRESHOLD_INC_REG      = 0.50   # Incident↔Regulation — cross-register + cross-lingual

# Edge-weight tier labels (descriptive, applied at export):
#   Identik     : 0.95 - 1.00 (near-duplicate text)
#   Sangat Kuat : 0.80 - 0.94 (same topic, different wording/language)
#   Lemah       : threshold - 0.79 (related subject, different context)

REG_BASE = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'regulations')
INC_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'incidents', 'indonesia_incidents.json')
OUT_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network', 'legal_graph.json')


# ─── PDF EXTRACTION (robust, multi-backend) ───────────────────────
# Goal: EVERY readable regulation contributes nodes — not only statutes that use
# "Pasal N"/"Article N". UN resolutions, codes of conduct, ministerial circulars
# (Surat Edaran), strategies and guides use numbered outlines or named sections,
# so a structured-only parser silently dropped them. We therefore (1) read with a
# tolerant backend chain, (2) try structured splitting, then (3) fall back to
# paragraph chunking when a document has no Article/Pasal structure.
MIN_STRUCTURED      = 5      # below this many structured provisions → chunk
FALLBACK_CHUNK_CHARS = 1100  # target characters per fallback segment
FALLBACK_MAX_CHUNKS  = 80    # cap segments per document (graph-size guard)

# Article-heading detection (data-quality critical). The earlier parser split on
# EVERY "Pasal N" — including in-text cross-references ("…dimaksud dalam Pasal 5
# ayat (1)…") — and last-write-wins stored the reference FRAGMENT as the article,
# so ~half of all nodes carried garbled text. We now anchor on true HEADINGS only.
HEADING_KINDS = ('Pasal', 'Article', 'Section', 'Principle')
_REF_WORDS = ('dalam ', 'dimaksud', 'pada ', 'huruf ', 'ayat ', 'pasal ', 'sebagaimana',
              'pursuant', 'accordance', 'referred', 'point ', 'paragraph', 'under ', 'of this')
_BOILER = re.compile(r'mulai berlaku|Ditetapkan di|Disahkan di|Diundangkan|Lembaran Negara|'
                     r'TAMBAHAN LEMBARAN|cukup jelas|Agar setiap orang|SALINAN|MEMUTUSKAN|'
                     r'^ttd\b', re.I)
_UUD = re.compile(r'Undang-Undang Dasar Negara Republik Indonesia Tahun 1945', re.I)


def _is_valid_provision(txt):
    """Reject boilerplate (promulgation/elucidation), constitutional-preamble
    quotes, too-short fragments, and reference fragments starting mid-sentence."""
    t = ' '.join(str(txt).split())
    if len(t) < 60:
        return False
    if _UUD.search(t[:130]) or _BOILER.search(t[:130]):
        return False
    if re.match(r'^[a-z)\]]|^ayat\b|^dimaksud\b|^sebagaimana\b', t):
        return False
    return True


def _read_pdf_text(pdf_path):
    """Return the full text of a PDF, preferring pdfminer (better layout → cleaner
    heading detection), falling back to PyPDF2. Loudly flags files that are not
    valid PDFs (e.g. an HTML 404 page saved as .pdf)."""
    name = os.path.basename(pdf_path)
    try:
        with open(pdf_path, 'rb') as fh:
            head = fh.read(1024)
    except Exception as e:
        print(f'  ⚠️  {name}: cannot open ({e})')
        return ''
    if not head.lstrip()[:5].startswith(b'%PDF'):
        print(f'  ❌ {name}: NOT a valid PDF (starts with {head.lstrip()[:16]!r}). '
              f'Likely a wrong/broken download — REPLACE this file.')
        return ''

    text = ''
    try:                                              # 1) pdfminer (layout-aware)
        from pdfminer.high_level import extract_text as _pm_extract
        text = _pm_extract(pdf_path) or ''
    except Exception as e:
        print(f'  ⚠️  {name}: pdfminer failed ({e}); trying PyPDF2…')

    if len(text.strip()) < 200:                       # 2) PyPDF2 fallback
        try:
            with open(pdf_path, 'rb') as f:
                reader = PyPDF2.PdfReader(f, strict=False)
                parts = []
                for page in reader.pages:
                    try:
                        parts.append(page.extract_text() or '')
                    except Exception:
                        continue
                if len('\n'.join(parts).strip()) > len(text.strip()):
                    text = '\n'.join(parts)
        except Exception as e:
            print(f'  ⚠️  {name}: PyPDF2 fallback failed ({e})')
    return text


def _structured_provisions(text):
    """Extract real articles by anchoring on HEADINGS (not in-text references).
    A heading is "<Kind> N" that is either at a line start OR is immediately
    followed by article body (a "(" / capital word / title dash) and NOT preceded
    by reference words. Captures heading→next-heading; first occurrence wins;
    invalid/boilerplate spans are dropped. The Penjelasan (elucidation) tail is
    excluded so a norm isn't overwritten by its 'cukup jelas' explanation."""
    cut = re.search(r'\n\s*PENJELASAN\s*\n', text)
    body = text[:cut.start()] if cut else text
    pos = {}
    for kind in HEADING_KINDS:
        for m in re.finditer(rf'(?m)^[ \t]*{kind}\s+(\d+[A-Za-z]?)\b', body):
            pos.setdefault(m.start(), (m.end(), kind, m.group(1)))
        for m in re.finditer(rf'\b{kind}\s+(\d+[A-Za-z]?)\b', body):
            if m.start() in pos:
                continue
            before = body[max(0, m.start() - 18):m.start()].lower()
            after = body[m.end():m.end() + 10].lstrip()
            is_ref = any(w in before for w in _REF_WORDS) or before.rstrip().endswith(',')
            looks_body = (after[:1] in '(–—-') or (after[:1].isalpha() and after[:1] == after[:1].upper())
            if not is_ref and looks_body:
                pos[m.start()] = (m.end(), kind, m.group(1))
    heads = sorted((s, e, k, n) for s, (e, k, n) in pos.items())
    prov = {}
    for i, (s, e, k, n) in enumerate(heads):
        end = heads[i + 1][0] if i + 1 < len(heads) else len(body)
        txt = ' '.join(body[e:end].split())[:1600]
        title = f'{k} {n}'
        if title not in prov and _is_valid_provision(txt):
            prov[title] = txt
    return prov


def _chunk_text(full_text, max_chunks=FALLBACK_MAX_CHUNKS, target=FALLBACK_CHUNK_CHARS):
    """Paragraph-aware chunking for documents without Article/Pasal headings."""
    paras = re.split(r'\n\s*\n', full_text)
    chunks, buf = [], ''
    for p in paras:
        p = ' '.join(p.split())
        if not p:
            continue
        if len(buf) + len(p) + 1 <= target:
            buf = (buf + ' ' + p).strip()
        else:
            if len(buf) > 60:
                chunks.append(buf)
            buf = p
            while len(buf) > target and len(chunks) < max_chunks:   # very long para
                chunks.append(buf[:target])
                buf = buf[target:]
        if len(chunks) >= max_chunks:
            break
    if buf and len(buf) > 60 and len(chunks) < max_chunks:
        chunks.append(buf)
    return chunks


def extract_provisions(pdf_path):
    """Extract provisions from a regulation PDF.
    1) Structured split on Article/Pasal/Section/… headings (best for statutes).
    2) If that yields < MIN_STRUCTURED provisions, fall back to paragraph chunking
       so non-article documents (UN resolutions, codes, circulars, guides,
       strategies) are still represented in the network.
    """
    provisions = {}
    if not os.path.exists(pdf_path):
        return provisions

    full_text = _read_pdf_text(pdf_path)
    if len(full_text.strip()) < 60:
        return provisions  # nothing readable (already warned)

    # 1) Heading-anchored structured extraction (real articles only, noise dropped)
    provisions = _structured_provisions(full_text)

    # 2) Fallback chunking for documents without Article/Pasal structure
    if len(provisions) < MIN_STRUCTURED:
        seg = _chunk_text(full_text)
        if len(seg) > len(provisions):
            provisions = {f'Bagian {k + 1}': s for k, s in enumerate(seg)}
            print(f'     ↳ fallback chunking → {len(provisions)} segmen '
                  f'(dokumen tanpa struktur Pasal/Article)')

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
            return 0, []

        threshold = get_threshold(scores, threshold_str)
        count = 0
        for i, j, score in pairs:
            if score >= threshold:
                G.add_edge(all_ids[i], all_ids[j],
                           type=edge_type,
                           weight=round(score, 4))
                count += 1
        print(f'   {edge_type}: threshold={threshold:.4f} ({threshold_str}), {count} edges dari {len(pairs)} pasangan')
        # Return ALL candidate pairs (above AND below threshold) so downstream
        # validation can compute recall, not just precision.
        return count, pairs

    # 5a. Intra-International edges
    add_edges_for_pairs(intl_idx, intl_idx, THRESHOLD_INTL_INTRA, 'semantic_similarity')

    # 5b. Intra-National edges
    add_edges_for_pairs(natl_idx, natl_idx, THRESHOLD_NATL_INTRA, 'semantic_similarity')

    # 5c. Cross-Jurisdiction edges (International ↔ National)
    add_edges_for_pairs(intl_idx, natl_idx, THRESHOLD_CROSS_JURIS, 'cross_jurisdiction')

    # 5d. Regulation ↔ Incident edges
    reg_idx = intl_idx + natl_idx
    gov_count, gov_pairs = add_edges_for_pairs(
        reg_idx, inc_idx, THRESHOLD_INC_REG, 'governs', cross_doc_only=False)

    # ── STEP 5e: EXPORT INCIDENT↔REGULATION SCORES (for validation) ─
    # Persist EVERY candidate incident↔regulation pair with its cosine score,
    # whether or not it crossed THRESHOLD_INC_REG. validation.py / the manual
    # ground-truth coding draw on this so precision AND recall can be measured
    # and the cut-off can be swept. This is what turns the threshold from
    # "asserted" into "empirically testable".
    scores_path = os.path.join(os.path.dirname(OUT_PATH), 'incident_reg_scores.csv')
    n_pairs = 0
    with open(scores_path, 'w', encoding='utf-8') as sf:
        sf.write('incident_id,incident_label,regulation_id,regulation_label,'
                 'classification,cosine,linked_by_threshold\n')
        for i, j, score in gov_pairs:
            id_i, id_j = all_ids[i], all_ids[j]
            # Orient so first column is the incident
            if all_types[i] == 'inc':
                inc_id, reg_id = id_i, id_j
            else:
                inc_id, reg_id = id_j, id_i
            inc_lbl = str(G.nodes[inc_id].get('label', inc_id)).replace(',', ';')
            reg_lbl = str(G.nodes[reg_id].get('label', reg_id)).replace(',', ';')
            cls = str(G.nodes[reg_id].get('classification', '')).replace(',', ';')
            linked = 1 if score >= THRESHOLD_INC_REG else 0
            sf.write(f'{inc_id},{inc_lbl},{reg_id},{reg_lbl},{cls},{score:.4f},{linked}\n')
            n_pairs += 1
    print(f'   📝 Exported {n_pairs} incident↔regulation candidate scores → {os.path.basename(scores_path)}')

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

    # ── STEP 7: METHODS PROVENANCE (machine-readable, citable) ─────
    # Single, authoritative record of HOW the graph was built. The manuscript's
    # Methods section should cite these exact values rather than restating them
    # by hand (which is how the ">0.75/<0.50" mismatch crept in).
    edge_type_counts = {}
    for _u, _v, _a in G.edges(data=True):
        et = _a.get('type', 'link')
        edge_type_counts[et] = edge_type_counts.get(et, 0) + 1
    methods_config = {
        'embedding_model': EMBEDDING_MODEL,
        'embedding_dim': EMBEDDING_DIM,
        'embedding_reference': 'Reimers & Gurevych (2019), Sentence-BERT',
        'normalize_embeddings': True,
        'similarity_metric': 'cosine',
        'thresholds': {
            'intl_intra': THRESHOLD_INTL_INTRA,
            'natl_intra': THRESHOLD_NATL_INTRA,
            'cross_jurisdiction': THRESHOLD_CROSS_JURIS,
            'incident_regulation': THRESHOLD_INC_REG,
        },
        'threshold_rationale': (
            'Tiered, register-aware absolute cosine cut-offs. Cross-lingual '
            '(EN↔ID) and cross-register (narrative↔statute) pairs receive lower '
            'cut-offs because MiniLM cosine similarity is systematically lower '
            'for them at equal topical relevance. Values are validated in '
            'validation.py (precision/recall/F1 + inter-annotator agreement).'
        ),
        'corpus': {
            'intl_provisions': len(intl_corpus),
            'natl_provisions': len(natl_corpus),
            'incidents': len(inc_corpus),
            'total_nodes': len(nodes_export),
            'total_edges': len(edges_export),
            'edges_by_type': edge_type_counts,
        },
        'coverage_rate_definition': (
            'connected_incidents / total_incidents * 100, where an incident is '
            '"connected" iff it has >=1 governs edge to a regulation.'
        ),
        'provenance_note': (
            'Auto-generated by builder.py. Incidents are REAL & sourced '
            '(see data/incidents/indonesia_incidents.json); regulation nodes are '
            'extracted from PDF statutes/standards in data/regulations/.'
        ),
    }
    cfg_path = os.path.join(os.path.dirname(OUT_PATH), 'methods_config.json')
    with open(cfg_path, 'w', encoding='utf-8') as cf:
        json.dump(methods_config, cf, indent=2, ensure_ascii=False)
    print(f'   🧾 Methods provenance → {os.path.basename(cfg_path)}')
    print('═' * 60)


if __name__ == '__main__':
    build_deep_network()
