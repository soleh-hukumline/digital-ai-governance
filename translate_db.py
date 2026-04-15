import json
import os

with open('data/incidents/indonesia_incidents.json', 'r') as f:
    data = json.load(f)

# Hardcoded dictionary for exact match / substring replacement
dict_en = {
    # Kualifikasi
    "Tindak Pidana Siber (Illegal Access / Peretasan) & Perbuatan Melawan Hukum (Kelalaian Administrasi)": "Cybercrime (Illegal Access / Hacking) & Unlawful Act (Administrative Negligence)",
    "Tindak Pidana ITE (Penyebaran Konten Kesusilaan) & Pelanggaran Privasi Biometrik.": "ITE Criminal Offense (Obscene Content Distribution) & Biometric Privacy Violation.",
    "Tindak Pidana Pencurian Data Elektronik & PMH.": "Electronic Data Theft Criminal Offense & Unlawful Act.",
    "Pelanggaran Pemrosesan Data Pribadi (Mendorong UU PDP).": "Personal Data Processing Violation (Preceding PDP Law).",
    "Tindak Pidana Peretasan Klasik & Pelanggaran Standar Keamanan Data Pemerintah.": "Classic Hacking Criminal Offense & Government Data Security Standard Violation.",
    "Pelanggaran UU Pelindungan Data Pribadi (Kegagalan Pseudo-Anonimisasi)": "Personal Data Protection Law Violation (Failure of Pseudo-Anonymization)",
    "Tindak Pidana Ekstorsi & Illegal Access (Pasal 27 ayat 4 & Pasal 30 UU ITE)": "Extortion & Illegal Access Criminal Offense (Article 27 paragraph 4 & Article 30 ITE Law)",
    "Tindak Pidana Penipuan Siber Identitas Sintetis (Social Engineering)": "Synthetic Identity Cyber Fraud Criminal Offense (Social Engineering)",

    # Nexus
    "Kelalaian mitigasi risiko Disaster Recovery oleh penyelenggara menjadi conditio sine qua non (syarat mutlak) yang fatal karena membuka ruang peretasan skala masif.": "Negligence in Disaster Recovery risk mitigation by operators became a fatal conditio sine qua non (absolute condition) exposing massive hacking vectors.",
    "Ketiadaan hukum perisai konten (content guardrails) atau kewajiban deteksi watermark memperparah penyebaran perbuatan pidana ini.": "Lack of legal content guardrails or mandatory watermark detection aggravated the spread of this criminal act.",
    "Terdapatnya defisiensi pada mekanisme keamanan berlapis bank menyebabkan pelaku dapat menyusup.": "Deficiencies in the bank's multi-layered security mechanisms allowed perpetrators to infiltrate.",
    "Komitmen proteksi data korporasi optimal ditekankan akibat ketiadaan Hard Law sebelumnya.": "An optimal corporate data protection commitment was highlighted due to the absence of preceding Hard Law.",
    "Kelalaian enkripsi database in-rest menjadikan file ekstraksi dapat dibaca tanpa proteksi.": "Negligence in at-rest database encryption made extracted files readable without protection.",
    "Ketidakpatuhan pembaruan (patching) sistem keamanan SPBE daerah berujung pada invasi peretas.": "Non-compliance with patching local SPBE security systems led to hacker invasions.",

    # Pelaku
    "Geng Ransomware LockBit 3.0.": "LockBit 3.0 Ransomware Gang.",
    "Entitas hacker afiliasi LockBit 3.0 (Brain Cipher) sebagai aktor pidana utama.": "LockBit 3.0 affiliated hacker entities (Brain Cipher) as primary criminal actors.",
    "Individu anonim (prompter) yang memberikan input kepada mesin AI.": "Anonymous individuals (prompters) who provided input to the AI engine.",
    "Hacker forum tak dikenal.": "Unknown forum hackers.",
    "Aktor peretas gelap.": "Dark web threat actors.",
    "Sindikat kejahatan siber tak berpola (Anonymous/Scammers).": "Unpatterned cybercrime syndicates (Anonymous/Scammers).",

    # Kronologi common replacements
    "Penguncian (enkripsi) paksa dan ekstraksi data pada infrastruktur Pusat Data Nasional Sementara (PDNS) 2 Surabaya yang menggunakan perangkat pemerasan siber (ransomware). Hal ini mengakibatkan kelumpuhan layanan publik ekstensif pada 282 instansi pemerintah.": "Forced lock (encryption) and data extraction on the Temporary National Data Center (PDNS) 2 Surabaya infrastructure using ransomware. This resulted in extensive public service paralysis across 282 government agencies.",
    "Eksploitasi visual menggunakan algoritma Generative AI mutakhir guna mensintesiskan gambar dan video asusila (Deepfake) tak berizin. Konten direproduksi dari foto wajah asli masyarakat sipil serta tokoh publik dan disebarluaskan di platform media sosial.": "Visual exploitation using advanced Generative AI algorithms to synthesize unauthorized obscene images and videos (Deepfakes). Content was reproduced from real facial photos of civilians and public figures and distributed on social media platforms.",
    "Kelumpuhan masif layanan Bank Syariah Indonesia (BSI) pada Mei 2023 akibat eksfiltrasi 1,5 TB data sistem oleh LockBit 3.0, disusul ancaman pembocoran 15 juta data nasabah.": "Massive paralysis of Bank Syariah Indonesia (BSI) services in May 2023 due to the exfiltration of 1.5 TB of system data by LockBit 3.0, followed by threats to leak 15 million customer data.",
    "Kebocoran berkas database milik Tokopedia yang memuat 91 juta catatan akun pengguna, yang lantas diperdagangkan di forum peretas global (Dark Web).": "Leak of Tokopedia's database file containing 91 million user account records, which were subsequently traded on global hacker forums (Dark Web).",
    "Insiden kebocoran struktur hierarki negara di mana kurang lebih 4,7 juta basis data profil pelayan publik (PNS) diperdagangkan secara ilegal.": "Incident of state hierarchical structure leakage where approximately 4.7 million public servant (PNS) profile databases were traded illegally.",
    "Eksfiltrasi database pengguna via SQL Injection dan penjualan data penduduk/pasien di raidforums/breachforums milik instansi ": "Exfiltration of user database via SQL Injection and sale of resident/patient data on raidforums/breachforums belonging to the institution ",
    "Serangan malware pemeras (ransomware) yang mengenkripsi seluruh server database dan melumpuhkan layanan internal milik instansi ": "Ransomware malware attack that encrypted the entire database server and paralyzed internal services belonging to the institution ",
    "Manipulasi dokumen eKYC menggunakan Identitas Sintetis AI untuk pengajuan pinjaman online memakai NIK masyarakat yang bocor milik instansi ": "Manipulation of eKYC documents using AI Synthetic Identities for online loan applications using leaked citizens' ID numbers belonging to the institution ",
    "Disinformasi publik menggunakan Voice Cloning / Deepfake pejabat daerah yang meminta transfer dana fiktif milik instansi ": "Public disinformation using Voice Cloning / Deepfake of regional officials requesting fictitious fund transfers belonging to the institution "
}

def translate_field(text):
    if not text: return text
    # Full match
    if text in dict_en: return dict_en[text]
    
    # Prefix replacements logic
    for k, v in dict_en.items():
        if isinstance(text, str) and k in text:
            text = text.replace(k, v)
            
    # Check PSE replacements
    if "selaku Penyelenggara Sistem Elektronik / Lembaga Pemerintah." in text:
        text = text.replace("selaku Penyelenggara Sistem Elektronik / Lembaga Pemerintah.", "as Electronic System Operator / Government Agency.")
        text = text.replace("Dinas Kesehatan", "Health Agency")
        text = text.replace("Dinas Pendidikan", "Education Agency")
        text = text.replace("Pengadilan Negeri", "District Court")
        text = text.replace("Pemkot", "City Govt")
        text = text.replace("Pemkab", "Regency Govt")
        text = text.replace("Universitas", "University")

    # Final sweep
    if text == "Badan Kepegawaian Negara (BKN).": text = "National Civil Service Agency (BKN)."
    if text == "Tokopedia.": text = "Tokopedia."
    if "Pengembang Foundation Model" in text: text = "AI Foundation Model Developers and Social Media Platforms."

    return text

for inc in data['incidents']:
    inc['peristiwa_hukum_kronologi'] = translate_field(inc['peristiwa_hukum_kronologi'])
    inc['kualifikasi_peristiwa'] = translate_field(inc['kualifikasi_peristiwa'])
    
    if 'pemetaan_fakta_hukum' in inc:
        inc['pemetaan_fakta_hukum']['subjek_pelaku'] = translate_field(inc['pemetaan_fakta_hukum']['subjek_pelaku'])
        inc['pemetaan_fakta_hukum']['subjek_pse'] = translate_field(inc['pemetaan_fakta_hukum']['subjek_pse'])
        inc['pemetaan_fakta_hukum']['nexus_kausalitas'] = translate_field(inc['pemetaan_fakta_hukum']['nexus_kausalitas'])

with open('data/incidents/indonesia_incidents_en.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

print("Generated indonesia_incidents_en.json successfully!")
