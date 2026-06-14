"""
validate_3way.py — score cosine vs LLM against human ground truth
================================================================
Reads a coded 3-way CSV (annotator1_relevant / annotator2_relevant filled) and
reports, head-to-head:
  1. Inter-annotator agreement (Cohen's kappa) for the human gold.
  2. precision / recall / F1 / accuracy of the COSINE cut-off vs the human gold.
  3. precision / recall / F1 / accuracy of the LLM judge vs the human gold.
  4. raw agreement between cosine and LLM.

Gold = where the two annotators agree (disagreements excluded). If only one
annotator column is filled, that column is the gold.

Run:
  python validate_3way.py                      # validation_3way_coded.csv else DEMO
  python validate_3way.py path/to/coded.csv
"""
import os, csv, sys

NET = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network')
DEFAULT = os.path.join(NET, 'validation_3way_coded.csv')
DEMO = os.path.join(NET, 'validation_3way_DEMO.csv')


def to01(v):
    v = str(v).strip().lower()
    if v in ('1', 'yes', 'y', 'true', 'relevant'): return 1
    if v in ('0', 'no', 'n', 'false', 'irrelevant'): return 0
    return None


def kappa(pairs):
    n = len(pairs)
    if not n: return float('nan'), float('nan'), 0
    po = sum(1 for a, b in pairs if a == b) / n
    a1 = sum(a for a, _ in pairs) / n
    b1 = sum(b for _, b in pairs) / n
    pe = a1 * b1 + (1 - a1) * (1 - b1)
    return ((po - pe) / (1 - pe) if (1 - pe) else float('nan')), po, n


def prf(gold, pred):
    tp = sum(1 for g, p in zip(gold, pred) if g == 1 and p == 1)
    fp = sum(1 for g, p in zip(gold, pred) if g == 0 and p == 1)
    fn = sum(1 for g, p in zip(gold, pred) if g == 1 and p == 0)
    tn = sum(1 for g, p in zip(gold, pred) if g == 0 and p == 0)
    pr = tp / (tp + fp) if tp + fp else 0.0
    rc = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * pr * rc / (pr + rc) if pr + rc else 0.0
    acc = (tp + tn) / max(tp + fp + fn + tn, 1)
    return dict(tp=tp, fp=fp, fn=fn, tn=tn, precision=pr, recall=rc, f1=f1, accuracy=acc)


def klabel(k):
    if k != k: return 'undefined'
    return ('poor' if k < 0 else 'slight' if k < .2 else 'fair' if k < .4 else
            'moderate' if k < .6 else 'substantial' if k < .8 else 'almost perfect')


def main():
    path = sys.argv[1] if len(sys.argv) > 1 else (DEFAULT if os.path.exists(DEFAULT) else DEMO if os.path.exists(DEMO) else None)
    if not path:
        raise SystemExit('No coded file. Run make_3way_sample.py, code it, save as validation_3way_coded.csv.')
    rows = list(csv.DictReader(open(path, encoding='utf-8')))
    demo = path.endswith('DEMO.csv')

    print('=' * 64)
    print('  3-WAY VALIDATION  —  cosine vs LLM vs human')
    print('=' * 64)
    print(f'file: {os.path.basename(path)}  ({len(rows)} pairs)')
    if demo:
        print('\n' + '!' * 60 + '\n! DEMO synthetic labels — do NOT cite. Code the real template.\n' + '!' * 60)

    # 1. IAA
    both = [(to01(r.get('annotator1_relevant')), to01(r.get('annotator2_relevant'))) for r in rows]
    both = [(a, b) for a, b in both if a is not None and b is not None]
    k, po, n = kappa(both)
    print('\n--- 1. Inter-annotator agreement ---')
    print(f'  both-coded pairs: {n}' + (f' | raw {po*100:.0f}% | Cohen κ {k:.3f} ({klabel(k)})' if n else '  (need 2 coders)'))

    # gold
    gold, cos, llm = [], [], []
    dropped = 0
    for r in rows:
        a1, a2 = to01(r.get('annotator1_relevant')), to01(r.get('annotator2_relevant'))
        if a1 is not None and a2 is not None:
            if a1 != a2: dropped += 1; continue
            g = a1
        elif a1 is not None: g = a1
        else: continue
        gold.append(g); cos.append(to01(r.get('cosine_relevant')) or 0); llm.append(to01(r.get('llm_relevant')) or 0)

    if not gold:
        print('\nNo human labels yet — code annotator1 (and annotator2) then rerun.'); return
    print(f'\nGold-labelled pairs: {len(gold)} (excluded {dropped} disagreements); positives {sum(gold)}')

    for name, pred in (('COSINE cut-off (>=0.50)', cos), ('LLM judge (Gemini)', llm)):
        m = prf(gold, pred)
        print(f'\n--- {name} vs human gold ---')
        print(f'  TP={m["tp"]} FP={m["fp"]} FN={m["fn"]} TN={m["tn"]}')
        print(f'  precision={m["precision"]:.3f}  recall={m["recall"]:.3f}  F1={m["f1"]:.3f}  acc={m["accuracy"]:.3f}')

    agree = sum(1 for a, b in zip(cos, llm) if a == b) / len(cos)
    print(f'\n--- cosine vs LLM raw agreement: {agree*100:.0f}% ---')
    print('=' * 64)


if __name__ == '__main__':
    main()
