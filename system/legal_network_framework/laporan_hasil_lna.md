# Laporan Master Legal Network Analysis (LNA)

Laporan ini dihasilkan secara otomatis menggunakan **Legal Network Analysis (LNA)** berbasis multilingual sentence embeddings (paraphrase-multilingual-MiniLM-L12-v2) dan NetworkX. Seluruh metrik dihitung langsung dari topologi graf.

## Otoritas berdasarkan Sitasi Eksplisit
Lapisan ini adalah **lapisan OTORITAS PRIMER dan paling defensibel** dalam analisis: ia dihitung dari **lintas-referensi sitasi eksplisit antar-instrumen** (level-instrumen), bukan dari kedekatan tekstual. **Otoritas = in-degree**, yaitu seberapa sering sebuah instrumen *disitasi* oleh dokumen lain di dalam korpus. Angka diambil verbatim dari `data/network/citations.json` (field `coverage[].in`).

Total **69 edge sitasi** (44 by-name, 25 by-number) di antara **17 dokumen**; dokumen **terisolasi-secara-sitasi = 0**.

### Hub Otoritas — Instrumen Paling Sering Disitasi (in-degree)
| Peringkat | Instrumen | Disitasi (in-degree) | Menyitasi (out) | Peran |
| --- | --- | --- | --- | --- |
| 1 | UU ITE 19/2016 | 39 | 3 | both |
| 2 | Council of Europe Framework Convention (CETS225) | 23 | 3 | both |
| 3 | UNGA Res 78/265 | 7 | 21 | both |
| 4 | PP PSTE 71/2019 | 6 | 9 | both |
| 5 | OECD AI Principles | 5 | 5 | both |
| 6 | EU AI Act | 4 | 24 | both |
| 7 | UNESCO Recommendation on AI Ethics | 3 | 7 | both |
| 8 | UNGA Res 78/311 (Global Digital Compact) | 1 | 11 | both |
| 9 | UU PDP 27/2022 | 1 | 3 | both |

> **UU ITE 19/2016 adalah hub otoritas nyata** (disitasi 39×) — simpul rujukan inti rezim digital Indonesia, jauh melampaui instrumen lain. **Council of Europe Framework Convention (CETS225)** menyusul (23×), lalu **UNGA Res 78/265** (7×), **PP PSTE 71/2019** (6×), dan **OECD AI Principles** (5×).

### Instrumen SOURCE/LEAF (menyitasi, tetapi disitasi 0× di dalam korpus)
| Instrumen | Disitasi (in-degree) | Menyitasi (out) |
| --- | --- | --- |
| WHO Ethics & Governance of AI for Health | 0 | 59 |
| Stranas AI 2020-2045 | 0 | 44 |
| UU ITE 1/2024 | 0 | 31 |
| ISO/IEC 42001 | 0 | 10 |
| SE Komdigi 9/2023 (Etika AI) | 0 | 8 |
| POJK 3/2024 (Inovasi Teknologi Keuangan) | 0 | 5 |
| ASEAN Guide on AI Governance | 0 | 4 |
| G7 Hiroshima Code of Conduct | 0 | 3 |

> Terdapat **8 instrumen source/leaf** yang aktif merujuk instrumen lain namun belum pernah dirujuk balik di dalam korpus — termasuk soft-law/standar yang relatif baru atau berperan sebagai penerima norma (mis. WHO, Stranas AI, UU ITE 1/2024, ISO/IEC 42001, SE Komdigi, ASEAN Guide, G7 Hiroshima, POJK).

> **CATATAN METODOLOGIS:** Otoritas berbasis-sitasi di atas adalah lapisan PRIMER. Seksi *Sentralitas Semantik (SBERT)* di bawah bersifat **eksploratif/sekunder** — ia mengukur tumpang-tindih tekstual dan cenderung *menggelembungkan* soft-law panjang (Stranas/WHO/SE Komdigi) karena banyaknya seksi generik, sehingga **BUKAN ukuran otoritas**.

---

## 1. Topologi Jaringan Makro
| Metrik | Nilai |
| --- | --- |
| **Total Node** | 916 |
| **Node Internasional** | 541 |
| **Node Nasional** | 330 |
| **Node Insiden** | 45 |
| **Total Edge** | 8005 |
| **Densitas Jaringan** | 0.01910 |
| **Insiden Terhubung ke ≥1 Regulasi** | 20/45 (44.4%) |

> **Catatan.** Angka di atas adalah metrik *degree>0* pada graf kemiripan SBERT (eksploratif) — **bukan** klaim cakupan tervalidasi. Cakupan insiden yang defensibel = **88.9% (40/45)** dari *LLM judge* tervalidasi-manusia; nilai 44.4% di sini kebetulan sama dengan baseline kosinus yang sudah DITARIK dan tidak boleh disamakan dengan klaim vakum tersebut (lihat REVIEWER_RESPONSE.md §2.3/§2.4).

## 2. Sentralitas Semantik (SBERT — eksploratif, BUKAN otoritas) — Top 10
> **Eksploratif/sekunder.** Skor di bawah adalah *degree centrality* pada graf **kemiripan tekstual SBERT** (paraphrase-multilingual-MiniLM-L12-v2), yang mengukur **tumpang-tindih semantik**, BUKAN otoritas hukum. Metrik ini cenderung *menggelembungkan* soft-law panjang (mis. Stranas/WHO/SE Komdigi) karena banyaknya seksi generik. Untuk otoritas yang defensibel, lihat seksi *Otoritas berdasarkan Sitasi Eksplisit* di atas (in-degree sitasi).
| Peringkat | Node | Klasifikasi | Skor |
| --- | --- | --- | --- |
| 1 | Stranas_AI_Indonesia_2020-2045_Full - Bagian 70 | Natl: Strategy & Soft Law | 0.2197 |
| 2 | Stranas_AI_Indonesia_2020-2045_Full - Bagian 56 | Natl: Strategy & Soft Law | 0.1858 |
| 3 | SE_Komdigi_No9_2023_Etika_AI - Bagian 5 | Natl: Sectoral/Agency Guidance | 0.1770 |
| 4 | Stranas_AI_Indonesia_2020-2045_Full - Bagian 49 | Natl: Strategy & Soft Law | 0.1738 |
| 5 | SE_Komdigi_No9_2023_Etika_AI - Bagian 12 | Natl: Sectoral/Agency Guidance | 0.1716 |
| 6 | SE_Komdigi_No9_2023_Etika_AI - Bagian 14 | Natl: Sectoral/Agency Guidance | 0.1607 |
| 7 | SE_Komdigi_No9_2023_Etika_AI - Bagian 6 | Natl: Sectoral/Agency Guidance | 0.1454 |
| 8 | SE_Komdigi_No9_2023_Etika_AI - Bagian 11 | Natl: Sectoral/Agency Guidance | 0.1399 |
| 9 | G7_Hiroshima_Code_of_Conduct_for_AI - Bagian 10 | Intl: Soft Law | 0.1257 |
| 10 | SE_Komdigi_No9_2023_Etika_AI - Bagian 4 | Natl: Sectoral/Agency Guidance | 0.1224 |

## 3. Betweenness Centrality — Top 10
| Peringkat | Node | Klasifikasi | Skor |
| --- | --- | --- | --- |
| 1 | SE_Komdigi_No9_2023_Etika_AI - Bagian 5 | Natl: Sectoral/Agency Guidance | 0.05136 |
| 2 | SE_Komdigi_No9_2023_Etika_AI - Bagian 12 | Natl: Sectoral/Agency Guidance | 0.03811 |
| 3 | Stranas_AI_Indonesia_2020-2045_Full - Bagian 56 | Natl: Strategy & Soft Law | 0.03716 |
| 4 | Stranas_AI_Indonesia_2020-2045_Full - Bagian 70 | Natl: Strategy & Soft Law | 0.03582 |
| 5 | SE_Komdigi_No9_2023_Etika_AI - Bagian 14 | Natl: Sectoral/Agency Guidance | 0.03307 |
| 6 | Stranas_AI_Indonesia_2020-2045_Full - Bagian 49 | Natl: Strategy & Soft Law | 0.02933 |
| 7 | SE_Komdigi_No9_2023_Etika_AI - Bagian 6 | Natl: Sectoral/Agency Guidance | 0.02723 |
| 8 | SE_Komdigi_No9_2023_Etika_AI - Bagian 11 | Natl: Sectoral/Agency Guidance | 0.02481 |
| 9 | Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 34 | Intl: Binding Law | 0.02268 |
| 10 | UNESCO_Recommendation_on_AI_Ethics_2021 - Bagian 72 | Intl: Soft Law | 0.01982 |

## 4. Isolasi Node Internasional
| Metrik | Nilai |
| --- | --- |
| **Total Node Internasional** | 541 |
| **Node Terisolasi (degree=0)** | 70 (12.9%) |
| **Node Terhubung** | 471 |

### Daftar Node Internasional Terisolasi
| Node | Group |
| --- | --- |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 23 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 27 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 28 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 29 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 30 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 31 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 32 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 35 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 36 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| EU_AI_Act_2024 - Article 5 | EU_AI_Act_2024 |
| EU_AI_Act_2024 - Article 26 | EU_AI_Act_2024 |
| EU_AI_Act_2024 - Article 12 | EU_AI_Act_2024 |
| EU_AI_Act_2024 - Article 29 | EU_AI_Act_2024 |
| EU_AI_Act_2024 - Article 32 | EU_AI_Act_2024 |
| EU_AI_Act_2024 - Article 33 | EU_AI_Act_2024 |
| EU_AI_Act_2024 - Article 35 | EU_AI_Act_2024 |
| EU_AI_Act_2024 - Article 39 | EU_AI_Act_2024 |
| EU_AI_Act_2024 - Article 42 | EU_AI_Act_2024 |
| EU_AI_Act_2024 - Section 2 | EU_AI_Act_2024 |
| EU_AI_Act_2024 - Article 98 | EU_AI_Act_2024 |
| *(+50 lainnya)* | |

## 5. Coverage per Klaster Regulasi
| Klaster | Total Node | Node Terhubung | Coverage |
| --- | --- | --- | --- |
| ASEAN_Guide_AI_Governance_Ethics_2024 | 80 | 70 | 87.5% |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 | 36 | 27 | 75.0% |
| EU_AI_Act_2024 | 111 | 93 | 83.8% |
| G7_Hiroshima_Code_of_Conduct_for_AI | 17 | 17 | 100.0% |
| ISO_IEC_42001_AI_Management_System | 48 | 44 | 91.7% |
| Insiden Kasus | 45 | 20 | 44.4% |
| OECD_AI_Principles_2024 | 39 | 34 | 87.2% |
| POJK_No3_2024_Inovasi_Teknologi_Keuangan | 44 | 38 | 86.4% |
| PP_PSTE_No71_2019 | 100 | 84 | 84.0% |
| SE_Komdigi_No9_2023_Etika_AI | 15 | 14 | 93.3% |
| Stranas_AI_Indonesia_2020-2045_Full | 80 | 69 | 86.2% |
| UNESCO_Recommendation_on_AI_Ethics_2021 | 80 | 78 | 97.5% |
| UNGA_Res_78_265_Safe_Secure_Trustworthy_AI | 33 | 32 | 97.0% |
| UNGA_Res_78_311_Global_Digital_Compact_or_AI | 17 | 17 | 100.0% |
| UU_ITE_No19_2016 | 6 | 6 | 100.0% |
| UU_ITE_No1_2024 | 17 | 16 | 94.1% |
| UU_PDP_No27_2022 | 68 | 61 | 89.7% |
| WHO_Ethics_and_Governance_of_AI_for_Health | 80 | 59 | 73.8% |

> **Catatan (baris _Insiden Kasus_).** Coverage 44.4% (20/45) di sini identik dengan metrik *degree>0* pada graf kemiripan SBERT di §1 — bersifat **eksploratif**, **bukan** klaim cakupan tervalidasi. Cakupan insiden yang defensibel = **88.9% (40/45)** dari *LLM judge* tervalidasi-manusia; angka 44.4% kebetulan sama dengan baseline kosinus yang sudah DITARIK dan tidak boleh disamakan dengan klaim vakum tersebut (lihat REVIEWER_RESPONSE.md §2.3/§2.4).


## 6. Connected Components
| Metrik | Nilai |
| --- | --- |
| **Jumlah Komponen** | 141 |
| **Komponen Terbesar** | 771 node |
| **Node Terisolasi Total** | 137 |

---
*Laporan ini di-generate otomatis menggunakan NetworkX + multilingual sentence embeddings. Seluruh angka dihitung langsung dari topologi graf tanpa interpretasi manual.*