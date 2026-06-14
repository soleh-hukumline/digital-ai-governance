# Analisis Jaringan Regulasi Internasional

Sub-analisis ini memetakan **struktur internal** jaringan regulasi AI internasional berdasarkan semantic similarity (multilingual embeddings). Seluruh metrik dihitung langsung dari topologi sub-graf internasional.

## 1. Metrik Kohesi Internal
| Metrik | Nilai |
| --- | --- |
| **Total Node Internasional** | 488 |
| **Koneksi Semantik Internal** | 517 edge |
| **Densitas Internal** | 0.0044 |
| **Node Terisolasi** | 312 node |

## 2. Distribusi per Instrumen
| Instrumen | Node | Terhubung | Edge (total degree) | Coverage |
| --- | --- | --- | --- | --- |
| ASEAN_Guide_AI_Governance_Ethics_2024 | 80 | 12 | 44 | 15.0% |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 | 39 | 8 | 17 | 20.5% |
| EU_AI_Act_2024 | 132 | 2 | 2 | 1.5% |
| G7_Hiroshima_Code_of_Conduct_for_AI | 20 | 13 | 149 | 65.0% |
| ISO_IEC_42001_AI_Management_System | 44 | 20 | 108 | 45.5% |
| OECD_AI_Principles_2024 | 35 | 22 | 183 | 62.9% |
| UNESCO_Recommendation_on_AI_Ethics_2021 | 80 | 60 | 332 | 75.0% |
| UNGA_Res_78_265_Safe_Secure_Trustworthy_AI | 28 | 21 | 98 | 75.0% |
| UNGA_Res_78_311_Global_Digital_Compact_or_AI | 16 | 13 | 69 | 81.2% |
| WHO_Ethics_and_Governance_of_AI_for_Health | 14 | 5 | 32 | 35.7% |

## 3. Degree Centrality — Top 10
| Peringkat | Node | Instrumen | Skor |
| --- | --- | --- | --- |
| 1 | G7_Hiroshima_Code_of_Conduct_for_AI - Bagian 4 | G7_Hiroshima_Code_of_Conduct_for_AI | 0.1129 |
| 2 | G7_Hiroshima_Code_of_Conduct_for_AI - Bagian 13 | G7_Hiroshima_Code_of_Conduct_for_AI | 0.0595 |
| 3 | UNESCO_Recommendation_on_AI_Ethics_2021 - Bagian 50 | UNESCO_Recommendation_on_AI_Ethics_2021 | 0.0575 |
| 4 | ISO_IEC_42001_AI_Management_System - Bagian 32 | ISO_IEC_42001_AI_Management_System | 0.0493 |
| 5 | G7_Hiroshima_Code_of_Conduct_for_AI - Bagian 3 | G7_Hiroshima_Code_of_Conduct_for_AI | 0.0452 |
| 6 | OECD_AI_Principles_2024 - Bagian 9 | OECD_AI_Principles_2024 | 0.0411 |
| 7 | WHO_Ethics_and_Governance_of_AI_for_Health - Section 4 | WHO_Ethics_and_Governance_of_AI_for_Health | 0.0411 |
| 8 | OECD_AI_Principles_2024 - Bagian 18 | OECD_AI_Principles_2024 | 0.0390 |
| 9 | UNESCO_Recommendation_on_AI_Ethics_2021 - Bagian 46 | UNESCO_Recommendation_on_AI_Ethics_2021 | 0.0370 |
| 10 | UNGA_Res_78_265_Safe_Secure_Trustworthy_AI - Bagian 22 | UNGA_Res_78_265_Safe_Secure_Trustworthy_AI | 0.0370 |

## 4. Betweenness Centrality — Top 10
| Peringkat | Node | Instrumen | Skor |
| --- | --- | --- | --- |
| 1 | G7_Hiroshima_Code_of_Conduct_for_AI - Bagian 4 | G7_Hiroshima_Code_of_Conduct_for_AI | 0.0327 |
| 2 | G7_Hiroshima_Code_of_Conduct_for_AI - Bagian 13 | G7_Hiroshima_Code_of_Conduct_for_AI | 0.0136 |
| 3 | UNESCO_Recommendation_on_AI_Ethics_2021 - Bagian 50 | UNESCO_Recommendation_on_AI_Ethics_2021 | 0.0100 |
| 4 | UNGA_Res_78_265_Safe_Secure_Trustworthy_AI - Bagian 22 | UNGA_Res_78_265_Safe_Secure_Trustworthy_AI | 0.0100 |
| 5 | OECD_AI_Principles_2024 - Bagian 9 | OECD_AI_Principles_2024 | 0.0071 |
| 6 | UNESCO_Recommendation_on_AI_Ethics_2021 - Bagian 3 | UNESCO_Recommendation_on_AI_Ethics_2021 | 0.0066 |
| 7 | UNGA_Res_78_311_Global_Digital_Compact_or_AI - Bagian 16 | UNGA_Res_78_311_Global_Digital_Compact_or_AI | 0.0061 |
| 8 | G7_Hiroshima_Code_of_Conduct_for_AI - Bagian 9 | G7_Hiroshima_Code_of_Conduct_for_AI | 0.0055 |
| 9 | UNESCO_Recommendation_on_AI_Ethics_2021 - Bagian 75 | UNESCO_Recommendation_on_AI_Ethics_2021 | 0.0055 |
| 10 | WHO_Ethics_and_Governance_of_AI_for_Health - Section 4 | WHO_Ethics_and_Governance_of_AI_for_Health | 0.0055 |

## 5. Node Terisolasi
| Node | Instrumen | Klasifikasi |
| --- | --- | --- |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 1 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 3 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 5 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 6 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 7 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 8 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 9 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 10 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 14 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Paragraph 1 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 17 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 18 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 19 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 20 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 21 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| *(+297 lainnya)* | | |

---
*Sub-laporan dihasilkan dari analisis NetworkX pada sub-graf regulasi internasional. Metrik dihitung dari data graf aktual tanpa interpretasi manual.*