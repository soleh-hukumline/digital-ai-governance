# Analisis Jaringan Regulasi Internasional

Sub-analisis ini memetakan jaringan regulasi AI internasional pada dua lapisan. **Lapisan otoritas utama** adalah *sitasi instrumen-ke-instrumen* (cross-reference eksplisit) yang dibaca dari `data/network/citations.json` — metrik legal yang dapat dipertanggungjawabkan dan tidak bergantung pada model embedding. **Lapisan sekunder** adalah kemiripan tekstual SBERT (multilingual embeddings) yang bersifat *eksploratif* untuk memetakan tumpang-tindih semantik, BUKAN otoritas.

## 0. Otoritas Sitasi — Lapisan Otoritas Utama (PRIMER)
*Otoritas = **in-degree**: seberapa sering sebuah instrumen DIKUTIP (cross-reference eksplisit) oleh instrumen lain dalam korpus 17 dokumen (**69 edge sitasi**, **17 dokumen**, **0 terisolasi-by-citation**). Lapisan ini berbasis instrumen, dihitung langsung dari `citations.json`, dan TIDAK bergantung pada embedding — inilah ukuran otoritas yang dipakai untuk interpretasi.*

| Peringkat | Instrumen Internasional | Dikutip (in-degree) | Peran sitasi |
| --- | --- | --- | --- |
| 1 | Council of Europe Framework Convention (CETS 225) | **23** | both |
| 2 | UNGA Res. 78/265 | **7** | both |
| 3 | OECD AI Principles | **5** | both |
| 4 | EU AI Act | **4** | both |
| 5 | UNESCO Recommendation on AI Ethics | **3** | both |
| 6 | UNGA Res. 78/311 (Global Digital Compact) | **1** | both |

**Pembacaan:** dalam korpus internasional, **Council of Europe Framework Convention (CETS 225)** adalah jangkar otoritas tertinggi (dikutip 23×), diikuti **UNGA Res. 78/265** (7×), **OECD AI Principles** (5×), **EU AI Act** (4×), dan **UNESCO Recommendation** (3×).

**Instrumen sumber/leaf (mengutip pihak lain tetapi dikutip 0× dalam korpus)** — yakni *adopter soft-law hilir*, bukan otoritas: ISO/IEC 42001 (AI Management System), ASEAN Guide on AI Governance & Ethics, G7 Hiroshima Code of Conduct, WHO Ethics & Governance of AI for Health. Contohnya **G7 Hiroshima, ISO/IEC 42001, dan ASEAN Guide** muncul sebagai sumber-sitasi, bukan rujukan otoritatif.

## 1. Metrik Kohesi Internal
| Metrik | Nilai |
| --- | --- |
| **Total Node Internasional** | 541 |
| **Koneksi Semantik Internal** | 2614 edge |
| **Densitas Internal** | 0.0179 |
| **Node Terisolasi** | 200 node |

## 2. Distribusi per Instrumen
| Instrumen | Node | Terhubung | Edge (total degree) | Coverage |
| --- | --- | --- | --- | --- |
| ASEAN_Guide_AI_Governance_Ethics_2024 | 80 | 54 | 833 | 67.5% |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 | 36 | 14 | 48 | 38.9% |
| EU_AI_Act_2024 | 111 | 44 | 448 | 39.6% |
| G7_Hiroshima_Code_of_Conduct_for_AI | 17 | 13 | 350 | 76.5% |
| ISO_IEC_42001_AI_Management_System | 48 | 32 | 579 | 66.7% |
| OECD_AI_Principles_2024 | 39 | 25 | 686 | 64.1% |
| UNESCO_Recommendation_on_AI_Ethics_2021 | 80 | 69 | 1302 | 86.2% |
| UNGA_Res_78_265_Safe_Secure_Trustworthy_AI | 33 | 28 | 237 | 84.8% |
| UNGA_Res_78_311_Global_Digital_Compact_or_AI | 17 | 17 | 171 | 100.0% |
| WHO_Ethics_and_Governance_of_AI_for_Health | 80 | 45 | 574 | 56.2% |

## 3. Sentralitas Semantik (SBERT — eksploratif, BUKAN otoritas)
*Tabel berikut adalah **degree centrality berbasis kemiripan tekstual SBERT**, bukan otoritas sitasi. Metrik ini mengukur tumpang-tindih semantik dan cenderung **menggelembungkan soft-law panjang** (mis. Stranas AI, WHO, SE Komdigi) karena banyaknya seksi generik. Gunakan sebagai lensa sekunder/eksploratif; lapisan otoritas adalah tabel sitasi pada §0.*

| Peringkat | Node | Instrumen | Skor SBERT |
| --- | --- | --- | --- |
| 1 | G7_Hiroshima_Code_of_Conduct_for_AI - Bagian 10 | G7_Hiroshima_Code_of_Conduct_for_AI | 0.1870 |
| 2 | OECD_AI_Principles_2024 - Bagian 22 | OECD_AI_Principles_2024 | 0.1722 |
| 3 | ASEAN_Guide_AI_Governance_Ethics_2024 - Bagian 30 | ASEAN_Guide_AI_Governance_Ethics_2024 | 0.1519 |
| 4 | WHO_Ethics_and_Governance_of_AI_for_Health - Bagian 43 | WHO_Ethics_and_Governance_of_AI_for_Health | 0.1333 |
| 5 | OECD_AI_Principles_2024 - Bagian 28 | OECD_AI_Principles_2024 | 0.1241 |
| 6 | UNESCO_Recommendation_on_AI_Ethics_2021 - Bagian 54 | UNESCO_Recommendation_on_AI_Ethics_2021 | 0.1222 |
| 7 | OECD_AI_Principles_2024 - Bagian 26 | OECD_AI_Principles_2024 | 0.1111 |
| 8 | ASEAN_Guide_AI_Governance_Ethics_2024 - Bagian 37 | ASEAN_Guide_AI_Governance_Ethics_2024 | 0.1093 |
| 9 | OECD_AI_Principles_2024 - Bagian 29 | OECD_AI_Principles_2024 | 0.1056 |
| 10 | EU_AI_Act_2024 - Article 75 | EU_AI_Act_2024 | 0.1037 |

## 4. Betweenness Centrality — Top 10
| Peringkat | Node | Instrumen | Skor |
| --- | --- | --- | --- |
| 1 | OECD_AI_Principles_2024 - Bagian 22 | OECD_AI_Principles_2024 | 0.0327 |
| 2 | G7_Hiroshima_Code_of_Conduct_for_AI - Bagian 10 | G7_Hiroshima_Code_of_Conduct_for_AI | 0.0314 |
| 3 | UNESCO_Recommendation_on_AI_Ethics_2021 - Bagian 54 | UNESCO_Recommendation_on_AI_Ethics_2021 | 0.0224 |
| 4 | UNGA_Res_78_311_Global_Digital_Compact_or_AI - Bagian 5 | UNGA_Res_78_311_Global_Digital_Compact_or_AI | 0.0204 |
| 5 | ASEAN_Guide_AI_Governance_Ethics_2024 - Bagian 30 | ASEAN_Guide_AI_Governance_Ethics_2024 | 0.0193 |
| 6 | UNESCO_Recommendation_on_AI_Ethics_2021 - Bagian 41 | UNESCO_Recommendation_on_AI_Ethics_2021 | 0.0165 |
| 7 | WHO_Ethics_and_Governance_of_AI_for_Health - Bagian 43 | WHO_Ethics_and_Governance_of_AI_for_Health | 0.0137 |
| 8 | UNGA_Res_78_265_Safe_Secure_Trustworthy_AI - Bagian 17 | UNGA_Res_78_265_Safe_Secure_Trustworthy_AI | 0.0135 |
| 9 | WHO_Ethics_and_Governance_of_AI_for_Health - Bagian 58 | WHO_Ethics_and_Governance_of_AI_for_Health | 0.0124 |
| 10 | ASEAN_Guide_AI_Governance_Ethics_2024 - Bagian 63 | ASEAN_Guide_AI_Governance_Ethics_2024 | 0.0122 |

## 5. Node Terisolasi
| Node | Instrumen | Klasifikasi |
| --- | --- | --- |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 7 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 9 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 14 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 17 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 18 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 19 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 20 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 21 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 22 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 23 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 24 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 25 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 26 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 27 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 28 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| *(+185 lainnya)* | | |

---
*Sub-laporan dihasilkan dari analisis NetworkX pada sub-graf regulasi internasional. Metrik dihitung dari data graf aktual tanpa interpretasi manual.*