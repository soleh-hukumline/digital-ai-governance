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
import os, json, glob
import builder

OUT = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network', 'provision_texts.json')


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
            clean = ' '.join(str(txt).split())
            if clean:
                texts[f'{doc} - {title}'] = clean[:4000]
    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(texts, f, ensure_ascii=False, indent=2)
    print(f'✅ provision_texts.json: {len(texts)} provisions with full text')


if __name__ == '__main__':
    main()
