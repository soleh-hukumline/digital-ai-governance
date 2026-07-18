#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
lint_legal_citations.py — validasi build-time untuk klaim hukum hand-coded.

Latar: audit 2026-07-18 (workflow wf_cc3b1bf5-97f) menemukan COMPLIANCE_RULE_DB
(app/assets/js/app.core.js) mengarsipkan "data biometrik" di bawah UU PDP
Pasal 26 (yang sebenarnya mengatur penyandang disabilitas), lalu kesalahan itu
disuntikkan ke prompt LLM sebagai konteks "ter-grounded" dan dielaborasi menjadi
subseksi fiktif "Pasal 26 ayat (2) huruf a". Linter ini menjadikan kesalahan
sekelas itu GAGAL BUILD, bukan sekadar temuan reviewer.

Kontrak entri COMPLIANCE_RULE_DB (per objek {status,title,desc,recom,...}):
  * Jika judul mengutip pasal spesifik ("Ps. N" / "Ps. N-M"):
      - untuk regulasi DALAM korpus (provision_texts.json) → WAJIB `prov: [key,...]`
        (kunci "NamaUU - Pasal N") + `verify: [kata_kunci,...]`.
      - untuk regulasi DI LUAR korpus (KUHAP, UU Hak Cipta, POJK bank, dst.) →
        WAJIB penanda `ext: 'rujukan resmi + sumber'` (diverifikasi manual;
        dilaporkan sebagai WARNING untuk peninjauan berkala).
  * Cek kunci prov ada di korpus.
  * Cek tiap kata `verify` benar-benar muncul di teks verbatim gabungan `prov`
    (inilah cek yang menangkap "biometrik"→Pasal 26 secara otomatis).
  * Nomor pasal di judul harus tercakup kunci `prov` (rentang → cek endpoint).
  * Entri status 'gap' ("BELUM ADA ...") tidak dapat divalidasi mesin → WARNING.

Pemeriksaan B (build_incident_dataset.py, field kualifikasi) bersifat advisori
(INFO): korpus hanya subset pasal, jadi ketidakhadiran bukan bukti salah.

Pakai:  python3 system/legal_network_framework/lint_legal_citations.py
Keluar: 0 bila tanpa ERROR; 1 bila ada ERROR (pasang di pre-deploy).
"""

import json
import os
import re
import sys
import unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
APP_CORE = os.path.join(ROOT, "app", "assets", "js", "app.core.js")
PROVISION_TEXTS = os.path.join(ROOT, "data", "network", "provision_texts.json")
INCIDENT_BUILDER = os.path.join(ROOT, "build_incident_dataset.py")

# Alias nama regulasi (di teks bebas) -> prefiks kunci provision_texts.json.
REG_ALIASES = {
    "UU PDP": ["UU_PDP_No27_2022"],
    "UU 27/2022": ["UU_PDP_No27_2022"],
    "UU ITE": ["UU_ITE_No1_2024", "UU_ITE_No19_2016"],
    "UU 1/2024": ["UU_ITE_No1_2024"],
    "UU 19/2016": ["UU_ITE_No19_2016"],
    "PP PSTE": ["PP_PSTE_No71_2019"],
    "PP 71/2019": ["PP_PSTE_No71_2019"],
    "POJK 3/2024": ["POJK_No3_2024_Inovasi_Teknologi_Keuangan"],
    "SE KOMDIGI": ["SE_Komdigi_No9_2023_Etika_AI"],
}

# Regulasi di luar korpus verbatim — sitasi ke sini tidak dicek terhadap korpus,
# supaya "Pasal 378 KUHP" tidak salah teratribusi ke alias korpus terdekat.
OUTSIDE_CORPUS = [
    "KUHP", "KUHAP", "TPKS", "UU 12/2022", "UU 44/2008", "PORNOGRAFI",
    "UU 8/1999", "PERLINDUNGAN KONSUMEN", "UU 7/2014", "PERDAGANGAN",
    "UU 28/2014", "HAK CIPTA", "UU 17/2023", "KESEHATAN", "PERPRES",
    "KEKUASAAN KEHAKIMAN", "UU 48/2009", "POJK 11", "POJK 40", "POJK 77",
    "POJK 22", "UU 4/2023",
]

ERRORS, WARNINGS, INFOS = [], [], []


def _fold(s):
    return unicodedata.normalize("NFKD", s or "").casefold()


def _load_provisions():
    with open(PROVISION_TEXTS, encoding="utf-8") as f:
        return json.load(f)


def _extract_db_block(src):
    m = re.search(r"const COMPLIANCE_RULE_DB\s*=\s*\{", src)
    if not m:
        ERRORS.append("COMPLIANCE_RULE_DB tidak ditemukan di app.core.js")
        return None, 0
    start = m.end() - 1
    depth, i = 0, start
    while i < len(src):
        if src[i] == "{":
            depth += 1
        elif src[i] == "}":
            depth -= 1
            if depth == 0:
                return src[start:i + 1], src[:m.start()].count("\n") + 1
        i += 1
    ERRORS.append("COMPLIANCE_RULE_DB: kurung kurawal tidak seimbang")
    return None, 0


_FIELD = r"'((?:[^'\\]|\\.)*)'"


def _parse_entries(block, base_line):
    entries = []
    for off, line in enumerate(block.split("\n")):
        if "status:" not in line or "title:" not in line:
            continue
        entry = {"line": base_line + off}
        for field in ("status", "title", "desc", "recom", "ext"):
            fm = re.search(field + r"\s*:\s*" + _FIELD, line)
            entry[field] = fm.group(1).replace("\\'", "'") if fm else ""
        for field in ("prov", "verify"):
            fm = re.search(field + r"\s*:\s*\[(.*?)\]", line)
            entry[field] = re.findall(_FIELD, fm.group(1)) if fm else []
        entries.append(entry)
    return entries


_PASAL_IN_TITLE = re.compile(r"\bPs\.?\s*(\d+[A-Za-z]?)(?:\s*[-–]\s*(\d+[A-Za-z]?))?", re.I)
_PASAL_IN_KEY = re.compile(r"- Pasal (\d+[A-Za-z]?)$")


def _title_pasal_numbers(title):
    """Nomor pasal yang dikutip judul. Rentang 'N-M' → hanya endpoint {N, M}
    (mengecek seluruh isi rentang terlalu ketat untuk sitasi ringkas)."""
    nums = set()
    for m in _PASAL_IN_TITLE.finditer(title):
        nums.add(m.group(1).upper())
        if m.group(2):
            nums.add(m.group(2).upper())
    return nums


def check_compliance_db(provisions):
    with open(APP_CORE, encoding="utf-8") as f:
        src = f.read()
    block, base_line = _extract_db_block(src)
    if block is None:
        return
    entries = _parse_entries(block, base_line)
    if not entries:
        ERRORS.append("COMPLIANCE_RULE_DB: tidak ada entri terbaca (format berubah? sesuaikan linter)")
        return

    for e in entries:
        where = "app.core.js:%d [%s]" % (e["line"], e["title"][:60])
        title_nums = _title_pasal_numbers(e["title"])

        if e["status"] == "gap":
            WARNINGS.append("TINJAU MANUAL (klaim gap tak bisa dicek mesin): %s" % where)
            continue

        # Regulasi di luar korpus: butuh penanda ext eksplisit, tidak dicek korpus.
        if e["ext"]:
            WARNINGS.append("VERIFIKASI-MANUAL (ext): %s → %s" % (where, e["ext"][:80]))
            continue

        if title_nums and not e["prov"]:
            ERRORS.append("%s — judul mengutip pasal spesifik tapi tidak punya prov:[...] "
                          "(atau ext:'...' bila regulasi di luar korpus)" % where)
            continue

        texts, prov_nums = [], set()
        for key in e["prov"]:
            if key not in provisions:
                ERRORS.append("%s — kunci prov tidak ada di provision_texts.json: %r" % (where, key))
                continue
            texts.append(provisions[key])
            km = _PASAL_IN_KEY.search(key)
            if km:
                prov_nums.add(km.group(1).upper())
        joined = _fold(" ".join(texts))

        missing_nums = title_nums - prov_nums
        if e["prov"] and missing_nums:
            ERRORS.append("%s — pasal di judul (%s) tidak tercakup kunci prov (%s)"
                          % (where, ", ".join(sorted(missing_nums)), ", ".join(sorted(prov_nums)) or "-"))

        for kw in e["verify"]:
            if _fold(kw) not in joined:
                ERRORS.append("%s — kata kunci verifikasi %r TIDAK ditemukan di teks verbatim pasal prov"
                              % (where, kw))

        if e["prov"] and not e["verify"]:
            WARNINGS.append("%s — punya prov tapi tanpa verify:[...] (cek topik tidak aktif)" % where)
        if not e["prov"] and not e["ext"] and not title_nums:
            INFOS.append("%s — rujukan tingkat-UU tanpa pasal; di luar jangkauan validasi otomatis" % where)


_PASAL_TOKEN = re.compile(r"Pasal\s+(\d+[A-Za-z]?)")


def check_incident_builder(provisions):
    if not os.path.exists(INCIDENT_BUILDER):
        return
    keys_by_prefix = {}
    for key in provisions:
        prefix, _, pasal = key.partition(" - Pasal ")
        keys_by_prefix.setdefault(prefix, set()).add(pasal.upper())

    with open(INCIDENT_BUILDER, encoding="utf-8") as f:
        lines = f.readlines()
    unchecked = checked = 0
    for ln, line in enumerate(lines, 1):
        if '"kualifikasi"' not in line and '"kualifikasi_en"' not in line:
            continue
        for m in _PASAL_TOKEN.finditer(line):
            pasal = m.group(1).upper()
            lo, hi = max(0, m.start() - 70), m.end() + 70
            window = line[lo:hi].upper()
            center = m.start() - lo
            nearest, nearest_dist = None, 10 ** 9
            for alias in list(REG_ALIASES) + OUTSIDE_CORPUS:
                pos = window.find(alias.upper())
                while pos != -1:
                    dist = abs(pos - center)
                    if dist < nearest_dist:
                        nearest, nearest_dist = alias, dist
                    pos = window.find(alias.upper(), pos + 1)
            if nearest is None or nearest in OUTSIDE_CORPUS:
                unchecked += 1
                continue
            checked += 1
            prefixes = REG_ALIASES[nearest]
            if not any(pasal in keys_by_prefix.get(p, set()) for p in prefixes):
                INFOS.append("build_incident_dataset.py:%d — 'Pasal %s' (%s) tidak ada di subset korpus; "
                             "validasi manual disarankan" % (ln, pasal, "/".join(prefixes)))
    INFOS.append("kualifikasi insiden: %d sitasi dicek terhadap korpus, %d di luar cakupan korpus"
                 % (checked, unchecked))


def main():
    provisions = _load_provisions()
    check_compliance_db(provisions)
    check_incident_builder(provisions)

    for msg in ERRORS:
        print("ERROR  :", msg)
    for msg in WARNINGS:
        print("WARNING:", msg)
    for msg in INFOS:
        print("info   :", msg)
    print()
    print("Ringkasan: %d error, %d warning, %d info" % (len(ERRORS), len(WARNINGS), len(INFOS)))
    if ERRORS:
        print("GAGAL — perbaiki sitasi di atas sebelum deploy.")
        return 1
    print("LOLOS — semua klaim pasal hand-coded konsisten dengan teks verbatim / bertanda ext.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
