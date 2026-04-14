# Analisis Jaringan Regulasi Nasional Indonesia

Sub-analisis ini memetakan struktur internal regulasi nasional Indonesia berdasarkan semantic similarity (multilingual embeddings). Seluruh metrik dihitung langsung dari topologi sub-graf nasional.

## 1. Metrik Kohesi Nasional
| Metrik | Nilai |
| --- | --- |
| **Total Node Nasional** | 241 |
| **Koneksi Semantik Internal** | 193 edge |
| **Densitas Internal** | 0.0067 |

## 2. Distribusi per Instrumen
| Instrumen | Node | Terhubung | Edge (total degree) | Coverage |
| --- | --- | --- | --- | --- |
| PP_PSTE_No71_2019 | 102 | 51 | 113 | 50.0% |
| Stranas_AI_Indonesia_2020-2045_Full | 13 | 1 | 3 | 7.7% |
| UU_ITE_No19_2016 | 19 | 14 | 61 | 73.7% |
| UU_ITE_No1_2024 | 30 | 24 | 131 | 80.0% |
| UU_PDP_No27_2022 | 77 | 36 | 78 | 46.8% |

## 3. Degree Centrality — Top 10
| Peringkat | Node | Instrumen | Skor |
| --- | --- | --- | --- |
| 1 | UU_ITE_No1_2024 - Pasal 4o | UU_ITE_No1_2024 | 0.1083 |
| 2 | UU_ITE_No1_2024 - Pasal 15a | UU_ITE_No1_2024 | 0.0750 |
| 3 | PP_PSTE_No71_2019 - Pasal 14 | PP_PSTE_No71_2019 | 0.0625 |
| 4 | UU_ITE_No19_2016 - Pasal 33 | UU_ITE_No19_2016 | 0.0542 |
| 5 | UU_ITE_No1_2024 - Pasal 5 | UU_ITE_No1_2024 | 0.0458 |
| 6 | UU_ITE_No19_2016 - Pasal 5 | UU_ITE_No19_2016 | 0.0417 |
| 7 | UU_ITE_No1_2024 - Pasal 28j | UU_ITE_No1_2024 | 0.0417 |
| 8 | UU_ITE_No1_2024 - Pasal 18a | UU_ITE_No1_2024 | 0.0417 |
| 9 | UU_PDP_No27_2022 - Pasal 2 | UU_PDP_No27_2022 | 0.0333 |
| 10 | UU_ITE_No1_2024 - Pasal 168 | UU_ITE_No1_2024 | 0.0292 |

## 4. Betweenness Centrality — Top 10
| Peringkat | Node | Instrumen | Skor |
| --- | --- | --- | --- |
| 1 | UU_ITE_No1_2024 - Pasal 4o | UU_ITE_No1_2024 | 0.0805 |
| 2 | UU_ITE_No19_2016 - Pasal 33 | UU_ITE_No19_2016 | 0.0703 |
| 3 | UU_ITE_No1_2024 - Pasal 45a | UU_ITE_No1_2024 | 0.0654 |
| 4 | PP_PSTE_No71_2019 - Pasal 14 | PP_PSTE_No71_2019 | 0.0626 |
| 5 | UU_ITE_No19_2016 - Pasal 29 | UU_ITE_No19_2016 | 0.0621 |
| 6 | UU_PDP_No27_2022 - Pasal 58 | UU_PDP_No27_2022 | 0.0592 |
| 7 | UU_ITE_No1_2024 - Pasal 18a | UU_ITE_No1_2024 | 0.0543 |
| 8 | UU_ITE_No1_2024 - Pasal 278 | UU_ITE_No1_2024 | 0.0478 |
| 9 | PP_PSTE_No71_2019 - Pasal 96 | PP_PSTE_No71_2019 | 0.0428 |
| 10 | UU_PDP_No27_2022 - Pasal 69 | UU_PDP_No27_2022 | 0.0406 |

## 5. Node Terisolasi (115 node)
| Node | Instrumen | Klasifikasi |
| --- | --- | --- |
| PP_PSTE_No71_2019 - Pasal 12 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 13 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 17 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 22 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 24 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 27 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 29 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 31 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 37 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 39 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 40 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 42 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 48 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 49 | PP_PSTE_No71_2019 | Natl: Binding Law |
| PP_PSTE_No71_2019 - Pasal 50 | PP_PSTE_No71_2019 | Natl: Binding Law |
| *(+100 lainnya)* | | |

---
*Sub-laporan dihasilkan dari analisis NetworkX pada sub-graf regulasi nasional. Metrik dihitung dari data graf aktual tanpa interpretasi manual.*