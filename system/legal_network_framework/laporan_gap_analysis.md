# Gap Analysis — Konsolidasi Temuan LNA

Laporan ini mengkonsolidasikan temuan dari seluruh sub-analisis LNA. Seluruh metrik dihitung dari topologi graf aktual menggunakan NetworkX dan multilingual sentence embeddings.

## 1. Ringkasan Makro
| Metrik | Nilai |
| --- | --- |
| **Total Node** | 916 |
| **Total Edge** | 8005 |
| **Node Internasional** | 541 |
| **Node Nasional** | 330 |
| **Node Insiden** | 45 |
| **Densitas** | 0.01910 |
| **Klaster (Aggregated)** | 18 |
| **Koneksi Antar-Klaster** | 132 |

## 2. Coverage per Klaster Regulasi
| Klaster | Klasifikasi | Total Node | Node Terhubung | Cross-Group Edge | Coverage |
| --- | --- | --- | --- | --- | --- |
| ASEAN_Guide_AI_Governance_Ethics_2024 | Intl: Sectoral Guidance | 80 | 70 | 1502 | 87.5% |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law | 36 | 27 | 375 | 75.0% |
| EU_AI_Act_2024 | Intl: Binding Law | 111 | 93 | 1441 | 83.8% |
| G7_Hiroshima_Code_of_Conduct_for_AI | Intl: Soft Law | 17 | 17 | 559 | 100.0% |
| ISO_IEC_42001_AI_Management_System | Intl: Technical Standard | 48 | 44 | 946 | 91.7% |
| Insiden Kasus | Insiden Kasus | 45 | 20 | 92 | 44.4% |
| OECD_AI_Principles_2024 | Intl: Soft Law | 39 | 34 | 980 | 87.2% |
| POJK_No3_2024_Inovasi_Teknologi_Keuangan | Natl: Sectoral/Agency Guidance | 44 | 38 | 622 | 86.4% |
| PP_PSTE_No71_2019 | Natl: Binding Law | 100 | 84 | 1188 | 84.0% |
| SE_Komdigi_No9_2023_Etika_AI | Natl: Sectoral/Agency Guidance | 15 | 14 | 1051 | 93.3% |
| Stranas_AI_Indonesia_2020-2045_Full | Natl: Strategy & Soft Law | 80 | 69 | 2100 | 86.2% |
| UNESCO_Recommendation_on_AI_Ethics_2021 | Intl: Soft Law | 80 | 78 | 2021 | 97.5% |
| UNGA_Res_78_265_Safe_Secure_Trustworthy_AI | Intl: Soft Law | 33 | 32 | 945 | 97.0% |
| UNGA_Res_78_311_Global_Digital_Compact_or_AI | Intl: Soft Law | 17 | 17 | 394 | 100.0% |
| UU_ITE_No19_2016 | Natl: Binding Law | 6 | 6 | 108 | 100.0% |
| UU_ITE_No1_2024 | Natl: Binding Law | 17 | 16 | 275 | 94.1% |
| UU_PDP_No27_2022 | Natl: Binding Law | 68 | 61 | 550 | 89.7% |
| WHO_Ethics_and_Governance_of_AI_for_Health | Intl: Sectoral Guidance | 80 | 59 | 861 | 73.8% |

## 3. Klaster Terisolasi (Tanpa Koneksi Antar-Klaster)
*Semua klaster memiliki setidaknya satu koneksi antar-klaster.*


## 4. Matriks Konektivitas Antar-Klaster (Top 15 Pasangan)
| Klaster A | Klaster B | Jumlah Edge |
| --- | --- | --- |
| UNGA_Res_78_265_Safe_Secure_Trustworthy_AI | Stranas_AI_Indonesia_2020-2045_Full | 414 |
| EU_AI_Act_2024 | PP_PSTE_No71_2019 | 358 |
| UNESCO_Recommendation_on_AI_Ethics_2021 | Stranas_AI_Indonesia_2020-2045_Full | 347 |
| EU_AI_Act_2024 | POJK_No3_2024_Inovasi_Teknologi_Keuangan | 330 |
| ASEAN_Guide_AI_Governance_Ethics_2024 | Stranas_AI_Indonesia_2020-2045_Full | 320 |
| OECD_AI_Principles_2024 | UNESCO_Recommendation_on_AI_Ethics_2021 | 307 |
| UNESCO_Recommendation_on_AI_Ethics_2021 | ASEAN_Guide_AI_Governance_Ethics_2024 | 265 |
| UNESCO_Recommendation_on_AI_Ethics_2021 | WHO_Ethics_and_Governance_of_AI_for_Health | 239 |
| UNESCO_Recommendation_on_AI_Ethics_2021 | SE_Komdigi_No9_2023_Etika_AI | 180 |
| OECD_AI_Principles_2024 | Stranas_AI_Indonesia_2020-2045_Full | 175 |
| UNGA_Res_78_311_Global_Digital_Compact_or_AI | Stranas_AI_Indonesia_2020-2045_Full | 172 |
| WHO_Ethics_and_Governance_of_AI_for_Health | Stranas_AI_Indonesia_2020-2045_Full | 172 |
| UNESCO_Recommendation_on_AI_Ethics_2021 | ISO_IEC_42001_AI_Management_System | 171 |
| PP_PSTE_No71_2019 | UU_ITE_No1_2024 | 156 |
| UNGA_Res_78_265_Safe_Secure_Trustworthy_AI | SE_Komdigi_No9_2023_Etika_AI | 147 |

## 5. Node Terisolasi (degree=0)
Total: **137** node dari 916 (15.0%)

| Klasifikasi | Jumlah Terisolasi |
| --- | --- |
| Insiden Kasus | 25 |
| Intl: Binding Law | 27 |
| Intl: Sectoral Guidance | 31 |
| Intl: Soft Law | 8 |
| Intl: Technical Standard | 4 |
| Natl: Binding Law | 24 |
| Natl: Sectoral/Agency Guidance | 7 |
| Natl: Strategy & Soft Law | 11 |

## 6. Connected Components
| Metrik | Nilai |
| --- | --- |
| **Jumlah Komponen** | 141 |
| **Komponen Terbesar** | 771 node |
| **Komponen Ke-2** | 4 node |
| **Komponen Singleton** | 137 |

---
*Laporan ini di-generate otomatis dari dataset LNA + NetworkX. Seluruh angka dihitung dari topologi graf aktual tanpa interpretasi manual.*