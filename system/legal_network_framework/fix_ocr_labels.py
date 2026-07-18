#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fix_ocr_labels.py — migrasi satu-kali: perbaiki label pasal korup hasil OCR
di seluruh artefak data/network.

Temuan audit 2026-07-18 (lihat AUDIT_FIXES_TRACKER.md + lint_legal_citations.py):
  * "UU_PDP - Pasal 7O"  : huruf O, padahal ini batang tubuh Pasal 70 asli
    (pidana korporasi) — kunci "Pasal 70" yang benar belum ada.  → Pasal 70
  * "UU_PDP - Pasal 1O"  : bukan batang tubuh; ini PENJELASAN Pasal 10
    (definisi pemrofilan). Batang tubuh "Pasal 10" sudah ada sendiri.
    → dilabeli jujur sebagai "Penjelasan Pasal 10"
  * "UU_PDP - Pasal 6O"  : idem, PENJELASAN Pasal 60. → "Penjelasan Pasal 60"
  * "UU_ITE_No1_2024 - Pasal 278": UU ITE hanya sampai Pasal 54; teksnya adalah
    Pasal 27B (pemerasan/pengancaman) dengan huruf B ter-OCR jadi 8. → Pasal 27B
  * "UU_ITE_No1_2024 - Pasal 168": idem, Pasal 16B (sanksi administratif atas
    Pasal 16A). → Pasal 16B

Rename dilakukan HANYA sebagai penggantian string berprefiks dokumen (tidak
menyentuh angka pasal dokumen lain), pada semua .json/.csv/.md di data/network.
Struktur graph tidak berubah — murni koreksi identitas label/ID.

Catatan: normalisasi permanen juga ditambahkan di builder.py (_split_provisions)
agar regenerasi dari PDF tidak menghidupkan kembali label korup. File .xlsx
(arsip anotasi manusia) sengaja tidak disentuh.

Pakai:  python3 system/legal_network_framework/fix_ocr_labels.py [--dry-run]
"""

import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
DATA_DIR = os.path.join(ROOT, "data", "network")

# Urutan penting: string terpanjang lebih dulu; semua berprefiks dokumen.
RENAMES = [
    # UU PDP — huruf O pada posisi angka nol
    ("UU_PDP_No27_2022 - Pasal 1O", "UU_PDP_No27_2022 - Penjelasan Pasal 10"),
    ("UU_PDP_No27_2022_Pasal_1O",   "UU_PDP_No27_2022_Penjelasan_Pasal_10"),
    ("UU_PDP_No27_2022 - Pasal 6O", "UU_PDP_No27_2022 - Penjelasan Pasal 60"),
    ("UU_PDP_No27_2022_Pasal_6O",   "UU_PDP_No27_2022_Penjelasan_Pasal_60"),
    ("UU_PDP_No27_2022 - Pasal 7O", "UU_PDP_No27_2022 - Pasal 70"),
    ("UU_PDP_No27_2022_Pasal_7O",   "UU_PDP_No27_2022_Pasal_70"),
    # UU ITE 1/2024 — huruf B ter-OCR jadi angka 8
    ("UU_ITE_No1_2024 - Pasal 278", "UU_ITE_No1_2024 - Pasal 27B"),
    ("UU_ITE_No1_2024_Pasal_278",   "UU_ITE_No1_2024_Pasal_27B"),
    ("UU_ITE_No1_2024 - Pasal 168", "UU_ITE_No1_2024 - Pasal 16B"),
    ("UU_ITE_No1_2024_Pasal_168",   "UU_ITE_No1_2024_Pasal_16B"),
]

EXTS = (".json", ".csv", ".md")

# Pass 2: field pendek TANPA prefiks dokumen (mis. citation_judgments.json
# menyimpan source_prov="Pasal 168" polos) — discope lewat field source_doc.
FIELD_FIX = {
    "UU_ITE_No1_2024": {"Pasal 168": "Pasal 16B", "Pasal 278": "Pasal 27B"},
    "UU_PDP_No27_2022": {"Pasal 7O": "Pasal 70", "Pasal 1O": "Penjelasan Pasal 10",
                          "Pasal 6O": "Penjelasan Pasal 60"},
}


def _fix_fields(obj, doc=None):
    """Rekursif: perbaiki field 'Pasal N' polos berbekal source_doc terdekat."""
    n = 0
    if isinstance(obj, dict):
        doc = obj.get("source_doc", doc)
        fixes = FIELD_FIX.get(doc, {})
        for k, v in list(obj.items()):
            if isinstance(v, str) and v in fixes:
                obj[k] = fixes[v]
                n += 1
            else:
                n += _fix_fields(v, doc)
    elif isinstance(obj, list):
        for v in obj:
            n += _fix_fields(v, doc)
    return n


def fix_scoped_fields(dry):
    path = os.path.join(DATA_DIR, "citation_judgments.json")
    if not os.path.exists(path):
        return
    data = json.load(open(path, encoding="utf-8"))
    n = _fix_fields(data)
    if n:
        print(("DRY  " if dry else "FIX  ") + "citation_judgments.json  [field ber-scope ×%d]" % n)
        if not dry:
            json.dump(data, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=2)


def main():
    dry = "--dry-run" in sys.argv
    total = 0
    for fname in sorted(os.listdir(DATA_DIR)):
        if not fname.endswith(EXTS):
            continue
        path = os.path.join(DATA_DIR, fname)
        with open(path, encoding="utf-8") as f:
            src = f.read()
        out, hits = src, []
        for old, new in RENAMES:
            n = out.count(old)
            if n:
                out = out.replace(old, new)
                hits.append("%s ×%d" % (old.split("_2022")[-1].split("_2024")[-1].strip(" -_"), n))
        if not hits:
            continue
        total += 1
        print(("DRY  " if dry else "FIX  ") + fname + "  [" + "; ".join(hits) + "]")
        if not dry:
            if fname.endswith(".json"):
                json.loads(out)  # jaga-jaga: hasil harus tetap JSON valid
            with open(path, "w", encoding="utf-8") as f:
                f.write(out)

    fix_scoped_fields(dry)

    residue = []
    for fname in sorted(os.listdir(DATA_DIR)):
        if not fname.endswith(EXTS):
            continue
        with open(os.path.join(DATA_DIR, fname), encoding="utf-8") as f:
            src = f.read()
        for old, _ in RENAMES:
            if old in src:
                residue.append("%s: %s" % (fname, old))
    print()
    print("File diubah: %d" % total)
    if residue and not dry:
        print("SISA POLA KORUP (harus kosong!):")
        for r in residue:
            print("  -", r)
        return 1
    print("Bersih — tidak ada sisa label korup." if not dry else "(dry-run, tidak ada file ditulis)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
