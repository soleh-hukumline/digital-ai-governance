"""
make_validation_sample.py — build a manual-coding template for edge validation
==============================================================================
Reviewer concern: the incident↔regulation edges have NO ground truth, NO
inter-annotator agreement, and NO precision/recall — the 0.50 cosine cut-off is
asserted, not validated.

This script turns the real similarity scores exported by builder.py
(data/network/incident_reg_scores.csv) into a STRATIFIED sample of
incident↔regulation pairs for two human annotators to label independently.
Stratifying by cosine band (especially around the 0.50 cut-off) is what lets
validation.py later estimate precision AND recall and sweep the threshold.

Outputs (in data/network/):
  validation_pairs_template.csv      -> real pairs, BLANK annotator columns.
                                        THIS is the file you code by hand.
  validation_pairs_DEMO.csv          -> same pairs with SYNTHETIC demo labels
                                        (transparent rule) so validation.py can
                                        be run end-to-end immediately. NOT real
                                        annotations — never cite its numbers.

Coding protocol (put this in your codebook):
  annotator1_relevant / annotator2_relevant ∈ {1,0}
    1 = this regulation provision is a plausible legal basis ("warrant") that
        governs / would be applied to this incident.
    0 = not a relevant legal basis.
  Code from the incident_label + regulation_label (and the underlying texts);
  do NOT look at the cosine score while coding (avoid anchoring).

Run:  python make_validation_sample.py
"""

import csv
import os
import random

SCORES = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network', 'incident_reg_scores.csv')
OUT_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network')

# Cosine bands and how many pairs to sample from each. Oversample near the
# 0.50 cut-off, where classification is hardest and validation matters most.
BANDS = [
    ("0.65-1.00", 0.65, 1.01, 20),
    ("0.55-0.65", 0.55, 0.65, 25),
    ("0.50-0.55", 0.50, 0.55, 25),   # just above cut-off
    ("0.45-0.50", 0.45, 0.50, 25),   # just below cut-off
    ("0.35-0.45", 0.35, 0.45, 20),
    ("0.00-0.35", 0.00, 0.35, 15),   # clear negatives
]
SEED = 42


def load_scores(path):
    rows = []
    with open(path, newline='', encoding='utf-8') as f:
        for r in csv.DictReader(f):
            try:
                r['cosine'] = float(r['cosine'])
            except (KeyError, ValueError):
                continue
            rows.append(r)
    return rows


def demo_label(cosine, rng):
    """TRANSPARENT synthetic label for pipeline demonstration ONLY.
    Models an imperfect annotator: relevant near cut-off ~0.47 with noise.
    These are NOT real judgments."""
    p = 1.0 / (1.0 + pow(2.718281828, -(cosine - 0.47) * 18))  # logistic around 0.47
    return 1 if rng.random() < p else 0


def main():
    if not os.path.exists(SCORES):
        raise SystemExit(
            f"Missing {SCORES}.\nRun the builder first:  python builder.py")

    rows = load_scores(SCORES)
    print(f"Loaded {len(rows)} incident↔regulation candidate pairs.")
    rng = random.Random(SEED)

    sampled = []
    for name, lo, hi, k in BANDS:
        band = [r for r in rows if lo <= r['cosine'] < hi]
        rng.shuffle(band)
        take = band[:k]
        sampled.extend(take)
        print(f"  band {name}: {len(band):5d} available → sampled {len(take)}")

    # Stable order for reproducible coding sheets
    sampled.sort(key=lambda r: (-r['cosine'], r['incident_id'], r['regulation_id']))

    cols = ['pair_id', 'incident_id', 'incident_label', 'regulation_id',
            'regulation_label', 'classification', 'cosine', 'linked_by_threshold']

    tmpl_path = os.path.join(OUT_DIR, 'validation_pairs_template.csv')
    with open(tmpl_path, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(cols + ['annotator1_relevant', 'annotator2_relevant', 'notes'])
        for i, r in enumerate(sampled, 1):
            w.writerow([i] + [r.get(c, '') for c in cols[1:]] + ['', '', ''])
    print(f"\n✅ Coding template (BLANK labels): {tmpl_path}  ({len(sampled)} pairs)")

    demo_path = os.path.join(OUT_DIR, 'validation_pairs_DEMO.csv')
    rng2 = random.Random(SEED + 1)
    with open(demo_path, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f)
        w.writerow(cols + ['annotator1_relevant', 'annotator2_relevant', 'notes'])
        for i, r in enumerate(sampled, 1):
            a1 = demo_label(r['cosine'], rng2)
            a2 = demo_label(r['cosine'], rng2)
            w.writerow([i] + [r.get(c, '') for c in cols[1:]] +
                       [a1, a2, 'SYNTHETIC DEMO LABEL — not a real annotation'])
    print(f"✅ Demo coded file (SYNTHETIC labels): {demo_path}")
    print("\nNext: code validation_pairs_template.csv by hand (2 annotators),")
    print("      save as validation_pairs_coded.csv, then run:  python validation.py")


if __name__ == '__main__':
    main()
