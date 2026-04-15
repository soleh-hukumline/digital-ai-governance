import re

with open("app/assets/js/app.js", "r") as f:
    code = f.read()

# Extract SECTOR_DATA
match = re.search(r"const SECTOR_DATA = (\[.*?\]);", code, re.DOTALL)
if match:
    sector_data_id = match.group(1)
    
    # Simple dictionary translations for the text
    translations = [
        ("Keuangan & Fintech AI", "Finance & Fintech AI"),
        ("Prinsip pemrosesan data, dasar hukum — belum mengatur keputusan otomatis AI.", "Data processing principles, legal basis — has not regulated automated AI decisions."),
        ("Manajemen risiko TI Perbankan — tidak spesifik mengatur algoritma AI prediktif.", "Banking IT risk management — does not specifically regulate predictive AI algorithms."),
        ("Sandbox AI Keuangan", "Financial AI Sandbox"),
        ("BELUM ADA: Regulasi sandbox untuk uji coba AI di sektor keuangan.", "NOT YET EXISTS: Sandbox regulation for AI trials in the financial sector."),
        ("Kewajiban Audit Bias", "Bias Audit Obligation"),
        ("BELUM ADA: Kewajiban audit bias algoritmik untuk credit scoring.", "NOT YET EXISTS: Obligation for algorithmic bias audit for credit scoring."),
        ("Penyelenggaraan layanan pinjam meminjam berbasis teknologi.", "Organizing technology-based lending and borrowing services."),
        ("BELUM ADA: Kewajiban pengawasan manusia dalam keputusan kredit otomatis.", "NOT YET EXISTS: Obligation for human oversight in automated credit decisions."),
        ("Studi merekomendasikan: regulasi berbasis sandbox, kewajiban audit bias algoritma credit scoring, dan mekanisme pengawasan manusia (human-in-the-loop) wajib untuk keputusan keuangan berrisiko tinggi.", "Studies recommend: sandbox-based regulation, obligation to audit algorithms for credit scoring bias, and mandatory human-in-the-loop oversight mechanisms for high-risk financial decisions."),
        
        ("Facial Recognition & Biometrik", "Facial Recognition & Biometrics"),
        ("eKYC · Pengawasan Publik · Akses Sistem", "eKYC · Public Surveillance · System Access"),
        ("Mengatur data biometrik sebagai data sensitif — tidak ada ketentuan teknis FR.", "Regulates biometric data as sensitive data — no technical provisions for FR."),
        ("Keamanan sistem elektronik — tidak menyebut facial recognition secara eksplisit.", "Security of electronic systems — does not explicitly mention facial recognition."),
        ("Izin Khusus Penggunaan FR", "Special Permit for FR Use"),
        ("BELUM ADA: Regulasi yang mensyaratkan izin tertulis sebelum menggunakan FR di ruang publik.", "NOT YET EXISTS: Regulation requiring written permission before using FR in public spaces."),
        ("Standar Akurasi & Bias FR", "FR Accuracy & Bias Standards"),
        ("BELUM ADA: Standar teknis akurasi pengenalan wajah dan larangan bias demografis.", "NOT YET EXISTS: Technical standards for facial recognition accuracy and prohibition of demographic bias."),
        ("Hak Menolak FR", "Right to Refuse FR"),
        ("BELUM ADA: Hak eksplisit warga untuk menolak pengenalan wajah.", "NOT YET EXISTS: Explicit right of citizens to refuse facial recognition."),
        ("Studi merekomendasikan: regulasi khusus facial recognition, mekanisme pengawasan mandiri, larangan penggunaan FR untuk profiling massal oleh sektor swasta tanpa izin eksplisit.", "Studies recommend: specific regulation for facial recognition, independent oversight mechanisms, and prohibition of FR use for mass profiling by the private sector without explicit permission."),

        ("E-Commerce & Perdagangan Digital", "E-Commerce & Digital Trade"),
        ("Algoritma Rekomendasi · Ranking · Personalisasi Harga", "Recommendation Algorithms · Ranking · Price Personalization"),
        ("Informasi produk dalam perdagangan elektronik.", "Product information in electronic trading."),
        ("Hak atas informasi yang benar — tidak eksplisit mengatur transparansi algoritma.", "Right to correct information — does not explicitly regulate algorithm transparency."),
        ("Konten sistem elektronik — tidak mengatur algoritma ranking produk.", "Electronic system content — does not regulate product ranking algorithms."),
        ("Larangan Self-Preferencing", "Prohibition of Self-Preferencing"),
        ("BELUM ADA: Larangan platform lebih mengutamakan produk sendiri dalam algoritma.", "NOT YET EXISTS: Platform prohibition from prioritizing its own products in algorithms."),
        ("Transparansi Algoritma Ranking", "Ranking Algorithm Transparency"),
        ("BELUM ADA: Kewajiban mengungkap faktor penentu ranking produk kepada pelaku usaha.", "NOT YET EXISTS: Obligation to disclose factors determining product ranking to businesses."),
        ("Personalisasi Harga AI", "AI Price Personalization"),
        ("BELUM ADA: Larangan diskriminasi harga berbasis profiling AI.", "NOT YET EXISTS: Prohibition of price discrimination based on AI profiling."),
        ("Studi merekomendasikan: kewajiban transparansi faktor ranking, larangan self-preferencing, dan mekanisme keberatan pedagang terhadap keputusan algoritma.", "Studies recommend: transparency obligation for ranking factors, prohibition of self-preferencing, and merchant objection mechanisms against algorithmic decisions."),

        ("AI-Generated Content & Media", "AI-Generated Content & Media"),
        ("Deepfake · Voice Cloning · Synthetic Media", "Deepfake · Voice Cloning · Synthetic Media"),
        ("Melarang konten asusila — tidak ada ketentuan khusus konten sintetis AI.", "Prohibits obscene content — no specific provisions for AI synthetic content."),
        ("Melarang hoaks — sulit dibuktikan untuk deepfake tanpa watermark mandatori.", "Prohibits hoaxes — difficult to prove for deepfakes without a mandatory watermark."),
        ("Karya cipta — belum mengatur kepemilikan konten yang dihasilkan AI.", "Copyright — has not regulated ownership of AI-generated content."),
        ("Label Wajib Konten AI", "Mandatory AI Content Label"),
        ("BELUM ADA: Kewajiban watermark/label visible pada setiap konten yang dihasilkan AI.", "NOT YET EXISTS: Obligation for visible watermark/label on any AI-generated content."),
        ("Akuntabilitas Platform", "Platform Accountability"),
        ("BELUM ADA: Tanggung jawab platform AI atas konten berbahaya yang dihasilkan.", "NOT YET EXISTS: AI platform responsibility for generated harmful content."),
        ("Mekanisme Pengaduan Korban Deepfake", "Deepfake Victim Grievance Mechanism"),
        ("BELUM ADA: Prosedur pengaduan cepat dan take-down wajib untuk konten deepfake non-konsensual.", "NOT YET EXISTS: Fast reporting and mandatory take-down procedures for non-consensual deepfake content."),
        ("Studi merekomendasikan: kewajiban watermarking konten AI, akuntabilitas penyedia model, dan mekanisme pengaduan serta take-down yang cepat bagi korban deepfake.", "Studies recommend: AI content watermarking obligation, model provider accountability, and fast grievance/take-down mechanisms for deepfake victims."),

        ("AI di Peradilan & Hukum", "AI in Justice & Law"),
        ("Sistem Prediksi Vonis · RisikoPenilaian Tersangka · Legal Research AI", "Verdict Prediction Systems · Suspect Risk Assessment · Legal Research AI"),
        ("Hakim sebagai pemegang kekuasaan yudisial — melarang substitusi hakim.", "Judges as holders of judicial power — prohibits judge substitution."),
        ("Standar pembuktian — bukti AI belum diatur validitasnya secara eksplisit.", "Proof standards — AI evidence validity has not been explicitly regulated."),
        ("Batas Peran AI di Pengadilan", "Limits of AI's Role in Courts"),
        ("BELUM ADA: Regulasi yang menetapkan AI hanya sebagai \"alat bantu\" hakim.", "NOT YET EXISTS: Regulation designating AI solely as an \"assistant\" to judges."),
        ("Transparansi Algoritma Penilaian", "Assessment Algorithm Transparency"),
        ("BELUM ADA: Hak terdakwa mengetahui bagaimana AI menilai risiko.", "NOT YET EXISTS: Defendant's right to know how AI assesses their risk."),
        ("Standar Validasi Model AI Peradilan", "Judicial AI Model Validation Standard"),
        ("BELUM ADA: Lembaga yang berwenang memvalidasi AI yang digunakan di peradilan.", "NOT YET EXISTS: Authority responsible for validating AI used in the judicial system."),
        ("Studi merekomendasikan: AI di peradilan harus dibatasi sebagai alat bantu (non-determinatif), hakim tetap harus memiliki reasoning independen, dan setiap AI peradilan wajib diaudit secara berkala.", "Studies recommend: AI in the judiciary must be limited as a tool (non-determinative), judges must retain independent reasoning, and judicial AI must be audited periodically.")
    ]
    
    sector_data_en = sector_data_id
    for id_text, en_text in translations:
        # Avoid regex special characters issues
        sector_data_en = sector_data_en.replace(id_text, en_text)
    
    new_code = code.replace(f"const SECTOR_DATA = {sector_data_id};", f"const SECTOR_DATA_ID = {sector_data_id};\n    const SECTOR_DATA_EN = {sector_data_en};")

    # Now fix initSectorAnalysis
    new_code = new_code.replace("SECTOR_DATA.forEach(sector => {", "const activeSectorData = (typeof window !== 'undefined' && window.currentLang === 'en') ? SECTOR_DATA_EN : SECTOR_DATA_ID;\n        activeSectorData.forEach(sector => {")

    with open("app/assets/js/app.js", "w") as f:
        f.write(new_code)
    
    print("SECTOR_DATA translation and injection successful.")
else:
    print("SECTOR_DATA block not found.")
