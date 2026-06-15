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
  python llm_judge.py                 # zero-shot → llm_edge_confidence.json
  python llm_judge.py 3               # quick test on first 3 incidents
  python llm_judge.py --fewshot       # few-shot (held-out human exemplars)
                                      #   → llm_edge_confidence_fewshot.json
  python llm_judge.py --fewshot --out X.json --limit 3
"""
import os, re, csv, json, sys, time, subprocess, glob
import builder

KEY_PATH = os.path.join(os.path.dirname(__file__), '..', '..', '.gemini_key')
SCORES   = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network', 'incident_reg_scores.csv')
INC_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'incidents', 'indonesia_incidents.json')
OUT_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network', 'llm_edge_confidence.json')
FEWSHOT_PATH = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network', 'fewshot_examples.json')
MODEL    = 'gemini-2.5-flash'
TOP_K    = 12          # candidate regulations per incident (by cosine)

# Recall-complete candidate augmentation. Cosine is a poor RETRIEVER for
# cross-vocabulary legal matching (validated: F1 0.28; the right statute is often
# buried — e.g. UU PDP Ps.35 ranked ~150th for some breaches), so the top-K cosine
# shortlist alone makes the LLM judge miss obviously-applicable law. We therefore
# ALWAYS add these core Indonesian statutory bases for cyber/data/AI incidents to
# every candidate set (union with top-K cosine) and let the precise judge decide.
# IDs must match data/network legal_graph node ids (verified present).
WHITELIST = {
    # UU PDP 27/2022 — data-protection duties & offences
    'IDN_UU_PDP_No27_2022_Pasal_20',  # basis pemrosesan yang sah
    'IDN_UU_PDP_No27_2022_Pasal_35',  # kewajiban keamanan data
    'IDN_UU_PDP_No27_2022_Pasal_36',  # mencegah akses tidak sah
    'IDN_UU_PDP_No27_2022_Pasal_46',  # notifikasi kegagalan pelindungan (3x24 jam)
    'IDN_UU_PDP_No27_2022_Pasal_57',  # sanksi administratif
    'IDN_UU_PDP_No27_2022_Pasal_65',  # larangan perolehan/pengungkapan/penggunaan melawan hukum
    'IDN_UU_PDP_No27_2022_Pasal_66',  # larangan membuat data pribadi palsu
    'IDN_UU_PDP_No27_2022_Pasal_67',  # pidana: perolehan melawan hukum
    'IDN_UU_PDP_No27_2022_Pasal_68',  # pidana: pengungkapan melawan hukum
    # UU ITE — penggunaan data & delik siber yang tersedia di korpus
    'IDN_UU_ITE_No19_2016_Pasal_26',  # penggunaan data pribadi atas persetujuan; hak gugat
    'IDN_UU_ITE_No1_2024_Pasal_27',   # kesusilaan/konten
    'IDN_UU_ITE_No1_2024_Pasal_28',   # informasi bohong/SARA
    'IDN_UU_ITE_No1_2024_Pasal_45A',  # pidana informasi bohong
    'IDN_UU_ITE_No1_2024_Pasal_45B',  # pidana ancaman/pemerasan
    # PP PSTE 71/2019 — kewajiban keamanan PSE
    'IDN_PP_PSTE_No71_2019_Pasal_14',  # penyelenggaraan sistem elektronik yang andal & aman
}


def build_fewshot_block():
    """Return (text_block, holdout_keys) from fewshot_examples.json, or ('', set())."""
    if not os.path.exists(FEWSHOT_PATH):
        return '', set()
    d = json.load(open(FEWSHOT_PATH, encoding='utf-8'))
    holdout = {(k[0], k[1]) for k in d.get('holdout_keys', [])}
    lines = ['HUMAN-ADJUDICATED EXAMPLES (use these to calibrate; note the NOT-relevant '
             'patterns — definitional articles, data-subject procedural rights not triggered '
             'by an external breach, wrong-delict ITE articles, and aspirational strategy '
             'documents are NOT warrants even if topically similar):']
    for i, e in enumerate(d['examples'], 1):
        verdict = (f'relevant=true, roles={e["roles"]}' if e['relevant'] else 'relevant=false, roles=[]')
        lines.append(f'EX{i}. INCIDENT: {e["incident_summary"][:300]}\n'
                     f'   PROVISION: [{e["regulation_label"]}] {e["regulation_text"][:200]}\n'
                     f'   CORRECT: {verdict} — {e["rationale"][:140]}')
    return '\n'.join(lines) + '\n\n', holdout


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
    argv = sys.argv[1:]
    fewshot = '--fewshot' in argv
    out_path = OUT_PATH
    limit = None
    if '--out' in argv:
        out_path = argv[argv.index('--out') + 1]
    if '--limit' in argv:
        limit = int(argv[argv.index('--limit') + 1])
    for a in argv:                         # bare positional int still means limit
        if a.isdigit():
            limit = int(a)
    if fewshot and out_path == OUT_PATH:
        out_path = OUT_PATH.replace('.json', '_fewshot.json')

    fewshot_block, holdout = ('', set())
    if fewshot:
        fewshot_block, holdout = build_fewshot_block()
        print(f'few-shot ON: {len(holdout)} held-out exemplar pairs; out → {os.path.basename(out_path)}')

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
        top = cand[iid][:TOP_K]
        seen = {r['regulation_id'] for r in top}
        # recall-complete: append core statutes the cosine shortlist missed
        wl = [r for r in cand[iid] if r['regulation_id'] in WHITELIST and r['regulation_id'] not in seen]
        cand[iid] = top + wl

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
            'You are an Indonesian legal expert analysing a cyber/AI incident. For EACH candidate '
            'provision decide if it is a relevant legal basis (warrant) and, IF SO, which legal '
            'subject(s) it BINDS.\n\n'
            'STRICT role rules — assign a subject ONLY when the provision imposes a DUTY on, or '
            'grants a RIGHT/REMEDY/POWER to, that subject. Do NOT tag a subject that is merely '
            'mentioned, notified, or indirectly benefited.\n'
            '- pelaku = imposes CRIMINAL or civil LIABILITY on the wrongdoer.\n'
            '- pse = imposes a DUTY on the operator/controller (security, breach-notification, compliance).\n'
            '- konsumen = grants the consumer/victim a RIGHT, PROTECTION or REDRESS (compensation, '
            'erasure, right to sue). NOTE: merely BEING NOTIFIED is NOT redress → do NOT tag konsumen.\n'
            '- regulator = establishes the state\'s SUPERVISION / ENFORCEMENT power. NOTE: merely '
            'RECEIVING a breach report is NOT supervision → do NOT tag regulator.\n'
            'Assign the FEWEST roles that are genuinely bound — usually exactly ONE. A breach-'
            'notification article (e.g. UU PDP Pasal 46) binds ONLY pse. Never tag all subjects on one article.\n\n'
            + fewshot_block +
            f'INCIDENT ({inc.get("year")}, {inc.get("type")}): {inc.get("peristiwa_hukum_kronologi","")}\n\n'
            f'CANDIDATE PROVISIONS:\n{clist}\n\n'
            'Return ONLY a JSON array, one object per candidate index: '
            '[{"i":0,"relevant":true,"roles":["pse"],"confidence":0-100,"reason":"<=12 words"}]. '
            'roles is the MINIMAL subset of ["pelaku","pse","konsumen","regulator"] truly bound '
            '(empty if not relevant). confidence = how sure this provision applies to THIS incident.')
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

    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump({'model': MODEL, 'top_k': TOP_K, 'fewshot': bool(fewshot), 'incidents': out},
                  f, ensure_ascii=False, indent=2)
    total = sum(len(v) for v in out.values())
    rel = sum(1 for v in out.values() for r in v if r['relevant'])
    print(f'\n✅ {out_path}\n   {len(out)} incidents, {total} pairs scored, {rel} judged relevant')


if __name__ == '__main__':
    main()
