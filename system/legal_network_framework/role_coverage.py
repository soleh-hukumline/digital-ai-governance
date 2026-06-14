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


def main():
    d = json.load(open(LLM, encoding='utf-8'))
    inc = d['incidents']
    n = len(inc)
    have = defaultdict(set)        # role -> set of incidents with >=1 relevant warrant
    pairs = defaultdict(int)       # role -> count of relevant (incident,reg) bindings
    any_role = set()
    for iid, rows in inc.items():
        for r in rows:
            if not r.get('relevant'):
                continue
            rl = r.get('roles') or []
            if rl:
                any_role.add(iid)
            for role in rl:
                if role in ROLES:
                    have[role].add(iid); pairs[role] += 1

    out = {'n_incidents': n, 'per_role': {}, 'any_role_coverage': round(100 * len(any_role) / max(n, 1), 1)}
    print(f"PER-SUBJECT COVERAGE (n={n} incidents)")
    print(f"{'subject':10s} {'incidents w/ warrant':>20s} {'coverage':>9s} {'rel. pairs':>11s}")
    for role in ROLES:
        c = len(have[role]); cov = 100 * c / max(n, 1)
        out['per_role'][role] = {'incidents_covered': c, 'coverage_pct': round(cov, 1), 'relevant_pairs': pairs[role]}
        print(f"{role:10s} {c:>20d} {cov:>8.1f}% {pairs[role]:>11d}")
    print(f"\nany-subject coverage: {len(any_role)}/{n} = {out['any_role_coverage']}%")
    # vacuum per role
    print("\nstructural holes (no warrant) per subject:")
    for role in ROLES:
        print(f"  {role:10s}: {n - len(have[role])}/{n} = {100*(n-len(have[role]))/n:.1f}%")

    with open(os.path.join(NET, 'role_coverage.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print(f"\n✅ wrote role_coverage.json")


if __name__ == '__main__':
    main()
