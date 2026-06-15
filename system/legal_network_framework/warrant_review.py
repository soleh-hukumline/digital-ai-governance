"""
warrant_review.py — apply HUMAN warrant decisions over the LLM judge
====================================================================
Human-in-the-loop: data/network/warrant_overrides.json holds expert decisions
(keyed '<incident_id> | <regulation_label>') that WIN over the LLM. Imported by
role_coverage.py / sector_coverage.py / build_radial_incident.py so coverage and
the radial reflect human review, identical to the dashboard. Reproducible & in git.
"""
import os, json

OVR = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network', 'warrant_overrides.json')


def apply_overrides(incidents):
    """Mutate `incidents` (id -> [warrant rows]) with human overrides. Returns
    (incidents, n_applied). Reviewed rows get reviewed=True."""
    if not os.path.exists(OVR):
        return incidents, 0
    try:
        ov = json.load(open(OVR, encoding='utf-8'))
    except Exception:
        return incidents, 0
    n = 0
    for key, v in ov.items():
        if key.startswith('_') or not isinstance(v, dict):
            continue
        iid, _, label = key.partition(' | ')
        rows = incidents.get(iid)
        if rows is None:
            continue
        hit = next((r for r in rows if r.get('regulation_label') == label), None)
        if hit is None:                          # human added a warrant the LLM missed
            rows.append({
                'regulation_id': 'HUMAN_' + label.replace(' ', '_'),
                'regulation_label': label, 'cosine': 0,
                'relevant': bool(v.get('relevant', True)),
                'roles': list(v.get('roles', [])),
                'confidence': int(v.get('confidence', 100)),
                'reason': v.get('note', '[ditinjau manusia]'), 'reviewed': True,
            })
        else:
            if 'relevant' in v:
                hit['relevant'] = bool(v['relevant'])
            if 'roles' in v:
                hit['roles'] = list(v['roles'])
            hit['confidence'] = int(v.get('confidence', 100))
            if v.get('note'):
                hit['reason'] = v['note']
            hit['reviewed'] = True
        n += 1
    return incidents, n
