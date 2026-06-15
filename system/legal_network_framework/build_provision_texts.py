"""
build_provision_texts.py — full text of every extracted provision (for the UI)
==============================================================================
So the dashboard can show the ACTUAL article text when a node is clicked (e.g.
"UU_ITE_No1_2024 - Pasal 13A" → its full wording), letting readers audit the
analysis instead of trusting a centrality number. Keyed by node label
("<doc> - <title>") to match the graph node labels.

Output: data/network/provision_texts.json   { label: full_text }
Run:    python build_provision_texts.py
"""
import os, json, glob, re
import builder

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network', 'provision_texts.json')
OVERRIDES = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network', 'provision_texts_overrides.json')

# Strip PDF page-furniture that bleeds into the extracted text (headers/footers,
# legal-stamp codes, page markers). Character-level OCR garble in scanned source
# PDFs (e.g. "dimaksqd") cannot be fixed here and is left as-is.
def _clean(t):
    t = ' '.join(str(t).split())
    t = re.sub(r'SK\s*No\.?\s*[A-Za-z0-9]+', ' ', t)                 # "SK No l90l88A" stamps
    t = re.sub(r'PRESIDEN\s+\S+\s+INDONESIA', ' ', t, flags=re.I)    # "PRESIDEN REPUBLIK INDONESIA" header (+OCR variants)
    t = re.sub(r'(?<!\w)-\s*\d{1,3}\s*-(?!\w)', ' ', t)             # page markers "-16-"
    t = re.sub(r'(?<=[a-z])[\]\[\|](?=[a-z])', '', t)               # stray ] [ | inside words ("pen]rusunan")
    t = re.sub(r'(\s*\.){3,}', '.', t)                              # "..." / ". . ." runs
    t = re.sub(r'\blanjut\b\s*\d*\.?', ' ', t, flags=re.I)         # "lanjut 4." continuation noise
    t = re.sub(r'\bPenjelasan\s*\.?\s*$', '', t, flags=re.I)       # trailing "Penjelasan ..."
    t = re.sub(r'\s{2,}', ' ', t).strip()
    return t


def main():
    texts = {}
    pdfs = glob.glob(os.path.join(builder.REG_BASE, '**', '*.pdf'), recursive=True)
    for pdf in sorted(pdfs):
        doc = os.path.basename(pdf)[:-4]
        try:
            provs = builder.extract_provisions(pdf)
        except Exception as e:
            print(f'  ! {doc}: {e}')
            continue
        for title, txt in provs.items():
            clean = _clean(txt)
            if clean:
                texts[f'{doc} - {title}'] = clean[:4000]

    # MANUAL OVERRIDES win and are never regenerated (hand-edited; auto-clean can't
    # fix scanned-PDF OCR garble). Keys must match node labels exactly.
    n_over = 0
    if os.path.exists(OVERRIDES):
        ov = json.load(open(OVERRIDES, encoding='utf-8'))
        for k, v in ov.items():
            if k.startswith('_'):
                continue
            texts[k] = ' '.join(str(v).split())
            n_over += 1

    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(texts, f, ensure_ascii=False, indent=2)
    print(f'✅ provision_texts.json: {len(texts)} provisions ({n_over} manual overrides applied)')


if __name__ == '__main__':
    main()
