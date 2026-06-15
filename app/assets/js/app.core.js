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
    const DATA_V = '20260615_2';   // cache-buster for data/report fetches (bump on data updates)

    // ===================================================================
    // SPA NAVIGATION — data-target based routing
    // ===================================================================
    const SECTION_META = {
        'section-all': { icon: 'hub', title: 'Master Legal Network Analysis', sub: 'Semua jaringan regulasi · International + Nasional + Insiden' },
        'section-intl': { icon: 'public', title: 'Regulasi Internasional', sub: 'EU AI Act · OECD AI Principles · CETS225 · Thematic Cluster' },
        'section-natl': { icon: 'account_balance', title: 'Regulasi Nasional Indonesia', sub: 'UU PDP · UU ITE · PP PSTE · POJK · UU Perdagangan' },
        'section-cross': { icon: 'sync_alt', title: 'Intl vs Nasional · Cross-Jurisdiction', sub: 'Pemetaan Semantic Similarity lintas yurisdiksi · Full/Partial/Low' },
        'section-incident': { icon: 'gavel', title: 'Analisis Kasus Forensik', sub: 'Pemetaan 45 insiden siber riil ke regulasi · Structural Holes' },
        'section-sector': { icon: 'category', title: 'Analisis Kesenjangan Regulasi Per Sektor', sub: 'Coverage Empiris per Subjek Hukum · Pemetaan Regulasi (few-shot)' },
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
        if (targetId === 'section-sector') initSectorAnalysis();

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
    const THEMATIC_INTL_EDGES = [
        // Theme: Transparency & Explainability
        { from: 'EU_AI_Act_2024_Article_13', to: 'OECD_AI_Principles_2024_Section_1', theme: 'Transparansi & Eksplainabilitas' },
        { from: 'EU_AI_Act_2024_Article_13', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_5', theme: 'Transparansi & Eksplainabilitas' },
        // Theme: Risk Management
        { from: 'EU_AI_Act_2024_Article_9', to: 'OECD_AI_Principles_2024_Section_2', theme: 'Manajemen Risiko' },
        { from: 'EU_AI_Act_2024_Article_9', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_9', theme: 'Manajemen Risiko' },
        { from: 'EU_AI_Act_2024_Article_6', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_6', theme: 'Manajemen Risiko' },
        // Theme: Human Oversight
        { from: 'EU_AI_Act_2024_Article_14', to: 'OECD_AI_Principles_2024_Article_5', theme: 'Pengawasan Manusia' },
        { from: 'EU_AI_Act_2024_Article_14', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_10', theme: 'Pengawasan Manusia' },
        // Theme: Data Governance
        { from: 'EU_AI_Act_2024_Article_10', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_11', theme: 'Tata Kelola Data' },
        // Theme: Accountability
        { from: 'EU_AI_Act_2024_Article_16', to: 'OECD_AI_Principles_2024_Section_2', theme: 'Akuntabilitas' },
        { from: 'EU_AI_Act_2024_Article_16', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_8', theme: 'Akuntabilitas' },
        // Theme: Prohibited Uses / High Risk
        { from: 'EU_AI_Act_2024_Article_5', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_5', theme: 'Larangan Penggunaan AI Berbahaya' },
        { from: 'EU_AI_Act_2024_Article_26', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_7', theme: 'Kewajiban Penyedia AI' },
        // Theme: Conformity & Certification
        { from: 'EU_AI_Act_2024_Article_39', to: 'Council_of_Europe_Framework_Convention_on_AI_CETS225_Article_25', theme: 'Conformity & Sertifikasi' },
        // Theme: Regulatory Sandbox
        { from: 'EU_AI_Act_2024_Article_54', to: 'OECD_AI_Principles_2024_Section_1', theme: 'Regulatory Sandbox' },
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

    function buildNodeInspectorHTML(nodeData, graphData) {
        const degree = graphData.edges.filter(e => e.from === nodeData.id || e.to === nodeData.id).length;
        const connectedNodes = graphData.edges
            .filter(e => e.from === nodeData.id || e.to === nodeData.id)
            .map(e => {
                const otherId = e.from === nodeData.id ? e.to : e.from;
                const other = graphData.nodes.find(n => n.id === otherId);
                return other ? other.label : otherId;
            }).slice(0, 5);

        const isEn = typeof window !== 'undefined' && window.currentLang === 'en';
        let coverageBadge = '';
        if (degree === 0) coverageBadge = `<span class="badge gap">${isEn ? 'Isolated — Gap Detected' : 'Terisolasi — Celah Terdeteksi'}</span>`;
        else if (degree <= 2) coverageBadge = `<span class="badge partial">${isEn ? 'Low Connectivity' : 'Konektivitas Rendah'}</span>`;
        else coverageBadge = `<span class="badge covered">${isEn ? 'High Connectivity · Hub Node' : 'Konektivitas Tinggi · Node Hub'}</span>`;

        const degreeLbl = isEn ? 'Connection Degree:' : 'Degree Koneksi:';
        const connectedLbl = isEn ? 'Connected to:' : 'Terhubung ke:';
        const othersLbl = isEn ? `...and ${degree - 5} others` : `...dan ${degree - 5} lainnya`;

        return `
            <div style="font-size:0.78rem; margin-bottom:0.5rem; color:var(--primary); font-weight:700; letter-spacing:0.5px; text-transform:uppercase;">${nodeData.group || 'Unknown'}</div>
            <div style="font-size:0.85rem; color:var(--text-2); margin-bottom:0.75rem; line-height:1.4;">${nodeData.id}</div>
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
    async function loadAllNetworkGraphs() {
        if (isLoadingNetworkGraphs) return;
        isLoadingNetworkGraphs = true;
        const analyzers = [
            { id: 'all', graph: 'legal_graph.json', report: 'laporan_hasil_lna.md' },
            { id: 'intl', graph: 'intl_graph.json', report: 'laporan_khusus_internasional.md' },
            { id: 'natl', graph: 'natl_graph.json', report: 'laporan_khusus_nasional.md' },
            { id: 'cross', graph: 'cross_graph.json', report: 'laporan_khusus_transnasional.md' },
            { id: 'incident', graph: 'incident_graph.json', report: 'laporan_khusus_insiden.md' },
            { id: 'gap', graph: 'gap_graph.json', report: 'laporan_gap_analysis.md' }
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
                                     <span style="color:var(--text-2);">${groupName}</span>
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
                    title: `[${n.group}] ${n.label}`
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
                const isIncidentNode = n => n.group === 'Insiden Kasus' || String(n.classification || '').includes('Insiden');
                const labelFor = n => (isIncidentNode(n) || (degMap[n.id] || 0) >= Math.max(hubCut, 4)) ? n.label : undefined;

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
                        title: `[${n.group}] ${n.label}`,
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
                        font: { color: graphFont, face: 'Inter', size: 13, strokeWidth: 0 },
                        borderWidth: 1.5,
                        scaling: {
                            label: {
                                enabled: true,
                                min: 10,
                                max: 40,
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

                // Store network & graph data for export and filtering
                networkInstances[model.id] = { network, graphData, netData };

                // Populate metrics directly since sync stabilization is disabled
                populateMetricsTable(model.id, graphData);
                populateRankingTable(model.id, graphData);

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
                                inspectorTitle.textContent = nodeData.label || nodeId;
                                inspectorBody.innerHTML = buildNodeInspectorHTML(nodeData, graphData);
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
            const roleTags = (x.roles || []).map(chip).join('');
            return `<div style="display:flex; gap:7px; align-items:baseline; font-size:0.72rem; line-height:1.45;">
                        <span style="font-family:monospace; font-weight:700; color:${col}; min-width:36px; text-align:right;">${c}%</span>
                        <span style="color:var(--text-3);">${lab.slice(0, 54)}${roleTags}</span>
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
        const data = window.sectorCoverageData;
        container.innerHTML = '';
        container.dataset.rendered = 'true';
        const RL = data.role_label || {};
        const SLBL = 'font-size:11px;font-weight:700;color:var(--text-muted,#94a3b8);margin:12px 0 4px;text-transform:uppercase;letter-spacing:.04em;';

        data.sectors.forEach(s => {
            const title = isEn ? s.title_en : s.title_id;
            const cov = s.coverage_pct;
            const covColor = _covColor(cov);
            const borderColor = cov < 30 ? 'rgba(251,113,133,0.25)' : cov < 60 ? 'rgba(251,191,36,0.25)' : 'rgba(52,211,153,0.25)';

            const roleRows = Object.keys(RL).map(r => {
                const pct = s.per_role[r] ? s.per_role[r].coverage_pct : 0;
                const lbl = isEn ? RL[r].en : RL[r].id;
                return `
                    <div class="gauge-row">
                        <span class="gauge-label" style="min-width:130px;">${lbl}</span>
                        <div class="gauge-bar"><div class="gauge-fill" style="width:${pct}%;background:${_covColor(pct)};"></div></div>
                        <span class="gauge-pct" style="color:${_covColor(pct)};">${pct}%</span>
                    </div>`;
            }).join('');

            const warrantsHTML = (s.top_warrants && s.top_warrants.length)
                ? s.top_warrants.map(w => `
                    <div class="pasal-item">
                        <div class="p-dot covered"></div>
                        <div><span class="p-name">${w.label.replace(/_/g, ' ')}</span>
                        <span class="p-desc">${L('dasar hukum di', 'cited in')} ${w.count} ${L('insiden', 'incident(s)')}</span></div>
                    </div>`).join('')
                : `<div class="pasal-item"><div class="p-dot gap"></div><div><span class="p-desc">${L('Tidak ada dasar hukum teridentifikasi.', 'No legal basis identified.')}</span></div></div>`;

            const weakLbl = (RL[s.weakest_role] ? (isEn ? RL[s.weakest_role].en : RL[s.weakest_role].id) : s.weakest_role);

            container.innerHTML += `
                <div class="sector-card" style="border-color:${borderColor};">
                    <div class="sc-header">
                        <div class="sc-icon" style="background:${_SECTOR_ICONBG[s.key] || 'linear-gradient(135deg,#475569,#64748b)'};">${s.icon}</div>
                        <div>
                            <div class="sc-title">${title}</div>
                            <div class="sc-sub">${s.n_incidents} ${L('insiden riil · coverage empiris (few-shot)', 'real incidents · empirical coverage (few-shot)')}</div>
                        </div>
                    </div>
                    <div class="gauge-row">
                        <span class="gauge-label" style="min-width:130px;">${L('Ada dasar hukum', 'Has any warrant')}</span>
                        <div class="gauge-bar"><div class="gauge-fill" style="width:${cov}%;background:${covColor};"></div></div>
                        <span class="gauge-pct" style="color:${covColor};">${cov}%</span>
                    </div>
                    <div class="sc-badge-row">
                        <span class="badge covered">✓ ${s.covered}/${s.n_incidents} ${L('terjangkau', 'covered')}</span>
                        <span class="badge gap">✕ ${L('gap terbesar', 'widest gap')}: ${weakLbl} (${s.weakest_pct}%)</span>
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
                { status: 'covered', title: 'UU PDP Ps. 16-23 (Prinsip Pemrosesan Data)', desc: 'Pemrosesan data nasabah wajib memiliki dasar hukum yang sah. Relevan untuk setiap pemrosesan data oleh AI.', recom: 'Pastikan data nasabah yang diproses AI memiliki dasar hukum eksplisit (persetujuan/kontrak/kewajiban hukum).' },
                { status: 'partial', title: 'POJK 11/2022 Manajemen Risiko TI', desc: 'Mengatur manajemen risiko teknologi informasi perbankan. Berlaku namun tidak spesifik untuk AI.', recom: 'Interpretasikan ketentuan "sistem yang berdampak material" sebagai mencakup model AI Anda.' },
                { status: 'partial', title: 'POJK 77/2016 Peer-to-Peer Lending', desc: 'Berlaku untuk fintech lending. Tidak mengatur algoritma credit scoring secara spesifik.', recom: 'Dokumentasikan metodologi credit scoring sebagai bagian dari prosedur operasional yang wajib dilaporkan.' },
                { status: 'gap', title: '⚠️ Sandbox Regulasi AI Keuangan', desc: 'BELUM ADA regulasi yang memungkinkan pengujian inovasi AI keuangan dalam lingkungan terkontrol.', recom: 'Advokasikan ke OJK untuk framework sandbox AI. Sementara itu, lakukan self-governance dan dokumentasi uji coba.' },
                { status: 'gap', title: '⚠️ Kewajiban Audit Bias Algoritma', desc: 'BELUM ADA kewajiban hukum untuk mengaudit bias dalam model credit scoring.', recom: 'Lakukan internal bias audit secara berkala. Persiapkan dokumentasi untuk kemungkinan regulasi mendatang.' },
            ]
        },
        facial: {
            recommendation: [
                { status: 'partial', title: 'UU PDP Ps. 26 (Data Biometrik Sensitif)', desc: 'Data wajah dikategorikan sebagai data sensitif berdasarkan UU PDP. Membutuhkan izin eksplisit.', recom: 'Dapatkan persetujuan eksplisit tertulis sebelum mengumpulkan dan memproses data wajah.' },
                { status: 'partial', title: 'PP PSTE 71/2019 Ps. 28 (Keamanan SE)', desc: 'Sistem elektronik wajib memenuhi standar keamanan. Berlaku untuk sistem FR sebagai PSE.', recom: 'Implementasikan enkripsi data biometrik at-rest dan in-transit, lakukan security audit berkala.' },
                { status: 'gap', title: '⚠️ Izin Penggunaan FR di Ruang Publik', desc: 'BELUM ADA regulasi yang mengatur penggunaan facial recognition di ruang publik.', recom: 'Adopsi prinsip "Privacy by Design" secara sukarela. Hindari penggunaan FR untuk mass surveillance.' },
                { status: 'gap', title: '⚠️ Standar Akurasi & Anti-Bias FR', desc: 'BELUM ADA standar teknis akurasi dan anti-diskriminasi untuk sistem FR di Indonesia.', recom: 'Patuhi standar internasional (NIST Face Recognition Vendor Test). Uji akurasi untuk semua kelompok demografis.' },
            ]
        },
        ecommerce: {
            recommendation: [
                { status: 'covered', title: 'UU Perdagangan Ps. 65 (Informasi Produk)', desc: 'Wajib memberikan informasi produk yang benar dalam transaksi elektronik.', recom: 'Pastikan rekomendasi AI tidak menyesatkan konsumen tentang kualitas atau harga produk.' },
                { status: 'partial', title: 'UU Perlindungan Konsumen Ps. 7', desc: 'Pelaku usaha wajib memberikan informasi yang benar, jelas, dan jujur.', recom: 'Interpretasikan sebagai kewajiban transparansi minimal tentang cara kerja sistem rekomendasi Anda.' },
                { status: 'gap', title: '⚠️ Kewajiban Transparansi Algoritma Ranking', desc: 'BELUM ADA kewajiban mengungkap faktor penentu ranking produk kepada merchant.', recom: 'Terapkan prinsip transparency secara sukarela: informasikan merchant tentang faktor yang mempengaruhi ranking.' },
                { status: 'gap', title: '⚠️ Larangan Self-Preferencing', desc: 'BELUM ADA regulasi yang melarang platform memprioritaskan produknya sendiri di algoritma.', recom: 'Siapkan dokumentasi untuk membuktikan netralitas algoritma. Kembangkan mekanisme naik banding merchant.' },
            ]
        },
        content: {
            recommendation: [
                { status: 'partial', title: 'UU ITE Ps. 27A (Konten Asusila)', desc: 'Melarang konten asusila. Berlaku untuk deepfake asusila namun sulit pembuktiannya.', recom: 'Implementasikan content moderation aktif dan mekanisme pelaporan konten deepfake non-konsensual.' },
                { status: 'partial', title: 'UU ITE Ps. 28 (Informasi Bohong)', desc: 'Melarang penyebaran informasi bohong. Dapat diterapkan pada deepfake politik.', recom: 'Terapkan sistem deteksi otomatis konten deepfake dan label mandatory pada konten AI.' },
                { status: 'covered', title: 'UU Hak Cipta Ps. 9 (Hak Ekonomi)', desc: 'Melindungi karya cipta. Konten AI yang menggunakan dataset berhak cipta harus diperhatikan.', recom: 'Pastikan tidak menggunakan data berhak cipta untuk training tanpa lisensi yang tepat.' },
                { status: 'gap', title: '⚠️ Kewajiban Label/Watermark Konten AI', desc: 'BELUM ADA kewajiban hukum pelabelan konten yang dihasilkan AI.', recom: 'Terapkan watermark/metadata secara sukarela. Ikuti standar C2PA (Coalition for Content Provenance).' },
                { status: 'gap', title: '⚠️ Akuntabilitas Penyedia Model Generatif', desc: 'BELUM ADA regulasi yang menetapkan tanggung jawab penyedia model AI atas konten berbahaya.', recom: 'Implementasikan usage policy yang ketat dan mekanisme take-down dalam 24 jam.' },
            ]
        },
        judicial: {
            recommendation: [
                { status: 'covered', title: 'UU Kekuasaan Kehakiman Ps. 1 (Kekuasaan Yudisial)', desc: 'Kekuasaan kehakiman tetap pada hakim. AI tidak dapat menggantikan keputusan hakim.', recom: 'AI harus diposisikan sebagai alat bantu non-determinatif. Hakim wajib memiliki reasoning independen.' },
                { status: 'partial', title: 'KUHAP Ps. 183 (Standar Pembuktian)', desc: 'Standar pembuktian pidana minimum 2 alat bukti. Status bukti AI belum diatur.', recom: 'Dokumentasikan validitas dan reliabilitas model AI yang digunakan sebagai referensi. Tidak dijadikan satu-satunya bukti.' },
                { status: 'gap', title: '⚠️ Regulasi AI di Peradilan', desc: 'BELUM ADA regulasi yang secara eksplisit mengatur penggunaan AI dalam proses peradilan.', recom: 'Ikuti prinsip Mahkamah Agung tentang transparansi putusan. Dokumentasikan setiap penggunaan alat AI.' },
                { status: 'gap', title: '⚠️ Hak Terdakwa atas Informasi AI', desc: 'BELUM ADA hak eksplisit terdakwa untuk mengetahui bagaimana AI menilai kasusnya.', recom: 'Terapkan prinsip explainability wajib kepada pihak yang terdampak keputusan AI.' },
            ]
        },
        health: {
            recommendation: [
                { status: 'covered', title: 'UU Kesehatan No. 17/2023', desc: 'Mengatur standar layanan kesehatan. AI diagnostik wajib memenuhi standar klinis.', recom: 'Pastikan AI diagnostik mendapat persetujuan Kemenkes dan memiliki evidence klinis yang memadai.' },
                { status: 'partial', title: 'UU PDP Ps. 26 (Data Kesehatan Sensitif)', desc: 'Data kesehatan adalah data sensitif yang memerlukan perlindungan khusus.', recom: 'Terapkan enkripsi penuh dan akses kontrol ketat untuk data kesehatan yang diproses AI.' },
                { status: 'gap', title: '⚠️ Regulasi AI Diagnostik Medis', desc: 'BELUM ADA regulasi khusus untuk AI yang digunakan dalam diagnosis medis di Indonesia.', recom: 'Ikuti standar internasional FDA AI/ML-Based Software for Medical Devices. Dokumentasikan validasi klinis.' },
            ]
        },
        government: {
            recommendation: [
                { status: 'covered', title: 'Perpres 95/2018 SPBE', desc: 'Kerangka Sistem Pemerintahan Berbasis Elektronik. Berlaku untuk semua sistem AI pemerintah.', recom: 'Pastikan sistem AI terdaftar dan diaudit sebagai bagian dari infrastruktur SPBE.' },
                { status: 'partial', title: 'UU PDP (Pemerintah sebagai Pengendali Data)', desc: 'Pemerintah sebagai PSE publik wajib mematuhi UU PDP dalam pemrosesan data warga.', recom: 'Tunjuk Data Protection Officer (DPO) dan lakukan Data Protection Impact Assessment (DPIA) untuk setiap sistem AI baru.' },
                { status: 'gap', title: '⚠️ Panduan Pengadaan AI Pemerintah', desc: 'BELUM ADA panduan khusus pengadaan dan evaluasi sistem AI untuk instansi pemerintah.', recom: 'Gunakan OECD AI Procurement Checklist sebagai referensi sementara. Dorong BRIN/Kemkominfo untuk menerbitkan panduan.' },
            ]
        },
        other: {
            recommendation: [
                { status: 'partial', title: 'UU PDP (Prinsip Umum)', desc: 'UU PDP berlaku untuk semua pemroses data pribadi di Indonesia tanpa terkecuali.', recom: 'Identifikasi semua data pribadi yang diproses oleh sistem AI Anda dan pastikan memiliki dasar hukum yang sah.' },
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

        const prompt = `Anda adalah konsultan hukum AI senior yang membantu praktisi di Indonesia mematuhi regulasi yang berlaku. 
Yang dimaksud "praktisi" dalam konteks ini mencakup kolaborasi DUA PIHAK sekaligus: Praktisi Hukum (Legal/Compliance) dan Praktisi Teknologi (Developer/Engineer) yang selalu berpusat pada keamanan dan hak pengguna.

Klien memiliki profil berikut:
- **Sektor:** ${sectorNames[sector] || sector}
- **Jenis AI:** ${aiTypeNames[aiType] || aiType}
- **Deskripsi Aktivitas:** ${desc || '(tidak dideskripsikan)'}

**Peta regulasi yang berlaku (dari sistem LNA):**
${JSON.parse(rules).map(r => `- [${r.status.toUpperCase()}] ${r.title}: ${r.desc}`).join('\n')}

Berikan **Panduan Kepatuhan Konkret** dalam format berikut:

## 🎯 Ringkasan Posisi Kepatuhan
Jelaskan secara singkat posisi legal sistem AI yang sedang dibangun: apakah aman, perlu perhatian, atau berisiko tinggi bagi developer maupun perusahaan?

## ✅ Tindakan Wajib (Immediate Action Items)
Daftar 3-5 tindakan konkret dari sisi manajerial/hukum dan arsitektur teknis. 
**PENTING: Anda WAJIB menyebutkan nama regulasi beserta nomor pasalnya secara eksplisit (sesuai Peta Regulasi LNA di atas) pada setiap poin sebagai landasan argumen Anda.**

## ⚠️ Area Kelabu (Gap Hukum yang Perlu Diantisipasi)
Identifikasi 2-3 area di mana regulasi spesifik belum ada (kekosongan hukum), dan bagaimana tim legal & developer harus merancang mitigasi.

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

    function updateAIContextPanel() {
        const selectEl = document.getElementById('ai-incident-select');
        const incidentId = selectEl.value;
        const contextBody = document.getElementById('ai-context-body');
        if (!incidentId) {
            contextBody.innerHTML = 'Pilih insiden untuk melihat interkoneksi pasal-pasalnya.';
            return;
        }
        const incidentNode = aiIncidentNodes.find(n => n.id === incidentId);
        const linkedEdges = aiNetworkData.edges.filter(e => e.from === incidentId || e.to === incidentId);
        const linkedRegIds = linkedEdges.map(e => e.from === incidentId ? e.to : e.from);
        const regNodes = aiNetworkData.nodes.filter(n => linkedRegIds.includes(n.id) && n.group !== 'Insiden Kasus');

        let html = `<div style="margin-bottom:16px;">
            <h5 style="color:var(--rose); font-family:Outfit; margin-bottom:6px; font-size:0.95rem;">⬤ <strong>Grounds</strong> — Data Empiris Insiden</h5>
            <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:6px; border-left:3px solid #fca5a5; font-size:0.82rem; line-height:1.5;">
                ${incidentNode?.content || incidentNode?.label || 'Data teks tidak tersedia.'}
            </div>
        </div>`;

        html += `<div>
            <h5 style="color:#6ee7b7; font-family:Outfit; margin-bottom:6px; font-size:0.95rem;">⬤ <strong>Warrant</strong> — Kaidah Penghubung: ${regNodes.length} Regulasi Terdeteksi</h5>`;

        if (regNodes.length === 0) {
            html += `<p style="font-size:0.82rem; font-style:italic; color:var(--text-3);">⚠️ LNA tidak menemukan warrant normatif di atas threshold similarity — tidak ada regulasi yang secara semantik terkait dengan insiden ini.</p>`;
        } else {
            regNodes.forEach(reg => {
                html += `<div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:6px; border-left:3px solid #6ee7b7; font-size:0.82rem; margin-bottom:8px; line-height:1.5;">
                    <strong style="color:var(--text-3); display:block; margin-bottom:4px;">${reg.label}</strong>
                    ${(reg.content || '').substring(0, 250)}${reg.content && reg.content.length > 250 ? '... <em>(dipotong)</em>' : ''}
                </div>`;
            });
        }
        html += '</div>';
        contextBody.innerHTML = html;
        contextBody.dataset.incidentText = incidentNode?.content || incidentNode?.label || '';
        contextBody.dataset.regText = regNodes.map(r => `[${r.label}]: ${r.content || r.label}`).join('\n\n');
        contextBody.dataset.regCount = regNodes.length;
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

### 6. REBUTTAL (Bantahan & Kesimpulan Asimetri)
Identifikasi bantahan. Kemudian nyatakan:
- Jika tidak ada warrant → **Kekosongan Hukum Absolut**
- Jika warrant ada tapi tidak cukup → **Asimetri Regulasi (Normative Gap)**  
- Jika warrant kuat → **Instrumen Cukup, Perlu Penegakan**

### 7. REKOMENDASI KONKRET (Action Items)
Berdasarkan temuan di atas, berikan **3-5 rekomendasi spesifik** yang berbeda dari studi terdahulu:
- Bentuk regulasi yang dibutuhkan (sektoral/horizontal/sandbox)
- Lembaga yang harus bertindak (DPR/Kemkominfo/OJK/MA/BRIN)
- Jangka waktu urgensi (segera/1-2 tahun/jangka panjang)

---

**DATA GROUNDS (Fakta Insiden):**
${incidentText}

**DATA WARRANT (Pasal terdeteksi LNA — Semantic Similarity):**
${regText || 'TIDAK ADA PASAL TERDETEKSI.'}
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
        
        inst.isolatedHidden = !inst.isolatedHidden;
        const { netData, graphData, network } = inst;
        
        let visibleNodeIds = [];
        
        if (inst.isolatedHidden) {
            const connectedSet = new Set();
            graphData.edges.forEach(e => { connectedSet.add(e.from); connectedSet.add(e.to); });
            
            const updates = graphData.nodes.map(n => {
                const isHidden = !connectedSet.has(n.id);
                if (!isHidden) visibleNodeIds.push(n.id);
                return { id: n.id, hidden: isHidden };
            });
            netData.nodes.update(updates);
            showToast('Pasal independen berhasil disembunyikan. Hanya node terhubung yang tampil.', 'success');
        } else {
            const updates = graphData.nodes.map(n => {
                visibleNodeIds.push(n.id);
                return { id: n.id, hidden: false };
            });
            netData.nodes.update(updates);
            showToast('Semua pasal ditampilkan kembali.', 'success');
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

        // Tentukan apa yang difit secara otomatis
        let visibleNodeIds = [];
        if (inst.isolatedHidden) {
            const connectedSet = new Set();
            inst.graphData.edges.forEach(e => { connectedSet.add(e.from); connectedSet.add(e.to); });
            inst.graphData.nodes.forEach(n => { if (connectedSet.has(n.id)) visibleNodeIds.push(n.id); });
        } else {
            visibleNodeIds = inst.graphData.nodes.map(n => n.id);
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
    function populateMetricsTable(graphId, graphData) {
        const tbody = document.getElementById(`tbody-metrics-${graphId}`);
        if (!tbody) return;

        const nodes = graphData.nodes;
        const edges = graphData.edges;
        const n = nodes.length;
        const m = edges.length;

        // Degree map
        const deg = {};
        nodes.forEach(nd => { deg[nd.id] = 0; });
        edges.forEach(e => {
            if (deg[e.from] !== undefined) deg[e.from]++;
            if (deg[e.to] !== undefined) deg[e.to]++;
        });
        const degrees = Object.values(deg);
        const maxDeg = Math.max(...degrees);
        const avgDeg = degrees.reduce((a, b) => a + b, 0) / Math.max(n, 1);
        const isolated = nodes.filter(nd => deg[nd.id] === 0).length;
        const density = m / Math.max(n * (n - 1) / 2, 1);

        // Top hub node
        const topHub = [...nodes].sort((a, b) => deg[b.id] - deg[a.id])[0];

        // Modularity (cluster by classification)
        const comms = {};
        nodes.forEach(nd => {
            const c = nd.classification || nd.group || 'Unknown';
            if (!comms[c]) comms[c] = { L: 0, d: 0 };
        });
        edges.forEach(e => {
            const cu = (graphData.nodes.find(nd => nd.id === e.from) || {}).classification || 'Unknown';
            const cv = (graphData.nodes.find(nd => nd.id === e.to) || {}).classification || 'Unknown';
            if (!comms[cu]) comms[cu] = { L: 0, d: 0 };
            if (cu === cv) comms[cu].L++;
        });
        nodes.forEach(nd => {
            const c = nd.classification || nd.group || 'Unknown';
            if (!comms[c]) comms[c] = { L: 0, d: 0 };
            comms[c].d += deg[nd.id];
        });
        let Q = 0;
        if (m > 0) {
            Object.values(comms).forEach(c => {
                Q += (c.L / m) - Math.pow(c.d / (2 * m), 2);
            });
        }
        Q = Math.max(-1, Math.min(1, Q));

        // Coverage score
        const coverage = ((n - isolated) / Math.max(n, 1) * 100).toFixed(1);

        const isEn = typeof window !== 'undefined' && window.currentLang === 'en';

        const fragLabel = Q >= 0.4 ? (isEn ? '🔴 High — Regulatory clusters operate separately' : '🔴 Tinggi — Klaster regulasi beroperasi secara terpisah')
            : Q >= 0.2 ? (isEn ? '🟡 Medium — Partial fragmentation between clusters' : '🟡 Sedang — Fragmentasi parsial antar klaster')
                : (isEn ? '🟢 Low — Good relative cluster integration' : '🟢 Rendah — Integrasi klaster relatif baik');

        const densityLabel = density < 0.01 ? (isEn ? '🔴 Very Sparse' : '🔴 Sangat Jarang')
            : density < 0.05 ? (isEn ? '🟡 Sparse' : '🟡 Jarang')
                : (isEn ? '🟢 Moderate' : '🟢 Moderat');

        const isolatedLabel = isolated === 0 ? (isEn ? '✅ No isolated nodes' : '✅ Tidak ada node terisolasi')
            : isolated < 5 ? (isEn ? `⚠️ ${isolated} isolated nodes` : `⚠️ ${isolated} node terisolasi`)
                : (isEn ? `🔴 ${isolated} isolated nodes` : `🔴 ${isolated} node terisolasi`);
        
        const avgDegLabel = avgDeg < 2 ? (isEn ? '⚠️ Nodes on average have few connections' : '⚠️ Node rata-rata memiliki sedikit koneksi') : (isEn ? '✅ Nodes have adequate connections' : '✅ Node memiliki koneksi yang memadai');
        
        const topHubLabel = isEn ? `Strongest hub: "${topHub ? (topHub.label || topHub.id) : '-'}"` : `Hub terkuat: "${topHub ? (topHub.label || topHub.id) : '-'}"`;
        const coverageLabel = isEn ? `${n - isolated}/${n} connected nodes` : `${n - isolated}/${n} node terhubung`;

        const rows = [
            [isEn ? 'Total Nodes (Regulations/Incidents)' : 'Total Node (Regulasi/Insiden)', n, isEn ? 'Number of articles/regulations/incidents in the network' : 'Jumlah pasal/regulasi/insiden dalam jaringan'],
            [isEn ? 'Total Relations (Edges)' : 'Total Relasi (Edges)', m, isEn ? 'Number of semantic connections between nodes' : 'Jumlah koneksi semantik antar node'],
            [isEn ? 'Network Density' : 'Densitas Jaringan', density.toFixed(5), densityLabel],
            [isEn ? 'Average Degree' : 'Rata-rata Degree', avgDeg.toFixed(2), avgDegLabel],
            [isEn ? 'Maximum Degree' : 'Degree Maksimum', maxDeg, topHubLabel],
            [isEn ? 'Isolated Nodes (Degree=0)' : 'Node Terisolasi (Degree=0)', isolated, isolatedLabel],
            [isEn ? 'Coverage Score' : 'Coverage Score', coverage + '%', coverageLabel],
            [isEn ? 'Modularity Score (Q)' : 'Modularity Score (Q)', Q.toFixed(4), fragLabel],
            [isEn ? 'Number of Regulatory Clusters' : 'Jumlah Klaster Regulasi', Object.keys(comms).length, isEn ? 'Partition based on node classification' : 'Partisi berdasarkan klasifikasi node'],
        ];

        const colorClass = (val, metric) => {
            if (metric === 'Densitas Jaringan' && parseFloat(val) < 0.01) return '#fb7185';
            if (metric === 'Modularity Score (Q)' && parseFloat(val) > 0.4) return '#fb7185';
            if (metric === 'Node Terisolasi (Degree=0)' && parseInt(val) > 0) return '#fbbf24';
            if (metric === 'Coverage Score' && parseFloat(val) < 70) return '#fbbf24';
            return '#34d399';
        };

        tbody.innerHTML = rows.map(([metrik, nilai, implikasi]) => `
            <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:9px 12px; color:var(--text-2); font-weight:500;">${metrik}</td>
                <td style="padding:9px 12px; text-align:right; font-family:monospace; font-weight:700; color:${colorClass(nilai, metrik)};">${nilai}</td>
                <td style="padding:9px 12px; color:var(--text-3); font-size:0.82rem; line-height:1.4;">${implikasi}</td>
            </tr>
        `).join('');

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

    function populateRankingTable(graphId, graphData) {
        const tb = document.getElementById(`tbody-metrics-${graphId}`);
        if (!tb) return;
        const anchor = tb.closest('table');
        if (!anchor) return;

        const nodes = graphData.nodes, edges = graphData.edges, n = nodes.length;
        const deg = {}, adj = {};
        nodes.forEach(nd => { deg[nd.id] = 0; adj[nd.id] = []; });
        edges.forEach(e => {
            if (deg[e.from] !== undefined) deg[e.from]++;
            if (deg[e.to] !== undefined) deg[e.to]++;
            if (adj[e.from] && adj[e.to]) { adj[e.from].push(e.to); adj[e.to].push(e.from); }
        });
        const ids = nodes.map(nd => nd.id);
        const BET_CAP = 500;                       // betweenness is O(n·m): cap for responsiveness
        let bet = null;
        if (n > 2 && n <= BET_CAP) { try { bet = computeBetweenness(ids, adj); } catch (e) { bet = null; } }

        const isEn = typeof window !== 'undefined' && window.currentLang === 'en';
        const denom = Math.max(n - 1, 1);
        const top = [...nodes].sort((a, b) => (deg[b.id] - deg[a.id]) || ((bet ? bet[b.id] : 0) - (bet ? bet[a.id] : 0))).slice(0, 15);

        const betHead = bet ? `<th style="text-align:right; padding:8px 12px; color:var(--text-3); font-weight:600; border-bottom:1px solid var(--border);">Betweenness</th>` : '';
        const betNote = bet ? '' : `<div style="font-size:0.75rem; color:var(--text-4); margin-top:6px;">${isEn ? `Betweenness omitted for large graphs (n=${n} > ${BET_CAP}); see the LNA report (analyzer.py) for exact values.` : `Betweenness tidak dihitung untuk graf besar (n=${n} > ${BET_CAP}); lihat laporan LNA (analyzer.py) untuk nilai pastinya.`}</div>`;

        const rowsHtml = top.map((nd, i) => {
            const dc = (deg[nd.id] / denom);
            const cls = nd.classification || nd.group || '';
            const lbl = String(nd.label || nd.id);
            const betCell = bet ? `<td style="padding:8px 12px; text-align:right; font-family:monospace; color:var(--sky);">${bet[nd.id].toFixed(4)}</td>` : '';
            return `<tr style="border-bottom:1px solid var(--border);">
                <td style="padding:8px 12px; color:var(--text-4); text-align:right;">${i + 1}</td>
                <td style="padding:8px 12px; color:var(--text-1); font-weight:600;">${lbl}</td>
                <td style="padding:8px 12px; color:var(--text-3); font-size:0.8rem;">${cls}</td>
                <td style="padding:8px 12px; text-align:right; font-family:monospace; font-weight:700; color:var(--primary);">${deg[nd.id]}</td>
                <td style="padding:8px 12px; text-align:right; font-family:monospace; color:var(--emerald);">${dc.toFixed(4)}</td>
                ${betCell}
            </tr>`;
        }).join('');

        const html = `
            <div style="margin-top:1.5rem; overflow-x:auto;">
              <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.6rem;">
                <span class="material-symbols-rounded" style="color:var(--primary); font-size:18px;">leaderboard</span>
                <strong style="font-family:'Outfit'; color:var(--text-1); font-size:0.95rem;">${isEn ? 'Top Nodes by Degree Centrality' : 'Node Teratas berdasarkan Degree Centrality'}</strong>
              </div>
              <table style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                <thead><tr>
                  <th style="text-align:right; padding:8px 12px; color:var(--text-3); font-weight:600; border-bottom:1px solid var(--border);">#</th>
                  <th style="text-align:left; padding:8px 12px; color:var(--text-3); font-weight:600; border-bottom:1px solid var(--border);">${isEn ? 'Node (Article/Regulation/Incident)' : 'Node (Pasal/Regulasi/Insiden)'}</th>
                  <th style="text-align:left; padding:8px 12px; color:var(--text-3); font-weight:600; border-bottom:1px solid var(--border);">${isEn ? 'Classification' : 'Klasifikasi'}</th>
                  <th style="text-align:right; padding:8px 12px; color:var(--text-3); font-weight:600; border-bottom:1px solid var(--border);">Degree</th>
                  <th style="text-align:right; padding:8px 12px; color:var(--text-3); font-weight:600; border-bottom:1px solid var(--border);">${isEn ? 'Degree Centrality' : 'Degree Centrality'}</th>
                  ${betHead}
                </tr></thead>
                <tbody>${rowsHtml}</tbody>
              </table>
              ${betNote}
            </div>`;

        let cont = document.getElementById(`ranking-${graphId}`);
        if (!cont) {
            cont = document.createElement('div');
            cont.id = `ranking-${graphId}`;
            anchor.insertAdjacentElement('afterend', cont);
        }
        cont.innerHTML = html;
        if (typeof applyTranslations === 'function') applyTranslations();
    }

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
            if (deg === 0) return { score: 'KRITIS', label: 'Structural Hole — Tidak ada norma yang merespons' };
            if (dc > 0.15 && bc < 0.01)
                return { score: 'TINGGI', label: 'Lex Generalis Trap — Digunakan luas tapi tidak spesifik untuk AI' };
            if (dc < 0.03 && bc < 0.005)
                return { score: 'SEDANG', label: 'Norma Periferal — Cakupan terbatas, risiko gap interpretasi' };
            return { score: 'RENDAH', label: 'Norma memiliki koneksi memadai' };
        };

        // ── 8. POLICY DESIGN FAILURE FLAG ───────────────────────────────
        const pdfFlag = (id) => {
            const deg = degMap[id];
            const cls = (nodeMap[id] || {}).classification || '';
            if (deg === 0 && cls.startsWith('Intl:'))
                return '⛔ GAGAL ADOPSI — Norma internasional tidak diadopsi ke domestik';
            if (deg === 0 && cls.startsWith('Natl:'))
                return '⚠️ GAGAL KONEKSI — Norma nasional tidak terhubung ke insiden/regulasi lain';
            if (deg === 0)
                return '🔴 Structural Hole — Kekosongan regulasi terdeteksi';
            const dc = dcMap[id];
            if (dc > 0.2)
                return '🟡 DOMINASI LEX GENERALIS — Digunakan sebagai penyumbat gap bukan solusi spesifik';
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
        lines.push(row('Node Terisolasi (Structural Holes)', isolated.length));
        lines.push(row('Modularity Score (Q)', Q.toFixed(4)));
        lines.push(row('Tingkat Fragmentasi', fragLabel));
        lines.push(sep());

        // ── SECTION B: METRIK TOPOLOGI ────────────────────────────────────
        lines.push(row('=== BAGIAN 1: METRIK TOPOLOGI — IMPLIKASI HUKUM ==='));
        lines.push(row('Metrik', 'Nilai', 'Interpretasi Legal', 'Relevansi'));
        lines.push(row('Densitas Jaringan', (m / Math.max(n * (n - 1) / 2, 1)).toFixed(6),
            'Jaringan sangat jarang → regulasi tidak saling terhubung secara substantif',
            'Legal Uncertainty: hakim sulit menemukan norma yang koheren (rechtsvinding terhambat)'));
        lines.push(row('Modularity (Q)', Q.toFixed(4), fragInterpret,
            `Policy Design Failure: Q=${Q.toFixed(3)} → fragmentasi klaster regulasi menghambat keseragaman penerapan norma`));
        lines.push(row('Node Terisolasi', isolated.length,
            `${isolated.length} pasal/regulasi tidak terhubung ke jaringan → structural holes`,
            'Legal Uncertainty + Policy Design Failure: area tanpa regulasi efektif'));
        lines.push(row('Max Degree', Math.max(...nodes.map(nd => degMap[nd.id])),
            'Didominasi lex generalis — satu/beberapa pasal menanggung semua kasus',
            'Rechtsvinding terpaksa leapfrog ke pasal generalis tanpa dasar AI spesifik'));
        lines.push(sep());

        // ── SECTION C: DEGREE CENTRALITY — NORMA DOMINAN ────────────────
        lines.push(row('=== BAGIAN 2: DEGREE CENTRALITY — NORMA DOMINAN ==='));
        lines.push(row('Keterangan: DC = degree(v)/(n-1). DC tinggi = norma paling banyak dirujuk. Jika norma bersifat lex generalis, maka DC tinggi mengindikasikan LEGAL UNCERTAINTY karena norma digunakan di luar konteks aslinya.'));
        lines.push(sep());
        lines.push(row('Rank', 'Kode Pasal/Norma', 'Label Lengkap', 'Klaster/Regulasi', 'Klasifikasi', 'Degree', 'DC Score (0-1)', 'Status Norma', 'Implikasi Legal Uncertainty', 'Terhubung Ke'));
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
        lines.push(row('=== BAGIAN 4: MODULARITY PER KLASTER — TINGKAT FRAGMENTASI & POLICY DESIGN FAILURE ==='));
        lines.push(row(`Modularity Global (Q) = ${Q.toFixed(4)} → ${fragLabel} → ${fragInterpret}`));
        lines.push(sep());
        lines.push(row('Klaster Regulasi', 'Jumlah Node', 'Intra-Edges', 'Sum Degree', 'Kontribusi ke Q', 'Isolated Nodes', '% Isolated', 'Status', 'Policy Design Failure Diagnosis'));

        const totalDeg = nodes.reduce((s, nd) => s + degMap[nd.id], 0);
        Object.entries(communities).sort((a, b) => b[1].nodes.length - a[1].nodes.length).forEach(([comm, data]) => {
            const isolatedInComm = data.nodes.filter(id => degMap[id] === 0).length;
            const pct = (isolatedInComm / Math.max(data.nodes.length, 1) * 100).toFixed(1);
            const qContrib = ((data.L / Math.max(m, 1)) - Math.pow(data.d / Math.max(2 * m, 1), 2));
            let status = '';
            let diagnosis = '';
            if (isolatedInComm / data.nodes.length > 0.7) {
                status = '🔴 KRITIS';
                diagnosis = 'Policy Design Failure: >70% norma dalam klaster ini tidak terhubung — indikasi kuat gagalnya perancangan regulasi sektoral';
            } else if (isolatedInComm / data.nodes.length > 0.3) {
                status = '🟡 PERHATIAN';
                diagnosis = 'Fragmentasi tinggi dalam klaster — norma ada namun tidak terintegrasi, menciptakan legal uncertainty bagi pelaksana';
            } else {
                status = '🟢 MODERAT';
                diagnosis = 'Klaster relatif terhubung — fragmentasi tidak kritis namun desain masih generalis';
            }
            lines.push(row(comm, data.nodes.length, data.L, data.d, qContrib.toFixed(5),
                isolatedInComm, pct + '%', status, diagnosis));
        });
        lines.push(sep());

        // ── SECTION F: STRUCTURAL HOLES — POLICY DESIGN FAILURE ──────────
        lines.push(row('=== BAGIAN 5: STRUCTURAL HOLES — BUKTI EMPIRIS POLICY DESIGN FAILURE & LEGAL UNCERTAINTY ==='));
        lines.push(row('Keterangan: Node dengan degree=0 adalah "lubang struktural" — area yang tidak dicakup manapun secara normatif. Ini adalah bukti kuantitatif kegagalan desain kebijakan.'));
        lines.push(sep());
        lines.push(row('No', 'Kode Pasal/Insiden', 'Label Lengkap', 'Klaster', 'Klasifikasi', 'Status Regulasi', 'Dampak Rechtsvinding', 'Dampak Legal Uncertainty', 'Dampak Policy Design Failure'));
        isolated.forEach((nd, i) => {
            const cls = nd.classification || '';
            let statusReg = '', dampRV = '', dampLU = '', dampPDF = '';
            if (cls.startsWith('Intl:')) {
                statusReg = 'Norma Internasional TIDAK DIADOPSI';
                dampRV = 'Hakim tidak bisa merujuk norma internasional ini karena tidak ada padanannya di hukum nasional yang mengikat';
                dampLU = 'Warga & perusahaan AI tidak dapat mengantisipasi kewajiban hukum yang akan berlaku';
                dampPDF = 'GAGAL ADOPSI: Pemerintah tidak menyediakan mekanisme transplantasi norma internasional ke regulasi domestik';
            } else if (cls.startsWith('Natl:')) {
                statusReg = 'Norma Nasional TERISOLASI';
                dampRV = 'Pasal ini tidak memiliki koneksi ke kasus/insiden manapun — existentially irrelevant untuk kasus AI';
                dampLU = 'Pasal ada namun tidak operasional dalam konteks AI — menciptakan ilusi kepastian hukum';
                dampPDF = 'DESAIN GAGAL: Pasal dirancang terlalu sempit atau tidak memperhitung perkembangan AI';
            } else {
                statusReg = 'Insiden Tanpa Warrant Normatif';
                dampRV = 'Tidak ada norma yang bisa dirujuk hakim untuk menentukan pelanggaran hukum kasus ini';
                dampLU = 'KEKOSONGAN ABSOLUT: Pelaku tidak dapat ditindak, korban tidak mendapat kepastian ganti rugi';
                dampPDF = 'POLICY GAP KRITIS: Pemerintah belum mengantisipasi tipologi kejahatan AI ini dalam desain regulasi';
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
    navigateTo('section-all');       // ← buka section SEBELUM render graph
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
