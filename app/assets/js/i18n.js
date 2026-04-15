const i18nDict = {
    // Nav Labels
    'Jaringan Regulasi': 'Regulatory Network',
    'Master LNA': 'Master LNA',
    'Regulasi Internasional': 'International Regulations',
    'Regulasi Nasional': 'National Regulations',
    'Intl vs Nasional': 'Intl vs National',
    'Analisis Empiris': 'Empirical Analysis',
    'Analisis Kasus': 'Case Analysis',
    'Kesenjangan Sektoral': 'Sectoral Gap Analysis',
    'Konklusi Gap Analysis': 'Gap Analysis Conclusion',
    'Katalog Insiden': 'Incident Catalog',
    'Asisten Hukum AI': 'AI Legal Assistant',
    'Toulmin · Panduan Praktisi': 'Toulmin · Practitioner Guide',

    // Headers & Banners
    'Master Legal Network Analysis': 'Master Legal Network Analysis',
    'Pemetaan Regulasi AI Indonesia · Multilingual Embeddings · Maastricht LNA': 'Mapping Indonesia\'s AI Regulations · Multilingual Embeddings · Maastricht LNA',
    'Jaringan Regulasi': 'Regulatory Network',
    'Pemetaan Asimetri Regulasi AI Indonesia': 'Mapping Asymmetry in Indonesia\'s AI Regulations',

    // Sections
    'Master LNA — Semua Jaringan Regulasi': 'Master LNA — All Regulatory Networks',
    'Metrik Topologi Jaringan': 'Network Topology Metrics',
    'Regulasi Internasional · Thematic Cluster': 'International Regulations · Thematic Cluster',
    'Metrik Topologi — Regulasi Internasional': 'Topological Metrics — International Regulations',
    'Regulasi Nasional Indonesia': 'Indonesia National Regulations',
    'Metrik Topologi — Regulasi Nasional': 'Topological Metrics — National Regulations',
    'Intl vs Nasional · Asimetri Transplantasi Hukum': 'Intl vs National · Legal Transplant Asymmetry',
    'Metrik Asimetri Transplantasi Hukum': 'Legal Transplant Asymmetry Metrics',
    'Tier Similarity:': 'Similarity Tier:',
    '● Identik ≥95%': '● Identical ≥95%',
    '● Sangat Kuat 80–94%': '● Very Strong 80–94%',
    '● Lemah 70–79%': '● Weak 70–79%',
    'Analisis Kasus · Insiden Siber': 'Case Analysis · Cyber Incidents',
    'Metrik Forensik Kasus — Structural Holes': 'Case Forensic Metrics — Structural Holes',
    'Gap Analysis — Warrant Mapping Matrix': 'Gap Analysis — Warrant Mapping Matrix',
    'Metrik Gap Analysis — Modularity & Fragmentasi': 'Gap Analysis Metrics — Modularity & Fragmentation',
    'Katalog Data Forensik Insiden Siber': 'Cyber Incident Forensic Data Catalog',

    // Buttons & Inputs
    'Toggle Isolasi': 'Toggle Isolation',
    'Cari kronologi, pelaku, objek hukum...': 'Search chronology, perpetrators, legal objects...',
    'Semua Kategori': 'All Categories',
    
    // AI Section
    'Argumentasi Toulmin': 'Toulmin Argumentation',
    'Panduan Praktisi · Compliance Navigator': 'Practitioner Guide · Compliance Navigator',
    'Konfigurasi AI': 'AI Configuration',
    'Masukkan API Key...': 'Enter API Key...',
    'Menunggu API Key...': 'Waiting for API Key...',
    'Simpan & Deteksi Model': 'Save & Detect Model',
    'Pilih Peristiwa Hukum': 'Select Legal Event',
    'Pilih Insiden Kasus...': 'Select Case Incident...',
    'Analisis Toulmin': 'Toulmin Analysis',
    'Warrant & Grounds': 'Warrant & Grounds',
    'Pilih insiden untuk melihat interkoneksi pasal regulasi.': 'Select an incident to view regulatory interconnectivity.',
    'Argumentasi Toulmin + Rekomendasi Konkret': 'Toulmin Argumentation + Concrete Recommendation',
    'Analisis akan muncul setelah memilih insiden dan menekan Analisis Toulmin.': 'The analysis will appear after selecting an incident and clicking Toulmin Analysis.',
    
    // Compliance Navigator
    'Profil Aktivitas': 'Activity Profile',
    'Regulasi Berlaku': 'Applicable Regulations',
    'Rekomendasi AI': 'AI Recommendation',
    'Langkah 1: Profil Aktivitas AI Anda': 'Step 1: Your AI Activity Profile',
    'Sektor Industri': 'Industry Sector',
    '— Pilih Sektor —': '— Select Sector —',
    'Jenis Sistem AI': 'Type of AI System',
    '— Pilih Jenis AI —': '— Select AI Type —',
    'Deskripsi Singkat Aktivitas (Opsional)': 'Brief Description of Activity (Optional)',
    'Analisis Regulasi Berlaku': 'Analyze Applicable Regulations',
    'Langkah 2: Peta Kewajiban Regulasi': 'Step 2: Map of Regulatory Obligations',
    'Langkah 3: Rekomendasi Konkret AI': 'Step 3: Concrete AI Recommendations',
    'Dapatkan Panduan AI': 'Get AI Guidance',
    'Mulai Ulang': 'Restart',

    // Table Headers
    'Metrik': 'Metric',
    'Nilai': 'Value',
    'Implikasi Legal': 'Legal Implication',
    '⏳ Menunggu graph selesai dirender…': '⏳ Waiting for graph to render...',

    // Incident Cards & Node Inspector
    'Pelaku:': 'Perpetrator:',
    'PSE:': 'Platform/PSE:',
    'Kualifikasi:': 'Qualification:',
    'Nexus Kausalitas:': 'Causality Nexus:',
    'Degree Koneksi:': 'Connection Degree:',
    'Terhubung ke:': 'Connected to:'
};

// Build reverse dictionary for switching back to ID
const i18nDictRev = {};
for (const [id, en] of Object.entries(i18nDict)) {
    i18nDictRev[en] = id;
}

window.currentLang = 'id';

window.t = function(text) {
    if (window.currentLang === 'en') {
        return i18nDict[text] || text;
    }
    return text;
};

// Function to traverse DOM and translate text nodes and placeholders
window.applyTranslations = function() {
    const isEn = window.currentLang === 'en';
    const dict = isEn ? i18nDict : i18nDictRev;

    function walk(node) {
        if (node.nodeType === 3) { // Text node
            let txt = node.nodeValue;
            let trimmed = txt.trim();
            if (trimmed.length > 0 && dict[trimmed]) {
                node.nodeValue = txt.replace(trimmed, dict[trimmed]);
            }
        } 
        else if (node.nodeType === 1 && node.nodeName !== 'SCRIPT' && node.nodeName !== 'STYLE') {
            // Check placeholders
            if (node.hasAttribute('placeholder')) {
                let p = node.getAttribute('placeholder');
                if (dict[p]) node.setAttribute('placeholder', dict[p]);
            }
            // Dive into children
            for (let i = 0; i < node.childNodes.length; i++) {
                walk(node.childNodes[i]);
            }
        }
    }
    walk(document.body);

    // Update section meta if needed (it triggers during SPA navigation)
    const activeItem = document.querySelector('.nav-item.active');
    if (activeItem && typeof navigateTo !== 'undefined') {
        // Just re-apply the text updates on the header
        const headerTitle = document.getElementById('header-title');
        const headerSub = document.getElementById('header-sub');
        // Let navigateTo handle it normally, but since we already swapped DOM text,
        // it's better to just re-trigger navigateTo. Wait, navigateTo hardcodes Indonesian in SECTION_META.
        // I will patch navigateTo directly in app.js instead.
    }
};

window.toggleLanguage = function() {
    window.currentLang = window.currentLang === 'id' ? 'en' : 'id';
    
    // Update button text
    const btn = document.getElementById('lang-toggle-btn');
    if (btn) btn.textContent = window.currentLang === 'en' ? 'ID' : 'EN';
    
    // Apply translations
    applyTranslations();
    
    // Disertakan juga trigger render table ulang di app.js yang terikat data dinamis
    if (typeof reRenderAllMetrics === 'function') {
        reRenderAllMetrics();
    }
    if (typeof window.reRenderSectorData === 'function') {
        window.reRenderSectorData();
    }
    if (typeof window.reloadIncidentRegistry === 'function') {
        window.reloadIncidentRegistry();
    }
};

// Listen to DOM tree updates to catch newly spawned text (e.g. innerHTML swaps in SPA)
/* We will just wrap innerHTML setters in app.js with a translation call where necessary, 
   or manually fire applyTranslations() after heavy DOM swaps. */
