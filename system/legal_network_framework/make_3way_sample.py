"""
make_3way_sample.py — 3-way ground-truth coding template (cosine vs LLM vs human)
================================================================================
Builds a stratified sample of incident↔regulation pairs so a human annotator can
adjudicate, and the two automatic methods can be scored against that gold:
  * cosine cut-off (>=0.50)          — the embedding method
  * Gemini LLM-judge (P>=50%)        — llm_edge_confidence.json
  * human annotator(s)               — columns you fill in

The sample over-weights the INFORMATIVE strata (where the two methods disagree),
and includes the actual article TEXT so you can judge without looking it up.

Outputs (data/network/):
  validation_3way_template.csv   — code annotator1_relevant / annotator2_relevant (1/0)
  validation_3way_DEMO.csv       — synthetic labels so validate_3way.py runs immediately

Run:  python make_3way_sample.py
"""
import os, csv, json, random, glob
import builder

NET = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network')
INC = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'incidents', 'indonesia_incidents.json')
LLM = os.path.join(NET, 'llm_edge_confidence.json')
SEED = 42
QUOTA = {'both_rel': 12, 'llm_only': 18, 'cos_only': 10, 'both_not': 12}  # ~52 pairs
CUT = 0.50


def main():
    incidents = {i['id']: i for i in json.load(open(INC, encoding='utf-8'))['incidents']}
    llm = json.load(open(LLM, encoding='utf-8'))['incidents']

    # provision text map
    label_text = {}
    for pdf in glob.glob(os.path.join(builder.REG_BASE, '**', '*.pdf'), recursive=True):
        doc = os.path.basename(pdf)[:-4]
        for title, txt in builder.extract_provisions(pdf).items():
            label_text[f'{doc} - {title}'] = txt

    # flatten + classify into strata
    strata = {k: [] for k in QUOTA}
    for iid, rows in llm.items():
        for r in rows:
            cos_rel = r['cosine'] >= CUT
            llm_rel = bool(r['relevant'])
            key = ('both_rel' if cos_rel and llm_rel else
                   'cos_only' if cos_rel and not llm_rel else
                   'llm_only' if not cos_rel and llm_rel else 'both_not')
            strata[key].append((iid, r))

    rng = random.Random(SEED)
    chosen = []
    for k, q in QUOTA.items():
        pool = strata[k]; rng.shuffle(pool)
        chosen += [(k, iid, r) for iid, r in pool[:q]]
        print(f'  stratum {k:9s}: {len(pool):4d} available → sampled {min(q, len(pool))}')
    rng.shuffle(chosen)

    cols = ['pair_id', 'stratum', 'incident_id', 'incident_summary', 'regulation_id',
            'regulation_label', 'regulation_text', 'cosine', 'cosine_relevant',
            'llm_relevant', 'llm_p_relevant', 'llm_roles',
            'annotator1_relevant', 'annotator2_relevant', 'annotator_role', 'notes']

    def row_for(i, k, iid, r):
        inc = incidents.get(iid, {})
        # FULL text so the coder can judge properly (no truncation)
        kron = ' '.join(str(inc.get('peristiwa_hukum_kronologi', '')).split())
        summ = f"[{inc.get('year','')} {inc.get('type','')}] {kron}"
        text = ' '.join(str(label_text.get(r['regulation_label'], '')).split())[:1200]
        p = r['confidence'] if r['relevant'] else 100 - r['confidence']
        return {
            'pair_id': i, 'stratum': k, 'incident_id': iid, 'incident_summary': summ,
            'regulation_id': r['regulation_id'], 'regulation_label': r['regulation_label'],
            'regulation_text': text, 'cosine': r['cosine'],
            'cosine_relevant': 1 if r['cosine'] >= CUT else 0,
            'llm_relevant': 1 if r['relevant'] else 0, 'llm_p_relevant': p,
            'llm_roles': '|'.join(r.get('roles') or []),
        }

    tmpl = os.path.join(NET, 'validation_3way_template.csv')
    with open(tmpl, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=cols); w.writeheader()
        for i, (k, iid, r) in enumerate(chosen, 1):
            d = row_for(i, k, iid, r); d.update(annotator1_relevant='', annotator2_relevant='', notes='')
            w.writerow(d)
    print(f'\n✅ {tmpl}  ({len(chosen)} pairs to code)')

    # DEMO with synthetic labels (annotator≈truth-ish around the article meaning)
    rng2 = random.Random(SEED + 7)
    demo = os.path.join(NET, 'validation_3way_DEMO.csv')
    with open(demo, 'w', newline='', encoding='utf-8') as f:
        w = csv.DictWriter(f, fieldnames=cols); w.writeheader()
        for i, (k, iid, r) in enumerate(chosen, 1):
            d = row_for(i, k, iid, r)
            base = 1 if r['relevant'] else 0           # demo annotator leans toward LLM with noise
            a1 = base if rng2.random() > 0.15 else 1 - base
            a2 = base if rng2.random() > 0.20 else 1 - base
            d.update(annotator1_relevant=a1, annotator2_relevant=a2,
                     notes='SYNTHETIC DEMO LABEL — not real')
            w.writerow(d)
    print(f'✅ {demo}  (synthetic labels for pipeline demo)')
    print('\nNext: code annotator1/annotator2 in the template, save as '
          'validation_3way_coded.csv, then run:  python validate_3way.py')


if __name__ == '__main__':
    main()
