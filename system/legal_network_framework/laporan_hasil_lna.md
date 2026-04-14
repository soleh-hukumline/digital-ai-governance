# Laporan Master Legal Network Analysis (LNA)

Laporan ini dihasilkan secara otomatis menggunakan **Legal Network Analysis (LNA)** berbasis multilingual sentence embeddings (paraphrase-multilingual-MiniLM-L12-v2) dan NetworkX. Seluruh metrik dihitung langsung dari topologi graf.

## 1. Topologi Jaringan Makro
| Metrik | Nilai |
| --- | --- |
| **Total Node** | 532 |
| **Node Internasional** | 191 |
| **Node Nasional** | 241 |
| **Node Insiden** | 100 |
| **Total Edge** | 2882 |
| **Densitas Jaringan** | 0.02040 |
| **Insiden Terhubung ke ≥1 Regulasi** | 100/100 (100.0%) |

## 2. Degree Centrality — Top 10
| Peringkat | Node | Klasifikasi | Skor |
| --- | --- | --- | --- |
| 1 | PP_PSTE_No71_2019 - Pasal 94 | Natl: Binding Law | 0.1996 |
| 2 | UU_PDP_No27_2022 - Pasal 46 | Natl: Binding Law | 0.1808 |
| 3 | UU_ITE_No19_2016 - Pasal 45 | Natl: Binding Law | 0.1638 |
| 4 | UU_PDP_No27_2022 - Pasal 38 | Natl: Binding Law | 0.1544 |
| 5 | PP_PSTE_No71_2019 - Pasal 14 | Natl: Binding Law | 0.1469 |
| 6 | UU_PDP_No27_2022 - Pasal 14 | Natl: Binding Law | 0.1469 |
| 7 | Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 11 | Intl: Binding Law | 0.1450 |
| 8 | UU_PDP_No27_2022 - Pasal 36 | Natl: Binding Law | 0.1450 |
| 9 | PP_PSTE_No71_2019 - Pasal 97 | Natl: Binding Law | 0.1375 |
| 10 | UU_PDP_No27_2022 - Pasal 39 | Natl: Binding Law | 0.1205 |

## 3. Betweenness Centrality — Top 10
| Peringkat | Node | Klasifikasi | Skor |
| --- | --- | --- | --- |
| 1 | UU_ITE_No1_2024 - Pasal 4o | Natl: Binding Law | 0.05097 |
| 2 | PP_PSTE_No71_2019 - Pasal 94 | Natl: Binding Law | 0.04802 |
| 3 | EU_AI_Act_2024 - Paragraph 2 | Intl: Binding Law | 0.03762 |
| 4 | EU_AI_Act_2024 - Article 99 | Intl: Binding Law | 0.03585 |
| 5 | WHO_Ethics_and_Governance_of_AI_for_Health - Article 22 | Intl: Sectoral Guidance | 0.03133 |
| 6 | UU_PDP_No27_2022 - Pasal 58 | Natl: Binding Law | 0.03078 |
| 7 | PP_PSTE_No71_2019 - Pasal 14 | Natl: Binding Law | 0.03007 |
| 8 | BKN-PDL-2024 - Insiden kebocoran struktur hierarki negara di... | Insiden Kasus | 0.02826 |
| 9 | DEEPFAKE-PORNOGRAFI-2024 - Eksploitasi visual menggunakan algoritma Gene... | Insiden Kasus | 0.02631 |
| 10 | UU_ITE_No19_2016 - Pasal 33 | Natl: Binding Law | 0.02589 |

## 4. Isolasi Node Internasional
| Metrik | Nilai |
| --- | --- |
| **Total Node Internasional** | 191 |
| **Node Terisolasi (degree=0)** | 92 (48.2%) |
| **Node Terhubung** | 99 |

### Daftar Node Internasional Terisolasi
| Node | Group |
| --- | --- |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 2 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 3 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 10 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 14 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 17 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 18 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 19 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 23 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 24 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 27 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Paragraph 4 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 29 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 31 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 32 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 34 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 35 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 36 | Council_of_Europe_Framework_Convention_on_AI_CETS225 |
| EU_AI_Act_2024 - Article 2 | EU_AI_Act_2024 |
| EU_AI_Act_2024 - Article 6 | EU_AI_Act_2024 |
| EU_AI_Act_2024 - Article 9 | EU_AI_Act_2024 |
| *(+72 lainnya)* | |

## 5. Coverage per Klaster Regulasi
| Klaster | Total Node | Node Terhubung | Coverage |
| --- | --- | --- | --- |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 | 39 | 22 | 56.4% |
| EU_AI_Act_2024 | 132 | 64 | 48.5% |
| Insiden Kasus | 100 | 100 | 100.0% |
| OECD_AI_Principles_2024 | 4 | 3 | 75.0% |
| PP_PSTE_No71_2019 | 102 | 72 | 70.6% |
| Stranas_AI_Indonesia_2020-2045_Full | 13 | 8 | 61.5% |
| UNESCO_Recommendation_on_AI_Ethics_2021 | 2 | 1 | 50.0% |
| UU_ITE_No19_2016 | 19 | 17 | 89.5% |
| UU_ITE_No1_2024 | 30 | 26 | 86.7% |
| UU_PDP_No27_2022 | 77 | 62 | 80.5% |
| WHO_Ethics_and_Governance_of_AI_for_Health | 14 | 9 | 64.3% |

## 6. Connected Components
| Metrik | Nilai |
| --- | --- |
| **Jumlah Komponen** | 150 |
| **Komponen Terbesar** | 374 node |
| **Node Terisolasi Total** | 148 |

---
*Laporan ini di-generate otomatis menggunakan NetworkX + multilingual sentence embeddings. Seluruh angka dihitung langsung dari topologi graf tanpa interpretasi manual.*