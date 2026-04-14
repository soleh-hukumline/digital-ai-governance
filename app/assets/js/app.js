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
            if (!res.ok) throw new Error('File MD tidak ditemukan (404)');
            const mdText = await res.text();
            container.innerHTML = marked.parse(mdText);
        } catch (e) {
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
                if (legendContainer) legendContainer.innerHTML = legendHtml;

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
        } catch (e) {
            document.getElementById('incident-registry-container').innerHTML = '<div style="color:#ef4444; padding:15px;">Gagal memuat raw data incident.</div>';
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
            let typeBadge = '';
            if (inc.type === 'ransomware') typeBadge = '<span style="background:rgba(239, 68, 68, 0.2); color:#ef4444; padding:2px 8px; border-radius:4px; font-size:11px;">Ransomware</span>';
            else if (inc.type === 'data_breach') typeBadge = '<span style="background:rgba(59, 130, 246, 0.2); color:#3b82f6; padding:2px 8px; border-radius:4px; font-size:11px;">Data Breach</span>';
            else if (['ai_fraud', 'ai_misuse'].includes(inc.type)) typeBadge = '<span style="background:rgba(168, 85, 247, 0.2); color:#a855f7; padding:2px 8px; border-radius:4px; font-size:11px;">AI Ethics/Fraud</span>';
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
        if (!searchInput) return;
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

    if (searchInput) searchInput.addEventListener('input', applyIncidentFilters);
    if (typeSelect) typeSelect.addEventListener('change', applyIncidentFilters);

    // --- AI LEGAL SYLLOGISM LOGIC ---
    let aiNetworkData = null; // Store nodes and edges to query
    let aiIncidentNodes = [];

    async function initAIFeature() {
        // Load API Key from LocalStorage
        const apiKeyInput = document.getElementById('ai-api-key');
        const saveBtn = document.getElementById('save-api-key');
        const providerSelect = document.getElementById('ai-provider-select');
        const modelSelect = document.getElementById('ai-model-select');

        function updateProviderUI() {
            if(!providerSelect || !apiKeyInput || !modelSelect) return;
            const prov = providerSelect.value;
            modelSelect.innerHTML = '<option value="">⚙️ Tekan Simpan untuk Melacak API Model</option>';
            if (prov === 'groq') {
                apiKeyInput.placeholder = "Masukkan Groq API Key Anda (gsk_...)";
                apiKeyInput.value = localStorage.getItem('groq_api_key') || '';
            } else {
                apiKeyInput.placeholder = "Masukkan Google Gemini API Key Anda...";
                apiKeyInput.value = localStorage.getItem('gemini_api_key') || '';
            }
        }

        if (providerSelect) {
            providerSelect.addEventListener('change', updateProviderUI);
            updateProviderUI(); // init
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                if (apiKeyInput.value.trim() !== '') {
                    const key = apiKeyInput.value.trim();
                    const prov = providerSelect.value;
                    
                    if (prov === 'groq') {
                        localStorage.setItem('groq_api_key', key);
                        saveBtn.innerText = "Melacak Model...";
                        saveBtn.style.background = "#f59e0b"; // yellow
                        
                        try {
                            const res = await fetch(`https://api.groq.com/openai/v1/models`, {
                                headers: { 'Authorization': `Bearer ${key}` }
                            });
                            const data = await res.json();
                            if(data.data) {
                                if(modelSelect) {
                                    modelSelect.innerHTML = ''; 
                                    const allowedModels = data.data.filter(m => !m.id.includes('whisper') && !m.id.includes('stub'));
                                    
                                    // sort alphabet or versatile first
                                    allowedModels.sort();
                                    
                                    allowedModels.forEach(m => {
                                        const opt = document.createElement('option');
                                        opt.value = m.id;
                                        opt.textContent = m.id;
                                        if (m.id.includes('versatile') || m.id.includes('70b')) opt.selected = true;
                                        modelSelect.appendChild(opt);
                                    });
                                }
                                saveBtn.innerText = "Tersambung!";
                                saveBtn.style.background = "#10b981"; // green
                            } else {
                                throw new Error("Invalid format");
                            }
                        } catch(e) {
                             saveBtn.innerText = "API Key Invalid/Lokal";
                             saveBtn.style.background = "#ef4444"; // red
                        }
                        
                        setTimeout(() => {
                            saveBtn.innerText = "Simpan Kunci API";
                            saveBtn.style.background = "#a855f7";
                        }, 2500);
                        return;
                    }
                    
                    // Gemini Logic
                    localStorage.setItem('gemini_api_key', key);
                    saveBtn.innerText = "Melacak Model...";
                    saveBtn.style.background = "#f59e0b"; // yellow loading
                    
                    try {
                        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${key}`);
                        const data = await res.json();
                        
                        if(data.models) {
                            if(modelSelect) {
                                modelSelect.innerHTML = ''; // clear hardcoded
                                let hasPro = false;
                                data.models.forEach(m => {
                                    if(m.supportedGenerationMethods && m.supportedGenerationMethods.includes('generateContent')) {
                                        const opt = document.createElement('option');
                                        const modelId = m.name.replace('models/', '');
                                        opt.value = modelId;
                                        opt.textContent = `${m.displayName || modelId}`;
                                        
                                        // Auto-select preference
                                        if (modelId === 'gemini-1.5-pro-latest') hasPro = true;
                                        
                                        modelSelect.appendChild(opt);
                                    }
                                });
                            }
                            saveBtn.innerText = "Tersambung!";
                            saveBtn.style.background = "#10b981"; // green success
                        } else {
                            throw new Error("Invalid format");
                        }
                    } catch(e) {
                         console.error("Gagal menarik daftar model:", e);
                         saveBtn.innerText = "Tersimpan (Lokal)";
                         saveBtn.style.background = "#10b981";
                    }

                    setTimeout(() => {
                        saveBtn.innerText = "Simpan Kunci API";
                        saveBtn.style.background = "#a855f7";
                    }, 2500);
                }
            });
        }

        // Fetch Master Network Graph for AI RAG Search
        try {
            const res = await fetch('./data/network/legal_graph.json');
            aiNetworkData = await res.json();

            // Extract Incidents to populate Select Dropdown
            aiIncidentNodes = aiNetworkData.nodes.filter(n => n.group === 'Insiden Kasus');
            const selectEl = document.getElementById('ai-incident-select');

            if (selectEl) {
                // sort by year
                aiIncidentNodes.sort((a, b) => (b.year || 2024) - (a.year || 2024));
                aiIncidentNodes.forEach(inc => {
                    const opt = document.createElement('option');
                    opt.value = inc.id;
                    opt.textContent = `[${inc.year || ''}] ${inc.label}`;
                    selectEl.appendChild(opt);
                });

                selectEl.addEventListener('change', updateAIContextPanel);
            }
        } catch (e) {
            console.error("Gagal memuat graph untuk AI", e);
        }

        // Analyze Button
        const analyzeBtn = document.getElementById('btn-analyze-ai');
        if (analyzeBtn) {
            analyzeBtn.addEventListener('click', runAIToulmin);
        }
    }

    function updateAIContextPanel() {
        const modelSelect = document.getElementById('ai-model-select');
        const selectedModel = modelSelect ? modelSelect.value : 'gemini-3.1-pro';
        const selectEl = document.getElementById('ai-incident-select');
        const incidentId = selectEl.value;
        const contextBody = document.getElementById('ai-context-body');

        if (!incidentId) {
            contextBody.innerHTML = 'Silakan pilih insiden terlebih dahulu untuk melihat kronologi kasus dan interkoneksi pasal-pasalnya.';
            return;
        }

        // Get Incident Node (Premis Minor)
        const incidentNode = aiIncidentNodes.find(n => n.id === incidentId);

        // Get Linked Regulation Nodes (Premis Mayor)
        const linkedEdges = aiNetworkData.edges.filter(e => (e.from === incidentId || e.to === incidentId));
        const linkedRegIds = linkedEdges.map(e => e.from === incidentId ? e.to : e.from);

        const regNodes = aiNetworkData.nodes.filter(n => linkedRegIds.includes(n.id) && n.group !== 'Insiden Kasus');

        let html = `<div style="margin-bottom: 20px;">
            <h5 style="color:#fca5a5; font-family:Outfit; margin-bottom:5px; font-size:1rem;">⬤ <strong>Grounds</strong> — Data Empiris Insiden (Toulmin)</h5>
            <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:6px; border-left:3px solid #fca5a5; font-size:0.85rem;">
                ${incidentNode.content || 'Data teks tidak tersedia.'}
            </div>
        </div>`;

        html += `<div>
            <h5 style="color:#6ee7b7; font-family:Outfit; margin-bottom:5px; font-size:1rem;">⬤ <strong>Warrant</strong> — Kaidah Penghubung: ${regNodes.length} Regulasi Terdeteksi (TF-IDF LNA)</h5>`;

        if (regNodes.length === 0) {
            html += `<p style="font-size:0.85rem; font-style:italic; color:#94a3b8;">⚠️ Sistem LNA tidak menemukan <em>warrant</em> normatif di atas threshold TF-IDF untuk insiden ini — indikasi kuat <strong>Kekosongan Hukum Absolut (Absolute Vacuum of Law)</strong>.</p>`;
        } else {
            regNodes.forEach(reg => {
                html += `
                <div style="background:rgba(255,255,255,0.05); padding:10px; border-radius:6px; border-left:3px solid #6ee7b7; font-size:0.85rem; margin-bottom:8px;">
                    <strong style="color:#94a3b8; display:block; margin-bottom:4px;">${reg.label}</strong>
                    ${(reg.content || '').substring(0, 300)}... <em>(dipotong)</em>
                </div>`;
            });
        }

        html += `</div>`;
        contextBody.innerHTML = html;

        // Save to data attributes for AI retrieval
        contextBody.dataset.incidentText = incidentNode.content;
        contextBody.dataset.regText = regNodes.map(r => `[${r.label}]: ${r.content}`).join('\n\n');
    }

    async function runAIToulmin() {
        const providerSelect = document.getElementById('ai-provider-select');
        const prov = providerSelect ? providerSelect.value : 'gemini';
        
        const apiKey = document.getElementById('ai-api-key').value.trim() || localStorage.getItem(prov === 'groq' ? 'groq_api_key' : 'gemini_api_key');
        if (!apiKey) {
            alert(`API Key ${prov.toUpperCase()} belum diisi!`);
            return;
        }

        const modelSelect = document.getElementById('ai-model-select');
        const selectedModel = modelSelect ? modelSelect.value : (prov === 'groq' ? 'llama3-70b-8192' : 'gemini-1.5-flash');

        const selectEl = document.getElementById('ai-incident-select');
        if (!selectEl.value) {
            alert("Pilih insiden terlebih dahulu.");
            return;
        }

        const contextBody = document.getElementById('ai-context-body');
        const incidentText = contextBody.dataset.incidentText || '';
        const regText = contextBody.dataset.regText || '';
        const regCount = contextBody.dataset.regText ? (contextBody.dataset.regText.match(/\[/g) || []).length : 0;

        const responseBody = document.getElementById('ai-response-body');
        responseBody.innerHTML = '<div class="loading">AI sedang membangun argumentasi Toulmin dan merajut konklusi hukum...</div>';

        const prompt = `Anda adalah Ahli AI Governance dan Hukum Siber Indonesia. Lakukan analisis forensik hukum menggunakan **Model Argumentasi Toulmin** berdasarkan data dari Legal Network Analysis (LNA) berikut ini.

Struktur jawaban Anda HARUS mengikuti 6 unsur Toulmin secara ketat dan berurutan:

---

### 1. CLAIM (Klaim)
Rumuskan klaim awal yang akan diuji: apakah terdapat kekosongan hukum (vacuum of law) terkait insiden ini?

### 2. GROUNDS (Data / Bukti Empiris)
Uraikan fakta-fakta insiden yang menjadi bukti pendukung klaim. Angkat elemen material: siapa pelaku, siapa korban, apa yang terjadi, apa dampaknya.

### 3. WARRANT (Kaidah Penghubung)
Jelaskan bagaimana pasal-pasal dari instrumen hukum yang terdeteksi oleh sistem LNA dapat (atau gagal) menjembatani fakta insiden dengan klaim kekosongan hukum. Apakah warrant ini cukup kuat, lemah, atau tidak ada?

### 4. BACKING (Dukungan Tambahan)
Perkuat warrant dengan konteks normatif yang lebih luas: doktrin hukum, standar internasional (OECD AI, EU AI Act), atau preseden yang relevan untuk mendukung / mematahkan klaim.

### 5. QUALIFIER (Tingkat Kepastian)
Nyatakan seberapa kuat klaim ini: apakah ini **pasti**, **kemungkinan besar**, atau **hanya dugaan**? Jelaskan faktor yang mempengaruhi tingkat kepastian (misalnya: jumlah pasal yang terdeteksi = ${regCount}, kekuatan semantik TF-IDF, cakupan regulasi).

### 6. REBUTTAL & CLAIM FINAL (Bantahan & Kesimpulan)
Identifikasi kemungkinan bantahan (rebuttal): adakah interpretasi lain, regulasi lain, atau argumen yang bisa mematahkan klaim? Setelah menimbang rebuttal:
- Jika tidak ada warrant sama sekali → nyatakan **Kekosongan Hukum Absolut (Absolute Vacuum of Law)**.
- Jika warrant ada tapi terlalu umum/kabur → nyatakan **Kekosongan Norma Relatif (Normative Vacuum)**.
- Jika warrant kuat dan spesifik → nyatakan **Instrumen SUDAH MENCUKUPI**, lalu jelaskan rekomendasinya.

---

**DATA GROUNDS (Fakta Insiden — ditarik dari dataset empiris):**
${incidentText}

**DATA WARRANT (Pasal/Regulasi — ditarik otomatis dari PDF hukum via TF-IDF LNA):**
${regText || 'TIDAK ADA PASAL YANG MEMETAKAN KASUS INI — indikasi kuat bahwa tidak ada warrant normatif yang berlaku (Absolute Vacuum of Law).'}
`;

        try {
            let aiText = "";
            let res;
            
            if (prov === 'groq') {
                res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${apiKey}`
                    },
                    body: JSON.stringify({
                        model: selectedModel,
                        messages: [
                            { role: 'system', content: 'Anda adalah Asisten Analis Hukum yang tegas dan lugas.' },
                            { role: 'user', content: prompt }
                        ],
                        temperature: 0.2
                    })
                });
                
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error?.message || 'Groq API Error');
                }
                const apiData = await res.json();
                aiText = apiData.choices[0].message.content;

            } else {
                res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${selectedModel}:generateContent?key=${apiKey}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: { temperature: 0.2 } // Strict analytical mode
                    })
                });
                
                if (!res.ok) {
                    const errorData = await res.json();
                    throw new Error(errorData.error?.message || 'Gemini API Error');
                }
                const apiData = await res.json();
                aiText = apiData.candidates[0].content.parts[0].text;
            }

            responseBody.innerHTML = marked.parse(aiText);

        } catch (error) {
            responseBody.innerHTML = `<div style="color:#ef4444; border:1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05); padding:1rem; border-radius:8px;">
                <strong>Gagal mengakses layanan AI:</strong> ${error.message}
            </div>`;
        }
    }



    // INITIAL EXECUTION
    loadAllNetworkGraphs();
    loadIncidentRegistry();
    initAIFeature();
});
