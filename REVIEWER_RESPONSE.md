# Response to Reviewers — Code & Data Overhaul

**Project:** Digital AI Governance Dashboard — Legal Network Analysis (LNA) of
Indonesia's AI/cyber regulation
**Date:** 2026-06-14
**Scope:** This document explains every change made to the code and data in
response to the review, and provides copy-paste-ready text for the manuscript.
Real, reproducible numbers are quoted throughout.

---

## 0. TL;DR — what changed

| # | Reviewer theme | Before | After |
|---|----------------|--------|-------|
| A | **Empirical basis** | "100 incidents", but **95 were randomly generated** (`random.choice`) and disguised with realistic IDs | **45 real, individually-cited incidents**; synthetic pipeline deleted/disabled |
| B | Embedding model "not specified" | Only in code | Documented + in `methods_config.json` + Methods text below |
| C | Threshold mismatch (">0.75/<0.50") | Paper ≠ code | Single source of truth: tiered **0.70 / 0.55 / 0.50**, reconciled + justified |
| D | "No quantitative network metrics" | Computed but not surfaced | Static tables + figures from real graph (below) |
| E | Coverage rate undefined | Implicit | Explicit formula + value **55.6%** |
| F | **Zero validation** (no ground truth / IAA / P-R) | True | `validation.py` + 103-pair coding template + κ / precision / recall / F1 + threshold sweep |
| G | **"No hallucination" claim unsupported** | Asserted | Removed; replacement text provided |
| H | Figures don't display / reflect data | Static PNGs of synthetic data, no generator | `make_figures.py` regenerates from real graph; embedding verified |
| I | Regulations unreadable | 1 PDF was an HTML 404; 1 was a press release; non-article docs silently dropped | Robust extractor + replaced files → **all 17 regulations** represented (831 nodes) |

> The single most important change is **A**. The earlier dataset was not
> empirical, which was the true (and previously under-stated) root of the
> "lack of empirical validation / reproducibility" critique. Everything else is
> either transparency the code already supported, or new validation scaffolding.

---

## 1. Data integrity (the core fix)

### 1.1 What was wrong
`generate_100_incidents.py` contained **5 real** incidents and then synthesised
**95** more with `random.choice()` over lists of institution types
(`Pemkab/RSUD/PN…`), city names, and attack templates. All 95 shared **one
identical** `nexus_kausalitas` sentence. A second script,
`rename_incidents.py`, then renamed `incident-auto-N` → realistic slugs
(`pn-sidoarjo-2025`), making fabricated rows look authentic. The metadata even
credited "BSSN & OJK Reports (Extrapolated Regional Data)". Describing this as
"100 empirical cyber incidents" was a misrepresentation and a post-publication
retraction risk.

### 1.2 What we did
- Built a **new dataset of 45 real incidents**, each with ≥1 citation
  (82 citations total; avg 1.8/incident), a `confidence` rating
  (37 high / 8 medium), a `verification_note`, and a `record_type`
  (`single_incident` ×43, `pattern_aggregate` ×2).
- Source-driven, reproducible builder: **`build_incident_dataset.py`** (root).
- **Deleted/disabled** the fabrication pipeline: `generate_100_incidents.py`
  and `system/legal_network_framework/rename_incidents.py` now raise an error
  and document why. Old files preserved as `*.SYNTHETIC.bak.*`.
- Incidents were gathered from reputable outlets / security vendors / vpnMentor
  / CISSReC / OJK & BSSN / official government statements, and a sample was
  independently re-verified (PDNS, BSI, BPJS, Indodax, KPU, OJK figures, the
  Prabowo-deepfake prosecutions, the Undip deepfake case).

**Sector mix (n=45):** government 10 · ecommerce/telco 11 · finance 9 ·
health 6 · ai-misuse 6 · education 2 · judicial 1.
**Type mix:** data_breach 26 · ransomware 5 · ai_disinformation 3 ·
fraud 3 · defacement 3 · ai_deepfake 1 · ai_ncii 1 · ai_voice_fraud 1 · other 2.

### 1.3 Honest claim — use this language
> ⚠️ The manuscript must **stop saying "100 incidents."** Every instance has
> been changed to **45** in the dashboard (`index.html`, `app.core.js`,
> `Laporan_aplikasi_AI_GOV.html`).

**Copy-paste — Data section:**
> We compiled a dataset of **45 documented cybersecurity and AI-misuse incidents
> affecting Indonesia (2017–2025)**. Incidents were identified from reputable
> news outlets, security-vendor disclosures, the vpnMentor and CISSReC research
> groups, and official statements by OJK, BSSN, and affected institutions. Each
> record carries its source citation(s), a confidence rating (high/medium), and
> a verification note flagging figures that derive from a single source or a
> threat-actor's listing. Two records are explicitly coded as
> *pattern/aggregate* phenomena (the OJK-reported AI-fraud statistics and the
> 2024-election deepfake wave) rather than discrete incidents. The dataset is
> purposive rather than exhaustive and is reproducible from
> `build_incident_dataset.py`.

**Copy-paste — Limitations:**
> The incident corpus is a **purposive sample biased toward large,
> media-reported events**; smaller or unreported incidents are under-represented,
> so coverage statistics describe this sample, not the national incident
> population. Several scale figures (e.g., the 279-million BPJS Kesehatan and
> 6-million NPWP claims) originate from threat-actor listings and have not been
> independently audited; these are flagged per-record.

---

## 2. Methodology transparency

### 2.1 Embedding model (reviewer: "not specified")
**Copy-paste — Methods:**
> Provision and incident texts were encoded with **Sentence-BERT**
> (`paraphrase-multilingual-MiniLM-L12-v2`; Reimers & Gurevych, 2019),
> a multilingual model producing **384-dimensional** embeddings across 50+
> languages including Indonesian and English. Embeddings were L2-normalised and
> compared with **cosine similarity**.

These values are now emitted to `data/network/methods_config.json` at build time
so the manuscript can cite them without manual restatement.

### 2.2 Thresholds — reconciled + justified (reviewer: ">0.75/<0.50")
The manuscript's ">0.75 / <0.50" never matched the code. The **authoritative,
tiered, register-aware** scheme (now the single source of truth in `builder.py`)
is:

| Pairing | Language | Register | Threshold |
|---|---|---|---|
| International ↔ International | same (EN) | statute ↔ statute | **0.70** |
| National ↔ National | same (ID) | statute ↔ statute | **0.70** |
| International ↔ National | EN ↔ ID | statute ↔ statute | **0.55** |
| Incident ↔ Regulation | ID ↔ EN/ID | narrative ↔ statute | **0.50** |

**Copy-paste — Methods:**
> Because cosine similarity between multilingual-MiniLM embeddings is
> systematically lower for cross-lingual (EN↔ID) and cross-register
> (narrative↔statute) pairs at equal topical relevance, a single global cut-off
> would over-connect like-with-like pairs and miss cross-lingual/cross-register
> ones. We therefore applied **tiered absolute cosine thresholds**: 0.70 for
> same-language, same-register pairs (Intl↔Intl, Natl↔Natl), 0.55 for
> cross-jurisdiction pairs (Intl↔Natl), and 0.50 for incident↔regulation pairs.
> The ordering is theory-driven; the exact cut-offs are a design choice
> evaluated empirically (§2.4 / validation.py).

### 2.3 Coverage rate (reviewer: undefined)
**Copy-paste — Methods:**
> *Coverage rate* = (number of incidents with ≥1 `governs` edge to a
> regulation) ÷ (total incidents) × 100. For the present corpus,
> coverage = **25/45 = 55.6%**; the complementary **44.4% (20/45)** of incidents
> have no regulatory warrant and constitute *structural holes*.

### 2.4 Network metrics — real, surfaced (reviewer: "no quantitative metrics")
Computed with NetworkX from the real graph (`analyzer.py`, `incident_analyzer.py`).

**Table — Macro topology**
| Metric | Value |
|---|---|
| Nodes (Intl prov. / Natl prov. / incidents) | 831 (488 / 298 / 45) |
| Edges (cross-juris / semantic / governs) | 3,330 (2,399 / 819 / 112) |
| Network density | 0.00966 |
| Incident coverage (≥1 warrant) | 25/45 (55.6%) |
| Isolated international provisions | 140/488 (28.7%) |
| Connected components / largest | 226 / 603 nodes |

**Table — Warrant distribution across incidents (n=45)**
| Category | Count | % |
|---|---|---|
| No warrant (structural hole) | 20 | 44.4% |
| National warrant only | 18 | 40.0% |
| International warrant only | 1 | 2.2% |
| Dual (National + International) | 6 | 13.3% |

**Table — Top regulation hubs (degree centrality)**
| Rank | Node | Class | Score |
|---|---|---|---|
| 1 | SE Komdigi No.9/2023 (AI Ethics) — §3 | Natl: Soft Law (circular) | 0.1964 |
| 2 | SE Komdigi No.9/2023 (AI Ethics) — §4 | Natl: Soft Law (circular) | 0.1795 |
| 3 | SE Komdigi No.9/2023 (AI Ethics) — §12 | Natl: Soft Law (circular) | 0.1241 |

**Table — Most-applied warrants across incidents**
| Rank | Regulation | Incidents |
|---|---|---|
| 1 | Stranas AI Indonesia 2020–2045 — Bab 5 | 14 |
| 2 | UU PDP No.27/2022 — Pasal 39 | 9 |
| 3 | UU ITE No.19/2016 — Pasal 29 | 5 |
| 4 | UU PDP No.27/2022 — Pasal 6 | 5 |

**Copy-paste — Results finding:**
> Indonesia's AI/cyber governance leans heavily on **soft law**: the most central
> instruments by degree centrality are the **Komdigi AI-ethics circular (SE
> 9/2023)** and the **national AI strategy (Stranas AI)** — neither of which is
> binding — and Stranas is also the single most frequently applied warrant.
> International frameworks remain comparatively peripheral: **28.7% of
> international provisions are isolated** (degree 0), and only **7 of 45 incidents
> (15.6%)** invoke any international warrant (6 dual, 1 international-only). This
> empirically substantiates the paper's "vacuum of law" thesis: nearly half of
> real incidents (**44.4%**) map to no regulatory provision at all, and those
> that are covered rely overwhelmingly on national soft-law instruments rather
> than binding statutes or international standards.

---

## 3. Validation (reviewer: zero validation metrics)

This was a genuine gap. We added an end-to-end validation harness.

**Pipeline:**
1. `builder.py` exports **all 35,370** incident↔regulation candidate pairs with
   cosine scores → `data/network/incident_reg_scores.csv` (above *and* below the
   cut-off, so recall is measurable).
2. `make_validation_sample.py` draws a **stratified 103-pair sample**
   (over-sampled around the 0.50 cut-off) → `validation_pairs_template.csv`
   (blank annotator columns) for two coders to label independently.
3. `validation.py` computes, from the coded file:
   - **Inter-annotator agreement**: raw % + **Cohen's κ**;
   - **Classifier performance** at the 0.50 cut-off: precision / recall / F1 /
     accuracy + confusion matrix (gold = annotator agreement; disagreements
     excluded and reported);
   - **Threshold sweep** (0.30→0.70) so the cut-off is justified or revised
     empirically.

A `validation_pairs_DEMO.csv` with **synthetic, clearly-labelled demo labels**
lets the pipeline run immediately; `validation.py` prints a prominent warning and
its numbers must never be cited.

**Copy-paste — Methods (validation protocol):**
> To validate the incident↔regulation edges, we drew a cosine-stratified sample
> of candidate pairs (oversampling the decision boundary) and had two annotators
> independently judge whether each regulation is a plausible legal basis for the
> incident. We report inter-annotator agreement (Cohen's κ) and the precision,
> recall, and F1 of the 0.50 cosine cut-off against the adjudicated labels, and
> we sweep the cut-off to confirm the operating point.

**Copy-paste — Limitations (until you code the sample):**
> The cosine cut-offs are theory-motivated design choices; their empirical
> validation against human-coded ground truth is reported in §X / is in progress
> using the released coding template.

> **Action required of the authors:** code `validation_pairs_template.csv` (two
> annotators), save as `validation_pairs_coded.csv`, run `python validation.py`,
> and paste the resulting κ / precision / recall / F1 into the manuscript. Until
> then, do not report validation numbers.

---

## 4. The "no hallucination" claim (reviewer flagged 3×)

There is **no measurement of hallucination, precision, or accuracy** anywhere in
the codebase. The LLM module (`app.core.js`) only formats Toulmin-style
arguments from retrieved provisions; it does not, and cannot from the present
artifacts, support a "no hallucination" guarantee.

**→ Remove the claim** wherever it appears (Abstract, Discussion, Conclusion).
**Copy-paste replacement (if a sentence is needed):**
> The assistant grounds its arguments in retrieved statutory provisions
> (retrieval-augmented), which constrains unsupported generation; however, we
> make **no claim of zero hallucination**, as the present study does not include
> a generation-accuracy evaluation. Quantifying factual fidelity of the
> argumentation module is left to future work.

---

## 5. Figures (reviewer: not displaying / synthetic)

- Added **`make_figures.py`** — regenerates both report figures **from the real
  graph**, so they can no longer drift from the data:
  - `master_metrics.png` — node composition, coverage 55.6% vs vacuum 44.4%,
    top regulation hubs.
  - `master_lna.png` — the network (spring layout), coloured by class,
    incident nodes labelled.
- `Laporan_aplikasi_AI_GOV.html` embeds them with correct relative paths
  (`./app/assets/report_images/…`); files are present, so they render. Old
  synthetic PNGs kept as `*.SYNTHETIC.bak.png`.
- The live dashboard renders the network via `vis-network` (JS) from
  `legal_graph.json`; the **static PNGs and the `.md` tables are the
  citable, render-independent artifacts** for the paper.

---

## 6. Reproducibility

```bash
# 1. Dependencies
python -m pip install -r system/legal_network_framework/requirements.txt
#    (sentence-transformers, scikit-learn, networkx, numpy, PyPDF2; + matplotlib for figures)

# 2. Build the REAL incident dataset (ID + EN)
python build_incident_dataset.py

# 3. Build the legal network graph from PDFs + incidents
cd system/legal_network_framework && python builder.py
#    -> data/network/legal_graph.json, methods_config.json, incident_reg_scores.csv

# 4. Generate metric reports + figures
python analyzer.py            # -> laporan_hasil_lna.md
python incident_analyzer.py   # -> laporan_khusus_insiden.md
python make_figures.py        # -> app/assets/report_images/master_*.png

# 5. Validation (after manual coding)
python make_validation_sample.py            # -> validation_pairs_template.csv
#   ...code it by hand (2 annotators) -> validation_pairs_coded.csv...
python validation.py                        # -> precision/recall/F1 + Cohen's kappa
```

**Regulation extraction — now robust (all 17 PDFs read).** An earlier version of
`builder.py` silently dropped any document that did not use `Pasal N` / `Article N`
headings, and one file even crashed the parser. This is fixed:

- **`ASEAN_Guide_AI_Governance_Ethics_2024.pdf` was not a PDF at all** — it was an
  HTML "Page not found" error page (a broken download). It was **replaced** with
  the official 87-page PDF from asean.org (kept the old file as `*.BROKEN_HTML.bak`).
- `extract_provisions()` now: (a) reads via a tolerant chain (header check →
  PyPDF2 `strict=False` → pdfminer.six), loudly flagging any file that is not a
  valid PDF; (b) falls back to **paragraph chunking** when a document has fewer
  than 5 article-style provisions, so UN resolutions, codes of conduct,
  ministerial circulars, strategies and guides are represented instead of dropped.
- `POJK_No3_2024_…pdf` was a **1-page OJK press release (SP 32/OJK)**, not the
  regulation. It has been **replaced with the real 36-page POJK 3/2024** (now 44
  article/Pasal nodes); the press release is kept as `*.PRESSRELEASE.bak`.
- Result: all 17 instruments now contribute nodes (e.g. ASEAN Guide → 80 segments,
  SE Komdigi → 13, POJK 3/2024 → 44 Pasal, G7 / UNGA resolutions / UNESCO →
  chunked). The corpus grew from 477 to **831 nodes**, and the most central
  instruments turn out to be Indonesia's **soft-law** AI texts (SE Komdigi,
  Stranas AI) — which strengthens the argument.

---

## 7. File manifest

**New**
- `build_incident_dataset.py` — source-driven real-incident dataset builder (ID+EN)
- `system/legal_network_framework/validation.py` — P/R/F1 + Cohen's κ + sweep
- `system/legal_network_framework/make_validation_sample.py` — coding template
- `system/legal_network_framework/make_figures.py` — figures from real graph
- `data/network/methods_config.json` — machine-readable methods provenance
- `data/network/incident_reg_scores.csv` — 33,525 candidate scores
- `data/network/validation_pairs_template.csv` — 103-pair coding sheet
- `data/incidents/_en_overrides.json` — English translations (feeds the EN dataset)
- `REVIEWER_RESPONSE.md` — this document

**Rewritten**
- `data/incidents/indonesia_incidents.json` — 45 real, sourced incidents
- `data/incidents/indonesia_incidents_en.json` — English counterpart (fully translated)
- `data/network/legal_graph.json` + `incident_graph.json` — rebuilt from real data
- `system/.../laporan_hasil_lna.md`, `laporan_khusus_insiden.md` (+ intl/natl/cross/gap) — real metrics
- `app/assets/report_images/master_lna.png`, `master_metrics.png` — real figures
- `builder.py` — robust multi-backend PDF extractor + fallback chunking, threshold rationale, score export, methods provenance
- `system/legal_network_framework/requirements.txt` — added pdfminer.six, pikepdf, matplotlib
- `data/regulations/.../ASEAN_Guide_AI_Governance_Ethics_2024.pdf` — replaced broken HTML 404 with the real 87-page PDF
- `index.html`, `app/assets/js/app.core.js`, `Laporan_aplikasi_AI_GOV.html` — "100+"→"45"

**Disabled (fabrication)**
- `generate_100_incidents.py`, `system/.../rename_incidents.py`

**Backups (`*.SYNTHETIC.bak.*`)** — original synthetic dataset, graph, figures, and
English dataset are preserved for audit.
