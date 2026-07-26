# Editorial Review Package — 408008_Revised_Manuscript_1.docx
**Target:** Law, Technology and Humans (QUT) · **Mode:** full (5 reviewer) · **Tanggal:** 2026-07-26
**Catatan metode review:** dikerjakan inline oleh satu model dengan lima rubrik perspektif terpisah (fallback karena limit sub-agen); independensi antar-reviewer bersifat struktural (rubrik berbeda), bukan agen berbeda.

---

## R0 · Konfigurasi Panel
| Reviewer | Persona | Fokus eksklusif |
|---|---|---|
| EIC | Editor LTHJ, sarjana socio-legal senior | Kecocokan jurnal, kepatuhan pedoman, orisinalitas |
| R1 | Pakar computational legal studies / validasi NLP | Desain, validitas, konsistensi angka vs data |
| R2 | Guru besar hukum siber Indonesia | Akurasi doktrinal, literatur |
| R3 | Sarjana STS / socio-legal | Dimensi manusia, refleksivitas, kebijakan |
| DA | Devil's Advocate | Counter-argument terkuat, artefak metode |

---

## R-EIC — Editor-in-Chief (LTHJ)
**Penilaian:** Substansi orisinal dan signifikan — LNA + Toulmin atas korpus regulasi-insiden Indonesia adalah kontribusi yang belum ada padanannya di LTHJ; reframing "vacuum → distribusi timpang" menarik bagi pembaca internasional. Namun naskah dalam bentuk sekarang **belum submittable**: gaya sitasi salah total untuk jurnal ini dan pernyataan wajib belum ada.
**Kekuatan:** (1) pertanyaan riset jelas dan berani melawan konsensus literatur lokal; (2) transparansi metodologis di §2 di atas rata-rata artikel hukum; (3) limitasi §4 jujur.
**Isu:**
- **CRITICAL** · seluruh naskah · Sitasi APA author-date; LTHJ mewajibkan **Chicago 18th ed. footnote pendek + bibliografi**, tanpa Ibid/op.cit. → konversi total (±35 referensi, semua rujukan in-text menjadi catatan kaki).
- **CRITICAL** · front/backmatter · **Pernyataan Disclosure AI tidak ada** — wajib di LTHJ, dan untuk naskah ini bermakna ganda: (a) LLM sebagai instrumen riset; (b) bantuan AI dalam penulisan. Tanpa ini naskah ditolak administratif.
- **MAJOR** · keseluruhan · Register IMRaD ilmu sosial kuantitatif; LTHJ berorientasi esai kritis sosiolegal. Tidak perlu membuang struktur, tapi pendahuluan/diskusi perlu suara humaniora (siapa manusianya?) dan §3.8 jangan terdengar seperti brosur produk.
- **MAJOR** · abstrak · ±280 kata > batas 250; padatkan dan perbarui angkanya.
- **MINOR** · umum · Cover letter wajib; tabel/gambar sudah in-text ✓; 5 keywords ✓; estimasi kata (±7.300 termasuk referensi) masih dalam batas 5.000–10.000 — jaga saat revisi.
**Skor:** originality 8 · rigor 5 · significance 8 · presentation 4 · fit 6 → **Major revision**

## R1 — Metodologi (computational legal studies)
**Penilaian:** Desain dua-lapis (retrieval recall-complete + hakim LLM + telaah manusia) sound dan kini tervalidasi kuat — tetapi **naskah melaporkan generasi data yang sudah digantikan**. Hampir semua angka hasil adalah era hakim lama dan beberapa klaim faktual salah. Ini persis alasan penulis merasa naskah "tidak valid".
**Kekuatan:** (1) kandidat recall-complete mengatasi kelemahan retrieval cosine — didemonstrasikan (Ps.35 rank 154); (2) pemisahan authority vs semantic centrality tepat; (3) kaveat stratified-sample §2.8 benar secara statistik.
**Isu:**
- **CRITICAL** · Abstrak, §2.8, Tab.5 · Klaim **"two-annotator gold (Cohen's κ=0.77)" faktual salah** — anotasi dilakukan SATU anotator (dua kolom = test-retest, konsisten 48/52) + telaah final pakar atas 52 pasangan. Wajib ditulis ulang jujur; κ antar-anotator tidak boleh diklaim.
- **CRITICAL** · Abstrak, §3.1, §3.3, Tab.1 · Coverage **88,9% (40/45) kedaluwarsa** → data tervalidasi kini **91,1% (41/45)**; structural holes 5 → **4** (defacement UGM, Indodax, 2 fraud BI-Fast — "lending-conduct case" & "deepfake" tidak lagi termasuk).
- **CRITICAL** · §3.4, Tab.3, Abstrak, Kesimpulan · Angka per-subjek lama (pelaku 100 · operator 88,9 · **konsumen 26,7 · regulator 11,1**) **tidak berlaku**: hasil tervalidasi + 52 override pakar = pelaku **86,7** · operator **75,6** · konsumen **77,8** · regulator **48,9**. Narasi "rarely compensates victims" gugur; **asimetri terpusat pada basis pengawasan regulator**. Ini mengubah abstrak, Tabel 3–4, §3.4–3.5, §3.7, §3.9, dan kesimpulan.
- **CRITICAL** · §3.2, Tab.2 · **CETS 225 "dirujuk 23×" terbukti false positive** (22 baris daftar afiliasi WHO 2021 + 1 sebutan organisasi; Konvensi baru diadopsi Mei 2024). Tabel otoritas tervalidasi: UU ITE 39 (catatan: 30 = sitiran-diri UU 1/2024; level-pasal tervalidasi = 5), PP PSTE 6, OECD 5, EU AI Act 4, UNESCO 3, UU PDP 1, UNGA 78/311 1, UNGA 78/265 1, **CETS 0**. "69 citation edges" → **66** (41 nama + 25 nomor; 237 sitiran diaudit: 228 riil, 9 noise).
- **MAJOR** · §2.6, §3.6, Tab.5 · Hakim produksi kini **Claude** (menggantikan Gemini); validasi vs telaah pakar final: **warrant-operatif F1 0,952 / recall 1,0 / κ 0,940**; lapis relevansi-substantif F1 0,741. Ambang "P≥95" adalah kalibrasi era-Gemini yang sudah dipensiunkan → Tabel 5 dan seluruh frasa "calibrated ≥95% confidence" ditulis ulang.
- **MAJOR** · absen · **Temuan de jure/de facto tidak ada**: basis pidana pelaku tersedia 86,7% insiden, tetapi pelaku teridentifikasi & diproses hanya **3/45 (6,7%)**. Tanpa ini, klaim coverage pidana menyesatkan pembaca — dan dengan ini, argumen naskah justru lebih tajam.
- **MINOR** · §2.3/§3.2 · Label "Bagian N" dokumen soft-law adalah indeks chunk internal, bukan nomor paragraf resmi — ungkapkan.
**Skor:** originality 7 · rigor 3 (karena staleness, bukan desain) · significance 8 · presentation 6 · fit 6 → **Major revision**

## R2 — Domain (hukum siber Indonesia)
**Penilaian:** Penguasaan kerangka ITE/PDP/PSTE baik dan pilihan korpus tepat. Dua kelemahan doktrinal: narasi konsumen dan ketajaman terhadap "vacuum scholarship".
**Kekuatan:** (1) korpus 17 instrumen representatif; (2) posisi SE 9/2023 sebagai soft law tepat; (3) pemetaan sektoral selaras praktik pengawasan.
**Isu:**
- **MAJOR** · §3.4, §3.7 · Dengan data baru, basis redress konsumen 77,8% (UU PDP Ps.12 hak gugat–ganti rugi, Ps.5–13; UU ITE Ps.26 ayat (2)) — cerita doktrinal yang benar: **hak privat tersedia di atas kertas; yang lemah adalah arsitektur pengawasan publik**, diperkuat fakta doktrinal bahwa **lembaga pengawas PDP (Ps.58–60) belum dibentuk** hingga kini. Sambungkan temuan regulator-gap 48,9% dengan kekosongan kelembagaan ini — itu penjelasan kausal yang kuat.
- **MAJOR** · §1, §3.7 · Perlawanan terhadap "vacuum scholarship" berisiko strawman: penulis yang dikutip umumnya menyoal ketiadaan **aturan AI-spesifik**, bukan ketiadaan hukum sama sekali. Rumuskan presisi: temuan Anda *mengonfirmasi* klaim AI-specific gap mereka, tetapi *menolak* generalisasi "vacuum" untuk insiden data/siber.
- **MINOR** · §3.2 · "Komdigi AI-ethics circular" anakronistik — penerbit saat itu Menkominfo (Des 2023); konsisten dengan penyebutan pertama.
- **MINOR** · Referensi · Beberapa outlet lemah/meragukan mutunya (Global Journal of Law, AI & Ethics; POLRI; Jurnal Indonesia MIK; dua entri tanpa volume/halaman/DOI — Wibowo 2025, Nicholle 2025). Untuk LTHJ, lengkapi metadata atau ganti dengan sumber lebih kokoh; tambahkan literatur penegakan/atribusi siber Indonesia untuk menopang temuan de facto.
**Skor:** originality 7 · rigor 6 · significance 8 · presentation 6 · fit 7 → **Major revision**

## R3 — Perspektif (STS / socio-legal)
**Penilaian:** Naskah kuat secara teknis tapi nyaris tanpa manusia — ironis untuk jurnal bernama *Law, Technology and Humans*. Data 279 juta warga muncul sebagai statistik, bukan pengalaman ketidakberdayaan hukum.
**Kekuatan:** (1) human-in-the-loop override adalah praktik epistemik yang baik; (2) pengakuan "no zero-hallucination claim" §2.10 jujur; (3) agenda hybrid governance §3.9 relevan kebijakan.
**Isu:**
- **MAJOR** · keseluruhan · **Dimensi manusia**: gunakan temuan de jure/de facto (6,7%) sebagai jendela pengalaman korban — warga yang datanya bocor menghadapi hukum yang "ada" namun tak pernah menyentuh pelakunya; asimetri regulator berarti tak ada lembaga yang menuntut akuntabilitas atas nama mereka. Satu sub-bagian (±500 kata) cukup mengubah karakter naskah agar selaras LTHJ.
- **MAJOR** · §2.6, §2.10 · **Refleksivitas**: AI dipakai menilai regulasi AI — sirkularitas epistemik ini harus dibahas eksplisit (mengapa desain expert-in-the-loop + validasi telaah pakar menjawabnya; batas residualnya apa). Ini justru bisa diklaim sebagai kontribusi metodologis.
- **MINOR** · §3.8 · Nada promosi; reframe kritis: batas otomasi nasihat hukum, risiko deskilling, tanggung jawab profesional.
- **MINOR** · literatur · Sambungkan ke kajian legal-tech kritis internasional (mis. Hildebrandt tentang law-as-computation; literatur computational legal studies di LTHJ sendiri) agar berdialog dengan audiens jurnal.
**Skor:** originality 7 · rigor 6 · significance 7 · presentation 5 · fit 5 → **Major revision**

## DA — Devil's Advocate
**Counter-argument terkuat (ringkas):** "Asimetri subjek" bisa jadi **artefak desain kandidat, bukan fakta hukum**. Kandidat hakim = top-12 cosine + whitelist yang didominasi pasal pidana-pelaku (PDP 65–68) dan kewajiban operator (35/36/46; PSTE 14) — hanya sedikit pasal hak-konsumen dan nyaris tanpa pasal kewenangan-regulator. Hakim hanya bisa memilih dari menu yang disodorkan; jika menu miring, distribusi peran ikut miring. Fakta bahwa angka konsumen justru tinggi (77,8%) sebagian menepis ini (banyak ditemukan via cosine, bukan whitelist), tetapi angka regulator-rendah tetap rentan terhadap kritik "pasal kewenangan memang jarang dimasukkan sebagai kandidat". Naskah wajib menjawab dengan uji ketahanan atau pengakuan limitasi eksplisit.
**Isu:**
- **MAJOR** · §2.6 · Artefak komposisi kandidat (di atas). Fix: laporkan komposisi kandidat per peran; tunjukkan berapa temuan peran berasal dari luar whitelist; atau tambahkan pasal kewenangan (PDP 58–60, PSTE pengawasan) ke kandidat dan cek stabilitas angka regulator; minimal: limitasi eksplisit.
- **MAJOR** · Abstrak, §3.3 · Coverage in-abstracto tanpa penegakan mengundang over-reading — setiap penyebutan coverage pidana wajib dipasangkan dengan 3/45. (Konvergen dengan R1/R3 dari arah berbeda.)
- **MAJOR** · umum · Generalisasi "Indonesia's AI regulation" dari sampel purposive 45 insiden besar-terliput — disiplinkan bahasa klaim ("dalam korpus ini").
- **MINOR** · §2.5 · Ambang tiered dipilih desain lalu dievaluasi pada sampel yang sama yang menstratifikasi disagreement — akui risiko post-hoc.
- **MINOR** · §2.10/§3.7 · Toulmin lebih banyak sebagai bingkai naratif dan fitur asisten daripada alat analisis hasil; tunjukkan SATU analisis Toulmin utuh atas satu insiden nyata (tabel!) di dalam naskah, atau turunkan klaim "integrating argumentation into the machine".
**Tidak ada CRITICAL yang independen** dari isu staleness (milik R1) → tidak memblokir keputusan revisi.
**Skor:** originality 7 · rigor 4 · significance 7 · presentation 5 · fit 6 → **Major revision**

---

## Editorial Decision — **MAJOR REVISION**
**Konsensus 5 reviewer:** (1) angka hasil kedaluwarsa/salah faktual harus diganti total dengan data tervalidasi terkini — ini akar rasa "tidak valid" penulis; (2) kepatuhan LTHJ (Chicago 18, disclosure AI, abstrak ≤250, cover letter); (3) reframing asimetri: regulator-terpusat + temuan de jure/de facto; (4) dimensi manusia & refleksivitas. **Divergensi:** DA menilai asimetri berpotensi artefak kandidat — diarbitrase menjadi kewajiban uji-ketahanan/limitasi (bukan pembatalan temuan, karena override pakar dan asal-cosine sebagian menetralkan). Keputusan bukan reject karena infrastruktur data kini kokoh dan seluruh perbaikan bersifat konkret-eksekutabel.

## Revision Roadmap (input langsung untuk academic-paper revision mode)
**P1 — Validitas (wajib sebelum hal lain):**
1. Ganti SELURUH angka: coverage 91,1% (41/45); holes 4; per-subjek 86,7/75,6/77,8/48,9; sektor dari sector_coverage.json terbaru; otoritas sitasi tervalidasi (CETS keluar; catat sitiran-diri UU ITE); 66 edges (41+25); 237 sitiran (228 riil/9 noise).
2. Tulis ulang validasi: 1 anotator + test-retest 48/52 + telaah final pakar 52/52; hakim Claude; dua lapis (operatif F1 0,952/κ 0,940; substantif F1 0,741); ambang P≥95 dipensiunkan; arsip Gemini sebagai provenance.
3. Tambah temuan & tabel de jure/de facto (86,7% vs 6,7%; 3 kasus diproses).
4. Regenerasi Figur 1–2 dari data baru (make_figures.py); perbarui Tabel 1–5.
**P2 — Kepatuhan LTHJ:** Chicago 18 footnotes+bibliografi; abstrak ≤250 + angka baru; Disclosure AI ganda (instrumen riset + bantuan penulisan, dengan pernyataan telaah penulis); cover letter; jaga total ≤10.000 kata.
**P3 — Substansi:** reframe asimetri (regulator + lembaga PDP belum dibentuk); presisi terhadap vacuum scholarship; sub-bagian dimensi manusia; paragraf refleksivitas; §3.8 kritis; disiplin klaim sampel; limitasi artefak-kandidat + 1 analisis Toulmin utuh ber-tabel.
**P4 — Materi lampiran (permintaan penulis "sumber material yang bisa dilampirkan"):** Appendix A: register 45 insiden + sitasi sumber + confidence (dari indonesia_incidents.json); Appendix B: daftar 17 instrumen + jumlah provisi; Data Availability: repo GitHub publik (soleh-hukumline/digital-ai-governance) + saran arsip DOI (Zenodo) untuk sitasi permanen; file gold + telaah pakar (claude_judge_work/) sebagai supplementary metodologi.
