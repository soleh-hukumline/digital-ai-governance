"""
llm_judge.py — explicit relationship-confidence via Gemini (LLM-as-judge)
========================================================================
Why: cosine similarity gives mostly "weak-tier" edges and (per triangulation)
has low recall against doctrinal legal coding. This step makes the confidence of
each incident↔regulation relationship EXPLICIT: Gemini reads the incident facts
and the actual article text and returns, per pair, whether the provision is a
relevant legal basis (warrant) + a confidence 0-100% + a one-line reason.

Security: the API key is read from ../../.gemini_key (gitignored). NEVER hardcode
or commit the key. Network egress uses `curl` (sandbox/SSL-safe).

Output: data/network/llm_edge_confidence.json
  { incident_id: [ {regulation_id, regulation_label, cosine, relevant, confidence, reason}... ] }

Run (sandbox must be disabled for network egress):
  python llm_judge.py            # all incidents, top-K candidates each
  python llm_judge.py 3          # quick test on first 3 incidents
"""
import os, re, csv, json, sys, time, subprocess, glob
import builder

KEY_PATH = os.path.join(os.path.dirname(__file__), '..', '..', '.gemini_key')
SCORES   = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network', 'incident_reg_scores.csv')
INC_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'incidents', 'indonesia_incidents.json')
OUT_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network', 'llm_edge_confidence.json')
MODEL    = 'gemini-2.5-flash'
TOP_K    = 12          # candidate regulations per incident (by cosine)


def gemini(prompt, key, retries=5):
    url = f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL}:generateContent?key={key}'
    payload = json.dumps({
        'contents': [{'parts': [{'text': prompt}]}],
        # thinkingBudget=0 stops 2.5 models from spending the token budget on
        # internal reasoning (which truncated the JSON output).
        'generationConfig': {'temperature': 0, 'maxOutputTokens': 4096,
                             'thinkingConfig': {'thinkingBudget': 0}}
    })
    for attempt in range(retries):
        try:
            p = subprocess.run(['curl', '-s', '-X', 'POST', url,
                                '-H', 'Content-Type: application/json', '-d', payload],
                               capture_output=True, text=True, timeout=120)
            d = json.loads(p.stdout)
            if 'candidates' in d:
                return d['candidates'][0]['content']['parts'][0]['text']
            code = d.get('error', {}).get('code')
            if code in (429, 500, 503):       # transient → backoff
                time.sleep(2 * (attempt + 1)); continue
            return f'__ERROR__ {d.get("error", {}).get("message", "?")[:120]}'
        except Exception as e:
            time.sleep(2 * (attempt + 1))
    return '__ERROR__ exhausted retries'


def parse_json(text):
    m = re.search(r'```(?:json)?\s*(.*?)```', text, re.S)
    raw = m.group(1) if m else text
    m2 = re.search(r'\[.*\]', raw, re.S)
    try:
        return json.loads(m2.group(0) if m2 else raw)
    except Exception:
        return None


def main():
    limit = int(sys.argv[1]) if len(sys.argv) > 1 else None
    key = open(KEY_PATH).read().strip()

    # provision text map: "label" -> text
    label_text = {}
    for pdf in glob.glob(os.path.join(builder.REG_BASE, '**', '*.pdf'), recursive=True):
        doc = os.path.basename(pdf)[:-4]
        for title, txt in builder.extract_provisions(pdf).items():
            label_text[f'{doc} - {title}'] = txt

    incidents = {i['id']: i for i in json.load(open(INC_PATH, encoding='utf-8'))['incidents']}

    # candidate pairs per incident (top-K by cosine)
    cand = {}
    with open(SCORES, encoding='utf-8') as f:
        for r in csv.DictReader(f):
            iid = r['incident_id'].replace('CASE_', '')
            cand.setdefault(iid, []).append(r)
    for iid in cand:
        cand[iid].sort(key=lambda r: -float(r['cosine']))
        cand[iid] = cand[iid][:TOP_K]

    ids = list(incidents.keys())
    if limit:
        ids = ids[:limit]

    out = {}
    for n, iid in enumerate(ids, 1):
        inc = incidents[iid]
        cands = cand.get('CASE_' + iid) or cand.get(iid) or []
        if not cands:
            out[iid] = []
            print(f'[{n}/{len(ids)}] {iid}: no candidates'); continue
        clist = '\n'.join(
            f'{j}. [{c["regulation_label"]}] {label_text.get(c["regulation_label"], "(text n/a)")[:280]}'
            for j, c in enumerate(cands))
        prompt = (
            'You are an Indonesian legal expert analysing a cyber/AI incident. A single incident '
            'involves MULTIPLE legal subjects, each governed by different provisions:\n'
            '- pelaku = the perpetrator (criminal liability)\n'
            '- pse = the operator/platform/data controller (administrative/security/civil duties)\n'
            '- konsumen = the consumer/victim/data subject (protection & redress)\n'
            '- regulator = the state/regulator (supervision & enforcement)\n\n'
            'For EACH candidate provision decide if it is a relevant legal basis (warrant) and, '
            'IF SO, which subject(s) it binds.\n\n'
            f'INCIDENT ({inc.get("year")}, {inc.get("type")}): {inc.get("peristiwa_hukum_kronologi","")}\n\n'
            f'CANDIDATE PROVISIONS:\n{clist}\n\n'
            'Return ONLY a JSON array, one object per candidate index: '
            '[{"i":0,"relevant":true,"roles":["pse"],"confidence":0-100,"reason":"<=12 words"}]. '
            'roles is a subset of ["pelaku","pse","konsumen","regulator"] (empty if not relevant). '
            'confidence = how sure this provision applies to THIS incident.')
        resp = gemini(prompt, key)
        arr = parse_json(resp)
        rows = []
        VALID_ROLES = {'pelaku', 'pse', 'konsumen', 'regulator'}
        if arr:
            byi = {int(o.get('i', -1)): o for o in arr if isinstance(o, dict)}
            for j, c in enumerate(cands):
                o = byi.get(j, {})
                roles = [str(x).lower() for x in (o.get('roles') or []) if str(x).lower() in VALID_ROLES]
                rows.append({
                    'regulation_id': c['regulation_id'],
                    'regulation_label': c['regulation_label'],
                    'cosine': round(float(c['cosine']), 4),
                    'relevant': bool(o.get('relevant', False)),
                    'roles': roles,
                    'confidence': int(o.get('confidence', 0)),
                    'reason': str(o.get('reason', ''))[:120],
                })
        else:
            print(f'  ! parse failed for {iid}: {resp[:80]}')
        out[iid] = rows
        nrel = sum(1 for r in rows if r['relevant'])
        print(f'[{n}/{len(ids)}] {iid}: {len(rows)} scored, {nrel} relevant')
        time.sleep(0.5)

    with open(OUT_PATH, 'w', encoding='utf-8') as f:
        json.dump({'model': MODEL, 'top_k': TOP_K, 'incidents': out}, f, ensure_ascii=False, indent=2)
    total = sum(len(v) for v in out.values())
    rel = sum(1 for v in out.values() for r in v if r['relevant'])
    print(f'\n✅ {OUT_PATH}\n   {len(out)} incidents, {total} pairs scored, {rel} judged relevant')


if __name__ == '__main__':
    main()
