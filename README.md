# Digital AI Governance Dashboard

A data-driven Legal Network Analysis (LNA) of Indonesia's AI and cybersecurity
regulatory landscape. It maps a corpus of **real, individually-sourced cyber/AI
incidents** against national and international regulatory provisions to identify
*structural holes* — incidents with no applicable legal warrant.

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
- **Coverage rate** = incidents with ≥1 regulatory warrant ÷ total × 100
  (currently 20/45 = 44.4%; 55.6% are structural holes).
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
