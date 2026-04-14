# Analisis Insiden — Pemetaan Warrant per Kasus

Laporan ini memetakan distribusi warrant normatif (dasar hukum) untuk setiap insiden siber berbasis AI di Indonesia. Seluruh metrik dihitung dari koneksi 'governs' pada graf LNA.

## 1. Distribusi Warrant per Insiden
| Kategori | Jumlah | Persentase |
| --- | --- | --- |
| Tanpa warrant (degree=0) | 0 | 0.0% |
| Warrant nasional saja | 34 | 34.0% |
| Warrant internasional saja | 1 | 1.0% |
| Warrant ganda (Natl + Intl) | 65 | 65.0% |
| **Total Insiden** | **100** | **100%** |

## 2. Regulasi yang Paling Sering Menjadi Warrant
| Peringkat | Regulasi | Klasifikasi | Jumlah Insiden |
| --- | --- | --- | --- |
| 1 | UU_PDP_No27_2022 - Pasal 46 | Natl: Binding Law | 93 |
| 2 | PP_PSTE_No71_2019 - Pasal 94 | Natl: Binding Law | 92 |
| 3 | UU_ITE_No19_2016 - Pasal 45 | Natl: Binding Law | 85 |
| 4 | UU_PDP_No27_2022 - Pasal 38 | Natl: Binding Law | 81 |
| 5 | UU_PDP_No27_2022 - Pasal 36 | Natl: Binding Law | 74 |
| 6 | UU_PDP_No27_2022 - Pasal 14 | Natl: Binding Law | 70 |
| 7 | PP_PSTE_No71_2019 - Pasal 97 | Natl: Binding Law | 67 |
| 8 | UU_PDP_No27_2022 - Pasal 39 | Natl: Binding Law | 63 |
| 9 | Stranas_AI_Indonesia_2020-2045_Full - Pasal 56 | Natl: Strategy & Soft Law | 62 |
| 10 | PP_PSTE_No71_2019 - Pasal 17 | Natl: Binding Law | 59 |
| 11 | UU_PDP_No27_2022 - Pasal 53 | Natl: Binding Law | 59 |
| 12 | UU_ITE_No19_2016 - Pasal 458 | Natl: Binding Law | 58 |
| 13 | PP_PSTE_No71_2019 - Pasal 14 | Natl: Binding Law | 55 |
| 14 | UU_PDP_No27_2022 - Pasal 35 | Natl: Binding Law | 54 |
| 15 | Council_of_Europe_Framework_Convention_on_AI_CETS225 - Article 11 | Intl: Binding Law | 53 |

## 3. Insiden Tanpa Warrant (Structural Holes)
Total: **0** insiden tanpa koneksi ke regulasi apapun.

*Semua insiden memiliki setidaknya satu warrant semantik.*

## 4. Insiden dengan Warrant Terbanyak
| Peringkat | Insiden | Jumlah Warrant | Klasifikasi Warrant |
| --- | --- | --- | --- |
| 1 | BKN-PDL-2024 - Insiden kebocoran struktur hierarki negara di... | 56 | Natl, Intl |
| 2 | DPRD-TRENGGALEK-2022 - Eksfiltrasi database pengguna via SQL Injecti... | 47 | Natl, Intl |
| 3 | DINDIK-SAMPANG-2022 - Eksfiltrasi database pengguna via SQL Injecti... | 47 | Natl, Intl |
| 4 | PN-SIDOARJO-2025 - Eksfiltrasi database pengguna via SQL Injecti... | 42 | Natl, Intl |
| 5 | PN-KEDIRI-2023 - Eksfiltrasi database pengguna via SQL Injecti... | 42 | Natl, Intl |
| 6 | PN-JEMBER-2021 - Eksfiltrasi database pengguna via SQL Injecti... | 38 | Natl, Intl |
| 7 | DPRD-PAMEKASAN-2023 - Manipulasi dokumen eKYC menggunakan Identitas... | 38 | Natl, Intl |
| 8 | DPRD-JOMBANG-2025 - Eksfiltrasi database pengguna via SQL Injecti... | 36 | Natl, Intl |
| 9 | DINKES-JOMBANG-2023 - Eksfiltrasi database pengguna via SQL Injecti... | 34 | Natl, Intl |
| 10 | DINKES-TLGAGUNG-2023 - Eksfiltrasi database pengguna via SQL Injecti... | 33 | Natl, Intl |

---
*Laporan dihasilkan dari analisis 'governs' edges pada graf LNA. Metrik dihitung dari data graf aktual tanpa interpretasi manual.*