"""
role_coverage.py — per-legal-subject coverage from the role-aware LLM judge
===========================================================================
Replaces the single (ambiguous) coverage metric. For each legal subject
(pelaku / pse / konsumen / regulator) reports how many incidents have >=1
LLM-judged-relevant warrant binding that subject, and the per-subject
confidence. Output: console table + data/network/role_coverage.json.

Run:  python role_coverage.py
"""
import os, json
from collections import defaultdict

NET = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network')
LLM = os.path.join(NET, 'llm_edge_confidence.json')
ROLES = ['pelaku', 'pse', 'konsumen', 'regulator']
# The production judge is now FEW-SHOT primed (human-adjudicated exemplars,
# eval_fewshot.py). Few-shot makes the model's RAW flag well-calibrated on
# held-out gold (P 0.83 / R 0.83 / F1 0.83) — better than the old zero-shot judge
# even after its aggressive P>=95 calibration (F1 0.59). So for few-shot the RAW
# operating point is the validated one; we still print a P>=95 column for
# transparency (it does not help few-shot and is shown only for comparison).
CALIB_P = 95


def _coverage(inc, calibrated):
    n = len(inc)
    have = defaultdict(set)
    pairs = defaultdict(int)
    any_role = set()
    for iid, rows in inc.items():
        for r in rows:
            if not r.get('relevant'):
                continue
            if calibrated and int(r.get('confidence', 0)) < CALIB_P:
                continue
            rl = [x for x in (r.get('roles') or []) if x in ROLES]
            if rl:
                any_role.add(iid)
            for role in rl:
                have[role].add(iid); pairs[role] += 1
    return n, have, pairs, any_role


def main():
    d = json.load(open(LLM, encoding='utf-8'))
    inc = d['incidents']
    out = {'n_incidents': len(inc), 'calibration': {'cutoff_P': CALIB_P, 'basis': 'human gold n=48, κ=0.77, F1-optimal'}}

    for mode, calibrated in (('raw (P>=50, LLM flag)', False), (f'calibrated (P>={CALIB_P})', True)):
        n, have, pairs, any_role = _coverage(inc, calibrated)
        key = 'calibrated' if calibrated else 'raw'
        out[key] = {'per_role': {}, 'any_role_coverage': round(100 * len(any_role) / max(n, 1), 1)}
        print(f"\n=== PER-SUBJECT COVERAGE — {mode} (n={n}) ===")
        print(f"{'subject':10s} {'covered':>9s} {'coverage':>9s} {'hole':>8s} {'pairs':>7s}")
        for role in ROLES:
            c = len(have[role]); cov = 100 * c / max(n, 1)
            out[key]['per_role'][role] = {'incidents_covered': c, 'coverage_pct': round(cov, 1),
                                          'structural_hole_pct': round(100 - cov, 1), 'relevant_pairs': pairs[role]}
            print(f"{role:10s} {c:>6d}/{n:<2d} {cov:>7.1f}% {100-cov:>7.1f}% {pairs[role]:>7d}")
        print(f"any-subject: {len(any_role)}/{n} = {out[key]['any_role_coverage']}%")

    with open(os.path.join(NET, 'role_coverage.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"\n✅ wrote role_coverage.json (raw + calibrated)")


if __name__ == '__main__':
    main()
