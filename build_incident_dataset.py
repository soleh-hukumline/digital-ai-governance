"""
build_incident_dataset.py — Source-driven builder for the empirical incident dataset
====================================================================================
Builds  data/incidents/indonesia_incidents.json  from a CURATED set of REAL,
individually-cited Indonesian cybersecurity & AI-misuse incidents.

WHY THIS FILE EXISTS (data-integrity note)
------------------------------------------
This script REPLACES the previous pipeline:
    generate_100_incidents.py  +  rename_incidents.py
That pipeline fabricated 95 of its 100 "incidents" by randomly combining a list
of institution types, city names and attack templates (`random.choice(...)`),
producing records that shared a single identical `nexus_kausalitas` sentence and
were then renamed to look authentic (e.g. `incident-auto-7` -> `pn-sidoarjo-2025`).
Those records were NOT empirical observations. Presenting them as "100 empirical
cyber incidents" was a misrepresentation and the true root cause of the reviewer's
"lack of empirical validation / reproducibility" critique.

WHAT THIS FILE GUARANTEES
-------------------------
* Every record below is a REAL, publicly reported incident.
* Every record carries >= 1 citation (outlet, title, URL, date).
* Factual fields  (subjek_pelaku / subjek_korban / subjek_pse / scale / kronologi
  / akibat) are drawn from the cited sources.
* Analytical fields (kualifikasi_peristiwa, objek_hukum, nexus_kausalitas) are the
  authors' DOCTRINAL interpretation grounded in those facts — clearly the paper's
  own legal analysis, not a claim attributed to the sources.
* `confidence` and `verification_note` flag figures that rest on a single source
  or on a threat-actor's listing (e.g. "seller-claimed", "official denial").
* `record_type` distinguishes a single discrete incident from a documented
  PATTERN / AGGREGATE (e.g. the OJK AI-fraud statistics, election deepfakes).

The dataset is intentionally SMALLER than 100. It contains only what could be
verified. n is reported honestly in the metadata; the manuscript must state
"N real, individually-sourced incidents", never "100".

Run:  python build_incident_dataset.py
"""

import json
import os
from collections import Counter

OUT_PATH = os.path.join(os.path.dirname(__file__), 'data', 'incidents', 'indonesia_incidents.json')
EN_OUT_PATH = os.path.join(os.path.dirname(__file__), 'data', 'incidents', 'indonesia_incidents_en.json')
# Optional English translations produced by make_validation_sample's sibling
# translation step (system/.../translate_*). If absent, the English dataset
# still contains the REAL incidents (English titles + Indonesian detail) so it
# is never fabricated — only less fully translated.
EN_OVERRIDES_PATH = os.path.join(os.path.dirname(__file__), 'data', 'incidents', '_en_overrides.json')

# ─── DOCTRINAL DEFAULTS BY TYPE ───────────────────────────────────────────────
# These are the authors' legal-qualification templates, grounded in Indonesian law
# (UU 1/2024 perubahan kedua UU ITE; UU 27/2022 PDP; UU 44/2008 Pornografi;
#  UU 12/2022 TPKS; UU 8/2010 TPPU; KUHP). Per-record overrides allowed via
# the "kualifikasi" / "objek" keys.
TYPE_DEFAULTS = {
    "ransomware": {
        "kualifikasi": "Akses ilegal dan/atau pemerasan terhadap sistem elektronik (Pasal 30 jo. Pasal 46 dan Pasal 27B UU ITE) serta dugaan kelalaian pemenuhan kewajiban pelindungan data pribadi (UU 27/2022 tentang PDP).",
        "objek": "Ketersediaan dan integritas Sistem Elektronik serta kerahasiaan data pribadi.",
    },
    "data_breach": {
        "kualifikasi": "Dugaan kegagalan pelindungan data pribadi (Pasal 35 & Pasal 57 UU 27/2022 tentang PDP) dan akses ilegal terhadap sistem elektronik (Pasal 30 UU ITE).",
        "objek": "Kerahasiaan dan pelindungan data pribadi subjek data.",
    },
    "defacement": {
        "kualifikasi": "Akses ilegal dan perubahan/perusakan tampilan sistem elektronik (Pasal 30 & Pasal 32 jo. Pasal 46-48 UU ITE).",
        "objek": "Integritas dan otentisitas sistem elektronik publik.",
    },
    "fraud": {
        "kualifikasi": "Penipuan dan/atau pencurian melalui sistem elektronik (Pasal 28 ayat (1) UU ITE jo. Pasal 378/362 KUHP) dan dugaan tindak pidana pencucian uang (UU 8/2010).",
        "objek": "Harta benda korban dan integritas sistem pembayaran.",
    },
    "ai_deepfake": {
        "kualifikasi": "Pembuatan/penyebaran konten manipulatif berbasis AI (deepfake) untuk penipuan (Pasal 28 & Pasal 35 UU ITE jo. Pasal 378 KUHP); manipulasi citra/biometrik (UU 27/2022).",
        "objek": "Harta benda korban, kehormatan figur publik, dan keandalan informasi.",
    },
    "ai_ncii": {
        "kualifikasi": "Pembuatan dan distribusi konten intim non-konsensual berbasis AI (Pasal 27 ayat (1) & Pasal 35 UU ITE; UU 44/2008 Pornografi; UU 12/2022 TPKS Pasal 14) dan pelanggaran data pribadi biometrik (UU 27/2022).",
        "objek": "Kehormatan, martabat, integritas seksual, dan data pribadi (citra wajah) korban.",
    },
    "ai_voice_fraud": {
        "kualifikasi": "Penipuan identitas sintetis / voice cloning berbasis AI dan penembusan otentikasi (Pasal 28 & Pasal 35 UU ITE jo. Pasal 378 KUHP).",
        "objek": "Harta benda korban dan keandalan otentikasi (eKYC/biometrik suara).",
    },
    "ai_disinformation": {
        "kualifikasi": "Penyebaran informasi bohong/manipulatif berbasis AI yang dapat menimbulkan keonaran atau merugikan kehormatan (Pasal 28 ayat (3) & Pasal 27A UU ITE).",
        "objek": "Ketertiban informasi publik, integritas proses demokrasi, dan kehormatan figur publik.",
    },
    "other": {
        "kualifikasi": "Perbuatan melawan hukum di ranah siber (kualifikasi spesifik pada catatan per-insiden).",
        "objek": "Hak dan kepentingan hukum yang dilindungi (spesifik per-insiden).",
    },
}


def src(outlet, title, url, date):
    return {"outlet": outlet, "title": title, "url": url, "date": date}


# ─── PER-SUBJECT LEGAL MAPPING (subjek hukum) ─────────────────────────────────
# A single incident binds MULTIPLE legal subjects, each with a DIFFERENT legal
# position and applicable regime. Mapping the incident-as-a-whole to one set of
# regulations conflates these (the perpetrator's crime vs the operator's duty vs
# the consumer's protection), which biases the analysis. We therefore enumerate
# the legal subjects per incident. Templates are by offence category; the actual
# party names are filled per incident. Fields are bilingual (id/en).
#   role tuple = (role_id, role_en, posisi_id, posisi_en, objek_id, objek_en, dasar[])
_ROLE_TEMPLATES = {
    "data": [  # data_breach, ransomware, defacement
        ("pelaku", "Perpetrator",
         "Pertanggungjawaban pidana atas akses ilegal, pencurian/perusakan, dan/atau pemerasan data",
         "Criminal liability for illegal access, data theft/alteration and/or extortion",
         "Keamanan & kerahasiaan Sistem Elektronik dan data pribadi",
         "Security & confidentiality of the electronic system and personal data",
         ["UU ITE Ps. 30, 32, 46–48", "UU ITE Ps. 27B (pemerasan)", "UU PDP Ps. 67–68", "KUHP"]),
        ("pse", "Operator (PSE)",
         "Kewajiban pengamanan data & pemberitahuan kebocoran; tanggung jawab administratif/perdata",
         "Duty to secure data & notify breaches; administrative/civil liability",
         "Pemenuhan kewajiban pelindungan data pribadi & keamanan sistem",
         "Fulfilment of data-protection & system-security obligations",
         ["UU PDP Ps. 35, 36, 39, 46", "PP PSTE No.71/2019", "(sektoral) POJK/PBI atau pedoman Kemenkes"]),
        ("konsumen", "Consumer / data subject",
         "Hak subjek data dan hak atas ganti rugi",
         "Data-subject rights and the right to compensation",
         "Hak atas data pribadi & kompensasi kerugian",
         "Personal-data rights & compensation for loss",
         ["UU PDP Ps. 5–12", "UU 8/1999 Perlindungan Konsumen"]),
        ("regulator", "Regulator / state",
         "Pengawasan kepatuhan & penegakan sanksi",
         "Compliance supervision & sanction enforcement",
         "Penegakan tata kelola pelindungan data",
         "Enforcement of data-protection governance",
         ["Otoritas PDP", "BSSN", "Kominfo/Komdigi", "(sektoral) OJK / Kemenkes"]),
    ],
    "fraud": [  # fraud, ai_fraud, ai_voice_fraud
        ("pelaku", "Perpetrator",
         "Pertanggungjawaban pidana penipuan/pencurian & pencucian uang",
         "Criminal liability for fraud/theft & money laundering",
         "Harta korban & integritas sistem pembayaran",
         "Victims' assets & payment-system integrity",
         ["UU ITE Ps. 28(1), 30, 35", "KUHP Ps. 362/378", "UU 8/2010 TPPU", "UU PDP Ps. 67–68 (identitas)"]),
        ("pse", "Operator / bank (PSE)",
         "Kewajiban manajemen risiko & keamanan sistem pembayaran/transaksi",
         "Risk-management & payment/transaction-system security obligations",
         "Keandalan & keamanan sistem pembayaran",
         "Reliability & security of the payment system",
         ["PBI/PADG BI (sistem pembayaran, BI-Fast)", "POJK manajemen risiko TI & keamanan siber", "UU PDP (bila data nasabah)"]),
        ("konsumen", "Consumer",
         "Perlindungan konsumen keuangan & hak ganti rugi",
         "Financial-consumer protection & the right to redress",
         "Dana/harta nasabah & perlindungan konsumen",
         "Customer funds & consumer protection",
         ["UU 4/2023 (P2SK)", "POJK perlindungan konsumen"]),
        ("regulator", "Regulator / state",
         "Pengawasan prudensial & penindakan pencucian uang",
         "Prudential supervision & AML enforcement",
         "Stabilitas & integritas sektor keuangan",
         "Stability & integrity of the financial sector",
         ["OJK", "Bank Indonesia", "PPATK"]),
    ],
    "ai": [  # ai_deepfake, ai_ncii, ai_disinformation
        ("pelaku", "Perpetrator",
         "Pertanggungjawaban pidana konten manipulatif/asusila/penipuan berbasis AI",
         "Criminal liability for AI-based manipulative/illicit/fraudulent content",
         "Kehormatan/martabat korban, ketertiban informasi, dan harta",
         "Victims' dignity, information order, and assets",
         ["UU ITE Ps. 27(1), 27A, 28, 35, 45", "UU 44/2008 Pornografi", "UU 12/2022 TPKS", "KUHP"]),
        ("pse", "Platform / PSE",
         "Kewajiban moderasi konten & pelindungan data biometrik",
         "Content-moderation duty & biometric-data protection",
         "Tata kelola konten & data biometrik pada platform",
         "Content & biometric-data governance on the platform",
         ["PP PSTE No.71/2019", "UU PDP (data biometrik)", "SE Komdigi 9/2023 Etika AI"]),
        ("korban", "Victim",
         "Pelindungan martabat/integritas & hak penghapusan konten",
         "Protection of dignity/integrity & the right to erasure",
         "Martabat, integritas, dan citra/data pribadi korban",
         "The victim's dignity, integrity & personal image/data",
         ["UU PDP Ps. 26 (hak penghapusan)", "UU 12/2022 TPKS", "UU ITE Ps. 26"]),
        ("regulator", "Regulator / state",
         "Pengawasan platform & penindakan pidana",
         "Platform supervision & criminal enforcement",
         "Penegakan etika AI & konten elektronik",
         "Enforcement of AI ethics & electronic content",
         ["Komdigi", "Kepolisian", "SE Komdigi 9/2023 (pedoman)"]),
    ],
    "other": [  # conduct / exposure cases (qualification is per-incident)
        ("pelaku", "Primary actor",
         "Pertanggungjawaban atas perbuatan melawan hukum (lihat kualifikasi per-insiden)",
         "Liability for the unlawful act (see per-incident qualification)",
         "Kepentingan hukum yang dilanggar (spesifik per-insiden)",
         "The legal interest infringed (incident-specific)",
         ["lihat kualifikasi_peristiwa"]),
        ("pse", "Operator / institution",
         "Kewajiban tata kelola, kepatuhan, & perlindungan pihak terdampak",
         "Governance, compliance & protection duties toward affected parties",
         "Pemenuhan kewajiban hukum penyelenggara",
         "Fulfilment of the operator's legal duties",
         ["UU PDP", "PP PSTE No.71/2019", "(sektoral) POJK/UU 4/2023"]),
        ("konsumen", "Affected party / consumer",
         "Hak atas perlindungan & ganti rugi",
         "Right to protection & redress",
         "Hak & keselamatan pihak terdampak",
         "Rights & safety of the affected party",
         ["UU 8/1999 / UU 4/2023 Perlindungan Konsumen", "UU PDP Ps. 5–12"]),
        ("regulator", "Regulator / state",
         "Pengawasan & penegakan sesuai sektor",
         "Sector-specific supervision & enforcement",
         "Penegakan kepatuhan",
         "Compliance enforcement",
         ["(sektoral) OJK / Komdigi / BSSN"]),
    ],
}
_TYPE2CAT = {
    "data_breach": "data", "ransomware": "data", "defacement": "data",
    "fraud": "fraud", "ai_fraud": "fraud", "ai_voice_fraud": "fraud",
    "ai_deepfake": "ai", "ai_ncii": "ai", "ai_disinformation": "ai",
    "other": "other",
}


def build_subjek_hukum(itype, parties, lang="id"):
    """parties = {'pelaku':..., 'korban':..., 'pse':...}. Returns a list of
    {peran, pihak, posisi, objek, dasar} dicts for every legal subject."""
    cat = _TYPE2CAT.get(itype, "other")
    en = (lang == "en")
    out = []
    for rid, ren, pid, pen, oid, oen, dasar in _ROLE_TEMPLATES[cat]:
        if rid == "pelaku":
            pihak = parties.get("pelaku", "")
        elif rid == "pse":
            pihak = parties.get("pse", "")
        elif rid in ("konsumen", "korban"):
            # For data/AI cases the victim IS the consumer/data subject; for fraud
            # the listed victim is usually the robbed institution, so the consumer
            # (the bank's customers) is a distinct, generic party.
            if cat == "fraud":
                pihak = "Nasabah/konsumen terdampak" if not en else "Affected customers/consumers"
            else:
                pihak = parties.get("korban", "")
        else:
            pihak = "Regulator/otoritas terkait" if not en else "Relevant regulator/authority"
        out.append({
            "peran": ren if en else rid,
            "pihak": pihak,
            "posisi_hukum": pen if en else pid,
            "objek_hukum": oen if en else oid,
            "dasar_hukum": dasar,
        })
    return out


# ─── CURATED REAL INCIDENTS ───────────────────────────────────────────────────
# Each dict: id, title_en, year, sector, type, severity, scale, perpetrator,
#            victim, pse, kronologi, akibat, nexus, confidence, verification_note,
#            sources, [record_type], [kualifikasi override], [objek override]
RECORDS = [
    # ===================== GOVERNMENT / PUBLIC SECTOR =====================
    {
        "id": "pdns2-surabaya-ransomware-2024",
        "title_en": "Brain Cipher ransomware cripples Temporary National Data Center (PDNS 2)",
        "year": 2024, "sector": "government", "type": "ransomware", "severity": "kritis",
        "scale": "282 instansi / 210+ layanan publik terdampak",
        "perpetrator": "Kelompok Brain Cipher (varian turunan LockBit 3.0)",
        "victim": "Negara dan masyarakat pengguna layanan publik (imigrasi bandara, registrasi pendidikan, perizinan).",
        "pse": "Pusat Data Nasional Sementara (PDNS) 2 Surabaya, di bawah Kominfo, dioperasikan Telkomsigma; pengawasan BSSN.",
        "kronologi": "Pada 20 Juni 2024 PDNS 2 Surabaya dienkripsi ransomware Brain Cipher (varian turunan LockBit 3.0) setelah Windows Defender dinonaktifkan, melumpuhkan 282 layanan pada 210+ instansi pusat dan daerah termasuk autogate imigrasi dan registrasi pendidikan. Penyerang meminta tebusan USD 8 juta yang ditolak pemerintah; pada 3 Juli 2024 kelompok itu merilis kunci dekripsi secara cuma-cuma.",
        "akibat": "Gangguan layanan publik nasional skala masif, terungkapnya ketiadaan cadangan (backup/DRC), dan krisis tata kelola data nasional.",
        "nexus": "Ketiadaan cadangan data dan mitigasi Disaster Recovery — bukan semata serangan — menjadi syarat fatal yang membuat enkripsi tunggal melumpuhkan ratusan instansi.",
        "confidence": "high", "verification_note": "Jumlah layanan bervariasi antar sumber (210 layanan vs 282 instansi); keduanya dilaporkan.",
        "sources": [
            src("The Record (Recorded Future News)", "Indonesia's national data center encrypted with LockBit ransomware variant", "https://therecord.media/indonesia-national-data-centre-hacked", "2024-06-24"),
            src("Kompas Tekno", "Kronologi Serangan Ransomware ke PDN dan Penanganannya", "https://tekno.kompas.com/read/2024/07/10/12350077/kronologi-serangan-ransomware-ke-pdn-dan-penanganannya-yang-tak-kunjung-usai", "2024-07-10"),
        ],
    },
    {
        "id": "bkn-asn-leak-topiax-2024",
        "title_en": "BKN civil-servant (ASN) data allegedly leaked and sold (~4.7M)",
        "year": 2024, "sector": "government", "type": "data_breach", "severity": "tinggi",
        "scale": "~4.759.218 data ASN/PNS",
        "perpetrator": "Pengguna BreachForums 'TopiAx'.",
        "victim": "~4,7 juta Aparatur Sipil Negara dan institusi ASN.",
        "pse": "Badan Kepegawaian Negara (BKN).",
        "kronologi": "Pada 10 Agustus 2024 pengguna BreachForums 'TopiAx' mengklaim mencuri 4.759.218 data BKN (NIP, NIK, nama, TTL, jabatan, instansi, alamat, kontak, pendidikan) dan menawarkannya seharga ~USD 10.000. CISSReC memverifikasi sampel 128 ASN Aceh sebagai otentik; BKN menyatakan menyelidiki bersama BSSN dan Kominfo.",
        "akibat": "Eksposur data kepegawaian sensitif jutaan pegawai negara dan tekanan pembentukan otoritas pelindungan data.",
        "nexus": "Lemahnya kontrol akses/enkripsi basis data kepegawaian membuka eksfiltrasi; figur volume berasal dari klaim penjual yang sebagian terverifikasi.",
        "confidence": "high", "verification_note": "BKN tidak mengonfirmasi penuh; figur dari klaim penjual, sebagian diverifikasi CISSReC.",
        "sources": [
            src("The Jakarta Post", "Fresh data breach puts pressure on government to form cyber privacy agency", "https://www.thejakartapost.com/indonesia/2024/08/14/fresh-data-breach-puts-pressure-on-government-to-form-cyber-privacy-agency.html", "2024-08-14"),
            src("Heaptalk", "Civil servants' data at BKN allegedly leaked, sold for $10,000", "https://heaptalk.com/news/civil-servants-data-at-bkn-allegedly-leaked-sold-for-10000/", "2024-08-12"),
        ],
    },
    {
        "id": "bkn-teacher-intrusion-2024",
        "title_en": "Elementary teacher arrested for intruding into BKN database (6.3 GB)",
        "year": 2024, "sector": "government", "type": "data_breach", "severity": "sedang",
        "scale": "6,3 GB data sampel ASN",
        "perpetrator": "Guru SD honorer (inisial BAG, 25 th) di Banyuwangi memakai kredensial pegawai BKN dari BreachForums.",
        "victim": "ASN yang datanya diunduh dan diperjualbelikan.",
        "pse": "Badan Kepegawaian Negara (BKN).",
        "kronologi": "Pada September 2024 polisi menangkap seorang guru SD honorer berusia 25 tahun di Banyuwangi yang memperoleh kredensial login pegawai BKN dari BreachForums, mengunduh ~6,3 GB data sampel, mengunggahnya ke Pastebin, lalu menjualnya ~USD 8.000 di BreachForums dan Telegram. Pelaku otodidak tanpa pendidikan TI formal.",
        "akibat": "Pencurian dan penjualan data kepegawaian; penangkapan dan penuntutan pelaku.",
        "nexus": "Penyalahgunaan kredensial sah (credential abuse) — bukan eksploitasi kerentanan teknis — menjadi vektor utama; menandakan lemahnya manajemen akses.",
        "confidence": "high", "verification_note": "Insiden terpisah dari klaim 'TopiAx' Agustus 2024; ini intrusi yang dituntut secara pidana.",
        "sources": [
            src("The Jakarta Post", "Police nab teacher for hacking govt database", "https://www.thejakartapost.com/indonesia/2024/09/25/police-nab-teacher-for-hacking-govt-database.html", "2024-09-25"),
        ],
    },
    {
        "id": "kpu-dpt-jimbo-2023",
        "title_en": "KPU voter roll (DPT) leak of ~204 million records ('Jimbo')",
        "year": 2023, "sector": "government", "type": "data_breach", "severity": "kritis",
        "scale": "204.807.203 data pemilih unik (252 juta entri mentah)",
        "perpetrator": "Pengguna BreachForums 'Jimbo'.",
        "victim": "Hampir seluruh pemilih terdaftar (DPT 2024).",
        "pse": "Komisi Pemilihan Umum (KPU).",
        "kronologi": "Sekitar 27-28 November 2023 'Jimbo' menawarkan 204.807.203 data pemilih unik dari DPT (NIK, KK, KTP, nama, TTL, status, alamat, TPS) seharga ~USD 74.000, dengan 500.000 data contoh sebagai bukti. Resecurity kemudian mengaitkan kompromi dengan malware pencuri info (info-stealer) pada endpoint KPU.",
        "akibat": "Eksposur PII hampir seluruh pemilih menjelang Pemilu Februari 2024 dan kekhawatiran integritas basis data elektoral.",
        "nexus": "Endpoint terinfeksi info-stealer pada operator menjadi titik masuk; KPU tidak mengonfirmasi asal data secara resmi.",
        "confidence": "high", "verification_note": "KPU tidak mengonfirmasi asal data; figur dari klaim penjual, divalidasi peneliti (Resecurity/VOI).",
        "sources": [
            src("Resecurity", "Vast Voter Data Leaks Cast Shadow Over Indonesia's 2024 Presidential Election", "https://www.resecurity.com/blog/article/vast-voter-data-leaks-cast-shadow-over-indonesias-2024-presidential-election", "2023-12"),
            src("VOI", "KPU Site Hacked, 204 Million Voter Data Sold For IDR 1.2 Billion", "https://voi.id/en/news/334099", "2023-11"),
        ],
    },
    {
        "id": "bjorka-sim-registration-1-3b-2022",
        "title_en": "Bjorka leak of 1.3 billion SIM-card registration records",
        "year": 2022, "sector": "government", "type": "data_breach", "severity": "kritis",
        "scale": "1.304.401.300 data registrasi SIM (~87 GB)",
        "perpetrator": "Peretas 'Bjorka' (BreachForums).",
        "victim": "Mayoritas pengguna seluler Indonesia (data NIK-nomor telepon).",
        "pse": "Diperdebatkan — data registrasi SIM terkait operator/Kominfo; Kominfo membantah sebagai sumber.",
        "kronologi": "Pada 31 Agustus-1 September 2022 'Bjorka' menawarkan ~1,3 miliar data registrasi SIM (NIK, nomor telepon, operator, tanggal registrasi; ~87 GB) seharga ~USD 50.000. Kominfo membantah datanya berasal dari sistemnya; insiden ini membuka rangkaian kebocoran 'Bjorka' 2022.",
        "akibat": "Eksposur keterkaitan NIK-nomor telepon untuk sebagian besar populasi; mempercepat pengesahan UU PDP.",
        "nexus": "Pengendali data tidak pernah dipastikan; pemerintah dan operator saling membantah — menandai vakum akuntabilitas.",
        "confidence": "high", "verification_note": "Sumber/pengendali data disengketakan; skala dari klaim penjual.",
        "sources": [
            src("The Jakarta Post", "Ministry denies role in 1.3 billion phone numbers' reported leak", "https://www.thejakartapost.com/indonesia/2022/09/02/ministry-denies-role-in-1-3-billion-phone-numbers-reported-leak.html", "2022-09-02"),
            src("Rest of World", "Sick of data leaks, Indonesians are siding with a hacker who exposed 1.3 billion SIM card details", "https://restofworld.org/2022/indonesia-hacked-sim-bjorka/", "2022-10-05"),
        ],
    },
    {
        "id": "immigration-passport-leak-2023",
        "title_en": "Immigration Directorate passport data leak (~34.9 million)",
        "year": 2023, "sector": "government", "type": "data_breach", "severity": "tinggi",
        "scale": "~34,9 juta data paspor (2009-2020)",
        "perpetrator": "Peretas 'Bjorka'.",
        "victim": "~34,9 juta pemegang paspor Indonesia.",
        "pse": "Direktorat Jenderal Imigrasi (saat itu Kemenkumham).",
        "kronologi": "Pada 5 Juli 2023 peneliti Teguh Aprianto melaporkan 'Bjorka' menjual data ~34,9 juta pemegang paspor (nama, nomor paspor, masa berlaku, TTL, gender) periode 2009-2020 seharga ~USD 10.000. Imigrasi dan BSSN menyelidiki; otoritas memperdebatkan kecocokan sampel dengan data terkini.",
        "akibat": "Eksposur PII paspor puluhan juta warga; mendorong seruan penguatan pengawasan pelindungan data.",
        "nexus": "Akar penyebab tidak diumumkan resmi; Kominfo tidak mengonfirmasi pelanggaran. Figur dari klaim penjual, sampel dinilai valid peneliti.",
        "confidence": "high", "verification_note": "Atribusi/asal tidak dikonfirmasi resmi; angka 34-34,9 juta bervariasi antar sumber.",
        "sources": [
            src("The Jakarta Post", "Hacker breaches data of 34 million Indonesian passports", "https://www.thejakartapost.com/indonesia/2023/07/06/hacker-breaches-data-of-34-million-indonesian-passports.html", "2023-07-06"),
            src("CPO Magazine", "34 million Indonesian Passports Exposed in a Massive Immigration Directorate Data Breach", "https://www.cpomagazine.com/cyber-security/34-million-indonesian-passports-exposed-in-a-massive-immigration-directorate-data-breach/", "2023-07"),
        ],
    },
    {
        "id": "npwp-tax-bjorka-2024",
        "title_en": "Bjorka sells ~6 million taxpayer IDs (NPWP), incl. President's",
        "year": 2024, "sector": "government", "type": "data_breach", "severity": "tinggi",
        "scale": "~6 juta (dilaporkan s/d 6,6 juta) data NPWP",
        "perpetrator": "Peretas 'Bjorka'.",
        "victim": "~6 juta wajib pajak, termasuk pejabat tinggi negara.",
        "pse": "Direktorat Jenderal Pajak (DJP), Kementerian Keuangan.",
        "kronologi": "Pada 18 September 2024 'Bjorka' menawarkan ~6 juta data NPWP (NIK, NPWP, nama, alamat, kontak, data pajak) seharga ~USD 10.000; sampel menyebut Presiden Joko Widodo, Gibran, Kaesang, dan dua menteri. DJP menyatakan log aksesnya tidak menunjukkan indikasi pembobolan dan membuka penyelidikan.",
        "akibat": "Eksposur PII perpajakan termasuk pejabat puncak; memicu kembali perdebatan keamanan siber pemerintah.",
        "nexus": "DJP membantah pembobolan sistem; sumber sebenarnya tidak dipastikan. Figur dari klaim penjual.",
        "confidence": "high", "verification_note": "DJP membantah; skala 6-6,6 juta dari klaim penjual, belum dikonfirmasi resmi.",
        "sources": [
            src("Tempo (English)", "The Ins and Outs About Bjorka Selling 6 Million Indonesian Citizens' Tax ID Data", "https://en.tempo.co/read/1919426/the-ins-and-outs-about-bjorka-selling-6-million-indonesian-citizens-tax-id-data", "2024-09"),
            src("CPO Magazine", "Indonesia's Tax Agency Data Breach Impacts 6 Million, Including President Widodo and His Cabinet", "https://www.cpomagazine.com/cyber-security/indonesias-tax-agency-data-breach-impacts-6-million-including-president-widodo-and-his-cabinet/", "2024-09"),
        ],
    },
    {
        "id": "bais-tni-intelligence-leak-2024",
        "title_en": "BAIS TNI military strategic-intelligence data allegedly breached",
        "year": 2024, "sector": "government", "type": "data_breach", "severity": "tinggi",
        "scale": "Tidak diumumkan (hanya berkas contoh)",
        "perpetrator": "Pengguna BreachForums 'MoonzHaxor'.",
        "victim": "Badan Intelijen Strategis TNI.",
        "pse": "Badan Intelijen Strategis (BAIS) TNI.",
        "kronologi": "Sekitar 24-27 Juni 2024 'MoonzHaxor' mengklaim membobol BAIS TNI dan memuat berkas contoh, menawarkan data hingga ~USD 7.000. Tim Siber TNI menyatakan menyelidiki dan menonaktifkan sementara server BAIS; pejabat menyebut materi sebagai data lama.",
        "akibat": "Dugaan eksposur data terkait intelijen militer; server dinonaktifkan untuk investigasi.",
        "nexus": "Tidak dikonfirmasi penuh oleh TNI; skala tidak diungkap, disebut 'data lama'.",
        "confidence": "medium", "verification_note": "Berbasis klaim pelaku; TNI hanya menyatakan investigasi.",
        "sources": [
            src("Jakarta Globe", "Indonesian Military Strategic Intelligence Data Allegedly Hacked, Investigation Ongoing", "https://jakartaglobe.id/tech/indonesian-militarystrategic-intelligence-data-allegedly-hacked-investigation-ongoing", "2024-06"),
            src("VOI", "BAIS And INAFIS TNI-Polri Sensitive Data Leaked, Sold On Dark Web", "https://voi.id/en/technology/393766", "2024-06"),
        ],
    },
    {
        "id": "inafis-polri-fingerprint-leak-2024",
        "title_en": "INAFIS police fingerprint-identification system data leaked",
        "year": 2024, "sector": "government", "type": "data_breach", "severity": "tinggi",
        "scale": "Tidak diumumkan (citra sidik jari, email, konfigurasi)",
        "perpetrator": "Pengguna BreachForums 'MoonzHaxor'.",
        "victim": "Sistem identifikasi sidik jari kepolisian (INAFIS).",
        "pse": "Polri / INAFIS.",
        "kronologi": "Pada 22 Juni 2024 'MoonzHaxor' mengunggah data dugaan pembobolan INAFIS (citra sidik jari, email, berkas aplikasi SpringBoot) seharga ~USD 1.000. Kepala BSSN berkoordinasi dengan Polri dan menyatakan data lama serta layanan INAFIS berjalan normal.",
        "akibat": "Dugaan eksposur data biometrik (sidik jari) terkait sistem identifikasi kepolisian.",
        "nexus": "Tidak dikonfirmasi penuh (disebut 'data lama'); pelaku sama dengan kasus BAIS, namun pengendali data berbeda.",
        "confidence": "medium", "verification_note": "Berbasis klaim pelaku; BSSN/Polri menyebut data lama.",
        "sources": [
            src("VOI", "Police Inafis Data Leaks On Dark Web, BSSN Ensures It's Old Data", "https://voi.id/en/technology/392576", "2024-06"),
            src("BeyondMachines", "Hacker claims breaching Indonesian military and police systems BAIS and INAFIS", "https://beyondmachines.net/event_details/hacker-claims-breaching-indonesian-military-and-police-systems-bais-and-inafis-sells-data-r-q-k-z-d", "2024-06"),
        ],
    },
    {
        "id": "pedulilindungi-jokowi-cert-2021",
        "title_en": "President Jokowi's vaccine certificate exposed via PeduliLindungi feature",
        "year": 2021, "sector": "government", "type": "other", "severity": "sedang",
        "scale": "Eksposur individual figur publik (sertifikat vaksin Presiden)",
        "perpetrator": "Individu yang mengeksploitasi fitur cek sertifikat aplikasi publik.",
        "victim": "Presiden Joko Widodo; kekhawatiran meluas pada pengguna PeduliLindungi.",
        "pse": "Kementerian Kesehatan (operator PeduliLindungi saat itu).",
        "kronologi": "Awal September 2021 sertifikat vaksin Presiden Joko Widodo diakses dan beredar daring setelah pengguna mengeksploitasi fitur cek vaksinasi di aplikasi PeduliLindungi. Menkes menyatakan akses ke data pejabat telah diblokir dan keamanan diperbaiki; Kominfo berargumen data NIK/vaksinasi mungkin berasal dari sumber pemerintah lain.",
        "akibat": "Menunjukkan kerentanan fitur aplikasi mengeksposur data sensitif bahkan kepala negara; pembatasan akses data pejabat.",
        "nexus": "Kontrol akses lemah pada fitur publik (over-exposure by design), bukan eksfiltrasi massal.",
        "confidence": "high",
        "verification_note": "Diklasifikasikan 'other' (eksposur via fitur/akses lemah); asal data diperdebatkan pejabat.",
        "kualifikasi": "Dugaan kelalaian pengamanan akses data pribadi pada Sistem Elektronik publik (Pasal 35 & Pasal 36 UU 27/2022 tentang PDP).",
        "objek": "Kerahasiaan data kesehatan dan identitas figur publik.",
        "sources": [
            src("The Jakarta Post", "Data security concerns after President Jokowi vaccine certificate leak", "https://www.thejakartapost.com/indonesia/2021/09/05/data-security-concerns-after-president-jokowi-vaccine-certificate-leak-.html", "2021-09-05"),
            src("Rappler", "Privacy alarm in Indonesia over president's leaked vaccine certificate", "https://www.rappler.com/technology/privacy-alarm-indonesia-president-widodo-vaccine-certificate/", "2021-09-04"),
        ],
    },
    {
        "id": "kemenkes-patient-records-2022",
        "title_en": "Health Ministry patient medical records leak (~6 million / 720 GB)",
        "year": 2022, "sector": "health", "type": "data_breach", "severity": "kritis",
        "scale": "~6 juta rekam medis pasien / ~720 GB",
        "perpetrator": "Peretas tak dikenal (RaidForums).",
        "victim": "Pasien sejumlah rumah sakit.",
        "pse": "Kementerian Kesehatan (server terpusat).",
        "kronologi": "Pada 6 Januari 2022 Kemenkes mengakui menyelidiki dugaan kebocoran ~6 juta rekam medis pasien (~720 GB) yang dijual di RaidForums, mencakup nama, rumah sakit, foto pasien, hasil rontgen, hasil lab/COVID-19, surat rujukan BPJS, dan laporan radiologi. Kemenkes berkoordinasi dengan BSSN untuk investigasi.",
        "akibat": "Eksposur rekam klinis rinci (citra dan hasil tes) dari berbagai rumah sakit; menurunkan kepercayaan publik.",
        "nexus": "Sentralisasi data tanpa pengamanan memadai; volume berasal dari klaim penjual, tidak dikonfirmasi independen.",
        "confidence": "high", "verification_note": "Skala 6 juta/720 GB dari klaim penjual; diselidiki Kemenkes.",
        "sources": [
            src("Tempo (English)", "Health Ministry Responds to Massive Data Leak of Medical Records", "https://en.tempo.co/read/1547439/health-ministry-responds-to-massive-data-leak-of-medical-records", "2022-01-07"),
            src("ANTARA News", "Health Ministry probes alleged leak of six million patients' data", "https://en.antaranews.com/news/208285/health-ministry-probes-alleged-leak-of-six-million-patients-data", "2022-01"),
        ],
    },
    {
        "id": "bpjs-kesehatan-279m-2021",
        "title_en": "BPJS Kesehatan national health insurance data leak (~279 million)",
        "year": 2021, "sector": "health", "type": "data_breach", "severity": "kritis",
        "scale": "~279 juta data (klaim; sebagian besar duplikatif terhadap populasi)",
        "perpetrator": "Pengguna RaidForums 'Kotz'.",
        "victim": "Peserta BPJS Kesehatan (JKN).",
        "pse": "BPJS Kesehatan.",
        "kronologi": "Pada Mei 2021 akun RaidForums 'Kotz' menjual data yang diklaim milik ~279 juta peserta BPJS Kesehatan (NIK, KTP, telepon, email, nama, alamat, gaji), dengan ~20 juta disertai foto. Kasus diselidiki BSSN, Dittipidsiber, dan Kominfo; forensik digital tidak konklusif menetapkan sumber kebocoran.",
        "akibat": "Eksposur data identitas dan jaminan kesehatan sebagian besar populasi; mempertajam debat pelindungan data.",
        "nexus": "Sumber tidak dapat dipastikan secara forensik; angka 279 juta dari klaim penjual/BPJS, bukan audit independen.",
        "confidence": "high", "verification_note": "Investigasi tidak konklusif; figur klaim, melebihi jumlah peserta riil (indikasi duplikasi).",
        "sources": [
            src("Tempo (English)", "BPJS Kesehatan Massive Data Breach Investigation Update", "https://en.tempo.co/read/1469740/bpjs-kesehatan-massive-data-breach-investigation-update", "2021-06-07"),
            src("DataGuidance", "Indonesia: Kominfo confirms breach of government health data involving 279M Indonesians", "https://www.dataguidance.com/news/indonesia-kominfo-confirms-breach-government-health", "2021"),
        ],
    },
    {
        "id": "ehac-covid-app-leak-2021",
        "title_en": "eHAC COVID-19 health-alert app exposes ~1.3 million users",
        "year": 2021, "sector": "health", "type": "data_breach", "severity": "tinggi",
        "scale": "~1,3 juta pengguna (1,4 juta+ rekaman)",
        "perpetrator": "Tidak ada pelaku jahat terkonfirmasi (basis data Elasticsearch terbuka; ditemukan peneliti vpnMentor).",
        "victim": "~1,3 juta pengguna dan pelancong; data 226 RS/klinik.",
        "pse": "Kementerian Kesehatan (aplikasi eHAC versi lama).",
        "kronologi": "Pada 15 Juli 2021 tim vpnMentor menemukan basis data Elasticsearch eHAC tanpa autentikasi yang mengeksposur ~1,3 juta orang (NIK, telepon, foto, hasil tes COVID-19, data perjalanan/rumah sakit, kredensial staf). Setelah notifikasi, server dimatikan pada 24 Agustus 2021; Kemenkes menyebut kebocoran melibatkan eHAC versi lama.",
        "akibat": "Eksposur data kesehatan dan perjalanan sensitif lebih dari satu juta orang saat pandemi.",
        "nexus": "Konfigurasi keliru basis data (misconfiguration), bukan eksfiltrasi terkonfirmasi; aplikasi lama tak dikelola aman.",
        "confidence": "high", "verification_note": "Eksposur (misconfig) ditemukan peneliti; bukan eksfiltrasi jahat; skala estimasi vpnMentor.",
        "sources": [
            src("vpnMentor", "Report: Indonesian Government's Covid-19 App Accidentally Exposes Over 1 Million People", "https://www.vpnmentor.com/blog/report-ehac-indonesia-leak/", "2021-08-30"),
            src("The Jakarta Post", "Police ends probe into alleged eHAC data leak", "https://www.thejakartapost.com/news/2021/09/10/police-ends-probe-into-alleged-ehac-data-leak.html", "2021-09-10"),
        ],
    },
    {
        "id": "wannacry-hospitals-2017",
        "title_en": "WannaCry ransomware hits Dharmais & Harapan Kita hospitals (Jakarta)",
        "year": 2017, "sector": "health", "type": "ransomware", "severity": "tinggi",
        "scale": "Dua RS besar Jakarta; hampir seluruh komputer Dharmais terdampak",
        "perpetrator": "Ransomware WannaCry (kampanye global; eksploitasi SMB).",
        "victim": "RS Kanker Dharmais & RS Jantung Harapan Kita, Jakarta.",
        "pse": "RS Dharmais & RS Harapan Kita (afiliasi Kemenkes).",
        "kronologi": "Pada pertengahan Mei 2017, saat wabah WannaCry global, RS Dharmais dan RS Harapan Kita di Jakarta terkena ransomware yang mengenkripsi berkas Windows via kerentanan SMB. Direktur Dharmais melaporkan hampir seluruh komputer terdampak; sistem rekam medis dan tagihan terkunci dengan tebusan ~USD 300 dalam Bitcoin. Operasi pulih via cadangan, dan Kominfo menyatakan rekam medis tidak bocor.",
        "akibat": "Gangguan sementara sistem TI dan akses rekam medis; pulih lewat cadangan tanpa kebocoran data terkonfirmasi.",
        "nexus": "Sistem belum dipatch terhadap kerentanan SMB (EternalBlue); keberadaan cadangan menjadi pembeda pemulihan.",
        "confidence": "high", "verification_note": "Rumah sakit disebut spesifik; insiden disruptif (bukan eksfiltrasi).",
        "sources": [
            src("The Jakarta Post", "Indonesia tries to fend off ransomware cyberattack", "https://www.thejakartapost.com/news/2017/05/14/indonesia-tries-to-fend-off-ransomware-cyberattack.html", "2017-05-14"),
            src("CNN Indonesia", "Dua Rumah Sakit di Jakarta Kena Serangan Ransomware WannaCry", "https://www.cnnindonesia.com/teknologi/20170513191519-192-214642/dua-rumah-sakit-di-jakarta-kena-serangan-ransomware-wannacry", "2017-05-13"),
        ],
    },
    {
        "id": "pedulilindungi-id-gambling-hijack-2025",
        "title_en": "Legacy PeduliLindungi.id domain hijacked to show online gambling content",
        "year": 2025, "sector": "health", "type": "defacement", "severity": "sedang",
        "scale": "Kompromi domain aplikasi lama (tanpa kebocoran data pasien)",
        "perpetrator": "Tidak dikenal (penyusupan domain/SEO-spam judi).",
        "victim": "Pengunjung domain legacy PeduliLindungi.id.",
        "pse": "Telkom Indonesia (pengelola domain pasca-migrasi layanan ke SatuSehat).",
        "kronologi": "Sekitar 19-20 Mei 2025 situs legacy PeduliLindungi.id ditemukan menampilkan konten promosi judi daring setelah disusupi. Komdigi memblokir domain pada 21 Mei 2025; layanan kesehatan telah bermigrasi ke SatuSehat sejak 2023, dan Telkom memulai investigasi internal.",
        "akibat": "Insiden reputasi/keamanan pada domain aplikasi kesehatan pemerintah; situs diblokir; tidak ada kebocoran data pasien.",
        "nexus": "Domain aplikasi yang ditinggalkan (abandoned asset) tidak dipelihara aman menjadi target pembajakan.",
        "confidence": "high", "verification_note": "Pembajakan/defacement domain legacy, bukan kebocoran data pasien.",
        "sources": [
            src("Tempo (English)", "Government Blocks 'PeduliLindungi' Website Over Suspected Online Gambling Hack", "https://en.tempo.co/read/2009915/government-blocks-pedulilindungi-website-over-suspected-online-gambling-hack", "2025-05-21"),
        ],
    },
    {
        "id": "satusehat-kotim-breach-2025",
        "title_en": "Alleged breach of SatuSehat instance for East Kotawaringin (Kotim)",
        "year": 2025, "sector": "health", "type": "data_breach", "severity": "sedang",
        "scale": "Basis data satu instance kabupaten (jumlah tak disebut); data 2020-2025",
        "perpetrator": "Aktor anonim (forum dark web).",
        "victim": "Pasien di Kabupaten Kotawaringin Timur.",
        "pse": "Platform SatuSehat (Kemenkes); penjual mengaitkan ke BPJS Kesehatan.",
        "kronologi": "Sekitar 7 Agustus 2025 pengguna baru forum dark web menawarkan basis data yang diklaim dari instance SatuSehat Kabupaten Kotawaringin Timur, memuat timestamp, nomor rekam medis, nomor BPJS, nama, gender, poliklinik, status cetak, dan barcode, dengan data dilaporkan rentang 2020-2025.",
        "akibat": "Dugaan eksposur identitas pasien dan data administratif kesehatan pada populasi tingkat kabupaten.",
        "nexus": "Instance daerah berisiko menjadi titik lemah platform nasional; klaim belum dikonfirmasi mainstream/Kemenkes.",
        "confidence": "medium", "verification_note": "Sumber tunggal intel dark web; 'alleged', tidak dikonfirmasi independen.",
        "sources": [
            src("Daily Dark Web", "Indonesian Health Platform SatuSehat Kotim Kabupaten Allegedly Breached", "https://dailydarkweb.net/indonesian-health-platform-satusehat-kotim-kabupaten-allegedly-breached-patient-data-leaked/", "2025-08-07"),
        ],
    },
    {
        "id": "kemendikbud-leak-claim-2025",
        "title_en": "Ministry of Education (Kemendikbudristek) ~25 GB data leak claim",
        "year": 2025, "sector": "education", "type": "data_breach", "severity": "sedang",
        "scale": "~25 GB (klaim)",
        "perpetrator": "Anggota BreachForums tak teridentifikasi.",
        "victim": "Peserta/individu pada data Kemendikbudristek.",
        "pse": "Kementerian Pendidikan, Kebudayaan, Riset dan Teknologi.",
        "kronologi": "Awal Februari 2025 anggota BreachForums (terindeks via FalconFeeds.io) mengklaim menjual ~25 GB data yang diatribusikan ke Kemendikbudristek (nama, nomor identitas, gender, TTL, telepon, ID provinsi/kota). Kementerian belum mengeluarkan konfirmasi resmi pada saat pelaporan.",
        "akibat": "Dugaan eksposur data pribadi sektor pendidikan; penilaian keaslian klaim berlangsung.",
        "nexus": "Belum dikonfirmasi kementerian; berbasis satu laporan bersumber intel ancaman; skala dari klaim pelaku.",
        "confidence": "medium", "verification_note": "Tidak dikonfirmasi; sumber tunggal; skala klaim pelaku.",
        "sources": [
            src("Cyber Press", "Data Breach Exposes Indonesian Ministry of Education, Culture, Research, and Technology", "https://cyberpress.org/data-breach-indonesian-ministry/", "2025-02-03"),
        ],
    },
    {
        "id": "kejaksaan-agung-defacement-2025",
        "title_en": "Attorney General's Office (Kejaksaan Agung) website defacement",
        "year": 2025, "sector": "judicial", "type": "defacement", "severity": "sedang",
        "scale": "Tidak diketahui (defacement; pelaku klaim akses basis data)",
        "perpetrator": "Individu dengan handel @unrooter.id, @raja_jawa19xx, @fablo_kecil.",
        "victim": "Kejaksaan Agung RI.",
        "pse": "Kejaksaan Agung Republik Indonesia.",
        "kronologi": "Pada Februari 2025 situs resmi Kejaksaan Agung (kejaksaan.go.id) terkena serangan defacement, dilaporkan via media sosial sekitar 10 Februari 2025. Pelaku, melalui handel Instagram, mengklaim mengakses basis data termasuk data pegawai, tamu, e-ticketing, dan perkara.",
        "akibat": "Defacement situs sektor yudisial nasional dan klaim akses data internal; dampak reputasi.",
        "nexus": "Defacement terkonfirmasi; klaim penguasaan basis data adalah asersi pelaku yang belum dikonfirmasi resmi.",
        "confidence": "medium", "verification_note": "Defacement dilaporkan; klaim akses DB belum dikonfirmasi Kejagung.",
        "sources": [
            src("VOI", "Getting To Know Deface Attacks, Hacking Mode That Hits The AGO's Website", "https://voi.id/en/technology/460661", "2025-02-17"),
            src("Espos.id", "Situs Resmi Kejaksaan Agung Diretas, Ini Pesan yang Ditulis Hacker", "https://news.espos.id/situs-resmi-kejaksaan-agung-diretas-ini-pesan-yang-ditulis-hacker", "2025-02"),
        ],
    },
    {
        "id": "ugm-ft-website-defacement-2022",
        "title_en": "UGM engineering faculty website defaced by 'Bangsin'",
        "year": 2022, "sector": "education", "type": "defacement", "severity": "sedang",
        "scale": "Satu aplikasi web fakultas (FIND IT! / findit.ft.ugm.ac.id)",
        "perpetrator": "Peretas dengan alias 'Bangsin'.",
        "victim": "Fakultas Teknik, Universitas Gadjah Mada.",
        "pse": "Universitas Gadjah Mada (UGM).",
        "kronologi": "Pada Desember 2022 peretas beralias 'Bangsin' merusak tampilan situs 'FIND IT!' FT UGM (findit.ft.ugm.ac.id) dengan pesan 'BANGSIN WAS HERE AGAIN' dan berkas audio. Dilaporkan sebagai insiden berulang oleh pelaku yang sama; unit keamanan informasi UGM (DSSDI) menangani.",
        "akibat": "Defacement aplikasi web universitas; tidak ada pencurian data dilaporkan.",
        "nexus": "Kerentanan aplikasi web fakultas yang berulang; defacement saja, tanpa kebocoran data.",
        "confidence": "high", "verification_note": "Defacement (bukan kebocoran data); universitas disebut spesifik dengan sumber media nasional.",
        "sources": [
            src("Detik", "Situs UGM Diretas Hacker, Tinggalkan Pesan 'Bangsin Was Here Again'", "https://news.detik.com/berita/d-6473217/situs-ugm-diretas-hacker-tinggalkan-pesan-bangsin-was-here-again", "2022-12-21"),
        ],
    },

    # ===================== FINANCE =====================
    {
        "id": "bsi-lockbit-ransomware-2023",
        "title_en": "Bank Syariah Indonesia (BSI) ransomware attack and 1.5TB leak (LockBit)",
        "year": 2023, "sector": "finance", "type": "ransomware", "severity": "kritis",
        "scale": "~15 juta nasabah & pegawai; 1,5 TB data",
        "perpetrator": "Kelompok ransomware LockBit.",
        "victim": "~15 juta nasabah dan pegawai BSI.",
        "pse": "PT Bank Syariah Indonesia Tbk.",
        "kronologi": "Pada 8 Mei 2023 layanan ATM dan cabang BSI lumpuh; LockBit mengklaim mencuri 1,5 TB data ~15 juta nasabah dan pegawai. Log negosiasi menunjukkan bank menawar ~USD 10 juta sementara LockBit menuntut USD 20 juta; setelah gagal, data dipublikasikan 15-16 Mei 2023.",
        "akibat": "Gangguan layanan multi-hari dan kebocoran data nasabah/pegawai (kontak, dokumen finansial, data kartu, kata sandi) di dark web.",
        "nexus": "Pertahanan berlapis tertembus; tebusan tidak dibayar sehingga eksfiltrasi dipublikasikan.",
        "confidence": "high", "verification_note": "",
        "sources": [
            src("BankInfoSecurity", "LockBit Leaks 1.5TB of Data Stolen From Indonesia's BSI Bank", "https://www.bankinfosecurity.com/lockbit-leaks-15tb-data-stolen-from-indonesias-bsi-bank-a-22110", "2023-05-18"),
            src("The Jakarta Post", "Data breaches still haunt Indonesia as BSI becomes latest victim", "https://www.thejakartapost.com/paper/2023/05/16/data-breaches-still-haunt-indonesia.html", "2023-05-16"),
        ],
    },
    {
        "id": "bank-indonesia-conti-ransomware-2022",
        "title_en": "Bank Indonesia (central bank) Conti ransomware attack",
        "year": 2022, "sector": "finance", "type": "ransomware", "severity": "tinggi",
        "scale": "~13,88 GB dokumen; data pegawai non-kritikal pada belasan sistem",
        "perpetrator": "Geng ransomware Conti.",
        "victim": "Bank Indonesia (bank sentral).",
        "pse": "Bank Indonesia.",
        "kronologi": "Bank Indonesia mengonfirmasi serangan ransomware yang terjadi Desember 2021 dan dilaporkan peneliti Januari 2022. Conti menanam ransomware pada belasan sistem dan mengklaim ~13,88 GB dokumen yang mulai dibocorkan. BI dan BSSN menyatakan penyerang hanya memperoleh data pegawai non-kritikal dan operasi publik tidak terganggu.",
        "akibat": "Kompromi dokumen internal pegawai dan kebocoran parsial; tanpa dampak terkonfirmasi pada layanan publik menurut BI.",
        "nexus": "Akses awal ke jaringan internal; mitigasi membatasi dampak ke sistem non-kritikal.",
        "confidence": "high", "verification_note": "Serangan Desember 2021, diungkap Januari 2022.",
        "sources": [
            src("BleepingComputer", "Indonesia's central bank confirms ransomware attack, Conti leaks data", "https://www.bleepingcomputer.com/news/security/indonesias-central-bank-confirms-ransomware-attack-conti-leaks-data/", "2022-01-20"),
            src("Bitdefender (HotForSecurity)", "Bank Indonesia Confirms Conti Ransomware Attack; Stolen Files Leaked", "https://www.bitdefender.com/en-us/blog/hotforsecurity/bank-indonesia-confirms-conti-ransomware-attack-stolen-files-leaked", "2022-01"),
        ],
    },
    {
        "id": "indodax-crypto-hack-2024",
        "title_en": "Indodax cryptocurrency exchange hot-wallet hack (~$22M)",
        "year": 2024, "sector": "finance", "type": "fraud", "severity": "tinggi",
        "scale": "Lebih dari USD 22 juta aset kripto",
        "perpetrator": "Tidak dikenal (taktik dinilai peneliti menyerupai Lazarus Group).",
        "victim": "Indodax dan penggunanya.",
        "pse": "PT Indodax Nasional Indonesia.",
        "kronologi": "Pada 11 September 2024 penyerang menguras hot wallet Indodax lebih dari USD 22 juta (a.l. ~USD 14 jt ETH, USD 2,5 jt MATIC, USD 2,4 jt TRX, USD 1,4 jt BTC), diidentifikasi SlowMist dan CertiK. Indodax menangguhkan platform dengan dalih pemeliharaan; Cyvers menilai taktik menyerupai Lazarus, namun atribusi tidak dikonfirmasi.",
        "akibat": "Pencurian >USD 22 juta aset kripto; penangguhan sementara seluruh layanan.",
        "nexus": "Kompromi kunci/hot wallet; atribusi Lazarus bersifat hipotesis peneliti.",
        "confidence": "high", "verification_note": "Atribusi Lazarus belum dikonfirmasi.",
        "sources": [
            src("CoinDesk", "Indonesian Crypto Exchange Indodax Hacked for $22M", "https://www.coindesk.com/markets/2024/09/11/indonesian-crypto-exchange-indodax-hacked-for-22m-pauses-activity-before-bigger-hit", "2024-09-11"),
            src("crypto.news", "Indonesian crypto exchange Indodax suffers $22m hack: report", "https://crypto.news/indonesian-crypto-exchange-indodax-suffers-22m-hack-report/", "2024-09-11"),
        ],
    },
    {
        "id": "kreditplus-data-leak-2020",
        "title_en": "KreditPlus customer data leak on RaidForums (~896k)",
        "year": 2020, "sector": "finance", "type": "data_breach", "severity": "sedang",
        "scale": "~896.169 data nasabah",
        "perpetrator": "Pengguna RaidForums 'Megadimarus' dan 'ShinyHunters'.",
        "victim": "~896 ribu nasabah KreditPlus.",
        "pse": "PT Finansia Multi Finance (KreditPlus).",
        "kronologi": "Data ~896.169 nasabah KreditPlus dijual di RaidForums, pertama oleh 'Megadimarus' (27 Juni 2020) lalu 'ShinyHunters' (16 Juli 2020), memuat nama, NIK, email, alamat, TTL, telepon, data pekerjaan dan penjamin. Kominfo dan OJK meminta klarifikasi perusahaan.",
        "akibat": "Eksposur dan penjualan data identitas-finansial hampir 900 ribu nasabah; inkuiri regulator.",
        "nexus": "Akses ilegal ke basis data nasabah; figur ~896 ribu (bukan 'jutaan' seperti kadang disebut).",
        "confidence": "high", "verification_note": "Skala ~896 ribu, bukan jutaan.",
        "sources": [
            src("CNN Indonesia", "Pakar: Data Nasabah KreditPlus Bocor Sejak Juli", "https://www.cnnindonesia.com/teknologi/20200803182106-185-531749/pakar-data-nasabah-kreditplus-bocor-sejak-juli", "2020-08-03"),
            src("Detik Inet", "Kejadian Lagi, 800 Ribu Data Pribadi KreditPlus Dijual Hacker", "https://inet.detik.com/security/d-5119596/kejadian-lagi-800-ribu-data-pribadi-kreditplus-dijual-hacker", "2020"),
        ],
    },
    {
        "id": "cermati-data-breach-2020",
        "title_en": "Cermati fintech aggregator data breach (2.9 million users)",
        "year": 2020, "sector": "finance", "type": "data_breach", "severity": "tinggi",
        "scale": "2,9 juta pengguna",
        "perpetrator": "Tidak dikenal (penjual di forum peretas).",
        "victim": "2,9 juta pengguna Cermati.",
        "pse": "PT Dwi Cermat Indonesia (Cermati.com).",
        "kronologi": "Data 2,9 juta pengguna Cermati dijual ~USD 2.200 di forum peretas, terungkap publik via Teguh Aprianto pada 4 November 2020, memuat nama, email, alamat, telepon, rekening bank, pekerjaan, NPWP, dan NIK. Cermati mengirim peringatan akses tidak sah ke pengguna pada 31 Oktober dan menggandeng BSSN serta pakar eksternal.",
        "akibat": "Eksposur data identitas dan finansial sangat sensitif 2,9 juta pengguna; imbauan reset kata sandi/2FA.",
        "nexus": "Akses tidak sah ke basis data aggregator finansial.",
        "confidence": "high", "verification_note": "",
        "sources": [
            src("KrASIA", "Indonesian fintech Cermati reports data breach, 2.9 million users affected", "https://kr-asia.com/indonesian-fintech-cermati-reports-data-breach-2-9-million-users-affected", "2020-11-04"),
            src("The Jakarta Post", "Fintech Cermati data breach points to urgency for data protection law: Experts", "https://www.thejakartapost.com/news/2020/11/05/fintech-cermati-data-breach-points-to-urgency-for-data-protection-law-experts.html", "2020-11-05"),
        ],
    },
    {
        "id": "bri-life-data-leak-2021",
        "title_en": "BRI Life insurance data leak (~2 million policyholders)",
        "year": 2021, "sector": "finance", "type": "data_breach", "severity": "tinggi",
        "scale": ">2 juta nasabah; ~460.000 dokumen",
        "perpetrator": "Tidak dikenal (penjual di RaidForums).",
        "victim": ">2 juta pemegang polis BRI Life.",
        "pse": "PT Asuransi BRI Life.",
        "kronologi": "Akhir Juli 2021 pengguna RaidForums menawarkan ~460.000 dokumen dari data >2 juta pemegang polis BRI Life seharga ~USD 7.000 disertai video sampel, dilaporkan memuat rincian rekening, salinan KTP, dan data pajak. Hudson Rock menyebut beberapa komputer pegawai BRI/BRI Life terkompromi yang dapat memfasilitasi akses awal.",
        "akibat": "Dugaan eksposur/penjualan dokumen identitas dan finansial pemegang polis; investigasi dengan tim independen.",
        "nexus": "Kompromi endpoint pegawai sebagai kemungkinan vektor; figur dari listing pelaku.",
        "confidence": "high", "verification_note": "Angka 2 juta dari listing pelaku; perusahaan mengonfirmasi investigasi.",
        "sources": [
            src("The Jakarta Post (Reuters)", "BRI Life probes reported data leak of 2 million users", "https://www.thejakartapost.com/news/2021/07/28/bri-life-probes-reported-data-leak-of-2-million-users.html", "2021-07-28"),
            src("Tempo (English)", "BRI Life Customer Data Breach Caused by Hacking Activity", "https://en.tempo.co/read/1488824/bri-life-customer-data-breach-caused-by-hacking-activity", "2021-07"),
        ],
    },
    {
        "id": "adakami-pinjol-conduct-2023",
        "title_en": "AdaKami pinjol abusive debt-collection case and OJK sanction",
        "year": 2023, "sector": "finance", "type": "other", "severity": "sedang",
        "scale": "Tidak diketahui (keluhan peminjam individual; dugaan bunuh diri viral)",
        "perpetrator": "Praktik penagihan AdaKami yang diduga melanggar (debt collector).",
        "victim": "Konsumen/peminjam AdaKami.",
        "pse": "PT Pembiayaan Digital Indonesia (AdaKami).",
        "kronologi": "Pada September 2023, laporan viral menuding seorang peminjam meninggal dunia akibat intimidasi penagih AdaKami, disertai dugaan order fiktif untuk meneror serta bunga/biaya berlebih. OJK memanggil AdaKami (20-21 September 2023), memerintahkan investigasi menyeluruh dan kanal pengaduan, lalu menjatuhkan sanksi surat peringatan atas pelanggaran praktik penagihan.",
        "akibat": "Sanksi administratif OJK; investigasi wajib; pengawasan lebih ketat atas praktik penagihan pinjol.",
        "nexus": "Tata kelola perlindungan konsumen dan praktik penagihan yang lemah; bukan kebocoran data.",
        "confidence": "high",
        "verification_note": "Kasus perilaku/perlindungan konsumen, bukan kebocoran data; dugaan bunuh diri tidak terverifikasi, sanksi OJK terkonfirmasi.",
        "kualifikasi": "Pelanggaran perlindungan konsumen sektor jasa keuangan dan praktik penagihan melawan hukum (UU 4/2023 PPSK & POJK perlindungan konsumen); sanksi administratif OJK.",
        "objek": "Hak, keselamatan, dan martabat konsumen jasa keuangan.",
        "sources": [
            src("OJK (siaran pers resmi)", "OJK Panggil AdaKami Klarifikasi Informasi di Sosmed", "https://ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Pages/OJK-Panggil-AdaKami-Klarifikasi-Informasi-di-Sosmed-.aspx", "2023-09-21"),
            src("Bisnis.com", "Debt Collector Pinjol AdaKami Langgar Peraturan, OJK Sanksi Surat Peringatan", "https://finansial.bisnis.com/read/20231009/563/1702431/debt-collector-dc-pinjol-adakami-langgar-peraturan-ojk-sanksi-surat-peringatan", "2023-10-09"),
        ],
    },
    {
        "id": "bank-jatim-bifast-fraud-2024",
        "title_en": "Bank Jatim BI-Fast payment-system fraud (Rp119.9 billion)",
        "year": 2024, "sector": "finance", "type": "fraud", "severity": "tinggi",
        "scale": "Rp119,96 miliar; 483 transaksi anomali",
        "perpetrator": "Sindikat pencucian uang (4 terdakwa divonis; otak 'Deni' buron).",
        "victim": "Bank Jatim (BPD Jawa Timur).",
        "pse": "PT Bank Pembangunan Daerah Jawa Timur Tbk (Bank Jatim).",
        "kronologi": "Pada 22 Juni 2024, antara ~12.22-15.38 WIB, 483 transaksi BI-Fast anomali senilai ~Rp119,96 miliar menguras dana Bank Jatim. Pelaku memakai rekening atas nama orang lain untuk menampung transfer, lalu mengonversi hasil ke kripto. Empat terdakwa divonis pencucian uang oleh PN Surabaya pada 6 Agustus 2025 (masing-masing 2 tahun); otak 'Deni' buron.",
        "akibat": "Kerugian ~Rp119,9 miliar lewat eksploitasi lapisan fraud BI-Fast; penuntutan pidana; bagian dari gelombang serangan BI-Fast pada bank daerah.",
        "nexus": "Kelemahan di lapisan deteksi fraud peserta (bank), bukan sistem inti BI-Fast (pernyataan BI).",
        "confidence": "high", "verification_note": "BI menyatakan sistem inti BI-Fast tidak dibobol; kelemahan di sisi peserta.",
        "sources": [
            src("Tirto.id", "Alarm Perbankan dari Kasus Pembobolan Kecoh Layanan BI-FAST", "https://tirto.id/alarm-perbankan-dari-kasus-pembobolan-kecoh-layanan-bi-fast-hnX8", "2025"),
            src("Tribun Medan", "Kronologi Empat Sekawan Bobol Bank Jatim Senilai Rp119 Miliar", "https://medan.tribunnews.com/2025/08/07/kronologi-empat-sekawan-bobol-bank-jatim-senilai-rp119-miliar-hanya-divonis-2-tahun-penjara", "2025-08-07"),
        ],
    },
    {
        "id": "bank-dki-bifast-breach-2025",
        "title_en": "Bank DKI / Bank Jakarta BI-Fast cyber breach (Rp227 billion)",
        "year": 2025, "sector": "finance", "type": "fraud", "severity": "tinggi",
        "scale": "~Rp227,1 miliar; 807 transaksi anomali",
        "perpetrator": "Sindikat peretas (terkait gelombang serangan BI-Fast; investigasi berjalan).",
        "victim": "Bank Jakarta (sebelumnya Bank DKI).",
        "pse": "PT Bank Pembangunan Daerah DKI Jakarta (Bank DKI / Bank Jakarta).",
        "kronologi": "Pada 29 Maret 2025 sistem pembayaran Bank DKI dibobol via BI-Fast, menghasilkan 807 transaksi anomali senilai ~Rp227,1 miliar terhadap rekening giro banknya di BNI. Tim monitoring mendeteksi penurunan saldo tajam ~11.00-11.20 WIB dan mengaktifkan protokol 'panic button' pada 11.44 WIB; PPATK membekukan rekening terkait, dengan indikasi serangan sejak 2024.",
        "akibat": "~Rp227 miliar aliran dana ilegal via BI-Fast; pembekuan rekening oleh PPATK; pemicu inspeksi ketahanan siber BPD nasional oleh OJK.",
        "nexus": "Eksploitasi pada lapisan peserta; rangkaian serangan BI-Fast pada bank daerah.",
        "confidence": "high", "verification_note": "Angka disebut 'diduga'; investigasi pidana berjalan; bagian dari estimasi ~Rp800 miliar lintas 8 bank.",
        "sources": [
            src("Tempo", "Sistem Pembayaran Bank DKI Diduga Diretas hingga Rp 200 Miliar Lewat BI Fast", "https://www.tempo.co/hukum/sistem-pembayaran-bank-dki-diduga-diretas-hingga-rp-200-miliar-lewat-bi-fast-2080106", "2025-10-16"),
            src("Tempo (English)", "OJK Inspects Regional Banks After BI-Fast Cyber Breach", "https://en.tempo.co/read/2075045/ojk-inspects-regional-banks-after-bi-fast-cyber-breach", "2025-12-21"),
        ],
    },

    # ===================== E-COMMERCE / TELCO / SOE =====================
    {
        "id": "tokopedia-91m-2020",
        "title_en": "Tokopedia 91 million accounts breached and sold",
        "year": 2020, "sector": "ecommerce_telco", "type": "data_breach", "severity": "kritis",
        "scale": "91 juta akun",
        "perpetrator": "Dijual ShinyHunters di forum/dark web; aktor awal tak disebut.",
        "victim": "91 juta pengguna Tokopedia.",
        "pse": "PT Tokopedia.",
        "kronologi": "Maret 2020 basis data pengguna Tokopedia dicuri. Awal Mei 2020 sebagian ~15 juta data diunggah ke forum dan basis data penuh 91 juta dijual di dark web mulai ~USD 5.000, memuat email, nama, TTL, nomor ponsel, dan kata sandi ter-hash; lebih dari 200.000 kredensial kemudian di-dehash dan disebar.",
        "akibat": "Eksposur massal data 91 juta pengguna; kredensial yang dipecahkan beredar (risiko credential stuffing/phishing). Tokopedia mengimbau reset kata sandi.",
        "nexus": "Akses ilegal ke basis data; mempercepat momentum pengesahan UU PDP.",
        "confidence": "high", "verification_note": "",
        "sources": [
            src("BleepingComputer", "Hacker sells 91 million Tokopedia accounts, cracked passwords shared", "https://www.bleepingcomputer.com/news/security/hacker-sells-91-million-tokopedia-accounts-cracked-passwords-shared/", "2020-05-03"),
            src("HackRead", "Tokopedia hacked - Login details of 91 million users sold on dark web", "https://hackread.com/tokopedia-hacked-login-details-sold-on-dark-web/", "2020"),
        ],
    },
    {
        "id": "bukalapak-13m-2019",
        "title_en": "Bukalapak ~13 million accounts sold by Gnosticplayers",
        "year": 2019, "sector": "ecommerce_telco", "type": "data_breach", "severity": "tinggi",
        "scale": "~13 juta akun (12,9-13,4 juta)",
        "perpetrator": "Peretas Gnosticplayers.",
        "victim": "~13 juta pengguna Bukalapak.",
        "pse": "PT Bukalapak.com.",
        "kronologi": "Maret 2019 Gnosticplayers menjual batch keempat di Dream Market; ~13 juta dari 26 juta data berasal dari Bukalapak (pelanggaran berasal 2017). Data memuat username, nama, email, hash kata sandi (bcrypt/SHA-512 ber-salt), dan riwayat belanja, ditawarkan ~1,24 BTC (~USD 5.000).",
        "akibat": "Eksposur ~13 juta kredensial/detail pribadi; data terindeks Have I Been Pwned (18 April 2019).",
        "nexus": "Pelanggaran data cadangan 2017 yang baru dijual 2019; hash kata sandi membatasi (tak meniadakan) risiko.",
        "confidence": "high", "verification_note": "Pelanggaran berasal 2017; dijual/diumumkan Maret 2019.",
        "sources": [
            src("KrASIA (mengutip ZDNet)", "Hacker sells 26 million user records on the dark web, including 13 million from Bukalapak", "https://kr-asia.com/hacker-sells-26-million-user-records-on-the-dark-web-including-13-million-from-indonesian-e-commerce-unicorn-bukalapak", "2019-03"),
            src("Have I Been Pwned", "Bukalapak Data Breach", "https://haveibeenpwned.com/breach/Bukalapak", "2019-04-18"),
        ],
    },
    {
        "id": "bhinneka-1-2m-2020",
        "title_en": "Bhinneka.com ~1.2 million accounts dumped online",
        "year": 2020, "sector": "ecommerce_telco", "type": "data_breach", "severity": "tinggi",
        "scale": "~1.262.300 akun",
        "perpetrator": "Peretas ShinyHunters.",
        "victim": "~1,26 juta pelanggan Bhinneka.com.",
        "pse": "PT Bhinneka Mentari Dimensi.",
        "kronologi": "Bhinneka.com dibobol pada 27 Januari 2020; Juli 2020 basis data (~1,26 juta data, dua berkas SQL) disebar cuma-cuma. Data memuat ID, nama, email, gender, telepon, hash kata sandi ber-salt, alamat, TTL, ID media sosial, dan log login terakhir.",
        "akibat": "~1,26 juta data pelanggan tersedia publik (risiko phishing/penipuan identitas); ditambahkan ke Have I Been Pwned.",
        "nexus": "Akses ilegal ke basis data; eksposur ke publik tanpa monetisasi.",
        "confidence": "high", "verification_note": "Pembobolan Jan 2020; penyebaran Juli 2020.",
        "sources": [
            src("HackRead", "Database of Indonesian store Bhinneka dumped with 1 million+ accounts", "https://hackread.com/indonesia-bhinneka-database-dumped-1-million-accounts/", "2020-07-15"),
            src("The Jakarta Post", "E-commerce platform Bhinneka.com reported to be latest target of data theft", "https://www.thejakartapost.com/news/2020/05/13/e-commerce-platform-bhinneka-com-reported-to-be-latest-target-of-data-theft.html", "2020-05-13"),
        ],
    },
    {
        "id": "lazada-redmart-1-1m-2020",
        "title_en": "Lazada RedMart 1.1 million accounts breached (regional)",
        "year": 2020, "sector": "ecommerce_telco", "type": "data_breach", "severity": "tinggi",
        "scale": "1,1 juta akun",
        "perpetrator": "Tidak dikenal (broker data di forum peretas).",
        "victim": "1,1 juta pelanggan RedMart.",
        "pse": "Lazada Group (Alibaba).",
        "kronologi": "Pada 29 Oktober 2020 Lazada menemukan akses ilegal ke basis data lama layanan grosir RedMart. >1,1 juta akun dijual ~USD 1.500 di forum peretas, memuat email, hash kata sandi SHA-1, nama, telepon, alamat surat/tagihan, serta sebagian nomor kartu kredit dengan masa berlaku. Lazada menyebut data berusia >18 bulan.",
        "akibat": "1,1 juta data pelanggan terekspos; reset kata sandi dipaksakan dan dilaporkan ke PDPC Singapura.",
        "nexus": "Basis data legacy yang tak dipensiunkan aman; insiden berlokus Singapura (RedMart), grup beroperasi lintas ASEAN termasuk Indonesia.",
        "confidence": "high",
        "verification_note": "Insiden regional: RedMart berbasis Singapura; ditandai sebagai rujukan regional, BUKAN insiden domestik Indonesia.",
        "sources": [
            src("BleepingComputer", "Over 1M Lazada RedMart accounts sold online after data breach", "https://www.bleepingcomputer.com/news/security/over-1m-lazada-redmart-accounts-sold-online-after-data-breach/", "2020-10-30"),
            src("CNBC", "Alibaba-owned Lazada suffers data breach for its grocery delivery business in Singapore", "https://www.cnbc.com/2020/11/02/alibaba-owned-lazada-suffers-data-breach-on-redmart.html", "2020-11-02"),
        ],
    },
    {
        "id": "indihome-browsing-26m-2022",
        "title_en": "IndiHome 26.7 million subscriber browsing-history leak",
        "year": 2022, "sector": "ecommerce_telco", "type": "data_breach", "severity": "kritis",
        "scale": "26.730.798 data riwayat browsing",
        "perpetrator": "Peretas 'Bjorka'.",
        "victim": "Pelanggan IndiHome.",
        "pse": "PT Telkom Indonesia (Persero) Tbk.",
        "kronologi": "Agustus 2022 'Bjorka' memuat dataset 26.730.798 riwayat browsing pelanggan IndiHome (Agu 2018-Nov 2019) di BreachForums, mencakup tanggal, domain, platform, peramban, URL, plus NIK, email, telepon, dan gender. Kominfo memanggil Telkom; Telkom/IndiHome tidak mengonfirmasi kebocoran.",
        "akibat": "Eksposur riwayat browsing bersanding data identitas (profiling, surveilans, penipuan tertarget); investigasi pemerintah.",
        "nexus": "Penyimpanan riwayat browsing terkait identitas yang tidak terlindungi; Telkom membantah.",
        "confidence": "high", "verification_note": "Telkom membantah; jumlah/field konsisten lintas Tempo, Kompas, CNBC Indonesia, DataBreaches.net.",
        "sources": [
            src("Tempo (English)", "Communication Ministry Studying Report of IndiHome Data Leak", "https://en.tempo.co/read/1625194/communication-ministry-studying-report-of-indihome-data-leak", "2022-08-21"),
            src("Marketing-Interactive", "Indonesian communications ministry investigates data leak of IndiHome users", "https://www.marketing-interactive.com/done-indonesian-communications-ministry-investigates-leaked-indihome-users-data-on-illegal-websites", "2022-08-22"),
        ],
    },
    {
        "id": "myindihome-35m-2023",
        "title_en": "MyIndiHome 35 million customer records leaked",
        "year": 2023, "sector": "ecommerce_telco", "type": "data_breach", "severity": "tinggi",
        "scale": "~35.900.002 data (klaim)",
        "perpetrator": "Peretas 'Bjorka'.",
        "victim": "Pelanggan aplikasi MyIndiHome.",
        "pse": "PT Telkom Indonesia (Persero) Tbk.",
        "kronologi": "Awal Juli 2023 'Bjorka' menawarkan ~35,9 juta data aplikasi MyIndiHome (~7 GB terkompres), tertandai 3 Juli 2023, diklaim memuat email, telepon, nomor pelanggan, NIK, nama, jenis perangkat, alamat, dan IP, seharga ~USD 5.000. Telkom Group menyatakan data MyIndiHome aman dan tidak menemukan serangan server.",
        "akibat": "Dugaan eksposur ~35 juta data identitas pelanggan; pemanggilan Telkom oleh Kominfo dan koordinasi BSSN.",
        "nexus": "Telkom membantah; figur dari listing 'Bjorka' dan analisis CISSReC.",
        "confidence": "medium", "verification_note": "Telkom membantah; skala dari klaim pelaku; berbeda dari insiden riwayat browsing 2022.",
        "sources": [
            src("Kompas.id (English)", "Telkom Group Claims No Customer Data Leakage", "https://www.kompas.id/baca/english/2023/07/04/en-telkom-group-klaim-tidak-ada-kebocoran-data-pelanggan", "2023-07-04"),
            src("Selular.ID", "Telkom Buka Suara Terkait Kebocoran Data 35 Juta Pelanggan IndiHome", "https://selular.id/2023/07/telkom-buka-suara-terkait-kebocoran-data-35-juta-pelanggan-indihome/", "2023-07"),
        ],
    },
    {
        "id": "pln-customer-data-leak-2022",
        "title_en": "PLN electricity customer data of 17 million listed for sale",
        "year": 2022, "sector": "ecommerce_telco", "type": "data_breach", "severity": "tinggi",
        "scale": ">17 juta pelanggan",
        "perpetrator": "Tidak dikenal (pengguna 'loliyta'; dikaitkan ke Bjorka, tak terkonfirmasi).",
        "victim": ">17 juta pelanggan listrik PLN.",
        "pse": "PT Perusahaan Listrik Negara (PLN).",
        "kronologi": "Agustus 2022 data >17 juta pelanggan PLN ditawarkan di forum peretas (nama, alamat, ID pelanggan, nomor meteran, konsumsi kWh). PLN menyatakan data adalah salinan dashboard publik, bukan sistem transaksi langsungnya; Kominfo dan BSSN membuka investigasi.",
        "akibat": "Eksposur nama, alamat, dan data konsumsi 17 juta+ rumah tangga; menambah desakan RUU PDP.",
        "nexus": "PLN membantah pembobolan sistem inti; atribusi aktor tidak pasti.",
        "confidence": "high", "verification_note": "PLN menyebut salinan dashboard publik; atribusi pelaku tak pasti.",
        "sources": [
            src("Coconuts Jakarta", "More than 17 million exposed as breached PLN data listed for sale on hacker forum", "https://coconuts.co/jakarta/news/more-than-17-million-exposed-as-breached-pln-data-listed-for-sale-on-hacker-forum/", "2022-08-19"),
            src("The Jakarta Post", "PLN, IndiHome suspected data breaches underline urgency of PDP bill", "https://www.thejakartapost.com/business/2022/08/25/pln-indihome-suspected-data-breaches-underline-urgency-of-pdp-bill.html", "2022-08-25"),
        ],
    },
    {
        "id": "mypertamina-44m-2022",
        "title_en": "MyPertamina fuel-payment platform breach (44 million records)",
        "year": 2022, "sector": "ecommerce_telco", "type": "data_breach", "severity": "tinggi",
        "scale": "44 juta data / ~6 juta email unik",
        "perpetrator": "Tidak dikenal (klaim beredar atas nama 'Bjorka').",
        "victim": "Pengguna layanan pembayaran BBM MyPertamina.",
        "pse": "PT Pertamina (Persero).",
        "kronologi": "November 2022 dataset yang diatribusikan ke MyPertamina bocor dalam format CSV, memuat ~44 juta data dan ~6 juta email unik, plus nama, TTL, gender, alamat, telepon, dan riwayat pembelian. Have I Been Pwned mengindeks pelanggaran ini (ditambahkan Januari 2024).",
        "akibat": "Eksposur data pribadi dan transaksional jutaan pengguna pembayaran BBM.",
        "nexus": "Akses ilegal/eksfiltrasi; atribusi 'Bjorka' dari klaim, tak terkonfirmasi independen.",
        "confidence": "high", "verification_note": "Terindeks HIBP (tanggal Nov 2022); atribusi 'Bjorka' tak terkonfirmasi.",
        "sources": [
            src("Have I Been Pwned", "MyPertamina Data Breach (44M records, 6M emails)", "https://haveibeenpwned.com/Breach/MyPertamina", "2024-01-27"),
            src("Tempo (English)", "Bjorka Returns, Leaks 44 Million Data of MyPertamina", "https://en.tempo.co/read/1655407/bjorka-returns-leaks-44-million-data-of-mypertamina", "2022-11"),
        ],
    },
    {
        "id": "jasamarga-jmto-breach-2022",
        "title_en": "Toll-road operator Jasa Marga (JMTO) breached by DESORDEN",
        "year": 2022, "sector": "ecommerce_telco", "type": "data_breach", "severity": "sedang",
        "scale": "252 GB dari 5 server (data korporat & karyawan)",
        "perpetrator": "Kelompok DESORDEN.",
        "victim": "PT Jasamarga Tollroad Operator (JMTO).",
        "pse": "PT Jasa Marga (Persero) Tbk.",
        "kronologi": "Pada 25 Agustus 2022 DESORDEN mengumumkan membobol JMTO dan mengeksfiltrasi ~252 GB dari lima server. Setelah Jasa Marga menyatakan tak ada data pelanggan, DESORDEN meninjau dan memastikan data adalah informasi korporat dan karyawan. Jasa Marga mematikan server terdampak dan memigrasikan sistem.",
        "akibat": "Kompromi data korporat dan karyawan operator tol terbesar; server terdampak dimatikan.",
        "nexus": "Akses ilegal ke server korporat; konfirmasi pelaku bahwa data pelanggan tidak terdampak.",
        "confidence": "high", "verification_note": "Jasa Marga menyatakan tak ada data pelanggan; dikuatkan pernyataan DESORDEN.",
        "sources": [
            src("CloudSEK", "Indonesia's Largest Tollway Operator PT Jasamarga Breached by the Desorden Group", "https://www.cloudsek.com/threatintelligence/indonesias-largest-tollway-operator-pt-jasamarga-breached-by-the-desorden-group", "2022-08"),
            src("Tempo (English)", "Jasa Marga Subsidiary Clarifies Alleged Hacking, Data Leak", "https://en.tempo.co/read/1626771/jasa-marga-subsidiary-clarifies-alleged-hacking-data-leak", "2022-08"),
        ],
    },
    {
        "id": "kai-stormous-ransomware-2024",
        "title_en": "PT KAI (Indonesian Railways) Stormous ransomware claim",
        "year": 2024, "sector": "ecommerce_telco", "type": "ransomware", "severity": "sedang",
        "scale": "Tidak terverifikasi (klaim data pegawai, pelanggan, pajak, korporat)",
        "perpetrator": "Kelompok ransomware Stormous (klaim akses via VPN kredensial pegawai).",
        "victim": "PT Kereta Api Indonesia (KAI).",
        "pse": "PT Kereta Api Indonesia (Persero).",
        "kronologi": "Januari 2024 Stormous mengklaim membobol PT KAI via akses VPN memakai kredensial pegawai dan mencuri data pegawai, pelanggan, pajak, dan korporat, menuntut ~11,69 BTC (~Rp7,7 miliar) dengan ancaman publikasi 15 hari. KAI membantah bukti kebocoran data penumpang dan menyatakan menyelidiki.",
        "akibat": "Tuntutan pemerasan dan ancaman publikasi data internal/pelanggan; KAI berinvestigasi.",
        "nexus": "Klaim akses via kredensial VPN; lingkup pencurian belum terverifikasi (KAI membantah).",
        "confidence": "medium", "verification_note": "KAI membantah; skala dari klaim pelaku.",
        "sources": [
            src("ICSSTRIVE", "Ransomware Attack at Indonesian Railway company", "https://icsstrive.com/incident/ransomware-attack-at-indonesian-railway-company/", "2024"),
            src("VOI", "Denying Passenger Data Hacked, PT KAI Conducts Investigation", "https://voi.id/en/news/348398", "2024-01"),
        ],
    },
    {
        "id": "malindo-lionair-30m-2019",
        "title_en": "Lion Air Group (Malindo Air) passenger data of ~30 million leaked",
        "year": 2019, "sector": "ecommerce_telco", "type": "data_breach", "severity": "tinggi",
        "scale": ">30 juta data penumpang",
        "perpetrator": "Tidak dikenal (server cloud salah konfigurasi).",
        "victim": "Penumpang Malindo Air / Thai Lion Air (Lion Air Group).",
        "pse": "Lion Air Group / Malindo Air (hosting via AWS dan platform GoQuo).",
        "kronologi": "September 2019 data penumpang anak usaha Lion Air Group, Malindo Air, bocor ke forum, mengeksposur rincian paspor, alamat, dan telepon (data pembayaran dilaporkan tidak terdampak). Peneliti Kaspersky menemukan >30 juta data maskapai di forum dengan dugaan server cloud salah konfigurasi. Malindo mengonfirmasi dan memberi tahu regulator Malaysia serta menggandeng AWS/GoQuo.",
        "akibat": "Eksposur massal PII penumpang internasional termasuk rincian paspor; notifikasi regulator dan investigasi forensik.",
        "nexus": "Server cloud salah konfigurasi sebagai penyebab; lintas-batas (grup berpusat di Indonesia, anak usaha Malaysia).",
        "confidence": "high", "verification_note": "Lintas-batas; CEO menyebut jumlah pasti tak diketahui, peneliti menyebut 30 juta+.",
        "sources": [
            src("South China Morning Post", "Malindo Air confirms data breach, exposing millions of passengers' personal data", "https://www.scmp.com/news/asia/southeast-asia/article/3027780/malindo-air-confirms-data-breach-exposing-millions", "2019-09-19"),
        ],
    },

    # ===================== AI MISUSE =====================
    {
        "id": "prabowo-deepfake-aid-scam-2024",
        "title_en": "Deepfake videos of President Prabowo & ministers in nationwide 'aid' fraud",
        "year": 2024, "sector": "ai_misuse", "type": "ai_deepfake", "severity": "tinggi",
        "scale": "~100 korban di 20 dari 38 provinsi; ~Rp65 juta (satu sel)",
        "perpetrator": "Tersangka 'JS' (25, Lampung) dan 'AMA' (ditangkap, disidang); disebut bagian sindikat lebih luas.",
        "victim": "Masyarakat umum; figur yang dipalsukan: Presiden Prabowo, Wapres Gibran, Menkeu Sri Mulyani.",
        "pse": "Platform media sosial (Instagram, TikTok, Facebook, WhatsApp).",
        "kronologi": "Mulai ~Desember 2024 penipu menyebar video deepfake AI yang menampilkan Presiden Prabowo Subianto dan pejabat lain seolah menawarkan bantuan pemerintah. Korban diarahkan ke nomor WhatsApp dan diminta 'biaya administrasi' Rp250.000-1.000.000 untuk bantuan fiktif. Bareskrim Polri menangkap pelaku 25 tahun (JS) di Lampung pada 4 Februari 2025; JS dan AMA diserahkan ke jaksa April 2025.",
        "akibat": "~100 korban di 20 provinsi tertipu hingga puluhan juta rupiah; dua tersangka didakwa dan disidang.",
        "nexus": "Ketiadaan kewajiban pelabelan/deteksi konten sintetis dan guardrails memperparah penyebaran penipuan deepfake.",
        "confidence": "high", "verification_note": "Figur bervariasi antar sumber (satu sel ~Rp65 juta dari ~100 korban; sel lain ~Rp30 juta dari ~11 korban).",
        "sources": [
            src("Anadolu Agency", "2 Indonesians to face trial over deepfake videos involving president", "https://www.aa.com.tr/en/asia-pacific/2-indonesians-to-face-trial-over-deepfake-videos-involving-president/3548523", "2025-04-25"),
            src("AFP / France24", "Indonesians swindled by scams using President Prabowo deepfakes", "https://www.france24.com/en/live-news/20250302-indonesians-swindled-by-scams-using-president-prabowo-deepfakes", "2025-03-02"),
        ],
    },
    {
        "id": "undip-deepfake-ncii-2025",
        "title_en": "Undip student created AI deepfake pornography of schoolmates & teachers",
        "year": 2025, "sector": "ai_misuse", "type": "ai_ncii", "severity": "kritis",
        "scale": "~30 korban (termasuk minor 16-19 th); ribuan berkas ditemukan",
        "perpetrator": "Chiko Radityatama Agung Putra, mahasiswa hukum Universitas Diponegoro (Undip), Semarang.",
        "victim": "Siswi, alumni, dan guru perempuan SMA Negeri 11 Semarang.",
        "pse": "Platform X (Twitter).",
        "kronologi": "Seorang mahasiswa hukum Undip diam-diam memotret siswi dan guru perempuan SMAN 11 Semarang, lalu memakai alat deepfake/face-swap AI untuk membuat citra pornografi non-konsensual dan video berjudul 'Skandal Smanse' yang diunggah ke X. Polda Jateng menyelidiki; ia ditetapkan tersangka dan ditahan pada 10-17 November 2025, dengan ribuan berkas ditemukan di penyimpanannya.",
        "akibat": "~30 korban teridentifikasi (sebagian minor); tersangka ditahan dan dijerat UU Pornografi, UU ITE, dan KUHP, terancam 9-12 tahun.",
        "nexus": "Aksesibilitas alat AI generatif tanpa pengaman memungkinkan produksi citra intim non-konsensual massal.",
        "confidence": "high", "verification_note": "Kasus AI-NCII bernama dan dituntut terkuat; ancaman pidana berbeda antar artikel (9-12 tahun); sebagian korban minor.",
        "sources": [
            src("Tempo", "Polda Jateng Tahan Mahasiswa Undip Pembuat Deepfake Porn", "https://www.tempo.co/hukum/polda-jateng-tahan-mahasiswa-undip-pembuat-deepfake-porn-2090387", "2025-11-17"),
            src("Kompas", "Victims of 'Deepfake' Pornography in Semarang Demand That the Perpetrator Be Named a Suspect", "https://www.kompas.id/artikel/en-korban-konten-pornografi-deepfake-di-semarang-tuntut-pelaku-jadi-tersangka", "2025-11-10"),
        ],
    },
    {
        "id": "suharto-deepfake-golkar-2024",
        "title_en": "AI deepfake 'resurrecting' Suharto used to urge votes for Golkar",
        "year": 2024, "sector": "ai_misuse", "type": "ai_disinformation", "severity": "tinggi",
        "scale": "Viral di X menjelang Pemilu 14 Feb 2024",
        "perpetrator": "Partai Golkar; diunggah wakil ketua umum Erwin Aksa.",
        "victim": "Pemilih Indonesia (likeness sintetis mantan Presiden Soeharto yang telah wafat).",
        "pse": "Platform X (Twitter).",
        "kronologi": "Pada 6 Januari 2024 Erwin Aksa mengunggah ke X deepfake AI yang merekonstruksi wajah dan suara tiruan mendiang Soeharto (wafat 2008), di mana 'Soeharto' sintetis mengajak memilih dan mendukung Golkar. Klip menyebar luas menjelang Pemilu Presiden 14 Februari 2024.",
        "akibat": "Dikritik luas sebagai deepfake elektoral manipulatif atas figur otoriter yang telah wafat; menjadi rujukan internasional; tanpa tindakan hukum.",
        "nexus": "Ketiadaan aturan deepfake politik/pelabelan membuat konten sintetis figur wafat beredar dalam kampanye.",
        "confidence": "high", "verification_note": "Angka tayangan (~4,7 juta) beredar tetapi tidak dikonfirmasi sumber yang ter-fetch, sehingga tidak dicantumkan.",
        "sources": [
            src("CNN", "AI 'resurrects' long dead dictator in murky new era of deepfake electioneering", "https://www.cnn.com/2024/02/12/asia/suharto-deepfake-ai-scam-indonesia-election-hnk-intl/index.html", "2024-02-12"),
            src("Futurism", "AI Used to Resurrect Dead Dictator to Sway Election", "https://futurism.com/the-byte/ai-resurrect-dead-dictator", "2024-02-13"),
        ],
    },
    {
        "id": "election-candidate-deepfakes-2024",
        "title_en": "Deepfake videos of presidential candidates before the 2024 election",
        "year": 2024, "sector": "ai_misuse", "type": "ai_disinformation", "severity": "sedang",
        "scale": "Beredar di TikTok jelang Pemilu 14 Feb 2024; menimpa beberapa kandidat",
        "perpetrator": "Tidak dikenal (diunggah tanpa label AI).",
        "victim": "Capres Prabowo Subianto dan Anies Baswedan (serta tiket lain).",
        "pse": "Platform TikTok.",
        "kronologi": "Menjelang Pemilu 14 Februari 2024, video deepfake AI tanpa label yang menampilkan capres Prabowo dan Anies seolah fasih berbahasa Arab beredar di TikTok. Pelaporan menyebut deepfake atas ketiga tiket capres turut menyebar dengan potensi menyesatkan pemilih.",
        "akibat": "Disinformasi yang menyasar pemilih saat pemilu nasional; ditandai peneliti dan pemeriksa fakta; sebagian konten dihapus platform.",
        "nexus": "Pola (bukan insiden tunggal) yang menandai kerentanan ruang informasi elektoral terhadap konten sintetis.",
        "confidence": "medium",
        "verification_note": "Pola multi-kandidat, bukan satu kasus yang dituntut; klaim '1,7 juta tayangan/3 hari' tidak terkonfirmasi, sehingga dikecualikan.",
        "record_type": "pattern_aggregate",
        "sources": [
            src("Context / Thomson Reuters Foundation", "Deepfakes deceive voters from India to Indonesia before elections", "https://www.context.news/ai/deepfakes-deceive-voters-from-india-to-indonesia-before-elections", "2024-01-03"),
        ],
    },
    {
        "id": "sri-mulyani-deepfake-2025",
        "title_en": "Deepfake of Finance Minister Sri Mulyani fabricating a remark",
        "year": 2025, "sector": "ai_misuse", "type": "ai_disinformation", "severity": "tinggi",
        "scale": "Beredar luas di media sosial beberapa hari, pertengahan Agustus 2025",
        "perpetrator": "Tidak dikenal.",
        "victim": "Menteri Keuangan Sri Mulyani Indrawati / Kementerian Keuangan.",
        "pse": "Media sosial (platform tidak disebut spesifik).",
        "kronologi": "Pertengahan Agustus 2025 sebuah deepfake memanipulasi rekaman asli pidato Menkeu Sri Mulyani (7 Agustus 2025 di forum ITB) sehingga ia seolah menyebut guru 'beban negara'. Biro komunikasi Kemenkeu (Deni Surjantoro) memastikan klip adalah deepfake AI dari potongan tak utuh; akun resmi Indonesia.go.id juga membantahnya.",
        "akibat": "Serangan reputasi terhadap menteri senior di periode politik tegang; diperingatkan berpotensi menimbulkan keonaran; potensi penjeratan UU ITE/pidana.",
        "nexus": "Kemudahan manipulasi rekaman publik menjadi deepfake; ketiadaan deteksi/pelabelan memperparah penyebaran.",
        "confidence": "high", "verification_note": "Sebagian komentar mengaitkan ke kerusuhan Agt/Sep 2025, namun kausalitas langsung tidak ditegakkan sumber, sehingga tidak dimasukkan.",
        "sources": [
            src("Metro TV News", "Sri Mulyani Diterjang Deepfake, Pembuat dan Penyebar Bisa Dijerat Hukum", "https://www.metrotvnews.com/read/N4EC4wqR-sri-mulyani-diterjang-deepfake-pembuat-dan-penyebar-bisa-dijerat-hukum-pakai-aturan-ini", "2025-08-20"),
        ],
    },
    {
        "id": "ojk-ai-voice-deepfake-fraud-2025",
        "title_en": "OJK-documented wave of AI voice-cloning & deepfake financial fraud",
        "year": 2025, "sector": "ai_misuse", "type": "ai_voice_fraud", "severity": "kritis",
        "scale": "Rp7,8 triliun (~USD 474 juta) kerugian Nov 2024-Nov 2025; 70.000+ laporan per Agt 2025",
        "perpetrator": "Beragam aktor penipuan terorganisir (tak bernama).",
        "victim": "Nasabah bank/fintech dan masyarakat umum.",
        "pse": "Bank dan platform fintech (penyedia eKYC); OJK (regulator).",
        "kronologi": "OJK melaporkan dua metode penipuan AI paling umum di Indonesia adalah voice cloning (meniru suara kerabat/kolega/pejabat untuk meminta transfer mendesak) dan deepfake video, termasuk menembus pengecekan liveness biometrik/eKYC. Kerugian mencapai Rp7,8 triliun antara November 2024-November 2025, dengan 70.000+ laporan penipuan ber-AI per Agustus 2025.",
        "akibat": "Ratusan juta dolar AS kerugian konsumen; OJK dan Komdigi menerbitkan panduan tata kelola AI dan protokol biometrik yang diperkuat.",
        "nexus": "Pola/agregat yang menandai matangnya penyalahgunaan voice cloning dan eKYC sintetis serta celah regulasi.",
        "confidence": "high",
        "verification_note": "Statistik resmi OJK; total Rp7,8 triliun mencakup seluruh penipuan ber-AI (voice + deepfake), bukan voice cloning saja. Agregat, bukan insiden tunggal.",
        "record_type": "pattern_aggregate",
        "sources": [
            src("Fintech News Indonesia", "OJK Warns of Rising AI Scams as Losses Hit Rp7.8 Trillion", "https://fintechnews.id/108965/ai/ojk-ai-scams/", "2025-11-18"),
            src("Jakarta Globe", "Online Scams Drain $474 Million from Indonesians in a Year, OJK Says", "https://jakartaglobe.id/news/online-scams-drain-474-million-from-indonesians-in-a-year-ojk-says", "2025-11"),
        ],
    },
]


def build():
    incidents = []
    for r in RECORDS:
        defaults = TYPE_DEFAULTS.get(r["type"], TYPE_DEFAULTS["other"])
        kualifikasi = r.get("kualifikasi", defaults["kualifikasi"])
        objek = r.get("objek", defaults["objek"])
        incidents.append({
            "id": r["id"],
            "title_en": r["title_en"],
            "peristiwa_hukum_kronologi": r["kronologi"],
            "kualifikasi_peristiwa": kualifikasi,
            "pemetaan_fakta_hukum": {
                "subjek_pelaku": r["perpetrator"],
                "subjek_korban": r["victim"],
                "subjek_pse": r["pse"],
                "objek_hukum": objek,
                "akibat_hukum": r["akibat"],
                "nexus_kausalitas": r["nexus"],
            },
            "subjek_hukum": build_subjek_hukum(
                r["type"], {"pelaku": r["perpetrator"], "korban": r["victim"], "pse": r["pse"]}, "id"),
            "severity": r["severity"],
            "year": r["year"],
            "type": r["type"],
            "sector": r["sector"],
            "scale": r["scale"],
            "record_type": r.get("record_type", "single_incident"),
            "confidence": r["confidence"],
            "verification_note": r.get("verification_note", ""),
            "sources": r["sources"],
        })

    by_sector = Counter(i["sector"] for i in incidents)
    by_type = Counter(i["type"] for i in incidents)
    by_conf = Counter(i["confidence"] for i in incidents)
    by_rectype = Counter(i["record_type"] for i in incidents)
    n_single = by_rectype.get("single_incident", 0)

    data = {
        "metadata": {
            "title": "Dataset Insiden Keamanan Siber & Penyalahgunaan AI di Indonesia",
            "version": "6.0",
            "compiled": "2026-06-14",
            "n_incidents": len(incidents),
            "n_single_incidents": n_single,
            "n_pattern_aggregate": by_rectype.get("pattern_aggregate", 0),
            "methodology": (
                "Insiden dikompilasi dari peristiwa yang dilaporkan publik dan disitasi "
                "secara individual (media nasional & internasional, vendor keamanan, vpnMentor, "
                "CISSReC, OJK/BSSN, pernyataan resmi pemerintah). Setiap rekaman membawa sitasi "
                "sumbernya sendiri, peringkat keyakinan (confidence), dan record_type. Field "
                "kualifikasi_peristiwa, objek_hukum, dan nexus_kausalitas merupakan ANALISIS "
                "doktrinal penulis yang dilandaskan pada fakta yang dilaporkan, bukan klaim sumber."
            ),
            "data_integrity_statement": (
                "Dataset ini HANYA memuat insiden nyata yang masing-masing bersumber. Tidak ada "
                "rekaman sintetis, hasil pembangkitan acak, atau ekstrapolasi. Angka yang berasal "
                "dari listing pelaku ancaman atau sumber tunggal ditandai pada field "
                "verification_note dan confidence tiap rekaman. File ini menggantikan pipeline "
                "lama generate_100_incidents.py + rename_incidents.py yang memfabrikasi 95 dari 100 "
                "rekaman; pipeline tersebut telah dipensiunkan."
            ),
            "limitations": (
                "Dataset bersifat purposive (bukan sampel acak/lengkap) dan condong pada insiden "
                "berskala besar yang terliput media; insiden kecil/tak dilaporkan kurang "
                "terwakili. Sebagian skala (mis. BPJS 279 juta, NPWP 6 juta) berasal dari klaim "
                "pelaku/penjual dan belum diaudit independen. Dua rekaman bertipe pattern_aggregate "
                "(statistik penipuan AI OJK; deepfake pemilu 2024) merepresentasikan fenomena "
                "agregat, bukan satu insiden diskret."
            ),
            "sources_note": "Lihat field 'sources' pada tiap insiden untuk sitasi lengkap (outlet, judul, URL, tanggal).",
        },
        "incidents": incidents,
    }

    os.makedirs(os.path.dirname(OUT_PATH), exist_ok=True)
    with open(OUT_PATH, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

    # ── English dataset (same REAL incidents; translated if overrides exist) ──
    en_map = {}
    if os.path.exists(EN_OVERRIDES_PATH):
        with open(EN_OVERRIDES_PATH, encoding="utf-8") as f:
            for o in json.load(f):
                en_map[o["id"]] = o
    en_incidents = []
    for inc in incidents:
        o = en_map.get(inc["id"], {})
        title = o.get("title_en") or inc.get("title_en") or inc["id"]
        en_incidents.append({
            "id": inc["id"],
            "title_en": inc.get("title_en", title),
            # Fall back to Indonesian text if a translation is not yet available.
            "peristiwa_hukum_kronologi": o.get("kronologi_en", inc["peristiwa_hukum_kronologi"]),
            "kualifikasi_peristiwa": o.get("kualifikasi_en", inc["kualifikasi_peristiwa"]),
            "pemetaan_fakta_hukum": {
                "subjek_pelaku": o.get("pelaku_en", inc["pemetaan_fakta_hukum"]["subjek_pelaku"]),
                "subjek_korban": o.get("korban_en", inc["pemetaan_fakta_hukum"]["subjek_korban"]),
                "subjek_pse": o.get("pse_en", inc["pemetaan_fakta_hukum"]["subjek_pse"]),
                "objek_hukum": o.get("objek_en", inc["pemetaan_fakta_hukum"]["objek_hukum"]),
                "akibat_hukum": o.get("akibat_en", inc["pemetaan_fakta_hukum"]["akibat_hukum"]),
                "nexus_kausalitas": o.get("nexus_en", inc["pemetaan_fakta_hukum"]["nexus_kausalitas"]),
            },
            "subjek_hukum": build_subjek_hukum(inc["type"], {
                "pelaku": o.get("pelaku_en", inc["pemetaan_fakta_hukum"]["subjek_pelaku"]),
                "korban": o.get("korban_en", inc["pemetaan_fakta_hukum"]["subjek_korban"]),
                "pse": o.get("pse_en", inc["pemetaan_fakta_hukum"]["subjek_pse"])}, "en"),
            "severity": inc["severity"],
            "year": inc["year"],
            "type": inc["type"],
            "sector": inc["sector"],
            "scale": o.get("scale_en", inc["scale"]),
            "record_type": inc["record_type"],
            "confidence": inc["confidence"],
            "verification_note": o.get("verification_note_en", inc["verification_note"]),
            "sources": inc["sources"],
        })
    en_meta = dict(data["metadata"])
    en_meta["title"] = "Dataset of Cybersecurity & AI-Misuse Incidents in Indonesia"
    en_meta["language"] = "en"
    en_meta["translation_status"] = (
        "fully translated" if en_map else
        "English titles only; detail fields fall back to Indonesian until "
        "_en_overrides.json is generated"
    )
    with open(EN_OUT_PATH, "w", encoding="utf-8") as f:
        json.dump({"metadata": en_meta, "incidents": en_incidents}, f, ensure_ascii=False, indent=2)

    print(f"✅ Wrote {len(incidents)} REAL, sourced incidents -> {OUT_PATH}")
    print(f"✅ Wrote English dataset ({en_meta['translation_status']}) -> {EN_OUT_PATH}")
    print(f"   record_type : {dict(by_rectype)}")
    print(f"   confidence  : {dict(by_conf)}")
    print(f"   by sector   : {dict(by_sector)}")
    print(f"   by type     : {dict(by_type)}")
    n_no_src = sum(1 for i in incidents if not i["sources"])
    print(f"   incidents without a source: {n_no_src} (must be 0)")
    total_src = sum(len(i["sources"]) for i in incidents)
    print(f"   total citations: {total_src} (avg {total_src/len(incidents):.1f} per incident)")


if __name__ == "__main__":
    build()
