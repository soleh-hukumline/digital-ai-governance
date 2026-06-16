"""
serve.py — local dashboard server WITH in-place editing of the pasal-level
citation ground truth (no build/export step needed).

Static hosting (python -m http.server / Google Drive) can only READ files. Run
this instead to EDIT and auto-save citation corrections straight to disk:

    cd system/legal_network_framework && python3 serve.py 8080
    → open http://localhost:8080/

It serves the dashboard (the DIGITAL AI GOVERNANCE folder) and exposes a tiny
JSON API the dashboard calls when you edit a citation:

    POST /api/cite   { "op": "edit|text|delete|add", ... }

Every save updates BOTH:
  • data/network/provision_citations.json            (live — dashboard reads this)
  • data/network/provision_citations_overrides.json  (so re-running
    build_provision_citations.py keeps your edits; overrides always win)

No external dependencies (stdlib only).
"""
import os, sys, json, re, functools
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from prov_cite_overrides import (record_id, load_overrides, save_overrides, NET, KIND_VALUES)

APP_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
PC_JSON = os.path.join(NET, 'provision_citations.json')
EDITABLE_FIELDS = ('cited_ref', 'kind', 'cited_doc', 'cited_prov', 'cited_in_corpus')


def _provnum(prov):
    m = re.search(r'(\d+)', prov or '')
    return int(m.group(1)) if m else 9999


def _load_live():
    return json.load(open(PC_JSON, encoding='utf-8'))


def _recompute_and_save(payload):
    recs = payload['records']
    recs.sort(key=lambda r: (r.get('source_doc', ''), _provnum(r.get('source_prov', '')), r.get('kind', '')))
    by_kind = {}
    for r in recs:
        by_kind[r['kind']] = by_kind.get(r['kind'], 0) + 1
    payload['n_records'] = len(recs)
    payload['by_kind'] = by_kind
    payload['n_source_provisions'] = len({r['source_label'] for r in recs})
    payload['n_manual'] = sum(1 for r in recs if r.get('manual'))
    payload['n_edited'] = sum(1 for r in recs if r.get('edited'))
    json.dump(payload, open(PC_JSON, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)


def apply_op(body):
    """Apply one edit op to the live json + overrides file. Returns a result dict."""
    op = body.get('op')
    payload = _load_live()
    ov = load_overrides()
    recs = payload['records']

    if op == 'edit':
        rid = body['id']
        fields = {k: v for k, v in (body.get('fields') or {}).items() if k in EDITABLE_FIELDS}
        if fields.get('kind') and fields['kind'] not in KIND_VALUES:
            return {'ok': False, 'error': f"kind tidak valid: {fields['kind']}"}
        hit = 0
        for r in recs:
            if r.get('id') == rid:
                r.update(fields); r['edited'] = True; hit += 1
        if not hit:
            return {'ok': False, 'error': 'id tidak ditemukan'}
        ov['edits'].setdefault(rid, {}).update(fields)

    elif op == 'text':
        lbl = body['source_label']; txt = body.get('source_text', '')
        hit = 0
        for r in recs:
            if r.get('source_label') == lbl:
                r['source_text'] = txt; r['edited'] = True; hit += 1
        ov['text'][lbl] = txt
        if not hit:
            return {'ok': False, 'error': 'source_label tidak ditemukan'}

    elif op == 'delete':
        rid = body['id']
        before = len(recs)
        payload['records'] = [r for r in recs if r.get('id') != rid]
        if len(payload['records']) == before:
            return {'ok': False, 'error': 'id tidak ditemukan'}
        was_manual = any(a.get('id') == rid for a in ov['added'])
        ov['added'] = [a for a in ov['added'] if a.get('id') != rid]
        ov['edits'].pop(rid, None)
        if not was_manual and rid not in ov['deleted']:   # only suppress auto records
            ov['deleted'].append(rid)

    elif op == 'add':
        rec = dict(body.get('record') or {})
        for req in ('source_doc', 'source_prov', 'kind', 'cited_ref'):
            if not rec.get(req):
                return {'ok': False, 'error': f'field wajib kosong: {req}'}
        if rec['kind'] not in KIND_VALUES:
            return {'ok': False, 'error': f"kind tidak valid: {rec['kind']}"}
        rec['source_label'] = f"{rec['source_doc']} - {rec['source_prov']}"
        rec.setdefault('cited_norm', rec['cited_ref'])
        rec.setdefault('cited_doc', None)
        rec.setdefault('cited_prov', None)
        rec.setdefault('cited_in_corpus', False)
        rec.setdefault('count', 1)
        rec.setdefault('note', None)
        rec.setdefault('source_text', '')
        rec['manual'] = True
        rec['id'] = record_id(rec)
        if rec['source_label'] in ov['text']:
            rec['source_text'] = ov['text'][rec['source_label']]
        payload['records'].append(rec)
        # store in overrides (replace any existing add with same id)
        ov['added'] = [a for a in ov['added'] if a.get('id') != rec['id']] + [rec]
        body = {'op': op, 'record': rec}

    else:
        return {'ok': False, 'error': f'op tidak dikenal: {op}'}

    _recompute_and_save(payload)
    save_overrides(ov)
    return {'ok': True, 'op': op, 'n_records': payload['n_records'],
            'n_manual': payload['n_manual'], 'n_edited': payload['n_edited'],
            'record': body.get('record')}


class Handler(SimpleHTTPRequestHandler):
    def _json(self, obj, code=200):
        data = json.dumps(obj, ensure_ascii=False).encode('utf-8')
        self.send_response(code)
        self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)

    def do_GET(self):
        if self.path.rstrip('/') == '/api/health':
            return self._json({'ok': True, 'editor': True})
        return super().do_GET()

    def do_POST(self):
        if self.path.rstrip('/') != '/api/cite':
            return self._json({'ok': False, 'error': 'endpoint tidak dikenal'}, 404)
        try:
            n = int(self.headers.get('Content-Length', 0))
            body = json.loads(self.rfile.read(n) or b'{}')
            res = apply_op(body)
            return self._json(res, 200 if res.get('ok') else 400)
        except Exception as e:
            return self._json({'ok': False, 'error': str(e)}, 500)

    def end_headers(self):
        # let the editor work even if opened from a different origin/port
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()

    def log_message(self, fmt, *args):
        if '/api/' in (args[0] if args else ''):
            sys.stderr.write("  %s\n" % (fmt % args))


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
    handler = functools.partial(Handler, directory=APP_ROOT)
    httpd = ThreadingHTTPServer(('127.0.0.1', port), handler)
    print(f"✅ Dashboard + editor sitiran aktif:  http://localhost:{port}/")
    print(f"   root statis : {APP_ROOT}")
    print(f"   simpan ke   : {PC_JSON}")
    print(f"                 {os.path.join(NET, 'provision_citations_overrides.json')}")
    print("   Ctrl+C untuk berhenti.")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n↩ server berhenti.")


if __name__ == '__main__':
    main()
