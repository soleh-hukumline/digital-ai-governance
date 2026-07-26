document.addEventListener('DOMContentLoaded', () => {

    // ===================================================================
    // ERROR LOGGER (Debug Tool)
    // ===================================================================
    function logErrorToUI(msg, source, lineno, colno, error) {
        const logger = document.getElementById('debug-logger');
        const content = document.getElementById('debug-log-content');
        const toggleBtn = document.getElementById('debug-toggle-btn');
        
        if (!logger || !content || !toggleBtn) return;
        
        toggleBtn.style.display = 'flex';
        // Auto show logger on first error
        if (content.children.length === 0) logger.style.display = 'flex';
        
        const errDiv = document.createElement('div');
        errDiv.style.padding = '8px';
        errDiv.style.background = 'rgba(244,63,94,0.1)';
        errDiv.style.borderLeft = '3px solid var(--rose)';
        errDiv.style.borderRadius = '4px';
        errDiv.style.wordBreak = 'break-word';
        
        const time = new Date().toLocaleTimeString();
        let stack = error && error.stack ? error.stack : '';
        // Escape HTML
        stack = stack.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        const safeMsg = msg ? msg.toString().replace(/</g, '&lt;').replace(/>/g, '&gt;') : 'Unknown Error';
        
        errDiv.innerHTML = `
            <div style="color:var(--text-1); font-weight:600; margin-bottom:4px;">[${time}] ${safeMsg}</div>
            ${source ? `<div style="color:var(--text-3); font-size:10px;">${source}:${lineno}:${colno}</div>` : ''}
            ${stack ? `<div style="color:var(--text-4); font-size:10px; margin-top:4px; white-space:pre-wrap;">${stack}</div>` : ''}
        `;
        
        content.prepend(errDiv);

        // Send to backend custom server for AI to read
        fetch('/api/log', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                message: msg,
                source: source,
                lineno: lineno,
                colno: colno,
                stack: error?.stack || ''
            })
        }).catch(e => console.error("Logger failed to reach backend"));
    }

    window.addEventListener('error', function(e) {
        logErrorToUI(e.message, e.filename, e.lineno, e.colno, e.error);
    });

    window.addEventListener('unhandledrejection', function(e) {
        logErrorToUI('Unhandled Promise Rejection: ' + (e.reason?.message || e.reason), null, null, null, e.reason);
    });

    // ===================================================================
    // TOAST NOTIFICATION (UI Integrated Alert)
    // ===================================================================
    window.showToast = function(msg, type='warning') {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        const colors = {
            warning: 'background:rgba(245,158,11,0.9); border:1px solid #f59e0b; color:#fff;',
            error: 'background:rgba(239,68,68,0.9); border:1px solid #ef4444; color:#fff;',
            success: 'background:rgba(16,185,129,0.9); border:1px solid #10b981; color:#fff;'
        };
        const icons = { warning: 'warning', error: 'error', success: 'check_circle' };
        
        toast.style.cssText = `${colors[type]} padding:12px 24px; border-radius:30px; font-size:14px; font-weight:500; display:flex; align-items:center; gap:8px; box-shadow:0 10px 30px rgba(0,0,0,0.3); backdrop-filter:blur(10px); transform:translateY(-20px); opacity:0; transition:all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275); pointer-events:auto;`;
        const translatedMsg = typeof window.t === 'function' ? window.t(msg) : msg;
        toast.innerHTML = `<span class="material-symbols-rounded" style="font-size:20px;">${icons[type] || 'info'}</span> <span>${translatedMsg}</span>`;
        
        container.appendChild(toast);
        
        // Animate In
        setTimeout(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        }, 10);
        
        // Animate Out
        setTimeout(() => {
            toast.style.transform = 'translateY(-20px)';
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    };


    // ========== IMMEDIATE: Hide all section panels before anything renders ==========
    document.querySelectorAll('.section-panel').forEach(p => {
        p.style.display = 'none';
        p.style.flexDirection = 'column';
    });

    // ===================================================================
    // GLOBAL STATE
    // ===================================================================

    let aiNetworkData = null;
    let aiIncidentNodes = [];
    let rawIncidentData = [];
    let llmConf = {};   // incident_id -> [{regulation_label, cosine, relevant, confidence, reason}]
    const graphsLoaded = new Set();
    const networkInstances = {};   // { graphId: { network, graphData } }
    const DATA_V = '20260726_3';   // cache-buster for data/report fetches (bump on data updates)

    // ===================================================================
    // SPA NAVIGATION — data-target based routing
    // ===================================================================
    const SECTION_META = {
        'section-all': { icon: 'hub', title: 'Master Legal Network Analysis', sub: 'Semua jaringan regulasi · International + Nasional + Insiden' },
        'section-intl': { icon: 'public', title: 'Regulasi Internasional', sub: 'EU AI Act · OECD AI Principles · CETS225 · Thematic Cluster' },
        'section-natl': { icon: 'account_balance', title: 'Regulasi Nasional Indonesia', sub: 'UU PDP · UU ITE · PP PSTE · POJK · SE Komdigi · Stranas AI' },
        'section-cross': { icon: 'sync_alt', title: 'Intl vs Nasional · Cross-Jurisdiction', sub: 'Analisis gap sitasi lintas yurisdiksi · Peta dua kluster terputus (sitir-menyitir)' },
        'section-incident': { icon: 'gavel', title: 'Analisis Kasus Forensik', sub: 'Pemetaan 45 insiden ke regulasi · Hakim LLM (Claude) tervalidasi telaah pakar (warrant-operatif κ 0.94) + 52 tinjauan manusia · Gap terlebar: basis pengawasan regulator' },
        'section-sector': { icon: 'category', title: 'Analisis Kesenjangan Regulasi Per Sektor', sub: 'Tiap kartu = SATU sektor: % insiden sektor itu yang punya dasar hukum per subjek · Hakim Claude + telaah pakar' },
        'section-gap': { icon: 'insights', title: 'Konklusi: Gap Analysis', sub: 'Konsolidasi Temuan LNA · Coverage per Klaster · Connected Components' },
        'section-database': { icon: 'database_search', title: 'Katalog Data Forensik Insiden Siber', sub: 'Registry 45 kasus riil bersumber · Searchable · Filter per kategori' },
        'section-ai': { icon: 'smart_toy', title: 'AI Legal Assistant', sub: 'Argumentasi Toulmin + Panduan Praktisi · Gemini · Groq' },
    };

    function navigateTo(targetId) {
        // Hide ALL panels via inline style (CSS-independent — guaranteed to work)
        document.querySelectorAll('.section-panel').forEach(p => {
            p.style.display = 'none';
            p.classList.remove('active');
        });

        // Show ONLY the target panel — guaranteed scroll via explicit height
        const target = document.getElementById(targetId);
        if (target) {
            const header = document.querySelector('.top-header');
            const headerH = header ? header.offsetHeight : 58;
            const availH = window.innerHeight - headerH;

            // KUNCI SCROLL: set height eksplisit lebih kecil dari konten
            // sehingga overflow-y:auto bisa bekerja
            target.style.display = 'flex';
            target.style.flexDirection = 'column';
            target.style.gap = '1.25rem';
            target.style.padding = '1.25rem 1.5rem 2rem';
            target.style.height = availH + 'px';
            target.style.maxHeight = availH + 'px';
            target.style.overflowY = 'scroll';  /* scroll bukan auto — selalu tampil */
            target.style.overflowX = 'hidden';
            target.style.boxSizing = 'border-box';
            target.style.position = 'relative';
            target.classList.add('active');
        }

        // Update active nav highlight
        document.querySelectorAll('#nav-menu .nav-item').forEach(n => {
            n.classList.toggle('active', n.dataset.target === targetId);
        });

        // Update dynamic header
        const meta = SECTION_META[targetId] || {};
        const headerIcon = document.getElementById('header-icon');
        const headerTitle = document.getElementById('header-title');
        const headerSub = document.getElementById('header-sub');
        if (headerIcon) headerIcon.textContent = meta.icon || 'hub';
        if (headerTitle) headerTitle.textContent = meta.title || '';
        if (headerSub) headerSub.textContent = meta.sub || '';

        if (typeof applyTranslations === 'function') applyTranslations();

        // Lazy-load sector analysis only when section displayed
        if (targetId === 'section-sector') {   // always re-render so it reflects your latest review
            const _sc = document.getElementById('sector-grid-container');
            if (_sc) _sc.dataset.rendered = 'false';
            initSectorAnalysis();
        }
        if (targetId === 'section-gap') renderGapMatrix();   // Warrant Mapping Matrix (live)
        // Radial (chord) Insiden↔Regulasi view replaces the force graph here
        if (targetId === 'section-incident') renderRadialIncident();

        // GRAPH FIX: jika graph sudah dirender sebelumnya (pindah tab), redraw + fit
        // Jika belum dirender (lazy), loadAllNetworkGraphs akan handle saat navigateTo
        const graphSectionMap = {
            'section-all': 'all',
            'section-intl': 'intl',
            'section-natl': 'natl',
            'section-cross': 'cross',
            'section-incident': 'incident',
            'section-gap': 'gap',
        };
        const graphId = graphSectionMap[targetId];
        if (graphId) {
            // Double rAF: pastikan paint selesai sebelum ukur canvas
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const inst = networkInstances[graphId];
                    if (inst && inst.network) {
                        // Graph sudah ada: resize canvas lalu fit
                        inst.network.setSize(
                            document.getElementById(`network-${graphId}`).offsetWidth + 'px',
                            document.getElementById(`network-${graphId}`).offsetHeight + 'px'
                        );
                        inst.network.redraw();
                        inst.network.fit({ animation: { duration: 500, easingFunction: 'easeInOutQuad' } });
                    } else {
                        // Graph belum ada: render sekarang saat section visible
                        loadGraphById(graphId);
                    }
                });
            });
        }
    }

    // Bind nav items — delegate to both li and inner a to cover all click areas
    document.getElementById('nav-menu').addEventListener('click', e => {
        const item = e.target.closest('.nav-item[data-target]');
        if (item) {
            e.preventDefault();
            e.stopPropagation();
            navigateTo(item.dataset.target);
        }
    });

    // Initial navigation
    navigateTo('section-all');

    // ===================================================================
    // THEMATIC CLUSTER EDGES (Intl-Intl)
    // Hardcoded based on academic thematic mapping of AI governance themes
    // ===================================================================
    // NB: node OECD memakai skema id 'Bagian_N' (bukan 'Section_N'); mapping tema
    // divalidasi 2026-07-18 terhadap teks verbatim provision_texts.json —
    // Bagian 27=transparansi(1.3), 28=robustness/risiko(1.4), 29=akuntabilitas(1.5),
    // 26=nilai human-centred(1.2), 32=agile policy/sandbox(2.3); CETS Art 8=transparansi&oversight,
    // 9=akuntabilitas, 11=privasi/data, 16=kerangka manajemen risiko.
    const THEMATIC_INTL_EDGES = [
        // Theme: Transparency & Explainability
        { from: 'EU_AI_Act_2024_Article_13', to: 'OECD_AI_Principles_2024_Bagian_27', theme: 'Transparansi & Eksplainabilitas' },
        { from: 'EU_AI_Act_2024_Article_13', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_8', theme: 'Transparansi & Eksplainabilitas' },
        // Theme: Risk Management
        { from: 'EU_AI_Act_2024_Article_9', to: 'OECD_AI_Principles_2024_Bagian_28', theme: 'Manajemen Risiko' },
        { from: 'EU_AI_Act_2024_Article_9', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_16', theme: 'Manajemen Risiko' },
        { from: 'EU_AI_Act_2024_Article_6', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_16', theme: 'Manajemen Risiko' },
        // Theme: Human Oversight
        { from: 'EU_AI_Act_2024_Article_14', to: 'OECD_AI_Principles_2024_Bagian_26', theme: 'Pengawasan Manusia' },
        { from: 'EU_AI_Act_2024_Article_14', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_8', theme: 'Pengawasan Manusia' },
        // Theme: Data Governance
        { from: 'EU_AI_Act_2024_Article_10', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_11', theme: 'Tata Kelola Data' },
        // Theme: Accountability
        { from: 'EU_AI_Act_2024_Article_16', to: 'OECD_AI_Principles_2024_Bagian_29', theme: 'Akuntabilitas' },
        { from: 'EU_AI_Act_2024_Article_16', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_9', theme: 'Akuntabilitas' },
        // Theme: Prohibited Uses / High Risk (EU Art 5 practik terlarang ↔ CETS Art 5 integritas proses demokrasi — padanan parsial)
        { from: 'EU_AI_Act_2024_Article_5', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_5', theme: 'Larangan Penggunaan AI Berbahaya' },
        // Theme: Provider Obligations (EU Art 16 kewajiban penyedia ↔ CETS Art 8 transparansi & pengawasan)
        { from: 'EU_AI_Act_2024_Article_16', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_8', theme: 'Kewajiban Penyedia AI' },
        // Theme: Conformity & Certification (EU Art 43 penilaian kesesuaian ↔ CETS Art 16 kerangka manajemen risiko/dampak)
        { from: 'EU_AI_Act_2024_Article_43', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_16', theme: 'Conformity & Sertifikasi' },
        // Theme: Regulatory Sandbox
        { from: 'EU_AI_Act_2024_Article_57', to: 'OECD_AI_Principles_2024_Bagian_32', theme: 'Regulatory Sandbox' },
    ];

    const THEME_COLORS = {
        'Transparansi & Eksplainabilitas': '#0ea5e9',
        'Manajemen Risiko': '#f59e0b',
        'Pengawasan Manusia': '#10b981',
        'Tata Kelola Data': '#6366f1',
        'Akuntabilitas': '#a855f7',
        'Larangan Penggunaan AI Berbahaya': '#f43f5e',
        'Kewajiban Penyedia AI': '#ec4899',
        'Conformity & Sertifikasi': '#14b8a6',
        'Regulatory Sandbox': '#84cc16',
    };

    // ===================================================================
    // FETCH MARKDOWN REPORTS
    // ===================================================================
    async function fetchMarkdownReport(filename, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        try {
            const res = await fetch(`./system/legal_network_framework/${filename}?v=${DATA_V}`);
            if (!res.ok) throw new Error('404');
            const mdText = await res.text();
            container.innerHTML = marked.parse(mdText);
        } catch (e) {
            container.innerHTML = `<div style="color:#ef4444; border:1px solid rgba(239,68,68,0.3); background:rgba(239,68,68,0.05); padding:1.5rem; border-radius:12px; margin:1rem;">
                <h3>⚠️ Gagal Membaca ${filename}</h3>
                <p style="color:var(--text-3); font-size:0.85rem; margin-top:0.5rem;">File laporan belum di-generate. Jalankan Python analyzer untuk membuat file ini.</p>
            </div>`;
        }
    }

    // ===================================================================
    // NETWORK GRAPH RENDERING (All 6 graphs)
    // ===================================================================
    function getEdgeColorFromLabel(label = '', graphId = '') {
        // Edge color by similarity tier
        if (graphId === 'cross') {
            const match = label.match(/(Identik|Sangat Kuat|Lemah)\s*([\d.]+)%/i) || label.match(/Sim\s*([\d.]+)%/i);
            if (match) {
                // If new tier format: match[1] = tier, match[2] = score
                // If old Sim format: match[1] = score
                const tier = match[2] ? match[1] : null;
                const score = parseFloat(match[2] || match[1]);
                if (score >= 95) return { color: '#10b981', highlight: '#10b981', opacity: 0.95 };
                if (score >= 80) return { color: '#f59e0b', highlight: '#f59e0b', opacity: 0.8 };
                return { color: '#f43f5e', highlight: '#f43f5e', opacity: 0.6 };
            }
        }
        // Thematic intl-intl edge
        for (const [theme, color] of Object.entries(THEME_COLORS)) {
            if (label.includes(theme)) return { color, highlight: color, opacity: 0.8 };
        }
        return { color: 'rgba(203, 213, 225, 0.35)', highlight: '#6366f1' };
    }

    // ── Human-readable node labels ───────────────────────────────────
    // Raw ids like "EU_AI_Act_2024 - Article 24" are machine-y. We show a short
    // CODE on the graph ("EU AI Act Art.24"), a clean full name in tooltip/inspector
    // title ("EU AI Act 2024 — Article 24"), and keep the raw id verbatim in the
    // inspector (nothing lost).
    const INSTRUMENT_ABBR = [
        [/UU_PDP/i, 'UU PDP'], [/UU_ITE_No1_2024/i, 'UU ITE 2024'],
        [/UU_ITE_No19_2016/i, 'UU ITE 2016'], [/UU_ITE/i, 'UU ITE'],
        [/PP_PSTE/i, 'PP PSTE'], [/POJK/i, 'POJK'], [/SE_Komdigi/i, 'SE Komdigi'],
        [/Stranas_AI/i, 'Stranas AI'], [/UU_Perdagangan/i, 'UU Dagang'],
        [/EU_AI_Act/i, 'EU AI Act'], [/OECD/i, 'OECD AI'], [/UNESCO/i, 'UNESCO'],
        [/Council_of_Europe|CETS2?25/i, 'CoE FCAI'], [/ASEAN/i, 'ASEAN Guide'],
        [/UNGA_Res/i, 'UNGA Res'], [/ISO.*42001/i, 'ISO 42001'], [/^WHO|WHO_/i, 'WHO Health AI'],
        [/G7.*Hiroshima/i, 'G7 Hiroshima'], [/Global_Digital_Compact|UN_Global/i, 'UN GDC'],
    ];
    function _abbrInst(inst) {
        for (const [re, ab] of INSTRUMENT_ABBR) if (re.test(inst)) return ab;
        return String(inst).replace(/_/g, ' ').replace(/\s+/g, ' ').trim();
    }
    function _splitNode(raw) {
        const s = String(raw || '');
        let parts = s.split(' - ');
        if (parts.length >= 2) return { inst: parts[0], prov: parts.slice(1).join(' - ') };
        const m = s.match(/^(.*?)[_ ](Article|Pasal|Bagian)[_ ](\S+)$/i);
        if (m) return { inst: m[1], prov: `${m[2]} ${m[3]}` };
        return { inst: s, prov: '' };
    }
    const _isIncidentRaw = s => /^CASE_/.test(s) || /-(19|20)\d{2}\b/.test(String(s).split(' - ')[0]);
    function nodeCode(raw) {                         // compact label for the graph
        const s = String(raw || '');
        if (_isIncidentRaw(s)) return s.split(' - ')[0].replace(/^CASE_/, '');
        const { inst, prov } = _splitNode(s);
        const ps = prov.replace(/Article\s*/i, 'Art.').replace(/Pasal\s*/i, 'Ps.')
            .replace(/Bagian\s*/i, '§').replace(/\s+/g, '').trim();
        return (_abbrInst(inst) + (ps ? ' ' + ps : '')).trim();
    }
    function nodeFull(raw) {                         // clean full name for tooltip/title
        const s = String(raw || '');
        if (_isIncidentRaw(s)) return s.split(' - ')[0].replace(/^CASE_/, '');
        const { inst, prov } = _splitNode(s);
        return _abbrInst(inst) + (prov ? ' — ' + prov.replace(/_/g, ' ') : '');
    }

    function buildNodeInspectorHTML(nodeData, graphData) {
        const degree = graphData.edges.filter(e => e.from === nodeData.id || e.to === nodeData.id).length;
        const connectedNodes = graphData.edges
            .filter(e => e.from === nodeData.id || e.to === nodeData.id)
            .map(e => {
                const otherId = e.from === nodeData.id ? e.to : e.from;
                const other = graphData.nodes.find(n => n.id === otherId);
                return nodeCode(other ? other.label : otherId);
            }).slice(0, 5);

        const isEn = typeof window !== 'undefined' && window.currentLang === 'en';
        let coverageBadge = '';
        if (degree === 0) coverageBadge = `<span class="badge gap">${isEn ? 'Isolated — Gap Detected' : 'Terisolasi — Celah Terdeteksi'}</span>`;
        else if (degree <= 2) coverageBadge = `<span class="badge partial">${isEn ? 'Low Connectivity' : 'Konektivitas Rendah'}</span>`;
        else coverageBadge = `<span class="badge covered">${isEn ? 'High Connectivity · Hub Node' : 'Konektivitas Tinggi · Node Hub'}</span>`;

        const degreeLbl = isEn ? 'Connection Degree:' : 'Degree Koneksi:';
        const connectedLbl = isEn ? 'Connected to:' : 'Terhubung ke:';
        const othersLbl = isEn ? `...and ${degree - 5} others` : `...dan ${degree - 5} lainnya`;

        const kodeLbl = isEn ? 'Code' : 'Kode';
        return `
            <div style="font-size:0.78rem; margin-bottom:0.5rem; color:var(--primary); font-weight:700; letter-spacing:0.5px; text-transform:uppercase;">${_abbrInst(nodeData.group || 'Unknown')}</div>
            <div style="font-size:0.7rem; color:var(--text-4); margin-bottom:2px;">${kodeLbl}</div>
            <div style="font-size:0.78rem; color:var(--text-3); margin-bottom:0.75rem; line-height:1.4; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; word-break:break-all;">${nodeData.id}</div>
            ${coverageBadge}
            <div style="margin-top:0.75rem; padding-top:0.75rem; border-top:1px solid var(--border);">
                <div style="font-size:0.75rem; color:var(--text-3); margin-bottom:4px;">${degreeLbl} <strong style="color:var(--text-1);">${degree}</strong></div>
                ${connectedNodes.length > 0 ? `<div style="font-size:0.72rem; color:var(--text-3);">${connectedLbl}<br>${connectedNodes.map(n => `<span style="color:var(--primary);">• ${n}</span>`).join('<br>')}${degree > 5 ? `<br><span style="color:var(--text-4);">${othersLbl}</span>` : ''}</div>` : ''}
            </div>
        `;
    }

    // Lazy-load satu graph (panggil ulang loadAllNetworkGraphs jika graph belum ada)
    async function loadGraphById(graphId) {
        if (networkInstances[graphId]) return;  // sudah ada, skip
        // Cukup panggil loadAll, ia akan skip yang sudah ada
        await loadAllNetworkGraphs();
    }

    let isLoadingNetworkGraphs = false;
    // Declutter the dense similarity graphs: keep only each node's STRONGEST links
    // and drop nodes left with no relationship. The full graph stays available for
    // metrics/ranking/inspector ("kept in the database"); only the render is sparse.
    // Edge strength is parsed from the label (e.g. "…(Lemah 73.9%)" / "Sim 5.0%").
    const STRONGEST_K = { all: 2, intl: 2, natl: 3, cross: 2 };
    function pruneToStrongest(gd, modelId) {
        const K = STRONGEST_K[modelId];
        if (!K || !gd.edges || !gd.edges.length) return gd;        // incident/gap untouched
        const pctOf = e => { const m = /(\d+(?:\.\d+)?)\s*%/.exec(e.label || ''); return m ? parseFloat(m[1]) : 999; };
        const byNode = {};
        gd.edges.forEach(e => {
            const w = pctOf(e);
            (byNode[e.from] = byNode[e.from] || []).push({ e, w });
            (byNode[e.to] = byNode[e.to] || []).push({ e, w });
        });
        const eid = e => e.from + '|' + e.to + '|' + (e.label || '');
        const kept = new Map();
        Object.values(byNode).forEach(list => {        // each node keeps its K strongest (union)
            list.sort((a, b) => b.w - a.w);
            list.slice(0, K).forEach(({ e }) => kept.set(eid(e), e));
        });
        const edges = [...kept.values()];
        const used = new Set();
        edges.forEach(e => { used.add(e.from); used.add(e.to); });
        const nodes = gd.nodes.filter(n => used.has(n.id));
        return { nodes, edges };
    }

    async function loadAllNetworkGraphs() {
        if (isLoadingNetworkGraphs) return;
        isLoadingNetworkGraphs = true;
        await _ensureUiText();   // so editable-narrative file overrides apply on first paint
        const analyzers = [
            { id: 'all', graph: 'legal_graph.json', report: 'laporan_hasil_lna.md' },
            { id: 'intl', graph: 'intl_graph.json', report: 'laporan_khusus_internasional.md' },
            { id: 'natl', graph: 'natl_graph.json', report: 'laporan_khusus_nasional.md' },
            { id: 'cross', graph: 'cross_graph.json', report: 'laporan_khusus_transnasional.md' },
            // 'incident' now uses the radial (chord) view — renderRadialIncident()
            // 'gap' now uses the Warrant Mapping Matrix — renderGapMatrix()
        ];

        for (const model of analyzers) {
            try {
                const container = document.getElementById(`network-${model.id}`);
                if (!container) continue;
                // Jangan override height HTML — sudah 600px, biarkan apa adanya
                container.innerHTML = '<div style="color:#6366f1; text-align:center; padding-top:60px; font-family:Outfit; font-size:1.1rem; opacity:0.8;">⚡ Kalkulasi Gravitasi Jaringan...</div>';

                const res = await fetch(`./data/network/${model.graph}?v=${DATA_V}`);
                const rawData = await res.json();

                // Inject thematic edges for intl graph
                let graphData = rawData;
                if (model.id === 'intl') {
                    const existingIds = new Set(rawData.nodes.map(n => n.id));
                    const validThematicEdges = THEMATIC_INTL_EDGES.filter(
                        e => existingIds.has(e.from) && existingIds.has(e.to)
                    );
                    graphData = {
                        nodes: rawData.nodes,
                        edges: [...rawData.edges, ...validThematicEdges.map(e => ({
                            from: e.from, to: e.to,
                            label: e.theme,
                            arrows: 'to'
                        }))]
                    };
                }

                // Full graph kept for metrics/ranking/inspector; render only the
                // strongest links + connected nodes (declutters the hairball).
                const fullData = graphData;

                // The 4 regulation networks now render as an INTER-INSTRUMENT CHORD
                // (ribbon = #strong links between two instruments) instead of a force
                // hairball. Metrics/ranking still come from the full node-level graph.
                if (['all', 'intl', 'natl', 'cross'].includes(model.id)) {
                    if (model.id === 'intl') {  // keep thematic edges in the aggregate
                        const ex = new Set(rawData.nodes.map(n => n.id));
                        fullData.edges = [...rawData.edges, ...THEMATIC_INTL_EDGES
                            .filter(e => ex.has(e.from) && ex.has(e.to))
                            .map(e => ({ from: e.from, to: e.to, label: e.theme, arrows: 'to' }))];
                    }
                    populateMetricsTable(model.id, fullData);
                    populateRankingTable(model.id, fullData);
                    networkInstances[model.id] = { graphData: fullData, isChord: true };
                    await _ensureCitations();                 // citation layer = PRIMARY chord mode
                    renderInstrumentChord(model.id, fullData, 'citation');
                    continue;
                }

                graphData = pruneToStrongest(fullData, model.id);

                const palette = [
                    '#f43f5e', '#ec4899', '#a855f7', '#6366f1', '#3b82f6',
                    '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e',
                    '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444',
                    '#78716c', '#be123c', '#a21caf', '#6d28d9', '#1d4ed8'
                ];
                const uniqueGroups = [...new Set(graphData.nodes.map(n => n.group))];
                let visGroupsObj = {};
                let legendHtml = '';
                uniqueGroups.forEach((groupName, idx) => {
                    const color = palette[idx % palette.length];
                    visGroupsObj[groupName] = { color: { background: color, border: 'rgba(0,0,0,0.5)' } };
                    legendHtml += `<div style="display:inline-flex; align-items:center; background:var(--legend-chip); padding:3px 10px; border-radius:20px; font-size:11px;">
                                     <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${color}; margin-right:6px;"></span>
                                     <span style="color:var(--text-2);">${groupName === 'Insiden Kasus' ? groupName : _abbrInst(groupName)}</span>
                                   </div>`;
                });

                // Add thematic legend for intl
                if (model.id === 'intl') {
                    legendHtml += '<div style="width:100%; padding-top:8px; padding-bottom:2px; font-size:10px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Tema Koneksi:</div>';
                    for (const [theme, color] of Object.entries(THEME_COLORS)) {
                        legendHtml += `<div style="display:inline-flex; align-items:center; background:var(--legend-chip); padding:3px 10px; border-radius:20px; font-size:10px;">
                            <span style="display:inline-block; width:18px; height:2px; background:${color}; margin-right:6px; border-radius:2px;"></span>
                            <span style="color:var(--text-2);">${theme}</span>
                        </div>`;
                    }
                }

                const legendContainer = document.getElementById(`legend-${model.id}`);
                if (legendContainer && model.id !== 'cross') legendContainer.innerHTML = legendHtml;

                const nodes = new vis.DataSet(graphData.nodes.map(n => ({
                    id: n.id, label: n.label, group: n.group,
                    classification: n.classification,
                    value: n.value || 10,
                    title: nodeFull(n.label)
                })));

                const edges = new vis.DataSet(graphData.edges.map((e, i) => {
                    // getEdgeColorFromLabel returns a vis color OBJECT ({color, highlight[, opacity]})
                    const eColor = getEdgeColorFromLabel(e.label || '', model.id) || {};
                    const colorObj = Object.assign({}, eColor, {
                        opacity: eColor.opacity != null ? eColor.opacity : (model.id === 'cross' ? 0.55 : 0.3)
                    });
                    return {
                        id: 'e' + i,
                        from: e.from, to: e.to,
                        title: e.label || '',
                        label: '',
                        arrows: e.arrows || 'to',
                        // straight + translucent: thousands of opaque curves were unreadable
                        color: colorObj,
                        width: model.id === 'cross' ? 1.6 : 0.7,
                        smooth: false
                    };
                }));

                // Label reduction: labelling all ~800 nodes is the main readability
                // killer, so only label incident nodes + high-degree hubs. The rest
                // keep their tooltip (title) and reveal their label on zoom-in.
                const degMap = {};
                graphData.edges.forEach(e => { degMap[e.from] = (degMap[e.from] || 0) + 1; degMap[e.to] = (degMap[e.to] || 0) + 1; });
                const degSorted = Object.values(degMap).sort((a, b) => b - a);
                const hubCut = degSorted.length ? degSorted[Math.min(degSorted.length - 1, Math.floor(degSorted.length * 0.12))] : 1;
                const graphFont = (getComputedStyle(document.documentElement).getPropertyValue('--graph-font') || '#ffffff').trim();
                const graphStroke = (getComputedStyle(document.documentElement).getPropertyValue('--graph-stroke') || '#0f172a').trim();
                const isIncidentNode = n => n.group === 'Insiden Kasus' || String(n.classification || '').includes('Insiden');
                const labelFor = n => {
                    if (model.id === 'incident') {
                        // Bipartite incident↔law view: labelling all 45 incidents made an
                        // illegible pile-up. Label the LAW hubs only; incident names appear
                        // on hover (tooltip) and click (inspector), and via Katalog Insiden.
                        return (!isIncidentNode(n) && (degMap[n.id] || 0) >= 2) ? nodeCode(n.label) : undefined;
                    }
                    return (isIncidentNode(n) || (degMap[n.id] || 0) >= Math.max(hubCut, 4)) ? nodeCode(n.label) : undefined;
                };

                // Pre-assign circular positions so nodes are spread out
                // (prevents 0x0 canvas stacking bug when section is display:none)
                const N = graphData.nodes.length;
                const radius = Math.max(220, N * 1.4);
                const positionedNodeData = graphData.nodes.map((n, i) => {
                    const angle = (2 * Math.PI * i) / N;
                    const r = radius + (Math.random() - 0.5) * radius * 0.5;
                    return {
                        id: n.id, label: labelFor(n), group: n.group,
                        classification: n.classification,
                        value: n.value || 10,
                        title: nodeFull(n.label),
                        x: r * Math.cos(angle),
                        y: r * Math.sin(angle)
                    };
                });

                const netData = { nodes: new vis.DataSet(positionedNodeData), edges };
                const options = {
                    groups: visGroupsObj,
                    layout: {
                        improvedLayout: false,  // positions set manually via circular pre-assignment
                        randomSeed: 42
                    },
                    nodes: {
                        shape: 'dot',
                        // strokeWidth gives labels a halo so they stay legible where
                        // they overlap nodes/edges; smaller max stops hub labels ballooning.
                        font: { color: graphFont, face: 'Inter', size: 13, strokeWidth: 3, strokeColor: graphStroke },
                        borderWidth: 1.5,
                        scaling: {
                            label: {
                                enabled: true,
                                min: 10,
                                max: 16,
                                maxVisible: 200,
                                drawThreshold: 7   // hidden labels reappear as you zoom in
                            }
                        },
                        shadow: { enabled: false }
                    },
                    edges: {
                        smooth: false,            // straight lines read far better at this density
                        hoverWidth: 1.4,
                        selectionWidth: 2
                    },
                    physics: {
                        forceAtlas2Based: {
                            gravitationalConstant: -55,   // compact cluster so nodes stay legible at fit
                            centralGravity: 0.02,         // pull clusters toward centre (avoid microscopic fit)
                            springLength: 75,
                            springConstant: 0.06,
                            damping: 0.6,
                            avoidOverlap: 0.35
                        },
                        maxVelocity: 80,
                        minVelocity: 0.5,
                        solver: 'forceAtlas2Based',
                        timestep: 0.4,
                        stabilization: {
                            enabled: false  // Fix tab freeze: do not block UI thread; calculate asynchronously
                        }
                    },
                    interaction: {
                        hover: true,
                        tooltipDelay: 100,
                        zoomView: true,
                        zoomSpeed: 0.8,
                        dragView: true,
                        hideEdgesOnDrag: true,     // smoother panning on dense graphs
                        hideEdgesOnZoom: true,
                        navigationButtons: true,   // tombol +/- dan panah untuk zoom & pan
                        keyboard: { enabled: true, speed: { x: 10, y: 10, zoom: 0.02 } }
                    }
                };

                container.innerHTML = '';
                const network = new vis.Network(container, netData, options);

                // Store network & graph data for export and filtering.
                // Metrics/ranking use the FULL graph (the rendered one is sparse).
                networkInstances[model.id] = { network, graphData: fullData, netData };

                // Populate metrics directly since sync stabilization is disabled
                populateMetricsTable(model.id, fullData);
                populateRankingTable(model.id, fullData);

                // Let physics run for exactly 3 seconds to spread nodes out elegantly, 
                // then freeze them to stop CPU burn and prevent jitter
                setTimeout(() => {
                    network.setOptions({ physics: false });
                }, 3000);

                // ── FOCUS MODE ────────────────────────────────────────────
                // Click a node → dim everything except its direct neighbourhood;
                // click the background → restore. This is what makes a dense
                // hairball legible: you read one node's relations at a time.
                const _allIds = positionedNodeData.map(n => n.id);
                network.__focusOn = function (id) {
                    const keep = new Set([id]);
                    graphData.edges.forEach(e => { if (e.from === id) keep.add(e.to); if (e.to === id) keep.add(e.from); });
                    netData.nodes.update(_allIds.map(nid => ({ id: nid, opacity: keep.has(nid) ? 1 : 0.07 })));
                    netData.edges.update(graphData.edges.map((e, i) => ({ id: 'e' + i, hidden: !(e.from === id || e.to === id) })));
                };
                network.__focusClear = function () {
                    netData.nodes.update(_allIds.map(nid => ({ id: nid, opacity: 1 })));
                    netData.edges.update(graphData.edges.map((e, i) => ({ id: 'e' + i, hidden: false })));
                };
                network.on('click', function (p) {
                    if (p.nodes && p.nodes.length > 0) network.__focusOn(p.nodes[0]);
                    else network.__focusClear();
                });

                // Click-to-inspect panel
                const inspectorPanel = document.getElementById(`inspector-${model.id}`);
                const inspectorTitle = document.getElementById(`inspector-${model.id}-title`);
                const inspectorBody = document.getElementById(`inspector-${model.id}-body`);

                if (inspectorPanel && inspectorTitle && inspectorBody) {
                    network.on('click', function (params) {
                        if (params.nodes.length > 0) {
                            const nodeId = params.nodes[0];
                            const nodeData = graphData.nodes.find(n => n.id === nodeId);
                            if (nodeData) {
                                inspectorTitle.textContent = nodeFull(nodeData.label || nodeId);
                                // inspector shows the node's FULL relationships (incl. weak)
                                inspectorBody.innerHTML = buildNodeInspectorHTML(nodeData, fullData);
                                inspectorPanel.classList.add('visible');
                            }
                        } else {
                            inspectorPanel.classList.remove('visible');
                        }
                    });
                }

            } catch (err) {
                console.error(`Graph ${model.id} error:`, err);
                const container = document.getElementById(`network-${model.id}`);
                if (container) container.innerHTML = `<div style="color:#ef4444; padding:2rem; text-align:center;">
                    <span class="material-symbols-rounded" style="font-size:40px; display:block; margin-bottom:0.5rem;">error</span>
                    Gagal merender Graph: ${model.graph}<br>
                    <small style="color:#64748b;">Pastikan file JSON tersedia di ./data/network/</small>
                </div>`;
            }
        }
        try { renderCitationNetwork(); } catch (e) { console.warn('citation net', e); }
        isLoadingNetworkGraphs = false;
    }

    // ===================================================================
    // INCIDENT REGISTRY
    // ===================================================================
    async function loadIncidentRegistry() {
        try {
            const isEn = typeof window !== 'undefined' && window.currentLang === 'en';
            const suffix = isEn ? '_en' : '';
            const res = await fetch(`./data/incidents/indonesia_incidents${suffix}.json?v=${DATA_V}`);
            const json = await res.json();
            rawIncidentData = json.incidents;
            // LLM-judged relationship confidence (optional; degrade gracefully)
            try {
                const lc = await fetch(`./data/network/llm_edge_confidence.json?v=${DATA_V}`);
                if (lc.ok) llmConf = (await lc.json()).incidents || {};
            } catch (e) { llmConf = {}; }
            renderIncidentCards(rawIncidentData);
            if (typeof applyTranslations === 'function') setTimeout(applyTranslations, 100);
        } catch (e) {
            document.getElementById('incident-registry-container').innerHTML = '<div style="color:#ef4444; padding:15px;">Gagal memuat data insiden.</div>';
        }
    }

    function renderWarrantConfidence(incId, isEn) {
        // Convert the LLM's (relevant, judgment-confidence) into a single
        // P(relevant) so the % consistently means "confidence this IS a warrant".
        const w = (llmConf[incId] || [])
            .map(x => ({ ...x, p: x.relevant ? x.confidence : (100 - x.confidence) }))
            .sort((a, b) => b.p - a.p);
        if (!w.length) return '';
        const rel = w.filter(x => x.relevant).length;
        const roleCol = { pelaku: 'var(--rose)', pse: 'var(--sky)', konsumen: 'var(--emerald)', regulator: 'var(--violet)' };
        const chip = r => `<span style="font-size:0.58rem; font-weight:700; text-transform:uppercase; color:${roleCol[r] || 'var(--text-4)'}; border:1px solid ${roleCol[r] || 'var(--text-4)'}; border-radius:4px; padding:0 4px; margin-left:3px; white-space:nowrap;">${r}</span>`;
        const items = w.slice(0, 6).map(x => {
            const c = x.p;
            const col = c >= 70 ? 'var(--emerald)' : c >= 40 ? 'var(--amber)' : 'var(--text-4)';
            const lab = String(x.regulation_label).replace(/_/g, ' ').replace(/ - /g, ' · ');
            const labEsc = String(x.regulation_label).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const roleTags = (x.roles || []).map(chip).join('');
            return `<div style="display:flex; gap:7px; align-items:baseline; font-size:0.72rem; line-height:1.45;">
                        <span style="font-family:monospace; font-weight:700; color:${col}; min-width:36px; text-align:right;">${c}%</span>
                        <span onclick="showProvisionText('${labEsc}')" title="${isEn ? 'Read the full article text' : 'Baca bunyi pasal utuh'}" style="color:var(--text-3); cursor:pointer; text-decoration:underline dotted; text-underline-offset:2px;">${lab.slice(0, 54)} 📖</span>${roleTags}
                    </div>`;
        }).join('');
        return `<div class="ic-row" style="border-top:1px solid var(--border); padding-top:8px; flex-direction:column; align-items:stretch; gap:4px;">
                    <span style="font-size:0.72rem;">
                        <span class="material-symbols-rounded" style="font-size:13px; color:var(--violet); vertical-align:middle;">smart_toy</span>
                        <strong style="color:var(--violet);">${isEn ? 'AI-assessed warrants' : 'Warrant dinilai AI'}</strong>
                        <span style="color:var(--text-4);"> (Gemini · ${rel}/${w.length} ${isEn ? 'relevant' : 'relevan'}; ${isEn ? 'confidence' : 'keyakinan'})</span>
                    </span>
                    ${items}
                </div>`;
    }

    function renderSubjekHukum(inc, isEn) {
        const arr = inc.subjek_hukum || [];
        if (!arr.length) return '';
        const colors = { pelaku: 'var(--rose)', perpetrator: 'var(--rose)', 'primary actor': 'var(--rose)',
            pse: 'var(--sky)', 'operator (pse)': 'var(--sky)', 'operator / bank (pse)': 'var(--sky)',
            'platform / pse': 'var(--sky)', 'operator / institution': 'var(--sky)',
            konsumen: 'var(--emerald)', consumer: 'var(--emerald)', 'consumer / data subject': 'var(--emerald)',
            korban: 'var(--emerald)', victim: 'var(--emerald)', 'affected party / consumer': 'var(--emerald)',
            regulator: 'var(--violet)', 'regulator / state': 'var(--violet)' };
        const rows = arr.map(s => {
            const col = colors[String(s.peran).toLowerCase()] || 'var(--text-3)';
            const dasar = (s.dasar_hukum || []).join('; ');
            return `<div style="font-size:0.72rem; line-height:1.4; margin-bottom:4px;">
                        <span style="font-weight:700; color:${col}; text-transform:uppercase; font-size:0.66rem; letter-spacing:0.3px;">${s.peran}</span>
                        <span style="color:var(--text-2);"> · ${s.pihak}</span><br>
                        <span style="color:var(--text-4);">${s.posisi_hukum} — </span><span style="color:var(--text-3);">${dasar}</span>
                    </div>`;
        }).join('');
        return `<div class="ic-row" style="border-top:1px solid var(--border); padding-top:8px; flex-direction:column; align-items:stretch; gap:2px;">
                    <span style="font-size:0.72rem; margin-bottom:2px;">
                        <span class="material-symbols-rounded" style="font-size:13px; color:var(--text-2); vertical-align:middle;">groups</span>
                        <strong style="color:var(--text-1);">${isEn ? 'Legal subjects' : 'Subjek Hukum'}</strong>
                        <span style="color:var(--text-4);"> (${isEn ? 'who is bound, and by what' : 'siapa terikat, oleh apa'})</span>
                    </span>
                    ${rows}
                </div>`;
    }

    function renderIncidentCards(incidents) {
        const container = document.getElementById('incident-registry-container');
        if (!container) return;
        container.innerHTML = '';
        if (incidents.length === 0) {
            container.innerHTML = '<div style="color:var(--text-3); padding:15px;">Tidak ada insiden yang cocok dengan pencarian.</div>';
            return;
        }
        incidents.forEach(inc => {
            const typeBadges = {
                ransomware: '<span style="background:rgba(239,68,68,0.2);color:#ef4444;padding:2px 8px;border-radius:4px;font-size:11px;">Ransomware</span>',
                data_breach: '<span style="background:rgba(59,130,246,0.2);color:#3b82f6;padding:2px 8px;border-radius:4px;font-size:11px;">Data Breach</span>',
                ai_fraud: '<span style="background:rgba(168,85,247,0.2);color:#a855f7;padding:2px 8px;border-radius:4px;font-size:11px;">AI Fraud</span>',
                ai_misuse: '<span style="background:rgba(168,85,247,0.2);color:#a855f7;padding:2px 8px;border-radius:4px;font-size:11px;">AI Misuse</span>',
            };
            const typeBadge = typeBadges[inc.type] || '<span style="background:var(--overlay-hover);color:var(--text-2);padding:2px 8px;border-radius:4px;font-size:11px;">Other</span>';
            const srcArr = Array.isArray(inc.sources) ? inc.sources : [];
            const sourcesHtml = srcArr.length
                ? srcArr.map(s => `<a href="${s.url}" target="_blank" rel="noopener noreferrer" style="color:var(--primary); text-decoration:underline;" title="${String(s.title || '').replace(/"/g, '&quot;')}${s.date ? ' (' + s.date + ')' : ''}">${s.outlet || 'sumber'}</a>`).join(' · ')
                : '<span style="color:var(--text-4);">—</span>';
            const isEn = typeof window !== 'undefined' && window.currentLang === 'en';
            const L = isEn
                ? { pelaku: 'Perpetrator:', pse: 'Operator (PSE):', kualifikasi: 'Qualification:', nexus: 'Causal Nexus:', sumber: 'Source:' }
                : { pelaku: 'Pelaku:', pse: 'PSE:', kualifikasi: 'Kualifikasi:', nexus: 'Nexus Kausalitas:', sumber: 'Sumber:' };
            const confColor = inc.confidence === 'high' ? 'var(--emerald)' : 'var(--amber)';
            const confLabel = inc.confidence === 'high' ? (isEn ? 'High confidence' : 'Keyakinan tinggi') : (isEn ? 'Medium confidence' : 'Keyakinan sedang');
            container.innerHTML += `
                <div class="incident-card">
                    <div class="ic-top">
                        <span class="ic-id">[${inc.year}] ${inc.id.toUpperCase()}</span>
                        <div>${typeBadge}</div>
                    </div>
                    <div class="ic-body">${inc.peristiwa_hukum_kronologi}</div>
                    <div class="ic-meta">
                        <div class="ic-row">
                            <span class="material-symbols-rounded" style="color:var(--amber);">gavel</span>
                            <span><strong style="color:var(--text-3);">${L.kualifikasi}</strong> <span style="color:var(--text-2);">${inc.kualifikasi_peristiwa}</span></span>
                        </div>
                        <div class="ic-causal">
                            <strong>${L.nexus}</strong>
                            <span>${inc.pemetaan_fakta_hukum.nexus_kausalitas}</span>
                        </div>
                        ${renderSubjekHukum(inc, isEn)}
                        <div class="ic-row" style="border-top:1px solid var(--border); padding-top:8px;">
                            <span class="material-symbols-rounded" style="color:var(--primary);">link</span>
                            <span><strong style="color:var(--text-3);">${L.sumber}</strong> ${sourcesHtml}</span>
                        </div>
                        <div class="ic-row">
                            <span class="material-symbols-rounded" style="color:${confColor};">verified</span>
                            <span style="color:var(--text-4); font-size:0.72rem;">${confLabel}${inc.verification_note ? ' · ' + inc.verification_note : ''}</span>
                        </div>
                        ${renderWarrantConfidence(inc.id, isEn)}
                    </div>
                </div>`;
        });
        if (typeof applyTranslations === 'function') applyTranslations();
    }

    const searchInput = document.getElementById('search-incident');
    const typeSelect = document.getElementById('filter-incident-type');
    function applyIncidentFilters() {
        if (!searchInput) return;
        const q = searchInput.value.toLowerCase();
        const type = typeSelect.value;
        const filtered = rawIncidentData.filter(inc => {
            const matchSearch = inc.peristiwa_hukum_kronologi.toLowerCase().includes(q) ||
                inc.pemetaan_fakta_hukum.subjek_pse.toLowerCase().includes(q) ||
                inc.pemetaan_fakta_hukum.objek_hukum.toLowerCase().includes(q) ||
                inc.id.toLowerCase().includes(q);
            const matchType = type === 'all' ? true : inc.type === type;
            return matchSearch && matchType;
        });
        renderIncidentCards(filtered);
    }
    if (searchInput) searchInput.addEventListener('input', applyIncidentFilters);
    if (typeSelect) typeSelect.addEventListener('change', applyIncidentFilters);

    // ===================================================================
    // SECTOR ANALYSIS — EMPIRICAL coverage per sector (few-shot LLM judge)
    // Driven by data/network/sector_coverage.json (built by sector_coverage.py).
    // Replaces the former hand-set "Coverage Score" per sector, which was an
    // editorial number that did not even match the provisions it displayed.
    // Coverage = % of that sector's real incidents with >=1 applicable warrant,
    // disaggregated by legal subject. Judge validated at F1=0.83 on held-out
    // human gold (REVIEWER_RESPONSE §3.2).
    // ===================================================================

    const _covColor = p => (p < 30 ? '#f43f5e' : p < 60 ? '#f59e0b' : '#34d399');
    const _SECTOR_ICONBG = {
        government: 'linear-gradient(135deg,#1d4ed8,#2563eb)',
        finance: 'linear-gradient(135deg,#065f46,#10b981)',
        ecommerce_telco: 'linear-gradient(135deg,#0369a1,#0ea5e9)',
        health: 'linear-gradient(135deg,#be185d,#ec4899)',
        ai_misuse: 'linear-gradient(135deg,#7c3aed,#a855f7)',
        education: 'linear-gradient(135deg,#b45309,#f59e0b)',
        judicial: 'linear-gradient(135deg,#475569,#64748b)',
    };
    // Material Symbols (already loaded) instead of emoji — cleaner & consistent
    const _SECTOR_MICON = {
        government: 'account_balance', finance: 'account_balance_wallet',
        ecommerce_telco: 'shopping_cart', health: 'local_hospital',
        ai_misuse: 'smart_toy', education: 'school', judicial: 'gavel',
    };

    // Recompute sector coverage from the SAME candidates + human overrides as the
    // radial, so the Sector tab reflects your in-browser review live (consistent).
    async function _sectorLiveRecompute(staticData) {
        if (!RADIAL.cands) {
            try { const r = await fetch(`./data/network/llm_edge_confidence.json?v=${DATA_V}`); RADIAL.cands = (await r.json()).incidents || {}; }
            catch (e) { return staticData; }   // fall back to static if candidates unavailable
        }
        const cands = RADIAL.cands;
        const out = Object.assign({}, staticData, { reviewed: _revCount(), live: true });
        out.sectors = staticData.sectors.map(s => {
            const ids = s.incident_ids || [];
            const n = ids.length || 1;
            let any = 0; const rc = { pelaku: 0, pse: 0, konsumen: 0, regulator: 0 }; const warr = {};
            ids.forEach(iid => {
                const rel = (cands[iid] || []).map(r => ({ e: _eff(iid, r), r })).filter(x => x.e.relevant);
                if (rel.length) any++;
                _ROLE_KEYS.forEach(role => { if (rel.some(x => (x.e.roles || []).includes(role))) rc[role]++; });
                rel.forEach(x => { warr[x.r.regulation_label] = (warr[x.r.regulation_label] || 0) + 1; });
            });
            const per_role = {}; _ROLE_KEYS.forEach(role => per_role[role] = { coverage_pct: Math.round(1000 * rc[role] / n) / 10, incidents_covered: rc[role] });
            const weakest = _ROLE_KEYS.reduce((a, b) => rc[b] < rc[a] ? b : a);
            const top = Object.entries(warr).sort((a, b) => b[1] - a[1]).slice(0, 6).map(([label, count]) => ({ label, count }));
            return Object.assign({}, s, {
                coverage_pct: Math.round(1000 * any / n) / 10, covered: any,
                per_role, weakest_role: weakest, weakest_pct: per_role[weakest].coverage_pct, top_warrants: top,
            });
        });
        return out;
    }

    // ── SECTOR COVERAGE MANUAL OVERRIDE (localStorage) ──
    function _sectorOverrideGet(key) {
        try { const v = localStorage.getItem(key); return v !== null ? parseFloat(v) : null; } catch (e) { return null; }
    }
    function _sectorOverrideSet(key, val) {
        try { localStorage.setItem(key, String(val)); } catch (e) {}
    }
    function _sectorOverrideDel(key) {
        try { localStorage.removeItem(key); } catch (e) {}
    }
    // Inline edit popup for a coverage percentage
    window._sectorEditPct = function (sKey, role, ovKey, computedPct) {
        const isEn = window.currentLang === 'en';
        const cur = _sectorOverrideGet(ovKey);
        const val = cur !== null ? cur : computedPct;
        // Create inline edit popup
        const existing = document.getElementById('sector-edit-popup');
        if (existing) existing.remove();
        const gaugeRow = document.getElementById(`gauge-${sKey}-${role}`);
        if (!gaugeRow) return;
        const pctSpan = gaugeRow.querySelector('.gauge-pct');
        if (!pctSpan) return;
        const popup = document.createElement('div');
        popup.id = 'sector-edit-popup';
        popup.style.cssText = 'position:fixed;z-index:10000;background:var(--card,#fff);border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.18);padding:14px 16px;min-width:220px;';
        // Position near the pctSpan
        const rect = pctSpan.getBoundingClientRect();
        popup.style.top = (rect.bottom + 6) + 'px';
        popup.style.right = (window.innerWidth - rect.right) + 'px';
        const RL = window.sectorCoverageData && window.sectorCoverageData.role_label || {};
        const roleLbl = RL[role] ? (isEn ? RL[role].en : RL[role].id) : role;
        popup.innerHTML = `
            <div style="font-size:0.78rem;font-weight:700;color:var(--text-1);margin-bottom:8px;">${isEn ? 'Edit Coverage' : 'Edit Coverage'}: ${roleLbl}</div>
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px;">
                <input id="sector-edit-input" type="number" min="0" max="100" step="0.1" value="${val}"
                    style="width:80px;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:var(--sunken);color:var(--text-1);font-size:0.9rem;font-weight:700;text-align:right;">
                <span style="font-size:0.85rem;color:var(--text-3);">%</span>
            </div>
            <div style="font-size:0.68rem;color:var(--text-4);margin-bottom:10px;">${isEn ? 'Computed: ' : 'Hitung otomatis: '}<b>${computedPct}%</b></div>
            <div style="display:flex;gap:8px;">
                <button onclick="_sectorSaveEdit('${sKey}','${role}','${ovKey}')" style="flex:1;padding:6px 10px;border:none;border-radius:6px;background:var(--primary);color:#fff;font-size:0.78rem;font-weight:600;cursor:pointer;">${isEn ? 'Save' : 'Simpan'}</button>
                ${cur !== null ? `<button onclick="_sectorResetEdit('${sKey}','${role}','${ovKey}',${computedPct})" style="flex:1;padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:transparent;color:var(--text-3);font-size:0.78rem;cursor:pointer;">${isEn ? 'Reset' : 'Reset'}</button>` : ''}
                <button onclick="document.getElementById('sector-edit-popup').remove()" style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;background:transparent;color:var(--text-3);font-size:0.78rem;cursor:pointer;">✕</button>
            </div>`;
        document.body.appendChild(popup);
        const inp = document.getElementById('sector-edit-input');
        if (inp) { inp.focus(); inp.select(); }
        // Close on click outside
        setTimeout(() => {
            const closer = (ev) => {
                if (!popup.contains(ev.target) && ev.target !== pctSpan) {
                    popup.remove();
                    document.removeEventListener('mousedown', closer);
                }
            };
            document.addEventListener('mousedown', closer);
        }, 100);
    };
    window._sectorSaveEdit = function (sKey, role, ovKey) {
        const inp = document.getElementById('sector-edit-input');
        if (!inp) return;
        let v = parseFloat(inp.value);
        if (isNaN(v)) v = 0;
        v = Math.max(0, Math.min(100, Math.round(v * 10) / 10));
        _sectorOverrideSet(ovKey, v);
        _sectorUpdateGauge(sKey, role, ovKey, v, true);
        const popup = document.getElementById('sector-edit-popup');
        if (popup) popup.remove();
        _toast((window.currentLang === 'en' ? 'Saved: ' : 'Tersimpan: ') + v + '%');
    };
    window._sectorResetEdit = function (sKey, role, ovKey, computedPct) {
        _sectorOverrideDel(ovKey);
        _sectorUpdateGauge(sKey, role, ovKey, computedPct, false);
        const popup = document.getElementById('sector-edit-popup');
        if (popup) popup.remove();
        _toast(window.currentLang === 'en' ? 'Reset to computed value' : 'Direset ke nilai hitung otomatis');
    };
    function _sectorUpdateGauge(sKey, role, ovKey, pct, isOverridden) {
        const row = document.getElementById(`gauge-${sKey}-${role}`);
        if (!row) return;
        const fill = row.querySelector('.gauge-fill');
        const pctSpan = row.querySelector('.gauge-pct');
        if (fill) { fill.style.width = pct + '%'; fill.style.background = _covColor(pct); }
        if (pctSpan) {
            const isEn = window.currentLang === 'en';
            pctSpan.style.color = _covColor(pct);
            pctSpan.innerHTML = `${pct}%${isOverridden ? '<span style="font-size:8px;color:var(--primary);margin-left:2px;">✎</span>' : ''}`;
        }
    }
    // ── EXPORT sector overrides → JSON file ──
    window.exportSectorOverrides = function () {
        const PREFIX = 'lna_sector_override_';
        const out = { _README: 'Manual sector coverage overrides. Letakkan di data/network/sector_coverage_overrides.json lalu deploy.', overrides: {} };
        let count = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.startsWith(PREFIX)) {
                const v = parseFloat(localStorage.getItem(k));
                if (!isNaN(v)) {
                    // key format: lna_sector_override_{sector}_{role}
                    const parts = k.slice(PREFIX.length);
                    out.overrides[parts] = v;
                    count++;
                }
            }
        }
        if (count === 0) { _toast(window.currentLang === 'en' ? 'No overrides to export.' : 'Tidak ada override untuk diekspor.'); return; }
        _downloadBlob(JSON.stringify(out, null, 2), 'sector_coverage_overrides.json', 'application/json');
        _toast((window.currentLang === 'en' ? 'Exported ' : 'Diekspor ') + count + ' override → sector_coverage_overrides.json');
    };
    // ── IMPORT sector overrides from JSON file ──
    window.importSectorOverrides = function () {
        const inp = document.createElement('input');
        inp.type = 'file'; inp.accept = '.json';
        inp.onchange = async () => {
            const file = inp.files[0]; if (!file) return;
            try {
                const text = await file.text();
                const data = JSON.parse(text);
                const ovs = data.overrides || data;
                let count = 0;
                Object.entries(ovs).forEach(([k, v]) => {
                    if (k.startsWith('_')) return; // skip _README etc
                    const numV = parseFloat(v);
                    if (!isNaN(numV)) {
                        _sectorOverrideSet('lna_sector_override_' + k, numV);
                        count++;
                    }
                });
                _toast((window.currentLang === 'en' ? 'Imported ' : 'Diimpor ') + count + ' override. Reload tab untuk melihat.');
            } catch (e) { _toast('Error: ' + e.message); }
        };
        inp.click();
    };
    // ── AUTO-LOAD overrides from data/network/sector_coverage_overrides.json ──
    (async function _autoLoadSectorOverrides() {
        try {
            const r = await fetch(`./data/network/sector_coverage_overrides.json?v=${DATA_V}`, { cache: 'no-store' });
            if (!r.ok) return;
            const data = await r.json();
            const ovs = data.overrides || data;
            Object.entries(ovs).forEach(([k, v]) => {
                if (k.startsWith('_')) return;
                const lsKey = 'lna_sector_override_' + k;
                // Only load from file if user hasn't set their own localStorage override
                if (_sectorOverrideGet(lsKey) === null) {
                    const numV = parseFloat(v);
                    if (!isNaN(numV)) _sectorOverrideSet(lsKey, numV);
                }
            });
        } catch (e) { /* file doesn't exist yet — OK */ }
    })();

    async function initSectorAnalysis() {
        const container = document.getElementById('sector-grid-container');
        if (!container || container.dataset.rendered === 'true') return;
        const isEn = (typeof window !== 'undefined' && window.currentLang === 'en');
        const L = (id, en) => (isEn ? en : id);

        if (!window.sectorCoverageData) {
            try {
                const res = await fetch(`./data/network/sector_coverage.json?v=${DATA_V}`);
                window.sectorCoverageData = await res.json();
            } catch (e) {
                container.innerHTML = `<div class="muted" style="padding:16px;">${L('Data sektor gagal dimuat.', 'Failed to load sector data.')}</div>`;
                return;
            }
        }
        // Recompute LIVE from the same candidates + human overrides as the radial,
        // so the sector tab stays consistent with your review (not a stale snapshot).
        const data = await _sectorLiveRecompute(window.sectorCoverageData);
        const nrev = _revCount();
        container.innerHTML = `<div style="grid-column:1/-1;font-size:0.78rem;color:var(--text-3);background:var(--sunken);border:1px solid var(--border);border-radius:10px;padding:10px 14px;line-height:1.55;">${L(
            '<b>Cara baca:</b> setiap kartu = SATU sektor; "Coverage" = porsi insiden <i>sektor itu</i> yang punya ≥1 dasar hukum untuk subjek tsb (judge peran-ketat: notifikasi ≠ ganti rugi). Jangkar keseluruhan 45 insiden: pelaku 86,7% · PSE 75,6% · konsumen 77,8% · regulator 48,9%. <b>Relevansi tervalidasi telaah manusia</b> (warrant-operatif κ 0.94), tapi <b>penetapan peran masih usulan LLM</b> (indikatif) sampai Anda tinjau di tab <b>Analisis Kasus</b>. Angka di sini <b>ikut tinjauan Anda secara langsung</b> (kini ' + nrev + ' warrant ditinjau); klik <b>Export Tinjauan</b> di sana lalu rebuild agar permanen. Gap nyata: <b>basis pengawasan regulator terendah</b> (paling tajam di Penyalahgunaan AI).',
            '<b>How to read:</b> each card = ONE sector; "Coverage" = share of <i>that sector\'s</i> incidents with ≥1 legal basis for the subject (strict-role judge: notification ≠ redress). Overall anchor across all 45 incidents: perpetrator 86.7% · PSE 75.6% · consumer 77.8% · regulator 48.9%. <b>Relevance is validated against expert final review</b> (operative-warrant κ 0.94), but the <b>role assignment is still an LLM proposal</b> (indicative) until you review it in the <b>Analisis Kasus</b> tab. These figures <b>follow your review live</b> (currently ' + nrev + ' warrants reviewed); click <b>Export Tinjauan</b> there then rebuild to persist. Real gap: <b>regulator/supervision basis lowest</b> (sharpest in AI Misuse).')
            }</div>`;
        container.dataset.rendered = 'true';
        const RL = data.role_label || window.sectorCoverageData.role_label || {};
        const SLBL = 'font-size:11px;font-weight:700;color:var(--text-muted,#94a3b8);margin:12px 0 4px;padding:0 1.25rem;text-transform:uppercase;letter-spacing:.04em;';

        data.sectors.forEach(s => {
            const title = isEn ? s.title_en : s.title_id;
            const cov = s.coverage_pct;
            const covColor = _covColor(cov);
            const borderColor = cov < 30 ? 'rgba(251,113,133,0.25)' : cov < 60 ? 'rgba(251,191,36,0.25)' : 'rgba(52,211,153,0.25)';

            const sKey = s.key;
            const roleRows = Object.keys(RL).map(r => {
                const computedPct = s.per_role[r] ? s.per_role[r].coverage_pct : 0;
                const ovKey = `lna_sector_override_${sKey}_${r}`;
                const override = _sectorOverrideGet(ovKey);
                const pct = override !== null ? override : computedPct;
                const lbl = isEn ? RL[r].en : RL[r].id;
                const isOverridden = override !== null;
                return `
                    <div class="gauge-row" id="gauge-${sKey}-${r}">
                        <span class="gauge-label" style="min-width:min(130px,34vw);">${lbl}</span>
                        <div class="gauge-bar"><div class="gauge-fill" style="width:${pct}%;background:${_covColor(pct)};"></div></div>
                        <span class="gauge-pct" style="color:${_covColor(pct)};cursor:pointer;position:relative;" title="${isEn ? 'Click to edit manually' : 'Klik untuk edit manual'}" onclick="_sectorEditPct('${sKey}','${r}','${ovKey}',${computedPct})">${pct}%${isOverridden ? '<span style="font-size:8px;color:var(--primary);margin-left:2px;">✎</span>' : ''}</span>
                    </div>`;
            }).join('');

            const warrantsHTML = (s.top_warrants && s.top_warrants.length)
                ? s.top_warrants.map(w => {
                    const labEsc = String(w.label).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
                    return `
                    <div class="pasal-item">
                        <div class="p-dot covered"></div>
                        <div><span class="p-name" onclick="showProvisionText('${labEsc}')" title="${L('Baca bunyi pasal utuh', 'Read full article text')}" style="cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px;">${w.label.replace(/_/g, ' ')} 📖</span>
                        <span class="p-desc">${L('dasar hukum di', 'cited in')} ${w.count} ${L('insiden', 'incident(s)')}</span></div>
                    </div>`; }).join('')
                : `<div class="pasal-item"><div class="p-dot gap"></div><div><span class="p-desc">${L('Tidak ada dasar hukum teridentifikasi.', 'No legal basis identified.')}</span></div></div>`;

            const weakLbl = (RL[s.weakest_role] ? (isEn ? RL[s.weakest_role].en : RL[s.weakest_role].id) : s.weakest_role);
            // Only call it a "gap" when the weakest subject is actually below 100%.
            // (Bug fix: when every subject is 100% there is NO gap — don't mislabel one.)
            const gapBadge = (s.weakest_pct >= 100)
                ? `<span class="badge covered">✓ ${L('Semua subjek terjangkau', 'All subjects covered')}</span>`
                : `<span class="badge gap">✕ ${L('terlemah', 'weakest')}: ${weakLbl} (${s.weakest_pct}%)</span>`;

            container.innerHTML += `
                <div class="sector-card" style="border-color:${borderColor};">
                    <div class="sc-header">
                        <div class="sc-icon" style="background:${_SECTOR_ICONBG[s.key] || 'linear-gradient(135deg,#475569,#64748b)'};"><span class="material-symbols-rounded" style="font-size:22px;color:#fff;">${_SECTOR_MICON[s.key] || 'category'}</span></div>
                        <div>
                            <div class="sc-title">${title}</div>
                            <div class="sc-sub">${s.n_incidents} ${L('insiden riil · coverage empiris (few-shot)', 'real incidents · empirical coverage (few-shot)')}</div>
                        </div>
                    </div>
                    <div class="gauge-row">
                        <span class="gauge-label" style="min-width:min(130px,34vw);">${L('Ada dasar hukum', 'Has any warrant')}</span>
                        <div class="gauge-bar"><div class="gauge-fill" style="width:${cov}%;background:${covColor};"></div></div>
                        <span class="gauge-pct" style="color:${covColor};">${cov}%</span>
                    </div>
                    <div class="sc-badge-row">
                        <span class="badge covered">✓ ${s.covered}/${s.n_incidents} ${L('terjangkau', 'covered')}</span>
                        ${gapBadge}
                    </div>
                    ${s.n_incidents < 3 ? `<div style="font-size:11px;color:#f59e0b;margin-top:6px;">${L('⚠ Sampel kecil (n&lt;3) — angka indikatif, bukan estimasi populasi.', '⚠ Small sample (n&lt;3) — indicative, not a population estimate.')}</div>` : ''}
                    <div style="${SLBL}">${L('Coverage per subjek hukum', 'Coverage per legal subject')}</div>
                    ${roleRows}
                    <div style="${SLBL}">${L('Pemetaan Regulasi (dasar hukum terbanyak)', 'Regulation Mapping (most-cited warrants)')}</div>
                    <div class="pasal-list">${warrantsHTML}</div>
                </div>`;
        });
        if (typeof applyTranslations === 'function') applyTranslations();
    }


    // ===================================================================
    // RADIAL (CHORD) Insiden↔Regulasi  — replaces the force graph for §incident
    // ===================================================================
    const RADIAL = { data: null, sel: null, nav: 0, bindingOnly: false, pos: {}, byId: {}, rendered: false, cands: null };

    // ── HUMAN REVIEW STORE (localStorage; exported to warrant_overrides.json) ──
    const REV_KEY = 'lna_warrant_review_v1';
    const _revAll = () => { try { return JSON.parse(localStorage.getItem(REV_KEY)) || {}; } catch (e) { return {}; } };
    const _revSave = o => { try { localStorage.setItem(REV_KEY, JSON.stringify(o)); } catch (e) {} };
    const _revK = (iid, label) => iid + ' | ' + label;
    const _revGet = (iid, label) => _revAll()[_revK(iid, label)] || null;
    const _revCount = () => Object.keys(_revAll()).length;
    function _revSet(iid, label, patch) {
        const a = _revAll(); a[_revK(iid, label)] = Object.assign({ reviewer: '', ts: 0 }, a[_revK(iid, label)] || {}, patch, { ts: 1 });
        _revSave(a);
    }
    function _revDel(iid, label) { const a = _revAll(); delete a[_revK(iid, label)]; _revSave(a); }
    // effective warrant = human override (if any) over the LLM row
    function _eff(iid, r) {
        const ov = _revGet(iid, r.regulation_label);
        if (!ov) return { relevant: !!r.relevant, roles: r.roles || [], reviewed: false };
        return { relevant: ov.relevant != null ? !!ov.relevant : !!r.relevant, roles: ov.roles || r.roles || [], reviewed: true };
    }
    window.exportWarrantOverrides = function () {
        const a = _revAll(); const out = { '_README': 'Keputusan manusia (human-in-the-loop) hasil ekspor dashboard. Letakkan di data/network/warrant_overrides.json lalu jalankan: python role_coverage.py && python sector_coverage.py && python build_radial_incident.py — lalu deploy.' };
        Object.keys(a).forEach(k => { const v = a[k]; out[k] = { relevant: !!v.relevant, roles: v.roles || [], note: v.note || '', reviewer: v.reviewer || '' }; });
        _downloadBlob(JSON.stringify(out, null, 2), 'warrant_overrides.json', 'application/json');
        _toast((window.currentLang === 'en' ? 'Exported ' : 'Diekspor ') + _revCount() + ' review → warrant_overrides.json');
    };

    // ── Candidate-error detector: flag warrants whose role contradicts the
    // provision's legal character (mirror of flag_review_candidates.py), live. ──
    const _REVIEW_EXPECT = {
        'UU_PDP_No27_2022 - Pasal 65': ['pelaku'], 'UU_PDP_No27_2022 - Pasal 66': ['pelaku'],
        'UU_PDP_No27_2022 - Pasal 67': ['pelaku'], 'UU_PDP_No27_2022 - Pasal 68': ['pelaku'],
        'UU_PDP_No27_2022 - Pasal 20': ['pse'], 'UU_PDP_No27_2022 - Pasal 35': ['pse'],
        'UU_PDP_No27_2022 - Pasal 36': ['pse'], 'UU_PDP_No27_2022 - Pasal 46': ['pse'],
        'PP_PSTE_No71_2019 - Pasal 14': ['pse'],
        'UU_PDP_No27_2022 - Pasal 57': ['regulator'], 'UU_PDP_No27_2022 - Pasal 60': ['regulator'],
        'UU_PDP_No27_2022 - Pasal 12': ['konsumen'],
        'UU_ITE_No19_2016 - Pasal 26': ['pse', 'konsumen'],
        'UU_ITE_No1_2024 - Pasal 27': ['pelaku'], 'UU_ITE_No1_2024 - Pasal 28': ['pelaku'],
        'UU_ITE_No1_2024 - Pasal 45A': ['pelaku'], 'UU_ITE_No1_2024 - Pasal 45B': ['pelaku'],
        // audit 2026-07-18: Pasal 70 (dulu kunci OCR '7O') = pidana korporasi; Pasal 33 = kewajiban Pengendali
        'UU_PDP_No27_2022 - Pasal 70': ['pelaku'],
        'UU_PDP_No27_2022 - Pasal 33': ['pse'],
    };
    // Hak Subjek Data Pribadi (UU PDP Ps. 5,6,8,9,10,11,13). Token OCR '6O'/'7O' dibuang
    // (6O=Penjelasan Ps.60, 7O=Ps.70 pidana korporasi) & Ps.33 dibuang (kewajiban Pengendali,
    // bukan hak) — lihat AUDIT_FIXES_TRACKER.md id=35. Peran Ps.70/33 dilengkapi saat reparasi OCR.
    const _REVIEW_RIGHTS = new Set(['5', '6', '8', '9', '10', '11', '13'].map(n => `UU_PDP_No27_2022 - Pasal ${n}`));
    const _REVIEW_SOFT = /Stranas|SE_Komdigi|OECD|UNESCO|ASEAN|UNGA|ISO|WHO|G7|Global_Digital/i;
    // Kunci 'Penjelasan Pasal 10/60' = hasil rename label OCR '1O'/'6O' (fix_ocr_labels.py)
    const _REVIEW_DEF = new Set(['UU_PDP_No27_2022 - Penjelasan Pasal 10', 'UU_PDP_No27_2022 - Penjelasan Pasal 60', 'UU_PDP_No27_2022 - Pasal 4']);
    function _expectRoles(label) {
        if (_REVIEW_EXPECT[label]) return _REVIEW_EXPECT[label];
        if (_REVIEW_RIGHTS.has(label)) return ['konsumen'];
        if (_REVIEW_DEF.has(label) || _REVIEW_SOFT.test(label)) return [];   // should NOT be a binding warrant
        return null;                                                          // no opinion
    }
    function _reviewCandidates() {
        const out = []; const cands = RADIAL.cands || {};
        for (const iid in cands) {
            for (const r of cands[iid]) {
                const eff = _eff(iid, r);
                if (!eff.relevant || eff.reviewed) continue;
                const exp = _expectRoles(r.regulation_label);
                if (exp === null) continue;
                const roles = eff.roles || [];
                if (exp.length === 0) {
                    out.push({ iid, label: r.regulation_label, roles, sev: 2, why: (window.currentLang === 'en' ? 'soft-law/definitional — not a binding basis' : 'soft-law/definitif — bukan dasar hukum mengikat') });
                } else {
                    const wrong = roles.filter(x => !exp.includes(x));
                    if (wrong.length) out.push({ iid, label: r.regulation_label, roles, sev: roles.some(x => exp.includes(x)) ? 1 : 2, why: (window.currentLang === 'en' ? `role ${wrong.join('/')} unexpected; expected ${exp.join('/')}` : `peran ${wrong.join('/')} tak lazim; seharusnya ${exp.join('/')}`) });
                }
            }
        }
        out.sort((a, b) => b.sev - a.sev);
        return out;
    }
    window.reviewCandidateCount = () => _reviewCandidates().length;
    window.showReviewCandidates = function () {
        const isEn = window.currentLang === 'en';
        const list = _reviewCandidates();
        const old = document.getElementById('candmodal'); if (old) old.remove();
        const m = document.createElement('div');
        m.id = 'candmodal';
        m.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:24px;';
        const rows = list.map(c => {
            const inc = (RADIAL.byId['CASE_' + c.iid] || {}).code || c.iid;
            const sevc = c.sev >= 2 ? '#ef4444' : '#f59e0b';
            return `<div onclick="_gotoCandidate('${String(c.iid).replace(/'/g, "\\'")}')" style="cursor:pointer;border-bottom:1px solid var(--border);padding:9px 4px;">
                <div style="display:flex;justify-content:space-between;gap:8px;"><b style="font-size:0.82rem;color:var(--text-1);">${_rEsc(inc)}</b><span style="font-size:0.7rem;color:${sevc};">${c.sev >= 2 ? '●●' : '●'}</span></div>
                <div style="font-size:0.78rem;color:var(--primary);">${_rEsc(nodeCode(c.label))} <span style="color:var(--text-4);">[${(c.roles || []).join('/') || '—'}]</span></div>
                <div style="font-size:0.73rem;color:var(--text-3);">${_rEsc(c.why)}</div></div>`;
        }).join('') || `<div class="rp-empty" style="padding:1.5rem 0;">${isEn ? 'No suspicious warrants 🎉' : 'Tidak ada warrant mencurigakan 🎉'}</div>`;
        m.innerHTML = `<div style="background:var(--bg-card);max-width:620px;width:100%;max-height:82vh;overflow:auto;border-radius:14px;border:1px solid var(--border);box-shadow:0 24px 60px rgba(0,0,0,0.45);padding:1.3rem 1.5rem;">
            <div style="display:flex;justify-content:space-between;align-items:center;"><div class="rp-title" style="font-size:1.1rem;">${isEn ? 'Likely-wrong warrants' : 'Kandidat error warrant'} (${list.length})</div>
              <button onclick="document.getElementById('candmodal').remove()" style="border:none;background:var(--overlay-soft);width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:16px;color:var(--text-2);">✕</button></div>
            <div style="font-size:0.75rem;color:var(--text-4);margin:4px 0 10px;line-height:1.5;">${isEn ? 'Role contradicts the provision’s legal character (●● = no expected role matches; ● = partial). Click a row to open & fix it. Resolved ones drop off.' : 'Peran bertentangan dgn karakter pasal (●● = tak ada peran yang cocok; ● = sebagian). Klik baris untuk buka & perbaiki. Yang sudah ditinjau hilang dari daftar.'}</div>
            ${rows}</div>`;
        m.onclick = ev => { if (ev.target === m) m.remove(); };
        document.body.appendChild(m);
    };
    window._gotoCandidate = function (iid) {
        const m = document.getElementById('candmodal'); if (m) m.remove();
        const navItem = document.querySelector('.nav-item[data-target="section-incident"]');
        if (navItem) (navItem.querySelector('a') || navItem).click();
        setTimeout(() => _radialSelect('CASE_' + iid), 400);
    };
    const RVB = 820, RCX = 410, RCY = 410, RR = 235, RBAR = 40, RLAB = RR + RBAR + 10;
    const ROLE_META = {
        pelaku:   { c: '#ef4444', id: 'Pelaku (pidana)',  en: 'Perpetrator' },
        pse:      { c: '#6366f1', id: 'Operator/PSE',      en: 'Operator/PSE' },
        konsumen: { c: '#f59e0b', id: 'Konsumen/korban',   en: 'Consumer' },
        regulator:{ c: '#10b981', id: 'Regulator/negara',  en: 'Regulator' },
    };
    const RPAL = ['#ef4444','#ec4899','#a855f7','#6366f1','#3b82f6','#0ea5e9','#14b8a6','#10b981','#84cc16','#eab308','#f59e0b','#f97316','#78716c','#be123c','#6d28d9'];
    let RGROUPC = {};
    const _rGroupColor = g => RGROUPC[g] || '#94a3b8';
    const _rRoleColor = roles => (roles && roles.length && ROLE_META[roles[0]]) ? ROLE_META[roles[0]].c : '#94a3b8';
    const _rPt = order => {
        const n = RADIAL.data.nodes.length;
        const a = (-90 + 360 * order / n) * Math.PI / 180;
        return { x: RCX + RR * Math.cos(a), y: RCY + RR * Math.sin(a), a: -90 + 360 * order / n };
    };
    const _rEsc = s => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

    async function renderRadialIncident() {
        const svgBox = document.getElementById('radial-incident-svg');
        if (!svgBox || RADIAL.rendered) return;
        if (!RADIAL.data) {
            try {
                const res = await fetch(`./data/network/radial_incident.json?v=${DATA_V}`);
                RADIAL.data = await res.json();
            } catch (e) { svgBox.innerHTML = '<div class="rp-empty">Gagal memuat data radial.</div>'; return; }
        }
        if (!RADIAL.cands) {   // full candidate warrants per incident (for human review)
            try {
                const r2 = await fetch(`./data/network/llm_edge_confidence.json?v=${DATA_V}`);
                RADIAL.cands = (await r2.json()).incidents || {};
            } catch (e) { RADIAL.cands = {}; }
        }
        const d = RADIAL.data;
        RADIAL.byId = {}; d.nodes.forEach(n => RADIAL.byId[n.id] = n);
        const groups = [...new Set(d.nodes.map(n => n.group))].sort();
        RGROUPC = {}; groups.forEach((g, i) => RGROUPC[g] = RPAL[i % RPAL.length]);
        RADIAL.pos = {}; d.nodes.forEach(n => RADIAL.pos[n.id] = _rPt(n.order));
        const maxDeg = Math.max(1, ...d.nodes.map(n => n.degree));

        // chords
        let chords = '';
        d.edges.forEach((e, i) => {
            const a = RADIAL.pos[e.source], b = RADIAL.pos[e.target];
            if (!a || !b) return;
            const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
            const ctlx = mx + (RCX - mx) * 0.7, ctly = my + (RCY - my) * 0.7;
            chords += `<path class="rchord" data-s="${e.source}" data-t="${e.target}" data-i="${i}" `
                + `d="M${a.x.toFixed(1)},${a.y.toFixed(1)} Q${ctlx.toFixed(1)},${ctly.toFixed(1)} ${b.x.toFixed(1)},${b.y.toFixed(1)}" `
                + `fill="none" stroke="${_rRoleColor(e.roles)}" stroke-width="1" stroke-opacity="0.32"/>`;
        });

        // nodes (dot + outer bar + reg labels)
        let marks = '';
        d.nodes.forEach(n => {
            const p = RADIAL.pos[n.id], col = _rGroupColor(n.group);
            const isReg = n.type === 'regulation';
            const rad = isReg ? Math.min(8, 3 + n.degree * 0.5) : 3.2;
            const barLen = (n.degree / maxDeg) * RBAR;
            const ux = Math.cos(p.a * Math.PI / 180), uy = Math.sin(p.a * Math.PI / 180);
            const bx2 = RCX + (RR + 4 + barLen) * ux, by2 = RCY + (RR + 4 + barLen) * uy;
            const bx1 = RCX + (RR + 4) * ux, by1 = RCY + (RR + 4) * uy;
            let lbl = '';
            if (isReg) {
                const flip = (p.a > 90 && p.a < 270);
                const lx = RCX + RLAB * ux, ly = RCY + RLAB * uy;
                const rot = flip ? p.a + 180 : p.a;
                lbl = `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="10" fill="var(--graph-font)" `
                    + `text-anchor="${flip ? 'end' : 'start'}" dominant-baseline="middle" `
                    + `transform="rotate(${rot.toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})">${_rEsc(n.code)}</text>`;
            }
            const hole = (n.type === 'incident' && n.degree === 0);
            // Shape encodes legal force: binding law + incidents = circle; SOFT LAW = diamond.
            const soft = isReg && !n.binding;
            const x = p.x, y = p.y;
            let shape;
            if (soft) {
                const r = rad + 1;
                shape = `<polygon points="${x.toFixed(1)},${(y - r).toFixed(1)} ${(x + r).toFixed(1)},${y.toFixed(1)} ${x.toFixed(1)},${(y + r).toFixed(1)} ${(x - r).toFixed(1)},${y.toFixed(1)}" fill="${col}" stroke="rgba(0,0,0,0.3)" stroke-width="0.8"/>`;
            } else {
                shape = `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rad}" fill="${hole ? 'transparent' : col}" stroke="${hole ? '#ef4444' : 'rgba(0,0,0,0.25)'}" stroke-width="${hole ? 1.5 : 0.8}" ${hole ? 'stroke-dasharray="2 2"' : ''}/>`;
            }
            marks += `<g class="rnode" data-id="${_rEsc(n.id)}" style="cursor:pointer">`
                + `<line x1="${bx1.toFixed(1)}" y1="${by1.toFixed(1)}" x2="${bx2.toFixed(1)}" y2="${by2.toFixed(1)}" stroke="${col}" stroke-width="${isReg ? 3 : 2}" stroke-opacity="0.7"/>`
                + shape
                + `<title>${_rEsc(n.code)} — ${_rEsc(n.label)}${soft ? ' (soft law)' : ''}</title>`
                + lbl + `</g>`;
        });

        svgBox.innerHTML = `<svg viewBox="0 0 ${RVB} ${RVB}" xmlns="http://www.w3.org/2000/svg">`
            + `<g class="rchords">${chords}</g><g class="rmarks">${marks}</g></svg>`;

        // interactions (event delegation)
        svgBox.onclick = ev => {
            const g = ev.target.closest('.rnode');
            if (g) _radialSelect(g.getAttribute('data-id'));
            else resetRadialSelection();
        };

        _radialLegend(groups);
        _radialMetrics(d);
        _radialApplyHighlight();
        RADIAL.rendered = true;
    }

    function _radialLegend(groups) {
        const el = document.getElementById('legend-incident');
        if (!el) return;
        const isEn = window.currentLang === 'en';
        let h = `<div style="width:100%;font-size:10px;color:var(--text-4);font-weight:700;text-transform:uppercase;letter-spacing:.5px;">${isEn ? 'Edge = role' : 'Warna garis = peran'}:</div>`;
        for (const k in ROLE_META) h += `<span style="display:inline-flex;align-items:center;font-size:11px;color:var(--text-2);"><span style="width:16px;height:2px;background:${ROLE_META[k].c};display:inline-block;margin-right:5px;"></span>${isEn ? ROLE_META[k].en : ROLE_META[k].id}</span>`;
        h += `<span style="display:inline-flex;align-items:center;font-size:11px;color:var(--text-2);"><span style="width:9px;height:9px;border:1.5px dashed #ef4444;border-radius:50%;display:inline-block;margin-right:5px;"></span>${isEn ? 'AI-specific gap (no validated warrant)' : 'Gap AI-spesifik (tanpa warrant tervalidasi)'}</span>`;
        h += `<span style="width:100%;"></span>`;
        h += `<span style="display:inline-flex;align-items:center;font-size:11px;color:var(--text-2);"><span style="width:9px;height:9px;background:var(--text-3);border-radius:50%;display:inline-block;margin-right:5px;"></span>${isEn ? 'Binding law / incident' : 'Hukum mengikat / insiden'}</span>`;
        h += `<span style="display:inline-flex;align-items:center;font-size:11px;color:var(--text-2);"><span style="width:9px;height:9px;background:var(--text-3);display:inline-block;margin-right:5px;transform:rotate(45deg);"></span>${isEn ? 'Soft law' : 'Soft law (tidak mengikat)'}</span>`;
        el.innerHTML = h;
    }

    function _radialMetrics(d) {
        const tb = document.getElementById('tbody-metrics-incident');
        if (!tb) return;
        const isEn = window.currentLang === 'en';
        const cov = d.n_incidents ? (100 * (d.n_incidents - d.structural_holes) / d.n_incidents) : 0;
        const rows = [
            [isEn ? 'Incidents' : 'Total Insiden', d.n_incidents, isEn ? 'Real sourced cases' : 'Kasus riil bersumber'],
            [isEn ? 'Regulations cited' : 'Regulasi terpakai', d.n_regulations, isEn ? 'Provisions acting as warrants' : 'Pasal yang menjadi dasar hukum'],
            [isEn ? 'Warrants (edges)' : 'Warrant (edges)', d.n_edges, isEn ? 'Validated + human-reviewed incident–law links' : 'Tautan insiden–hukum tervalidasi + ditinjau manusia'],
            [isEn ? 'Incident coverage' : 'Coverage insiden', cov.toFixed(1) + '%', `${d.n_incidents - d.structural_holes}/${d.n_incidents} ${isEn ? 'with a warrant' : 'punya dasar hukum'}`],
            [isEn ? 'AI-specific gaps' : 'Gap AI-spesifik', d.structural_holes, isEn ? 'No validated AI-specific warrant (general statutes may apply by analogy)' : 'Tanpa warrant AI-spesifik tervalidasi (statuta umum bisa berlaku analogis)'],
        ];
        tb.innerHTML = rows.map(r => `<tr><td style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--text-2);">${r[0]}</td><td style="padding:8px 12px;border-bottom:1px solid var(--border);text-align:right;font-weight:700;color:var(--text-1);">${r[1]}</td><td style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--text-3);">${r[2]}</td></tr>`).join('');
        _attachMetricsExport('incident', 'Metrik_Insiden');
    }

    function _radialEdgesOf(id) {
        return RADIAL.data.edges
            .map((e, i) => ({ e, i }))
            .filter(o => o.e.source === id || o.e.target === id);
    }

    function _radialApplyHighlight() {
        const svgBox = document.getElementById('radial-incident-svg');
        if (!svgBox) return;
        const sel = RADIAL.sel, bind = RADIAL.bindingOnly;
        const isBinding = rid => { const n = RADIAL.byId[rid]; return n && n.binding; };
        const neigh = new Set();
        if (sel) { _radialEdgesOf(sel).forEach(({ e }) => { neigh.add(e.source); neigh.add(e.target); }); }
        svgBox.querySelectorAll('.rchord').forEach(p => {
            const s = p.getAttribute('data-s'), t = p.getAttribute('data-t');
            let show = true;
            if (bind && !isBinding(s)) show = false;
            const inSel = !sel || s === sel || t === sel;
            p.style.display = show ? '' : 'none';
            p.setAttribute('stroke-opacity', !show ? 0 : (sel ? (inSel ? 0.85 : 0.04) : 0.3));
            p.setAttribute('stroke-width', inSel && sel ? 2 : 1);
        });
        svgBox.querySelectorAll('.rnode').forEach(g => {
            const id = g.getAttribute('data-id');
            const dim = sel && id !== sel && !neigh.has(id);
            g.style.opacity = dim ? 0.18 : 1;
        });
    }

    function _radialSelect(id) {
        RADIAL.sel = id; RADIAL.nav = 0;
        _radialApplyHighlight();
        _radialPanel();
    }
    window.resetRadialSelection = function () {
        RADIAL.sel = null; RADIAL.nav = 0;
        _radialApplyHighlight();
        const panel = document.getElementById('radial-incident-panel');
        if (panel) panel.innerHTML = `<div class="rp-empty">${window.currentLang === 'en' ? 'Click a node (incident or article) to see connections, centrality, and the warrant reasoning.' : 'Klik sebuah node (insiden atau pasal) untuk melihat detail koneksi, sentralitas, dan alasan warrant.'}</div>`;
    };
    window.toggleRadialBinding = function () {
        RADIAL.bindingOnly = !RADIAL.bindingOnly;
        const btn = document.getElementById('radial-binding-btn');
        if (btn) btn.classList.toggle('active', RADIAL.bindingOnly);
        _radialApplyHighlight();
    };
    window.radialNav = function (delta) {
        const conns = _radialEdgesOf(RADIAL.sel);
        if (!conns.length) return;
        RADIAL.nav = (RADIAL.nav + delta + conns.length) % conns.length;
        _radialPanel();
    };

    const _ROLE_KEYS = ['pelaku', 'pse', 'konsumen', 'regulator'];
    // live coverage (LLM + human overrides) — recomputed on every edit
    function _liveCoverageHTML() {
        const isEn = window.currentLang === 'en';
        const cands = RADIAL.cands || {};
        const ids = Object.keys(cands); const n = ids.length || 1;
        const cov = { pelaku: 0, pse: 0, konsumen: 0, regulator: 0, any: 0 };
        ids.forEach(iid => {
            const rel = cands[iid].map(r => _eff(iid, r)).filter(e => e.relevant);
            if (rel.length) cov.any++;
            _ROLE_KEYS.forEach(role => { if (rel.some(e => (e.roles || []).includes(role))) cov[role]++; });
        });
        const bar = (k, lbl) => { const p = Math.round(100 * cov[k] / n); const col = _rRoleColor([k]); return `<div class="rp-cent"><span>${lbl}</span><b style="color:${col};">${p}%</b></div>`; };
        return `<div class="rp-section" style="background:var(--sunken);border-radius:8px;padding:8px 10px;border-top:none;">
            <div class="rp-section-h" style="margin-top:0;">${isEn ? 'Live coverage (LLM + your review)' : 'Coverage langsung (LLM + tinjauan Anda)'} · ${_revCount()} ${isEn ? 'reviewed' : 'ditinjau'}</div>
            <div class="rp-cent-grid">
              ${bar('pelaku', isEn ? 'Perpetrator' : 'Pelaku')}${bar('pse', 'Operator/PSE')}
              ${bar('konsumen', isEn ? 'Consumer' : 'Konsumen')}${bar('regulator', 'Regulator')}
            </div></div>`;
    }
    function _reviewRow(iid, r) {
        const isEn = window.currentLang === 'en';
        const eff = _eff(iid, r);
        const ov = _revGet(iid, r.regulation_label);
        const lblEsc = String(r.regulation_label).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const iidEsc = String(iid).replace(/'/g, "\\'");
        const relBtn = (val, txt, col) => `<button onclick="_revRel('${iidEsc}','${lblEsc}',${val})" style="border:1px solid var(--border);border-radius:6px;padding:1px 7px;font-size:0.7rem;cursor:pointer;background:${eff.relevant === val ? col : 'var(--overlay-soft)'};color:${eff.relevant === val ? '#fff' : 'var(--text-3)'};">${txt}</button>`;
        const RLET = { pelaku: 'P', pse: 'O', konsumen: 'K', regulator: 'R' };
        const roleChip = role => { const on = (eff.roles || []).includes(role); const c = ROLE_META[role].c; return `<button onclick="_revRole('${iidEsc}','${lblEsc}','${role}')" title="${isEn ? ROLE_META[role].en : ROLE_META[role].id}" style="border:1px solid ${c};border-radius:5px;width:22px;height:20px;font-size:0.66rem;font-weight:700;cursor:pointer;background:${on ? c : 'transparent'};color:${on ? '#fff' : c};">${RLET[role]}</button>`; };
        const llm = `LLM: ${r.relevant ? '✓' : '✗'} ${r.confidence}%${(r.roles || []).length ? ' ' + r.roles.join('/') : ''}`;
        return `<div style="border-bottom:1px dashed var(--border);padding:7px 0;">
            <div style="display:flex;justify-content:space-between;gap:6px;align-items:flex-start;">
              <span onclick="showProvisionText('${lblEsc}')" style="cursor:pointer;font-weight:700;font-size:0.8rem;color:var(--text-1);text-decoration:underline dotted;text-underline-offset:2px;">${_rEsc(nodeCode(r.regulation_label))} 📖</span>
              ${ov ? '<span title="' + (isEn ? 'human-reviewed' : 'ditinjau manusia') + '" style="color:#10b981;font-weight:700;flex-shrink:0;">✔</span>' : ''}
            </div>
            <div style="font-size:0.68rem;color:var(--text-4);margin:2px 0 4px;">${_rEsc(llm)}</div>
            <div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;">
              ${relBtn(true, isEn ? 'Relevant' : 'Relevan', '#10b981')}${relBtn(false, isEn ? 'Not' : 'Tidak', '#ef4444')}
              <span style="width:1px;height:16px;background:var(--border);margin:0 2px;"></span>
              ${_ROLE_KEYS.map(roleChip).join('')}
              ${ov ? `<button onclick="_revReset('${iidEsc}','${lblEsc}')" title="${isEn ? 'reset to LLM' : 'kembalikan ke LLM'}" style="border:none;background:none;color:var(--text-4);cursor:pointer;font-size:0.7rem;margin-left:auto;">↺</button>` : ''}
            </div>
          </div>`;
    }
    function _reviewListHTML(iid) {
        const cands = (RADIAL.cands && RADIAL.cands[iid]) || [];
        const sorted = [...cands].sort((a, b) => (Number(_eff(iid, b).relevant) - Number(_eff(iid, a).relevant)) || (b.confidence - a.confidence));
        if (!sorted.length) return `<div class="rp-empty" style="padding:0.6rem 0;">${window.currentLang === 'en' ? 'No candidate provisions.' : 'Tidak ada kandidat pasal.'}</div>`;
        return sorted.map(r => _reviewRow(iid, r)).join('');
    }
    window._revRel = function (iid, label, val) {
        const cur = _revGet(iid, label) || {};
        _revSet(iid, label, { relevant: !!val, roles: val ? (cur.roles || []) : [] });
        _radialPanel();
    };
    window._revRole = function (iid, label, role) {
        const cur = _revGet(iid, label);
        // start from effective roles so first edit keeps LLM's roles
        let base = cur ? (cur.roles || []) : ((RADIAL.cands[iid] || []).find(r => r.regulation_label === label) || {}).roles || [];
        base = base.slice();
        const i = base.indexOf(role);
        if (i >= 0) base.splice(i, 1); else base.push(role);
        _revSet(iid, label, { relevant: true, roles: base });
        _radialPanel();
    };
    window._revReset = function (iid, label) { _revDel(iid, label); _radialPanel(); };

    // shared editable control row (Relevant/Not + role chips + reset) for a warrant
    // (iid, regulation label). Used by the review list AND the connection card so a
    // warrant is correctable from BOTH the incident side and the regulation side.
    const _RLET = { pelaku: 'P', pse: 'O', konsumen: 'K', regulator: 'R' };
    function _revControls(iid, label) {
        const isEn = window.currentLang === 'en';
        const row = (RADIAL.cands[iid] || []).find(x => x.regulation_label === label) || { regulation_label: label, roles: [], relevant: true };
        const eff = _eff(iid, row);
        const ov = _revGet(iid, label);
        const lblEsc = String(label).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
        const iidEsc = String(iid).replace(/'/g, "\\'");
        const relBtn = (val, txt, col) => `<button onclick="_revRel('${iidEsc}','${lblEsc}',${val})" style="border:1px solid var(--border);border-radius:6px;padding:1px 7px;font-size:0.7rem;cursor:pointer;background:${eff.relevant === val ? col : 'var(--overlay-soft)'};color:${eff.relevant === val ? '#fff' : 'var(--text-3)'};">${txt}</button>`;
        const roleChip = role => { const on = (eff.roles || []).includes(role); const c = ROLE_META[role].c; return `<button onclick="_revRole('${iidEsc}','${lblEsc}','${role}')" title="${isEn ? ROLE_META[role].en : ROLE_META[role].id}" style="border:1px solid ${c};border-radius:5px;width:22px;height:20px;font-size:0.66rem;font-weight:700;cursor:pointer;background:${on ? c : 'transparent'};color:${on ? '#fff' : c};">${_RLET[role]}</button>`; };
        return `<div style="display:flex;gap:4px;align-items:center;flex-wrap:wrap;margin-top:8px;">
              <span style="font-size:0.68rem;color:var(--text-4);">${isEn ? 'Your call:' : 'Anda:'}</span>
              ${relBtn(true, isEn ? 'Relevant' : 'Relevan', '#10b981')}${relBtn(false, isEn ? 'Not' : 'Tidak', '#ef4444')}
              <span style="width:1px;height:16px;background:var(--border);margin:0 2px;"></span>${_ROLE_KEYS.map(roleChip).join('')}
              ${ov ? `<button onclick="_revReset('${iidEsc}','${lblEsc}')" title="${isEn ? 'reset to LLM' : 'kembalikan ke LLM'}" style="border:none;background:none;color:var(--text-4);cursor:pointer;font-size:0.75rem;margin-left:auto;">↺</button>` : ''}
            </div>`;
    }

    function _radialPanel() {
        const panel = document.getElementById('radial-incident-panel');
        if (!panel || !RADIAL.sel) return;
        const isEn = window.currentLang === 'en';
        const n = RADIAL.byId[RADIAL.sel];
        const conns = _radialEdgesOf(RADIAL.sel);
        if (RADIAL.nav >= conns.length) RADIAL.nav = 0;
        const c = n.cent || {};
        const pct = v => (100 * (v || 0)).toFixed(1) + '%';
        const centRows = [
            ['Degree', pct(c.degree)], [isEn ? 'In-Degree' : 'In-Degree', pct(c.in)],
            [isEn ? 'Out-Degree' : 'Out-Degree', pct(c.out)], ['Betweenness', pct(c.betweenness)],
            ['Closeness', pct(c.closeness)],
        ].map(r => `<div class="rp-cent"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('');

        let header;
        if (n.type === 'incident') {
            header = `<div class="rp-eyebrow">${_rEsc(n.group)} · ${_rEsc(n.inc_type || '')}</div>`
                + `<div class="rp-title">${_rEsc(n.code)}</div>`
                + `<div class="rp-sub">${_rEsc(n.title || n.label)}</div>`
                + (n.chronology ? `<div style="font-size:0.78rem;color:var(--text-3);line-height:1.5;">${_rEsc(n.chronology).slice(0, 280)}…</div>` : '');
        } else {
            const labEsc = String(n.label).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            header = `<div class="rp-eyebrow">${_rEsc(n.group)}${n.binding ? ' · ' + (isEn ? 'Binding' : 'Mengikat') : ' · Soft law'}</div>`
                + `<div class="rp-title" onclick="showProvisionText('${labEsc}')" title="${isEn ? 'Read full article text' : 'Baca bunyi pasal utuh'}" style="cursor:pointer;">${_rEsc(n.code)} 📖</div>`
                + `<div class="rp-sub" style="font-family:ui-monospace,Menlo,monospace;">${_rEsc(n.label)}</div>`
                + `<button onclick="showProvisionText('${labEsc}')" class="btn-secondary btn-sm" style="margin-top:8px;"><span class="material-symbols-rounded" style="font-size:14px;vertical-align:-2px;">menu_book</span> ${isEn ? 'Read full article text' : 'Baca bunyi pasal utuh'}</button>`;
        }

        let edgeCard = `<div class="rp-empty" style="padding:1rem 0;">${isEn ? 'No connections.' : 'Tidak ada koneksi.'}</div>`;
        if (conns.length) {
            const o = conns[RADIAL.nav];
            const e = o.e;
            const otherId = e.source === RADIAL.sel ? e.target : e.source;
            const other = RADIAL.byId[otherId] || {};
            const dirLbl = e.target === RADIAL.sel
                ? (isEn ? 'Governed by ←' : 'Diatur oleh ←')
                : (isEn ? 'Governs →' : 'Mengatur →');
            // the warrant = (incident, regulation); editable from either side
            const incNode = other.type === 'incident' ? other : n;
            const regNode = other.type === 'regulation' ? other : n;
            const wIid = String(incNode.id).replace('CASE_', '');
            const wLabel = regNode.label;
            const wEff = _eff(wIid, { regulation_label: wLabel, roles: e.roles, relevant: true });
            const roleChips = (wEff.roles || []).map(r => `<span class="rp-chip" style="background:${(ROLE_META[r] || {}).c || '#94a3b8'}22;color:${(ROLE_META[r] || {}).c || '#94a3b8'};">${isEn ? (ROLE_META[r] || {}).en : (ROLE_META[r] || {}).id || r}</span>`).join('') || `<span class="rp-chip" style="background:var(--overlay-hover);color:var(--text-4);">${isEn ? 'role n/a' : 'peran n/a'}</span>`;
            edgeCard = `<div class="rp-nav">
                    <button onclick="radialNav(-1)">‹</button>
                    <span class="rp-counter">${RADIAL.nav + 1} / ${conns.length}</span>
                    <button onclick="radialNav(1)">›</button>
                    <span class="rp-counter" style="margin-left:auto;color:var(--primary);font-weight:700;">${dirLbl}</span>
                </div>
                <div class="rp-edge" style="border-left-color:${_rRoleColor(wEff.roles)};">
                    <div class="rp-edge-node" ${other.type === 'regulation' ? `onclick="showProvisionText('${String(other.label || '').replace(/\\/g, '\\\\').replace(/'/g, "\\'")}')" style="cursor:pointer;text-decoration:underline dotted;text-underline-offset:2px;" title="${isEn ? 'Read full article' : 'Baca bunyi pasal'}"` : ''}>${_rEsc(other.code || otherId)}${other.type === 'regulation' ? ' 📖' : ''}${wEff.reviewed ? ' <span style="color:#10b981;" title="ditinjau manusia">✔</span>' : ''}</div>
                    <div class="rp-k" style="font-family:ui-monospace,Menlo,monospace;">${_rEsc(other.label || '')}</div>
                    <div style="margin-top:6px;">${roleChips}</div>
                    <div class="rp-k" style="margin-top:6px;">${isEn ? 'LLM confidence' : 'Keyakinan LLM'}: <b style="color:var(--text-1);">${e.confidence}%</b></div>
                    <div class="rp-conf-bar"><div class="rp-conf-fill" style="width:${e.confidence}%;background:${_rRoleColor(wEff.roles)};"></div></div>
                    <div class="rp-reason">${_rEsc(e.reason || '')}</div>
                    ${_revControls(wIid, wLabel)}
                </div>`;
        }

        let detail;
        if (n.type === 'incident') {
            const iid = RADIAL.sel.replace('CASE_', '');
            const cands = (RADIAL.cands && RADIAL.cands[iid]) || [];
            const reviewed = cands.filter(r => _revGet(iid, r.regulation_label)).length;
            detail = `<div class="rp-section"><div class="rp-section-h">${isEn ? 'Warrants — human review' : 'Warrant — tinjauan manusia'} (${reviewed}/${cands.length} ${isEn ? 'reviewed' : 'ditinjau'})</div>`
                + `<div style="font-size:0.7rem;color:var(--text-4);margin-bottom:6px;">${isEn ? 'Set Relevant/Not and the bound subject (P=perpetrator, O=operator, K=consumer, R=regulator). 📖 reads the article. Saved in your browser; Export to commit.' : 'Tentukan Relevan/Tidak & subjek terikat (P=pelaku, O=operator, K=konsumen, R=regulator). 📖 baca pasal. Tersimpan di browser; Export untuk commit.'}</div>`
                + _reviewListHTML(iid) + `</div>`;
        } else {
            detail = `<div class="rp-section"><div class="rp-section-h">${isEn ? 'Connected nodes' : 'Node terhubung'} (${conns.length})</div>${edgeCard}</div>`;
        }
        panel.innerHTML = header
            + `<div class="rp-section"><div class="rp-section-h">${isEn ? 'Centrality' : 'Sentralitas'}</div><div class="rp-cent-grid">${centRows}</div></div>`
            + _liveCoverageHTML()
            + detail;
    }

    window.exportRadialCSV = function () {
        if (!RADIAL.data) { showToast('Buka tab dulu.', 'warning'); return; }
        const isEn = window.currentLang === 'en';
        const rows = [['regulation_id', 'regulation', 'incident', 'roles', 'confidence', 'reason']];
        RADIAL.data.edges.forEach(e => {
            const reg = RADIAL.byId[e.source] || {}, inc = RADIAL.byId[e.target] || {};
            rows.push([e.source, reg.label || '', (inc.label || e.target), (e.roles || []).join('|'), e.confidence, e.reason || '']);
        });
        _downloadBlob(_toCSV(rows), `Radial_Insiden_Warrant_${isEn ? 'EN' : 'ID'}.csv`, 'text/csv;charset=utf-8;');
        _toast(isEn ? 'CSV downloaded.' : 'CSV berhasil diunduh.');
    };
    // shared SVG→PNG exporter (radial + chord); resolves text CSS vars to literals
    function _svgToPng(containerId, filename) {
        const svg = document.querySelector('#' + containerId + ' svg');
        if (!svg) { showToast('Graph belum dirender.', 'warning'); return; }
        const cs = getComputedStyle(document.documentElement);
        const bg = (cs.getPropertyValue('--graph-bg') || '#ffffff').trim();
        const fontCol = (cs.getPropertyValue('--graph-font') || '#1e293b').trim();
        const clone = svg.cloneNode(true);
        // SVG-in-<img> can't read CSS vars → inline the label colour
        clone.querySelectorAll('text').forEach(t => { t.setAttribute('fill', fontCol); });
        clone.setAttribute('width', 1600); clone.setAttribute('height', 1600);
        const xml = new XMLSerializer().serializeToString(clone);
        const img = new Image();
        img.onload = () => {
            const cv = document.createElement('canvas'); cv.width = 1600; cv.height = 1600;
            const ctx = cv.getContext('2d');
            ctx.fillStyle = (bg && bg !== 'transparent') ? bg : '#ffffff';
            ctx.fillRect(0, 0, 1600, 1600);
            ctx.drawImage(img, 0, 0, 1600, 1600);
            const a = document.createElement('a'); a.download = filename; a.href = cv.toDataURL('image/png'); a.click();
            _toast(window.currentLang === 'en' ? 'Image downloaded.' : 'Gambar berhasil diunduh.');
        };
        img.onerror = () => showToast('Export PNG gagal.', 'error');
        img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    }
    window.exportRadialPNG = function () { _svgToPng('radial-incident-svg', 'Radial_Insiden_Regulasi.png'); };

    // ===================================================================
    // INTER-INSTRUMENT CHORD — replaces the force graph for the 4 reg networks
    // Ribbon width = number of strong links between two instruments/groups.
    // ===================================================================
    const CHORD = {};   // per graphId: { groups, matrix, sel, byGroupColor }
    function _chordPt(cx, cy, r, a) { return [cx + r * Math.cos(a), cy + r * Math.sin(a)]; }

    const _chordDisp = g => (g === 'Insiden Kasus' ? g : _abbrInst(g));
    function renderInstrumentChord(graphId, fullData, mode) {
        const box = document.getElementById('network-' + graphId);
        if (!box) return;
        const isEn = window.currentLang === 'en';
        mode = mode || (CHORD[graphId] && CHORD[graphId].mode) || 'citation';
        // group ids
        const groupOf = {}; fullData.nodes.forEach(n => groupOf[n.id] = n.group);
        const gset = [...new Set(fullData.nodes.map(n => n.group))];
        const idx = {}; gset.forEach((g, i) => idx[g] = i);
        // CITATION-only chord (SBERT removed). Directed cross-citation matrix, instrument-level.
        mode = 'citation';
        const _cov = _covByDoc();
        let Cdir = _citeMatrix(gset);
        // Count cross vs intra-jurisdiction citations for the gap analysis
        let _crossJurisCt = 0, _intraNatl = 0, _intraIntl = 0;
        Cdir.forEach((row, i) => row.forEach((v, j) => {
            if (i === j || !v) return;
            const ji = (_cov.get(gset[i]) || {}).juris, jj = (_cov.get(gset[j]) || {}).juris;
            if (ji && jj && ji !== jj) _crossJurisCt += v;
            else if (ji === 'NATL' && jj === 'NATL') _intraNatl += v;
            else if (ji === 'INTL' && jj === 'INTL') _intraIntl += v;
        }));
        if (graphId === 'cross') {
            CHORD._crossMeta = { cross: _crossJurisCt, natl: _intraNatl, intl: _intraIntl };
            // Keep ALL edges — chord shows two disconnected clusters as visual evidence
        }
        // active matrix used for ribbon geometry (symmetrise citations; direction kept in Cdir)
        const M = gset.map((g, i) => gset.map((h, j) => Cdir[i][j] + Cdir[j][i]));
        // keep groups with any connection in the active matrix
        const keep = gset.map((g, i) => M[i].reduce((s, v) => s + v, 0) > 0);
        const groups = gset.filter((g, i) => keep[i]);
        // For cross-jurisdiction, sort groups so INTL and NATL form distinct visual clusters
        if (graphId === 'cross') groups.sort((a, b) => {
            const ja = (_cov.get(a) || {}).juris || '', jb = (_cov.get(b) || {}).juris || '';
            return ja === jb ? 0 : (ja === 'INTL' ? -1 : 1);
        });
        const N = groups.length;
        if (!N) {
            if (graphId === 'cross') {
                box.innerHTML = _crossGapPanel(isEn);
                const lg = document.getElementById('legend-' + graphId);
                if (lg) lg.innerHTML = `<div style="font-size:10.5px;color:var(--text-4);line-height:1.5;">${isEn ? 'Citation basis (sitir-menyitir). 0 cross-jurisdiction links = the gap finding (SBERT removed).' : 'Basis sitasi (sitir-menyitir). 0 tautan lintas-yurisdiksi = temuan gap (SBERT dibuang).'}</div>`;
            } else {
                box.innerHTML = '<div class="rp-empty">' + (isEn ? 'No inter-instrument citations.' : 'Tidak ada sitasi antar-instrumen.') + '</div>';
            }
            return;
        }
        const matrix = groups.map(ga => groups.map(gb => M[idx[ga]][idx[gb]]));
        const cdir = groups.map(ga => groups.map(gb => Cdir[idx[ga]][idx[gb]]));   // directed, for inspector/tooltip
        const cov = _covByDoc();

        const palette = ['#ef4444', '#ec4899', '#a855f7', '#6366f1', '#3b82f6', '#0ea5e9', '#14b8a6', '#10b981', '#84cc16', '#eab308', '#f59e0b', '#f97316', '#78716c', '#be123c', '#6d28d9', '#1d4ed8', '#0891b2', '#65a30d', '#c026d3', '#db2777'];
        const gcol = {};
        if (graphId === 'cross') {
            const _nPal = ['#10b981','#059669','#047857','#34d399','#6ee7b7'];
            const _iPal = ['#f59e0b','#d97706','#b45309','#fbbf24','#fcd34d'];
            let _ni = 0, _ii = 0;
            groups.forEach(g => {
                const j = (cov.get(g) || {}).juris;
                gcol[g] = j === 'NATL' ? _nPal[_ni++ % _nPal.length] : _iPal[_ii++ % _iPal.length];
            });
        } else {
            groups.forEach((g, i) => gcol[g] = palette[i % palette.length]);
        }
        CHORD[graphId] = { groups, matrix, cdir, gcol, sel: null, mode, cov };

        // layout
        const VB = 820, CX = 410, CY = 410, Rin = 250, Rout = 270, Rlab = 280;
        const rowSum = matrix.map(r => r.reduce((a, b) => a + b, 0));
        const total = rowSum.reduce((a, b) => a + b, 0) || 1;
        const PAD = 0.045, avail = 2 * Math.PI - N * PAD;
        let ang = -Math.PI / 2;
        const arcs = [], sub = [];
        for (let i = 0; i < N; i++) {
            const a0 = ang, span = (rowSum[i] / total) * avail, a1 = a0 + span;
            arcs.push({ a0, a1, mid: (a0 + a1) / 2 });
            let s = a0; sub[i] = [];
            for (let j = 0; j < N; j++) { const w = matrix[i][j]; const sp = rowSum[i] ? (w / rowSum[i]) * span : 0; sub[i].push({ a0: s, a1: s + sp }); s += sp; }
            ang = a1 + PAD;
        }
        const arcPath = (a0, a1) => {
            const [x0, y0] = _chordPt(CX, CY, Rout, a0), [x1, y1] = _chordPt(CX, CY, Rout, a1);
            const [x2, y2] = _chordPt(CX, CY, Rin, a1), [x3, y3] = _chordPt(CX, CY, Rin, a0);
            const la = (a1 - a0) > Math.PI ? 1 : 0;
            return `M${x0.toFixed(1)},${y0.toFixed(1)} A${Rout},${Rout} 0 ${la} 1 ${x1.toFixed(1)},${y1.toFixed(1)} L${x2.toFixed(1)},${y2.toFixed(1)} A${Rin},${Rin} 0 ${la} 0 ${x3.toFixed(1)},${y3.toFixed(1)} Z`;
        };
        const ribbonPath = (si, sj) => {
            const [ai0x, ai0y] = _chordPt(CX, CY, Rin, si.a0), [ai1x, ai1y] = _chordPt(CX, CY, Rin, si.a1);
            const [aj0x, aj0y] = _chordPt(CX, CY, Rin, sj.a0), [aj1x, aj1y] = _chordPt(CX, CY, Rin, sj.a1);
            return `M${ai0x.toFixed(1)},${ai0y.toFixed(1)} A${Rin},${Rin} 0 0 1 ${ai1x.toFixed(1)},${ai1y.toFixed(1)} Q${CX},${CY} ${aj0x.toFixed(1)},${aj0y.toFixed(1)} A${Rin},${Rin} 0 0 1 ${aj1x.toFixed(1)},${aj1y.toFixed(1)} Q${CX},${CY} ${ai0x.toFixed(1)},${ai0y.toFixed(1)} Z`;
        };

        let ribbons = '';
        for (let i = 0; i < N; i++) for (let j = i + 1; j < N; j++) {
            if (matrix[i][j] <= 0) continue;
            ribbons += `<path class="cribbon" data-i="${i}" data-j="${j}" d="${ribbonPath(sub[i][j], sub[j][i])}" fill="${gcol[groups[i]]}" fill-opacity="0.3" stroke="none"><title>${_rEsc(_chordDisp(groups[i]))} ↔ ${_rEsc(_chordDisp(groups[j]))}: ${matrix[i][j]} ${mode === 'citation' ? (isEn ? 'citations' : 'sitasi') : (isEn ? 'links' : 'tautan')}</title></path>`;
        }
        let bands = '';
        for (let i = 0; i < N; i++) {
            const a = arcs[i], col = gcol[groups[i]];
            const cv = cov.get(groups[i]) || {};
            const muted = (mode === 'citation' && cv.role === 'source');   // cite-only leaf → no authority
            const btitle = (mode === 'citation')
                ? `${_chordDisp(groups[i])} — ${isEn ? 'cited' : 'disitir'} ${cv.in || 0}× / ${isEn ? 'cites' : 'menyitir'} ${cv.out || 0}×`
                : `${_chordDisp(groups[i])} (${rowSum[i]} ${isEn ? 'links' : 'tautan'})`;
            bands += `<path class="cband" data-i="${i}" d="${arcPath(a.a0, a.a1)}" fill="${col}" fill-opacity="${muted ? 0.28 : 1}" stroke="${muted ? col : 'rgba(0,0,0,0.25)'}" stroke-width="${muted ? 1.2 : 0.5}" stroke-dasharray="${muted ? '4 2' : ''}" style="cursor:pointer"><title>${_rEsc(btitle)}</title></path>`;
            const flip = (a.mid > Math.PI / 2 && a.mid < 3 * Math.PI / 2);
            const [lx, ly] = _chordPt(CX, CY, Rlab, a.mid);
            const deg = a.mid * 180 / Math.PI;
            bands += `<text class="clabel" data-i="${i}" x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" font-size="11" fill="var(--graph-font)" text-anchor="${flip ? 'end' : 'start'}" dominant-baseline="middle" transform="rotate(${(flip ? deg + 180 : deg).toFixed(1)} ${lx.toFixed(1)} ${ly.toFixed(1)})" style="cursor:pointer;pointer-events:auto;">${_rEsc(_chordDisp(groups[i]))}</text>`;
        }

        let _crossAnn = '', _crossBnr = '';
        if (graphId === 'cross') {
            const cm = CHORD._crossMeta || { cross: 0, natl: 0, intl: 0 };
            // Cluster labels inside the chord ring
            const _clusters = { INTL: [], NATL: [] };
            for (let ci = 0; ci < N; ci++) {
                const jur = (cov.get(groups[ci]) || {}).juris;
                if (jur && _clusters[jur]) _clusters[jur].push(arcs[ci]);
            }
            Object.entries(_clusters).forEach(([jur, cArcs]) => {
                if (!cArcs.length) return;
                const midA = (cArcs[0].a0 + cArcs[cArcs.length - 1].a1) / 2;
                const [lx, ly] = _chordPt(CX, CY, Rin - 55, midA);
                const col = jur === 'NATL' ? '#10b981' : '#f59e0b';
                const lbl = jur === 'NATL' ? (isEn ? '🇮🇩 NATIONAL' : '🇮🇩 NASIONAL') : (isEn ? '🌐 INT\'L' : '🌐 INT\'L');
                _crossAnn += `<text x="${lx.toFixed(1)}" y="${ly.toFixed(1)}" text-anchor="middle" font-size="13" font-weight="800" fill="${col}" opacity="0.65" dominant-baseline="middle">${lbl}</text>`;
            });
            // Center watermark showing cross-jurisdiction count
            _crossAnn += `<text x="${CX}" y="${CY - 8}" text-anchor="middle" font-size="56" font-weight="900" fill="${cm.cross ? '#f59e0b' : '#ef4444'}" opacity="0.13">${cm.cross}</text>`;
            _crossAnn += `<text x="${CX}" y="${CY + 20}" text-anchor="middle" font-size="11" fill="var(--text-4)" opacity="0.55">${isEn ? 'cross-jurisdiction' : 'lintas-yurisdiksi'}</text>`;
            // Compact gap summary banner
            _crossBnr = `<div style="display:flex;align-items:center;justify-content:center;gap:1.8rem;padding:14px 16px;background:var(--sunken);border-bottom:1px solid var(--border);flex-wrap:wrap;flex-shrink:0;">`
                + `<div style="display:flex;align-items:center;gap:8px;"><span style="width:14px;height:14px;border-radius:50%;background:#10b981;display:inline-block;"></span><span style="font-size:0.88rem;color:var(--text-2);"><b style="color:#10b981;font-size:1.1rem;">${cm.natl}</b> ${isEn ? 'intra-national' : 'antar-nasional'}</span></div>`
                + `<div style="text-align:center;padding:0 12px;border-left:2px dashed var(--border);border-right:2px dashed var(--border);"><div style="font-size:2.2rem;font-weight:900;color:#ef4444;line-height:1;">${cm.cross}</div><div style="font-size:0.72rem;color:var(--text-4);line-height:1.3;margin-top:2px;">${isEn ? 'cross-jurisdiction' : 'lintas-yurisdiksi'}</div></div>`
                + `<div style="display:flex;align-items:center;gap:8px;"><span style="width:14px;height:14px;border-radius:50%;background:#f59e0b;display:inline-block;"></span><span style="font-size:0.88rem;color:var(--text-2);"><b style="color:#f59e0b;font-size:1.1rem;">${cm.intl}</b> ${isEn ? 'intra-international' : 'antar-internasional'}</span></div>`
                + `</div>`;
            box.style.display = 'flex'; box.style.flexDirection = 'column';
        }
        const _svgWrap = graphId === 'cross' ? ['<div style="flex:1;min-height:0;overflow:hidden;">','</div>'] : ['',''];
        box.innerHTML = _crossBnr + _svgWrap[0] + `<svg viewBox="0 0 ${VB} ${VB}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:100%;display:block;">`
            + `<g class="cribbons">${ribbons}</g><g class="cbands">${bands}</g>${_crossAnn}</svg>` + _svgWrap[1];
        box.onclick = ev => {
            const el = ev.target.closest('[data-i]');
            if (el && (el.classList.contains('cband') || el.classList.contains('clabel'))) _chordSelect(graphId, +el.getAttribute('data-i'));
            else _chordSelect(graphId, null);
        };
        _chordSelect(graphId, null);
        _chordLegend(graphId);
        // Enhance legend for cross-jurisdiction with gap explanation
        if (graphId === 'cross') {
            const lg = document.getElementById('legend-cross');
            if (lg) {
                const s = (CITATIONS && CITATIONS.authority && CITATIONS.authority.summary) || {};
                const intlN = (s.intl && s.intl.n_edges) || 0, natlN = (s.natl && s.natl.n_edges) || 0;
                const crossN = (s.cross && s.cross.n_edges) || 0;
                const crossColor = crossN ? '#f59e0b' : '#ef4444';
                const gapNote = `<div style="width:100%;font-size:0.82rem;color:var(--text-3);line-height:1.6;margin:4px 0 8px;padding:10px 14px;background:var(--sunken);border-radius:8px;border-left:3px solid ${crossColor};">${isEn
                    ? (crossN
                        ? `<b>Near-gap finding:</b> Only <b>${crossN}</b> cross-jurisdiction citation link(s) found — compared to <b>${intlN}</b> intra-international and <b>${natlN}</b> intra-national in the same corpus. Indonesia's AI governance mostly aligns through <b>diffusion / borrowing</b>, with minimal formal cross-attribution.`
                        : `<b>Gap finding:</b> No explicit citation links an Indonesian instrument to an international AI instrument (or vice-versa) — despite <b>${intlN}</b> intra-international and <b>${natlN}</b> intra-national citations in the same corpus. Indonesia's AI governance aligns through <b>diffusion / borrowing</b>, not formal attribution: a structural <b>citation gap</b>.`)
                    : (crossN
                        ? `<b>Temuan near-gap:</b> Hanya <b>${crossN}</b> tautan sitasi lintas-yurisdiksi ditemukan — dibandingkan <b>${intlN}</b> antar-internasional dan <b>${natlN}</b> antar-nasional di korpus yang sama. Tata kelola AI Indonesia sebagian besar selaras lewat <b>difusi / peminjaman</b>, dengan atribusi formal silang yang sangat minim.`
                        : `<b>Temuan gap:</b> Tidak ada satu pun sitasi eksplisit yang menghubungkan instrumen Indonesia dengan instrumen AI internasional (atau sebaliknya) — padahal ada <b>${intlN}</b> sitasi antar-internasional dan <b>${natlN}</b> antar-nasional di korpus yang sama. Tata kelola AI Indonesia selaras lewat <b>difusi / peminjaman</b>, bukan atribusi formal: sebuah <b>gap sitasi</b> struktural.`)}</div>`;
                lg.innerHTML = gapNote + lg.innerHTML;
            }
        }
    }

    // Cross-jurisdiction "gap finding" callout (shown when the cross chord is empty —
    // i.e. ZERO explicit Intl↔National citations, which is the headline result).
    function _crossGapPanel(isEn) {
        const s = (CITATIONS && CITATIONS.authority && CITATIONS.authority.summary) || {};
        const intl = (s.intl && s.intl.n_edges) || 0, natl = (s.natl && s.natl.n_edges) || 0;
        return `<div style="max-width:580px;margin:1.6rem auto;text-align:center;padding:1.4rem 1.2rem;">
            <div style="font-size:2.8rem;font-weight:800;color:#ef4444;line-height:1;">0</div>
            <div style="font-weight:700;color:var(--text-1);font-size:1.05rem;margin-top:6px;">${isEn ? 'cross-jurisdiction citations' : 'sitasi lintas-yurisdiksi'}</div>
            <div style="font-size:0.86rem;color:var(--text-3);line-height:1.65;margin-top:12px;text-align:left;">${isEn
                ? `Not a single explicit citation links an Indonesian instrument to an international AI instrument (or vice-versa) — despite <b>${intl}</b> intra-international and <b>${natl}</b> intra-national citation links in the same corpus. Indonesia’s AI governance aligns with international frameworks through <b>diffusion / borrowing</b>, not formal attribution: a structural <b>citation gap (disconnection)</b>, not a similarity map.`
                : `Tidak ada satu pun sitasi eksplisit yang menghubungkan instrumen Indonesia dengan instrumen AI internasional (atau sebaliknya) — padahal di korpus yang sama ada <b>${intl}</b> tautan sitasi antar-internasional dan <b>${natl}</b> antar-nasional. Tata kelola AI Indonesia selaras dengan kerangka internasional lewat <b>difusi / peminjaman</b>, bukan atribusi formal: sebuah <b>gap sitasi (keterputusan)</b> struktural, bukan peta kemiripan.`}</div>
          </div>`;
    }
    function _chordLegend(graphId) {
        const el = document.getElementById('legend-' + graphId);
        if (!el || !CHORD[graphId]) return;
        const { groups, gcol } = CHORD[graphId];
        const isEn = window.currentLang === 'en';
        const note = `<div style="width:100%;font-size:10.5px;color:var(--text-4);line-height:1.5;margin:4px 0;">${isEn
            ? '<b>Citation network (sitir-menyitir).</b> Ribbon = explicit cross-citations between two instruments; arc size = total citations involving it; <b>dashed/muted arcs = cite-only “source” instruments (cited 0×, mostly soft-law)</b>; solid arcs = cited authorities. Click an arc to see who it cites vs who cites it.'
            : '<b>Jaringan sitasi (sitir-menyitir).</b> Pita = sitasi-silang eksplisit antar dua instrumen; ukuran busur = total sitasi yang melibatkannya; <b>busur putus-putus/pudar = instrumen “sumber” yang hanya menyitir (disitir 0×, umumnya soft-law)</b>; busur penuh = otoritas yang disitir. Klik busur untuk lihat ia menyitir vs disitir siapa.'}</div>`;
        el.innerHTML = note + groups.map(g => `<span style="display:inline-flex;align-items:center;font-size:11px;color:var(--text-2);background:var(--legend-chip);padding:3px 9px;border-radius:20px;"><span style="width:10px;height:10px;border-radius:50%;background:${gcol[g]};display:inline-block;margin-right:6px;"></span>${_rEsc(_chordDisp(g))}</span>`).join('');
    }

    function _chordSelect(graphId, i) {
        const c = CHORD[graphId]; if (!c) return;
        c.sel = i;
        const box = document.getElementById('network-' + graphId);
        box.querySelectorAll('.cribbon').forEach(p => {
            const pi = +p.getAttribute('data-i'), pj = +p.getAttribute('data-j');
            const on = (i == null) || pi === i || pj === i;
            p.setAttribute('fill-opacity', i == null ? 0.3 : (on ? 0.72 : 0.05));
        });
        box.querySelectorAll('.cband').forEach(b => { b.style.opacity = (i == null || +b.getAttribute('data-i') === i) ? 1 : 0.35; });
        // inspector panel
        const panel = document.getElementById('inspector-' + graphId);
        const title = document.getElementById('inspector-' + graphId + '-title');
        const body = document.getElementById('inspector-' + graphId + '-body');
        if (!panel || i == null) { if (panel) panel.classList.remove('visible'); return; }
        const isEn = window.currentLang === 'en';
        const { groups, matrix, cdir, gcol, mode } = c;
        title.textContent = _chordDisp(groups[i]);
        const rowHtml = (o, suffix) => `<div style="display:flex;justify-content:space-between;gap:8px;font-size:0.8rem;padding:3px 0;border-bottom:1px dashed var(--border);"><span style="color:var(--text-2);"><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${gcol[o.g]};margin-right:5px;"></span>${_rEsc(_chordDisp(o.g))}</span><b style="color:var(--text-1);">${o.w}${suffix || ''}</b></div>`;
        if (mode === 'citation' && cdir) {
            const out = groups.map((g, j) => ({ g, w: cdir[i][j] })).filter(o => o.w > 0).sort((a, b) => b.w - a.w);
            const inn = groups.map((g, j) => ({ g, w: cdir[j][i] })).filter(o => o.w > 0).sort((a, b) => b.w - a.w);
            const empty = `<div style="font-size:0.78rem;color:var(--text-4);padding:2px 0;">—</div>`;
            body.innerHTML = `<div style="font-size:0.78rem;color:var(--primary);font-weight:600;margin-bottom:4px;">${isEn ? 'Cites (out)' : 'Menyitir (out)'} (${out.length}):</div>`
                + (out.map(o => rowHtml(o, '×')).join('') || empty)
                + `<div style="font-size:0.78rem;color:var(--amber);font-weight:600;margin:10px 0 4px;">${isEn ? 'Cited by (in) — authority' : 'Disitir oleh (in) — otoritas'} (${inn.length}):</div>`
                + (inn.map(o => rowHtml(o, '×')).join('') || empty);
        } else {
            const conns = groups.map((g, j) => ({ g, w: matrix[i][j] })).filter(o => o.w > 0).sort((a, b) => b.w - a.w);
            body.innerHTML = `<div style="font-size:0.78rem;color:var(--text-3);margin-bottom:8px;">${isEn ? 'Connected instruments' : 'Instrumen terhubung'} (${conns.length}):</div>`
                + conns.map(o => rowHtml(o)).join('');
        }
        panel.classList.add('visible');
    }

    // ===================================================================
    // CITATION NETWORK — explicit cross-references (the DEFENSIBLE link)
    // Built by build_citations.py: who cites whom by number ("Nomor X Tahun Y")
    // or by named instrument ("G20 AI Principles", "OECD", "EU AI Act"…).
    // Rigorous complement to the SBERT-similarity chord (which is descriptive).
    // ===================================================================
    const _CITE_NAMES = {
        'UU_ITE_No1_2024': 'UU ITE 1/2024', 'UU_ITE_No19_2016': 'UU ITE 19/2016',
        'UU_PDP_No27_2022': 'UU PDP', 'PP_PSTE_No71_2019': 'PP PSTE',
        'SE_Komdigi': 'SE Menkominfo 9/2023 (Etika AI)', 'Stranas_AI': 'Stranas AI',
        'WHO_Ethics': 'WHO AI for Health', 'OECD_AI_Principles': 'OECD AI Principles',
        'UNESCO_Recommendation': 'UNESCO AI Ethics', 'ASEAN_Guide': 'ASEAN AI Guide',
        'G7_Hiroshima': 'G7 Hiroshima CoC', 'ISO_IEC_42001': 'ISO/IEC 42001',
        'Council_of_Europe': 'CoE Framework Convention', 'UNGA_Res_78_265': 'UNGA 78/265',
        'UNGA_Res_78_311': 'UNGA 78/311', 'EU_AI_Act': 'EU AI Act', 'POJK_No3': 'POJK 3/2024',
    };
    function _citeDoc(name) {
        if (!name) return '';
        for (const k in _CITE_NAMES) if (name.startsWith(k)) return _CITE_NAMES[k];
        return name.replace(/_/g, ' ').slice(0, 28);
    }
    // ── shared citation cache + instrument-level helpers (PRIMARY authority layer) ──
    let CITATIONS = null;
    async function _ensureCitations() {
        if (CITATIONS) return CITATIONS;
        try { const r = await fetch(`./data/network/citations.json?v=${DATA_V}`); CITATIONS = await r.json(); }
        catch (e) { CITATIONS = {}; }
        CITATIONS.docs = CITATIONS.docs || {};
        CITATIONS.edges = CITATIONS.edges || [];
        CITATIONS.coverage = CITATIONS.coverage || [];
        CITATIONS.external_referenced = CITATIONS.external_referenced || [];
        // VALIDATED pasal-level rollup (build_citation_authority.py) — the SINGLE
        // source for topology/authority/chord so the numbers match the clickable
        // pasal evidence (e.g. UU ITE = 5, not the old instrument-scan "39").
        try { const a = await fetch(`./data/network/citation_authority.json?v=${DATA_V}`); CITATIONS.authority = await a.json(); }
        catch (e) { CITATIONS.authority = null; }
        return CITATIONS;
    }
    function _covByDoc() {
        const m = new Map();
        const auth = CITATIONS && CITATIONS.authority && CITATIONS.authority.by_doc;
        if (auth) { Object.keys(auth).forEach(d => m.set(d, { doc: d, in: auth[d].in, out: auth[d].out, role: auth[d].role, juris: auth[d].juris })); return m; }
        ((CITATIONS && CITATIONS.coverage) || []).forEach(c => m.set(c.doc, c));
        return m;
    }
    // directed instrument citation matrix, restricted to `groups`. Uses the validated
    // pasal-level edges (citation_authority.json); falls back to citations.json edges.
    function _citeMatrix(groups) {
        const gi = {}; groups.forEach((g, i) => gi[g] = i);
        const M = groups.map(() => groups.map(() => 0));
        const auth = CITATIONS && CITATIONS.authority && CITATIONS.authority.edges;
        if (auth) {
            auth.forEach(e => { const a = gi[e.source], b = gi[e.target]; if (a == null || b == null || a === b) return; M[a][b] += (e.count || 1); });
            return M;
        }
        ((CITATIONS && CITATIONS.edges) || []).forEach(e => {
            if (!e.in_corpus || !e.corpus_doc) return;
            const a = gi[e.source], b = gi[e.corpus_doc];
            if (a == null || b == null || a === b) return;
            M[a][b] += (e.count || 1);
        });
        return M;
    }

    // ===================================================================
    // EDITABLE NARRATIVE — ui_text_overrides (human-editable claims/captions)
    // Resolution: localStorage(lna_ui_text_v1) > ui_text_overrides.json > default.
    // "Edit Teks" toggle → click dashed text to edit; "Export Teks" → JSON to commit.
    // ===================================================================
    const _UI_TEXT_LS = 'lna_ui_text_v1';
    let UI_TEXT_FILE = null;
    const _UITEXT_DEF = {};
    function _uiLocal() { try { return JSON.parse(localStorage.getItem(_UI_TEXT_LS) || '{}'); } catch (e) { return {}; } }
    async function _ensureUiText() {
        if (UI_TEXT_FILE) return UI_TEXT_FILE;
        try { const r = await fetch(`./data/network/ui_text_overrides.json?v=${DATA_V}`); UI_TEXT_FILE = await r.json(); }
        catch (e) { UI_TEXT_FILE = {}; }
        return UI_TEXT_FILE;
    }
    function _uiText(id, def) {
        const loc = _uiLocal();
        if (id in loc) return loc[id];
        if (UI_TEXT_FILE && id in UI_TEXT_FILE) return UI_TEXT_FILE[id];
        return def;
    }
    // editable inline wrapper (HTML-capable); registers the default for reset
    function _editText(id, def) {
        _UITEXT_DEF[id] = def;
        return `<span class="uitext" data-uitext-id="${id}">${_uiText(id, def)}</span>`;
    }
    function _setUiText(id, val) {
        const loc = _uiLocal();
        if (val == null || val === '') delete loc[id]; else loc[id] = val;
        localStorage.setItem(_UI_TEXT_LS, JSON.stringify(loc));
        const resolved = _uiText(id, _UITEXT_DEF[id] != null ? _UITEXT_DEF[id] : '');
        document.querySelectorAll(`[data-uitext-id="${(window.CSS && CSS.escape) ? CSS.escape(id) : id}"]`).forEach(el => { el.innerHTML = resolved; });
    }
    // apply overrides to STATIC [data-uitext-id] nodes authored in index.html
    function _applyStaticUiText() {
        document.querySelectorAll('[data-uitext-id]').forEach(el => {
            const id = el.getAttribute('data-uitext-id');
            if (_UITEXT_DEF[id] == null) _UITEXT_DEF[id] = el.innerHTML;   // capture authored default
            el.innerHTML = _uiText(id, _UITEXT_DEF[id]);
        });
    }
    window.toggleTextEdit = function () {
        const on = document.body.classList.toggle('uitext-editing');
        const btn = document.getElementById('btn-edit-teks');
        if (btn) btn.innerHTML = on
            ? '<span class="material-symbols-rounded" style="font-size:16px;">check</span>'
            : '<span class="material-symbols-rounded" style="font-size:16px;">edit_note</span>';
        if (typeof _toast === 'function') _toast(on ? 'Mode Edit Teks: klik teks bergaris untuk mengubah klaim/narasi.' : 'Mode Edit Teks selesai.');
    };
    function _openTextEditor(id) {
        const el = document.querySelector(`[data-uitext-id="${(window.CSS && CSS.escape) ? CSS.escape(id) : id}"]`);
        if (!el) return;
        let modal = document.getElementById('uitext-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'uitext-modal';
            modal.innerHTML = `<div class="uitext-modal-card">
                <div style="font-weight:700;margin-bottom:6px;color:var(--text-1);">Edit teks <code id="uitext-modal-id" style="font-size:0.72rem;color:var(--text-3);"></code></div>
                <textarea id="uitext-modal-ta" spellcheck="false" style="width:100%;min-height:150px;font-family:inherit;font-size:0.85rem;line-height:1.5;padding:9px;border:1px solid var(--border);border-radius:8px;background:var(--sunken);color:var(--text-1);box-sizing:border-box;"></textarea>
                <div style="font-size:0.72rem;color:var(--text-4);margin:6px 0;">HTML sederhana (mis. &lt;b&gt;…&lt;/b&gt;) diperbolehkan. Kosongkan lalu Simpan untuk kembali ke teks asli. Simpan tersimpan di browser ini; klik "Export Teks" untuk file yang bisa di-commit.</div>
                <div style="display:flex;gap:8px;justify-content:flex-end;">
                    <button class="btn-secondary btn-sm" onclick="document.getElementById('uitext-modal').style.display='none'">Batal</button>
                    <button class="btn-secondary btn-sm" id="uitext-modal-reset">↺ Teks asli</button>
                    <button class="btn-secondary btn-sm" id="uitext-modal-save" style="background:var(--primary);color:#fff;border-color:var(--primary);">Simpan</button>
                </div></div>`;
            document.body.appendChild(modal);
        }
        modal.style.display = 'flex';
        modal.querySelector('#uitext-modal-id').textContent = id;
        const ta = modal.querySelector('#uitext-modal-ta');
        ta.value = el.innerHTML.trim();
        modal.querySelector('#uitext-modal-save').onclick = () => { _setUiText(id, ta.value.trim()); modal.style.display = 'none'; };
        modal.querySelector('#uitext-modal-reset').onclick = () => { _setUiText(id, ''); modal.style.display = 'none'; };
    }
    document.addEventListener('click', function (ev) {
        if (!document.body.classList.contains('uitext-editing')) return;
        const t = ev.target.closest('.uitext');
        if (t) { ev.preventDefault(); ev.stopPropagation(); _openTextEditor(t.getAttribute('data-uitext-id')); }
    }, true);
    window.exportUiText = function () {
        const merged = Object.assign({}, UI_TEXT_FILE || {}, _uiLocal());
        Object.keys(merged).forEach(k => { if (merged[k] == null || merged[k] === '') delete merged[k]; });
        if (typeof _downloadBlob === 'function') _downloadBlob(JSON.stringify(merged, null, 2), 'ui_text_overrides.json', 'application/json');
        if (typeof _toast === 'function') _toast(Object.keys(merged).length + ' teks diekspor — commit data/network/ui_text_overrides.json agar permanen.');
    };

    async function renderCitationNetwork() {
        const box = document.getElementById('citation-network');
        if (!box) return;
        const isEn = window.currentLang === 'en';
        const d = await _ensureCitations();
        if (!d.edges || !d.edges.length) { box.innerHTML = '<div class="rp-empty">citations.json tidak ditemukan.</div>'; return; }
        const edges = d.edges || [];
        const internal = edges.filter(e => e.in_corpus).sort((a, b) => b.count - a.count);
        const ext = d.external_referenced || [];
        const topExt = ext.slice(0, 3).map(x => x.id).join(', ');
        const named = edges.filter(e => e.type === 'named').length;
        const ctxOf = (src, tid) => ((d.docs[src] || []).find(c => c.id === tid) || {}).context || '';
        const th = 'text-align:left;padding:7px 12px;color:var(--text-3);font-weight:600;border-bottom:1px solid var(--border);font-size:0.8rem;';
        const td = 'padding:6px 12px;border-bottom:1px solid var(--overlay-hover);font-size:0.82rem;';
        const badge = t => t === 'named'
            ? '<span style="font-size:0.65rem;background:rgba(99,102,241,0.15);color:var(--primary);padding:1px 6px;border-radius:10px;">nama</span>'
            : '<span style="font-size:0.65rem;background:rgba(245,158,11,0.15);color:var(--amber);padding:1px 6px;border-radius:10px;">nomor</span>';

        const note = `<div style="font-size:0.82rem;color:var(--text-3);line-height:1.55;margin-bottom:12px;background:var(--sunken);padding:10px 12px;border-radius:8px;border-left:3px solid var(--primary);">`
            + (isEn
                ? `<b>Defensible links.</b> Unlike the SBERT chord (descriptive semantic overlap), these are <b>explicit citations</b> — a document naming a regulation by number (<i>"Nomor 27 Tahun 2022"</i>) or instrument name (<i>"G20 AI Principles", "OECD", "EU AI Act"</i>). For guidance/soft-law this is the rigorous link. <b>${named}</b> by-name + <b>${edges.length - named}</b> by-number references.`
                : `<b>Tautan defensible.</b> Berbeda dari chord SBERT (tumpang-tindih semantik, deskriptif), ini <b>sitasi eksplisit</b> — dokumen menyebut regulasi lewat nomor (<i>"Nomor 27 Tahun 2022"</i>) atau nama instrumen (<i>"G20 AI Principles", "OECD", "EU AI Act"</i>). Untuk pedoman/soft-law inilah tautan yang sahih. <b>${named}</b> rujukan by-name + <b>${edges.length - named}</b> by-number.`)
            + `<br><b style="color:var(--text-2);">${isEn ? 'Completeness signal' : 'Sinyal kelengkapan'}:</b> `
            + (isEn
                ? `the most-cited references that are NOT themselves in the corpus are <b>${topExt}</b> (Table B) — instruments the analysis may need to include.`
                : `rujukan terbanyak yang dokumennya TIDAK ada di korpus adalah <b>${topExt}</b> (Tabel B) — instrumen yang mungkin perlu dimasukkan ke analisis.`)
            + `</div>`;

        const rowsA = internal.map(e => {
            const c = _rEsc(ctxOf(e.source, e.target));
            return `<tr title="${c}"><td style="${td}"><b style="color:var(--text-1);">${_rEsc(_citeDoc(e.source))}</b></td>`
                + `<td style="${td}color:var(--text-4);text-align:center;">→</td>`
                + `<td style="${td}color:var(--text-2);">${_rEsc(e.name)}</td>`
                + `<td style="${td}text-align:center;">${badge(e.type)}</td>`
                + `<td style="${td}text-align:right;font-weight:700;color:var(--primary);">${e.count}×</td></tr>`;
        }).join('');
        const tableA = `<div style="font-size:0.74rem;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.4px;margin:4px 0 4px;">${isEn ? 'A · Citations to instruments IN the corpus' : 'A · Sitasi ke instrumen YANG ADA di korpus'}</div>`
            + _exportBar('cite-internal', 'Sitasi_Internal')
            + `<div id="cite-internal"><table style="width:100%;border-collapse:collapse;">`
            + `<thead><tr><th style="${th}">${isEn ? 'Document' : 'Dokumen'}</th><th style="${th}"></th><th style="${th}">${isEn ? 'Cites' : 'Merujuk'}</th><th style="${th};text-align:center;">${isEn ? 'Type' : 'Tipe'}</th><th style="${th};text-align:right;">${isEn ? 'Count' : 'Jumlah'}</th></tr></thead>`
            + `<tbody>${rowsA || `<tr><td colspan="5" style="${td}text-align:center;color:var(--text-4);">—</td></tr>`}</tbody></table></div>`;

        const rowsB = ext.map(x => `<tr><td style="${td}color:var(--text-2);">${_rEsc(x.id)}</td>`
            + `<td style="${td}color:var(--text-3);">${_rEsc(x.name && x.name !== x.id ? x.name : '')}</td>`
            + `<td style="${td}text-align:right;font-weight:700;color:var(--amber);">${x.count}×</td></tr>`).join('');
        const tableB = `<div style="font-size:0.74rem;font-weight:700;color:var(--text-3);text-transform:uppercase;letter-spacing:0.4px;margin:16px 0 4px;">${isEn ? 'B · Referenced but NOT in corpus (completeness gap)' : 'B · Dirujuk tapi TIDAK ADA di korpus (gap kelengkapan)'}</div>`
            + _exportBar('cite-external', 'Sitasi_Eksternal_Gap')
            + `<div id="cite-external"><table style="width:100%;border-collapse:collapse;">`
            + `<thead><tr><th style="${th}">${isEn ? 'Referenced regulation/instrument' : 'Regulasi/instrumen dirujuk'}</th><th style="${th}">${isEn ? 'Note' : 'Catatan'}</th><th style="${th};text-align:right;">${isEn ? 'Count' : 'Jumlah'}</th></tr></thead>`
            + `<tbody>${rowsB || `<tr><td colspan="3" style="${td}text-align:center;color:var(--text-4);">—</td></tr>`}</tbody></table></div>`;

        // Table C (per-document participation) removed — it was redundant with the
        // interactive "PRIMER: Authority by explicit citation" table (same coverage
        // numbers, just sorted/columned differently and non-clickable).
        box.innerHTML = _editText('caveat-citation-panel', note) + tableA + tableB;
    }
    window.renderCitationNetwork = renderCitationNetwork;

    // ===================================================================
    // GAP ANALYSIS — Warrant Mapping Matrix (incidents × legal subject)
    // Built from the SAME validated judge + human overrides (live), not a graph.
    // ===================================================================
    async function renderGapMatrix() {
        const box = document.getElementById('network-gap');
        if (!box) return;
        const isEn = window.currentLang === 'en';
        if (!RADIAL.data) { try { const r = await fetch(`./data/network/radial_incident.json?v=${DATA_V}`); RADIAL.data = await r.json(); } catch (e) { box.innerHTML = '<div class="rp-empty">Gagal memuat data.</div>'; return; } }
        if (!RADIAL.cands) { try { const r = await fetch(`./data/network/llm_edge_confidence.json?v=${DATA_V}`); RADIAL.cands = (await r.json()).incidents || {}; } catch (e) { RADIAL.cands = {}; } }
        const incs = RADIAL.data.nodes.filter(n => n.type === 'incident');
        const RLABEL = { pelaku: isEn ? 'Perpetrator' : 'Pelaku', pse: 'Operator/PSE', konsumen: isEn ? 'Consumer' : 'Konsumen', regulator: 'Regulator' };
        const bySec = {}; incs.forEach(n => { const s = n.group || n.sector || '?'; (bySec[s] = bySec[s] || []).push(n); });
        const tot = { pelaku: 0, pse: 0, konsumen: 0, regulator: 0 }; let N = 0;
        let rows = '';
        Object.keys(bySec).sort((a, b) => bySec[b].length - bySec[a].length).forEach(sec => {
            rows += `<tr><td colspan="5" style="background:var(--sunken);font-weight:700;font-size:0.76rem;padding:6px 10px;color:var(--text-2);">${_rEsc(sec)} · ${bySec[sec].length}</td></tr>`;
            bySec[sec].forEach(n => {
                N++;
                const iid = n.id.replace('CASE_', '');
                const lblEsc = String(n.label || '').replace(/'/g, "\\'");
                const rel = (RADIAL.cands[iid] || []).map(r => ({ r, e: _eff(iid, r) })).filter(x => x.e.relevant);
                const cells = _ROLE_KEYS.map(role => {
                    const hits = rel.filter(x => (x.e.roles || []).includes(role));
                    if (hits.length) {
                        tot[role]++;
                        const titles = hits.map(h => nodeCode(h.r.regulation_label)).join(', ');
                        const rev = hits.some(h => h.e.reviewed);
                        return `<td title="${_rEsc(titles)}" style="text-align:center;background:${ROLE_META[role].c}22;color:${ROLE_META[role].c};font-weight:800;">✓${rev ? '<span style="color:#10b981;font-size:0.7em;">●</span>' : ''}</td>`;
                    }
                    return `<td style="text-align:center;color:var(--text-4);opacity:0.4;">–</td>`;
                }).join('');
                rows += `<tr style="border-bottom:1px solid var(--border);"><td style="padding:5px 10px;font-size:0.76rem;cursor:pointer;color:var(--primary);" title="${isEn ? 'review in Analisis Kasus' : 'tinjau di tab Analisis Kasus'}" onclick="navigateTo('section-incident')">${_rEsc(n.code || iid)}</td>${cells}</tr>`;
            });
        });
        const denom = N || 1;
        const th = role => `<th style="padding:7px 6px;font-size:0.74rem;color:${ROLE_META[role].c};border-bottom:2px solid var(--border);">${RLABEL[role]}<br><span style="font-weight:800;">${Math.round(100 * tot[role] / denom)}%</span></th>`;
        box.style.overflow = 'auto'; box.style.background = 'var(--bg-card)';
        box.innerHTML = `<div style="padding:10px 14px;font-size:0.78rem;color:var(--text-3);line-height:1.5;">${L_GAP(isEn, _revCount())}</div>
          <table style="width:100%;border-collapse:collapse;font-size:0.82rem;">
            <thead><tr>
              <th style="text-align:left;padding:7px 10px;font-size:0.74rem;color:var(--text-3);border-bottom:2px solid var(--border);">${isEn ? 'Incident' : 'Insiden'} (${N})</th>
              ${_ROLE_KEYS.map(th).join('')}
            </tr></thead><tbody>${rows}</tbody></table>`;
        const leg = document.getElementById('legend-gap');
        if (leg) leg.innerHTML = `<span style="font-size:11px;color:var(--text-2);">✓ = ${isEn ? 'a legal basis binds this subject' : 'ada dasar hukum yang mengikat subjek itu'} · <span style="color:#10b981;">●</span> = ${isEn ? 'human-reviewed' : 'ditinjau manusia'} · – = ${isEn ? 'gap' : 'tidak ada'} · ${isEn ? 'hover a ✓ for the article' : 'arahkan ke ✓ untuk lihat pasalnya'}</span>`;
        const tb = document.getElementById('tbody-metrics-gap');
        if (tb) tb.innerHTML = _ROLE_KEYS.map(role => `<tr><td style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--text-2);">${RLABEL[role]}</td><td style="padding:8px 12px;text-align:right;border-bottom:1px solid var(--border);font-weight:700;color:${ROLE_META[role].c};">${Math.round(100 * tot[role] / denom)}%</td><td style="padding:8px 12px;border-bottom:1px solid var(--border);color:var(--text-3);font-size:0.8rem;">${tot[role]}/${N} ${isEn ? 'incidents with a basis for this subject' : 'insiden punya dasar hukum utk subjek ini'}</td></tr>`).join('');
        _attachMetricsExport('gap', 'Metrik_Gap_Subjek');
    }
    function L_GAP(isEn, nrev) {
        return isEn
            ? `<b>Warrant Mapping Matrix</b> — each incident × legal subject. ✓ = a validated/​reviewed legal basis binds that subject; – = none (gap). Empty cells expose the asymmetry (widest gap: the regulator/supervision column). Reflects your review live (${nrev} reviewed); validate roles in <b>Analisis Kasus</b>. Relevance validated vs expert review (κ 0.94); role is LLM-proposed until reviewed.`
            : `<b>Warrant Mapping Matrix</b> — tiap insiden × subjek hukum. ✓ = ada dasar hukum (tervalidasi/​ditinjau) yang mengikat subjek itu; – = tidak ada (gap). Sel kosong menampakkan asimetri (gap terlebar: kolom regulator/pengawasan). Ikut tinjauan Anda secara langsung (${nrev} ditinjau); validasi peran di tab <b>Analisis Kasus</b>. Relevansi tervalidasi telaah manusia (κ 0.94); peran usulan LLM sampai ditinjau.`;
    }
    window.exportGapCSV = function () {
        if (!RADIAL.data || !RADIAL.cands) { showToast(window.currentLang === 'en' ? 'Open the Gap tab first.' : 'Buka tab Gap dulu.', 'warning'); return; }
        const isEn = window.currentLang === 'en';
        const rows = [['incident', 'sector', 'subject', 'covered', 'regulations', 'reviewed']];
        RADIAL.data.nodes.filter(n => n.type === 'incident').forEach(n => {
            const iid = n.id.replace('CASE_', '');
            const rel = (RADIAL.cands[iid] || []).map(r => ({ r, e: _eff(iid, r) })).filter(x => x.e.relevant);
            _ROLE_KEYS.forEach(role => {
                const hits = rel.filter(x => (x.e.roles || []).includes(role));
                rows.push([n.code || iid, n.group || n.sector || '', role, hits.length ? 1 : 0, hits.map(h => h.r.regulation_label).join(' | '), hits.some(h => h.e.reviewed) ? 1 : 0]);
            });
        });
        _downloadBlob(_toCSV(rows), `Warrant_Matrix_${isEn ? 'EN' : 'ID'}.csv`, 'text/csv;charset=utf-8;');
        _toast(isEn ? 'CSV downloaded.' : 'CSV berhasil diunduh.');
    };

    // ===================================================================
    // AI TAB SWITCHER
    // ===================================================================
    window.switchAITab = function (tabId) {
        document.querySelectorAll('.ai-tab-panel').forEach(p => p.classList.remove('active'));
        document.querySelectorAll('.ai-tab-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`tab-${tabId}`).classList.add('active');
        document.getElementById(`tab-btn-${tabId}`).classList.add('active');
    };

    // ===================================================================
    // COMPLIANCE NAVIGATOR (Rule-Based + AI)
    // ===================================================================
    const COMPLIANCE_RULE_DB = {
        fintech: {
            recommendation: [
                { status: 'covered', title: 'UU PDP Ps. 16-23 (Prinsip Pemrosesan Data)', prov: ['UU_PDP_No27_2022 - Pasal 16', 'UU_PDP_No27_2022 - Pasal 23'], verify: ['pemrosesan'], desc: 'Pemrosesan data nasabah wajib memiliki dasar hukum yang sah. Relevan untuk setiap pemrosesan data oleh AI.', recom: 'Pastikan data nasabah yang diproses AI memiliki dasar hukum eksplisit (persetujuan/kontrak/kewajiban hukum).' },
                { status: 'partial', title: 'POJK 11/POJK.03/2022 Penyelenggaraan TI Bank Umum', ext: 'POJK 11/POJK.03/2022, mencabut POJK 38/POJK.03/2016; sumber: ojk.go.id — di luar korpus verbatim', desc: 'Mengatur penyelenggaraan teknologi informasi oleh bank umum termasuk manajemen risiko TI dan keamanan siber (menggantikan POJK 38/POJK.03/2016). Berlaku untuk bank umum — untuk LJK nonbank berlaku POJK 4/POJK.05/2021 — dan tidak spesifik untuk AI.', recom: 'Interpretasikan ketentuan "sistem yang berdampak material" sebagai mencakup model AI Anda.' },
                { status: 'partial', title: 'POJK 40/2024 LPBBTI (Fintech Lending)', ext: 'POJK 40/2024 mencabut POJK 77/2016 (via POJK 10/2022); sumber: ojk.go.id — di luar korpus verbatim', desc: 'Menggantikan POJK 77/2016 (dicabut via POJK 10/2022, lalu POJK 40/2024). Berlaku untuk fintech lending; tetap tidak mengatur algoritma credit scoring secara spesifik.', recom: 'Dokumentasikan metodologi credit scoring sebagai bagian dari prosedur operasional yang wajib dilaporkan.' },
                { status: 'gap', title: '⚠️ Sandbox AI-Spesifik Sektor Keuangan', desc: 'POJK 3/2024 menyediakan Regulatory Sandbox sektor keuangan (Pasal 6–11), tetapi BELUM ADA ketentuan sandbox yang spesifik untuk inovasi berbasis AI.', recom: 'Manfaatkan Sandbox POJK 3/2024 untuk uji coba; advokasikan ke OJK untuk kerangka sandbox AI-spesifik.' },
                { status: 'gap', title: '⚠️ Kewajiban Audit Bias Algoritma', desc: 'BELUM ADA kewajiban hukum untuk mengaudit bias dalam model credit scoring.', recom: 'Lakukan internal bias audit secara berkala. Persiapkan dokumentasi untuk kemungkinan regulasi mendatang.' },
            ]
        },
        facial: {
            recommendation: [
                { status: 'partial', title: 'UU PDP Ps. 4(2)(b) (Data Biometrik = Data Spesifik)', prov: ['UU_PDP_No27_2022 - Pasal 4', 'UU_PDP_No27_2022 - Pasal 20', 'UU_PDP_No27_2022 - Pasal 34'], verify: ['biometrik'], desc: 'Data wajah termasuk data biometrik yang dikategorikan sebagai Data Pribadi bersifat spesifik (Pasal 4 ayat (2) huruf b UU PDP). Pemrosesan berbasis persetujuan wajib memakai persetujuan yang sah secara eksplisit (Pasal 20 ayat (2) huruf a) dan penilaian dampak karena berisiko tinggi (Pasal 34).', recom: 'Dapatkan persetujuan eksplisit tertulis sebelum mengumpulkan dan memproses data wajah; lakukan DPIA.' },
                { status: 'partial', title: 'PP PSTE 71/2019 Ps. 23-24 (Pengamanan SE)', prov: ['PP_PSTE_No71_2019 - Pasal 23', 'PP_PSTE_No71_2019 - Pasal 24'], verify: ['pengamanan'], desc: 'PSE wajib mengamankan komponen sistem elektronik serta memiliki prosedur dan sarana pengamanan untuk mencegah gangguan, kegagalan, dan kerugian. Berlaku untuk sistem FR sebagai PSE.', recom: 'Implementasikan enkripsi data biometrik at-rest dan in-transit, lakukan security audit berkala.' },
                { status: 'gap', title: '⚠️ Izin Penggunaan FR di Ruang Publik', desc: 'BELUM ADA regulasi yang mengatur penggunaan facial recognition di ruang publik.', recom: 'Adopsi prinsip "Privacy by Design" secara sukarela. Hindari penggunaan FR untuk mass surveillance.' },
                { status: 'gap', title: '⚠️ Standar Akurasi & Anti-Bias FR', desc: 'BELUM ADA standar teknis akurasi dan anti-diskriminasi untuk sistem FR di Indonesia.', recom: 'Patuhi standar internasional (NIST Face Recognition Vendor Test). Uji akurasi untuk semua kelompok demografis.' },
            ]
        },
        ecommerce: {
            recommendation: [
                { status: 'covered', title: 'UU Perdagangan Ps. 65 (Informasi Produk)', ext: 'UU 7/2014 tentang Perdagangan Pasal 65; di luar korpus verbatim', desc: 'Wajib memberikan informasi produk yang benar dalam transaksi elektronik.', recom: 'Pastikan rekomendasi AI tidak menyesatkan konsumen tentang kualitas atau harga produk.' },
                { status: 'partial', title: 'UU Perlindungan Konsumen Ps. 7', ext: 'UU 8/1999 tentang Perlindungan Konsumen Pasal 7; di luar korpus verbatim', desc: 'Pelaku usaha wajib memberikan informasi yang benar, jelas, dan jujur.', recom: 'Interpretasikan sebagai kewajiban transparansi minimal tentang cara kerja sistem rekomendasi Anda.' },
                { status: 'gap', title: '⚠️ Kewajiban Transparansi Algoritma Ranking', desc: 'BELUM ADA kewajiban mengungkap faktor penentu ranking produk kepada merchant.', recom: 'Terapkan prinsip transparency secara sukarela: informasikan merchant tentang faktor yang mempengaruhi ranking.' },
                { status: 'gap', title: '⚠️ Larangan Self-Preferencing', desc: 'BELUM ADA regulasi yang melarang platform memprioritaskan produknya sendiri di algoritma.', recom: 'Siapkan dokumentasi untuk membuktikan netralitas algoritma. Kembangkan mekanisme naik banding merchant.' },
            ]
        },
        content: {
            recommendation: [
                { status: 'partial', title: 'UU ITE Ps. 27 ayat (1) (Konten Melanggar Kesusilaan)', prov: ['UU_ITE_No1_2024 - Pasal 27', 'UU_ITE_No1_2024 - Pasal 45'], verify: ['kesusilaan'], desc: 'Pasal 27 ayat (1) UU ITE (sttd UU 1/2024) jo. Pasal 45 ayat (1) melarang penyebaran konten yang melanggar kesusilaan; dapat menjangkau deepfake asusila. Untuk deepfake seksual nonkonsensual lihat juga Pasal 14 UU 12/2022 (TPKS). Catatan: Pasal 27A mengatur pencemaran nama baik, bukan asusila.', recom: 'Implementasikan content moderation aktif dan mekanisme pelaporan konten deepfake non-konsensual.' },
                { status: 'partial', title: 'UU ITE Ps. 28 ayat (3) (Pemberitahuan Bohong)', prov: ['UU_ITE_No1_2024 - Pasal 28', 'UU_ITE_No1_2024 - Pasal 45A'], verify: ['bohong'], desc: 'Pasal 28 ayat (3) UU ITE (sttd UU 1/2024) jo. Pasal 45A melarang penyebaran pemberitahuan bohong yang menimbulkan kerusuhan — dasar untuk deepfake politik; ayat (1) hanya mencakup informasi bohong yang merugikan konsumen dalam transaksi elektronik.', recom: 'Terapkan sistem deteksi otomatis konten deepfake dan label mandatory pada konten AI.' },
                { status: 'covered', title: 'UU Hak Cipta Ps. 9 (Hak Ekonomi)', ext: 'UU 28/2014 tentang Hak Cipta Pasal 9; di luar korpus verbatim', desc: 'Melindungi karya cipta. Konten AI yang menggunakan dataset berhak cipta harus diperhatikan.', recom: 'Pastikan tidak menggunakan data berhak cipta untuk training tanpa lisensi yang tepat.' },
                { status: 'gap', title: '⚠️ Kewajiban Label/Watermark Konten AI', desc: 'BELUM ADA kewajiban hukum pelabelan konten yang dihasilkan AI.', recom: 'Terapkan watermark/metadata secara sukarela. Ikuti standar C2PA (Coalition for Content Provenance).' },
                { status: 'gap', title: '⚠️ Akuntabilitas Penyedia Model Generatif', desc: 'BELUM ADA regulasi yang menetapkan tanggung jawab penyedia model AI atas konten berbahaya.', recom: 'Implementasikan usage policy yang ketat dan mekanisme take-down dalam 24 jam.' },
            ]
        },
        judicial: {
            recommendation: [
                { status: 'covered', title: 'UU Kekuasaan Kehakiman Ps. 1 & 19', ext: 'UU 48/2009 Pasal 1 angka 1 & Pasal 19; di luar korpus verbatim', desc: 'Kekuasaan kehakiman adalah kekuasaan negara yang merdeka (Pasal 1 angka 1) dan dijalankan oleh hakim sebagai pejabat negara (Pasal 19 dst.). AI tidak dapat menggantikan keputusan hakim.', recom: 'AI harus diposisikan sebagai alat bantu non-determinatif. Hakim wajib memiliki reasoning independen.' },
                { status: 'partial', title: 'KUHAP Ps. 183 (Standar Pembuktian)', ext: 'KUHAP (UU 8/1981) Pasal 183; di luar korpus verbatim', desc: 'Standar pembuktian pidana minimum 2 alat bukti. Status bukti AI belum diatur.', recom: 'Dokumentasikan validitas dan reliabilitas model AI yang digunakan sebagai referensi. Tidak dijadikan satu-satunya bukti.' },
                { status: 'gap', title: '⚠️ Regulasi AI di Peradilan', desc: 'BELUM ADA regulasi yang secara eksplisit mengatur penggunaan AI dalam proses peradilan.', recom: 'Ikuti prinsip Mahkamah Agung tentang transparansi putusan. Dokumentasikan setiap penggunaan alat AI.' },
                { status: 'gap', title: '⚠️ Hak Terdakwa atas Informasi AI', desc: 'BELUM ADA hak eksplisit terdakwa untuk mengetahui bagaimana AI menilai kasusnya.', recom: 'Terapkan prinsip explainability wajib kepada pihak yang terdampak keputusan AI.' },
            ]
        },
        health: {
            recommendation: [
                { status: 'covered', title: 'UU Kesehatan No. 17/2023', ext: 'UU 17/2023 tentang Kesehatan; di luar korpus verbatim', desc: 'Mengatur standar layanan kesehatan. AI diagnostik wajib memenuhi standar klinis.', recom: 'Pastikan AI diagnostik mendapat persetujuan Kemenkes dan memiliki evidence klinis yang memadai.' },
                { status: 'partial', title: 'UU PDP Ps. 4(2)(a) (Data Kesehatan = Data Spesifik)', prov: ['UU_PDP_No27_2022 - Pasal 4', 'UU_PDP_No27_2022 - Pasal 34'], verify: ['kesehatan'], desc: 'Data dan informasi kesehatan dikategorikan sebagai Data Pribadi bersifat spesifik (Pasal 4 ayat (2) huruf a UU PDP); pemrosesannya berisiko tinggi sehingga wajib penilaian dampak pelindungan data pribadi (Pasal 34).', recom: 'Terapkan enkripsi penuh dan kontrol akses ketat; lakukan DPIA untuk data kesehatan yang diproses AI.' },
                { status: 'gap', title: '⚠️ Regulasi AI Diagnostik Medis', desc: 'BELUM ADA regulasi khusus untuk AI yang digunakan dalam diagnosis medis di Indonesia.', recom: 'Ikuti standar internasional FDA AI/ML-Based Software for Medical Devices. Dokumentasikan validasi klinis.' },
            ]
        },
        government: {
            recommendation: [
                { status: 'covered', title: 'Perpres 95/2018 SPBE', ext: 'Perpres 95/2018 tentang Sistem Pemerintahan Berbasis Elektronik; di luar korpus verbatim', desc: 'Kerangka Sistem Pemerintahan Berbasis Elektronik. Berlaku untuk semua sistem AI pemerintah.', recom: 'Pastikan sistem AI terdaftar dan diaudit sebagai bagian dari infrastruktur SPBE.' },
                { status: 'partial', title: 'UU PDP Ps. 2, 34 & 53 (Pemerintah sebagai Badan Publik)', prov: ['UU_PDP_No27_2022 - Pasal 2', 'UU_PDP_No27_2022 - Pasal 34', 'UU_PDP_No27_2022 - Pasal 53'], verify: ['Badan Publik'], desc: 'Pemerintah sebagai Badan Publik tunduk pada UU PDP (Pasal 2 ayat (1)) dalam pemrosesan data warga.', recom: 'Tunjuk pejabat/petugas fungsi Pelindungan Data Pribadi (DPO) sesuai Pasal 53 ayat (1) huruf a dan lakukan penilaian dampak pelindungan data pribadi (DPIA, Pasal 34) untuk setiap sistem AI baru yang berisiko tinggi.' },
                { status: 'gap', title: '⚠️ Panduan Pengadaan AI Pemerintah', desc: 'BELUM ADA panduan khusus pengadaan dan evaluasi sistem AI untuk instansi pemerintah.', recom: 'Gunakan OECD AI Procurement Checklist sebagai referensi sementara. Dorong BRIN/Kemkominfo untuk menerbitkan panduan.' },
            ]
        },
        other: {
            recommendation: [
                { status: 'partial', title: 'UU PDP Ps. 2 (Ruang Lingkup)', prov: ['UU_PDP_No27_2022 - Pasal 2'], verify: ['Badan Publik'], desc: 'UU PDP berlaku untuk Setiap Orang, Badan Publik, dan Organisasi Internasional yang memproses data pribadi, termasuk efek ekstrateritorial (Pasal 2 ayat (1)), dengan pengecualian pemrosesan oleh orang perseorangan dalam kegiatan pribadi atau rumah tangga (Pasal 2 ayat (2)).', recom: 'Identifikasi semua data pribadi yang diproses oleh sistem AI Anda dan pastikan memiliki dasar hukum yang sah.' },
                { status: 'partial', title: 'UU ITE (Sistem Elektronik)', desc: 'Jika sistem AI dioperasikan sebagai PSE, wajib tunduk pada PP PSTE dan UU ITE.', recom: 'Daftarkan sistem AI sebagai PSE jika melayani publik melalui sistem elektronik.' },
                { status: 'gap', title: '⚠️ Regulasi AI Sektoral Spesifik', desc: 'Belum ada regulasi AI horizontal yang mencakup semua sektor di Indonesia.', recom: 'Pantau perkembangan regulasi melalui BRIN, Kominfo, dan Kemenko. Terapkan prinsip-prinsip OECD AI secara sukarela.' },
            ]
        }
    };

    window.runComplianceNavigator = function () {
        const sector = document.getElementById('cn-sector').value;
        const aiType = document.getElementById('cn-ai-type').value;
        if (!sector) {
            showToast('Silakan pilih sektor industri terlebih dahulu.', 'warning');
            return;
        }

        const rules = COMPLIANCE_RULE_DB[sector] || COMPLIANCE_RULE_DB['other'];
        const resultContainer = document.getElementById('cn-regulation-results');

        resultContainer.innerHTML = rules.recommendation.map(item => `
            <div class="compliance-result-card ${item.status}">
                <span class="material-symbols-rounded compliance-result-${item.status}" style="font-size:22px;">
                    ${item.status === 'covered' ? 'check_circle' : item.status === 'partial' ? 'warning' : 'cancel'}
                </span>
                <div class="compliance-result-info">
                    <h5>${item.title}</h5>
                    <p>${item.desc}</p>
                    <div class="recom">💡 ${item.recom}</div>
                </div>
            </div>
        `).join('');

        // Show panel 2, update step indicators
        document.getElementById('cn-panel-2').style.display = 'block';
        document.getElementById('cn-step-1').classList.replace('active', 'done');
        document.getElementById('cn-step-2').classList.add('active');
        document.querySelectorAll('.cn-connector')[0]?.classList.add('active');

        // Store for AI use
        resultContainer.dataset.sector = sector;
        resultContainer.dataset.aiType = aiType;
        resultContainer.dataset.desc = document.getElementById('cn-description').value;
        resultContainer.dataset.rules = JSON.stringify(rules.recommendation);

        // Scroll to panel 2
        document.getElementById('cn-panel-2').scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    window.runComplianceAI = async function () {
        const resultContainer = document.getElementById('cn-regulation-results');
        const sector = resultContainer.dataset.sector || '';
        const aiType = resultContainer.dataset.aiType || '';
        const desc = resultContainer.dataset.desc || '';
        const rules = resultContainer.dataset.rules || '[]';

        const providerSelect = document.getElementById('ai-provider-select');
        const prov = providerSelect ? providerSelect.value : 'gemini';
        const apiKey = document.getElementById('ai-api-key').value.trim() ||
            localStorage.getItem(prov === 'groq' ? 'groq_api_key' : 'gemini_api_key');

        if (!apiKey) {
            showToast('Silakan simpan API Key terlebih dahulu di tab Argumentasi Toulmin.', 'warning');
            return;
        }

        const modelSelect = document.getElementById('ai-model-select');
        const selectedModel = modelSelect ? modelSelect.value : (prov === 'groq' ? 'llama-3.3-70b-versatile' : 'gemini-1.5-flash');
        const cnAIBtn = document.getElementById('btn-cn-ai');
        const cnAIResponse = document.getElementById('cn-ai-recommendation');

        cnAIBtn.disabled = true;
        cnAIBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;">hourglass_empty</span> AI sedang menganalisis...';
        cnAIResponse.innerHTML = '<div class="loading">AI sedang menyusun panduan kepatuhan konkret...</div>';

        const sectorNames = {
            fintech: 'Keuangan & Fintech AI',
            facial: 'Facial Recognition / Biometrik',
            ecommerce: 'E-Commerce & Perdagangan Digital',
            content: 'AI-Generated Content / Media',
            judicial: 'Peradilan & Hukum',
            health: 'Kesehatan',
            government: 'Pemerintahan / SPBE',
            other: 'Sektor Umum'
        };
        const aiTypeNames = {
            recommendation: 'Sistem Rekomendasi / Ranking',
            biometric: 'Pengenalan Wajah / Biometrik',
            generative: 'AI Generatif',
            predictive: 'AI Prediktif',
            nlp: 'NLP / Chatbot',
            decision: 'Sistem Pendukung Keputusan',
            automation: 'Otomasi Proses'
        };

        // Grounding (audit 2026-07-18): resolve kunci prov tiap entri ke teks pasal
        // VERBATIM — pola yang sama dengan tab Toulmin — supaya LLM tidak pernah
        // mengelaborasi peta kurasi menjadi ayat/huruf yang tidak ada.
        const PT = await _ensureProvisionTexts();
        const ruleList = JSON.parse(rules);
        const provKeys = [...new Set(ruleList.flatMap(r => r.prov || []))];
        const verbatim = provKeys.map(k => `[${k}]: ${(PT[k] || 'TEKS TIDAK TERSEDIA').slice(0, 700)}`).join('\n\n');

        const prompt = `Anda adalah konsultan hukum AI senior yang membantu praktisi di Indonesia mematuhi regulasi yang berlaku.
Yang dimaksud "praktisi" dalam konteks ini mencakup kolaborasi DUA PIHAK sekaligus: Praktisi Hukum (Legal/Compliance) dan Praktisi Teknologi (Developer/Engineer) yang selalu berpusat pada keamanan dan hak pengguna.

Klien memiliki profil berikut:
- **Sektor:** ${sectorNames[sector] || sector}
- **Jenis AI:** ${aiTypeNames[aiType] || aiType}
- **Deskripsi Aktivitas:** ${desc || '(tidak dideskripsikan)'}

**Peta regulasi (kurasi manual tervalidasi; entri "ext" merujuk regulasi di luar korpus verbatim):**
${ruleList.map(r => `- [${r.status.toUpperCase()}] ${r.title}: ${r.desc}`).join('\n')}

**TEKS PASAL VERBATIM (satu-satunya dasar sitasi pasal — hasil OCR PDF resmi):**
${verbatim || '(tidak ada pasal korpus untuk sektor ini — gunakan peta di atas pada tingkat regulasi saja)'}

**ATURAN SITASI (WAJIB):** Kutip pasal HANYA yang tercantum pada teks verbatim di atas atau pada judul peta. JANGAN mengarang atau menyimpulkan ayat/huruf yang tidak terlihat eksplisit dalam teks verbatim — bila struktur internal pasal tidak terbaca jelas, kutip pada tingkat pasal saja (mis. "Pasal 4 UU PDP", bukan "Pasal 4 ayat (2) huruf b") .

Berikan **Panduan Kepatuhan Konkret** dalam format berikut:

## 🎯 Ringkasan Posisi Kepatuhan
Jelaskan secara singkat posisi legal sistem AI yang sedang dibangun: apakah aman, perlu perhatian, atau berisiko tinggi bagi developer maupun perusahaan?

## ✅ Tindakan Wajib (Immediate Action Items)
Daftar 3-5 tindakan konkret dari sisi manajerial/hukum dan arsitektur teknis. 
**PENTING: Anda WAJIB menyebutkan nama regulasi beserta nomor pasalnya secara eksplisit (sesuai Peta Regulasi LNA di atas) pada setiap poin sebagai landasan argumen Anda.**

## ⚠️ Area Kelabu (Gap AI-spesifik yang Perlu Diantisipasi)
Identifikasi 2-3 area di mana regulasi AI-spesifik belum ada (gap AI-spesifik — catat bila statuta umum spt UU ITE/UU PDP masih berlaku analogis, hindari klaim "vakum absolut"), dan bagaimana tim legal & developer harus merancang mitigasi.

## 🛡️ Praktik Terbaik Internasional yang Direkomendasikan
Berdasarkan OECD AI Principles, EU AI Act, dan CETS225, rekomendasikan 3 praktik teknis dan tata kelola yang sebaiknya diadopsi walaupun belum diwajibkan oleh hukum positif Indonesia.

## 📋 Dokumentasi yang Harus Disiapkan
Daftar dokumen hukum (mis. klausul consent, DPIA) dan artefak teknis (mis. audit log, bias testing report) yang perlu didokumentasikan.

**INSTRUKSI KRITIS:** 
- Gunakan bahasa yang dapat dipahami dan ditindaklanjuti secara teknis oleh *developer/engineer* sekaligus sah secara rujukan hukum oleh *tim legal*.
- Jangan pernah memberikan anjuran "Tindakan Wajib" tanpa menyebutkan secara eksplisit rujukan Aturan/Pasal yang mendasarinya (jika tersedia).`;

        try {
            let aiText = '';
            if (prov === 'groq') {
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                    body: JSON.stringify({
                        model: selectedModel,
                        messages: [
                            { role: 'system', content: 'Anda adalah konsultan hukum AI dan regulasi teknologi yang berpengalaman di Indonesia.' },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.3
                    })
                });
                if (!res.ok) { const d = await res.json(); throw new Error(d.error?.message || 'Groq Error'); }
                const data = await res.json();
                aiText = data.choices[0].message.content;
            } else {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.3 }
                    })
                });
                if (!res.ok) { const d = await res.json(); throw new Error(d.error?.message || 'Gemini Error'); }
                const data = await res.json();
                aiText = data.candidates[0].content.parts[0].text;
            }

            cnAIResponse.innerHTML = marked.parse(aiText);

            // Update step 3
            document.getElementById('cn-step-2').classList.replace('active', 'done');
            document.getElementById('cn-step-3').classList.add('active');
            document.querySelectorAll('.cn-connector')[1]?.classList.add('active');

        } catch (error) {
            // Force log caught error to backend so AI can read it
            fetch('/api/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: "CAUGHT runCN_AI: " + error.message,
                    stack: error.stack || ''
                })
            });
            
            cnAIResponse.innerHTML = `<div style="color:#ef4444; border:1px solid rgba(239,68,68,0.3); background:rgba(239,68,68,0.05); padding:1rem; border-radius:8px;">
                <strong>Gagal menghubungi AI:</strong> ${error.message}
            </div>`;
        } finally {
            cnAIBtn.disabled = false;
            cnAIBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;">smart_toy</span> Dapatkan Panduan AI';
        }
    };

    window.resetComplianceNavigator = function () {
        document.getElementById('cn-panel-2').style.display = 'none';
        document.getElementById('cn-sector').value = '';
        document.getElementById('cn-ai-type').value = '';
        document.getElementById('cn-description').value = '';
        document.getElementById('cn-ai-recommendation').innerHTML = '<span style="font-style:italic; color:var(--text-3);">Klik tombol di bawah untuk mendapatkan panduan kepatuhan konkret dari AI berdasarkan profil dan regulasi Anda.</span>';
        document.getElementById('cn-step-1').className = 'compliance-step active';
        document.getElementById('cn-step-2').className = 'compliance-step';
        document.getElementById('cn-step-3').className = 'compliance-step';
        document.querySelectorAll('.cn-connector').forEach(c => c.classList.remove('active'));
    };

    // ===================================================================
    // AI FEATURE (Toulmin Argumentation)
    // ===================================================================
    async function initAIFeature() {
        const apiKeyInput = document.getElementById('ai-api-key');
        const saveBtn = document.getElementById('save-api-key');
        const providerSelect = document.getElementById('ai-provider-select');
        const modelSelect = document.getElementById('ai-model-select');

        function updateProviderUI() {
            if (!providerSelect || !apiKeyInput || !modelSelect) return;
            const prov = providerSelect.value;
            modelSelect.innerHTML = '<option value="">⚙️ Tekan Simpan untuk Melacak API Model</option>';
            if (prov === 'groq') {
                apiKeyInput.placeholder = 'Masukkan Groq API Key (gsk_...)';
                apiKeyInput.value = localStorage.getItem('groq_api_key') || '';
            } else {
                apiKeyInput.placeholder = 'Masukkan Google Gemini API Key...';
                apiKeyInput.value = localStorage.getItem('gemini_api_key') || '';
            }
        }

        if (providerSelect) { providerSelect.addEventListener('change', updateProviderUI); updateProviderUI(); }

        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                const key = apiKeyInput.value.trim();
                if (!key) return;
                const prov = providerSelect.value;
                saveBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;">hourglass_empty</span> Melacak Model...';
                saveBtn.style.background = '#f59e0b';

                try {
                    if (prov === 'groq') {
                        localStorage.setItem('groq_api_key', key);
                        const res = await fetch('https://api.groq.com/openai/v1/models', { headers: { 'Authorization': `Bearer ${key}` } });
                        const data = await res.json();
                        if (data.data) {
                            modelSelect.innerHTML = '';
                            data.data.filter(m => !m.id.includes('whisper') && !m.id.includes('stub')).sort().forEach(m => {
                                const opt = document.createElement('option');
                                opt.value = m.id; opt.textContent = m.id;
                                if (m.id.includes('versatile') || m.id.includes('70b')) opt.selected = true;
                                modelSelect.appendChild(opt);
                            });
                        } else throw new Error('Invalid');
                    } else {
                        localStorage.setItem('gemini_api_key', key);
                        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
                        const data = await res.json();
                        if (data.models) {
                            modelSelect.innerHTML = '';
                            data.models.forEach(m => {
                                if (m.supportedGenerationMethods?.includes('generateContent')) {
                                    const opt = document.createElement('option');
                                    const modelId = m.name.replace('models/', '');
                                    opt.value = modelId; opt.textContent = m.displayName || modelId;
                                    modelSelect.appendChild(opt);
                                }
                            });
                        } else throw new Error('Invalid');
                    }
                    saveBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;">check_circle</span> Tersambung!';
                    saveBtn.style.background = '#10b981';
                } catch (e) {
                    saveBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;">error</span> API Key Invalid';
                    saveBtn.style.background = '#ef4444';
                }
                setTimeout(() => {
                    saveBtn.innerHTML = '<span class="material-symbols-rounded" style="font-size:18px;">key</span> Simpan & Deteksi Model';
                    saveBtn.style.background = '';
                }, 3000);
            });
        }

        // Load Incidents for Dropdown
        try {
            const res = await fetch(`./data/network/legal_graph.json?v=${DATA_V}`);
            aiNetworkData = await res.json();
            aiIncidentNodes = aiNetworkData.nodes.filter(n => n.group === 'Insiden Kasus');
            const selectEl = document.getElementById('ai-incident-select');
            if (selectEl) {
                aiIncidentNodes.sort((a, b) => (b.year || 2024) - (a.year || 2024));
                aiIncidentNodes.forEach(inc => {
                    const opt = document.createElement('option');
                    opt.value = inc.id;
                    opt.textContent = `[${inc.year || ''}] ${inc.label}`;
                    selectEl.appendChild(opt);
                });
                selectEl.addEventListener('change', updateAIContextPanel);
            }
        } catch (e) { console.error('Gagal memuat graph untuk AI', e); }

        const analyzeBtn = document.getElementById('btn-analyze-ai');
        if (analyzeBtn) analyzeBtn.addEventListener('click', runAIToulmin);
    }

    async function updateAIContextPanel() {
        const selectEl = document.getElementById('ai-incident-select');
        const incidentId = selectEl.value;
        const contextBody = document.getElementById('ai-context-body');
        if (!incidentId) {
            contextBody.innerHTML = 'Pilih insiden untuk melihat warrant (dasar hukum) tervalidasi & tinjauan Anda.';
            return;
        }
        const isEn = window.currentLang === 'en';
        // Warrants come from the validated few-shot judge + YOUR human review (same
        // source as the radial/sector) — NOT cosine similarity — so the Toulmin
        // reasoning is grounded in the corrected analysis.
        if (!RADIAL.cands) { try { const r = await fetch(`./data/network/llm_edge_confidence.json?v=${DATA_V}`); RADIAL.cands = (await r.json()).incidents || {}; } catch (e) { RADIAL.cands = {}; } }
        await _ensureProvisionTexts();
        const iid = incidentId.replace('CASE_', '');
        const incidentNode = aiIncidentNodes.find(n => n.id === incidentId);
        const grounds = incidentNode?.content || incidentNode?.label || 'Data teks tidak tersedia.';
        const warr = (RADIAL.cands[iid] || []).map(r => ({ r, e: _eff(iid, r) }))
            .filter(x => x.e.relevant).sort((a, b) => b.r.confidence - a.r.confidence);
        const roleNames = roles => (roles || []).map(x => ROLE_META[x] ? (isEn ? ROLE_META[x].en : ROLE_META[x].id) : x).join(', ') || '—';

        let html = `<div style="margin-bottom:16px;">
            <h5 style="color:var(--rose); font-family:Outfit; margin-bottom:6px; font-size:0.95rem;">⬤ <strong>Grounds</strong> — ${isEn ? 'Incident facts' : 'Data Empiris Insiden'}</h5>
            <div style="background:var(--sunken); padding:10px; border-radius:6px; border-left:3px solid #fca5a5; font-size:0.82rem; line-height:1.5;">${_rEsc(grounds)}</div>
        </div>
        <div><h5 style="color:#10b981; font-family:Outfit; margin-bottom:6px; font-size:0.95rem;">⬤ <strong>Warrant</strong> — ${warr.length} ${isEn ? 'legal basis (validated judge + your review)' : 'dasar hukum (judge tervalidasi + tinjauan Anda)'}</h5>`;
        if (!warr.length) {
            html += `<p style="font-size:0.82rem; font-style:italic; color:var(--text-3);">⚠️ ${isEn ? 'No validated AI-specific warrant — an AI-specific gap. General statutes (UU ITE/PDP) may still apply by analogy.' : 'Tidak ada warrant AI-spesifik tervalidasi — gap AI-spesifik. Statuta umum (UU ITE/PDP) mungkin masih berlaku secara analogis.'}</p>`;
        } else {
            warr.forEach(({ r, e }) => {
                const txt = (PROVISION_TEXTS[r.regulation_label] || '').slice(0, 240);
                html += `<div style="background:var(--sunken); padding:10px; border-radius:6px; border-left:3px solid #10b981; font-size:0.82rem; margin-bottom:8px; line-height:1.5;">
                    <strong style="color:var(--text-2); display:block;">${_rEsc(nodeFull(r.regulation_label))} ${e.reviewed ? '<span style="color:#10b981;" title="ditinjau manusia">✔</span>' : ''}</strong>
                    <span style="font-size:0.74rem;color:var(--text-4);">${isEn ? 'binds' : 'mengikat'}: ${_rEsc(roleNames(e.roles))}</span>
                    <div style="margin-top:3px;color:var(--text-3);">${_rEsc(txt)}${txt.length >= 240 ? '…' : ''}</div>
                </div>`;
            });
        }
        html += '</div>';
        contextBody.innerHTML = html;
        contextBody.dataset.incidentText = grounds;
        contextBody.dataset.regText = warr.map(({ r, e }) => `[${r.regulation_label}] (subjek terikat: ${(e.roles || []).join('/') || '—'}${e.reviewed ? '; DIVALIDASI MANUSIA' : ''}): ${PROVISION_TEXTS[r.regulation_label] || r.regulation_label}`).join('\n\n');
        contextBody.dataset.regCount = warr.length;
    }

    async function runAIToulmin() {
        const providerSelect = document.getElementById('ai-provider-select');
        const prov = providerSelect ? providerSelect.value : 'gemini';
        const apiKey = document.getElementById('ai-api-key').value.trim() ||
            localStorage.getItem(prov === 'groq' ? 'groq_api_key' : 'gemini_api_key');

        if (!apiKey) { showToast(`API Key ${prov.toUpperCase()} belum diisi!`, 'error'); return; }

        const modelSelect = document.getElementById('ai-model-select');
        const selectedModel = modelSelect?.value || (prov === 'groq' ? 'llama-3.3-70b-versatile' : 'gemini-1.5-flash');
        const selectEl = document.getElementById('ai-incident-select');
        if (!selectEl.value) { showToast('Pilih insiden terlebih dahulu.', 'warning'); return; }

        const contextBody = document.getElementById('ai-context-body');
        const incidentText = contextBody.dataset.incidentText || '';
        const regText = contextBody.dataset.regText || '';
        const regCount = contextBody.dataset.regCount || '0';
        const responseBody = document.getElementById('ai-response-body');

        responseBody.innerHTML = '<div class="loading">AI sedang membangun argumentasi Toulmin...</div>';

        const prompt = `Anda adalah Ahli AI Governance dan Hukum Siber Indonesia. Lakukan analisis forensik hukum menggunakan **Model Argumentasi Toulmin** berbasis Legal Network Analysis (LNA).

**PENTING: Fokus analisis ini bukan sekadar membuktikan kekosongan hukum, tetapi memberikan gambaran ASIMETRI REGULASI dan REKOMENDASI KONKRET yang dapat ditindaklanjuti oleh pembuat kebijakan dan praktisi.**

Struktur jawaban Anda HARUS mengikuti 6 unsur Toulmin + 1 bagian rekomendasi:

---

### 1. CLAIM (Klaim)
Rumuskan klaim: apa bentuk asimetri normatif yang terjadi antara teknologi yang terlibat dengan regulasi yang tersedia?

### 2. GROUNDS (Data / Bukti Empiris)
Uraikan fakta insiden: pelaku, korban, mekanisme, dampak, dan konteks teknologi AI yang terlibat.

### 3. WARRANT (Kaidah Penghubung)
Analisis ${regCount} regulasi yang terdeteksi LNA: apakah warrant ini secara substantif mencakup peristiwa? Identifikasi kekuatan, kelemahan, dan celah setiap pasal yang relevan.

### 4. BACKING (Dukungan Normatif Global)
Perkuat dengan standar internasional yang relevan (OECD AI Principles, EU AI Act, CETS225). Tunjukkan bagaimana Indonesia seharusnya mengadopsi norma ini namun belum melakukannya.

### 5. QUALIFIER (Tingkat Kepastian)
Gunakan data kuantitatif LNA: ${regCount} pasal terdeteksi, jelaskan tingkat kepastian klaim (pasti/kemungkinan besar/dugaan) beserta alasannya.

### 6. REBUTTAL (Bantahan & Kesimpulan Asimetri Subjek)
Identifikasi bantahan. Kemudian nyatakan (HINDARI klaim "vakum absolut" — bedakan ketiadaan norma AI-spesifik dari keberlakuan statuta umum secara analogis):
- Jika tidak ada warrant AI-spesifik → **Gap AI-spesifik** (sebutkan apakah statuta umum spt UU ITE/UU PDP masih dapat diterapkan secara analogis, dan untuk SUBJEK hukum mana yang terjangkau/tidak)
- Jika warrant ada tapi timpang antar-subjek → **Asimetri Subjek Hukum (pelaku terjangkau, konsumen/regulator tipis)**
- Jika warrant kuat & menyeluruh → **Instrumen Cukup, Perlu Penegakan**

### 7. REKOMENDASI KONKRET (Action Items)
Berdasarkan temuan di atas, berikan **3-5 rekomendasi spesifik** yang berbeda dari studi terdahulu:
- Bentuk regulasi yang dibutuhkan (sektoral/horizontal/sandbox)
- Lembaga yang harus bertindak (DPR/Kemkominfo/OJK/MA/BRIN)
- Jangka waktu urgensi (segera/1-2 tahun/jangka panjang)

---

**DATA GROUNDS (Fakta Insiden):**
${incidentText}

**DATA WARRANT (dasar hukum dari LLM-judge Claude tervalidasi telaah manusia (warrant-operatif κ=0.94) + tinjauan manusia; "DIVALIDASI MANUSIA" = sudah ditinjau ahli. Gunakan HANYA pasal-pasal ini sebagai warrant; jangan mengarang pasal lain):**
${regText || 'TIDAK ADA WARRANT AI-SPESIFIK TERVALIDASI (gap AI-spesifik) — nyatakan ini sebagai gap AI-spesifik, BUKAN vakum hukum absolut; pertimbangkan apakah statuta umum (UU ITE/UU PDP) masih berlaku secara analogis.'}
`;

        try {
            let aiText = '';
            if (prov === 'groq') {
                const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
                    body: JSON.stringify({
                        model: selectedModel,
                        messages: [
                            { role: 'system', content: 'Anda adalah Analis Hukum AI Governance yang tegas, berbasis data, dan berorientasi rekomendasi konkret.' },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.25
                    })
                });
                if (!res.ok) { const d = await res.json(); throw new Error(d.error?.message || 'Groq Error'); }
                const data = await res.json();
                aiText = data.choices[0].message.content;
            } else {
                const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.25 }
                    })
                });
                if (!res.ok) { const d = await res.json(); throw new Error(d.error?.message || 'Gemini Error'); }
                const data = await res.json();
                aiText = data.candidates[0].content.parts[0].text;
            }
            responseBody.innerHTML = marked.parse(aiText);
        } catch (error) {
            // Force log caught error to backend so AI can read it
            fetch('/api/log', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: "CAUGHT runAIToulmin: " + error.message,
                    stack: error.stack || ''
                })
            });
            responseBody.innerHTML = `<div style="color:#ef4444; border:1px solid rgba(239,68,68,0.3); background:rgba(239,68,68,0.05); padding:1rem; border-radius:8px;">
                <strong>Gagal mengakses AI:</strong> ${error.message}
            </div>`;
        }
    }

    // ===================================================================
    // EXPORT & FILTERING (PNG, CSV, Filter Isolated)
    // ===================================================================
    window.toggleIsolatedNodes = function(graphId) {
        const inst = networkInstances[graphId];
        if (!inst) { showToast('Graph belum dirender.', 'warning'); return; }
        if (inst.isChord) { _chordSelect(graphId, null); return; }  // chord: clear selection

        inst.isolatedHidden = !inst.isolatedHidden;
        const { netData, network } = inst;

        // Operate on the nodes that are ACTUALLY rendered (the 4 similarity graphs
        // are already pruned to connected + strongest links, so updating against the
        // full graph would inject phantom nodes). Connectivity from rendered edges.
        const renderedNodes = netData.nodes.get();
        const connectedSet = new Set();
        netData.edges.get().forEach(e => { connectedSet.add(e.from); connectedSet.add(e.to); });

        let visibleNodeIds = [];
        if (inst.isolatedHidden) {
            netData.nodes.update(renderedNodes.map(n => {
                const isHidden = !connectedSet.has(n.id);
                if (!isHidden) visibleNodeIds.push(n.id);
                return { id: n.id, hidden: isHidden };
            }));
            showToast('Node tak terhubung disembunyikan. Hanya node terhubung yang tampil.', 'success');
        } else {
            netData.nodes.update(renderedNodes.map(n => {
                visibleNodeIds.push(n.id);
                return { id: n.id, hidden: false };
            }));
            showToast('Semua node yang dirender ditampilkan kembali.', 'success');
        }
        
        // Stabilize and refit the view strictly around the VISIBLE nodes
        setTimeout(() => {
            if (visibleNodeIds.length > 0) {
                network.fit({ nodes: visibleNodeIds, animation: { duration: 800, easingFunction: 'easeInOutQuad' } });
            } else {
                network.fit({ animation: { duration: 800, easingFunction: 'easeInOutQuad' } });
            }
        }, 100);
    };

    // ── THEME TOGGLE (light default ⇄ dark) ───────────────────────────
    window.toggleTheme = function () {
        const html = document.documentElement;
        const next = html.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
        html.setAttribute('data-theme', next);
        try { localStorage.setItem('theme', next); } catch (e) {}
        const icon = document.getElementById('theme-icon');
        if (icon) icon.textContent = next === 'dark' ? 'light_mode' : 'dark_mode';
        // Recolour graph labels (canvas can't inherit CSS variables)
        const gf = (getComputedStyle(html).getPropertyValue('--graph-font') || '#ffffff').trim();
        Object.values(networkInstances || {}).forEach(inst => {
            try { inst.network.setOptions({ nodes: { font: { color: gf } } }); } catch (e) {}
        });
    };
    // Sync the toggle icon with the active theme on load
    (function () {
        const t = document.documentElement.getAttribute('data-theme') || 'light';
        const icon = document.getElementById('theme-icon');
        if (icon) icon.textContent = t === 'dark' ? 'light_mode' : 'dark_mode';
    })();

    window.exportGraphPNG = function(graphId, filename) {
        const inst = networkInstances[graphId];
        if (inst && inst.isChord) { _svgToPng('network-' + graphId, 'Chord_' + graphId + '_' + ((CHORD[graphId] && CHORD[graphId].mode) || 'citation') + '.png'); return; }
        if (!inst || !inst.network) { showToast('Graph belum selesai dirender.', 'error'); return; }

        showToast('Memproses High-Resolution Export (4K), mohon tunggu...', 'info');

        const network = inst.network;
        const savedScale = network.getScale();
        const savedPos = network.getViewPosition();
        const container = window.document.getElementById(`network-${graphId}`);

        // Target Pixel Ratio untuk High-Res (contoh: 4x Retina)
        const targetRatio = 4;
        const originalRatio = window.devicePixelRatio || 1;

        // Trik: Mock global devicePixelRatio agar vis-network me-render buffer kanvas lebih besar
        Object.defineProperty(window, 'devicePixelRatio', { get: () => targetRatio, configurable: true });
        
        // Pancing vis-network untuk meresize canvas internal sesuai DPR 4x
        network.setSize(container.clientWidth + 'px', container.clientHeight + 'px');

        // Font putih tak akan terlihat di PNG putih, set ke gelap
        network.setOptions({ nodes: { font: { color: '#1e293b' } } });

        // Fit to the nodes that are actually rendered (the graph is pruned to the
        // strongest links); respect the hide-isolated toggle on top of that.
        let visibleNodeIds = [];
        const renderedNodes = inst.netData.nodes.get();
        if (inst.isolatedHidden) {
            const connectedSet = new Set();
            inst.netData.edges.get().forEach(e => { connectedSet.add(e.from); connectedSet.add(e.to); });
            renderedNodes.forEach(n => { if (connectedSet.has(n.id)) visibleNodeIds.push(n.id); });
        } else {
            visibleNodeIds = renderedNodes.map(n => n.id);
        }

        // KEMBALIKAN AUTO FIT: karena sekarang topologi padat, auto-fit tidak akan membuat debu
        if (visibleNodeIds.length > 0) {
            network.fit({ nodes: visibleNodeIds, animation: false });
        } else {
            network.fit({ animation: false });
        }
        
        // Paksa redraw agar buffer layar baru terisi sebelum timer berjalan
        network.redraw();
        // Tunggu 3 frame agar resize dan custom font selesai di-render
        requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(() => {
            try {
                const canvas = network.canvas.frame.canvas;
                
                // Gunakan canvas baru sebagai alas (background putih 4K)
                const out = document.createElement('canvas');
                out.width = canvas.width;
                out.height = canvas.height;
                const ctx = out.getContext('2d');

                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, out.width, out.height);
                ctx.drawImage(canvas, 0, 0);

                const link = document.createElement('a');
                link.download = filename || `LNA_${graphId}_HighRes.png`;
                link.href = out.toDataURL('image/png', 1.0);
                link.click();
                showToast('Gambar berhasil diunduh.', 'success');

            } catch (e) {
                showToast('Export PNG gagal: ' + e.message, 'error');
            }

            // --- RESTORE SEPERTI SEMULA ---
            // Kembalikan rasio layar ke original dan trigger resize lagi
            Object.defineProperty(window, 'devicePixelRatio', { get: () => originalRatio, configurable: true });
            network.setSize(container.clientWidth + 'px', container.clientHeight + 'px');
            
            // Kembalikan font dan posisi / skala kamera
            network.setOptions({ nodes: { font: { color: (getComputedStyle(document.documentElement).getPropertyValue('--graph-font') || '#ffffff').trim() } } });
            network.moveTo({
                scale: savedScale,
                position: savedPos,
                animation: { duration: 600, easingFunction: 'easeInOutQuad' }
            });
        })));
    };


    // ===================================================================
    // METRICS TABLE — Populate inline HTML table after graph stabilizes
    // ===================================================================
    // CITATION-based topology (sitir-menyitir). SBERT semantic-overlap metrics removed.
    // Reads the validated pasal-level rollup (_covByDoc / _citeMatrix → citation_authority.json)
    // so every number matches the clickable PRIMER authority table and drill-down.
    async function populateMetricsTable(graphId, graphData) {
        const tbody = document.getElementById(`tbody-metrics-${graphId}`);
        if (!tbody) return;
        const isEn = typeof window !== 'undefined' && window.currentLang === 'en';
        await _ensureCitations();
        const cov = _covByDoc();
        // instrument universe for THIS tab (node.group === citation doc id)
        const groups = [...new Set(graphData.nodes.map(n => n.group))].filter(g => g && cov.has(g));
        const M = _citeMatrix(groups);
        let links = 0, pairs = 0, crossEdges = 0;
        for (let i = 0; i < groups.length; i++) for (let j = 0; j < groups.length; j++) {
            if (M[i][j] > 0) {
                links += M[i][j]; pairs++;
                const ji = (cov.get(groups[i]) || {}).juris, jj = (cov.get(groups[j]) || {}).juris;
                if (ji && jj && ji !== jj) crossEdges++;
            }
        }
        const nInst = groups.length;
        const inOf = d => (cov.get(d) || {}).in || 0;
        const outOf = d => (cov.get(d) || {}).out || 0;
        const isolated = groups.filter(d => inOf(d) === 0 && outOf(d) === 0);
        const sources = groups.filter(d => (cov.get(d) || {}).role === 'source');
        const authority = groups.slice().sort((a, b) => inOf(b) - inOf(a))[0];
        const density = pairs / Math.max(nInst * (nInst - 1), 1);
        const showCross = (graphId === 'all' || graphId === 'cross');

        const densityLabel = density < 0.02 ? (isEn ? '🟡 Sparse network' : '🟡 Jaringan jarang')
            : density < 0.08 ? (isEn ? '🟡 Moderately sparse' : '🟡 Cukup jarang') : (isEn ? '🟢 Moderate' : '🟢 Moderat');

        const rows = [
            [isEn ? 'Total Instruments' : 'Total Instrumen', nInst, isEn ? 'Legal instruments in this tab’s citation network' : 'Instrumen hukum dalam jaringan sitasi tab ini'],
            [isEn ? 'Citation Links' : 'Tautan Sitasi', links, isEn ? 'Explicit cross-references (citing) between instruments' : 'Rujukan-silang eksplisit (sitir-menyitir) antar instrumen'],
            [isEn ? 'Connected Pairs' : 'Pasangan Terhubung', pairs, isEn ? 'Distinct instrument→instrument citation pairs' : 'Pasangan instrumen→instrumen yang saling menyitir'],
            [isEn ? 'Citation Density' : 'Densitas Sitasi', density.toFixed(4), densityLabel],
            [isEn ? 'Authority Hub (most cited)' : 'Hub Otoritas (disitir terbanyak)', authority && inOf(authority) ? inOf(authority) + '×' : '—',
                authority && inOf(authority) ? `${_citeDoc(authority)} ${isEn ? 'cited' : 'disitir'} ${inOf(authority)}× — ${isEn ? 'defensible authority by explicit citation' : 'otoritas defensible dari sitasi eksplisit'}` : (isEn ? 'no inbound citation' : 'tak ada sitasi masuk')],
            [isEn ? 'Source/leaf instruments (cited 0×)' : 'Instrumen sumber/daun (disitir 0×)', sources.length, isEn ? 'Cite others but are never cited back (mostly soft-law)' : 'Menyitir lain tapi tak pernah dirujuk balik (umumnya soft-law)'],
            [isEn ? 'Isolated by citation' : 'Terisolasi menurut sitasi', isolated.length, isolated.length === 0 ? (isEn ? '✅ none' : '✅ tidak ada') : `${isolated.length} ${isEn ? 'instrument(s)' : 'instrumen'}`],
        ];
        if (showCross) rows.push([isEn ? 'Cross-jurisdiction citations' : 'Sitasi lintas-yurisdiksi', crossEdges,
            crossEdges === 0 ? (isEn ? '🔴 GAP — no explicit Intl↔National citation' : '🔴 GAP — tak ada sitasi eksplisit Intl↔Nasional') : `${crossEdges}`]);

        const colorClass = (val, metric) => {
            if ((metric.includes('Densitas') || metric.includes('Density')) && parseFloat(val) < 0.02) return '#fbbf24';
            if ((metric.includes('lintas-yurisdiksi') || metric.includes('Cross-jurisdiction')) && parseInt(val) === 0) return '#fb7185';
            if ((metric.includes('Terisolasi') || metric.includes('Isolated')) && parseInt(val) > 0) return '#fbbf24';
            return '#34d399';
        };
        tbody.innerHTML = rows.map(([metrik, nilai, implikasi]) => `
            <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:9px 12px; color:var(--text-2); font-weight:500;">${metrik}</td>
                <td style="padding:9px 12px; text-align:right; font-family:monospace; font-weight:700; color:${colorClass(nilai, metrik)};">${nilai}</td>
                <td style="padding:9px 12px; color:var(--text-3); font-size:0.82rem; line-height:1.4;">${implikasi}</td>
            </tr>
        `).join('');
        _attachMetricsExport(graphId, `Metrik_Sitasi_${graphId}`);
        if (typeof applyTranslations === 'function') applyTranslations();
    }

    // ===================================================================
    // NODE RANKING TABLE — per-node degree / centrality (+ betweenness)
    // ===================================================================
    function computeBetweenness(ids, adj) {
        // Brandes' algorithm (unweighted, undirected); normalized 0..1.
        const CB = {}; ids.forEach(v => CB[v] = 0);
        for (const s of ids) {
            const S = [], P = {}, sigma = {}, d = {};
            ids.forEach(t => { P[t] = []; sigma[t] = 0; d[t] = -1; });
            sigma[s] = 1; d[s] = 0;
            const Q = [s];
            while (Q.length) {
                const v = Q.shift(); S.push(v);
                for (const w of (adj[v] || [])) {
                    if (d[w] < 0) { d[w] = d[v] + 1; Q.push(w); }
                    if (d[w] === d[v] + 1) { sigma[w] += sigma[v]; P[w].push(v); }
                }
            }
            const delta = {}; ids.forEach(t => delta[t] = 0);
            while (S.length) {
                const w = S.pop();
                for (const v of P[w]) delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
                if (w !== s) CB[w] += delta[w];
            }
        }
        const n = ids.length;
        const norm = n > 2 ? (n - 1) * (n - 2) : 1;   // undirected normalization
        ids.forEach(v => { CB[v] = CB[v] / norm; });
        return CB;
    }

    // ── Provision full-text viewer (audit the analysis by reading the article) ──
    let PROVISION_TEXTS = null;
    async function _ensureProvisionTexts() {
        if (PROVISION_TEXTS) return PROVISION_TEXTS;
        try { const r = await fetch(`./data/network/provision_texts.json?v=${DATA_V}`); PROVISION_TEXTS = await r.json(); }
        catch (e) { PROVISION_TEXTS = {}; }
        return PROVISION_TEXTS;
    }
    let _PROV_CUR = { label: '', text: '' };
    window.showProvisionText = async function (label) {
        const isEn = window.currentLang === 'en';
        const map = await _ensureProvisionTexts();
        const txt = map[label] || '';
        _PROV_CUR = { label, text: txt };
        const body = txt
            ? `<div style="white-space:pre-wrap;line-height:1.7;font-size:0.92rem;color:var(--text-2);">${_rEsc(txt)}</div>`
            : `<div class="rp-empty" style="padding:1rem 0;">${isEn ? 'Full text unavailable — use Edit to add it as an override.' : 'Teks lengkap belum tersedia — pakai Edit untuk menambah lewat override.'}</div>`;
        const old = document.getElementById('provmodal'); if (old) old.remove();
        const m = document.createElement('div');
        m.id = 'provmodal';
        m.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:24px;';
        m.innerHTML = `<div style="background:var(--bg-card);max-width:680px;width:100%;max-height:82vh;overflow:auto;border-radius:14px;border:1px solid var(--border);box-shadow:0 24px 60px rgba(0,0,0,0.45);padding:1.4rem 1.6rem;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;">
              <div style="min-width:0;">
                <div class="rp-eyebrow">${_rEsc(_abbrInst(String(label || '').split(' - ')[0]))}</div>
                <div class="rp-title" style="font-size:1.12rem;">${_rEsc(nodeFull(label))}</div>
                <div style="font-size:0.72rem;color:var(--text-4);font-family:ui-monospace,Menlo,monospace;margin-top:3px;word-break:break-all;">${_rEsc(label)}</div>
              </div>
              <div style="display:flex;gap:6px;flex-shrink:0;">
                <button onclick="_provToggleEdit()" class="btn-secondary btn-sm" title="${isEn ? 'Edit & export as override' : 'Edit & ekspor sebagai override'}"><span class="material-symbols-rounded" style="font-size:14px;">edit</span> ${isEn ? 'Edit' : 'Edit'}</button>
                <button onclick="document.getElementById('provmodal').remove()" style="border:none;background:var(--overlay-soft);width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:16px;color:var(--text-2);">✕</button>
              </div>
            </div>
            <div id="provtext-view" style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);">${body}</div>
            <div id="provtext-edit" style="display:none;margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);">
              <textarea id="provtext-area" style="width:100%;min-height:240px;box-sizing:border-box;font-size:0.9rem;line-height:1.6;padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--sunken);color:var(--text-1);font-family:inherit;">${_rEsc(txt)}</textarea>
              <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px;">
                <button onclick="_provCopyOverride()" class="btn-secondary btn-sm"><span class="material-symbols-rounded" style="font-size:14px;">content_copy</span> ${isEn ? 'Copy as override (JSON)' : 'Salin sebagai override (JSON)'}</button>
                <button onclick="_provToggleEdit()" class="btn-secondary btn-sm">${isEn ? 'Back to view' : 'Kembali ke tampilan'}</button>
              </div>
              <div style="font-size:0.72rem;color:var(--text-4);margin-top:8px;line-height:1.5;">${isEn
                ? 'Paste the copied line into <code>data/network/provision_texts_overrides.json</code>, then run <code>python build_provision_texts.py</code> and redeploy. Overrides win and are never auto-overwritten.'
                : 'Tempel baris yang disalin ke <code>data/network/provision_texts_overrides.json</code>, lalu jalankan <code>python build_provision_texts.py</code> dan deploy ulang. Override selalu menang & tak akan tertimpa otomatis.'}</div>
            </div>
            <div style="margin-top:0.9rem;font-size:0.72rem;color:var(--text-4);">${isEn ? 'Source: extracted from the official regulation PDF (auto-extraction may contain OCR noise).' : 'Sumber: diekstrak dari PDF regulasi resmi (ekstraksi otomatis bisa mengandung noise OCR).'}</div>
          </div>`;
        m.onclick = ev => { if (ev.target === m) m.remove(); };
        document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { const x = document.getElementById('provmodal'); if (x) x.remove(); document.removeEventListener('keydown', esc); } });
        document.body.appendChild(m);
    };
    window._provToggleEdit = function () {
        const v = document.getElementById('provtext-view'), e = document.getElementById('provtext-edit');
        if (!v || !e) return;
        const editing = e.style.display !== 'none';
        v.style.display = editing ? '' : 'none';
        e.style.display = editing ? 'none' : 'block';
        if (!editing) { const a = document.getElementById('provtext-area'); if (a) a.focus(); }
    };
    window._provCopyOverride = function () {
        const a = document.getElementById('provtext-area'); if (!a) return;
        const val = a.value.replace(/\s+/g, ' ').trim();
        const snippet = '  ' + JSON.stringify(_PROV_CUR.label) + ': ' + JSON.stringify(val) + ',';
        const isEn = window.currentLang === 'en';
        navigator.clipboard.writeText(snippet).then(
            () => _toast(isEn ? 'Override copied — paste into provision_texts_overrides.json' : 'Override tersalin — tempel ke provision_texts_overrides.json'),
            () => { window.prompt(isEn ? 'Copy this line:' : 'Salin baris ini:', snippet); }
        );
    };

    // The exploratory SBERT semantic-overlap ranking table was removed (semantic
    // overlap is descriptive, not legal authority). Only the PRIMARY citation-based
    // authority ranking is rendered now; this just hosts it.
    function populateRankingTable(graphId, graphData) {
        const tb = document.getElementById(`tbody-metrics-${graphId}`);
        if (!tb) return;
        const anchor = tb.closest('table');
        if (!anchor) return;
        let cont = document.getElementById(`ranking-${graphId}`);
        if (!cont) {
            cont = document.createElement('div');
            cont.id = `ranking-${graphId}`;
            const after = document.getElementById(`metricsbar-${graphId}`) || anchor;
            after.insertAdjacentElement('afterend', cont);
        }
        cont.innerHTML = `<div id="authrank-${graphId}"></div>`;
        _renderAuthorityRanking(graphId, graphData);   // PRIMARY citation-authority table (async)
    }

    // PRIMARY authority ranking — instrument-level, by explicit-citation in-degree (defensible)
    async function _renderAuthorityRanking(graphId, graphData) {
        const host = document.getElementById(`authrank-${graphId}`);
        if (!host) return;
        const pc = await _ensureProvCites();
        const isEn = window.currentLang === 'en';
        const groupsHere = new Set(graphData.nodes.map(n => n.group));
        // Disitir/Menyitir are computed from the AUDITABLE pasal-level layer
        // (provision_citations.json) — every count is one clickable, full-text,
        // deduped, Gemini-judged passage, so the number ALWAYS matches the drill-down.
        const CROSS = new Set(['regulation', 'named', 'pasal_external']);
        const stat = {};
        const ens = dk => stat[dk] || (stat[dk] = { doc: dk, in: 0, out: 0 });
        groupsHere.forEach(dk => ens(dk));

        // For cross-jurisdiction: build jurisdiction lookup and only count cross-jurisdiction citations
        const isCross = graphId === 'cross';
        let _jurisMap = null;
        if (isCross) {
            _jurisMap = new Map();
            const cov = _covByDoc();
            groupsHere.forEach(dk => {
                const j = (cov.get(dk) || {}).juris;
                if (j) _jurisMap.set(dk, j);
            });
        }

        (pc.records || []).forEach(r => {
            if (!CROSS.has(r.kind) || r.cited_doc === r.source_doc) return;
            // For cross-jurisdiction tab, only count citations that CROSS jurisdiction boundaries
            if (isCross && _jurisMap) {
                const srcJ = _jurisMap.get(r.source_doc), tgtJ = _jurisMap.get(r.cited_doc);
                if (!srcJ || !tgtJ || srcJ === tgtJ) return;
            }
            if (r.cited_doc && groupsHere.has(r.cited_doc)) ens(r.cited_doc).in++;
            if (groupsHere.has(r.source_doc)) ens(r.source_doc).out++;
        });

        // For cross-jurisdiction: also count from citation_authority.json edges (since provision_citations.json may not have the added edges)
        if (isCross && CITATIONS && CITATIONS.authority) {
            const authEdges = CITATIONS.authority.edges || [];
            authEdges.forEach(e => {
                const srcJ = _jurisMap.get(e.source), tgtJ = _jurisMap.get(e.target);
                if (!srcJ || !tgtJ || srcJ === tgtJ) return;
                // Avoid double counting if provision_citations already counted
                const s = ens(e.source);
                const t = ens(e.target);
                if (s.out === 0) s.out = e.count || 1;
                if (t.in === 0) t.in = e.count || 1;
            });
        }

        let rows = Object.values(stat).filter(c => groupsHere.has(c.doc));
        // For cross-jurisdiction: ONLY show instruments that have cross-jurisdiction connections
        if (isCross) {
            rows = rows.filter(c => c.in > 0 || c.out > 0);
        }
        rows.forEach(c => c.role = (c.in === 0 && c.out === 0) ? 'isolated' : (c.in === 0 ? 'source' : (c.out === 0 ? 'sink' : 'both')));
        rows.sort((a, b) => (b.in - a.in) || (b.out - a.out));
        if (!rows.length) {
            if (isCross) host.innerHTML = `<div style="margin-top:1.25rem;padding:16px;background:var(--sunken);border-radius:8px;font-size:0.82rem;color:var(--text-3);text-align:center;">${isEn ? 'No instruments with cross-jurisdiction citations.' : 'Tidak ada instrumen dengan sitasi lintas-yurisdiksi.'}</div>`;
            else host.innerHTML = '';
            return;
        }
        // Jurisdiction badge for cross tab
        const jurisBadge = (doc) => {
            if (!isCross || !_jurisMap) return '';
            const j = _jurisMap.get(doc);
            if (j === 'NATL') return ' <span style="font-size:0.6rem;background:rgba(16,185,129,0.15);color:#10b981;padding:1px 5px;border-radius:8px;vertical-align:middle;">🇮🇩</span>';
            if (j === 'INTL') return ' <span style="font-size:0.6rem;background:rgba(245,158,11,0.15);color:#f59e0b;padding:1px 5px;border-radius:8px;vertical-align:middle;">🌐</span>';
            return '';
        };
        const rb = {
            both: ['↔ dua arah', 'rgba(16,185,129,0.15)', 'var(--emerald,#10b981)'],
            source: ['→ menyitir', 'rgba(99,102,241,0.15)', 'var(--primary)'],
            sink: ['← disitir', 'rgba(245,158,11,0.15)', 'var(--amber)'],
            isolated: ['● isolated', 'rgba(239,68,68,0.15)', '#ef4444']
        };
        const th = 'text-align:left;padding:7px 12px;color:var(--text-3);font-weight:600;border-bottom:1px solid var(--border);font-size:0.8rem;';
        const td = 'padding:6px 12px;border-bottom:1px solid var(--overlay-hover);font-size:0.82rem;';
        const body = rows.map((c, i) => {
            const b = rb[c.role] || ['—', 'transparent', 'var(--text-3)'];
            const docEsc = String(c.doc).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
            const clickBtn = (val, dir, col) => val > 0
                ? `<button onclick="showCitationContext('${docEsc}','${dir}')" title="${dir === 'in' ? (isEn ? 'Show who cites this — verbatim passages' : 'Lihat siapa yang menyitir ini — cuplikan teks') : (isEn ? 'Show what this instrument cites — verbatim passages' : 'Lihat apa yang disitir instrumen ini — cuplikan teks')}" style="background:none;border:none;cursor:pointer;font-weight:700;color:${col};font-size:0.82rem;text-decoration:underline dotted;text-underline-offset:3px;padding:0;">${val}</button>`
                : `<span style="color:var(--text-4);">0</span>`;
            return `<tr><td style="${td}color:var(--text-4);text-align:right;">${i + 1}</td>`
                + `<td style="${td}"><b style="color:var(--text-1);">${_rEsc(_citeDoc(c.doc))}</b>${jurisBadge(c.doc)} <span onclick="showCitationContext('${docEsc}','all')" title="${isEn ? 'All pasal-level citations (full text)' : 'Semua sitiran antar-pasal (teks utuh)'}" style="cursor:pointer;font-size:0.82rem;opacity:0.7;">📖</span></td>`
                + `<td style="${td}text-align:right;">${clickBtn(c.in, 'in', 'var(--amber)')}</td>`
                + `<td style="${td}text-align:right;">${clickBtn(c.out, 'out', 'var(--primary)')}</td>`
                + `<td style="${td}text-align:center;"><span style="font-size:0.65rem;background:${b[1]};color:${b[2]};padding:1px 6px;border-radius:10px;">${b[0]}</span></td></tr>`;
        }).join('');
        const titleText = isCross
            ? (isEn ? 'Cross-Jurisdiction Citation Links' : 'Tautan Sitasi Lintas-Yurisdiksi')
            : (isEn ? 'PRIMARY: Authority by explicit citation (instrument-level)' : 'PRIMER: Otoritas berdasarkan sitasi eksplisit (level instrumen)');
        const descText = isCross
            ? (isEn ? `Only instruments with at least one <b>cross-jurisdiction</b> citation (NATL↔INTL). ${rows.length} instrument(s) connected.` : `Hanya instrumen yang punya minimal satu sitasi <b>lintas-yurisdiksi</b> (NATL↔INTL). ${rows.length} instrumen terhubung.`)
            : (isEn ? 'Ranked by how often each instrument is <b>cited</b> within the corpus — the defensible authority signal (explicit cross-citation, not textual similarity).' : 'Diurut dari seberapa sering tiap instrumen <b>disitir</b> di dalam korpus — sinyal otoritas yang defensible (sitasi-silang eksplisit, bukan kemiripan teks).');
        host.innerHTML = `<div style="margin-top:1.25rem;overflow-x:auto;">`
            + `<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;"><span class="material-symbols-rounded" style="color:var(--amber);font-size:18px;">verified</span>`
            + `<strong style="font-family:'Outfit';color:var(--text-1);font-size:0.95rem;">${titleText}</strong></div>`
            + `<div style="font-size:0.78rem;color:var(--text-3);margin-bottom:8px;line-height:1.5;">${descText}</div>`
            + (isCross ? '' : `<div style="font-size:0.72rem;color:var(--primary);margin-bottom:8px;display:flex;align-items:center;gap:5px;"><span class="material-symbols-rounded" style="font-size:14px;">touch_app</span><span>${isEn ? 'Tip: click a <b>Cited</b>/<b>Cites</b> number for the pasal passages behind it, or 📖 next to an instrument for <b>all</b> its pasal-level citations (full paragraph text).' : 'Tip: klik angka <b>Disitir</b>/<b>Menyitir</b> untuk cuplikan pasal di baliknya, atau 📖 di sebelah instrumen untuk <b>semua</b> sitiran antar-pasalnya (teks paragraf utuh).'}</span></div>`)
            + _exportBar('authrank-tbl-' + graphId, 'Ranking_Otoritas_Sitasi_' + graphId)
            + `<div id="authrank-tbl-${graphId}"><table style="width:100%;border-collapse:collapse;">`
            + `<thead><tr><th style="${th}text-align:right;">#</th><th style="${th}">${isEn ? 'Instrument' : 'Instrumen'}</th><th style="${th}text-align:right;">${isEn ? 'Cited (in)' : 'Disitir'}</th><th style="${th}text-align:right;">${isEn ? 'Cites (out)' : 'Menyitir'}</th><th style="${th}text-align:center;">${isEn ? 'Role' : 'Peran'}</th></tr></thead>`
            + `<tbody>${body}</tbody></table></div></div>`;
    }

    // PASAL-LEVEL citation drill-down (build_provision_citations.py → provision_citations.json).
    // Each record = a PASAL that cites another pasal/regulation, carrying the FULL verbatim
    // paragraph text of the citing pasal. Modes:
    //   'in'  — passages from OTHER instruments that cite this one (cited_doc === doc)
    //   'out' — passages where THIS instrument cites other instruments (cross-doc)
    //   'all' — every pasal-level citation made by this document (internal + external) = full ground truth
    let PROVCITES = null, _CITE_FETCH_N = 0;
    async function _ensureProvCites(force) {
        if (PROVCITES && !force) return PROVCITES;
        try { const r = await fetch(`./data/network/provision_citations.json?v=${DATA_V}&t=${++_CITE_FETCH_N}`, { cache: 'no-store' }); PROVCITES = await r.json(); }
        catch (e) { if (!PROVCITES) PROVCITES = { records: [] }; }
        PROVCITES.records = PROVCITES.records || [];
        return PROVCITES;
    }
    // is the editing backend (serve.py) available? (static hosting / file:// → false)
    let _CITE_EDITOR = null;
    async function _ensureCiteEditor() {
        if (_CITE_EDITOR !== null) return _CITE_EDITOR;
        try { const r = await fetch('./api/health', { cache: 'no-store' }); const j = await r.json(); _CITE_EDITOR = !!(j && j.editor); }
        catch (e) { _CITE_EDITOR = false; }
        return _CITE_EDITOR;
    }
    async function _citeApi(body) {
        const r = await fetch('./api/cite', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        let j = {}; try { j = await r.json(); } catch (e) { }
        if (!r.ok || !j.ok) throw new Error(j.error || ('HTTP ' + r.status));
        return j;
    }
    const _KIND_META = {
        pasal_internal: { id: 'antar-pasal (internal)', en: 'cross-pasal (internal)', c: 'var(--primary)' },
        pasal_external: { id: 'antar-pasal (regulasi lain)', en: 'cross-pasal (other law)', c: 'var(--amber)' },
        regulation: { id: 'regulasi bernomor', en: 'numbered regulation', c: 'var(--amber)' },
        named: { id: 'instrumen bernama', en: 'named instrument', c: 'var(--emerald,#10b981)' },
    };
    let _CITE_CTX = { doc: null, dir: 'all' }, _CITE_EDITING = null, _CITE_ADDING = false, _CITE_RECS = [];
    window.showCitationContext = async function (doc, dir) {
        _CITE_CTX = { doc, dir }; _CITE_EDITING = null; _CITE_ADDING = false;
        await _ensureCiteEditor();
        await _renderCiteModal();
    };
    const _kindSelect = (id, cur) => `<select id="${id}" style="width:100%;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--sunken);color:var(--text-1);font-size:0.82rem;">`
        + Object.keys(_KIND_META).map(k => `<option value="${k}"${k === cur ? ' selected' : ''}>${_KIND_META[k].id}</option>`).join('') + `</select>`;
    function _editForm(r) {
        const isEn = window.currentLang === 'en';
        const lbl = s => `<div style="font-size:0.68rem;color:var(--text-4);margin:8px 0 3px;font-weight:600;">${s}</div>`;
        return `<div style="border:1.5px solid var(--primary);border-radius:10px;padding:12px 13px;margin-bottom:10px;background:var(--overlay-soft);">
            <div style="font-weight:700;color:var(--text-1);font-size:0.86rem;">${_rEsc(_citeDoc(r.source_doc))} — ${_rEsc(r.source_prov)} <span style="font-size:0.66rem;color:var(--primary);">· ${isEn ? 'editing' : 'mengedit'}</span></div>
            ${lbl(isEn ? 'Classification' : 'Klasifikasi')}${_kindSelect('cite-ed-kind', r.kind)}
            ${lbl(isEn ? 'Cites (reference text)' : 'Menyebut (teks rujukan)')}<input id="cite-ed-ref" value="${_rEsc(r.cited_ref || '')}" style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--sunken);color:var(--text-1);font-size:0.82rem;">
            ${lbl(isEn ? 'Full pasal text (verbatim)' : 'Teks pasal utuh (verbatim)')}<textarea id="cite-ed-text" style="width:100%;box-sizing:border-box;min-height:150px;padding:8px 10px;border:1px solid var(--border);border-radius:6px;background:var(--sunken);color:var(--text-1);font-size:0.84rem;line-height:1.6;font-family:inherit;">${_rEsc(r.source_text || '')}</textarea>
            <div style="display:flex;gap:8px;margin-top:10px;">
              <button onclick="_citeSaveRow()" class="btn-secondary btn-sm" style="background:var(--primary);color:#fff;border-color:var(--primary);"><span class="material-symbols-rounded" style="font-size:14px;vertical-align:-2px;">save</span> ${isEn ? 'Save' : 'Simpan'}</button>
              <button onclick="_citeCancel()" class="btn-secondary btn-sm">${isEn ? 'Cancel' : 'Batal'}</button>
            </div>
          </div>`;
    }
    function _addForm(doc) {
        const isEn = window.currentLang === 'en';
        const lbl = s => `<div style="font-size:0.68rem;color:var(--text-4);margin:8px 0 3px;font-weight:600;">${s}</div>`;
        return `<div style="border:1.5px dashed var(--emerald,#10b981);border-radius:10px;padding:12px 13px;margin-bottom:12px;background:var(--overlay-soft);">
            <div style="font-weight:700;color:var(--text-1);font-size:0.86rem;">${isEn ? 'Add citation' : 'Tambah sitiran'} · ${_rEsc(_citeDoc(doc))}</div>
            ${lbl(isEn ? 'Source pasal (e.g. Pasal 5)' : 'Pasal sumber (mis. Pasal 5)')}<input id="cite-add-prov" placeholder="Pasal 5" style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--sunken);color:var(--text-1);font-size:0.82rem;">
            ${lbl(isEn ? 'Classification' : 'Klasifikasi')}${_kindSelect('cite-add-kind', 'pasal_internal')}
            ${lbl(isEn ? 'Cites (reference text)' : 'Menyebut (teks rujukan)')}<input id="cite-add-ref" placeholder="Pasal 2 ayat (2)" style="width:100%;box-sizing:border-box;padding:6px 8px;border:1px solid var(--border);border-radius:6px;background:var(--sunken);color:var(--text-1);font-size:0.82rem;">
            ${lbl(isEn ? 'Full pasal text (verbatim)' : 'Teks pasal utuh (verbatim)')}<textarea id="cite-add-text" style="width:100%;box-sizing:border-box;min-height:120px;padding:8px 10px;border:1px solid var(--border);border-radius:6px;background:var(--sunken);color:var(--text-1);font-size:0.84rem;line-height:1.6;font-family:inherit;"></textarea>
            <div style="display:flex;gap:8px;margin-top:10px;">
              <button onclick="_citeSaveAdd()" class="btn-secondary btn-sm" style="background:var(--emerald,#10b981);color:#fff;border-color:var(--emerald,#10b981);"><span class="material-symbols-rounded" style="font-size:14px;vertical-align:-2px;">add</span> ${isEn ? 'Add' : 'Tambah'}</button>
              <button onclick="_citeCancel()" class="btn-secondary btn-sm">${isEn ? 'Cancel' : 'Batal'}</button>
            </div>
          </div>`;
    }
    async function _renderCiteModal() {
        const isEn = window.currentLang === 'en';
        const { doc, dir } = _CITE_CTX;
        const pc = await _ensureProvCites();
        const editor = _CITE_EDITOR;
        const cross = r => ['regulation', 'named', 'pasal_external'].includes(r.kind);
        let recs;
        if (dir === 'in') recs = pc.records.filter(r => r.cited_doc === doc && r.source_doc !== doc && cross(r));
        else if (dir === 'out') recs = pc.records.filter(r => r.source_doc === doc && r.cited_doc !== doc && cross(r));
        else recs = pc.records.filter(r => r.source_doc === doc);     // 'all'
        const ord = { pasal_internal: 0, pasal_external: 1, regulation: 2, named: 3 };
        recs = recs.slice().sort((a, b) =>
            (dir === 'in' ? a.source_doc.localeCompare(b.source_doc) : (ord[a.kind] - ord[b.kind]))
            || _provNum(a.source_prov) - _provNum(b.source_prov));
        _CITE_RECS = recs;
        const instName = _citeDoc(doc);
        const accent = dir === 'in' ? 'var(--amber)' : 'var(--primary)';
        const heading = dir === 'in'
            ? (isEn ? 'Cited by — pasal that cite this instrument (full text)' : 'Disitir oleh — pasal yang menyitir instrumen ini (teks utuh)')
            : dir === 'out'
                ? (isEn ? 'Cites — this instrument citing other instruments (full text)' : 'Menyitir — instrumen ini merujuk instrumen lain (teks utuh)')
                : (isEn ? 'All pasal-level citations (full text ground truth)' : 'Semua sitiran antar-pasal (ground truth teks utuh)');
        const totalC = recs.reduce((s, r) => s + (r.count || 1), 0);
        const subline = `${recs.length} ${isEn ? 'passage(s)' : 'cuplikan pasal'} · ${totalC}× ${isEn ? 'citation(s)' : 'sitiran'}`;
        const kindBadge = k => { const meta = _KIND_META[k] || { id: k, en: k, c: 'var(--text-3)' }; return `<span style="font-size:0.62rem;border:1px solid ${meta.c};color:${meta.c};padding:0 6px;border-radius:9px;line-height:1.6;white-space:nowrap;">${isEn ? meta.en : meta.id}</span>`; };
        const tagFor = r => (r.manual ? `<span style="font-size:0.6rem;background:var(--emerald,#10b981);color:#fff;padding:0 5px;border-radius:8px;">${isEn ? 'manual' : 'manual'}</span>` : '')
            + (r.review ? `<span title="Gemini: ${_rEsc(r.review.reason || '')} · ${_rEsc(r.review.context_type || '')} (${r.review.confidence || 0}%)" style="font-size:0.6rem;background:#ef4444;color:#fff;padding:0 5px;border-radius:8px;margin-left:4px;cursor:help;">⚠ ${isEn ? 'review' : 'tinjau'}</span>` : '')
            + (r.edited && !r.review ? `<span style="font-size:0.6rem;background:var(--amber);color:#1a1a1a;padding:0 5px;border-radius:8px;margin-left:4px;">${isEn ? 'edited' : 'diedit'}</span>` : '');
        const rowsHtml = recs.length ? recs.map((r, i) => {
            if (editor && i === _CITE_EDITING) return _editForm(r);
            const tgt = r.cited_doc ? _citeDoc(r.cited_doc) : (isEn ? 'outside corpus' : 'di luar korpus');
            const srcLabel = `${_citeDoc(r.source_doc)} — ${r.source_prov}`;
            const editBtns = editor ? `<button onclick="_citeEditRow(${i})" title="${isEn ? 'Edit' : 'Edit'}" style="border:none;background:none;cursor:pointer;color:var(--text-3);padding:0;"><span class="material-symbols-rounded" style="font-size:17px;">edit</span></button>`
                + `<button onclick="_citeDeleteRow(${i})" title="${isEn ? 'Delete' : 'Hapus'}" style="border:none;background:none;cursor:pointer;color:#ef4444;padding:0;"><span class="material-symbols-rounded" style="font-size:17px;">delete</span></button>` : '';
            return `<div style="border:1px solid var(--border);border-radius:10px;padding:11px 13px;margin-bottom:10px;">
                <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
                  <div style="font-weight:700;color:var(--text-1);font-size:0.86rem;min-width:0;">${_rEsc(srcLabel)} ${tagFor(r)}</div>
                  <div style="display:flex;gap:7px;align-items:center;flex-shrink:0;">${kindBadge(r.kind)}${(r.count > 1) ? `<span style="font-size:0.72rem;font-weight:700;color:${accent};">${r.count}×</span>` : ''}${editBtns}</div>
                </div>
                <div style="font-size:0.78rem;color:var(--text-3);margin-top:4px;"><span style="color:${accent};font-weight:700;">→ ${isEn ? 'cites' : 'menyebut'}:</span> <b style="color:var(--text-2);">${_rEsc(r.cited_ref)}</b> <span style="color:var(--text-4);${r.cited_doc ? '' : 'font-style:italic;'}">(${_rEsc(tgt)})</span>${(r.merged_refs && r.merged_refs.length) ? ` <span style="color:var(--text-4);font-size:0.7rem;" title="${isEn ? 'duplicate surface forms folded in (double-count removed)' : 'bentuk-sebut duplikat digabung (double-count dihapus)'}">· ${isEn ? 'also' : 'juga'}: ${_rEsc(r.merged_refs.join(', '))}</span>` : ''}</div>
                <div style="margin-top:7px;padding:9px 12px;background:var(--sunken);border-left:3px solid ${accent};border-radius:6px;font-size:0.85rem;line-height:1.7;color:var(--text-2);white-space:pre-wrap;">${_rEsc(r.source_text || '')}</div>
              </div>`;
        }).join('') : `<div class="rp-empty" style="padding:1rem 0;">${isEn ? 'No pasal-level citation passages for this instrument.' : 'Belum ada cuplikan sitiran antar-pasal untuk instrumen ini.'}</div>`;
        const editorBar = editor
            ? `<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
                 <span style="font-size:0.7rem;color:var(--emerald,#10b981);display:flex;align-items:center;gap:4px;"><span class="material-symbols-rounded" style="font-size:14px;">edit_note</span>${isEn ? 'Editor active — changes auto-save to disk' : 'Editor aktif — perubahan tersimpan otomatis ke disk'}</span>
                 <button onclick="_citeAddOpen()" class="btn-secondary btn-sm"><span class="material-symbols-rounded" style="font-size:14px;vertical-align:-2px;">add</span> ${isEn ? 'Add citation' : 'Tambah sitiran'}</button>
               </div>`
            : `<div style="font-size:0.7rem;color:var(--amber);margin-bottom:10px;display:flex;align-items:center;gap:5px;line-height:1.5;"><span class="material-symbols-rounded" style="font-size:14px;">lock</span>${isEn ? 'Read-only. To edit & save, run <code>python3 serve.py</code> then open http://localhost:8080/' : 'Mode baca-saja. Untuk mengedit & menyimpan, jalankan <code>python3 serve.py</code> lalu buka http://localhost:8080/'}</div>`;
        const addHtml = (editor && _CITE_ADDING) ? _addForm(doc) : '';
        const old = document.getElementById('citemodal'); if (old) old.remove();
        const m = document.createElement('div');
        m.id = 'citemodal';
        m.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,0.5);display:flex;align-items:center;justify-content:center;padding:24px;';
        m.innerHTML = `<div style="background:var(--bg-card);max-width:760px;width:100%;max-height:84vh;overflow:auto;border-radius:14px;border:1px solid var(--border);box-shadow:0 24px 60px rgba(0,0,0,0.45);padding:1.4rem 1.6rem;">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;position:sticky;top:-1.4rem;background:var(--bg-card);padding-top:0.2rem;">
              <div style="min-width:0;">
                <div class="rp-eyebrow" style="color:${accent};">${_rEsc(heading)}</div>
                <div class="rp-title" style="font-size:1.12rem;">${_rEsc(instName)}</div>
                <div style="font-size:0.74rem;color:var(--text-4);margin-top:3px;">${subline}</div>
              </div>
              <button onclick="document.getElementById('citemodal').remove()" style="border:none;background:var(--overlay-soft);width:30px;height:30px;border-radius:8px;cursor:pointer;font-size:16px;color:var(--text-2);flex-shrink:0;">✕</button>
            </div>
            <div style="margin-top:1rem;padding-top:1rem;border-top:1px solid var(--border);">${editorBar}${addHtml}${rowsHtml}</div>
            <div style="margin-top:0.9rem;font-size:0.72rem;color:var(--text-4);line-height:1.5;">${isEn ? 'Each box is a pasal that cites another pasal/regulation; the quoted block is that pasal’s full paragraph text, verbatim from the official PDF (build_provision_citations.py). Scanned sources may carry OCR noise.' : 'Tiap kotak adalah satu pasal yang menyebut pasal/regulasi lain; blok kutipan adalah teks paragraf pasal itu secara utuh & verbatim dari PDF resmi (build_provision_citations.py). Sumber hasil pindai bisa mengandung noise OCR.'}</div>
          </div>`;
        m.onclick = ev => { if (ev.target === m) m.remove(); };
        document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape') { const x = document.getElementById('citemodal'); if (x) x.remove(); document.removeEventListener('keydown', esc); } });
        document.body.appendChild(m);
    }
    window._citeEditRow = function (i) { _CITE_EDITING = i; _CITE_ADDING = false; _renderCiteModal(); };
    window._citeAddOpen = function () { _CITE_ADDING = true; _CITE_EDITING = null; _renderCiteModal(); };
    window._citeCancel = function () { _CITE_EDITING = null; _CITE_ADDING = false; _renderCiteModal(); };
    window._citeSaveRow = async function () {
        const r = _CITE_RECS[_CITE_EDITING]; if (!r) return;
        const kind = document.getElementById('cite-ed-kind').value;
        const ref = document.getElementById('cite-ed-ref').value.trim();
        const text = document.getElementById('cite-ed-text').value;
        try {
            if (kind !== r.kind || ref !== r.cited_ref) await _citeApi({ op: 'edit', id: r.id, fields: { kind, cited_ref: ref } });
            if (text !== (r.source_text || '')) await _citeApi({ op: 'text', source_label: r.source_label, source_text: text });
            _CITE_EDITING = null; await _ensureProvCites(true); await _renderCiteModal();
            showToast(window.currentLang === 'en' ? 'Saved to disk.' : 'Tersimpan ke disk.', 'success');
        } catch (e) { showToast((window.currentLang === 'en' ? 'Save failed: ' : 'Gagal menyimpan: ') + e.message, 'error'); }
    };
    window._citeDeleteRow = async function (i) {
        const r = _CITE_RECS[i]; if (!r) return;
        if (!confirm(window.currentLang === 'en' ? `Delete this citation?\n${r.source_prov} → ${r.cited_ref}` : `Hapus sitiran ini?\n${r.source_prov} → ${r.cited_ref}`)) return;
        try { await _citeApi({ op: 'delete', id: r.id }); _CITE_EDITING = null; await _ensureProvCites(true); await _renderCiteModal(); showToast(window.currentLang === 'en' ? 'Deleted.' : 'Dihapus.', 'success'); }
        catch (e) { showToast((window.currentLang === 'en' ? 'Delete failed: ' : 'Gagal menghapus: ') + e.message, 'error'); }
    };
    window._citeSaveAdd = async function () {
        const prov = document.getElementById('cite-add-prov').value.trim();
        const kind = document.getElementById('cite-add-kind').value;
        const ref = document.getElementById('cite-add-ref').value.trim();
        const text = document.getElementById('cite-add-text').value;
        if (!prov || !ref) { showToast(window.currentLang === 'en' ? 'Source pasal and reference are required.' : 'Pasal sumber dan rujukan wajib diisi.', 'warning'); return; }
        try {
            await _citeApi({ op: 'add', record: { source_doc: _CITE_CTX.doc, source_prov: prov, kind, cited_ref: ref, cited_norm: ref, source_text: text } });
            _CITE_ADDING = false; await _ensureProvCites(true); await _renderCiteModal();
            showToast(window.currentLang === 'en' ? 'Citation added.' : 'Sitiran ditambahkan.', 'success');
        } catch (e) { showToast((window.currentLang === 'en' ? 'Add failed: ' : 'Gagal menambah: ') + e.message, 'error'); }
    };
    function _provNum(prov) { const m = /(\d+)/.exec(prov || ''); return m ? parseInt(m[1], 10) : 9999; }

    // Re-render metric + ranking tables in the active language (called by toggleLanguage)
    window.reRenderAllMetrics = function () {
        Object.entries(networkInstances || {}).forEach(([id, inst]) => {
            if (inst && inst.graphData) {
                try {
                    populateMetricsTable(id, inst.graphData);
                    populateRankingTable(id, inst.graphData);
                } catch (e) { /* ignore */ }
            }
        });
    };

    // ===================================================================
    // EXPORT: CSV — Full Academic-Grade LNA Metrics
    // Metrics: Degree Centrality, Betweenness Centrality, Modularity
    // Interpretation: Rechtsvinding · Legal Uncertainty · Policy Design Failure
    // ===================================================================
    window.exportGraphCSV = function (graphId, filename) {
        const inst = networkInstances[graphId];
        if (!inst) { showToast('Graph belum dirender. Tunggu sebentar, lalu coba lagi.', 'warning'); return; }
        const { graphData } = inst;
        const nodes = graphData.nodes;
        const edges = graphData.edges;
        const n = nodes.length;
        const m = edges.length;
        const nodeMap = {};
        nodes.forEach(nd => { nodeMap[nd.id] = nd; });

        // ── 1. BUILD ADJACENCY LIST ─────────────────────────────────────
        const adj = {};
        nodes.forEach(nd => { adj[nd.id] = []; });
        edges.forEach(e => {
            if (adj[e.from] !== undefined) adj[e.from].push(e.to);
            if (adj[e.to] !== undefined) adj[e.to].push(e.from);
        });

        // ── 2. DEGREE CENTRALITY ────────────────────────────────────────
        // DC(v) = degree(v) / (n-1); scale 0–1
        const degMap = {};
        nodes.forEach(nd => { degMap[nd.id] = 0; });
        edges.forEach(e => {
            if (degMap[e.from] !== undefined) degMap[e.from]++;
            if (degMap[e.to] !== undefined) degMap[e.to]++;
        });
        const dcMap = {};
        nodes.forEach(nd => { dcMap[nd.id] = n > 1 ? degMap[nd.id] / (n - 1) : 0; });

        // ── 3. BETWEENNESS CENTRALITY (Brandes 2001) ───────────────────
        // BC(v) = Σ_{s≠v≠t} [σ(s,t|v)/σ(s,t)] / [(n-1)(n-2)/2]
        const bcMap = {};
        nodes.forEach(nd => { bcMap[nd.id] = 0; });

        // Limit to first 200 source nodes if graph is very large (performance)
        const sourceSample = nodes.length > 200
            ? nodes.slice(0, 200).map(nd => nd.id)
            : nodes.map(nd => nd.id);
        const scaleFactor = nodes.length > 200 ? nodes.length / 200 : 1;

        for (const s of sourceSample) {
            const stack = [];
            const pred = {};        // predecessors on shortest paths
            const sigma = {};       // number of shortest paths
            const dist = {};       // shortest-path distance
            nodes.forEach(nd => { pred[nd.id] = []; sigma[nd.id] = 0; dist[nd.id] = -1; });
            sigma[s] = 1; dist[s] = 0;
            const queue = [s];
            while (queue.length) {
                const v = queue.shift();
                stack.push(v);
                (adj[v] || []).forEach(w => {
                    if (dist[w] < 0) { queue.push(w); dist[w] = dist[v] + 1; }
                    if (dist[w] === dist[v] + 1) { sigma[w] += sigma[v]; pred[w].push(v); }
                });
            }
            const delta = {};
            nodes.forEach(nd => { delta[nd.id] = 0; });
            while (stack.length) {
                const w = stack.pop();
                pred[w].forEach(v => {
                    delta[v] += (sigma[v] / Math.max(sigma[w], 1)) * (1 + delta[w]);
                });
                if (w !== s) bcMap[w] += delta[w] * scaleFactor;
            }
        }
        // Normalize BC
        const bcNorm = n > 2 ? (n - 1) * (n - 2) / 2 : 1;
        nodes.forEach(nd => { bcMap[nd.id] /= bcNorm; });

        // ── 4. MODULARITY (Newman 2006 approximation) ──────────────────
        // Use `classification` as community partition
        // Q = Σ_c [L_c/m − (d_c/2m)²]
        const communities = {};
        nodes.forEach(nd => {
            const comm = nd.classification || nd.group || 'Unknown';
            if (!communities[comm]) communities[comm] = { nodes: [], L: 0, d: 0 };
            communities[comm].nodes.push(nd.id);
        });
        edges.forEach(e => {
            const cu = (nodeMap[e.from] || {}).classification || (nodeMap[e.from] || {}).group || 'Unknown';
            const cv = (nodeMap[e.to] || {}).classification || (nodeMap[e.to] || {}).group || 'Unknown';
            if (cu === cv) communities[cu].L++;
        });
        Object.values(communities).forEach(comm => {
            comm.nodes.forEach(id => { comm.d += degMap[id]; });
        });
        let Q = 0;
        if (m > 0) {
            Object.values(communities).forEach(comm => {
                Q += (comm.L / m) - Math.pow(comm.d / (2 * m), 2);
            });
        }
        Q = Math.max(-1, Math.min(1, Q));

        // Fragmentation interpretation
        let fragLabel, fragInterpret;
        if (Q >= 0.4) { fragLabel = 'Tinggi'; fragInterpret = 'Jaringan sangat terfragmentasi — klaster regulasi beroperasi secara silo, memperkuat asimetri hukum'; }
        else if (Q >= 0.2) { fragLabel = 'Sedang'; fragInterpret = 'Fragmentasi moderat — ada jembatan normatif parsial tapi tidak cukup untuk menciptakan kepastian hukum lintas sektor'; }
        else { fragLabel = 'Rendah'; fragInterpret = 'Integrasi relatif baik antar klaster regulasi'; }

        // ── 5. SORT NODES BY METRICS ────────────────────────────────────
        const sorted_dc = [...nodes].sort((a, b) => dcMap[b.id] - dcMap[a.id]);
        const sorted_bc = [...nodes].sort((a, b) => bcMap[b.id] - bcMap[a.id]);
        const isolated = nodes.filter(nd => degMap[nd.id] === 0);

        // Connected nodes helper
        const connOf = (id) => (adj[id] || [])
            .map(nid => (nodeMap[nid] || {}).label || nid)
            .join(' | ');

        // ── 6. RECHTSVINDING CLASSIFICATION (BC-based) ──────────────────
        // Norma yang betweenness-nya tinggi adalah "pintu" rechtsvinding hakim
        const rv_threshold_high = bcMap[sorted_bc[Math.floor(sorted_bc.length * 0.1)]?.id] || 0;
        const rv_threshold_mid = bcMap[sorted_bc[Math.floor(sorted_bc.length * 0.3)]?.id] || 0;

        const rvLabel = (id) => {
            const bc = bcMap[id];
            if (bc >= rv_threshold_high)
                return 'KUNCI RECHTSVINDING — Wajib dijadikan titik penafsiran hakim';
            if (bc >= rv_threshold_mid)
                return 'Pendukung Rechtsvinding — Relevan sebagai analogi/interpretasi';
            return 'Periferal — Tidak krusial sebagai dasar penafsiran';
        };

        // ── 7. LEGAL UNCERTAINTY SCORE (per node) ───────────────────────
        // Isolated or low-BC nodes with high degree = lex generalis trap -> legal uncertainty
        const luScore = (id) => {
            const dc = dcMap[id];
            const bc = bcMap[id];
            const deg = degMap[id];
            if (deg === 0) return { score: 'ISOLASI', label: 'Isolasi semantik (SBERT) — tak ada pasal lain yang mirip teks (BUKAN indikator vakum hukum; cek lapisan sitasi/judge)' };
            if (dc > 0.15 && bc < 0.01)
                return { score: 'TINGGI', label: 'Tumpang-tindih semantik tinggi (SBERT) — sering jadi tetangga teks; bukan klaim otoritas/spesifisitas AI' };
            if (dc < 0.03 && bc < 0.005)
                return { score: 'SEDANG', label: 'Tetangga semantik sedikit (SBERT) — overlap teks terbatas' };
            return { score: 'RENDAH', label: 'Overlap semantik memadai (SBERT)' };
        };

        // ── 8. CATATAN TOPOLOGI SBERT (eksploratif — bukan klaim otoritas) ──
        const pdfFlag = (id) => {
            const deg = degMap[id];
            const cls = (nodeMap[id] || {}).classification || '';
            if (deg === 0 && cls.startsWith('Intl:'))
                return '◽ Terisolasi semantik (SBERT) — tak ada pasal yang mirip teks; cek lapisan sitasi untuk adopsi/rujukan nyata';
            if (deg === 0 && cls.startsWith('Natl:'))
                return '◽ Terisolasi semantik (SBERT, nasional) — tak ada pasal yang mirip teks';
            if (deg === 0)
                return '◽ Terisolasi semantik (SBERT) — bukan vakum hukum';
            const dc = dcMap[id];
            if (dc > 0.2)
                return '🟡 Overlap SBERT tinggi — sering jadi tetangga semantik (deskriptif, bukan otoritas)';
            return '✅ Normal';
        };

        // ── 9. BUILD CSV SECTIONS ────────────────────────────────────────
        const sep = () => ['', '', '', '', '', '', '', '', ''];
        const head = (...cols) => cols;
        const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
        const row = (...cols) => cols.map(c => esc(c)).join(',');

        const lines = [];

        // ── SECTION A: IDENTITAS JARINGAN ────────────────────────────────
        lines.push(row('=== HASIL EXPORT LEGAL NETWORK ANALYSIS (LNA) ==='));
        lines.push(row('Sistem', 'Digital Governance Watch — Pemetaan Asimetri Regulasi AI Indonesia'));
        lines.push(row('Graph ID', graphId.toUpperCase()));
        lines.push(row('Tanggal Export', new Date().toLocaleString('id-ID')));
        lines.push(row('Total Node (Pasal/Regulasi/Insiden)', n));
        lines.push(row('Total Relasi (Edges)', m));
        lines.push(row('Densitas Jaringan', (m / Math.max(n * (n - 1) / 2, 1)).toFixed(6)));
        lines.push(row('Node Terisolasi Semantik (SBERT)', isolated.length));
        lines.push(row('Modularity Score (Q)', Q.toFixed(4)));
        lines.push(row('Tingkat Fragmentasi', fragLabel));
        lines.push(sep());

        // ── SECTION B: METRIK TOPOLOGI ────────────────────────────────────
        lines.push(row('=== BAGIAN 1: METRIK TOPOLOGI — IMPLIKASI HUKUM ==='));
        lines.push(row('Metrik', 'Nilai', 'Interpretasi Legal', 'Relevansi'));
        lines.push(row('Densitas Jaringan (SBERT)', (m / Math.max(n * (n - 1) / 2, 1)).toFixed(6),
            'Graf kemiripan SBERT jarang → sedikit pasangan pasal yang mirip teks (deskriptif)',
            'EKSPLORATIF — kemiripan redaksi, BUKAN klaim koherensi/otoritas hukum; lihat lapisan sitasi & judge'));
        lines.push(row('Modularity (Q, SBERT)', Q.toFixed(4), fragInterpret,
            `Q=${Q.toFixed(3)} → modularitas klaster pada graf kemiripan SBERT (deskriptif, bukan klaim kegagalan kebijakan)`));
        lines.push(row('Node Terisolasi Semantik', isolated.length,
            `${isolated.length} pasal tanpa pasal lain yang mirip teks (isolasi SBERT)`,
            'Isolasi SEMANTIK (SBERT) — BUKAN vakum hukum; cakupan hukum riil = lapisan sitasi/judge tervalidasi (UU ITE 19/2016 disitir 5× oleh 3 instrumen; angka mentah 39× pada instrument-scan lama termasuk 30 sitiran-diri dari UU 1/2024 dan tidak dipakai lagi)'));
        lines.push(row('Max Degree', Math.max(...nodes.map(nd => degMap[nd.id])),
            'Didominasi lex generalis — satu/beberapa pasal menanggung semua kasus',
            'Rechtsvinding terpaksa leapfrog ke pasal generalis tanpa dasar AI spesifik'));
        lines.push(sep());

        // ── SECTION C: DEGREE CENTRALITY — NORMA DOMINAN ────────────────
        lines.push(row('=== BAGIAN 2: SENTRALITAS SEMANTIK SBERT (eksploratif — BUKAN otoritas) ==='));
        lines.push(row('Keterangan: DC = degree(v)/(n-1) pada graf KEMIRIPAN SBERT = berapa pasal lain yang mirip teks. Ini ukuran tumpang-tindih SEMANTIK (deskriptif), BUKAN otoritas hukum. Soft-law panjang berskor tinggi karena banyak bagian generik. Otoritas riil = lapisan sitasi tervalidasi (UU ITE 19/2016 = otoritas puncak nasional, disitir 5× oleh 3 instrumen; bukan angka mentah 39× dari instrument-scan lama yang didominasi sitiran-diri UU 1/2024).'));
        lines.push(sep());
        lines.push(row('Rank', 'Kode Pasal/Norma', 'Label Lengkap', 'Klaster/Regulasi', 'Klasifikasi', 'Degree', 'DC Score (0-1)', 'Status (SBERT)', 'Catatan (eksploratif)', 'Terhubung Ke'));
        sorted_dc.slice(0, Math.min(50, nodes.length)).forEach((nd, i) => {
            const lu = luScore(nd.id);
            const dcVal = dcMap[nd.id];
            const dcStatus = dcVal > 0.15 ? 'LEX GENERALIS DOMINAN'
                : dcVal > 0.05 ? 'Hub Sektoral'
                    : 'Norma Periferal';
            lines.push(row(
                i + 1,
                nd.id,
                nd.label || nd.id,
                nd.group || '',
                nd.classification || '',
                degMap[nd.id],
                dcVal.toFixed(6),
                dcStatus,
                lu.label,
                connOf(nd.id)
            ));
        });
        lines.push(sep());

        // ── SECTION D: BETWEENNESS CENTRALITY — NORMA KUNCI RECHTSVINDING
        lines.push(row('=== BAGIAN 3: BETWEENNESS CENTRALITY — NORMA KUNCI UNTUK RECHTSVINDING HAKIM ==='));
        lines.push(row('Keterangan: BC(v) = rasio jalur terpendek antar pasangan node yang melewati v. BC tinggi = norma yang WAJIB dipertimbangkan hakim saat menafsirkan gap hukum AI. Norma ini adalah "jembatan normatif" yang menghubungkan klaster regulasi yang berbeda.'));
        lines.push(sep());
        lines.push(row('Rank', 'Kode Pasal/Norma', 'Label Lengkap', 'Klaster/Regulasi', 'Klasifikasi', 'Degree', 'BC Score (normalized)', 'Peran Rechtsvinding', 'Implikasi Penafsiran Hakim', 'Terhubung Ke'));
        sorted_bc.slice(0, Math.min(50, nodes.length)).forEach((nd, i) => {
            const rv = rvLabel(nd.id);
            const bcVal = bcMap[nd.id];
            let judgeNote = '';
            if (bcVal >= rv_threshold_high)
                judgeNote = 'Hakim HARUS merujuk norma ini dalam rechtsvinding kasus AI — merupakan jembatan lintas klaster regulasi';
            else if (bcVal >= rv_threshold_mid)
                judgeNote = 'Norma pendukung — dapat digunakan sebagai analogi atau penafsiran sistematis';
            else
                judgeNote = 'Norma periferal — tidak signifikan sebagai dasar rechtsvinding lintas sektoral';

            lines.push(row(
                i + 1,
                nd.id,
                nd.label || nd.id,
                nd.group || '',
                nd.classification || '',
                degMap[nd.id],
                bcVal.toFixed(8),
                rv,
                judgeNote,
                connOf(nd.id)
            ));
        });
        lines.push(sep());

        // ── SECTION E: MODULARITY — FRAGMENTASI & POLICY DESIGN FAILURE ──
        lines.push(row('=== BAGIAN 4: MODULARITY KLASTER (graf kemiripan SBERT) — DESKRIPTIF ==='));
        lines.push(row(`Modularity Global (Q) = ${Q.toFixed(4)} → ${fragLabel} → ${fragInterpret} (catatan: ini modularitas pada graf KEMIRIPAN SBERT — deskriptif, bukan klaim kegagalan kebijakan)`));
        lines.push(sep());
        lines.push(row('Klaster Regulasi', 'Jumlah Node', 'Intra-Edges', 'Sum Degree', 'Kontribusi ke Q', 'Isolated Nodes', '% Isolated', 'Status (SBERT)', 'Catatan Modularitas (SBERT, deskriptif)'));

        const totalDeg = nodes.reduce((s, nd) => s + degMap[nd.id], 0);
        Object.entries(communities).sort((a, b) => b[1].nodes.length - a[1].nodes.length).forEach(([comm, data]) => {
            const isolatedInComm = data.nodes.filter(id => degMap[id] === 0).length;
            const pct = (isolatedInComm / Math.max(data.nodes.length, 1) * 100).toFixed(1);
            const qContrib = ((data.L / Math.max(m, 1)) - Math.pow(data.d / Math.max(2 * m, 1), 2));
            let status = '';
            let diagnosis = '';
            if (isolatedInComm / data.nodes.length > 0.7) {
                status = '🔴 ISOLASI TINGGI';
                diagnosis = '>70% pasal dalam klaster ini tanpa tetangga semantik SBERT — isolasi SEMANTIK (deskriptif); keterhubungan/otoritas hukum riil ada di lapisan sitasi & judge, bukan dari SBERT';
            } else if (isolatedInComm / data.nodes.length > 0.3) {
                status = '🟡 PERHATIAN';
                diagnosis = 'Banyak pasal dalam klaster tanpa tetangga semantik SBERT (overlap teks rendah) — deskriptif; bukan klaim legal uncertainty';
            } else {
                status = '🟢 MODERAT';
                diagnosis = 'Klaster relatif rapat secara semantik (SBERT) — deskriptif';
            }
            lines.push(row(comm, data.nodes.length, data.L, data.d, qContrib.toFixed(5),
                isolatedInComm, pct + '%', status, diagnosis));
        });
        lines.push(sep());

        // ── SECTION F: NODE TERISOLASI SEMANTIK (SBERT) — EKSPLORATIF ──────────
        lines.push(row('=== BAGIAN 5: NODE TERISOLASI SEMANTIK (SBERT) — EKSPLORATIF, BUKAN VAKUM HUKUM ==='));
        lines.push(row('Keterangan: degree=0 pada graf KEMIRIPAN SBERT = tak ada pasal lain yang mirip teks (isolasi SEMANTIK). Ini BUKAN bukti vakum/kegagalan hukum — untuk insiden, isolasi SBERT sering ARTEFAK RETRIEVAL (cosine melewatkan statuta yang berlaku; mis. UU PDP Ps.35 pernah ranking ke-154). Otoritas & cakupan hukum riil ada di lapisan SITASI (citations.json) dan JUDGE tervalidasi (tab Analisis Kasus).'));
        lines.push(sep());
        lines.push(row('No', 'Kode Pasal/Insiden', 'Label Lengkap', 'Klaster', 'Klasifikasi', 'Status Topologi (SBERT)', 'Catatan Semantik', 'Cakupan Hukum Riil (cek lapisan lain)', 'Tindak Lanjut'));
        isolated.forEach((nd, i) => {
            const cls = nd.classification || '';
            let statusReg = '', dampRV = '', dampLU = '', dampPDF = '';
            if (cls.startsWith('Intl:')) {
                statusReg = 'Norma intl tanpa tetangga SBERT';
                dampRV = 'Cosine tak menemukan pasal domestik yang mirip teks (isolasi semantik) — bukan klaim non-adopsi';
                dampLU = 'Adopsi/rujukan riil dilihat dari lapisan SITASI (mis. SE Komdigi → UU PDP), bukan dari SBERT';
                dampPDF = 'Periksa lapisan sitasi sebelum menyimpulkan apa pun soal adopsi';
            } else if (cls.startsWith('Natl:')) {
                statusReg = 'Norma nasional tanpa tetangga SBERT';
                dampRV = 'Tak ada pasal lain yang mirip teks (isolasi semantik)';
                dampLU = 'Keterhubungan hukum riil = lapisan sitasi/judge; SBERT hanya kemiripan redaksi';
                dampPDF = 'Deskriptif — bukan klaim kegagalan desain kebijakan';
            } else {
                statusReg = 'Insiden tanpa tetangga SBERT (cosine)';
                dampRV = 'Cosine tak menemukan regulasi mirip teks — SERING ARTEFAK RETRIEVAL, BUKAN bukti tanpa dasar hukum';
                dampLU = 'Cek tab Analisis Kasus (judge tervalidasi): banyak insiden "terisolasi SBERT" justru PUNYA warrant. Gap riil = AI-spesifik + asimetri subjek, bukan vakum absolut';
                dampPDF = 'Verifikasi via judge+sitasi dulu; bila benar tanpa warrant AI-spesifik → gap AI-spesifik (statuta umum bisa analogis)';
            }
            lines.push(row(i + 1, nd.id, nd.label || nd.id, nd.group || '', cls, statusReg, dampRV, dampLU, dampPDF));
        });
        lines.push(sep());

        // ── SECTION G: TABEL LENGKAP SEMUA NODE ──────────────────────────
        lines.push(row('=== BAGIAN 6: TABEL LENGKAP SEMUA NODE DENGAN SEMUA METRIK ==='));
        lines.push(row('No', 'Kode/ID', 'Label Regulasi/Pasal/Insiden', 'Klaster', 'Klasifikasi',
            'Degree', 'Degree Centrality (DC)', 'Betweenness Centrality (BC)',
            'Rank DC', 'Rank BC', 'Status Rechtsvinding', 'Legal Uncertainty Score',
            'Policy Design Failure', 'Node Terhubung Ke'));

        const dcRank = {};
        const bcRank = {};
        sorted_dc.forEach((nd, i) => { dcRank[nd.id] = i + 1; });
        sorted_bc.forEach((nd, i) => { bcRank[nd.id] = i + 1; });

        nodes.forEach((nd, i) => {
            const lu = luScore(nd.id);
            lines.push(row(
                i + 1,
                nd.id,
                nd.label || nd.id,
                nd.group || '',
                nd.classification || '',
                degMap[nd.id],
                dcMap[nd.id].toFixed(6),
                bcMap[nd.id].toFixed(8),
                dcRank[nd.id],
                bcRank[nd.id],
                rvLabel(nd.id),
                `${lu.score}: ${lu.label}`,
                pdfFlag(nd.id),
                connOf(nd.id)
            ));
        });
        lines.push(sep());

        // ── SECTION H: DAFTAR RELASI LENGKAP ──────────────────────────────
        lines.push(row('=== BAGIAN 7: DAFTAR RELASI ANTAR NORMA (EDGE LIST) ==='));
        lines.push(row('No', 'Dari (Kode)', 'Dari (Label)', 'Ke (Kode)', 'Ke (Label)', 'Jenis Relasi', 'Label Koneksi', 'Tipe Edge'));
        edges.slice(0, 2000).forEach((e, i) => {
            const fromNode = nodeMap[e.from] || {};
            const toNode = nodeMap[e.to] || {};
            lines.push(row(
                i + 1,
                e.from, fromNode.label || e.from,
                e.to, toNode.label || e.to,
                e.arrows ? 'Terarah' : 'Tidak Terarah',
                e.label || '',
                e.type || 'link'
            ));
        });
        if (edges.length > 2000) lines.push(row(`... ${edges.length - 2000} relasi lainnya tidak ditampilkan`));

        // ── OUTPUT ────────────────────────────────────────────────────────
        const csvContent = lines.join('\n');
        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.download = filename || `LNA_${graphId}_AnalisisLengkap.csv`;
        link.href = URL.createObjectURL(blob);
        link.click();
        setTimeout(() => URL.revokeObjectURL(link.href), 8000);
    };

    // ===================================================================
    // GENERIC EXPORT HELPERS + SECTOR / INCIDENT EXPORTS
    // ===================================================================
    function _downloadBlob(content, filename, type) {
        const prefix = type.indexOf('csv') >= 0 ? '﻿' : '';
        const blob = new Blob([prefix + content], { type });
        const a = document.createElement('a');
        a.download = filename;
        a.href = URL.createObjectURL(blob);
        a.click();
        setTimeout(() => URL.revokeObjectURL(a.href), 8000);
    }
    function _csvCell(v) {
        v = (v === null || v === undefined) ? '' : String(v);
        return /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    }
    function _toCSV(rows) { return rows.map(r => r.map(_csvCell).join(',')).join('\n'); }
    function _toast(msg, type) { if (typeof showToast === 'function') showToast(msg, type || 'success'); }

    // ── Generic PNG/CSV export for ANY result element (table or container) ──
    // Placed next to each result (not all at the top).
    window._elPNG = function (id, filename) {
        const el = document.getElementById(id);
        if (!el) { showToast('Elemen belum siap.', 'warning'); return; }
        const svg = el.matches('svg') ? el : el.querySelector('svg');
        if (svg) { _svgToPng(id, filename); return; }                 // SVG graphs
        if (typeof html2canvas !== 'function') { showToast('Pustaka PNG belum termuat.', 'error'); return; }
        const cs = getComputedStyle(document.documentElement);
        const bg = (cs.getPropertyValue('--bg-card') || '#ffffff').trim();
        html2canvas(el, { backgroundColor: bg, scale: 2, useCORS: true }).then(c => {
            const a = document.createElement('a'); a.download = filename; a.href = c.toDataURL('image/png'); a.click();
            _toast(window.currentLang === 'en' ? 'Image downloaded.' : 'Gambar berhasil diunduh.');
        }).catch(e => showToast('Export PNG gagal: ' + e.message, 'error'));
    };
    window._elCSV = function (id, filename) {
        const el = document.getElementById(id);
        const table = !el ? null : (el.matches('table') ? el : (el.closest('table') || el.querySelector('table')));
        if (!table) { showToast('Tabel tidak ditemukan.', 'warning'); return; }
        const rows = [...table.querySelectorAll('tr')].map(tr => [...tr.querySelectorAll('th,td')].map(c => c.innerText.replace(/\s+/g, ' ').trim()));
        _downloadBlob(_toCSV(rows), filename, 'text/csv;charset=utf-8;');
        _toast(window.currentLang === 'en' ? 'CSV downloaded.' : 'CSV berhasil diunduh.');
    };
    // small right-aligned PNG·CSV bar to drop right beside a result
    function _exportBar(id, base) {
        return `<div style="display:flex;justify-content:flex-end;gap:6px;margin:6px 0 2px;">
            <button class="btn-secondary btn-sm" onclick="_elPNG('${id}','${base}.png')"><span class="material-symbols-rounded" style="font-size:13px;">photo_camera</span> PNG</button>
            <button class="btn-secondary btn-sm" onclick="_elCSV('${id}','${base}.csv')"><span class="material-symbols-rounded" style="font-size:13px;">table_chart</span> CSV</button>
        </div>`;
    }
    // attach a PNG·CSV bar right under a metrics table (tbody-metrics-<graphId>)
    function _attachMetricsExport(graphId, base) {
        const tbody = document.getElementById(`tbody-metrics-${graphId}`);
        const tbl = tbody && tbody.closest('table');
        if (!tbl) return;
        if (!tbl.id) tbl.id = `metricstbl-${graphId}`;
        let bar = document.getElementById(`metricsbar-${graphId}`);
        if (!bar) { bar = document.createElement('div'); bar.id = `metricsbar-${graphId}`; tbl.insertAdjacentElement('afterend', bar); }
        bar.innerHTML = _exportBar(tbl.id, base);
    }
    function _getSectorData() {
        return (typeof window !== 'undefined' && window.sectorCoverageData) ? window.sectorCoverageData : null;
    }

    // ── Sektoral: CSV / JSON / PNG (empirical few-shot coverage) ───────
    window.exportSectorCSV = function () {
        const isEn = window.currentLang === 'en';
        const data = _getSectorData();
        if (!data || !data.sectors) { _toast(isEn ? 'Open the Sector tab first.' : 'Buka tab Sektor dulu untuk memuat data.', 'warning'); return; }
        const rows = [[isEn ? 'Sector' : 'Sektor', isEn ? 'Incidents' : 'Insiden',
            isEn ? 'Any-warrant coverage (%)' : 'Coverage ada-dasar-hukum (%)',
            'Pelaku (%)', 'PSE (%)', 'Konsumen (%)', 'Regulator (%)',
            isEn ? 'Widest gap' : 'Gap terbesar', isEn ? 'Top warrants (count)' : 'Dasar hukum terbanyak (jumlah)']];
        data.sectors.forEach(s => {
            const tw = (s.top_warrants || []).map(w => `${w.label} (${w.count})`).join(' | ');
            rows.push([isEn ? s.title_en : s.title_id, s.n_incidents, s.coverage_pct,
                s.per_role.pelaku.coverage_pct, s.per_role.pse.coverage_pct,
                s.per_role.konsumen.coverage_pct, s.per_role.regulator.coverage_pct,
                `${s.weakest_role} (${s.weakest_pct}%)`, tw]);
        });
        _downloadBlob(_toCSV(rows), `Coverage_Sektoral_Empiris_${isEn ? 'EN' : 'ID'}.csv`, 'text/csv;charset=utf-8;');
        _toast(isEn ? 'CSV downloaded.' : 'CSV berhasil diunduh.');
    };
    window.exportSectorJSON = function () {
        const isEn = window.currentLang === 'en';
        const data = _getSectorData();
        if (!data) { _toast(isEn ? 'Open the Sector tab first.' : 'Buka tab Sektor dulu untuk memuat data.', 'warning'); return; }
        _downloadBlob(JSON.stringify(data, null, 2), `Coverage_Sektoral_Empiris_${isEn ? 'EN' : 'ID'}.json`, 'application/json');
        _toast(isEn ? 'JSON downloaded.' : 'JSON berhasil diunduh.');
    };
    window.exportSectorPNG = function () {
        const el = document.getElementById('sector-grid-container');
        if (!el) return;
        if (typeof html2canvas !== 'function') { _toast(window.currentLang === 'en' ? 'PNG library not loaded.' : 'Pustaka PNG belum termuat.', 'error'); return; }
        const bg = (getComputedStyle(document.documentElement).getPropertyValue('--bg-deep') || '#ffffff').trim();
        html2canvas(el, { backgroundColor: bg, scale: 2, useCORS: true }).then(canvas => {
            const a = document.createElement('a');
            a.download = 'Analisis_Kesenjangan_Sektoral.png';
            a.href = canvas.toDataURL('image/png');
            a.click();
            _toast(window.currentLang === 'en' ? 'Image downloaded.' : 'Gambar berhasil diunduh.');
        }).catch(e => _toast('Export PNG gagal: ' + e.message, 'error'));
    };

    // ── Katalog Insiden: CSV / JSON ───────────────────────────────────
    window.exportIncidentsCSV = function () {
        const isEn = window.currentLang === 'en';
        const inc = (typeof rawIncidentData !== 'undefined' && rawIncidentData) ? rawIncidentData : [];
        if (!inc.length) { _toast(isEn ? 'Incident data not loaded yet.' : 'Data insiden belum termuat.', 'warning'); return; }
        const head = ['id', 'year', 'type', 'severity', 'sector', 'record_type', 'confidence',
            isEn ? 'chronology' : 'kronologi', 'pelaku', 'korban', 'pse', 'objek_hukum',
            'kualifikasi', 'akibat', 'nexus_kausalitas', 'scale', 'verification_note', 'sources'];
        const rows = [head];
        inc.forEach(i => {
            const f = i.pemetaan_fakta_hukum || {};
            const src = (i.sources || []).map(s => `${s.outlet || ''}: ${s.url || ''}`).join(' | ');
            rows.push([i.id, i.year, i.type, i.severity, i.sector || '', i.record_type || '', i.confidence || '',
                i.peristiwa_hukum_kronologi || '', f.subjek_pelaku || '', f.subjek_korban || '', f.subjek_pse || '',
                f.objek_hukum || '', i.kualifikasi_peristiwa || '', f.akibat_hukum || '', f.nexus_kausalitas || '',
                i.scale || '', i.verification_note || '', src]);
        });
        _downloadBlob(_toCSV(rows), `Katalog_Insiden_Siber_${isEn ? 'EN' : 'ID'}.csv`, 'text/csv;charset=utf-8;');
        _toast(isEn ? 'CSV downloaded.' : 'CSV berhasil diunduh.');
    };
    window.exportIncidentsJSON = function () {
        const isEn = window.currentLang === 'en';
        const inc = (typeof rawIncidentData !== 'undefined' && rawIncidentData) ? rawIncidentData : [];
        if (!inc.length) { _toast(isEn ? 'Incident data not loaded yet.' : 'Data insiden belum termuat.', 'warning'); return; }
        _downloadBlob(JSON.stringify(inc, null, 2), `Katalog_Insiden_Siber_${isEn ? 'EN' : 'ID'}.json`, 'application/json');
        _toast(isEn ? 'JSON downloaded.' : 'JSON berhasil diunduh.');
    };


    // ===================================================================
    // INITIAL EXECUTION — urutan penting:
    // 1. navigateTo dulu (section jadi visible)
    // 2. baru render graph (canvas punya ukuran nyata)
    // ===================================================================
    window.navigateTo = navigateTo;  // expose for inline onclick (gap-matrix cell → Analisis Kasus)
    navigateTo('section-all');       // ← buka section SEBELUM render graph
    _ensureUiText().then(_applyStaticUiText);   // editable-narrative overrides (subtitles etc.)
    loadAllNetworkGraphs();          // ← sekarang canvas sudah berukuran
    window.reloadIncidentRegistry = loadIncidentRegistry;
    window.reRenderSectorData = function() {
        const c = document.getElementById('sector-grid-container');
        if(c) c.dataset.rendered = 'false';
        if (typeof initSectorAnalysis === 'function') initSectorAnalysis();
    };
    loadIncidentRegistry();
    initAIFeature();
    // initSectorAnalysis dipanggil lazy di navigateTo saat section-sector dibuka
});
