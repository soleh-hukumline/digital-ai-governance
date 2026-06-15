"""
make_fewshot.py — build a held-out few-shot exemplar set from the human gold
============================================================================
Picks a small, diverse, human-adjudicated set of incident↔provision pairs to
prime the LLM judge (few-shot). The exemplars are chosen to teach the model the
patterns it gets WRONG zero-shot (low precision / over-inclusion):
  POSITIVES  — security duty / unlawful disclosure / breach notification.
  NEGATIVES  — definitional articles; data-subject procedural rights not
               triggered by an external breach; wrong-delict ITE articles;
               aspirational strategy documents on non-AI incidents.

The chosen pairs are written to fewshot_examples.json with their (incident_id,
regulation_label) keys so the evaluation can EXCLUDE them (no train/test leak).
Rationales are the annotators' own `notes` — nothing is invented here.

Run:  python make_fewshot.py
"""
import os, json
import openpyxl

NET = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network')
GOLD = os.path.join(NET, 'validation_2_revisi.xlsx')
OUT = os.path.join(NET, 'fewshot_examples.json')

# (incident_id, regulation_label) of the chosen exemplars + the role(s) the
# annotator considered correct (for positives). Picked by hand from the gold for
# diversity across failure modes; see module docstring.
CHOSEN = [
    # --- positives (relevant warrants) ---
    ('cermati-data-breach-2020',         'UU_PDP_No27_2022 - Pasal 35'),  # security duty → pse
    ('bsi-lockbit-ransomware-2023',      'UU_PDP_No27_2022 - Pasal 67'),  # unlawful disclosure → pelaku
    ('inafis-polri-fingerprint-leak-2024','UU_PDP_No27_2022 - Pasal 46'), # breach notification → pse/regulator/konsumen
    # --- negatives (NOT a warrant, even if topically similar) ---
    ('mypertamina-44m-2022',             'UU_PDP_No27_2022 - Pasal 28'),  # processing-purpose duty not triggered by third-party theft
    ('bpjs-kesehatan-279m-2021',         'UU_PDP_No27_2022 - Pasal 9'),   # data-subject procedural right (consent withdrawal)
    ('kreditplus-data-leak-2020',        'UU_PDP_No27_2022 - Pasal 4'),   # definitional article
    ('bank-indonesia-conti-ransomware-2022','Stranas_AI_Indonesia_2020-2045_Full - Bagian 56'),  # aspirational strategy, non-AI incident
]


# STRICT primary-subject roles for the positive exemplars (duty/right-based). The
# gold's llm_roles came from the OLD lax judge (e.g. tagged Pasal 46 with 3 subjects),
# which is exactly the inflation we are fixing — so we set the exemplar roles by hand.
EXEMPLAR_ROLES = {
    ('cermati-data-breach-2020', 'UU_PDP_No27_2022 - Pasal 35'): ['pse'],       # security duty → operator
    ('bsi-lockbit-ransomware-2023', 'UU_PDP_No27_2022 - Pasal 67'): ['pelaku'],  # criminal liability → perpetrator
    ('inafis-polri-fingerprint-leak-2024', 'UU_PDP_No27_2022 - Pasal 46'): ['pse'],  # notification DUTY is on the operator only
}


def to01(v):
    s = str(v).strip().lower()
    return 1 if s in ('1', 'yes', 'y', 'true', 'relevant') else 0 if s in ('0', 'no', 'n', 'false', 'irrelevant') else None


def main():
    wb = openpyxl.load_workbook(GOLD, read_only=True, data_only=True)
    ws = wb.active
    rows = list(ws.iter_rows(values_only=True))
    head = [str(h).strip() for h in rows[0]]
    D = [{head[i]: (r[i] if i < len(r) else None) for i in range(len(head))} for r in rows[1:]]
    by_key = {(d['incident_id'], d['regulation_label']): d for d in D}

    examples = []
    for iid, label in CHOSEN:
        d = by_key.get((iid, label))
        if d is None:
            raise SystemExit(f'exemplar not found in gold: {iid} | {label}')
        g1, g2 = to01(d['annotator1_relevant']), to01(d['annotator2_relevant'])
        if g1 != g2:
            raise SystemExit(f'exemplar is a disagreement (excluded from gold): {iid} | {label}')
        examples.append({
            'incident_id': iid,
            'regulation_label': label,
            'incident_summary': ' '.join(str(d['incident_summary']).split()),
            'regulation_text': ' '.join(str(d['regulation_text']).split())[:240],
            'relevant': bool(g1),
            'roles': EXEMPLAR_ROLES.get((iid, label), [r for r in str(d['llm_roles']).split('|') if r]) if g1 else [],
            'rationale': ' '.join(str(d['notes']).split()),
        })

    npos = sum(1 for e in examples if e['relevant'])
    out = {
        'description': 'Human-adjudicated few-shot exemplars (held out from validation). '
                       'Rationales are the annotators\' own notes.',
        'n': len(examples), 'positives': npos, 'negatives': len(examples) - npos,
        'holdout_keys': [[e['incident_id'], e['regulation_label']] for e in examples],
        'examples': examples,
    }
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f'✅ {OUT}  ({len(examples)} exemplars: {npos} positive, {len(examples)-npos} negative)')
    for e in examples:
        print(f'  [{"REL" if e["relevant"] else "NOT"}] {e["incident_id"]} | {e["regulation_label"]}')


if __name__ == '__main__':
    main()
