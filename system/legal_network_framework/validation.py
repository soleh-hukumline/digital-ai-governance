"""
validation.py — empirical validation of incident↔regulation edges
=================================================================
Answers the reviewer head-on: instead of ASSERTING the 0.50 cosine cut-off, this
measures how good it actually is against a manually-coded ground truth, and
reports the inter-annotator agreement behind that ground truth.

It computes, from a coded CSV of incident↔regulation pairs:
  1. Inter-annotator agreement   — raw agreement % and Cohen's kappa
                                    (annotator1_relevant vs annotator2_relevant).
  2. Classifier performance       — precision / recall / F1 / accuracy of the
                                    cosine cut-off (linked iff cosine >= cut-off)
                                    against the adjudicated gold label, with a
                                    confusion matrix.
  3. Threshold sweep              — P/R/F1 across cut-offs 0.30..0.70 so the
                                    chosen 0.50 can be justified (or revised)
                                    empirically rather than by fiat.

Gold label rule: where the two annotators agree, that value is the gold label;
disagreements are EXCLUDED from performance metrics (and reported separately) so
the metric is not contaminated by unresolved cases. (Adjudicate disagreements
and add a 'gold' column to include them.)

Pure standard library — no sklearn dependency.

Run:
  python validation.py                       # uses validation_pairs_coded.csv,
                                             # else falls back to the DEMO file.
  python validation.py path/to/coded.csv
"""

import csv
import os
import sys

NET_DIR = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network')
DEFAULT_CODED = os.path.join(NET_DIR, 'validation_pairs_coded.csv')
DEMO_CODED = os.path.join(NET_DIR, 'validation_pairs_DEMO.csv')
CUTOFF = 0.50  # THRESHOLD_INC_REG in builder.py


def _to01(v):
    v = str(v).strip().lower()
    if v in ('1', 'yes', 'y', 'true', 'relevant', 'rel'):
        return 1
    if v in ('0', 'no', 'n', 'false', 'irrelevant', 'irrel'):
        return 0
    return None


def load(path):
    rows = []
    with open(path, newline='', encoding='utf-8') as f:
        for r in csv.DictReader(f):
            try:
                r['cosine'] = float(r['cosine'])
            except (KeyError, ValueError):
                continue
            r['a1'] = _to01(r.get('annotator1_relevant', ''))
            r['a2'] = _to01(r.get('annotator2_relevant', ''))
            r['gold_explicit'] = _to01(r.get('gold', ''))
            rows.append(r)
    return rows


def cohens_kappa(pairs):
    """pairs: list of (a, b) in {0,1}. Returns (kappa, raw_agreement, n)."""
    n = len(pairs)
    if n == 0:
        return float('nan'), float('nan'), 0
    po = sum(1 for a, b in pairs if a == b) / n
    # marginal probabilities
    a1 = sum(a for a, _ in pairs) / n
    b1 = sum(b for _, b in pairs) / n
    pe = a1 * b1 + (1 - a1) * (1 - b1)
    kappa = (po - pe) / (1 - pe) if (1 - pe) != 0 else float('nan')
    return kappa, po, n


def prf(gold, pred):
    """gold/pred: parallel lists of {0,1}. Returns dict of metrics + confusion."""
    tp = sum(1 for g, p in zip(gold, pred) if g == 1 and p == 1)
    fp = sum(1 for g, p in zip(gold, pred) if g == 0 and p == 1)
    fn = sum(1 for g, p in zip(gold, pred) if g == 1 and p == 0)
    tn = sum(1 for g, p in zip(gold, pred) if g == 0 and p == 0)
    prec = tp / (tp + fp) if (tp + fp) else 0.0
    rec = tp / (tp + fn) if (tp + fn) else 0.0
    f1 = 2 * prec * rec / (prec + rec) if (prec + rec) else 0.0
    acc = (tp + tn) / (tp + fp + fn + tn) if (tp + fp + fn + tn) else 0.0
    return {'tp': tp, 'fp': fp, 'fn': fn, 'tn': tn,
            'precision': prec, 'recall': rec, 'f1': f1, 'accuracy': acc}


def kappa_label(k):
    if k != k:  # NaN
        return 'undefined'
    if k < 0.0:  return 'poor'
    if k < 0.20: return 'slight'
    if k < 0.40: return 'fair'
    if k < 0.60: return 'moderate'
    if k < 0.80: return 'substantial'
    return 'almost perfect'


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else None
    is_demo = False
    if path is None:
        if os.path.exists(DEFAULT_CODED):
            path = DEFAULT_CODED
        elif os.path.exists(DEMO_CODED):
            path = DEMO_CODED
            is_demo = True
        else:
            raise SystemExit(
                "No coded file found.\n"
                "  1) python make_validation_sample.py   (creates the template)\n"
                "  2) code validation_pairs_template.csv by hand (2 annotators)\n"
                "  3) save as validation_pairs_coded.csv and rerun this script.")

    rows = load(path)
    print("=" * 66)
    print("  EDGE VALIDATION REPORT")
    print("=" * 66)
    print(f"Coded file : {os.path.basename(path)}  ({len(rows)} pairs)")
    if is_demo:
        print("\n" + "!" * 66)
        print("! WARNING: DEMO FILE WITH SYNTHETIC LABELS.")
        print("! These numbers demonstrate the pipeline ONLY. Do NOT cite them.")
        print("! Replace with real annotations in validation_pairs_coded.csv.")
        print("!" * 66)

    # ── 1. Inter-annotator agreement ──────────────────────────────
    both = [(r['a1'], r['a2']) for r in rows if r['a1'] is not None and r['a2'] is not None]
    kappa, po, n = cohens_kappa(both)
    print("\n--- 1. Inter-annotator agreement (annotator1 vs annotator2) ---")
    if n == 0:
        print("  No pairs have BOTH annotator columns filled. "
              "Code the template before interpreting metrics.")
    else:
        print(f"  Pairs with both labels : {n}")
        print(f"  Raw agreement          : {po*100:.1f}%")
        print(f"  Cohen's kappa          : {kappa:.3f}  ({kappa_label(kappa)})")

    # ── 2. Gold label & classifier performance ────────────────────
    gold, pred, n_dis = [], [], 0
    for r in rows:
        if r['gold_explicit'] is not None:
            g = r['gold_explicit']
        elif r['a1'] is not None and r['a2'] is not None:
            if r['a1'] != r['a2']:
                n_dis += 1
                continue  # exclude unresolved disagreements
            g = r['a1']
        elif r['a1'] is not None:
            g = r['a1']
        else:
            continue
        gold.append(g)
        pred.append(1 if r['cosine'] >= CUTOFF else 0)

    print(f"\n--- 2. Classifier performance @ cosine cut-off {CUTOFF:.2f} ---")
    if not gold:
        print("  No gold labels available yet (code the template first).")
    else:
        m = prf(gold, pred)
        print(f"  Gold-labelled pairs used : {len(gold)} "
              f"(excluded {n_dis} annotator disagreements)")
        print(f"  Positives in gold        : {sum(gold)} / {len(gold)}")
        print(f"  Confusion: TP={m['tp']} FP={m['fp']} FN={m['fn']} TN={m['tn']}")
        print(f"  Precision = {m['precision']:.3f}")
        print(f"  Recall    = {m['recall']:.3f}")
        print(f"  F1        = {m['f1']:.3f}")
        print(f"  Accuracy  = {m['accuracy']:.3f}")

    # ── 3. Threshold sweep ────────────────────────────────────────
    print("\n--- 3. Threshold sweep (justify / revise the cut-off) ---")
    if not gold:
        print("  (needs gold labels)")
    else:
        cosines = [r['cosine'] for r in rows
                   if (r['gold_explicit'] is not None
                       or (r['a1'] is not None and r['a2'] is not None and r['a1'] == r['a2'])
                       or (r['a1'] is not None and r['a2'] is None))]
        # rebuild aligned gold/cosine
        g2, c2 = [], []
        for r in rows:
            if r['gold_explicit'] is not None:
                g = r['gold_explicit']
            elif r['a1'] is not None and r['a2'] is not None:
                if r['a1'] != r['a2']:
                    continue
                g = r['a1']
            elif r['a1'] is not None:
                g = r['a1']
            else:
                continue
            g2.append(g)
            c2.append(r['cosine'])
        print(f"  {'cutoff':>7} {'prec':>6} {'rec':>6} {'f1':>6}")
        best = (0.0, None)
        cut = 0.30
        while cut <= 0.7001:
            pr = [1 if c >= cut else 0 for c in c2]
            mm = prf(g2, pr)
            mark = ''
            if abs(cut - CUTOFF) < 1e-9:
                mark = '  <- current'
            if mm['f1'] > best[0]:
                best = (mm['f1'], cut)
            print(f"  {cut:>7.2f} {mm['precision']:>6.3f} {mm['recall']:>6.3f} {mm['f1']:>6.3f}{mark}")
            cut += 0.05
        if best[1] is not None:
            print(f"  Best F1 = {best[0]:.3f} at cut-off {best[1]:.2f}")
    print("=" * 66)


if __name__ == '__main__':
    main()
