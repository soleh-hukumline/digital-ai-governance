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
    const graphsLoaded = new Set();
    const networkInstances = {};   // { graphId: { network, graphData } }

    // ===================================================================
    // SPA NAVIGATION — data-target based routing
    // ===================================================================
    const SECTION_META = {
        'section-all': { icon: 'hub', title: 'Master Legal Network Analysis', sub: 'Semua jaringan regulasi · International + Nasional + Insiden' },
        'section-intl': { icon: 'public', title: 'Regulasi Internasional', sub: 'EU AI Act · OECD AI Principles · CETS225 · Thematic Cluster' },
        'section-natl': { icon: 'account_balance', title: 'Regulasi Nasional Indonesia', sub: 'UU PDP · UU ITE · PP PSTE · POJK · UU Perdagangan' },
        'section-cross': { icon: 'sync_alt', title: 'Intl vs Nasional · Cross-Jurisdiction', sub: 'Pemetaan Semantic Similarity lintas yurisdiksi · Full/Partial/Low' },
        'section-incident': { icon: 'gavel', title: 'Analisis Kasus Forensik', sub: 'Pemetaan 100+ insiden siber ke regulasi · Structural Holes' },
        'section-sector': { icon: 'category', title: 'Analisis Kesenjangan Regulasi Per Sektor', sub: 'Sektor Prioritas · Coverage Score · Pemetaan Regulasi' },
        'section-gap': { icon: 'insights', title: 'Konklusi: Gap Analysis', sub: 'Konsolidasi Temuan LNA · Coverage per Klaster · Connected Components' },
        'section-database': { icon: 'database_search', title: 'Katalog Data Forensik Insiden Siber', sub: 'Registry 100+ kasus · Searchable · Filter per kategori' },
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
            const res = await fetch(`./system/legal_network_framework/${filename}`);
            if (!res.ok) throw new Error('404');
            const mdText = await res.text();
            container.innerHTML = marked.parse(mdText);
        } catch (e) {
            container.innerHTML = `<div style="color:#ef4444; border:1px solid rgba(239,68,68,0.3); background:rgba(239,68,68,0.05); padding:1.5rem; border-radius:12px; margin:1rem;">
                <h3>⚠️ Gagal Membaca ${filename}</h3>
                <p style="color:#94a3b8; font-size:0.85rem; margin-top:0.5rem;">File laporan belum di-generate. Jalankan Python analyzer untuk membuat file ini.</p>
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

        let coverageBadge = '';
        if (degree === 0) coverageBadge = `<span class="badge gap">Isolated — Gap Detected</span>`;
        else if (degree <= 2) coverageBadge = `<span class="badge partial">Low Connectivity</span>`;
        else coverageBadge = `<span class="badge covered">High Connectivity · Hub Node</span>`;

        const isEn = typeof window !== 'undefined' && window.currentLang === 'en';
        const degreeLbl = isEn ? 'Connection Degree:' : 'Degree Koneksi:';
        const connectedLbl = isEn ? 'Connected to:' : 'Terhubung ke:';
        const othersLbl = isEn ? `...and ${degree - 5} others` : `...dan ${degree - 5} lainnya`;

        return `
            <div style="font-size:0.78rem; margin-bottom:0.5rem; color:#6366f1; font-weight:700; letter-spacing:0.5px; text-transform:uppercase;">${nodeData.group || 'Unknown'}</div>
            <div style="font-size:0.85rem; color:#e2e8f0; margin-bottom:0.75rem; line-height:1.4;">${nodeData.id}</div>
            ${coverageBadge}
            <div style="margin-top:0.75rem; padding-top:0.75rem; border-top:1px solid rgba(255,255,255,0.08);">
                <div style="font-size:0.75rem; color:#94a3b8; margin-bottom:4px;">${degreeLbl} <strong style="color:#fff;">${degree}</strong></div>
                ${connectedNodes.length > 0 ? `<div style="font-size:0.72rem; color:#94a3b8;">${connectedLbl}<br>${connectedNodes.map(n => `<span style="color:#818cf8;">• ${n}</span>`).join('<br>')}${degree > 5 ? `<br><span style="color:#64748b;">${othersLbl}</span>` : ''}</div>` : ''}
            </div>
        `;
    }

    // Lazy-load satu graph (panggil ulang loadAllNetworkGraphs jika graph belum ada)
    async function loadGraphById(graphId) {
        if (networkInstances[graphId]) return;  // sudah ada, skip
        // Cukup panggil loadAll, ia akan skip yang sudah ada
        await loadAllNetworkGraphs();
    }

    async function loadAllNetworkGraphs() {
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

                const res = await fetch(`./data/network/${model.graph}`);
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
                    legendHtml += `<div style="display:inline-flex; align-items:center; background:rgba(0,0,0,0.4); padding:3px 10px; border-radius:20px; font-size:11px;">
                                     <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${color}; margin-right:6px;"></span>
                                     <span style="color:#e2e8f0;">${groupName}</span>
                                   </div>`;
                });

                // Add thematic legend for intl
                if (model.id === 'intl') {
                    legendHtml += '<div style="width:100%; padding-top:8px; padding-bottom:2px; font-size:10px; color:#64748b; font-weight:600; text-transform:uppercase; letter-spacing:0.5px;">Tema Koneksi:</div>';
                    for (const [theme, color] of Object.entries(THEME_COLORS)) {
                        legendHtml += `<div style="display:inline-flex; align-items:center; background:rgba(0,0,0,0.4); padding:3px 10px; border-radius:20px; font-size:10px;">
                            <span style="display:inline-block; width:18px; height:2px; background:${color}; margin-right:6px; border-radius:2px;"></span>
                            <span style="color:#e2e8f0;">${theme}</span>
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

                const edges = new vis.DataSet(graphData.edges.map(e => {
                    const eColor = getEdgeColorFromLabel(e.label || '', model.id);
                    return {
                        from: e.from, to: e.to,
                        title: e.label || '',
                        label: '',
                        arrows: e.arrows || 'to',
                        color: eColor,
                        width: model.id === 'cross' ? 2 : 1,
                        smooth: { type: 'curvedCW', roundness: 0.15 }
                    };
                }));

                // Pre-assign circular positions so nodes are spread out
                // (prevents 0x0 canvas stacking bug when section is display:none)
                const N = graphData.nodes.length;
                const radius = Math.max(300, N * 4);
                const positionedNodeData = graphData.nodes.map((n, i) => {
                    const angle = (2 * Math.PI * i) / N;
                    // Add slight random jitter to avoid exact overlap for similar-group nodes
                    const r = radius + (Math.random() - 0.5) * radius * 0.5;
                    return {
                        id: n.id, label: n.label, group: n.group,
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
                        font: { color: '#ffffff', face: 'Inter', size: 12 },
                        scaling: {
                            label: {
                                enabled: true,
                                min: 8,
                                max: 48,
                                maxVisible: 150,  // Allows text to get very large when zooming in closely
                                drawThreshold: 1  // Renders even when zoomed out
                            }
                        },
                        shadow: { enabled: true, color: 'rgba(0,0,0,0.5)', size: 10, x: 2, y: 2 }
                    },
                    edges: {
                        smooth: { type: 'curvedCW', roundness: 0.15 }
                    },
                    physics: {
                        forceAtlas2Based: {
                            gravitationalConstant: -75,  // Tarikan berdekatan agar sangat padat
                            centralGravity: 0.008,       // Tarik semua klaster ke tengah
                            springLength: 90,            // Jarak antar node pendek
                            springConstant: 0.05,
                            damping: 0.6,
                            avoidOverlap: 0.2
                        },
                        maxVelocity: 80,
                        minVelocity: 0.5,
                        solver: 'forceAtlas2Based',
                        timestep: 0.4,
                        stabilization: {
                            enabled: true,
                            iterations: 400,
                            updateInterval: 20,
                            onlyDynamicEdges: false,
                            fit: false  // Dilarang melakukan auto-fit terlambat karena mengganggu zoom user
                        }
                    },
                    interaction: {
                        hover: true,
                        tooltipDelay: 100,
                        zoomView: true,
                        zoomSpeed: 0.8,
                        dragView: true,
                        navigationButtons: true,   // tombol +/- dan panah untuk zoom & pan
                        keyboard: { enabled: true, speed: { x: 10, y: 10, zoom: 0.02 } }
                    }
                };

                container.innerHTML = '';
                const network = new vis.Network(container, netData, options);

                // (Wheel interceptor removed to allow native vis-network zoom)

                // Store network & graph data for export and filtering
                networkInstances[model.id] = { network, graphData, netData };

                // After physics stabilizes, turn off physics to improve performance
                network.once('stabilizationIterationsDone', () => {
                    network.setOptions({ physics: false });
                    populateMetricsTable(model.id, graphData);
                });

                // Timeout fallback for metrics table
                setTimeout(() => {
                    if (networkInstances[model.id]) {
                        populateMetricsTable(model.id, graphData);
                    }
                }, 5000);

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
    }

    // ===================================================================
    // INCIDENT REGISTRY
    // ===================================================================
    async function loadIncidentRegistry() {
        try {
            const isEn = typeof window !== 'undefined' && window.currentLang === 'en';
            const suffix = isEn ? '_en' : '';
            const res = await fetch(`./data/incidents/indonesia_incidents${suffix}.json`);
            const json = await res.json();
            rawIncidentData = json.incidents;
            renderIncidentCards(rawIncidentData);
            if (typeof applyTranslations === 'function') setTimeout(applyTranslations, 100);
        } catch (e) {
            document.getElementById('incident-registry-container').innerHTML = '<div style="color:#ef4444; padding:15px;">Gagal memuat data insiden.</div>';
        }
    }

    function renderIncidentCards(incidents) {
        const container = document.getElementById('incident-registry-container');
        if (!container) return;
        container.innerHTML = '';
        if (incidents.length === 0) {
            container.innerHTML = '<div style="color:#94a3b8; padding:15px;">Tidak ada insiden yang cocok dengan pencarian.</div>';
            return;
        }
        incidents.forEach(inc => {
            const typeBadges = {
                ransomware: '<span style="background:rgba(239,68,68,0.2);color:#ef4444;padding:2px 8px;border-radius:4px;font-size:11px;">Ransomware</span>',
                data_breach: '<span style="background:rgba(59,130,246,0.2);color:#3b82f6;padding:2px 8px;border-radius:4px;font-size:11px;">Data Breach</span>',
                ai_fraud: '<span style="background:rgba(168,85,247,0.2);color:#a855f7;padding:2px 8px;border-radius:4px;font-size:11px;">AI Fraud</span>',
                ai_misuse: '<span style="background:rgba(168,85,247,0.2);color:#a855f7;padding:2px 8px;border-radius:4px;font-size:11px;">AI Misuse</span>',
            };
            const typeBadge = typeBadges[inc.type] || '<span style="background:rgba(255,255,255,0.1);color:#fff;padding:2px 8px;border-radius:4px;font-size:11px;">Other</span>';
            container.innerHTML += `
                <div class="incident-card" style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:18px;display:flex;flex-direction:column;gap:10px;">
                    <div style="display:flex;justify-content:space-between;align-items:start;border-bottom:1px solid rgba(255,255,255,0.05);padding-bottom:8px;margin-bottom:4px;">
                        <span style="color:#e2e8f0;font-weight:700;font-family:'Outfit';font-size:15px;">[${inc.year}] ${inc.id.toUpperCase()}</span>
                        <div>${typeBadge}</div>
                    </div>
                    <div style="font-size:13px;color:#cbd5e1;line-height:1.5;">${inc.peristiwa_hukum_kronologi}</div>
                    <div style="margin-top:auto;padding-top:10px;display:grid;gap:8px;">
                        <div style="font-size:12px;display:flex;gap:8px;">
                            <span class="material-symbols-rounded" style="font-size:14px;color:#f87171;">warning</span>
                            <span><strong style="color:#94a3b8;">Pelaku:</strong> <span style="color:#fca5a5;">${inc.pemetaan_fakta_hukum.subjek_pelaku}</span></span>
                        </div>
                        <div style="font-size:12px;display:flex;gap:8px;">
                            <span class="material-symbols-rounded" style="font-size:14px;color:#60a5fa;">account_balance</span>
                            <span><strong style="color:#94a3b8;">PSE:</strong> <span style="color:#93c5fd;">${inc.pemetaan_fakta_hukum.subjek_pse}</span></span>
                        </div>
                        <div style="font-size:12px;display:flex;gap:8px;">
                            <span class="material-symbols-rounded" style="font-size:14px;color:#eab308;">gavel</span>
                            <span><strong style="color:#94a3b8;">Kualifikasi:</strong> <span style="color:#fde047;">${inc.kualifikasi_peristiwa}</span></span>
                        </div>
                        <div style="font-size:12px;background:rgba(0,0,0,0.3);padding:10px;border-radius:6px;margin-top:4px;border-left:2px solid #10b981;">
                            <strong style="color:#10b981;display:block;margin-bottom:4px;">Nexus Kausalitas:</strong>
                            <span style="color:#94a3b8;">${inc.pemetaan_fakta_hukum.nexus_kausalitas}</span>
                        </div>
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
    // SECTOR ANALYSIS (5 Sektor Prioritas)
    // ===================================================================
    const SECTOR_DATA_ID = [
        {
            key: 'fintech',
            icon: '🏦',
            iconBg: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
            title: 'Keuangan & Fintech AI',
            subtitle: 'Credit Scoring · Fraud Detection · Robo-Advisor',
            coverageScore: 38,
            coverageColor: '#f59e0b',
            pasals: [
                { status: 'partial', name: 'UU PDP Ps. 16-20', desc: 'Prinsip pemrosesan data, dasar hukum — belum mengatur keputusan otomatis AI.' },
                { status: 'partial', name: 'POJK 11/2022 Mnj. Risiko TI', desc: 'Manajemen risiko TI Perbankan — tidak spesifik mengatur algoritma AI prediktif.' },
                { status: 'gap', name: 'Sandbox AI Keuangan', desc: 'BELUM ADA: Regulasi sandbox untuk uji coba AI di sektor keuangan.' },
                { status: 'gap', name: 'Kewajiban Audit Bias', desc: 'BELUM ADA: Kewajiban audit bias algoritmik untuk credit scoring.' },
                { status: 'covered', name: 'POJK 77/2016 Fintech', desc: 'Penyelenggaraan layanan pinjam meminjam berbasis teknologi.' },
                { status: 'gap', name: 'Human Oversight AI', desc: 'BELUM ADA: Kewajiban pengawasan manusia dalam keputusan kredit otomatis.' },
            ],
            recom: 'Studi merekomendasikan: regulasi berbasis sandbox, kewajiban audit bias algoritma credit scoring, dan mekanisme pengawasan manusia (human-in-the-loop) wajib untuk keputusan keuangan berrisiko tinggi.',
            studyRef: 'OECD AI Principle 1.4 · EU AI Act Art. 9 (High-Risk AI Systems)'
        },
        {
            key: 'facial',
            icon: '👁️',
            iconBg: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            title: 'Facial Recognition & Biometrik',
            subtitle: 'eKYC · Pengawasan Publik · Akses Sistem',
            coverageScore: 22,
            coverageColor: '#f43f5e',
            pasals: [
                { status: 'partial', name: 'UU PDP Ps. 26 (Data Biometrik)', desc: 'Mengatur data biometrik sebagai data sensitif — tidak ada ketentuan teknis FR.' },
                { status: 'partial', name: 'PP PSTE Ps. 28', desc: 'Keamanan sistem elektronik — tidak menyebut facial recognition secara eksplisit.' },
                { status: 'gap', name: 'Izin Khusus Penggunaan FR', desc: 'BELUM ADA: Regulasi yang mensyaratkan izin tertulis sebelum menggunakan FR di ruang publik.' },
                { status: 'gap', name: 'Standar Akurasi & Bias FR', desc: 'BELUM ADA: Standar teknis akurasi pengenalan wajah dan larangan bias demografis.' },
                { status: 'gap', name: 'Hak Menolak FR', desc: 'BELUM ADA: Hak eksplisit warga untuk menolak pengenalan wajah.' },
            ],
            recom: 'Studi merekomendasikan: regulasi khusus facial recognition, mekanisme pengawasan mandiri, larangan penggunaan FR untuk profiling massal oleh sektor swasta tanpa izin eksplisit.',
            studyRef: 'EU AI Act Art. 5(1)(d) (Prohibited FR in Public) · UNESCO Rec. Value 10 (Privacy)'
        },
        {
            key: 'ecommerce',
            icon: '🛒',
            iconBg: 'linear-gradient(135deg, #0369a1, #0ea5e9)',
            title: 'E-Commerce & Perdagangan Digital',
            subtitle: 'Algoritma Rekomendasi · Ranking · Personalisasi Harga',
            coverageScore: 29,
            coverageColor: '#f59e0b',
            pasals: [
                { status: 'covered', name: 'UU Perdagangan Ps. 65', desc: 'Informasi produk dalam perdagangan elektronik.' },
                { status: 'partial', name: 'UU PK Ps. 7 (Hak Konsumen)', desc: 'Hak atas informasi yang benar — tidak eksplisit mengatur transparansi algoritma.' },
                { status: 'partial', name: 'PP PSTE Ps. 25', desc: 'Konten sistem elektronik — tidak mengatur algoritma ranking produk.' },
                { status: 'gap', name: 'Larangan Self-Preferencing', desc: 'BELUM ADA: Larangan platform lebih mengutamakan produk sendiri dalam algoritma.' },
                { status: 'gap', name: 'Transparansi Algoritma Ranking', desc: 'BELUM ADA: Kewajiban mengungkap faktor penentu ranking produk kepada pelaku usaha.' },
                { status: 'gap', name: 'Personalisasi Harga AI', desc: 'BELUM ADA: Larangan diskriminasi harga berbasis profiling AI.' },
            ],
            recom: 'Studi merekomendasikan: kewajiban transparansi faktor ranking, larangan self-preferencing, dan mekanisme keberatan pedagang terhadap keputusan algoritma.',
            studyRef: 'EU Digital Markets Act Art. 6 · OECD AI Rec. 1.3 (Fairness & Non-Discrimination)'
        },
        {
            key: 'content',
            icon: '🎭',
            iconBg: 'linear-gradient(135deg, #be185d, #ec4899)',
            title: 'AI-Generated Content & Media',
            subtitle: 'Deepfake · Voice Cloning · Synthetic Media',
            coverageScore: 35,
            coverageColor: '#f59e0b',
            pasals: [
                { status: 'partial', name: 'UU ITE Ps. 27A (Konten Kesusilaan)', desc: 'Melarang konten asusila — tidak ada ketentuan khusus konten sintetis AI.' },
                { status: 'partial', name: 'UU ITE Ps. 28 (Informasi Bohong)', desc: 'Melarang hoaks — sulit dibuktikan untuk deepfake tanpa watermark mandatori.' },
                { status: 'partial', name: 'UU Hak Cipta Ps. 40', desc: 'Karya cipta — belum mengatur kepemilikan konten yang dihasilkan AI.' },
                { status: 'gap', name: 'Label Wajib Konten AI', desc: 'BELUM ADA: Kewajiban watermark/label visible pada setiap konten yang dihasilkan AI.' },
                { status: 'gap', name: 'Akuntabilitas Platform', desc: 'BELUM ADA: Tanggung jawab platform AI atas konten berbahaya yang dihasilkan.' },
                { status: 'gap', name: 'Mekanisme Pengaduan Korban Deepfake', desc: 'BELUM ADA: Prosedur pengaduan cepat dan take-down wajib untuk konten deepfake non-konsensual.' },
            ],
            recom: 'Studi merekomendasikan: kewajiban watermarking konten AI, akuntabilitas penyedia model, dan mekanisme pengaduan serta take-down yang cepat bagi korban deepfake.',
            studyRef: 'EU AI Act Art. 50 (Transparency for GPAI) · UNESCO Rec. Value 9 (Freedom of Expression)'
        },
        {
            key: 'judicial',
            icon: '⚖️',
            iconBg: 'linear-gradient(135deg, #065f46, #10b981)',
            title: 'AI di Peradilan & Hukum',
            subtitle: 'Sistem Prediksi Vonis · RisikoPenilaian Tersangka · Legal Research AI',
            coverageScore: 18,
            coverageColor: '#f43f5e',
            pasals: [
                { status: 'covered', name: 'UU Kekuasaan Kehakiman Ps. 1', desc: 'Hakim sebagai pemegang kekuasaan yudisial — melarang substitusi hakim.' },
                { status: 'partial', name: 'KUHAP Ps. 183 (Pembuktian)', desc: 'Standar pembuktian — bukti AI belum diatur validitasnya secara eksplisit.' },
                { status: 'gap', name: 'Batas Peran AI di Pengadilan', desc: 'BELUM ADA: Regulasi yang menetapkan AI hanya sebagai "alat bantu" hakim.' },
                { status: 'gap', name: 'Transparansi Algoritma Penilaian', desc: 'BELUM ADA: Hak terdakwa mengetahui bagaimana AI menilai risiko.' },
                { status: 'gap', name: 'Standar Validasi Model AI Peradilan', desc: 'BELUM ADA: Lembaga yang berwenang memvalidasi AI yang digunakan di peradilan.' },
            ],
            recom: 'Studi merekomendasikan: AI di peradilan harus dibatasi sebagai alat bantu (non-determinatif), hakim tetap harus memiliki reasoning independen, dan setiap AI peradilan wajib diaudit secara berkala.',
            studyRef: 'CETS225 Art. 17 (Judicial Review of AI) · EU AI Act Art. 6(2) High-Risk AI List'
        }
    ];
    const SECTOR_DATA_EN = [
        {
            key: 'fintech',
            icon: '🏦',
            iconBg: 'linear-gradient(135deg, #1d4ed8, #2563eb)',
            title: 'Finance & Fintech AI',
            subtitle: 'Credit Scoring · Fraud Detection · Robo-Advisor',
            coverageScore: 38,
            coverageColor: '#f59e0b',
            pasals: [
                { status: 'partial', name: 'UU PDP Ps. 16-20', desc: 'Data processing principles, legal basis — has not regulated automated AI decisions.' },
                { status: 'partial', name: 'POJK 11/2022 Mnj. Risiko TI', desc: 'Banking IT risk management — does not specifically regulate predictive AI algorithms.' },
                { status: 'gap', name: 'Financial AI Sandbox', desc: 'NOT YET EXISTS: Sandbox regulation for AI trials in the financial sector.' },
                { status: 'gap', name: 'Bias Audit Obligation', desc: 'NOT YET EXISTS: Obligation for algorithmic bias audit for credit scoring.' },
                { status: 'covered', name: 'POJK 77/2016 Fintech', desc: 'Organizing technology-based lending and borrowing services.' },
                { status: 'gap', name: 'Human Oversight AI', desc: 'NOT YET EXISTS: Obligation for human oversight in automated credit decisions.' },
            ],
            recom: 'Studies recommend: sandbox-based regulation, obligation to audit algorithms for credit scoring bias, and mandatory human-in-the-loop oversight mechanisms for high-risk financial decisions.',
            studyRef: 'OECD AI Principle 1.4 · EU AI Act Art. 9 (High-Risk AI Systems)'
        },
        {
            key: 'facial',
            icon: '👁️',
            iconBg: 'linear-gradient(135deg, #7c3aed, #a855f7)',
            title: 'Facial Recognition & Biometrics',
            subtitle: 'eKYC · Public Surveillance · System Access',
            coverageScore: 22,
            coverageColor: '#f43f5e',
            pasals: [
                { status: 'partial', name: 'UU PDP Ps. 26 (Data Biometrik)', desc: 'Regulates biometric data as sensitive data — no technical provisions for FR.' },
                { status: 'partial', name: 'PP PSTE Ps. 28', desc: 'Security of electronic systems — does not explicitly mention facial recognition.' },
                { status: 'gap', name: 'Special Permit for FR Use', desc: 'NOT YET EXISTS: Regulation requiring written permission before using FR in public spaces.' },
                { status: 'gap', name: 'FR Accuracy & Bias Standards', desc: 'NOT YET EXISTS: Technical standards for facial recognition accuracy and prohibition of demographic bias.' },
                { status: 'gap', name: 'Right to Refuse FR', desc: 'NOT YET EXISTS: Explicit right of citizens to refuse facial recognition.' },
            ],
            recom: 'Studies recommend: specific regulation for facial recognition, independent oversight mechanisms, and prohibition of FR use for mass profiling by the private sector without explicit permission.',
            studyRef: 'EU AI Act Art. 5(1)(d) (Prohibited FR in Public) · UNESCO Rec. Value 10 (Privacy)'
        },
        {
            key: 'ecommerce',
            icon: '🛒',
            iconBg: 'linear-gradient(135deg, #0369a1, #0ea5e9)',
            title: 'E-Commerce & Digital Trade',
            subtitle: 'Recommendation Algorithms · Ranking · Price Personalization',
            coverageScore: 29,
            coverageColor: '#f59e0b',
            pasals: [
                { status: 'covered', name: 'UU Perdagangan Ps. 65', desc: 'Product information in electronic trading.' },
                { status: 'partial', name: 'UU PK Ps. 7 (Hak Konsumen)', desc: 'Right to correct information — does not explicitly regulate algorithm transparency.' },
                { status: 'partial', name: 'PP PSTE Ps. 25', desc: 'Electronic system content — does not regulate product ranking algorithms.' },
                { status: 'gap', name: 'Prohibition of Self-Preferencing', desc: 'NOT YET EXISTS: Platform prohibition from prioritizing its own products in algorithms.' },
                { status: 'gap', name: 'Ranking Algorithm Transparency', desc: 'NOT YET EXISTS: Obligation to disclose factors determining product ranking to businesses.' },
                { status: 'gap', name: 'AI Price Personalization', desc: 'NOT YET EXISTS: Prohibition of price discrimination based on AI profiling.' },
            ],
            recom: 'Studies recommend: transparency obligation for ranking factors, prohibition of self-preferencing, and merchant objection mechanisms against algorithmic decisions.',
            studyRef: 'EU Digital Markets Act Art. 6 · OECD AI Rec. 1.3 (Fairness & Non-Discrimination)'
        },
        {
            key: 'content',
            icon: '🎭',
            iconBg: 'linear-gradient(135deg, #be185d, #ec4899)',
            title: 'AI-Generated Content & Media',
            subtitle: 'Deepfake · Voice Cloning · Synthetic Media',
            coverageScore: 35,
            coverageColor: '#f59e0b',
            pasals: [
                { status: 'partial', name: 'UU ITE Ps. 27A (Konten Kesusilaan)', desc: 'Prohibits obscene content — no specific provisions for AI synthetic content.' },
                { status: 'partial', name: 'UU ITE Ps. 28 (Informasi Bohong)', desc: 'Prohibits hoaxes — difficult to prove for deepfakes without a mandatory watermark.' },
                { status: 'partial', name: 'UU Hak Cipta Ps. 40', desc: 'Copyright — has not regulated ownership of AI-generated content.' },
                { status: 'gap', name: 'Mandatory AI Content Label', desc: 'NOT YET EXISTS: Obligation for visible watermark/label on any AI-generated content.' },
                { status: 'gap', name: 'Platform Accountability', desc: 'NOT YET EXISTS: AI platform responsibility for generated harmful content.' },
                { status: 'gap', name: 'Deepfake Victim Grievance Mechanism', desc: 'NOT YET EXISTS: Fast reporting and mandatory take-down procedures for non-consensual deepfake content.' },
            ],
            recom: 'Studies recommend: AI content watermarking obligation, model provider accountability, and fast grievance/take-down mechanisms for deepfake victims.',
            studyRef: 'EU AI Act Art. 50 (Transparency for GPAI) · UNESCO Rec. Value 9 (Freedom of Expression)'
        },
        {
            key: 'judicial',
            icon: '⚖️',
            iconBg: 'linear-gradient(135deg, #065f46, #10b981)',
            title: 'AI in Justice & Law',
            subtitle: 'Verdict Prediction Systems · Suspect Risk Assessment · Legal Research AI',
            coverageScore: 18,
            coverageColor: '#f43f5e',
            pasals: [
                { status: 'covered', name: 'UU Kekuasaan Kehakiman Ps. 1', desc: 'Judges as holders of judicial power — prohibits judge substitution.' },
                { status: 'partial', name: 'KUHAP Ps. 183 (Pembuktian)', desc: 'Proof standards — AI evidence validity has not been explicitly regulated.' },
                { status: 'gap', name: 'Limits of AI\\'s Role in Courts', desc: 'NOT YET EXISTS: Regulation designating AI solely as an "assistant" to judges.' },
                { status: 'gap', name: 'Assessment Algorithm Transparency', desc: 'NOT YET EXISTS: Defendant\\'s right to know how AI assesses their risk.' },
                { status: 'gap', name: 'Judicial AI Model Validation Standard', desc: 'NOT YET EXISTS: Authority responsible for validating AI used in the judicial system.' },
            ],
            recom: 'Studies recommend: AI in the judiciary must be limited as a tool (non-determinative), judges must retain independent reasoning, and judicial AI must be audited periodically.',
            studyRef: 'CETS225 Art. 17 (Judicial Review of AI) · EU AI Act Art. 6(2) High-Risk AI List'
        }
    ];

    function initSectorAnalysis() {
        const container = document.getElementById('sector-grid-container');
        if (!container || container.dataset.rendered === 'true') return;
        container.innerHTML = '';
        container.dataset.rendered = 'true';

        const activeSectorData = (typeof window !== 'undefined' && window.currentLang === 'en') ? SECTOR_DATA_EN : SECTOR_DATA_ID;
        activeSectorData.forEach(sector => {
            const covered = sector.pasals.filter(p => p.status === 'covered').length;
            const partial = sector.pasals.filter(p => p.status === 'partial').length;
            const gap = sector.pasals.filter(p => p.status === 'gap').length;

            const pasalListHTML = sector.pasals.map(p => `
                <div class="pasal-item">
                    <div class="p-dot ${p.status}"></div>
                    <div>
                        <span class="p-name">${p.name}</span>
                        <span class="p-desc">${p.desc}</span>
                    </div>
                </div>
            `).join('');

            const borderColor = sector.coverageScore < 30
                ? 'rgba(251,113,133,0.25)'
                : sector.coverageScore < 60
                    ? 'rgba(251,191,36,0.25)'
                    : 'rgba(52,211,153,0.25)';

            container.innerHTML += `
                <div class="sector-card" style="border-color:${borderColor};">
                    <div class="sc-header">
                        <div class="sc-icon" style="background:${sector.iconBg};">${sector.icon}</div>
                        <div>
                            <div class="sc-title">${sector.title}</div>
                            <div class="sc-sub">${sector.subtitle}</div>
                        </div>
                    </div>
                    <div class="gauge-row">
                        <span class="gauge-label">Coverage</span>
                        <div class="gauge-bar">
                            <div class="gauge-fill" style="width:${sector.coverageScore}%; background:${sector.coverageColor};"></div>
                        </div>
                        <span class="gauge-pct" style="color:${sector.coverageColor};">${sector.coverageScore}%</span>
                    </div>
                    <div class="sc-badge-row">
                        <span class="badge covered">✓ ${covered} Covered</span>
                        <span class="badge partial">⚠ ${partial} Parsial</span>
                        <span class="badge gap">✕ ${gap} Gap</span>
                    </div>
                    <div class="pasal-list">${pasalListHTML}</div>
                    <div class="sc-recom">
                        <strong>💡 Rekomendasi Studi Terdahulu</strong>
                        ${sector.recom}
                        <div class="sc-ref">📚 Ref: ${sector.studyRef}</div>
                    </div>
                </div>
            `;
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
        document.getElementById('cn-ai-recommendation').innerHTML = '<span style="font-style:italic; color:#94a3b8;">Klik tombol di bawah untuk mendapatkan panduan kepatuhan konkret dari AI berdasarkan profil dan regulasi Anda.</span>';
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
            const res = await fetch('./data/network/legal_graph.json');
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
            <h5 style="color:#fca5a5; font-family:Outfit; margin-bottom:6px; font-size:0.95rem;">⬤ <strong>Grounds</strong> — Data Empiris Insiden</h5>
            <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:6px; border-left:3px solid #fca5a5; font-size:0.82rem; line-height:1.5;">
                ${incidentNode?.content || incidentNode?.label || 'Data teks tidak tersedia.'}
            </div>
        </div>`;

        html += `<div>
            <h5 style="color:#6ee7b7; font-family:Outfit; margin-bottom:6px; font-size:0.95rem;">⬤ <strong>Warrant</strong> — Kaidah Penghubung: ${regNodes.length} Regulasi Terdeteksi</h5>`;

        if (regNodes.length === 0) {
            html += `<p style="font-size:0.82rem; font-style:italic; color:#94a3b8;">⚠️ LNA tidak menemukan warrant normatif di atas threshold similarity — tidak ada regulasi yang secara semantik terkait dengan insiden ini.</p>`;
        } else {
            regNodes.forEach(reg => {
                html += `<div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:6px; border-left:3px solid #6ee7b7; font-size:0.82rem; margin-bottom:8px; line-height:1.5;">
                    <strong style="color:#94a3b8; display:block; margin-bottom:4px;">${reg.label}</strong>
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
            network.setOptions({ nodes: { font: { color: '#ffffff' } } });
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
            <tr style="border-bottom:1px solid rgba(255,255,255,0.04);">
                <td style="padding:9px 12px; color:var(--text-2); font-weight:500;">${metrik}</td>
                <td style="padding:9px 12px; text-align:right; font-family:monospace; font-weight:700; color:${colorClass(nilai, metrik)};">${nilai}</td>
                <td style="padding:9px 12px; color:var(--text-3); font-size:0.82rem; line-height:1.4;">${implikasi}</td>
            </tr>
        `).join('');

        if (typeof applyTranslations === 'function') applyTranslations();
    }

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
