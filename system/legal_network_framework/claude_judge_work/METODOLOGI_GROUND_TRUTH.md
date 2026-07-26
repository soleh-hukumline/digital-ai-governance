# Ground Truth & Validasi LLM-Judge — Catatan Metodologi

## 1. Anotator
- **Satu** anotator manusia (peneliti). File `validation_2_revisi.xlsx` memuat dua kolom
  (`annotator1`, `annotator2`) yang merupakan **dua pass orang yang sama** (test-retest),
  BUKAN dua koder independen. Karena itu **tidak** dilaporkan inter-annotator κ.
- Reliabilitas intra-anotator (pass-1 vs pass-2): 48/52 identik (4 beda).
- Telaah final tahap ketiga (`REVIEW_ANOTATOR_vs_CLAUDE_Review.xlsx`) menghasilkan
  **gold otoritatif** `gold_human_final.json` (52 pasangan, 16 relevan). Pada telaah ini
  anotator mengubah 8 putusan dari anotasi awal (mayoritas 0→1: memperluas relevansi).

## 2. Perbandingan hakim LLM
Gemini (produksi lama) diganti Claude (opus-4-8) atas permintaan peneliti ("Gemini ngawur").
Terhadap **gold telaah-manusia final** (n=52):

| Hakim | Basis | F1 | Precision | Recall | κ |
|---|---|---|---|---|---|
| **Claude** | gold-final | **0.741** | 0.909 | 0.625 | 0.654 |
| Claude | gold anotasi-awal (41 blind) | 0.909 | 1.000 | 0.833 | 0.895 |
| Gemini few-shot | gold anotasi-awal | 0.667 / 0.727 (P≥95) | — | — | — |

## 3. Divergensi sistematis (bukan error acak)
Presisi Claude tinggi (0.909) — hampir tak pernah menandai relevan yang salah.
Recall lebih rendah (0.625) karena **kriteria relevansi anotator lebih LUAS** daripada
aturan *warrant-ketat* yang diinstruksikan ke Claude. Enam "miss" Claude terkonsentrasi
pada dua kategori yang dapat dijelaskan:
- **Pasal 4 UU PDP (definisional/klasifikatif) ×3** — anotator menilai relevan karena
  menentukan objek yang bocor sebagai Data Pribadi (Ps. 4 ayat (3) huruf f); Claude
  mengecualikannya sebagai "definisional, non-operatif".
- **Seksi substantif soft-law ×3** (SE Komdigi Etika AI Bagian 1 & 15; UNESCO Bagian 73) —
  anotator menilai relevan pada tingkat kebijakan/etika; Claude mengecualikan sebagai
  "tidak mengikat".
Satu "over" Claude: UU ITE 19/2016 Ps. 26 pada insiden defacement Kejagung — anotator
menilai fakta tak cukup memicu unsur Ps. 26 (dan istilah peran "konsumen" tak tepat;
pasal memakai kategori "Orang").

**Implikasi:** perbedaan ini adalah pilihan skema koding (relevansi substantif-luas vs
warrant-operatif-ketat), bukan kekeliruan hakim. Paper perlu menyatakan definisi
relevansi yang dipakai secara eksplisit.

## 4. Catatan kualitas data yang tersurvei dari telaah
- **Label "Bagian N" soft-law = indeks chunk internal, BUKAN nomor paragraf resmi.**
  Terverifikasi off-by-one/drift pada UNESCO (Bagian 72→para 73, Bagian 73→para 74,
  Bagian 74→para 76). Berlaku semua dokumen chunk-based (UNESCO/Stranas/ASEAN/UNGA/WHO).
  Rekomendasi: jangan sajikan "Bagian N" seolah nomor paragraf resmi; beri keterangan
  "segmen internal" ATAU relabel ke nomor paragraf resmi (tugas terpisah, hati-hati).
- Peran "konsumen" pada UU ITE 19/2016 Ps. 26 sebaiknya "Orang/subjek data" agar sesuai teks.

## 5. Status
- 42/45 insiden dinilai Claude (1025 putusan). Batch13 (3 insiden) menunggu reset limit
  mingguan 25 Jul 2026. Gold & benchmark di atas TIDAK terpengaruh (validasi = 52 pasangan
  yang sudah lengkap).

## 6. Ketersediaan norma ≠ penegakan (de jure vs de facto)
Metrik coverage per subjek mengukur **ketersediaan norma in abstracto**: ada pasal
yang menjangkau *perbuatan* pada insiden itu untuk subjek tsb. Ia TIDAK mengklaim
pelaku teridentifikasi, unsur terbukti, atau perkara diproses. Pemeriksaan seluruh
45 insiden (kata kunci ditangkap/tersangka/terdakwa/divonis/dijerat/dituntut pada
kronologi+akibat+catatan verifikasi, lalu diverifikasi manual per kecocokan):
pelaku **teridentifikasi & diproses hukum hanya pada 3/45 insiden (6,7%)** —
(1) fraud BI-Fast Bank Jatim 2024: 4 terdakwa divonis TPPU PN Surabaya, otak buron;
(2) intrusi data guru BKN 2024: dituntut pidana; (3) deepfake NCII Undip 2025:
tersangka ditahan. (`election-candidate-deepfakes-2024` dikeluarkan — teks
eksplisit "bukan satu kasus yang dituntut".) Kontras 86,7% (norma pelaku tersedia)
vs 6,7% (pelaku terjangkau nyata) adalah **temuan kesenjangan de jure/de facto**:
untuk peretasan anonim, delik pidana tersedia tetapi tidak dapat dioperasikan
tanpa atribusi. Framing ini sejalan dengan catatan telaah anotator ("nilai 1 =
relevansi norma, bukan pembuktian/pertanggungjawaban").
