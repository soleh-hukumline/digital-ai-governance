"""
apply_citation_judgments.py — turn Gemini verdicts into ground-truth overrides
==============================================================================
Reads data/network/citation_judgments.json (from judge_citations.py) and:
  • DELETES noise with confidence >= THRESHOLD (default 90)  → overrides.deleted
  • FLAGS  noise with confidence <  THRESHOLD ("perlu tinjau") → a `review` field
    on the record (kept, not deleted) so a human can adjudicate the borderline calls.
Both are written to provision_citations_overrides.json (overrides win, survive
rebuilds), then build_provision_citations is re-run to regenerate the dataset.

Run:  python apply_citation_judgments.py            # threshold 90
      python apply_citation_judgments.py --threshold 85
      python apply_citation_judgments.py --dry-run   # show plan, write nothing
"""
import os, sys, json
from prov_cite_overrides import load_overrides, save_overrides
import build_provision_citations

NET = os.path.join(os.path.dirname(__file__), '..', '..', 'data', 'network')
JUDG = os.path.join(NET, 'citation_judgments.json')


def main():
    argv = sys.argv[1:]
    thresh = int(argv[argv.index('--threshold') + 1]) if '--threshold' in argv else 90
    dry = '--dry-run' in argv

    if not os.path.exists(JUDG):
        raise SystemExit('citation_judgments.json belum ada — jalankan judge_citations.py dulu.')
    J = json.load(open(JUDG, encoding='utf-8'))['judgments']

    ov = load_overrides()
    to_delete, to_flag = [], []
    for jid, v in J.items():
        if v.get('is_citation', True):
            continue                                   # real → leave as-is
        # PROTECT preamble (Menimbang/Mengingat) citations: a "dasar hukum" entry is a
        # legal-basis citation by definition, never noise — the judge can't see that.
        if v.get('source_prov') == 'Pembukaan':
            continue
        if v.get('confidence', 0) >= thresh:
            to_delete.append((jid, v))
        else:
            to_flag.append((jid, v))

    print(f"Ambang hapus = {thresh}%  |  hapus {len(to_delete)} noise tinggi, tandai {len(to_flag)} borderline\n")
    print("— AKAN DIHAPUS —")
    for jid, v in sorted(to_delete, key=lambda x: -x[1]['confidence']):
        print(f"  ❌ [{v['confidence']:>3}%] {v['source_doc'][:30]:30s} {v['source_prov']:>9s} → {v['cited_ref'][:28]:28s} ({v['context_type']})")
    print("\n— AKAN DITANDAI 'perlu tinjau' (tetap ada) —")
    for jid, v in sorted(to_flag, key=lambda x: -x[1]['confidence']):
        print(f"  ⚠️  [{v['confidence']:>3}%] {v['source_doc'][:30]:30s} {v['source_prov']:>9s} → {v['cited_ref'][:28]:28s} ({v['context_type']})")

    if dry:
        print("\n(dry-run — tidak menulis apa pun)")
        return

    for jid, v in to_delete:
        if jid not in ov['deleted']:
            ov['deleted'].append(jid)
        ov['edits'].pop(jid, None)                     # a deletion supersedes any flag
    for jid, v in to_flag:
        ov['edits'].setdefault(jid, {})['review'] = {
            'flag': 'noise_borderline', 'by': 'gemini', 'confidence': v['confidence'],
            'context_type': v['context_type'], 'reason': v['reason'],
        }
    save_overrides(ov)
    print(f"\n→ override disimpan. Regenerasi dataset…\n")
    build_provision_citations.main()


if __name__ == '__main__':
    main()
