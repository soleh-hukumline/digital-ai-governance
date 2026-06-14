# Laporan Master Legal Network Analysis (LNA)

Laporan ini dihasilkan secara otomatis menggunakan **Legal Network Analysis (LNA)** berbasis multilingual sentence embeddings (paraphrase-multilingual-MiniLM-L12-v2) dan NetworkX. Seluruh metrik dihitung langsung dari topologi graf.

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

## 2. Degree Centrality — Top 10
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

## 6. Connected Components
| Metrik | Nilai |
| --- | --- |
| **Jumlah Komponen** | 141 |
| **Komponen Terbesar** | 771 node |
| **Node Terisolasi Total** | 137 |

---
*Laporan ini di-generate otomatis menggunakan NetworkX + multilingual sentence embeddings. Seluruh angka dihitung langsung dari topologi graf tanpa interpretasi manual.*