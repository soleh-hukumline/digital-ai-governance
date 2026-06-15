"""
flag_review_candidates.py — surface LIKELY-WRONG warrants for human review
==========================================================================
The LLM judge's role assignment is not human-validated. This flags warrants whose
assigned legal subject contradicts what the provision can plausibly bind, so the
reviewer can fix the suspicious ones first instead of reading all 300+.

Heuristic (legal-character of each provision → expected subject):
  - criminal/offence articles  -> pelaku        (UU PDP 65-68; UU ITE penal arts)
  - operator/security/notify   -> pse           (UU PDP 20/35/36/46; PP PSTE 14)
  - sanction/supervision       -> regulator     (UU PDP 57/60)
  - data-subject right/redress -> konsumen      (UU PDP 12; rights arts)
  - consent + right to sue     -> pse | konsumen (UU ITE 26)
  - definitional / soft law / aspirational -> SHOULD NOT be a binding warrant
A warrant is flagged when its assigned role(s) fall outside the expected set
(or when a definitional/soft-law node is asserted as a binding warrant).
Human overrides (warrant_overrides.json) are treated as resolved and excluded.

Output: data/network/review_candidates.json (+ console). Honors overrides.
Run:    python flag_review_candidates.py
"""
import os, json, re
from warrant_review import apply_overrides

NET = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network')
LLM = os.path.join(NET, 'llm_edge_confidence.json')
OUT = os.path.join(NET, 'review_candidates.json')

# exact-label expectations (regulation_label -> allowed roles)
EXPECT = {
    'UU_PDP_No27_2022 - Pasal 65': {'pelaku'}, 'UU_PDP_No27_2022 - Pasal 66': {'pelaku'},
    'UU_PDP_No27_2022 - Pasal 67': {'pelaku'}, 'UU_PDP_No27_2022 - Pasal 68': {'pelaku'},
    'UU_PDP_No27_2022 - Pasal 20': {'pse'}, 'UU_PDP_No27_2022 - Pasal 35': {'pse'},
    'UU_PDP_No27_2022 - Pasal 36': {'pse'}, 'UU_PDP_No27_2022 - Pasal 46': {'pse'},
    'PP_PSTE_No71_2019 - Pasal 14': {'pse'},
    'UU_PDP_No27_2022 - Pasal 57': {'regulator'}, 'UU_PDP_No27_2022 - Pasal 60': {'regulator'},
    'UU_PDP_No27_2022 - Pasal 12': {'konsumen'},
    'UU_ITE_No19_2016 - Pasal 26': {'pse', 'konsumen'},
    'UU_ITE_No1_2024 - Pasal 27': {'pelaku'}, 'UU_ITE_No1_2024 - Pasal 28': {'pelaku'},
    'UU_ITE_No1_2024 - Pasal 45A': {'pelaku'}, 'UU_ITE_No1_2024 - Pasal 45B': {'pelaku'},
}
# definitional articles & soft-law/aspirational instruments: should not be a binding warrant
DEFINITIONAL = {'UU_PDP_No27_2022 - Pasal 1O', 'UU_PDP_No27_2022 - Pasal 4'}
SOFTLAW = re.compile(r'Stranas|SE_Komdigi|OECD|UNESCO|ASEAN|UNGA|ISO|WHO|G7|Global_Digital', re.I)
# data-subject rights articles (consent/withdraw/access/correct/erase) -> konsumen
RIGHTS = {f'UU_PDP_No27_2022 - Pasal {n}' for n in ('5', '6', '6O', '7O', '8', '9', '13', '33')}


def expected_roles(label):
    if label in EXPECT:
        return EXPECT[label]
    if label in RIGHTS:
        return {'konsumen'}
    if label in DEFINITIONAL or SOFTLAW.search(label):
        return set()        # empty = should not be a binding warrant
    return None             # unknown -> no opinion, don't flag


def main():
    llm = json.load(open(LLM, encoding='utf-8'))['incidents']
    llm, _ = apply_overrides(llm)
    flags = []
    for iid, rows in llm.items():
        for r in rows:
            if not r.get('relevant') or r.get('reviewed'):
                continue                     # skip non-warrants & human-confirmed
            label = r['regulation_label']
            exp = expected_roles(label)
            if exp is None:
                continue
            roles = set(r.get('roles') or [])
            if not exp:                      # definitional / soft law
                flags.append({'incident': iid, 'regulation': label, 'roles': sorted(roles),
                              'confidence': r.get('confidence'), 'severity': 'high',
                              'why': 'definitional/soft-law asserted as a binding warrant'})
            else:
                wrong = roles - exp
                if wrong:
                    flags.append({'incident': iid, 'regulation': label, 'roles': sorted(roles),
                                  'confidence': r.get('confidence'),
                                  'severity': 'high' if roles.isdisjoint(exp) else 'medium',
                                  'why': f"role {sorted(wrong)} unexpected; expected {sorted(exp)}"})
    flags.sort(key=lambda f: (f['severity'] != 'high', -(f.get('confidence') or 0)))
    json.dump({'n': len(flags), 'candidates': flags}, open(OUT, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f"✅ review_candidates.json: {len(flags)} kandidat error (excl. {sum(1 for rows in llm.values() for r in rows if r.get('reviewed'))} sudah ditinjau)")
    for f in flags[:12]:
        print(f"  [{f['severity']:6s}] {f['incident'][:26]:26s} {f['regulation'][:34]:34s} roles={f['roles']} :: {f['why']}")


if __name__ == '__main__':
    main()
