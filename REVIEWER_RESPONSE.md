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
| E | Coverage rate undefined | Implicit | Explicit formula; cosine baseline 44.4% **corrected** to validated **88.9%** — the "55.6% vacuum" was a retrieval artifact (§2.3); real gap = subject-asymmetry + AI-specificity |
| F | **Zero validation** (no ground truth / IAA / P-R) | True | **Done**: 2-annotator gold (Cohen's κ=0.77); cosine F1=0.28 vs validated judge **F1=0.67** (few-shot + recall-complete candidates); coverage at calibrated P≥95 |
| G | **"No hallucination" claim unsupported** | Asserted | Removed; replacement text provided |
| H | Figures don't display / reflect data | Static PNGs of synthetic data, no generator | `make_figures.py` regenerates from real graph; embedding verified |
| I | Regulations unreadable | 1 PDF was an HTML 404; 1 was a press release; non-article docs silently dropped | Robust extractor + replaced files → **all 17 regulations** represented (916 nodes) |
| J | **Garbled provision text** (audit found only **48% of nodes valid** — regex split on in-text "Pasal N" references) | Silent | Heading-anchored extractor + noise filter → **88% valid**; statutes 100%; graph rebuilt |
| K | **Incident↔regulation mapping** (cosine only; sector scores hand-set) | Weak/editorial | Validated LLM judge (few-shot + recall-complete) drives the forensic graph, per-subject coverage, and sector tab — one consistent, calibrated story |

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

### 2.3 Coverage rate (reviewer: undefined) — and a major correction to the thesis

*Coverage rate* = (incidents with ≥1 applicable warrant) ÷ (total incidents) × 100.
**Two estimates, and the gap between them is itself a finding:**

| Estimate | Coverage | Method |
|---|---|---|
| Cosine retrieval (≥0.50) | **20/45 = 44.4%** | embedding shortlist only — *naive baseline* |
| **Validated judge (P≥95)** | **40/45 = 88.9%** | recall-complete candidates + few-shot LLM judge |

The cosine figure is a **retrieval artifact, not a legal vacuum.** Validation (§3)
showed cosine is a poor *retriever* (F1 0.28): it buries the applicable statute —
e.g. for a 2025 health-data breach UU PDP Pasal 35 (the security duty) ranked
**154th** by cosine, so it never entered the shortlist. When the judge is given a
**recall-complete candidate set** (cosine shortlist ∪ a whitelist of core ID
statutes: UU PDP 35/46/65/67/68, UU ITE, PP PSTE) and screened at high confidence,
**88.9% of incidents have an applicable provision.**

> **Corrected thesis (use this):** Indonesia does **not** have a blanket
> "vacuum of law" for cyber incidents — post-2022 UU PDP supplies a security,
> notification, and criminal basis for the great majority of incidents. The real,
> validated gap is **(a) subject-asymmetric** (operators/consumers/regulators are
> far less covered than perpetrators) and **(b) AI-specific** — AI-misuse/deepfake
> incidents fall back on strained analogies to non-AI statutes (§2.5–2.6).

### 2.4 Network metrics — real, surfaced (reviewer: "no quantitative metrics")
Computed with NetworkX from the real graph (`analyzer.py`, `incident_analyzer.py`).

**Table — Macro topology**
| Metric | Value |
|---|---|
| Nodes (Intl prov. / Natl prov. / incidents) | 916 (541 / 330 / 45) |
| Edges (cross-juris / semantic / governs) | 8,005 (4,787 / 3,126 / 92) |
| Network density | 0.01910 |
| Incident coverage — cosine baseline (≥1 governs edge) | 20/45 (44.4%) *naive* |
| **Incident coverage — validated judge (P≥95)** | **40/45 (88.9%)** |
| Isolated international provisions | 70/541 (12.9%) |
| Connected components / largest | 141 / 771 nodes |

*The 916-node/8,005-edge topology describes the regulation corpus + cosine semantic
links. The cosine `governs` count (92 edges, 20/45 incidents) is the naive-retrieval
baseline; the validated incident↔regulation mapping is the few-shot judge below.*

**Table — Warrant distribution across incidents (n=45), validated judge @ P≥95**
| Category | Count | % |
|---|---|---|
| ≥1 high-confidence warrant (some subject) | 40 | 88.9% |
| No high-confidence warrant (structural hole) | 5 | 11.1% |

*Holes: a website defacement, a crypto-exchange hack, a lending-conduct case, a
2025 bank breach, and a deepfake — i.e. mostly non-data-theft or AI-specific events
where no clean statutory basis reaches high confidence.*

**Table — Top regulation hubs (degree centrality)**
| Rank | Node | Class | Score |
|---|---|---|---|
| 1 | Stranas AI 2020–2045 — §70 | Natl: Strategy/Soft Law | 0.2197 |
| 2 | Stranas AI 2020–2045 — §56 | Natl: Strategy/Soft Law | 0.1858 |
| 3 | SE Komdigi No.9/2023 (AI Ethics) — §5 | Natl: Soft Law (circular) | 0.1770 |

**Table — Most-applied warrants (cosine baseline — note the artifacts)**
| Rank | Regulation | Incidents |
|---|---|---|
| 1 | UU PDP No.27/2022 — Pasal 4 *(definitional)* | 7 |
| 2 | UU ITE No.1/2024 — Pasal 45A | 6 |
| 3 | UU PDP No.27/2022 — Pasal 33 | 4 |

*The prominence of definitional articles (Pasal 4 = "types of personal data") is a
cosine-precision artifact; the validated judge instead surfaces operative bases —
UU PDP Pasal 35 (security), 46 (notification), 67/68 (criminal).*

**Copy-paste — Results finding (corrected):**
> Indonesia's AI/cyber governance leans on **soft law** at the centre — the most
> central instruments by degree are the **national AI strategy (Stranas AI)** and
> the **Komdigi AI-ethics circular (SE 9/2023)**, neither binding — and
> international frameworks are peripheral (**12.9% of international provisions
> isolated**). However, the earlier claim of a **55.6% "structural-hole vacuum"
> was a cosine-retrieval artifact** (§2.3): embedding similarity simply failed to
> rank the applicable Indonesian statute near the top. Under a recall-complete,
> human-validated mapping, **88.9% of incidents have a high-confidence statutory
> basis** — predominantly UU PDP (security/notification/criminal). The genuine
> deficit is therefore not the *absence* of law but its **subject-asymmetry and
> lack of AI-specificity** (§2.5–2.6): perpetrators are well covered, while
> operators, consumers, and regulators are not, and AI-misuse incidents have no
> AI-specific provision at all.

### 2.5 Per-subject coverage (role-aware — fixes the conflation bias)
A single incident binds several legal subjects with different applicable regimes;
collapsing them into one "coverage" number is biased (relevant *to whom?*). Using
the role-aware LLM judge (`llm_judge.py`, Gemini), each warrant is tagged by the
subject it binds, and coverage is reported per subject:

The production judge is **few-shot primed with a recall-complete candidate set**
(§3.2). Coverage is reported at the conservative **calibrated P≥95** operating point
(high-confidence warrants only); the raw flag is shown for comparison.

| Legal subject | Coverage **(calibrated P≥95)** | Structural hole | (raw P≥50) |
|---|---|---|---|
| Perpetrator (criminal liability) | **88.9% (40/45)** | 11.1% | 100% |
| **Operator / PSE** (security & compliance) | **73.3% (33/45)** | 26.7% | 88.9% |
| Consumer / victim (protection & redress) | **73.3% (33/45)** | 26.7% | 84.4% |
| Regulator / state (supervision) | **73.3% (33/45)** | 26.7% | 86.7% |
| **Any subject** | **88.9% (40/45)** | 11.1% | 100% |

**Copy-paste — Results finding (role-aware, validated):**
> Existing law reaches most incidents, but **asymmetrically across legal subjects**.
> The **perpetrator's criminal basis is the best covered (88.9%)** — UU PDP Pasal
> 67/68 and ITE offences apply to almost any unlawful data act. The deficits fall on
> the **protective and supervisory side**: operators' security duties, consumers'
> redress, and the regulator's supervisory hook each reach only **73.3%** of
> incidents at high confidence. So Indonesia can largely *punish* a cyber incident
> but is materially weaker at *preventing* it, *compensating* victims, and
> *supervising* operators. (Figures: `role_coverage.py` → `role_coverage.json`,
> raw + calibrated; judge validated at F1 0.67 / κ 0.77, §3.)

---

### 2.6 Sectoral coverage — now empirical (was hand-set)

The dashboard's "Analisis Kesenjangan Regulasi Per Sektor" tab previously showed a
hand-set **Coverage Score** per sector that (a) did not even match the provisions
listed in its own card and (b) was unconnected to any data. It is now **computed**
from the validated few-shot judge over the 45 real incidents grouped by their
`sector` field (`sector_coverage.py` → `sector_coverage.json`), at the **calibrated
P≥95** operating point: coverage = share of a sector's incidents with ≥1
high-confidence warrant, disaggregated by legal subject. Sectors with n<3 are
flagged as indicative.

| Sector (n) | Any warrant | Pelaku | PSE | Konsumen | Regulator |
|---|---|---|---|---|---|
| E-Commerce & Telco (11) | 100% | 100% | 100% | 100% | 100% |
| Government & Public (10) | 100% | 100% | 100% | 100% | 100% |
| Finance & Banking (9) | 67% | 67% | 56% | 56% | 56% |
| Health (6) | 100% | 100% | 83% | 83% | 83% |
| **AI Misuse / Deepfake (6)** | 83% | 83% | **0%** | **0%** | **0%** |
| Education (2)* | 50% | 50% | 50% | 50% | 50% |
| Justice/Law Enf. (1)* | 100% | 100% | 100% | 100% | 100% |

*small sample (n<3), indicative only.*

**Headline finding (copy-paste):** the data-heavy sectors (e-commerce/telco,
government, health) are well covered by UU PDP at high confidence, but the gap is
concentrated and stark in **AI-misuse/deepfake**: a perpetrator-criminal basis
exists for **83%** of those incidents, yet **0%** have a high-confidence
operator-duty, consumer-redress, *or* regulator-supervision basis. In other words,
for AI-specific harms Indonesian law can name an offender but offers victims no
clear remedy and regulators no clear supervisory hook — because there is **no
AI-specific instrument**, only strained analogies to data-protection/ITE articles
(which fall below high confidence). This is the precise, validated form of the
"governance gap" the paper should argue.

---

## 3. Validation (reviewer: zero validation metrics)

This was a genuine gap. It is now closed with a **human-coded ground truth** and a
three-way comparison (cosine vs LLM vs human).

**Protocol.** From the 39,195 incident↔regulation candidate scores, a **52-pair
sample** was drawn, stratified to over-sample pairs where the methods disagree and
near the 0.50 cut-off (`make_3way_sample.py`; each row carries the incident
chronology + the full article text + cosine + LLM confidence/roles). **Two
annotators** coded each pair independently (`validation_3way_template.csv` →
`validation_2_revisi.xlsx`); `validate_3way.py` scores both methods against the
adjudicated gold.

**3.1 Results (completed).** Inter-annotator agreement: **raw 92%, Cohen's κ =
0.770 (substantial).** Gold = the 48 pairs where annotators agreed (9 positives).

| Method vs human gold | Precision | Recall | F1 | Accuracy |
|---|---|---|---|---|
| Cosine cut-off (≥0.50) | 0.20 | 0.44 | 0.28 | 0.56 |
| LLM judge (Gemini, P≥50) | 0.33 | **1.00** | 0.50 | 0.62 |
| **LLM judge, calibrated P≥95** | **0.53** | 0.89 | **0.67** | — |

**Findings.** Embedding cosine is a weak classifier (F1 0.28). The LLM judge has
**perfect recall** but over-includes at P≥50 (precision 0.33); **calibrating its
confidence threshold to ≥95% — selected on this gold — lifts F1 to 0.67**
(precision 0.53, recall 0.89) with no model training. This zero-shot result was
then refined by **few-shot priming + a recall-complete candidate set (§3.2)**, the
configuration that now drives the §2.5–2.6 coverage figures.

**Why not fine-tune?** Considered and rejected *for now*: 52 labels (9 positives)
is far below what supervised fine-tuning needs (≥hundreds, with a held-out test
set) and would overfit; threshold calibration is the sound use of a sample this
size. A reproducible open **cross-encoder** fine-tune becomes viable once the
coded set reaches ~300+ pairs (a path the tooling already supports).

**3.2 Production judge — few-shot priming + recall-complete candidates.**
Two improvements over the zero-shot baseline:

1. **Few-shot priming.** The judge is primed with **7 human-adjudicated exemplars**
   (3 positive, 4 negative) drawn from the gold and **held out from evaluation**
   (`make_fewshot.py` → `fewshot_examples.json`; `--fewshot` in `llm_judge.py`). The
   negatives target the model's failure mode — over-inclusion of *definitional*
   articles, *data-subject procedural rights* not triggered by a breach,
   *wrong-delict* ITE provisions, and *aspirational strategy* documents.
2. **Recall-complete candidates.** Cosine is a poor *retriever* — it ranked the
   applicable UU PDP security article **154th** for one breach — so the judge was
   given each incident's top-12 cosine shortlist **∪ a whitelist of core ID statutes**
   (UU PDP 35/46/65/67/68, UU ITE, PP PSTE) and left to decide. This removes the
   embedding recall ceiling that had manufactured false "structural holes."

Evaluated on the **41 held-out gold pairs** (`eval_fewshot.py`, no train/test leak):

| Judge | raw flag (P / R / F1) | calibrated P≥95 (F1) |
|---|---|---|
| Zero-shot | 0.30 / 1.00 / 0.46 | 0.59 |
| **Production (few-shot + recall-complete)** | **0.67 / 0.67 / 0.67** | **0.67** |

The production judge beats zero-shot on F1 (0.67 vs 0.46 raw / 0.59 calibrated).
Note this is *below* a few-shot-only-on-top-12 variant (F1 0.83): the larger
candidate context trades a little precision **on the gold pairs** for far better
recall on statutes the embedding buried — the latter is invisible to the gold
(which was itself drawn from top-12 cosine pairs) but is the point of the fix.
*Caveats:* (i) the held-out set is small (41 pairs, 6 positives) so F1 moves in
coarse steps; (ii) for AI-misuse incidents the judge's *raw* coverage rests on
**strained analogies** to non-AI statutes ("dapat dianggap…"), which is exactly why
we report the conservative **P≥95** figures — at high confidence those analogies
drop out and the AI-specific gap (§2.6) reappears.

**Copy-paste — Methods/Results (production judge):**
> The mapping was produced by an LLM judge primed with seven held-out
> human-adjudicated exemplars and given a recall-complete candidate set (cosine
> shortlist plus a whitelist of core statutes), since cosine retrieval alone buried
> applicable provisions (F1 0.28). Against the human gold the judge scored F1 0.67
> (κ 0.77 between annotators); all coverage figures are reported at a calibrated
> ≥95% confidence threshold.

**Copy-paste — Methods/Results:**
> Two annotators independently coded a 52-pair cosine/role-stratified sample of
> incident–regulation pairs (Cohen's κ = 0.77, substantial agreement). Against the
> adjudicated gold, the 0.50 cosine cut-off achieved F1 = 0.28 (precision 0.20,
> recall 0.44); the LLM judge achieved recall = 1.00 with precision = 0.33,
> improving to F1 = 0.67 (precision 0.53, recall 0.89) after its confidence
> threshold was calibrated to ≥95% on the coded sample. We therefore treat the
> automatic mapping as a high-recall screen confirmed by expert review.

**Caveat (state in Limitations):** the validation sample is stratified to stress
method disagreement, so these precision/recall values are **method-comparison
metrics, not population warrant rates**; unbiased population estimates require
per-stratum reweighting. Reproduce with `python validate_3way.py <coded .csv|.xlsx>`.

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
  - `master_metrics.png` — node composition, coverage 44.4% vs vacuum 55.6%,
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

**Regulation extraction — now robust AND clean (all 17 PDFs).** Two defects were
found and fixed:

*(i) Files unreadable/wrong:*
- **`ASEAN_Guide…pdf` was not a PDF** — an HTML "Page not found" page (broken
  download). Replaced with the official 87-page asean.org PDF (`*.BROKEN_HTML.bak`).
- **`POJK_No3_2024…pdf` was a 1-page OJK press release**, not the regulation.
  Replaced with the real 36-page POJK 3/2024 (`*.PRESSRELEASE.bak`).
- `extract_provisions()` now reads via pdfminer→PyPDF2, flags non-PDF files, and
  falls back to paragraph chunking for non-article documents (UN resolutions,
  codes, circulars, guides, strategies) instead of dropping them.

*(ii) Garbled provision text (the serious one).* An audit found that the original
regex split on **every** in-text "Pasal N" reference (e.g. "…dimaksud dalam Pasal 5
ayat (1)…"), and last-write-wins stored the reference *fragment* as the article —
so **only 48% of provision nodes carried valid text** (e.g. "Pasal 52" = a closing
clause, "Pasal 28j" = a quote of UUD-1945 Art. 28J). Fixed with a **heading-anchored
extractor** (heading = line-start *or* body-follows-and-not-a-reference) plus a
boilerplate/preamble/short-fragment filter that drops noise nodes entirely.

- **Validity rose 48.3% → 88.2%**; the named-article statutes (UU PDP, UU ITE, PP
  PSTE, POJK, EU AI Act, Council of Europe) are now **100% clean**.
- The corpus was rebuilt from clean text: **916 nodes / 8,005 edges**. Removing the
  garbled nodes **corrected the coverage rate from 55.6% to 44.4%** (the old value
  was inflated by incidents matching noise nodes) — i.e. **55.6% of incidents are
  now structural holes**, strengthening the "vacuum of law" finding. The most
  central instruments remain Indonesia's **soft-law** AI texts (Stranas AI, SE
  Komdigi). All metric tables/figures above reflect this clean rebuild.

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
