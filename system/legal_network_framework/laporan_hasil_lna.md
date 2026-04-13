# Laporan Hasil Analisis Jaringan Hukum (Legal Network Analysis)

Berdasarkan metodologi dari *Maastricht Law Tech*, berikut adalah hasil ekstraksi topologi spasial-hukum tata kelola digital di Indonesia:

## 1. Topologi Jaringan Makro
- **Total Simpul (Nodes):** 335 (Regulasi Global, Regulasi Nasional, Insiden Siber)
- **Total Relasi (Edges):** 624
- **Densitas (Network Density):** 0.0112
  > *Interpretasi:* Nilai densitas (kepadatan jaringan) yang amat rendah menandakan tingginya beban atau sentralisasi pada segelintir landasan hukum eksisting yang bersifat umum (*lex generalis*). Dalam praktiknya, penanganan insiden saat ini sangat bergantung pada **Pasal 40 UU ITE No. 1/2024** (tentang kewenangan pemerintah melakukan pemutusan akses konten) serta **Pasal 14 dan Pasal 24 PP PSTE No. 71/2019** (tentang kewajiban mutlak Penyelenggara Sistem Elektronik untuk memutus dan mencegah penyebaran informasi terlarang). Mekanisme ini bertumpu pada pendekatan reaktif pasca-terjadinya insiden, yakni semata-mata pada kontrol peredaran konten.\n>\n> Keadaan tersebut memperlihatkan adanya kesenjangan bila dibandingkan dengan kerangka regulasi global saat ini, seperti **Pasal 5 pada EU AI Act**. Regulasi Eropa tersebut telah menggunakan pendekatan preventif (pencegahan) dengan langkah melarang secara tegas praktik pengembangan sistem AI yang dapat memanipulasi kesadaran kognitif manusia (*subliminal manipulation*). Kekosongan norma yang memiliki paradigma pencegahan sejak tahap desain (risk-based approach) seperti ini dalam arsitektur hukum Indonesia menjadi alasan mengapa rujukan norma lintas sektor untuk tata kelola AI belum terbangun secara ideal dan sistematis.

## 2. Hub Regulasi (Degree Centrality)
Simpul dengan sentralitas tertinggi bertindak sebagai penyalur utama yurisdiksi atas perkara (sebagai *lex generalis* dominan).
  1. **PP_PSTE_No71_2019 - Pasal 14** (Skor: 0.2186)
  2. **PP_PSTE_No71_2019 - Pasal 24** (Skor: 0.1587)
  3. **UU_ITE_No1_2024 - Pasal 18** (Skor: 0.1168)
  4. **UU_ITE_No1_2024 - Pasal 40** (Skor: 0.0988)
  5. **PP_PSTE_No71_2019 - Pasal 21** (Skor: 0.0928)

  > *Interpretasi:* Kedudukan sentral pada regulasi ini mengindikasikan fungsinya sebagai instrumen hukum yang paling sering dirujuk dalam penanganan kasus. Insiden siber terkait AI umumnya diproses dalam yurisdiksi perundang-undangan ini akibat tidak adanya instrumen lex specialis AI yang spesifik.

## 3. Penjembatan Hukum (Betweenness Centrality)
Titik dengan keterantaraan tertinggi merupakan mediator integratif antara pembingkaian regulasi makro dan penegakan kasus di tingkat mikro.
  1. **PP_PSTE_No71_2019 - Pasal 14** (Skor: 0.1077)
  2. **PP_PSTE_No71_2019 - Pasal 24** (Skor: 0.0730)
  3. **UU_ITE_No1_2024 - Pasal 18** (Skor: 0.0417)

  > *Interpretasi:* Instrumen regulasi ini merupakan regulasi yang paling sering menjadi perantara dalam penanganan kasus. Amandemen terhadap substansi regulasi ini berpotensi mengubah lanskap kepastian hukum pada sebagian besar resolusi insiden nasional.

## 4. Analisis Kekosongan Struktural (Structural Holes)
Melalui analisis korelasi kausalitas pada 100 sampel insiden yang terjadi di Indonesia, diidentifikasi kesenjangan hukum berikut:
- Kasus **Voice Cloning (Deepfake)** dan **Adultery Generative AI** tidak memiliki fondasi yurisdiksi yang relevan dalam melindungi eksploitasi kepribadian digital manusia (*Digital Personality Rights*). Secara arsitektural, Hukum Positif Indonesia menempatkan 'Hak Atas Potret' sebagai sub-kategori di dalam kerangka **UU Hak Cipta No. 28 Tahun 2014 (Pasal 12)**, yang secara restriktif mensyaratkan adanya motif 'komersialisasi reklame/periklanan' untuk dijerat. Mengingat insiden pencurian biometrik AI di lapangan lebih didorong oleh motif politik, manipulasi hoaks, atau murni kejahatan balas dendam disinformasional (non-komersial), rezim Hak Cipta ini otomatis lumpuh menjerat pelaku eksploitasi. Oleh karenanya, instrumen negara secara reaktif terpaksa menggeser locus delicti kasus-kasus ini ke delik penyebaran konten asusila/hoaks menggunakan **UU ITE No. 1 Tahun 2024 Pasal 27 & 28**, yang jelas merupakan pendekatan 'tambal sulam' (Band-Aid approach) yang sama sekali tidak mengatur kejahatan pencurian biometrik algoritmik dari akar pembuatannya.
- Terdapat tingkat isolasi yang radikal pada instrumen **Global Soft Law (seperti UNESCO/OECD AI)**. Indikator ini membuktikan rendahnya daya adopsi (*Legal Transplantation*) instrumen soft law ke dalam instrumen hukum nasional di ranah praksis.


---
*Laporan ini di-*generate* otomatis menggunakan `networkx` engine berdasarkan dataset AI Governance Watch.*