# Gap Analysis — Konsolidasi Temuan LNA

Laporan ini mengkonsolidasikan temuan dari seluruh sub-analisis LNA. Seluruh metrik dihitung dari topologi graf aktual menggunakan NetworkX dan multilingual sentence embeddings.

## 1. Ringkasan Makro
| Metrik | Nilai |
| --- | --- |
| **Total Node** | 831 |
| **Total Edge** | 3330 |
| **Node Internasional** | 488 |
| **Node Nasional** | 298 |
| **Node Insiden** | 45 |
| **Densitas** | 0.00966 |
| **Klaster (Aggregated)** | 18 |
| **Koneksi Antar-Klaster** | 130 |

## 2. Coverage per Klaster Regulasi
| Klaster | Klasifikasi | Total Node | Node Terhubung | Cross-Group Edge | Coverage |
| --- | --- | --- | --- | --- | --- |
| ASEAN_Guide_AI_Governance_Ethics_2024 | Intl: Sectoral Guidance | 80 | 47 | 343 | 58.8% |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law | 39 | 25 | 193 | 64.1% |
| EU_AI_Act_2024 | Intl: Binding Law | 132 | 65 | 552 | 49.2% |
| G7_Hiroshima_Code_of_Conduct_for_AI | Intl: Soft Law | 20 | 17 | 311 | 85.0% |
| ISO_IEC_42001_AI_Management_System | Intl: Technical Standard | 44 | 37 | 309 | 84.1% |
| Insiden Kasus | Insiden Kasus | 45 | 25 | 112 | 55.6% |
| OECD_AI_Principles_2024 | Intl: Soft Law | 35 | 28 | 315 | 80.0% |
| POJK_No3_2024_Inovasi_Teknologi_Keuangan | Natl: Sectoral/Agency Guidance | 44 | 34 | 367 | 77.3% |
| PP_PSTE_No71_2019 | Natl: Binding Law | 102 | 75 | 824 | 73.5% |
| SE_Komdigi_No9_2023_Etika_AI | Natl: Sectoral/Agency Guidance | 13 | 13 | 852 | 100.0% |
| Stranas_AI_Indonesia_2020-2045_Full | Natl: Strategy & Soft Law | 13 | 10 | 174 | 76.9% |
| UNESCO_Recommendation_on_AI_Ethics_2021 | Intl: Soft Law | 80 | 74 | 676 | 92.5% |
| UNGA_Res_78_265_Safe_Secure_Trustworthy_AI | Intl: Soft Law | 28 | 28 | 440 | 100.0% |
| UNGA_Res_78_311_Global_Digital_Compact_or_AI | Intl: Soft Law | 16 | 16 | 185 | 100.0% |
| UU_ITE_No19_2016 | Natl: Binding Law | 19 | 16 | 139 | 84.2% |
| UU_ITE_No1_2024 | Natl: Binding Law | 30 | 26 | 301 | 86.7% |
| UU_PDP_No27_2022 | Natl: Binding Law | 77 | 61 | 442 | 79.2% |
| WHO_Ethics_and_Governance_of_AI_for_Health | Intl: Sectoral Guidance | 14 | 11 | 125 | 78.6% |

## 3. Klaster Terisolasi (Tanpa Koneksi Antar-Klaster)
*Semua klaster memiliki setidaknya satu koneksi antar-klaster.*


## 4. Matriks Konektivitas Antar-Klaster (Top 15 Pasangan)
| Klaster A | Klaster B | Jumlah Edge |
| --- | --- | --- |
| EU_AI_Act_2024 | PP_PSTE_No71_2019 | 234 |
| UNESCO_Recommendation_on_AI_Ethics_2021 | SE_Komdigi_No9_2023_Etika_AI | 203 |
| EU_AI_Act_2024 | POJK_No3_2024_Inovasi_Teknologi_Keuangan | 149 |
| UNGA_Res_78_265_Safe_Secure_Trustworthy_AI | SE_Komdigi_No9_2023_Etika_AI | 144 |
| OECD_AI_Principles_2024 | UNESCO_Recommendation_on_AI_Ethics_2021 | 111 |
| ASEAN_Guide_AI_Governance_Ethics_2024 | SE_Komdigi_No9_2023_Etika_AI | 108 |
| EU_AI_Act_2024 | UU_PDP_No27_2022 | 89 |
| ISO_IEC_42001_AI_Management_System | PP_PSTE_No71_2019 | 88 |
| ISO_IEC_42001_AI_Management_System | SE_Komdigi_No9_2023_Etika_AI | 84 |
| G7_Hiroshima_Code_of_Conduct_for_AI | UNESCO_Recommendation_on_AI_Ethics_2021 | 75 |
| ASEAN_Guide_AI_Governance_Ethics_2024 | PP_PSTE_No71_2019 | 71 |
| PP_PSTE_No71_2019 | UU_ITE_No1_2024 | 70 |
| UNGA_Res_78_265_Safe_Secure_Trustworthy_AI | PP_PSTE_No71_2019 | 67 |
| G7_Hiroshima_Code_of_Conduct_for_AI | SE_Komdigi_No9_2023_Etika_AI | 58 |
| UNGA_Res_78_311_Global_Digital_Compact_or_AI | SE_Komdigi_No9_2023_Etika_AI | 56 |

## 5. Node Terisolasi (degree=0)
Total: **223** node dari 831 (26.8%)

| Klasifikasi | Jumlah Terisolasi |
| --- | --- |
| Insiden Kasus | 20 |
| Intl: Binding Law | 81 |
| Intl: Sectoral Guidance | 36 |
| Intl: Soft Law | 16 |
| Intl: Technical Standard | 7 |
| Natl: Binding Law | 50 |
| Natl: Sectoral/Agency Guidance | 10 |
| Natl: Strategy & Soft Law | 3 |

## 6. Connected Components
| Metrik | Nilai |
| --- | --- |
| **Jumlah Komponen** | 226 |
| **Komponen Terbesar** | 603 node |
| **Komponen Ke-2** | 3 node |
| **Komponen Singleton** | 223 |

---
*Laporan ini di-generate otomatis dari dataset LNA + NetworkX. Seluruh angka dihitung dari topologi graf aktual tanpa interpretasi manual.*