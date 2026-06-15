# Analisis Lintas Yurisdiksi (Cross-Jurisdiction)

Laporan ini bekerja pada dua lapisan. **Lapisan otoritas utama (§0)** adalah *sitasi instrumen-ke-instrumen* (cross-reference eksplisit) yang dibaca dari `data/network/citations.json` — metrik legal yang dapat dipertanggungjawabkan dan tidak bergantung pada embedding. **Lapisan sekunder (§1 dst.)** mengukur koneksi *kemiripan tekstual* SBERT antara regulasi internasional dan nasional (tier similarity); lapisan ini bersifat **eksploratif** untuk memetakan tumpang-tindih semantik, BUKAN otoritas.

## 0. Otoritas Sitasi Lintas Yurisdiksi — Lapisan Otoritas Utama (PRIMER)
*Otoritas = **in-degree**: seberapa sering sebuah instrumen DIKUTIP (cross-reference eksplisit) oleh instrumen lain dalam korpus 17 dokumen (**69 edge sitasi**, **17 dokumen**, **0 terisolasi-by-citation**). Lapisan ini berbasis instrumen, dihitung langsung dari `citations.json`, dan TIDAK bergantung pada embedding — inilah ukuran otoritas yang dipakai untuk interpretasi.*

| Peringkat | Instrumen | Yurisdiksi | Dikutip (in-degree) | Peran sitasi |
| --- | --- | --- | --- | --- |
| 1 | UU ITE No.19/2016 | Nasional | **39** | both |
| 2 | Council of Europe Framework Convention (CETS 225) | Internasional | **23** | both |
| 3 | UNGA Res. 78/265 | Internasional | **7** | both |
| 4 | PP PSTE No.71/2019 | Nasional | **6** | both |
| 5 | OECD AI Principles | Internasional | **5** | both |
| 6 | EU AI Act | Internasional | **4** | both |
| 7 | UNESCO Recommendation on AI Ethics | Internasional | **3** | both |
| 8 | UNGA Res. 78/311 (Global Digital Compact) | Internasional | **1** | both |
| 9 | UU PDP No.27/2022 | Nasional | **1** | both |

**Pembacaan:** secara lintas yurisdiksi, hub otoritas didominasi instrumen **nasional yang mengikat** — **UU ITE No.19/2016** (dikutip 39×) — disusul jangkar internasional **Council of Europe Framework Convention (CETS 225)** (23×), lalu **UNGA Res. 78/265** (7×), **PP PSTE No.71/2019** (6×), **OECD AI Principles** (5×), **EU AI Act** (4×), dan **UNESCO Recommendation** (3×). Otoritas sitasi ini independen dari tier kemiripan SBERT di §1-§3.

**Instrumen sumber/leaf (mengutip pihak lain tetapi dikutip 0× dalam korpus)** — *adopter soft-law hilir*, bukan otoritas: WHO Ethics & Governance of AI for Health (Internasional), Stranas AI 2020-2045 (Nasional), UU ITE No.1/2024 (Nasional), ISO/IEC 42001 (AI Management System) (Internasional), SE Komdigi No.9/2023 (Etika AI) (Nasional), POJK No.3/2024 (Nasional), ASEAN Guide on AI Governance & Ethics (Internasional), G7 Hiroshima Code of Conduct (Internasional).

## 1. Distribusi Tier Similarity (SBERT — eksploratif, BUKAN otoritas)
*Tier berikut dihitung dari **kemiripan tekstual SBERT** antar-yurisdiksi, bukan sitasi. Ini lensa sekunder/eksploratif untuk tumpang-tindih semantik; lapisan otoritas adalah tabel sitasi pada §0.*

| Tier | Skor Similarity | Jumlah Koneksi | Persentase |
| --- | --- | --- | --- |
| **Full Adoption** | ≥30% | 0 | 0.0% |
| **Partial Adoption** | 10–29% | 0 | 0.0% |
| **Low Similarity** | <10% | 4787 | 100.0% |
| **Total** | — | 4787 | 100% |

## 2. Node Internasional dengan Koneksi Terbanyak ke Nasional (degree SBERT — eksploratif, BUKAN otoritas)
| Peringkat | Node | Instrumen | Jumlah Koneksi | Avg Similarity |
| --- | --- | --- | --- | --- |
| 1 | UNGA_Res_78_265_Safe_Secure_Trustworthy_AI - Bagian 19 | UNGA_Res_78_265_Safe_Secure_Trustworthy_AI | 70 | 5.0% |
| 2 | UNESCO_Recommendation_on_AI_Ethics_2021 - Bagian 72 | UNESCO_Recommendation_on_AI_Ethics_2021 | 62 | 5.0% |
| 3 | Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 34 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | 59 | 5.0% |
| 4 | EU_AI_Act_2024 - Article 105 | EU_AI_Act_2024 | 57 | 5.0% |
| 5 | UNESCO_Recommendation_on_AI_Ethics_2021 - Bagian 73 | UNESCO_Recommendation_on_AI_Ethics_2021 | 51 | 5.0% |
| 6 | EU_AI_Act_2024 - Article 96 | EU_AI_Act_2024 | 49 | 5.0% |
| 7 | UNGA_Res_78_265_Safe_Secure_Trustworthy_AI - Bagian 11 | UNGA_Res_78_265_Safe_Secure_Trustworthy_AI | 49 | 5.0% |
| 8 | UNGA_Res_78_265_Safe_Secure_Trustworthy_AI - Bagian 25 | UNGA_Res_78_265_Safe_Secure_Trustworthy_AI | 47 | 5.0% |
| 9 | Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 11 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | 46 | 5.0% |
| 10 | UNGA_Res_78_265_Safe_Secure_Trustworthy_AI - Bagian 23 | UNGA_Res_78_265_Safe_Secure_Trustworthy_AI | 44 | 5.0% |

## 3. Node Nasional dengan Koneksi Terbanyak ke Internasional (degree SBERT — eksploratif, BUKAN otoritas)
| Peringkat | Node | Instrumen | Jumlah Koneksi | Avg Similarity |
| --- | --- | --- | --- | --- |
| 1 | Stranas_AI_Indonesia_2020-2045_Full - Bagian 70 | Stranas_AI_Indonesia_2020-2045_Full | 194 | 5.0% |
| 2 | Stranas_AI_Indonesia_2020-2045_Full - Bagian 56 | Stranas_AI_Indonesia_2020-2045_Full | 165 | 5.0% |
| 3 | Stranas_AI_Indonesia_2020-2045_Full - Bagian 49 | Stranas_AI_Indonesia_2020-2045_Full | 157 | 5.0% |
| 4 | SE_Komdigi_No9_2023_Etika_AI - Bagian 12 | SE_Komdigi_No9_2023_Etika_AI | 145 | 5.0% |
| 5 | SE_Komdigi_No9_2023_Etika_AI - Bagian 14 | SE_Komdigi_No9_2023_Etika_AI | 139 | 5.0% |
| 6 | SE_Komdigi_No9_2023_Etika_AI - Bagian 6 | SE_Komdigi_No9_2023_Etika_AI | 128 | 5.0% |
| 7 | SE_Komdigi_No9_2023_Etika_AI - Bagian 11 | SE_Komdigi_No9_2023_Etika_AI | 125 | 5.0% |
| 8 | SE_Komdigi_No9_2023_Etika_AI - Bagian 5 | SE_Komdigi_No9_2023_Etika_AI | 123 | 5.0% |
| 9 | SE_Komdigi_No9_2023_Etika_AI - Bagian 3 | SE_Komdigi_No9_2023_Etika_AI | 104 | 5.0% |
| 10 | SE_Komdigi_No9_2023_Etika_AI - Bagian 4 | SE_Komdigi_No9_2023_Etika_AI | 96 | 5.0% |

## 4. Node Internasional Tanpa Koneksi Lintas Yurisdiksi
Total: **107** node internasional tanpa koneksi ke regulasi nasional.

| Node | Instrumen | Klasifikasi |
| --- | --- | --- |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 2 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 23 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 27 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 28 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 29 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 30 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 31 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 32 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 35 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 36 | Council_of_Europe_Framework_Convention_on_AI_CETS225 | Intl: Binding Law |
| EU_AI_Act_2024 - Article 5 | EU_AI_Act_2024 | Intl: Binding Law |
| EU_AI_Act_2024 - Article 26 | EU_AI_Act_2024 | Intl: Binding Law |
| EU_AI_Act_2024 - Article 11 | EU_AI_Act_2024 | Intl: Binding Law |
| EU_AI_Act_2024 - Article 12 | EU_AI_Act_2024 | Intl: Binding Law |
| EU_AI_Act_2024 - Article 19 | EU_AI_Act_2024 | Intl: Binding Law |
| *(+92 lainnya)* | | |

---
*Laporan ini dihasilkan dari analisis cross-jurisdiction pada dataset LNA menggunakan multilingual sentence embeddings. Metrik dihitung dari data graf aktual.*