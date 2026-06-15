# Analisis Insiden — Pemetaan Warrant per Kasus

Laporan ini memetakan distribusi warrant normatif (dasar hukum) untuk setiap insiden siber berbasis AI di Indonesia. Metrik di bawah dihitung dari koneksi 'governs' pada graf LNA, yaitu hasil *retrieval* kemiripan semantik (SBERT/cosine) — bersifat EKSPLORATIF, BUKAN lapisan otoritas hukum.

> ⚠️ **Catatan otoritas & koreksi.** Angka 'tanpa warrant' di bawah adalah baseline *cosine retrieval* (≈44,4% insiden tanpa edge `governs`). Ini **artefak retrieval, BUKAN kekosongan hukum**: cosine gagal me-ranking pasal yang berlaku (mis. UU PDP Pasal 35 sempat di peringkat 154). Setelah pemetaan tervalidasi (judge few-shot, kandidat recall-complete, ambang P≥95), **88,9% insiden (40/45) memiliki dasar hukum** dan celah riil bersifat **asimetris-subjek + spesifik-AI** (lih. REVIEWER_RESPONSE.md §2.3/§2.5). Klaim '55,6% vacuum / structural holes' DITARIK. Lapisan **otoritas eksplisit** (sitasi antar-instrumen) ada di `../../data/network/citations.json` — bukan pada edge `governs` di sini.

## 1. Distribusi Warrant per Insiden (baseline cosine — eksploratif)
| Kategori | Jumlah | Persentase |
| --- | --- | --- |
| Tanpa edge `governs` cosine (degree=0; ≠ kekosongan hukum) | 25 | 55.6% |
| Warrant nasional saja | 15 | 33.3% |
| Warrant internasional saja | 1 | 2.2% |
| Warrant ganda (Natl + Intl) | 4 | 8.9% |
| **Total Insiden** | **45** | **100%** |

## 2. Regulasi yang Paling Sering Menjadi Warrant (baseline cosine — eksploratif)
*Peringkat berikut adalah artefak presisi cosine (pasal definitional bisa menonjol). Untuk otoritas eksplisit antar-instrumen lihat `../../data/network/citations.json`.*
| Peringkat | Regulasi | Klasifikasi | Jumlah Insiden |
| --- | --- | --- | --- |
| 1 | UU_PDP_No27_2022 - Pasal 4 | Natl: Binding Law | 7 |
| 2 | UU_ITE_No1_2024 - Pasal 45A | Natl: Binding Law | 6 |
| 3 | UU_PDP_No27_2022 - Pasal 33 | Natl: Binding Law | 4 |
| 4 | Stranas_AI_Indonesia_2020-2045_Full - Bagian 35 | Natl: Strategy & Soft Law | 3 |
| 5 | Stranas_AI_Indonesia_2020-2045_Full - Bagian 76 | Natl: Strategy & Soft Law | 3 |
| 6 | UU_ITE_No19_2016 - Pasal 45 | Natl: Binding Law | 2 |
| 7 | UU_PDP_No27_2022 - Pasal 6 | Natl: Binding Law | 2 |
| 8 | UU_PDP_No27_2022 - Pasal 9 | Natl: Binding Law | 2 |
| 9 | UU_PDP_No27_2022 - Pasal 35 | Natl: Binding Law | 2 |
| 10 | UU_PDP_No27_2022 - Pasal 46 | Natl: Binding Law | 2 |
| 11 | UU_PDP_No27_2022 - Pasal 60 | Natl: Binding Law | 2 |
| 12 | UU_PDP_No27_2022 - Pasal 6O | Natl: Binding Law | 2 |
| 13 | Stranas_AI_Indonesia_2020-2045_Full - Bagian 77 | Natl: Strategy & Soft Law | 2 |
| 14 | Stranas_AI_Indonesia_2020-2045_Full - Bagian 80 | Natl: Strategy & Soft Law | 2 |
| 15 | SE_Komdigi_No9_2023_Etika_AI - Bagian 15 | Natl: Sectoral/Agency Guidance | 2 |

## 3. Insiden Tanpa Edge `governs` Cosine (artefak retrieval — BUKAN structural holes)
Total: **25** insiden tanpa edge `governs` cosine (≈55.6%). Ini **bukan** kekosongan hukum: di pemetaan tervalidasi (judge P≥95) hanya **5/45 (11,1%)** yang benar-benar tanpa dasar hukum berkepercayaan-tinggi (lih. REVIEWER_RESPONSE.md §2.3).

| No | Insiden |
| --- | --- |
| 1 | BKN-TEACHER-INTRUSION-2024 - Pada September 2024 polisi menangkap seorang ... |
| 2 | BJORKA-SIM-REGISTRATION-1-3B-2022 - Pada 31 Agustus-1 September 2022 'Bjorka' men... |
| 3 | KEMENKES-PATIENT-RECORDS-2022 - Pada 6 Januari 2022 Kemenkes mengakui menyeli... |
| 4 | BPJS-KESEHATAN-279M-2021 - Pada Mei 2021 akun RaidForums 'Kotz' menjual ... |
| 5 | EHAC-COVID-APP-LEAK-2021 - Pada 15 Juli 2021 tim vpnMentor menemukan bas... |
| 6 | WANNACRY-HOSPITALS-2017 - Pada pertengahan Mei 2017, saat wabah WannaCr... |
| 7 | PEDULILINDUNGI-ID-GAMBLING-HIJACK-2025 - Sekitar 19-20 Mei 2025 situs legacy PeduliLin... |
| 8 | SATUSEHAT-KOTIM-BREACH-2025 - Sekitar 7 Agustus 2025 pengguna baru forum da... |
| 9 | UGM-FT-WEBSITE-DEFACEMENT-2022 - Pada Desember 2022 peretas beralias 'Bangsin'... |
| 10 | BSI-LOCKBIT-RANSOMWARE-2023 - Pada 8 Mei 2023 layanan ATM dan cabang BSI lu... |
| 11 | INDODAX-CRYPTO-HACK-2024 - Pada 11 September 2024 penyerang menguras hot... |
| 12 | KREDITPLUS-DATA-LEAK-2020 - Data ~896.169 nasabah KreditPlus dijual di Ra... |
| 13 | BANK-JATIM-BIFAST-FRAUD-2024 - Pada 22 Juni 2024, antara ~12.22-15.38 WIB, 4... |
| 14 | BANK-DKI-BIFAST-BREACH-2025 - Pada 29 Maret 2025 sistem pembayaran Bank DKI... |
| 15 | TOKOPEDIA-91M-2020 - Maret 2020 basis data pengguna Tokopedia dicu... |
| 16 | BUKALAPAK-13M-2019 - Maret 2019 Gnosticplayers menjual batch keemp... |
| 17 | BHINNEKA-1-2M-2020 - Bhinneka.com dibobol pada 27 Januari 2020; Ju... |
| 18 | LAZADA-REDMART-1-1M-2020 - Pada 29 Oktober 2020 Lazada menemukan akses i... |
| 19 | MYINDIHOME-35M-2023 - Awal Juli 2023 'Bjorka' menawarkan ~35,9 juta... |
| 20 | JASAMARGA-JMTO-BREACH-2022 - Pada 25 Agustus 2022 DESORDEN mengumumkan mem... |
| | *(+5 lainnya)* |

## 4. Insiden dengan Warrant Terbanyak
| Peringkat | Insiden | Jumlah Warrant | Klasifikasi Warrant |
| --- | --- | --- | --- |
| 1 | OJK-AI-VOICE-DEEPFAKE-FRAUD-2025 - OJK melaporkan dua metode penipuan AI paling ... | 31 | Natl, Intl |
| 2 | KEMENDIKBUD-LEAK-CLAIM-2025 - Awal Februari 2025 anggota BreachForums (teri... | 13 | Natl, Intl |
| 3 | PLN-CUSTOMER-DATA-LEAK-2022 - Agustus 2022 data >17 juta pelanggan PLN dita... | 12 | Natl |
| 4 | KAI-STORMOUS-RANSOMWARE-2024 - Januari 2024 Stormous mengklaim membobol PT K... | 6 | Natl |
| 5 | NPWP-TAX-BJORKA-2024 - Pada 18 September 2024 'Bjorka' menawarkan ~6... | 4 | Natl |
| 6 | MYPERTAMINA-44M-2022 - November 2022 dataset yang diatribusikan ke M... | 4 | Natl |
| 7 | KEJAKSAAN-AGUNG-DEFACEMENT-2025 - Pada Februari 2025 situs resmi Kejaksaan Agun... | 3 | Natl |
| 8 | BRI-LIFE-DATA-LEAK-2021 - Akhir Juli 2021 pengguna RaidForums menawarka... | 3 | Natl |
| 9 | INAFIS-POLRI-FINGERPRINT-LEAK-2024 - Pada 22 Juni 2024 'MoonzHaxor' mengunggah dat... | 2 | Natl |
| 10 | PEDULILINDUNGI-JOKOWI-CERT-2021 - Awal September 2021 sertifikat vaksin Preside... | 2 | Natl, Intl |

---
*Laporan dihasilkan dari edge 'governs' (kemiripan semantik SBERT/cosine, EKSPLORATIF) pada graf LNA. Coverage tervalidasi = 88,9% (40/45), bukan 'vacuum'; lihat REVIEWER_RESPONSE.md §2.3/§2.5. Otoritas eksplisit (sitasi antar-instrumen): ../../data/network/citations.json.*