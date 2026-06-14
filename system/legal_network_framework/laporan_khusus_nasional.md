# Analisis Jaringan Regulasi Nasional Indonesia

Sub-analisis ini memetakan struktur internal regulasi nasional Indonesia berdasarkan semantic similarity (multilingual embeddings). Seluruh metrik dihitung langsung dari topologi sub-graf nasional.

## 1. Metrik Kohesi Nasional
| Metrik | Nilai |
| --- | --- |
| **Total Node Nasional** | 298 |
| **Koneksi Semantik Internal** | 302 edge |
| **Densitas Internal** | 0.0068 |

## 2. Distribusi per Instrumen
| Instrumen | Node | Terhubung | Edge (total degree) | Coverage |
| --- | --- | --- | --- | --- |
| POJK_No3_2024_Inovasi_Teknologi_Keuangan | 44 | 25 | 71 | 56.8% |
| PP_PSTE_No71_2019 | 102 | 56 | 168 | 54.9% |
| SE_Komdigi_No9_2023_Etika_AI | 13 | 7 | 39 | 53.8% |
| Stranas_AI_Indonesia_2020-2045_Full | 13 | 1 | 3 | 7.7% |
| UU_ITE_No19_2016 | 19 | 14 | 68 | 73.7% |
| UU_ITE_No1_2024 | 30 | 25 | 153 | 83.3% |
| UU_PDP_No27_2022 | 77 | 38 | 102 | 49.4% |

## 3. Degree Centrality — Top 10
| Peringkat | Node | Instrumen | Skor |
| --- | --- | --- | --- |
| 1 | UU_ITE_No1_2024 - Pasal 4o | UU_ITE_No1_2024 | 0.0909 |
| 2 | PP_PSTE_No71_2019 - Pasal 14 | PP_PSTE_No71_2019 | 0.0606 |
| 3 | UU_ITE_No1_2024 - Pasal 15a | UU_ITE_No1_2024 | 0.0606 |
| 4 | UU_ITE_No19_2016 - Pasal 33 | UU_ITE_No19_2016 | 0.0539 |
| 5 | POJK_No3_2024_Inovasi_Teknologi_Keuangan - Pasal 31 | POJK_No3_2024_Inovasi_Teknologi_Keuangan | 0.0505 |
| 6 | UU_ITE_No1_2024 - Pasal 13 | UU_ITE_No1_2024 | 0.0471 |
| 7 | UU_ITE_No1_2024 - Pasal 28j | UU_ITE_No1_2024 | 0.0404 |
| 8 | SE_Komdigi_No9_2023_Etika_AI - Bagian 13 | SE_Komdigi_No9_2023_Etika_AI | 0.0404 |
| 9 | UU_ITE_No1_2024 - Pasal 5 | UU_ITE_No1_2024 | 0.0370 |
| 10 | UU_ITE_No19_2016 - Pasal 5 | UU_ITE_No19_2016 | 0.0337 |

## 4. Betweenness Centrality — Top 10
| Peringkat | Node | Instrumen | Skor |
| --- | --- | --- | --- |
| 1 | UU_ITE_No1_2024 - Pasal 4o | UU_ITE_No1_2024 | 0.1024 |
| 2 | UU_ITE_No19_2016 - Pasal 40 | UU_ITE_No19_2016 | 0.0805 |
| 3 | POJK_No3_2024_Inovasi_Teknologi_Keuangan - Pasal 1 | POJK_No3_2024_Inovasi_Teknologi_Keuangan | 0.0777 |
| 4 | UU_ITE_No1_2024 - Pasal 13 | UU_ITE_No1_2024 | 0.0696 |
| 5 | PP_PSTE_No71_2019 - Pasal 14 | PP_PSTE_No71_2019 | 0.0564 |
| 6 | UU_PDP_No27_2022 - Pasal 58 | UU_PDP_No27_2022 | 0.0552 |
| 7 | UU_ITE_No19_2016 - Pasal 33 | UU_ITE_No19_2016 | 0.0491 |
| 8 | UU_ITE_No1_2024 - Pasal 18a | UU_ITE_No1_2024 | 0.0488 |
| 9 | PP_PSTE_No71_2019 - Pasal 51 | PP_PSTE_No71_2019 | 0.0482 |
| 10 | POJK_No3_2024_Inovasi_Teknologi_Keuangan - Pasal 4 | POJK_No3_2024_Inovasi_Teknologi_Keuangan | 0.0456 |

## 5. Node Terisolasi (132 node)
| Node | Instrumen | Klasifikasi |
| --- | --- | --- |
| PP_PSTE_No71_2019 - Pasal 12 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 13 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 17 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 22 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 24 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 27 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 31 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 42 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 48 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 49 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 50 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 52 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 58 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 59 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 60 | PP_PSTE_No71_2019 | Natl: Binding Law |
| *(+117 lainnya)* | | |

---
*Sub-laporan dihasilkan dari analisis NetworkX pada sub-graf regulasi nasional. Metrik dihitung dari data graf aktual tanpa interpretasi manual.*