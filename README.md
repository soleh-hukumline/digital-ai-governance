# Digital AI Governance Dashboard

A data-driven Legal Network Analysis (LNA) of Indonesia's AI and cybersecurity
regulatory landscape. It maps a corpus of **real, individually-sourced cyber/AI
incidents** against national and international regulatory provisions to identify
the **subject-asymmetric, AI-specific** gap in coverage: existing law reaches
**88.9% of incidents** (40/45) with a high-confidence statutory basis and **every
incident for *some* legal subject** — but coverage is starkly uneven across the
subjects each incident binds (perpetrators well covered; consumers and regulators
largely not).

## Data integrity

This project was overhauled to remove a previous synthetic dataset (95 of 100
"incidents" had been randomly generated and disguised). The current dataset
contains **only 45 real incidents, each with source citations, a confidence
rating, and a verification note**. See [`REVIEWER_RESPONSE.md`](REVIEWER_RESPONSE.md)
for the full change log and copy-paste manuscript text.

- Real incidents only — no synthetic/extrapolated records.
- Every methodological value (embedding model, thresholds, coverage formula) is
  emitted to `data/network/methods_config.json` at build time.
- Edge thresholds are validated, not just asserted, via `validation.py`.

## Key methodology

- **Embeddings:** Sentence-BERT `paraphrase-multilingual-MiniLM-L12-v2`
  (384-dim, 50+ languages; Reimers & Gurevych, 2019), L2-normalised, cosine.
- **Tiered thresholds:** 0.70 (intra, same language) · 0.55 (cross-jurisdiction
  EN↔ID) · 0.50 (incident↔regulation). Rationale in `builder.py`.
- **Coverage rate** = incidents with ≥1 applicable warrant ÷ total × 100.
  The naive cosine-retrieval baseline (20/45 = 44.4%) was a **retrieval artifact,
  not a legal vacuum** — embedding similarity simply failed to rank the applicable
  Indonesian statute near the top (e.g. UU PDP Pasal 35 ranked 154th for a health
  breach). The earlier "55.6% structural-hole vacuum" framing is therefore
  **retracted**. Under a recall-complete, human-validated LLM judge (P≥95),
  **88.9% (40/45)** of incidents have a high-confidence statutory basis. The real,
  validated finding is a **subject-asymmetric** gap (per-subject coverage:
  perpetrator 100% · operator/PSE 88.9% · consumer 26.7% · regulator 11.1%; any
  subject 100%) that is sharpest for **AI-misuse/deepfake** incidents. See
  [`REVIEWER_RESPONSE.md`](REVIEWER_RESPONSE.md) §2.3 / §2.5.
- **Authority — by explicit citation, not text similarity.** Authority in this
  corpus is measured by the **citation network** (instrument-level, explicit
  cross-references in `data/network/citations.json`): in-degree counts how often an
  instrument is *cited* by others. The hub is **UU ITE No.19/2016, cited 39×**
  (30 of them self-referential citations from its amendment UU 1/2024 to the
  parent act), followed by **PP PSTE 71/2019, 6×**. *(An earlier count credited
  CETS 225 with 23 citations; a matcher audit showed all 23 were false positives
  on the generic string "Council of Europe" — 22 from affiliation lines in the
  WHO 2021 guidance, which predates the Convention's adoption on 17 May 2024 —
  and the matcher + `citations.json` have been corrected.)* The
  SBERT / force-directed map measures **semantic (textual) overlap**, which is
  *exploratory* and inflates long soft-law documents (Stranas AI, WHO,
  SE Menkominfo No. 9/2023 — the issuing ministry is now Komdigi)
  — it is **not** an authority signal. Authority = the citation network + the
  validation panel; SBERT degree centrality is secondary semantic context.
- **Network metrics** (density, degree & betweenness centrality, components) via
  NetworkX.

## Directory structure

- `build_incident_dataset.py` — builds the real incident dataset (ID + EN).
- `system/legal_network_framework/` — Python backend:
  - `builder.py` — embeds provisions + incidents, builds `legal_graph.json`.
  - `analyzer.py`, `incident_analyzer.py` — network & warrant metrics → `.md`.
  - `validation.py`, `make_validation_sample.py` — edge validation (P/R/F1 + κ).
  - `make_figures.py` — report figures from the real graph.
- `data/` — `incidents/` (sourced JSON), `regulations/` (PDF corpus),
  `network/` (graph, scores, methods config).
- `app/` & `index.html` — web dashboard (vanilla JS + vis-network).

## Reproduce

```bash
python -m pip install -r system/legal_network_framework/requirements.txt
python build_incident_dataset.py
cd system/legal_network_framework
python builder.py && python analyzer.py && python incident_analyzer.py && python make_figures.py
```

See [`REVIEWER_RESPONSE.md`](REVIEWER_RESPONSE.md) §6 for the full pipeline,
including the validation steps.
