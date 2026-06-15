# Analisis Jaringan Regulasi Nasional Indonesia

Sub-analisis ini memetakan regulasi nasional Indonesia pada dua lapisan. **Lapisan otoritas utama** adalah *sitasi instrumen-ke-instrumen* (cross-reference eksplisit) yang dibaca dari `data/network/citations.json` — metrik legal yang dapat dipertanggungjawabkan dan tidak bergantung pada model embedding. **Lapisan sekunder** adalah kemiripan tekstual SBERT (multilingual embeddings) yang bersifat *eksploratif* untuk memetakan tumpang-tindih semantik, BUKAN otoritas.

## 0. Otoritas Sitasi — Lapisan Otoritas Utama (PRIMER)
*Otoritas = **in-degree**: seberapa sering sebuah instrumen DIKUTIP (cross-reference eksplisit) oleh instrumen lain dalam korpus 17 dokumen (**69 edge sitasi**, **17 dokumen**, **0 terisolasi-by-citation**). Lapisan ini berbasis instrumen, dihitung langsung dari `citations.json`, dan TIDAK bergantung pada embedding — inilah ukuran otoritas yang dipakai untuk interpretasi.*

| Peringkat | Instrumen Nasional | Dikutip (in-degree) | Peran sitasi |
| --- | --- | --- | --- |
| 1 | UU ITE No.19/2016 | **39** | both |
| 2 | PP PSTE No.71/2019 | **6** | both |
| 3 | UU PDP No.27/2022 | **1** | both |

**Pembacaan:** **UU ITE No.19/2016** adalah hub otoritas sesungguhnya dari korpus nasional (dikutip 39×), jauh di atas **PP PSTE No.71/2019** (6×) dan **UU PDP No.27/2022** (1×). Ini berbeda tajam dari tabel kemiripan semantik SBERT di bawah, yang justru didominasi soft-law (Stranas AI, SE Komdigi).

**Instrumen sumber/leaf (mengutip pihak lain tetapi dikutip 0× dalam korpus)** — yakni *adopter soft-law hilir*, bukan otoritas: UU ITE No.1/2024, SE Komdigi No.9/2023 (Etika AI), Stranas AI 2020-2045, POJK No.3/2024 (Inovasi Teknologi Keuangan). Termasuk **SE Komdigi No.9/2023** dan **UU ITE No.1/2024**, yang mengutip instrumen lain tetapi belum menjadi rujukan otoritatif dalam korpus.

## 1. Metrik Kohesi Nasional
| Metrik | Nilai |
| --- | --- |
| **Total Node Nasional** | 330 |
| **Koneksi Semantik Internal** | 512 edge |
| **Densitas Internal** | 0.0094 |

## 2. Distribusi per Instrumen
| Instrumen | Node | Terhubung | Edge (total degree) | Coverage |
| --- | --- | --- | --- | --- |
| POJK_No3_2024_Inovasi_Teknologi_Keuangan | 44 | 20 | 87 | 45.5% |
| PP_PSTE_No71_2019 | 100 | 76 | 351 | 76.0% |
| SE_Komdigi_No9_2023_Etika_AI | 15 | 12 | 119 | 80.0% |
| Stranas_AI_Indonesia_2020-2045_Full | 80 | 29 | 64 | 36.2% |
| UU_ITE_No19_2016 | 6 | 6 | 72 | 100.0% |
| UU_ITE_No1_2024 | 17 | 15 | 210 | 88.2% |
| UU_PDP_No27_2022 | 68 | 37 | 121 | 54.4% |

## 3. Sentralitas Semantik (SBERT — eksploratif, BUKAN otoritas)
*Tabel berikut adalah **degree centrality berbasis kemiripan tekstual SBERT**, bukan otoritas sitasi. Metrik ini mengukur tumpang-tindih semantik dan cenderung **menggelembungkan soft-law panjang** (mis. Stranas AI, SE Komdigi) karena banyaknya seksi generik. Gunakan sebagai lensa sekunder/eksploratif; lapisan otoritas adalah tabel sitasi pada §0 (UU ITE 19/2016 = hub, in-degree 39).*

| Peringkat | Node | Instrumen | Skor SBERT |
| --- | --- | --- | --- |
| 1 | UU_ITE_No1_2024 - Pasal 13A | UU_ITE_No1_2024 | 0.1307 |
| 2 | SE_Komdigi_No9_2023_Etika_AI - Bagian 5 | SE_Komdigi_No9_2023_Etika_AI | 0.1185 |
| 3 | UU_ITE_No1_2024 - Pasal 16A | UU_ITE_No1_2024 | 0.0851 |
| 4 | PP_PSTE_No71_2019 - Pasal 14 | PP_PSTE_No71_2019 | 0.0821 |
| 5 | UU_ITE_No19_2016 - Pasal 26 | UU_ITE_No19_2016 | 0.0790 |
| 6 | UU_ITE_No1_2024 - Pasal 40 | UU_ITE_No1_2024 | 0.0669 |
| 7 | UU_ITE_No19_2016 - Pasal 40 | UU_ITE_No19_2016 | 0.0638 |
| 8 | UU_ITE_No1_2024 - Pasal 13 | UU_ITE_No1_2024 | 0.0608 |
| 9 | UU_ITE_No1_2024 - Pasal 17 | UU_ITE_No1_2024 | 0.0578 |
| 10 | UU_ITE_No1_2024 - Pasal 18A | UU_ITE_No1_2024 | 0.0578 |

## 4. Betweenness Centrality — Top 10
| Peringkat | Node | Instrumen | Skor |
| --- | --- | --- | --- |
| 1 | PP_PSTE_No71_2019 - Pasal 14 | PP_PSTE_No71_2019 | 0.0734 |
| 2 | SE_Komdigi_No9_2023_Etika_AI - Bagian 5 | SE_Komdigi_No9_2023_Etika_AI | 0.0522 |
| 3 | UU_ITE_No19_2016 - Pasal 26 | UU_ITE_No19_2016 | 0.0522 |
| 4 | UU_ITE_No1_2024 - Pasal 13A | UU_ITE_No1_2024 | 0.0510 |
| 5 | UU_ITE_No1_2024 - Pasal 16A | UU_ITE_No1_2024 | 0.0339 |
| 6 | SE_Komdigi_No9_2023_Etika_AI - Bagian 4 | SE_Komdigi_No9_2023_Etika_AI | 0.0338 |
| 7 | SE_Komdigi_No9_2023_Etika_AI - Bagian 12 | SE_Komdigi_No9_2023_Etika_AI | 0.0299 |
| 8 | UU_ITE_No1_2024 - Pasal 40 | UU_ITE_No1_2024 | 0.0223 |
| 9 | SE_Komdigi_No9_2023_Etika_AI - Bagian 14 | SE_Komdigi_No9_2023_Etika_AI | 0.0199 |
| 10 | PP_PSTE_No71_2019 - Pasal 20 | PP_PSTE_No71_2019 | 0.0194 |

## 5. Node Terisolasi (135 node)
| Node | Instrumen | Klasifikasi |
| --- | --- | --- |
| PP_PSTE_No71_2019 - Pasal 12 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 25 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 27 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 61 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 62 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 65 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 66 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 68 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 70 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 75 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 76 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 77 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 78 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 79 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 80 | PP_PSTE_No71_2019 | Natl: Binding Law |
| *(+120 lainnya)* | | |

---
*Sub-laporan dihasilkan dari analisis NetworkX pada sub-graf regulasi nasional. Metrik dihitung dari data graf aktual tanpa interpretasi manual.*