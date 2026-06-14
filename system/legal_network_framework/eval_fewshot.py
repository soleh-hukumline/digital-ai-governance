"""
eval_fewshot.py — does few-shot priming beat zero-shot? (held-out comparison)
============================================================================
Compares the LLM judge WITH and WITHOUT human-adjudicated few-shot exemplars,
scored against the human gold — on the SAME held-out pairs (the exemplar pairs in
fewshot_examples.json are EXCLUDED from both, so there is no train/test leak).

For each method we report, vs the human gold:
  * raw  — the model's own `relevant` flag.
  * P>=95 — the calibrated operating point used elsewhere (role_coverage.py).
  * best — the threshold on P(relevant) that maximises F1 on this set.
P(relevant) = confidence if relevant else (100 - confidence).

Inputs (data/network/): validation_2_revisi.xlsx (gold), fewshot_examples.json
(hold-out keys), llm_edge_confidence.json (zero-shot), llm_edge_confidence_fewshot.json.

Run:  python eval_fewshot.py
"""
import os, json
import openpyxl

NET = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network')
GOLD = os.path.join(NET, 'validation_2_revisi.xlsx')
FEW = os.path.join(NET, 'fewshot_examples.json')
ZERO = os.path.join(NET, 'llm_edge_confidence.json')
FEWOUT = os.path.join(NET, 'llm_edge_confidence_fewshot.json')


def to01(v):
    s = str(v).strip().lower()
    return 1 if s in ('1', 'yes', 'y', 'true', 'relevant') else 0 if s in ('0', 'no', 'n', 'false', 'irrelevant') else None


def load_gold(holdout):
    wb = openpyxl.load_workbook(GOLD, read_only=True, data_only=True)
    rows = list(wb.active.iter_rows(values_only=True))
    head = [str(h).strip() for h in rows[0]]
    gold = {}
    for r in rows[1:]:
        d = {head[i]: (r[i] if i < len(r) else None) for i in range(len(head))}
        a1, a2 = to01(d['annotator1_relevant']), to01(d['annotator2_relevant'])
        if a1 is None or a2 is None or a1 != a2:
            continue                                   # gold = agreement only
        key = (d['incident_id'], d['regulation_label'])
        if key in holdout:
            continue                                   # exclude few-shot exemplars
        gold[key] = a1
    return gold


def p_rel(rec):
    c = int(rec.get('confidence', 0))
    return c if rec.get('relevant') else 100 - c


def load_pred(path):
    """key -> {'flag':0/1, 'p':P(relevant)}"""
    d = json.load(open(path, encoding='utf-8'))['incidents']
    out = {}
    for iid, recs in d.items():
        for r in recs:
            out[(iid, r['regulation_label'])] = {'flag': 1 if r.get('relevant') else 0, 'p': p_rel(r)}
    return out


def prf(gold, pred):
    tp = sum(1 for k in gold if gold[k] == 1 and pred.get(k) == 1)
    fp = sum(1 for k in gold if gold[k] == 0 and pred.get(k) == 1)
    fn = sum(1 for k in gold if gold[k] == 1 and pred.get(k) == 0)
    tn = sum(1 for k in gold if gold[k] == 0 and pred.get(k) == 0)
    pr = tp / (tp + fp) if tp + fp else 0.0
    rc = tp / (tp + fn) if tp + fn else 0.0
    f1 = 2 * pr * rc / (pr + rc) if pr + rc else 0.0
    return dict(tp=tp, fp=fp, fn=fn, tn=tn, precision=pr, recall=rc, f1=f1)


def at_threshold(gold, preds, tau):
    return prf(gold, {k: (1 if v['p'] >= tau else 0) for k, v in preds.items()})


def best_threshold(gold, preds):
    best = (0.0, None)
    for tau in range(50, 101, 5):
        m = at_threshold(gold, preds, tau)
        if m['f1'] > best[0]:
            best = (m['f1'], (tau, m))
    return best[1]


def report(name, gold, preds):
    raw = prf(gold, {k: v['flag'] for k, v in preds.items()})
    c95 = at_threshold(gold, preds, 95)
    tau, bm = best_threshold(gold, preds)
    print(f'\n--- {name} (n={len(gold)}, positives={sum(gold.values())}) ---')
    for tag, m in (('raw flag', raw), ('P>=95   ', c95), (f'best P>={tau:<3d}', bm)):
        print(f'  {tag}: P={m["precision"]:.2f} R={m["recall"]:.2f} F1={m["f1"]:.2f} '
              f'(TP={m["tp"]} FP={m["fp"]} FN={m["fn"]} TN={m["tn"]})')
    return {'raw': raw, 'p95': c95, 'best': {'tau': tau, **bm}}


def main():
    fs = json.load(open(FEW, encoding='utf-8'))
    holdout = {(k[0], k[1]) for k in fs['holdout_keys']}
    gold = load_gold(holdout)
    print('=' * 64)
    print('  FEW-SHOT vs ZERO-SHOT  —  held-out human gold')
    print('=' * 64)
    print(f'exemplars held out: {len(holdout)} | eval pairs: {len(gold)} '
          f'(positives {sum(gold.values())})')

    res = {'n_eval': len(gold), 'positives': sum(gold.values()), 'n_exemplars': len(holdout)}
    res['zero_shot'] = report('ZERO-SHOT', gold, load_pred(ZERO))
    if os.path.exists(FEWOUT):
        res['few_shot'] = report('FEW-SHOT', gold, load_pred(FEWOUT))
    else:
        print('\n(no few-shot output yet — run: python llm_judge.py --fewshot)')
    print('\n' + '=' * 64)
    with open(os.path.join(NET, 'fewshot_eval.json'), 'w', encoding='utf-8') as f:
        json.dump(res, f, ensure_ascii=False, indent=2)
    print('wrote fewshot_eval.json')


if __name__ == '__main__':
    main()
