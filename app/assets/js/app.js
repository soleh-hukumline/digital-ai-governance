document.addEventListener('DOMContentLoaded', () => {
    
    let masterNodesData = null;
    let masterEdgesData = null;
    let nodesView = null;
    let edgesView = null;

    // NAVIGATION LOGIC (Mode Selector)
    const navItems = document.querySelectorAll('#mode-selector .nav-item');

    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(n => n.classList.remove('active'));
            item.classList.add('active');
        });
    });

    async function fetchMarkdownReport(filename, containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        try {
            const res = await fetch(`./system/legal_network_framework/${filename}`);
            if(!res.ok) throw new Error('File MD tidak ditemukan (404)');
            const mdText = await res.text();
            container.innerHTML = marked.parse(mdText);
        } catch(e) {
            container.innerHTML = `
                <div style="color:#ef4444; border:1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); padding:2rem; border-radius:12px;">
                    <h3><span class="material-symbols-rounded" style="vertical-align:bottom;">error</span> Gagal Membaca ${filename}</h3>
                </div>`;
        }
    }

    // 4. Render All Legal Network Analysis Models (Vis.js)
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
            // Trigger Markdown Rendering
            fetchMarkdownReport(model.report, `report-${model.id}`);
            
            // Render Graph
            try {
                const container = document.getElementById(`network-${model.id}`);
                if (!container) continue;

                container.innerHTML = '<div style="color:#6366f1; text-align:center; padding-top: 40px; font-family:Outfit; font-size:1.1rem;">Mengalkulasi Garis Gravitasi...</div>';

                const res = await fetch(`./data/network/${model.graph}`);
                const data = await res.json();
                
                const nodes = new vis.DataSet(data.nodes.map(n => ({
                    id: n.id,
                    label: n.label,
                    group: n.group,
                    classification: n.classification,
                    value: n.value,
                    title: `[${n.group}]\n${n.title}` 
                })));
                
                const edges = new vis.DataSet(data.edges.map(e => ({
                    from: e.from,
                    to: e.to,
                    title: e.label,
                    arrows: e.arrows || 'to',
                    color: { color: 'rgba(203, 213, 225, 0.4)', highlight: '#6366f1' }
                })));

                // Extract unique groups and assign palette
                const uniqueGroups = [...new Set(data.nodes.map(n => n.group))];
                const palette = [
                    '#f43f5e', '#ec4899', '#a855f7', '#6366f1', '#3b82f6', 
                    '#0ea5e9', '#06b6d4', '#14b8a6', '#10b981', '#22c55e', 
                    '#84cc16', '#eab308', '#f59e0b', '#f97316', '#ef4444', 
                    '#78716c', '#be123c', '#a21caf', '#6d28d9', '#1d4ed8'
                ];
                
                let legendHtml = '';
                let visGroupsObj = {};
                uniqueGroups.forEach((groupName, idx) => {
                    const color = palette[idx % palette.length];
                    visGroupsObj[groupName] = { color: { background: color, border: 'rgba(0,0,0,0.5)' } };
                    legendHtml += `<div style="display:inline-flex; align-items:center; background:rgba(0,0,0,0.4); padding:3px 10px; border-radius:20px; font-size:11px;">
                                     <span style="display:inline-block; width:10px; height:10px; border-radius:50%; background:${color}; margin-right:6px;"></span>
                                     <span style="color:#e2e8f0;">${groupName}</span>
                                   </div>`;
                });
                
                const legendContainer = document.getElementById(`legend-${model.id}`);
                if(legendContainer) legendContainer.innerHTML = legendHtml;

                const netData = { nodes: nodes, edges: edges };
                const options = {
                    groups: visGroupsObj,
                    nodes: {
                        shape: 'dot',
                        font: { color: '#ffffff', face: 'Inter', size: 12 },
                        shadow: { enabled: true, color: 'rgba(0,0,0,0.5)', size: 10, x: 2, y: 2 }
                    },
                    physics: {
                        forceAtlas2Based: {
                            gravitationalConstant: -70,
                            centralGravity: 0.015,
                            springLength: 100,
                            springConstant: 0.08
                        },
                        maxVelocity: 50,
                        solver: 'forceAtlas2Based',
                        timestep: 0.35,
                        stabilization: { iterations: 100 }
                    }
                };
                
                container.innerHTML = '';
                new vis.Network(container, netData, options);

            } catch (err) {
                const container = document.getElementById(`network-${model.id}`);
                if (container) container.innerHTML = '<div style="color:#ef4444; padding:2rem;">Gagal merender Graph.</div>';
            }
        }
    }

    // 5. Database Insiden Forensik (Raw JSON)
    let rawIncidentData = [];

    async function loadIncidentRegistry() {
        try {
            const res = await fetch('./data/incidents/indonesia_incidents.json');
            const json = await res.json();
            rawIncidentData = json.incidents;
            renderIncidentCards(rawIncidentData);
        } catch(e) {
            document.getElementById('incident-registry-container').innerHTML = '<div style="color:#ef4444; padding:15px;">Gagal memuat raw data incident.</div>';
        }
    }

    function renderIncidentCards(incidents) {
        const container = document.getElementById('incident-registry-container');
        if(!container) return;
        container.innerHTML = '';
        
        if(incidents.length === 0) {
            container.innerHTML = '<div style="color:#94a3b8; padding:15px;">Tidak ada insiden yang cocok dengan pencarian.</div>';
            return;
        }

        incidents.forEach(inc => {
            let typeBadge = '';
            if(inc.type === 'ransomware') typeBadge = '<span style="background:rgba(239, 68, 68, 0.2); color:#ef4444; padding:2px 8px; border-radius:4px; font-size:11px;">Ransomware</span>';
            else if(inc.type === 'data_breach') typeBadge = '<span style="background:rgba(59, 130, 246, 0.2); color:#3b82f6; padding:2px 8px; border-radius:4px; font-size:11px;">Data Breach</span>';
            else if(['ai_fraud', 'ai_misuse'].includes(inc.type)) typeBadge = '<span style="background:rgba(168, 85, 247, 0.2); color:#a855f7; padding:2px 8px; border-radius:4px; font-size:11px;">AI Ethics/Fraud</span>';
            else typeBadge = '<span style="background:rgba(255, 255, 255, 0.1); color:#fff; padding:2px 8px; border-radius:4px; font-size:11px;">Other</span>';

            container.innerHTML += `
                <div class="incident-card" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 12px; padding: 18px; display: flex; flex-direction: column; gap: 10px; transition: transform 0.2s;">
                    <div style="display:flex; justify-content:space-between; align-items:start; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom:8px; margin-bottom:4px;">
                        <span style="color:#e2e8f0; font-weight:700; font-family:'Outfit'; font-size:15px;">[${inc.year}] ${inc.id.toUpperCase()}</span>
                        <div>${typeBadge}</div>
                    </div>
                    <div style="font-size:13px; color:#cbd5e1; line-height:1.5;">${inc.peristiwa_hukum_kronologi}</div>
                    
                    <div style="margin-top:auto; padding-top:10px; display:grid; gap:8px;">
                        <div style="font-size:12px; display:flex; gap:8px;">
                            <span class="material-symbols-rounded" style="font-size:14px; color:#f87171;">warning</span>
                            <span><strong style="color:#94a3b8;">Pelaku:</strong> <span style="color:#fca5a5;">${inc.pemetaan_fakta_hukum.subjek_pelaku}</span></span>
                        </div>
                        <div style="font-size:12px; display:flex; gap:8px;">
                            <span class="material-symbols-rounded" style="font-size:14px; color:#60a5fa;">account_balance</span>
                            <span><strong style="color:#94a3b8;">Subjek (PSE):</strong> <span style="color:#93c5fd;">${inc.pemetaan_fakta_hukum.subjek_pse}</span></span>
                        </div>
                        <div style="font-size:12px; display:flex; gap:8px;">
                            <span class="material-symbols-rounded" style="font-size:14px; color:#eab308;">gavel</span>
                            <span><strong style="color:#94a3b8;">Kualifikasi Delik:</strong> <span style="color:#fde047;">${inc.kualifikasi_peristiwa}</span></span>
                        </div>
                        <div style="font-size:12px; background:rgba(0,0,0,0.3); padding:10px; border-radius:6px; margin-top:4px; border-left: 2px solid #10b981;">
                            <strong style="color:#10b981; display:block; margin-bottom:4px;">Nexus Kausalitas (Kelemahan SE):</strong>
                            <span style="color:#94a3b8;">${inc.pemetaan_fakta_hukum.nexus_kausalitas}</span>
                        </div>
                    </div>
                </div>
            `;
        });
    }

    // Filter Listeners
    const searchInput = document.getElementById('search-incident');
    const typeSelect = document.getElementById('filter-incident-type');
    
    function applyIncidentFilters() {
        if(!searchInput) return;
        const q = searchInput.value.toLowerCase();
        const type = typeSelect.value;
        
        const filtered = rawIncidentData.filter(inc => {
            const matchSearch = inc.peristiwa_hukum_kronologi.toLowerCase().includes(q) || 
                                inc.pemetaan_fakta_hukum.subjek_pse.toLowerCase().includes(q) ||
                                inc.pemetaan_fakta_hukum.objek_hukum.toLowerCase().includes(q) ||
                                inc.id.toLowerCase().includes(q);
            const matchType = type === 'all' ? true : inc.type === type || (type === 'ai_fraud' && inc.type === 'ai_misuse');
            return matchSearch && matchType;
        });
        
        renderIncidentCards(filtered);
    }

    if(searchInput) searchInput.addEventListener('input', applyIncidentFilters);
    if(typeSelect) typeSelect.addEventListener('change', applyIncidentFilters);


    // INITIAL EXECUTION
    loadAllNetworkGraphs();
    loadIncidentRegistry();
});
