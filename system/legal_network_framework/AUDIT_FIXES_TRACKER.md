# Audit Sitasi Hukum — Lacak Perbaikan (resumable)

Sumber: workflow `wf_cc3b1bf5-97f` · 208 klaim diekstrak, 183 dinilai (133 OK, **50 bermasalah**), 38 belum dinilai (batch kena limit).

Verifikasi terhadap teks pasal verbatim (`data/network/provision_texts.json`) + sumber resmi. Status per item: `[ ]` belum · `[x]` sudah diterapkan · `[~]` sedang dikerjakan · `[-]` diputuskan tidak diubah.

**Cara lanjut kalau sesi terputus:** baca file ini, kerjakan item `[ ]` berikutnya, lalu `python3 system/legal_network_framework/lint_legal_citations.py` untuk konfirmasi.

---

## A. Temuan terverifikasi — WAJIB diperbaiki (50)

- [x] **app.core.js:119** · `WRONG` · id=53
      - Klaim: Daftar instrumen yang diklaim sebagai cakupan jaringan 'Regulasi Nasional Indonesia' (subtitle navigasi)
      - Kutipan: `'section-natl': { icon: 'account_balance', title: 'Regulasi Nasional Indonesia', sub: 'UU PDP · UU ITE · PP PSTE · POJK · UU Perdagangan' },`
      - Bukti: Jaringan nasional (data/network/natl_graph.json) berisi node dari 7 dokumen: UU_PDP_No27_2022, UU_ITE_No19_2016, UU_ITE_No1_2024, PP_PSTE_No71_2019, POJK_No3_2024_Inovasi_Teknologi_Keuangan, SE_Komdigi_No9_2023_Etika_AI, dan Stranas_AI_Indonesia_2020-2045. TID
      - Perbaikan: Ganti baris 119 app/assets/js/app.core.js menjadi: 'section-natl': { icon: 'account_balance', title: 'Regulasi Nasional Indonesia', sub: 'UU PDP · UU ITE · PP PSTE · POJK · SE Komdigi · Stranas AI' },

- [x] **app.core.js:235** · `IMPRECISE` · id=37
      - Klaim: Pemetaan tematik hardcoded: Transparansi & Eksplainabilitas
      - Kutipan: `{ from: 'EU_AI_Act_2024_Article_13', to: 'OECD_AI_Principles_2024_Section_1', theme: 'Transparansi & Eksplainabilitas' },`
      - Bukti: Sisi EU benar: korpus 'EU_AI_Act_2024 - Article 13' = "Transparency and provision of information to deployers. High-risk AI systems shall be designed and developed in such a way as to ensure that their operation is sufficiently transparent...". Sisi OECD: 'Sec
      - Perbaikan: Ganti baris app/assets/js/app.core.js:235 menjadi: { from: 'EU_AI_Act_2024_Article_13', to: 'OECD_AI_Principles_2024_Bagian_26', theme: 'Transparansi & Eksplainabilitas' },

- [x] **app.core.js:236** · `WRONG` · id=38
      - Klaim: Pemetaan tematik hardcoded: Transparansi & Eksplainabilitas
      - Kutipan: `{ from: 'EU_AI_Act_2024_Article_13', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_5', theme: 'Transparansi & Eksplainab`
      - Bukti: Korpus 'Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 5' = "Integrity of democratic processes and respect for the rule of law... measures that seek to ensure that artificial intelligence systems are not used to undermine the integrity, indepen
      - Perbaikan: Ganti baris app/assets/js/app.core.js:236 menjadi: { from: 'EU_AI_Act_2024_Article_13', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_8', theme: 'Transparansi & Eksplainabilitas' },

- [x] **app.core.js:238** · `WRONG` · id=39
      - Klaim: Pemetaan tematik hardcoded: Manajemen Risiko
      - Kutipan: `{ from: 'EU_AI_Act_2024_Article_9', to: 'OECD_AI_Principles_2024_Section_2', theme: 'Manajemen Risiko' },`
      - Bukti: Sisi EU benar secara resmi: EU AI Act Article 9 = "Risk Management System" ("A risk management system shall be established, implemented, documented and maintained in relation to high-risk AI systems" — artificialintelligenceact.eu; catatan: entri korpus 'EU_AI
      - Perbaikan: Ganti baris app/assets/js/app.core.js:238 menjadi: { from: 'EU_AI_Act_2024_Article_9', to: 'OECD_AI_Principles_2024_Bagian_29', theme: 'Manajemen Risiko' }, — dan perbaiki entri korpus 'EU_AI_Act_2024 - Article 9' yang salah-OCR agar memuat teks Article 9 'Risk management system' yang sebenarnya.

- [x] **app.core.js:239** · `WRONG` · id=40
      - Klaim: Pemetaan tematik hardcoded: Manajemen Risiko
      - Kutipan: `{ from: 'EU_AI_Act_2024_Article_9', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_9', theme: 'Manajemen Risiko' },`
      - Bukti: Korpus 'Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 9' = "Accountability and responsibility. Each Party shall adopt or maintain measures to ensure accountability and responsibility for adverse impacts..." — bukan manajemen risiko. Manajemen 
      - Perbaikan: Ganti baris app/assets/js/app.core.js:239 menjadi: { from: 'EU_AI_Act_2024_Article_9', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_16', theme: 'Manajemen Risiko' },

- [x] **app.core.js:240** · `WRONG` · id=41
      - Klaim: Pemetaan tematik hardcoded: Manajemen Risiko
      - Kutipan: `{ from: 'EU_AI_Act_2024_Article_6', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_6', theme: 'Manajemen Risiko' },`
      - Bukti: Sisi EU benar: korpus 'EU_AI_Act_2024 - Article 6' = "Classification rules for high-risk AI systems...". Sisi CETS225 salah: korpus 'Article 6' = "General approach. This chapter sets forth general common principles that each Party shall implement..." — hanya p
      - Perbaikan: Ganti baris app/assets/js/app.core.js:240 menjadi: { from: 'EU_AI_Act_2024_Article_6', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_16', theme: 'Manajemen Risiko' },

- [x] **app.core.js:242** · `WRONG` · id=42
      - Klaim: Pemetaan tematik hardcoded: Pengawasan Manusia
      - Kutipan: `{ from: 'EU_AI_Act_2024_Article_14', to: 'OECD_AI_Principles_2024_Article_5', theme: 'Pengawasan Manusia' },`
      - Bukti: Sisi EU benar: korpus 'EU_AI_Act_2024 - Article 14' = "Human oversight. High-risk AI systems shall be designed and developed in such a way... that they can be effectively overseen by natural persons...". Sisi OECD salah: OECD Recommendation tidak memiliki unit
      - Perbaikan: Ganti baris app/assets/js/app.core.js:242 menjadi: { from: 'EU_AI_Act_2024_Article_14', to: 'OECD_AI_Principles_2024_Bagian_26', theme: 'Pengawasan Manusia' },

- [x] **app.core.js:243** · `WRONG` · id=43
      - Klaim: Pemetaan tematik hardcoded: Pengawasan Manusia
      - Kutipan: `{ from: 'EU_AI_Act_2024_Article_14', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_10', theme: 'Pengawasan Manusia' },`
      - Bukti: Korpus 'Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 10' = "Equality and non-discrimination. Each Party shall adopt or maintain measures with a view to ensuring that activities within the lifecycle of artificial intelligence systems respect e
      - Perbaikan: Ganti baris app/assets/js/app.core.js:243 menjadi: { from: 'EU_AI_Act_2024_Article_14', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_8', theme: 'Pengawasan Manusia' },

- [x] **app.core.js:247** · `WRONG` · id=45
      - Klaim: Pemetaan tematik hardcoded: Akuntabilitas
      - Kutipan: `{ from: 'EU_AI_Act_2024_Article_16', to: 'OECD_AI_Principles_2024_Section_2', theme: 'Akuntabilitas' },`
      - Bukti: OECD AI Principles 2024 Section 2 = "National policies and international co-operation for trustworthy AI" (rekomendasi 2.1–2.5 utk pemerintah), BUKAN akuntabilitas. Akuntabilitas ada di Section 1, Prinsip 1.5 — korpus "OECD_AI_Principles_2024 - Bagian 28": "1.
      - Perbaikan: Ganti baris 247 app/assets/js/app.core.js menjadi: { from: 'EU_AI_Act_2024_Article_16', to: 'OECD_AI_Principles_2024_Bagian_28', theme: 'Akuntabilitas' }, // OECD Prinsip 1.5 Accountability (gunakan id node yang resolve di intl_graph)

- [x] **app.core.js:248** · `WRONG` · id=46
      - Klaim: Pemetaan tematik hardcoded: Akuntabilitas
      - Kutipan: `{ from: 'EU_AI_Act_2024_Article_16', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_8', theme: 'Akuntabilitas' },`
      - Bukti: CETS225 Art. 8 di korpus: "– Transparency and oversight. Each Party shall adopt or maintain measures to ensure that adequate transparency and oversight requirements ... are in place ... including with regard to the identification of content generated by artifi
      - Perbaikan: Ganti baris 248 app/assets/js/app.core.js menjadi: { from: 'EU_AI_Act_2024_Article_16', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_9', theme: 'Akuntabilitas' }. Catatan: baris 239 saat ini sudah memakai CETS Art. 9 untuk 'Manajemen Risiko' — itu juga keliru (risk framework CETS = Art. 16), perlu 

- [x] **app.core.js:250** · `IMPRECISE` · id=47
      - Klaim: Pemetaan tematik hardcoded: Larangan Penggunaan AI Berbahaya
      - Kutipan: `{ from: 'EU_AI_Act_2024_Article_5', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_5', theme: 'Larangan Penggunaan AI Ber`
      - Bukti: Sisi EU benar: EU AI Act Art. 5 = "Prohibited AI Practices" (sumber resmi). Sisi CETS kurang tepat: CETS225 Art. 5 di korpus = "– Integrity of democratic processes and respect for the rule of law ... Each Party shall adopt or maintain measures that seek to ens
      - Perbaikan: Pertahankan edge baris 250 tetapi persempit labelnya, mis.: { from: 'EU_AI_Act_2024_Article_5', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_5', theme: 'Larangan AI yang Merusak Proses Demokrasi' } — atau tambahkan anotasi bahwa CETS225 Art. 5 bukan padanan penuh daftar larangan EU AI Act Art. 5.

- [x] **app.core.js:251** · `WRONG` · id=48
      - Klaim: Pemetaan tematik hardcoded: Kewajiban Penyedia AI
      - Kutipan: `{ from: 'EU_AI_Act_2024_Article_26', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_7', theme: 'Kewajiban Penyedia AI' },`
      - Bukti: Dua sisi keliru. (1) EU AI Act Art. 26 di korpus: "Obligations of deployers of high-risk AI systems. Deployers of high-risk AI systems shall take appropriate technical and organisational measures..." — kewajiban DEPLOYER (pengguna), bukan penyedia; kewajiban p
      - Perbaikan: Hapus baris 251 app/assets/js/app.core.js, atau ganti menjadi edge yang jujur: { from: 'EU_AI_Act_2024_Article_26', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_8', theme: 'Kewajiban Deployer AI (pengawasan penggunaan)' } hanya jika pasangan dianggap perlu; jika theme 'Kewajiban Penyedia AI' dipert

- [x] **app.core.js:253** · `WRONG` · id=49
      - Klaim: Pemetaan tematik hardcoded: Conformity & Sertifikasi
      - Kutipan: `{ from: 'EU_AI_Act_2024_Article_39', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_25', theme: 'Conformity & Sertifikasi`
      - Bukti: CETS225 Art. 25 di korpus: "– International co-operation. The Parties shall co-operate in the realisation of the purpose of this Convention ... exchange relevant and useful information between themselves concerning aspects related to artificial intelligence...
      - Perbaikan: Hapus baris 253 app/assets/js/app.core.js (tidak ada padanan CETS utk tema ini), atau jika pasangan Art. 39 ↔ Art. 25 ingin dipertahankan ganti theme-nya menjadi 'Kerja Sama Internasional / Pengakuan Lintas-Negara'; untuk tema 'Conformity & Sertifikasi' gunakan EU_AI_Act_2024_Article_43 tanpa pasangan CETS.

- [x] **app.core.js:255** · `WRONG` · id=50
      - Klaim: Pemetaan tematik hardcoded: Regulatory Sandbox
      - Kutipan: `{ from: 'EU_AI_Act_2024_Article_54', to: 'OECD_AI_Principles_2024_Section_1', theme: 'Regulatory Sandbox' },`
      - Bukti: Dua sisi keliru. (1) EU AI Act Art. 54 di korpus: "Prior to placing a general-purpose AI model on the Union market, providers established in third countries shall ... appoint an authorised representative..." — perwakilan resmi penyedia GPAI, bukan sandbox; san
      - Perbaikan: Ganti baris 255 app/assets/js/app.core.js menjadi: { from: 'EU_AI_Act_2024_Article_57', to: 'OECD_AI_Principles_2024_Bagian_32', theme: 'Regulatory Sandbox' }, // EU Art.57 sandbox ↔ OECD rek. 2.3 experimentation

- [x] **app.core.js:1224** · `WRONG` · id=35
      - Klaim: Pasal-pasal hak subjek data — role yang diharapkan = 'konsumen'
      - Kutipan: `const _REVIEW_RIGHTS = new Set(['5', '6', '6O', '7O', '8', '9', '13', '33'].map(n => `UU_PDP_No27_2022 - Pasal ${n}`));`
      - Bukti: Pasal 5, 6, 8, 9, 13 memang hak subjek data (mis. Pasal 8: "Subjek Data Pribadi berhak untuk mengakhiri pemrosesan, menghapus, dan/atau memusnahkan Data Pribadi tentang dirinya ..."). TETAPI tiga entri lain bukan pasal hak: (a) kunci korpus 'UU_PDP_No27_2022 -
      - Perbaikan: Ganti baris 1224 app/assets/js/app.core.js menjadi: const _REVIEW_RIGHTS = new Set(['5', '6', '8', '9', '10', '11', '13'].map(n => `UU_PDP_No27_2022 - Pasal ${n}`)); Kemudian di _REVIEW_EXPECT tambahkan: 'UU_PDP_No27_2022 - Pasal 7O': ['pelaku'] (Pasal 70 pidana korporasi) dan 'UU_PDP_No27_2022 - Pasal 33': ['pse'] (ke

- [x] **app.core.js:1921** · `IMPRECISE` · id=51
      - Klaim: Atribusi nama tampilan: SE Komdigi = surat edaran tentang Etika AI (_CITE_NAMES, hand-coded)
      - Kutipan: `'SE_Komdigi': 'SE Komdigi (Etika AI)', 'Stranas_AI': 'Stranas AI',`
      - Bukti: Teks verbatim korpus (key 'SE_Komdigi_No9_2023_Etika_AI - Bagian 1'): "MENTERI KOMUNIKASI DAN INFORMATIKA REPUBLIK INDONESIA ... SURAT EDARAN MENTERI KOMUNIKASI DAN INFORMATIKA REPUBLIK INDONESIA NOMOR 9 TAHUN 2023 TENTANG ETIKA KECERDASAN ARTIFISIAL". Penerbi
      - Perbaikan: Di app.core.js:1921 ubah nilai display (kunci internal 'SE_Komdigi' biarkan karena cocok dengan prefix korpus): 'SE_Komdigi': 'SE Menkominfo 9/2023 (Etika AI)',

- [x] **app.core.js:2083** · `IMPRECISE` · id=54
      - Klaim: Contoh hand-coded cara dokumen korpus menyitir regulasi by-number/by-name (versi EN identik di baris 2082)
      - Kutipan: `ini <b>sitasi eksplisit</b> — dokumen menyebut regulasi lewat nomor (<i>"Nomor 3 Tahun 2021"</i>) atau nama instrumen (<i>"G20 AI Principles`
      - Bukti: Contoh nama instrumen benar: "G20 AI Principles", "OECD", "EU AI Act" semuanya ada sebagai sitasi named di data/network/citations.json dan provision_citations.json. Tetapi contoh by-number "Nomor 3 Tahun 2021" TIDAK ada di korpus (provision_texts.json) maupun 
      - Perbaikan: Di app/assets/js/app.core.js baris 2082 (EN) dan 2083 (ID), ganti string contoh '"Nomor 3 Tahun 2021"' menjadi '"Nomor 27 Tahun 2022"' sehingga berbunyi: '... dokumen menyebut regulasi lewat nomor (<i>"Nomor 27 Tahun 2022"</i>) atau nama instrumen (<i>"G20 AI Principles", "OECD", "EU AI Act"</i>).'

- [x] **app.core.js:2208** · `IMPRECISE` · id=2
      - Klaim: Manajemen risiko teknologi informasi perbankan; berlaku namun tidak spesifik AI (sektor fintech)
      - Kutipan: `title: 'POJK 11/2022 Manajemen Risiko TI', desc: 'Mengatur manajemen risiko teknologi informasi perbankan. Berlaku namun tidak spesifik untu`
      - Bukti: Judul resmi: "Peraturan Otoritas Jasa Keuangan Nomor 11/POJK.03/2022 tentang Penyelenggaraan Teknologi Informasi oleh Bank Umum" (ditetapkan 6 Juli 2022). POJK ini mencabut POJK 38/POJK.03/2016 tentang Penerapan Manajemen Risiko dalam Penggunaan Teknologi Info
      - Perbaikan: Ganti entri di app/assets/js/app.core.js:2208 menjadi: { status: 'partial', title: 'POJK 11/POJK.03/2022 Penyelenggaraan TI Bank Umum', desc: 'Mengatur penyelenggaraan teknologi informasi oleh bank umum, termasuk manajemen risiko TI dan keamanan siber (menggantikan POJK 38/POJK.03/2016). Berlaku untuk bank umum — bukan

- [x] **app.core.js:2209** · `OUTDATED` · id=3
      - Klaim: Peer-to-peer lending; berlaku untuk fintech lending, tidak mengatur algoritma credit scoring; recom menyebut metodologi credit scoring 'wajib dilapork
      - Kutipan: `title: 'POJK 77/2016 Peer-to-Peer Lending', desc: 'Berlaku untuk fintech lending. Tidak mengatur algoritma credit scoring secara spesifik.'`
      - Bukti: POJK 77/POJK.01/2016 tentang Layanan Pinjam Meminjam Uang Berbasis Teknologi Informasi telah DICABUT oleh POJK 10/POJK.05/2022 tentang Layanan Pendanaan Bersama Berbasis Teknologi Informasi (LPBBTI), yang kemudian dicabut lagi oleh POJK Nomor 40 Tahun 2024 ten
      - Perbaikan: Ganti entri di app/assets/js/app.core.js:2209 menjadi: { status: 'partial', title: 'POJK 40/2024 LPBBTI (Fintech Lending)', desc: 'Menggantikan POJK 77/2016 (dicabut via POJK 10/2022, lalu POJK 40/2024). Berlaku untuk fintech lending; tetap tidak mengatur algoritma credit scoring secara spesifik.', recom: 'Dokumentasik

- [x] **app.core.js:2216** · `WRONG` · id=4
      - Klaim: Data wajah/biometrik = data sensitif yang membutuhkan izin eksplisit (sektor facial recognition)
      - Kutipan: `title: 'UU PDP Ps. 26 (Data Biometrik Sensitif)', desc: 'Data wajah dikategorikan sebagai data sensitif berdasarkan UU PDP. Membutuhkan izin`
      - Bukti: Pasal 26 UU PDP sebenarnya mengatur penyandang disabilitas, bukan data biometrik: "(1) Pemrosesan Data Pribadi [penyandang disabilitas] diselenggarakan secara khusus... (3) Pemrosesan Data Pribadi penyandang disabilitas ... wajib mendapat persetujuan dari peny
      - Perbaikan: Ganti entri menjadi: title: 'UU PDP Ps. 4(2)(b) (Data Biometrik = Data Spesifik)', desc: 'Data wajah termasuk data biometrik yang dikategorikan sebagai Data Pribadi bersifat spesifik berdasarkan Pasal 4 ayat (2) huruf b UU PDP. Pemrosesan berbasis persetujuan wajib menggunakan persetujuan yang sah secara eksplisit (Pas

- [x] **app.core.js:2217** · `WRONG` · id=5
      - Klaim: Kewajiban standar keamanan sistem elektronik; berlaku untuk sistem facial recognition sebagai PSE
      - Kutipan: `title: 'PP PSTE 71/2019 Ps. 28 (Keamanan SE)', desc: 'Sistem elektronik wajib memenuhi standar keamanan. Berlaku untuk sistem FR sebagai PSE`
      - Bukti: PP_PSTE_No71_2019 - Pasal 28 (verbatim): "(1) Penyelenggara Sistem Elektronik wajib melakukan edukasi kepada Pengguna Sistem Elektronik. (2) Edukasi sebagaimana dimaksud pada ayat (1) paling sedikit mengenai hak, kewajiban, dan tanggung jawab seluruh pihak ter
      - Perbaikan: Ganti baris di app/assets/js/app.core.js:2217 menjadi: { status: 'partial', title: 'PP PSTE 71/2019 Ps. 23-24 (Pengamanan SE)', desc: 'PSE wajib mengamankan komponen sistem elektronik serta memiliki prosedur dan sarana pengamanan untuk mencegah gangguan, kegagalan, dan kerugian. Berlaku untuk sistem FR sebagai PSE.', r

- [x] **app.core.js:2232** · `WRONG` · id=8
      - Klaim: Larangan konten asusila; diklaim berlaku untuk deepfake asusila (sektor AI-generated content)
      - Kutipan: `title: 'UU ITE Ps. 27A (Konten Asusila)', desc: 'Melarang konten asusila. Berlaku untuk deepfake asusila namun sulit pembuktiannya.'`
      - Bukti: provision_texts.json 'UU_ITE_No1_2024 - Pasal 27': '(1) Setiap Orang dengan sengaja dan tanpa hak menyiarkan, mempertunjukkan, mendistribusikan, mentransmisikan, dan/atau membuat dapat diaksesnya Informasi Elektronik dan/atau Dokumen Elektronik yang memiliki m
      - Perbaikan: Ganti entri app.core.js:2232 menjadi: title: 'UU ITE Ps. 27 ayat (1) (Konten Melanggar Kesusilaan)', desc: 'Pasal 27 ayat (1) UU ITE (sttd UU 1/2024) jo. Pasal 45 ayat (1) melarang penyebaran konten yang melanggar kesusilaan; dapat menjangkau deepfake asusila (utk deepfake seksual nonkonsensual lihat juga Pasal 14 UU 1

- [x] **app.core.js:2233** · `IMPRECISE` · id=9
      - Klaim: Larangan penyebaran informasi bohong; dapat diterapkan pada deepfake politik
      - Kutipan: `title: 'UU ITE Ps. 28 (Informasi Bohong)', desc: 'Melarang penyebaran informasi bohong. Dapat diterapkan pada deepfake politik.'`
      - Bukti: provision_texts.json 'UU_ITE_No1_2024 - Pasal 28': ayat (1) '...Informasi Elektronik dan/atau Dokumen Elektronik yang berisi pemberitahuan bohong atau informasi menyesatkan yang mengakibatkan kerugian materiel bagi konsumen dalam Transaksi Elektronik'; ayat (2
      - Perbaikan: Ganti entri app.core.js:2233 menjadi: title: 'UU ITE Ps. 28 ayat (3) (Pemberitahuan Bohong)', desc: 'Pasal 28 ayat (3) UU ITE (sttd UU 1/2024) jo. Pasal 45A ayat (3) melarang penyebaran pemberitahuan bohong yang menimbulkan kerusuhan di masyarakat — dasar yang tepat untuk deepfake politik; ayat (1) hanya mencakup infor

- [x] **app.core.js:2241** · `IMPRECISE` · id=11
      - Klaim: Kekuasaan kehakiman tetap pada hakim; AI tidak dapat menggantikan keputusan hakim (sektor peradilan)
      - Kutipan: `title: 'UU Kekuasaan Kehakiman Ps. 1 (Kekuasaan Yudisial)', desc: 'Kekuasaan kehakiman tetap pada hakim. AI tidak dapat menggantikan keputus`
      - Bukti: UU No. 48 Tahun 2009, Pasal 1 angka 1 hanyalah ketentuan umum/definisi: "Kekuasaan Kehakiman adalah kekuasaan negara yang merdeka untuk menyelenggarakan peradilan guna menegakkan hukum dan keadilan berdasarkan Pancasila dan Undang-Undang Dasar Negara Republik 
      - Perbaikan: Ubah entri di app.core.js:2241 menjadi: title: 'UU Kekuasaan Kehakiman Ps. 1 angka 1 jo. Ps. 19', desc: 'Kekuasaan kehakiman adalah kekuasaan negara yang merdeka (Ps. 1 angka 1) dan dilakukan oleh hakim sebagai pejabat negara (Ps. 19). AI tidak dapat menggantikan keputusan hakim.'

- [x] **app.core.js:2250** · `WRONG` · id=14
      - Klaim: Data kesehatan = data sensitif yang memerlukan perlindungan khusus
      - Kutipan: `title: 'UU PDP Ps. 26 (Data Kesehatan Sensitif)', desc: 'Data kesehatan adalah data sensitif yang memerlukan perlindungan khusus.'`
      - Bukti: Pasal 26 UU PDP mengatur pemrosesan Data Pribadi penyandang disabilitas (lihat teks korpus: "Pemrosesan Data Pribadi penyandang disabilitas ... wajib mendapat persetujuan dari penyandang disabilitas dan/atau wali"), bukan data kesehatan. Data kesehatan diatur 
      - Perbaikan: Ganti entri menjadi: title: 'UU PDP Ps. 4(2)(a) (Data Kesehatan = Data Spesifik)', desc: 'Data dan informasi kesehatan dikategorikan sebagai Data Pribadi bersifat spesifik berdasarkan Pasal 4 ayat (2) huruf a UU PDP; pemrosesannya berisiko tinggi sehingga wajib penilaian dampak pelindungan data pribadi (Pasal 34).'

- [x] **app.core.js:2257** · `IMPRECISE` · id=16
      - Klaim: Pemerintah sebagai PSE publik wajib patuh UU PDP; recom menyebut kewajiban DPO dan DPIA
      - Kutipan: `title: 'UU PDP (Pemerintah sebagai Pengendali Data)', desc: 'Pemerintah sebagai PSE publik wajib mematuhi UU PDP dalam pemrosesan data warga`
      - Bukti: Substansi benar: Pasal 2 ayat (1) UU PDP: "Undang-Undang ini berlaku untuk Setiap Orang, Badan Publik, dan Organisasi Internasional..." — pemerintah tunduk sebagai Badan Publik. Kewajiban DPO: Pasal 53 ayat (1) huruf a: "Pengendali Data Pribadi dan Prosesor Da
      - Perbaikan: Ganti desc menjadi: 'Pemerintah sebagai Badan Publik tunduk pada UU PDP (Pasal 2 ayat (1)) dalam pemrosesan data warga.' dan recom menjadi: 'Tunjuk pejabat/petugas fungsi Pelindungan Data Pribadi (DPO) sesuai Pasal 53 ayat (1) huruf a dan lakukan penilaian dampak pelindungan data pribadi (DPIA, Pasal 34) untuk setiap s

- [x] **app.core.js:2263** · `IMPRECISE` · id=17
      - Klaim: UU PDP berlaku untuk semua pemroses data pribadi di Indonesia tanpa terkecuali (sektor umum)
      - Kutipan: `title: 'UU PDP (Prinsip Umum)', desc: 'UU PDP berlaku untuk semua pemroses data pribadi di Indonesia tanpa terkecuali.'`
      - Bukti: Frasa "tanpa terkecuali" bertentangan dengan Pasal 2 ayat (2) UU PDP: "Undang-Undang ini tidak berlaku untuk pemrosesan Data Pribadi oleh orang perseorangan dalam kegiatan pribadi atau rumah tangga." Cakupan yang benar ada di Pasal 2 ayat (1): berlaku untuk Se
      - Perbaikan: Ganti desc menjadi: 'UU PDP berlaku untuk Setiap Orang, Badan Publik, dan Organisasi Internasional yang memproses data pribadi, termasuk efek ekstrateritorial (Pasal 2 ayat (1)), dengan pengecualian pemrosesan oleh orang perseorangan dalam kegiatan pribadi atau rumah tangga (Pasal 2 ayat (2)).'

- [x] **app.core.js:3540** · `IMPRECISE` · id=55
      - Klaim: Klaim faktual: UU ITE 19/2016 disitir 39 kali pada lapisan sitasi (CSV export; bandingkan komentar kode baris 1945 yang menyebut angka pasal-level = 5
      - Kutipan: `'Isolasi SEMANTIK (SBERT) — BUKAN vakum hukum; cakupan hukum riil = lapisan sitasi/judge (UU ITE 19/2016 disitir 39×)'`
      - Bukti: citations.json (lapisan instrument-scan lama) coverage: {"doc":"UU_ITE_No19_2016","out":3,"in":39} — angka 39 memang ada, TETAPI 30 dari 39 adalah sitiran-diri UU_ITE_No1_2024 terhadap induknya (UU 11/2008: 8x, UU 19/2016: 5x, 'UU ITE': 17x). Lapisan tervalida
      - Perbaikan: Ganti teks app.core.js:3540 menjadi: 'Isolasi SEMANTIK (SBERT) — BUKAN vakum hukum; cakupan hukum riil = lapisan sitasi/judge tervalidasi (UU ITE 19/2016 disitir 5x oleh 3 instrumen; angka mentah 39x pada instrument-scan lama termasuk 30 sitiran-diri dari UU 1/2024 dan tidak dipakai lagi)'

- [x] **app.core.js:3548** · `IMPRECISE` · id=56
      - Klaim: Klaim faktual berulang: UU ITE 19/2016 disitir 39x sebagai bukti otoritas riil (keterangan Bagian 2 CSV export)
      - Kutipan: `Ini ukuran tumpang-tindih SEMANTIK (deskriptif), BUKAN otoritas hukum. Soft-law panjang berskor tinggi karena banyak bagian generik. Otorita`
      - Bukti: Sama dengan id=55: citations.json coverage in=39 untuk UU_ITE_No19_2016 berasal dari instrument-scan mentah yang 30 di antaranya sitiran-diri UU_ITE_No1_2024 ke induknya; lapisan tervalidasi (provision_citations.json -> citation_authority.json) mencatat 5 siti
      - Perbaikan: Ganti frasa penutup app.core.js:3548 menjadi: 'Otoritas riil = lapisan sitasi tervalidasi (UU ITE 19/2016 = otoritas puncak nasional, disitir 5x oleh 3 instrumen; bukan angka mentah 39x dari instrument-scan lama yang didominasi sitiran-diri UU 1/2024).'

- [x] **build_incident_dataset.py:67** · `IMPRECISE` · id=75
      - Klaim: akses ilegal dan perubahan/perusakan tampilan sistem elektronik (default defacement)
      - Kutipan: `Akses ilegal dan perubahan/perusakan tampilan sistem elektronik (Pasal 30 & Pasal 32 jo. Pasal 46-48 UU ITE).`
      - Bukti: Pasal 30 = akses ilegal ("mengakses Komputer dan/atau Sistem Elektronik milik Orang lain dengan cara apa pun") dan Pasal 32 = "mengubah, menambah, mengurangi ... suatu Informasi Elektronik" — keduanya cocok untuk defacement. Namun rantai sanksi 'Pasal 46-48' m
      - Perbaikan: Ganti kualifikasi defacement (build_incident_dataset.py:67) menjadi: "Akses ilegal dan perubahan/perusakan tampilan sistem elektronik (Pasal 30 & Pasal 32 jo. Pasal 46 & Pasal 48 UU ITE)."

- [x] **build_incident_dataset.py:116** · `IMPRECISE` · id=89
      - Klaim: dasar pidana pelaku akses ilegal, pencurian/perusakan data (role template kategori data)
      - Kutipan: `["UU ITE Ps. 30, 32, 46–48", "UU ITE Ps. 27B (pemerasan)", "UU PDP Ps. 67–68", "KUHP"]`
      - Bukti: Pasal 30 (akses ilegal, termasuk ayat (2) dengan tujuan memperoleh Informasi Elektronik) dan Pasal 32 (mengubah/menambah/mengurangi/merusak/memindahkan Informasi Elektronik) cocok untuk akses ilegal dan pencurian/perusakan data. Tetapi rentang "46–48" mencakup
      - Perbaikan: Di build_incident_dataset.py:116 ganti "UU ITE Ps. 30, 32, 46–48" menjadi "UU ITE Ps. 30, 32 jo. Ps. 46, 48" (atau, bila intersepsi data hendak dicakup, tulis eksplisit "UU ITE Ps. 30–32 jo. Ps. 46–48").

- [x] **build_incident_dataset.py:174** · `IMPRECISE` · id=113
      - Klaim: etika AI sebagai dasar kewajiban platform (kategori ai)
      - Kutipan: `"SE Komdigi 9/2023 Etika AI"`
      - Bukti: Teks verbatim korpus (SE_Komdigi_No9_2023_Etika_AI - Bagian 1): 'SURAT EDARAN MENTERI KOMUNIKASI DAN INFORMATIKA REPUBLIK INDONESIA NOMOR 9 TAHUN 2023 TENTANG ETIKA KECERDASAN ARTIFISIAL' — penerbitnya Menkominfo (kementerian baru bernama Komdigi sejak Okt 202
      - Perbaikan: Di build_incident_dataset.py baris 174, ganti string "SE Komdigi 9/2023 Etika AI" menjadi "SE Menkominfo No. 9/2023 Etika Kecerdasan Artifisial (pedoman, tidak mengikat)" agar nama penerbit sesuai instrumen resmi saat diterbitkan dan sifat soft law-nya eksplisit.

- [x] **build_incident_dataset.py:180** · `WRONG` · id=114
      - Klaim: hak penghapusan (korban konten AI)
      - Kutipan: `["UU PDP Ps. 26 (hak penghapusan)", "UU 12/2022 TPKS", "UU ITE Ps. 26"]`
      - Bukti: UU_PDP_No27_2022 - Pasal 26 mengatur pemrosesan Data Pribadi penyandang disabilitas: "(1) Pemrosesan Data Pribadi [penyandang disabilitas] diselenggarakan secara khusus... (3) ...wajib mendapat persetujuan dari penyandang disabilitas dan/atau wali..." — BUKAN 
      - Perbaikan: Di build_incident_dataset.py baris 180, ganti "UU PDP Ps. 26 (hak penghapusan)" menjadi "UU PDP Ps. 8 (hak penghapusan)" sehingga daftar menjadi: ["UU PDP Ps. 8 (hak penghapusan)", "UU 12/2022 TPKS", "UU ITE Ps. 26"].

- [x] **build_incident_dataset.py:186** · `IMPRECISE` · id=117
      - Klaim: pedoman pengawasan/penegakan etika AI oleh regulator
      - Kutipan: `["Komdigi", "Kepolisian", "SE Komdigi 9/2023 (pedoman)"]`
      - Bukti: Teks verbatim korpus (kunci "SE_Komdigi_No9_2023_Etika_AI - Bagian 1"): "SURAT EDARAN MENTERI KOMUNIKASI DAN INFORMATIKA REPUBLIK INDONESIA NOMOR 9 TAHUN 2023 TENTANG ETIKA KECERDASAN ARTIFISIAL. Kepada Yth. 1. Pelaku Usaha Aktivitas Pemrograman Berbasis Kecer
      - Perbaikan: Ganti elemen list di build_incident_dataset.py:186 menjadi: ["Komdigi", "Kepolisian", "SE Menkominfo No. 9/2023 Etika AI (kini Komdigi; pedoman tidak mengikat)"]

- [x] **build_incident_dataset.py:206** · `IMPRECISE` · id=121
      - Klaim: perlindungan konsumen & hak ganti rugi pihak terdampak (kategori other)
      - Kutipan: `["UU 8/1999 / UU 4/2023 Perlindungan Konsumen", "UU PDP Ps. 5–12"]`
      - Bukti: UU 8/1999 memang berjudul "Perlindungan Konsumen", tetapi UU 4/2023 resminya berjudul "Pengembangan dan Penguatan Sektor Keuangan" (P2SK) — bukan UU Perlindungan Konsumen; pelindungan konsumen sektor keuangan diatur dalam bab Literasi Keuangan, Inklusi Keuanga
      - Perbaikan: Ganti string di build_incident_dataset.py:206 menjadi: ["UU 8/1999 Perlindungan Konsumen / UU 4/2023 P2SK Ps. 235 dst. (pelindungan konsumen sektor keuangan)", "UU PDP Ps. 5–12"]

- [x] **build_incident_dataset.py:425** · `IMPRECISE` · id=123
      - Klaim: kelalaian pengamanan akses data pribadi pada sistem elektronik publik (insiden sertifikat vaksin Presiden / PeduliLindungi 2021)
      - Kutipan: `Dugaan kelalaian pengamanan akses data pribadi pada Sistem Elektronik publik (Pasal 35 & Pasal 36 UU 27/2022 tentang PDP).`
      - Bukti: Substansi pasal cocok: Pasal 35 UU PDP: "Pengendali Data Pribadi wajib melindungi dan memastikan keamanan Data Pribadi yang diprosesnya..."; Pasal 36: "Dalam melakukan pemrosesan Data Pribadi, Pengendali Data Pribadi wajib menjaga kerahasiaan Data Pribadi." NA
      - Perbaikan: Di build_incident_dataset.py baris 425, ubah field "kualifikasi" menjadi: "Dugaan kelalaian pengamanan akses data pribadi pada Sistem Elektronik publik (saat insiden 2021 tunduk pada Pasal 24 PP No. 71/2019 tentang PSTE; kewajiban serupa kini diatur Pasal 35 & Pasal 36 UU No. 27/2022 tentang PDP, yang tidak berlaku sur

- [x] **build_incident_dataset.py:698** · `IMPRECISE` · id=125
      - Klaim: perlindungan konsumen jasa keuangan; dasar sanksi administratif OJK (insiden AdaKami 2023)
      - Kutipan: `(UU 4/2023 PPSK & POJK perlindungan konsumen); sanksi administratif OJK.`
      - Bukti: Substansi benar: sanksi surat peringatan OJK ke AdaKami (Oktober 2023) atas pelanggaran praktik penagihan terkonfirmasi (sumber Bisnis.com yang dikutip file itu sendiri), dan dasar hukum perlindungan konsumen jasa keuangan memang UU 4/2023 + POJK perlindungan 
      - Perbaikan: Di build_incident_dataset.py:698, ubah '(UU 4/2023 PPSK & POJK perlindungan konsumen); sanksi administratif OJK.' menjadi '(UU 4/2023 P2SK & POJK 6/POJK.07/2022 tentang Perlindungan Konsumen dan Masyarakat di Sektor Jasa Keuangan — kini POJK 22/2023); sanksi administratif OJK.' agar konsisten dengan singkatan P2SK di b

- [x] **build_incident_dataset.py:956** · `IMPRECISE` · id=126
      - Klaim: penjeratan pidana tersangka deepfake NCII Undip 2025 (ancaman 9-12 tahun)
      - Kutipan: `tersangka ditahan dan dijerat UU Pornografi, UU ITE, dan KUHP, terancam 9-12 tahun.`
      - Bukti: Kasus dan penahanan terkonfirmasi, tetapi rincian jeratan & ancaman kurang tepat. JPNN: tersangka dijerat "Pasal 29 Juncto Pasal 4 Ayat 1 Huruf d Undang-Undang (UU) Pornografi", "Pasal 51 Ayat 1 Juncto Pasal 35 UU Informasi dan Transaksi Elektronik" (manipulas
      - Perbaikan: Ubah field "akibat" di build_incident_dataset.py:956 menjadi: "~30 korban teridentifikasi (sebagian minor); tersangka ditahan dan dijerat Pasal 29 jo. Pasal 4 ayat (1) huruf d UU 44/2008 Pornografi serta Pasal 45 ayat (1) jo. Pasal 27 ayat (1) dan Pasal 51 ayat (1) jo. Pasal 35 UU ITE, terancam 6-12 tahun penjara dan d

- [x] **README.md:46** · `WRONG` · id=132
      - Klaim: instrumen internasional kedua paling dirujuk dalam korpus — 23×
      - Kutipan: `followed by the **Council of Europe Framework Convention (CETS 225), 23×**`
      - Bukti: Angka 23× memang ada di data/network/citations.json, tetapi seluruh 23 kecocokan adalah false positive string generik 'Council of Europe', bukan sitasi Konvensi: 22× dari WHO_Ethics_and_Governance_of_AI_for_Health (terbit 2021 — sebelum Konvensi diadopsi 17 Me
      - Perbaikan: Di README.md:46 ganti "followed by the **Council of Europe Framework Convention (CETS 225), 23×**" menjadi "followed by the **OECD AI Principles, 8×**" dan tambahkan catatan: "(An earlier count attributed 23 citations to CETS 225; these were false-positive matches of the generic string 'Council of Europe' — 22 from the

- [x] **README.md:48** · `IMPRECISE` · id=133
      - Klaim: diklasifikasikan sebagai dokumen soft law panjang yang diinflasi SBERT — bukan sinyal otoritas hukum
      - Kutipan: `inflates long soft-law documents (Stranas AI, WHO, SE Komdigi)`
      - Bukti: Substansi benar: Stranas AI 2020–2045 adalah dokumen kebijakan (bukan peraturan perundang-undangan), panduan WHO 'Ethics and Governance of AI for Health' (2021) tidak mengikat, dan Surat Edaran bukan bagian hierarki peraturan perundang-undangan (Pasal 7–8 UU 1
      - Perbaikan: Di README.md:48 ubah "(Stranas AI, WHO, SE Komdigi)" menjadi "(Stranas AI, WHO, SE Menkominfo No. 9/2023 — the ministry is now Komdigi)" atau setidaknya "SE Kominfo/Komdigi 9/2023" pada penyebutan pertama.

- [x] **REVIEWER_RESPONSE.md:201** · `WRONG` · id=142
      - Klaim: peringkat 2 otoritas sitasi — dirujuk 23×
      - Kutipan: `| 2 | Council of Europe Framework Convention (CETS 225) | 23 |`
      - Bukti: Baris tabel '| 2 | Council of Europe Framework Convention (CETS 225) | 23 |' bersandar pada 23 kecocokan yang seluruhnya false positive di citations.json: 22× dari WHO 2021 (baris afiliasi "Lee Hibbard, Council of Europe, France" — dokumen terbit sebelum Konve
      - Perbaikan: Di REVIEWER_RESPONSE.md:201 ganti baris menjadi "| 2 | OECD AI Principles | 8 |", keluarkan CETS 225 dari peringkat (in-degree sahih 0), perbarui preambul menjadi "71 citation edges (46 by-name + 25 by-number)", dan hitung ulang seluruh tabel: 1 UU ITE 39; 2 OECD 8; 3 UNGA 78/265 6; 4 PP PSTE 6; 5 EU AI Act 4; 6 UNESCO

- [x] **REVIEWER_RESPONSE.md:202** · `IMPRECISE` · id=143
      - Klaim: peringkat 3 otoritas sitasi — dirujuk 7×
      - Kutipan: `| 3 | UNGA Res. 78/265 | 7 |`
      - Bukti: Dari 7× di citations.json, 6× sahih — seluruhnya dari UNGA Res 78/311: "Reaffirming its resolutions 78/265 of 21 March 2024, entitled 'Seizing the opportunities of safe, secure and trustworthy artificial intelligence…'". 1× sisanya false positive: G7 Hiroshima
      - Perbaikan: Di REVIEWER_RESPONSE.md:202 ubah baris menjadi "| 3 | UNGA Res. 78/265 | 6 |" dalam tabel yang dihitung ulang; buang kecocokan frasa dari G7 Hiroshima CoC (Okt 2023, mendahului resolusi) dari matcher.

- [x] **REVIEWER_RESPONSE.md:204** · `WRONG` · id=145
      - Klaim: peringkat 5 otoritas sitasi — dirujuk 5×
      - Kutipan: `| 5 | OECD AI Principles | 5 |`
      - Bukti: citations.json saat ini memberi in-degree OECD AI Principles = 8×, bukan 5×: G7 Hiroshima CoC 1× ("…build on the existing OECD AI Principles…"), ASEAN Guide 1×, WHO 3× ("The OECD AI principles (81) provided the basis for the AI principles endorsed by G20 gover
      - Perbaikan: Di REVIEWER_RESPONSE.md:204 ubah baris menjadi "| 2 | OECD AI Principles | 8 |" pada tabel yang dihitung ulang (setelah CETS 225 dikeluarkan); jika memilih mengecualikan pemetaan G20→OECD, tulis "5" dan nyatakan pilihan metodologis itu secara eksplisit di catatan tabel.

- [x] **REVIEWER_RESPONSE.md:207** · `IMPRECISE` · id=148
      - Klaim: peringkat 8 otoritas sitasi — dirujuk hanya 1×
      - Kutipan: `| 8 | UU PDP (27/2022) | 1 |`
      - Bukti: Data repo saat ini tidak memberi 1x: data/network/citations.json (sumber angka lain di tabel yang sama: UU ITE 39, CoE 23, UNGA 7, PP PSTE 6, EU AI Act 4, UNESCO 3) memberi weighted in-degree UU_PDP_No27_2022 = 2 (SE_Komdigi_No9_2023 -> 'UU 27/2022' x1; ASEAN_
      - Perbaikan: Ubah baris tabel menjadi: '| 8 | UU PDP (27/2022) | 2 |' agar konsisten dengan citations.json/citation_authority.json; atau pertahankan '1' tetapi tambahkan catatan kaki: 'dihitung dari provision_citations.json (sitasi eksplisit level-pasal tervalidasi); pemetaan longgar rujukan bernama (ASEAN Guide -> Indonesia PDP La

- [x] **REVIEWER_RESPONSE.md:234** · `IMPRECISE` · id=153
      - Klaim: surat edaran etika AI (soft law/circular); sentralitas semantik SBERT peringkat 3
      - Kutipan: `| 3 | SE Komdigi No.9/2023 (AI Ethics) — §5 | Natl: Soft Law (circular) | 0.1770 |`
      - Bukti: Klasifikasi "Natl: Soft Law (circular)" benar dan §5 terverifikasi (kunci korpus "SE_Komdigi_No9_2023_Etika_AI - Bagian 5" ada, berisi persyaratan khusus pelaku usaha/PSE merujuk Permenkominfo 3/2021). Namun nama resmi instrumen per teks verbatim korpus adalah
      - Perbaikan: Ubah baris tabel REVIEWER_RESPONSE.md:234 menjadi: | 3 | SE Menkominfo No.9/2023 Etika AI (kini Komdigi) — §5 | Natl: Soft Law (circular) | 0.1770 |

- [x] **REVIEWER_RESPONSE.md:262** · `IMPRECISE` · id=165
      - Klaim: basis statutori dominan (keamanan/notifikasi/pidana) untuk 88,9% insiden
      - Kutipan: `**88.9% of incidents have a high-confidence statutory basis** — predominantly UU PDP (security/notification/criminal)`
      - Bukti: Substansi legal terverifikasi: warrant high-confidence (P>=95) di llm_edge_confidence_fewshot.json didominasi UU PDP (157 dari 204 edge), teratas Pasal 67 pidana (32), Pasal 35 keamanan (29), Pasal 46 notifikasi (29) — 'predominantly UU PDP (security/notificat
      - Perbaikan: Ganti kalimat menjadi: 'Under a recall-complete, human-validated mapping, 86.7% of incidents (39/45) have a high-confidence statutory basis — predominantly UU PDP (security/notification/criminal: Pasal 35, 46, 67/68).' Atau, jika angka 40/45 berasal dari run data lama, jalankan ulang pipeline dan sinkronkan semua kemun

- [x] **Laporan_aplikasi_AI_GOV.html:29** · `IMPRECISE` · id=134
      - Klaim: diklasifikasikan sebagai instrumen soft law panjang (bukan ukuran otoritas hukum)
      - Kutipan: `ia cenderung membesar-besarkan instrumen <em>soft law</em> yang panjang (Stranas AI, WHO, SE Komdigi) karena banyaknya seksi generik`
      - Bukti: Klasifikasi soft law pada kalimat Laporan benar: Stranas AI (dokumen kebijakan), WHO 2021 (panduan internasional tak mengikat), dan Surat Edaran (bukan peraturan perundang-undangan per Pasal 7–8 UU 12/2011) memang instrumen soft law yang panjang, sehingga waja
      - Perbaikan: Di Laporan_aplikasi_AI_GOV.html:29 ubah "(Stranas AI, WHO, SE Komdigi)" menjadi "(Stranas AI, WHO, SE Menkominfo No. 9/2023 tentang Etika Kecerdasan Artifisial)".

- [x] **Laporan_aplikasi_AI_GOV.html:29** · `WRONG` · id=136
      - Klaim: otoritas sitasi kedua — dirujuk 23× dalam korpus
      - Kutipan: `diikuti <strong>Council of Europe Framework Convention (CETS 225) sebanyak 23×</strong>`
      - Bukti: Sama dengan temuan README (id 132): angka 23× di citations.json seluruhnya false positive string 'Council of Europe' — 22× dari WHO 2021 (konteks baris afiliasi "…Lee Hibbard, Council of Europe, France…"; dokumen terbit sebelum Konvensi diadopsi 17 Mei 2024) d
      - Perbaikan: Di Laporan_aplikasi_AI_GOV.html:29 ganti "diikuti <strong>Council of Europe Framework Convention (CETS 225) sebanyak 23×</strong>" menjadi "diikuti <strong>OECD AI Principles sebanyak 8×</strong>", dengan catatan kaki: "Hitungan lama 23× untuk CETS 225 terbukti false positive pencocokan string generik 'Council of Europ

- [x] **GROUND_TRUTH_5_KASUS_HUKUM_AI_INDONESIA.md:114** · `IMPRECISE` · id=192
      - Klaim: Teks verbatim hak keberatan atas pengambilan keputusan otomatis/pemrofilan
      - Kutipan: `**Pasal 10:** *"Subjek Data Pribadi berhak untuk mengajukan keberatan atas tindakan pengambilan keputusan yang hanya didasarkan pada pemrose`
      - Bukti: Teks resmi Pasal 10 ayat (1) UU PDP (korpus OCR + hukumonline/JDIH): "Subjek Data Pribadi berhak untuk mengajukan keberatan atas tindakan pengambilan keputusan yang hanya didasarkan pada pemrosesan secara otomatis, termasuk pemrofilan, yang menimbulkan akibat 
      - Perbaikan: **Pasal 10 ayat (1):** *"Subjek Data Pribadi berhak untuk mengajukan keberatan atas tindakan pengambilan keputusan yang hanya didasarkan pada pemrosesan secara otomatis, termasuk pemrofilan, yang menimbulkan akibat hukum atau berdampak signifikan pada Subjek Data Pribadi."*

- [x] **GROUND_TRUTH_5_KASUS_HUKUM_AI_INDONESIA.md:156** · `IMPRECISE` · id=207
      - Klaim: Perlindungan konsumen sektor jasa keuangan; robo-advisor beroperasi di bawah lisensi APERD
      - Kutipan: `Kerangka OJK: **POJK No. 22 Tahun 2023** (Perlindungan Konsumen Sektor Jasa Keuangan); robo-advisor beroperasi di bawah lisensi **APERD**.`
      - Bukti: Judul resmi: "Peraturan Otoritas Jasa Keuangan Nomor 22 Tahun 2023 tentang Pelindungan Konsumen dan Masyarakat di Sektor Jasa Keuangan" — diundangkan dan mulai berlaku 22 Desember 2023, menggantikan POJK No. 6/POJK.07/2022 (peraturan.bpk.go.id/Details/302699; 
      - Perbaikan: Ganti baris 156 menjadi: "Kerangka OJK: **POJK No. 22 Tahun 2023 tentang Pelindungan Konsumen dan Masyarakat di Sektor Jasa Keuangan** (berlaku sejak 22 Desember 2023, menggantikan POJK No. 6/POJK.07/2022); robo-advisor beroperasi di bawah lisensi **APERD** (Agen Penjual Efek Reksa Dana; mis. PT Bibit Tumbuh Bersama, i

---

## B. Klaim belum dinilai — perlu pass verifikasi kedua (38)
_Batch verifikasi ini gagal karena limit sesi; belum tentu salah, hanya belum dicek._

- [x] app.core.js:2242 · KUHAP Pasal 183 — Standar pembuktian pidana minimum 2 alat bukti; status bukti AI belum diatur — triase 2026-07-18: OK / tercakup perbaikan
- [x] build_incident_dataset.py:71 · KUHP Pasal 378/362 — penipuan/pencurian (juncto dengan UU ITE, default fraud) — triase 2026-07-18: OK / tercakup perbaikan
- [x] build_incident_dataset.py:75 · KUHP Pasal 378 — penipuan (juncto, default ai_deepfake) — triase 2026-07-18: OK / tercakup perbaikan
- [x] build_incident_dataset.py:83 · KUHP Pasal 378 — penipuan (juncto, default ai_voice_fraud) — triase 2026-07-18: OK / tercakup perbaikan
- [x] build_incident_dataset.py:116 · KUHP - — dasar pidana umum pelaku insiden data — triase 2026-07-18: OK / tercakup perbaikan
- [x] build_incident_dataset.py:142 · KUHP Pasal 362/378 — pencurian/penipuan (pelaku, kategori fraud) — triase 2026-07-18: OK / tercakup perbaikan
- [x] build_incident_dataset.py:168 · UU ITE Pasal 27(1), 27A, 28, 35, 45 — pidana konten manipulatif/asusila/penipuan berbasis AI (pelaku, kategori ai) — triase 2026-07-18: OK / tercakup perbaikan
- [x] build_incident_dataset.py:168 · KUHP - — dasar pidana umum pelaku konten AI (kategori ai) — triase 2026-07-18: OK / tercakup perbaikan
- [x] build_incident_dataset.py:180 · UU ITE Pasal 26 — hak penghapusan informasi/konten elektronik korban (right to erasure) — triase 2026-07-18: OK / tercakup perbaikan
- [x] build_incident_dataset.py:956 · UU ITE - — penjeratan pidana tersangka deepfake NCII Undip 2025 — triase 2026-07-18: OK / tercakup perbaikan
- [x] build_incident_dataset.py:956 · KUHP - — penjeratan pidana tersangka deepfake NCII Undip 2025 — triase 2026-07-18: OK / tercakup perbaikan
- [x] build_incident_dataset.py:1008 · UU ITE - — potensi penjeratan pidana pembuat/penyebar deepfake Menkeu Sri Mulyani 2025 (keonaran) — triase 2026-07-18: OK / tercakup perbaikan
- [x] README.md:45 · UU ITE 19/2016 - — hub otoritas jaringan sitasi korpus — dirujuk 39× oleh instrumen lain — tercakup perbaikan dokumen/triase 2026-07-18
- [x] REVIEWER_RESPONSE.md:200 · UU ITE 19/2016 - — otoritas/hub sejati korpus — in-degree sitasi 39 — tercakup perbaikan dokumen/triase 2026-07-18
- [x] REVIEWER_RESPONSE.md:206 · UNESCO Recommendation on the Ethics of AI - — peringkat 7 otoritas sitasi — dirujuk 3× — tercakup perbaikan dokumen/triase 2026-07-18
- [x] REVIEWER_RESPONSE.md:211 · WHO; Stranas AI; UU ITE 1/2024; ISO/IEC 42001; SE Komdigi; ASEAN Guide; G7 Hiroshima; POJK - — instrumen leaf — dirujuk 0× dalam korpus; adopter hilir/soft-law, bukan otoritas — tercakup perbaikan dokumen/triase 2026-07-18
- [x] REVIEWER_RESPONSE.md:214 · UU ITE 19/2016 - — statuta mengikat (binding statute); hub sejati korpus berdasarkan sitasi eksplisit (in-deg — tercakup perbaikan dokumen/triase 2026-07-18
- [x] REVIEWER_RESPONSE.md:226 · Stranas AI; WHO; SE Komdigi - — diklasifikasikan sebagai dokumen soft law panjang dengan banyak seksi generik (inflasi SBE — tercakup perbaikan dokumen/triase 2026-07-18
- [x] REVIEWER_RESPONSE.md:240 · UU ITE 1/2024 Pasal 45A — warrant/dasar hukum yang diterapkan pada 6 insiden (baseline cosine); topik pasal tidak di — tercakup perbaikan dokumen/triase 2026-07-18
- [x] REVIEWER_RESPONSE.md:250 · UU ITE 19/2016 - — statuta mengikat; hub korpus AI/siber Indonesia — dirujuk 39× (teks copy-paste untuk naska — tercakup perbaikan dokumen/triase 2026-07-18
- [x] REVIEWER_RESPONSE.md:251 · Council of Europe Framework Convention (CETS 225) - — anchor internasional utama — dirujuk 23× (teks copy-paste untuk naskah) — tercakup perbaikan dokumen/triase 2026-07-18
- [x] REVIEWER_RESPONSE.md:295 · UU ITE - — delik pidana (ITE offences) sebagai basis pidana bagi pelaku — tercakup perbaikan dokumen/triase 2026-07-18
- [x] REVIEWER_RESPONSE.md:495 · UU ITE 19/2016 - — memimpin peringkat otoritas sitasi (in-degree 39) — tercakup perbaikan dokumen/triase 2026-07-18
- [x] Laporan_aplikasi_AI_GOV.html:29 · UU ITE 19/2016 - — simpul otoritas jaringan sitasi — dirujuk 39× (in-degree) dalam korpus — paragraf ditulis ulang 2026-07-18 (catatan sitiran-diri + koreksi CETS)
- [x] GROUND_TRUTH_5_KASUS_HUKUM_AI_INDONESIA.md:57 · UU No. 11 Tahun 2008 tentang ITE (sebagaimana diubah terakhir dengan UU No. 1 Tahun 2024) Pasal 35 jo. Pasal 51 ayat (1) — Dasar pidana untuk pornografi deepfake berbasis AI (manipulasi/penciptaan Informasi Elektr — triase 2026-07-18: OK / tercakup perbaikan
- [x] GROUND_TRUTH_5_KASUS_HUKUM_AI_INDONESIA.md:58 · UU No. 11 Tahun 2008 tentang ITE Pasal 35; Pasal 51 — Provenance pasal: Pasal 35 & 51 adalah pasal asli UU 11/2008, tidak diubah oleh UU 19/2016 — triase 2026-07-18: OK / tercakup perbaikan
- [x] GROUND_TRUTH_5_KASUS_HUKUM_AI_INDONESIA.md:58 · UU No. 11 Tahun 2008 tentang ITE Pasal 51 ayat (1) jo. Pasal 35 — Pasal 51 ayat (1) adalah ketentuan sanksi pidana bagi pelanggaran Pasal 35; penomoran tida — triase 2026-07-18: OK / tercakup perbaikan
- [x] GROUND_TRUTH_5_KASUS_HUKUM_AI_INDONESIA.md:59 · UU No. 11 Tahun 2008 tentang ITE Pasal 35 — Teks verbatim larangan manipulasi/penciptaan/perubahan Informasi Elektronik agar dianggap  — triase 2026-07-18: OK / tercakup perbaikan
- [x] GROUND_TRUTH_5_KASUS_HUKUM_AI_INDONESIA.md:60 · UU No. 11 Tahun 2008 tentang ITE Pasal 51 ayat (1) — Ancaman pidana penjara maksimal 12 tahun dan/atau denda maksimal Rp12 miliar — triase 2026-07-18: OK / tercakup perbaikan
- [x] GROUND_TRUTH_5_KASUS_HUKUM_AI_INDONESIA.md:62 · UU No. 12 Tahun 2022 (UU TPKS) jo. UU ITE Pasal 14 ayat (1) huruf a (jo. Pasal 35 UU ITE) — Anchor pemidanaan yang tepat untuk deepfake porno terhadap korban — triase 2026-07-18: OK / tercakup perbaikan
- [x] GROUND_TRUTH_5_KASUS_HUKUM_AI_INDONESIA.md:139 · UU ITE Pasal 28 — Dasar pemrosesan pidana kasus robot trading sebagai penipuan (berita bohong/penipuan konsu — triase 2026-07-18: OK / tercakup perbaikan
- [x] GROUND_TRUTH_5_KASUS_HUKUM_AI_INDONESIA.md:142 · KUHPerdata Pasal 1365 — Perbuatan Melawan Hukum (fault-based); teks verbatim dan unsur PMH, kesalahan, kerugian, k — triase 2026-07-18: OK / tercakup perbaikan
- [x] GROUND_TRUTH_5_KASUS_HUKUM_AI_INDONESIA.md:143 · UU No. 11 Tahun 2008 tentang ITE Pasal 15 — Provenance pasal: Pasal 15 tidak diubah oleh UU 19/2016 maupun UU 1/2024 — triase 2026-07-18: OK / tercakup perbaikan
- [x] GROUND_TRUTH_5_KASUS_HUKUM_AI_INDONESIA.md:144 · UU No. 11 Tahun 2008 tentang ITE Pasal 15 ayat (1) — Kewajiban PSE menyelenggarakan sistem elektronik secara andal, aman, dan bertanggung jawab — triase 2026-07-18: OK / tercakup perbaikan
- [x] GROUND_TRUTH_5_KASUS_HUKUM_AI_INDONESIA.md:145 · UU No. 11 Tahun 2008 tentang ITE Pasal 15 ayat (2) — Tanggung jawab PSE terhadap penyelenggaraan sistem elektroniknya — triase 2026-07-18: OK / tercakup perbaikan
- [x] GROUND_TRUTH_5_KASUS_HUKUM_AI_INDONESIA.md:146 · UU No. 11 Tahun 2008 tentang ITE Pasal 15 ayat (3) — Pengecualian tanggung jawab PSE bila terbukti keadaan memaksa, kesalahan, dan/atau kelalai — triase 2026-07-18: OK / tercakup perbaikan
- [x] GROUND_TRUTH_5_KASUS_HUKUM_AI_INDONESIA.md:147 · UU No. 11 Tahun 2008 tentang ITE Pasal 15 — Karakterisasi doktrin Pasal 15 sebagai praduga tanggung jawab (presumption of liability),  — triase 2026-07-18: OK / tercakup perbaikan
- [x] GROUND_TRUTH_5_KASUS_HUKUM_AI_INDONESIA.md:148 · UU No. 1 Tahun 2024 (Perubahan Kedua UU ITE) Pasal 15 (UU ITE) — UU 1/2024 tidak mengubah Pasal 15 UU ITE (sitasi jo. hanya gaya konsolidasi) — triase 2026-07-18: OK / tercakup perbaikan

---

## C. Perbaikan terpisah (sudah ada skrip, jalankan di working copy)
- [x] Label OCR korup (`Pasal 7O→70`, `278→27B`, `168→16B`, `1O/6O`→Penjelasan): `python3 system/legal_network_framework/fix_ocr_labels.py`
- [x] Normalisasi permanen di `builder.py` (`_norm_heading_no` + `PASAL_OCR_FIX`) — sudah dipatch di working copy, verifikasi ada.
- [x] Linter build-time `lint_legal_citations.py` — pasang di pre-deploy.


---

## PROGRESS LOG
- 2026-07-18: `app.core.js` — COMPLIANCE_RULE_DB (biometrik→Ps.4(2)(b) dkk, +grounding prov/verify/ext), THEMATIC_INTL_EDGES (13 edge, node OECD Section→Bagian, semua resolve), section-natl label, SE_Komdigi label, contoh 'Nomor 27/2022', teks otoritas 39×→5×, _REVIEW_RIGHTS (token OCR dibuang). Linter 0 error, JS syntax OK. `[~]` id=35 menyisakan penambahan _REVIEW_EXPECT Ps.70/33 yang tergandeng reparasi OCR.
- TERSISA: reparasi OCR label (fix_ocr_labels.py + builder patch + mirror Python + _REVIEW_DEF), build_incident_dataset.py (9), README/REVIEWER_RESPONSE/Laporan/GROUND_TRUTH (docs), index.html badge, 38 klaim belum-dinilai.

- 2026-07-18 (lanjutan): SELURUH 50 temuan diterapkan + 38 klaim tertunda dituntaskan lewat triase (2 perbaikan tambahan: narasi CETS §2.4 REVIEWER_RESPONSE, penamaan SE Menkominfo). Reparasi OCR dieksekusi (17 file + citation_judgments ber-scope + 4 garble dalam-teks via overrides). citations.json diregenerasi dgn matcher yang diperketat (CETS wajib nama Konvensi/CETS 225; UNGA by-number): CETS 23->0 (false positive), UNGA 7->1, ASEAN->UU PDP dihapus (PDPC Singapura), G20->OECD mengikuti kode. provision_citations + citation_authority + dataset insiden diregenerasi. 88.9%%->86.7%% (39/45, calibrated P>=95) di semua kemunculan validated-judge; tabel subjek raw dibiarkan (sumber berbeda, konsisten). Grounding prompt Compliance Navigator: teks verbatim + aturan sitasi anti-fabrikasi. DATA_V=20260718_1. CATATAN MANUAL: terjemahan EN insiden (indonesia_incidents_en.json) memakai cache _en_overrides — field kualifikasi yang berubah perlu diterjemahkan ulang via translate_db.py (butuh API key).
