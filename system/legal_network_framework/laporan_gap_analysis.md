# Gap Analysis — Konsolidasi Temuan LNA

Laporan ini mengkonsolidasikan temuan dari seluruh sub-analisis LNA. Seluruh metrik dihitung dari topologi graf aktual menggunakan NetworkX dan multilingual sentence embeddings.

## 1. Ringkasan Makro
| Metrik | Nilai |
| --- | --- |
| **Total Node** | 532 |
| **Total Edge** | 2882 |
| **Node Internasional** | 191 |
| **Node Nasional** | 241 |
| **Node Insiden** | 100 |
| **Densitas** | 0.02040 |
| **Klaster (Aggregated)** | 11 |
| **Koneksi Antar-Klaster** | 40 |

## 2. Coverage per Klaster Regulasi
| Klaster | Klasifikasi | Total Node | Node Terhubung | Cross-Group Edge | Coverage |
| --- | --- | --- | --- | --- | --- |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law | 39 | 22 | 169 | 56.4% |
| EU_AI_Act_2024 | Intl: Binding Law | 132 | 64 | 459 | 48.5% |
| Insiden Kasus | Insiden Kasus | 100 | 100 | 2125 | 100.0% |
| OECD_AI_Principles_2024 | Intl: Soft Law | 4 | 3 | 16 | 75.0% |
| PP_PSTE_No71_2019 | Natl: Binding Law | 102 | 72 | 943 | 70.6% |
| Stranas_AI_Indonesia_2020-2045_Full | Natl: Strategy & Soft Law | 13 | 8 | 117 | 61.5% |
| UNESCO_Recommendation_on_AI_Ethics_2021 | Intl: Soft Law | 2 | 1 | 1 | 50.0% |
| UU_ITE_No19_2016 | Natl: Binding Law | 19 | 17 | 334 | 89.5% |
| UU_ITE_No1_2024 | Natl: Binding Law | 30 | 26 | 257 | 86.7% |
| UU_PDP_No27_2022 | Natl: Binding Law | 77 | 62 | 1236 | 80.5% |
| WHO_Ethics_and_Governance_of_AI_for_Health | Intl: Sectoral Guidance | 14 | 9 | 107 | 64.3% |

## 3. Klaster Terisolasi (Tanpa Koneksi Antar-Klaster)
*Semua klaster memiliki setidaknya satu koneksi antar-klaster.*


## 4. Matriks Konektivitas Antar-Klaster (Top 15 Pasangan)
| Klaster A | Klaster B | Jumlah Edge |
| --- | --- | --- |
| UU_PDP_No27_2022 | Insiden Kasus | 1002 |
| PP_PSTE_No71_2019 | Insiden Kasus | 525 |
| UU_ITE_No19_2016 | Insiden Kasus | 253 |
| EU_AI_Act_2024 | PP_PSTE_No71_2019 | 234 |
| EU_AI_Act_2024 | UU_PDP_No27_2022 | 89 |
| EU_AI_Act_2024 | Insiden Kasus | 82 |
| Stranas_AI_Indonesia_2020-2045_Full | Insiden Kasus | 82 |
| UU_ITE_No1_2024 | Insiden Kasus | 77 |
| PP_PSTE_No71_2019 | UU_ITE_No1_2024 | 70 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 | Insiden Kasus | 64 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 | PP_PSTE_No71_2019 | 49 |
| WHO_Ethics_and_Governance_of_AI_for_Health | Insiden Kasus | 39 |
| UU_ITE_No1_2024 | UU_PDP_No27_2022 | 36 |
| WHO_Ethics_and_Governance_of_AI_for_Health | UU_PDP_No27_2022 | 35 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 | UU_PDP_No27_2022 | 28 |

## 5. Node Terisolasi (degree=0)
Total: **148** node dari 532 (27.8%)

| Klasifikasi | Jumlah Terisolasi |
| --- | --- |
| Intl: Binding Law | 85 |
| Intl: Sectoral Guidance | 5 |
| Intl: Soft Law | 2 |
| Natl: Binding Law | 51 |
| Natl: Strategy & Soft Law | 5 |

## 6. Connected Components
| Metrik | Nilai |
| --- | --- |
| **Jumlah Komponen** | 150 |
| **Komponen Terbesar** | 374 node |
| **Komponen Ke-2** | 10 node |
| **Komponen Singleton** | 148 |

---
*Laporan ini di-generate otomatis dari dataset LNA + NetworkX. Seluruh angka dihitung dari topologi graf aktual tanpa interpretasi manual.*