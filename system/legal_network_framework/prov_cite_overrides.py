"""
prov_cite_overrides.py — human-in-the-loop overrides for the pasal-level citation
ground truth (data/network/provision_citations.json).

Edits made in the dashboard are saved (by serve.py) to
data/network/provision_citations_overrides.json. They WIN over the auto-extracted
records and are never regenerated, so re-running build_provision_citations.py keeps
the corrections. Shared by build_provision_citations.py (merge on rebuild) and
serve.py (apply on save) so the two never diverge.

Override schema:
{
  "_README": "...",
  "text":    { "<source_label>": "corrected full pasal text" },   # applies to every record of that pasal
  "edits":   { "<id>": { "cited_ref": "...", "kind": "...", "cited_doc": "...", "cited_prov": "..." } },
  "deleted": [ "<id>", ... ],
  "added":   [ { full record incl. id, "manual": true }, ... ]
}
id = "<source_label> :: <cited_norm>"  (stable; not affected by editing kind/text)
"""
import os, json

NET = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network')
OVERRIDES = os.path.join(NET, 'provision_citations_overrides.json')

_README = ('Koreksi manusia (human-in-the-loop) untuk ground truth sitiran antar-pasal. '
           'Disimpan otomatis oleh serve.py saat Anda mengedit di dashboard. Override MENANG '
           'dan tidak pernah ditimpa build_provision_citations.py. id = "<source_label> :: <cited_norm>".')

KIND_VALUES = ('pasal_internal', 'pasal_external', 'regulation', 'named')


def record_id(r):
    return f"{r.get('source_label', '')} :: {r.get('cited_norm', '')}"


def empty_overrides():
    return {'_README': _README, 'text': {}, 'edits': {}, 'deleted': [], 'added': []}


def load_overrides():
    if os.path.exists(OVERRIDES):
        try:
            ov = json.load(open(OVERRIDES, encoding='utf-8'))
            for k in ('text', 'edits'):
                ov.setdefault(k, {})
            for k in ('deleted', 'added'):
                ov.setdefault(k, [])
            ov.setdefault('_README', _README)
            return ov
        except Exception:
            pass
    return empty_overrides()


def save_overrides(ov):
    ov['_README'] = _README
    json.dump(ov, open(OVERRIDES, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)


def apply_overrides(records, ov):
    """Return a NEW list = auto records with overrides applied (text edits, field
    edits, deletions) plus manually-added records. Each record gets a stable 'id'."""
    text = ov.get('text', {})
    edits = ov.get('edits', {})
    deleted = set(ov.get('deleted', []))
    added = ov.get('added', [])
    out = []
    for r0 in records:
        r = dict(r0)
        r['id'] = r.get('id') or record_id(r)
        if r['id'] in deleted:
            continue
        if r.get('source_label') in text:
            r['source_text'] = text[r['source_label']]
        if r['id'] in edits:
            for k, v in edits[r['id']].items():
                r[k] = v
            r['edited'] = True
        out.append(r)
    for a0 in added:
        a = dict(a0)
        a['manual'] = True
        a['id'] = a.get('id') or record_id(a)
        if a['id'] in deleted:
            continue
        if a.get('source_label') in text:
            a['source_text'] = text[a['source_label']]
        out.append(a)
    return out
