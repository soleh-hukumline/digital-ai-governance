# Laporan Master Legal Network Analysis (LNA)

Laporan ini dihasilkan secara otomatis menggunakan **Legal Network Analysis (LNA)** berbasis multilingual sentence embeddings (paraphrase-multilingual-MiniLM-L12-v2) dan NetworkX. Seluruh metrik dihitung langsung dari topologi graf.

## 1. Topologi Jaringan Makro
| Metrik | Nilai |
| --- | --- |
| **Total Node** | 831 |
| **Node Internasional** | 488 |
| **Node Nasional** | 298 |
| **Node Insiden** | 45 |
| **Total Edge** | 3330 |
| **Densitas Jaringan** | 0.00966 |
| **Insiden Terhubung ke ≥1 Regulasi** | 25/45 (55.6%) |

## 2. Degree Centrality — Top 10
| Peringkat | Node | Klasifikasi | Skor |
| --- | --- | --- | --- |
| 1 | SE_Komdigi_No9_2023_Etika_AI - Bagian 3 | Natl: Sectoral/Agency Guidance | 0.1964 |
| 2 | SE_Komdigi_No9_2023_Etika_AI - Bagian 4 | Natl: Sectoral/Agency Guidance | 0.1795 |
| 3 | SE_Komdigi_No9_2023_Etika_AI - Bagian 12 | Natl: Sectoral/Agency Guidance | 0.1241 |
| 4 | SE_Komdigi_No9_2023_Etika_AI - Bagian 13 | Natl: Sectoral/Agency Guidance | 0.1229 |
| 5 | SE_Komdigi_No9_2023_Etika_AI - Bagian 11 | Natl: Sectoral/Agency Guidance | 0.0976 |
| 6 | UU_ITE_No1_2024 - Pasal 4o | Natl: Binding Law | 0.0855 |
| 7 | G7_Hiroshima_Code_of_Conduct_for_AI - Bagian 13 | Intl: Soft Law | 0.0711 |
| 8 | G7_Hiroshima_Code_of_Conduct_for_AI - Bagian 4 | Intl: Soft Law | 0.0699 |
| 9 | SE_Komdigi_No9_2023_Etika_AI - Bagian 8 | Natl: Sectoral/Agency Guidance | 0.0687 |
| 10 | UNGA_Res_78_265_Safe_Secure_Trustworthy_AI - Bagian 11 | Intl: Soft Law | 0.0675 |

## 3. Betweenness Centrality — Top 10
| Peringkat | Node | Klasifikasi | Skor |
| --- | --- | --- | --- |
| 1 | SE_Komdigi_No9_2023_Etika_AI - Bagian 3 | Natl: Sectoral/Agency Guidance | 0.06044 |
| 2 | SE_Komdigi_No9_2023_Etika_AI - Bagian 4 | Natl: Sectoral/Agency Guidance | 0.04436 |
| 3 | UU_ITE_No19_2016 - Pasal 40 | Natl: Binding Law | 0.04402 |
| 4 | SE_Komdigi_No9_2023_Etika_AI - Bagian 13 | Natl: Sectoral/Agency Guidance | 0.04016 |
| 5 | POJK_No3_2024_Inovasi_Teknologi_Keuangan - Pasal 1 | Natl: Sectoral/Agency Guidance | 0.03837 |
| 6 | UU_ITE_No1_2024 - Pasal 13 | Natl: Binding Law | 0.03594 |
| 7 | UU_ITE_No1_2024 - Pasal 4o | Natl: Binding Law | 0.03145 |
| 8 | SE_Komdigi_No9_2023_Etika_AI - Bagian 11 | Natl: Sectoral/Agency Guidance | 0.02506 |
| 9 | EU_AI_Act_2024 - Article 99 | Intl: Binding Law | 0.02268 |
| 10 | EU_AI_Act_2024 - Paragraph 2 | Intl: Binding Law | 0.02224 |

## 4. Isolasi Node Internasional
| Metrik | Nilai |
| --- | --- |
| **Total Node Internasional** | 488 |
| **Node Terisolasi (degree=0)** | 140 (28.7%) |
| **Node Terhubung** | 348 |

### Daftar Node Internasional Terisolasi
| Node | Group |
| --- | --- |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 3 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 10 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 14 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 17 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 18 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 23 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 24 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 27 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Paragraph 4 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 29 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 31 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 32 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 35 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 36 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| EU_AI_Act_2024 - Article 2 | EU_AI_Act_2024 |
| EU_AI_Act_2024 - Article 6 | EU_AI_Act_2024 |
| EU_AI_Act_2024 - Article 6a | EU_AI_Act_2024 |
| EU_AI_Act_2024 - Article 26 | EU_AI_Act_2024 |
| EU_AI_Act_2024 - Article 24 | EU_AI_Act_2024 |
| EU_AI_Act_2024 - Article 39 | EU_AI_Act_2024 |
| *(+120 lainnya)* | |

## 5. Coverage per Klaster Regulasi
| Klaster | Total Node | Node Terhubung | Coverage |
| --- | --- | --- | --- |
| ASEAN_Guide_AI_Governance_Ethics_2024 | 80 | 47 | 58.8% |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 | 39 | 25 | 64.1% |
| EU_AI_Act_2024 | 132 | 65 | 49.2% |
| G7_Hiroshima_Code_of_Conduct_for_AI | 20 | 17 | 85.0% |
| ISO_IEC_42001_AI_Management_System | 44 | 37 | 84.1% |
| Insiden Kasus | 45 | 25 | 55.6% |
| OECD_AI_Principles_2024 | 35 | 28 | 80.0% |
| POJK_No3_2024_Inovasi_Teknologi_Keuangan | 44 | 34 | 77.3% |
| PP_PSTE_No71_2019 | 102 | 75 | 73.5% |
| SE_Komdigi_No9_2023_Etika_AI | 13 | 13 | 100.0% |
| Stranas_AI_Indonesia_2020-2045_Full | 13 | 10 | 76.9% |
| UNESCO_Recommendation_on_AI_Ethics_2021 | 80 | 74 | 92.5% |
| UNGA_Res_78_265_Safe_Secure_Trustworthy_AI | 28 | 28 | 100.0% |
| UNGA_Res_78_311_Global_Digital_Compact_or_AI | 16 | 16 | 100.0% |
| UU_ITE_No19_2016 | 19 | 16 | 84.2% |
| UU_ITE_No1_2024 | 30 | 26 | 86.7% |
| UU_PDP_No27_2022 | 77 | 61 | 79.2% |
| WHO_Ethics_and_Governance_of_AI_for_Health | 14 | 11 | 78.6% |

## 6. Connected Components
| Metrik | Nilai |
| --- | --- |
| **Jumlah Komponen** | 226 |
| **Komponen Terbesar** | 603 node |
| **Node Terisolasi Total** | 223 |

---
*Laporan ini di-generate otomatis menggunakan NetworkX + multilingual sentence embeddings. Seluruh angka dihitung langsung dari topologi graf tanpa interpretasi manual.*