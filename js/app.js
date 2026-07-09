// ═══════════════════════════════════════════════
// Variables Globales y Estado
// ═══════════════════════════════════════════════
let dataMig = [], dataCon = [], dataNT = [], dataPadron = [], torresEstatales = [];
let filteredMig = [], filteredCon = [], filteredNT = [], filteredPadron = [];
let mapMig = null, mapCon = null, mapNT = null;
let mapMigBounds = null, mapConBounds = null, mapNTBounds = null;
let chartMigProv = null, chartMigDist = null;
let layerGroupMig = null, layerGroupCon = null, layerGroupNT = null;

// Paginación
const ITEMS_PER_PAGE = 15;
let currentPageMig = 1, currentPageCon = 1, currentPageNT = 1, currentPagePadron = 1;

// Configuración Chart.js
const colors = {
    primary: '#8A004F',
    primaryDark: '#4B0028',
    accent: '#CC6C22',
    gold: '#D6B35F',
    success: '#0F766E',
    danger: '#B91C1C'
};

function safeGradient(ctx, colorStart, colorEnd) {
    if (!ctx || !ctx.chart || !ctx.chart.chartArea) return colorStart;
    const { bottom, top } = ctx.chart.chartArea;
    if (bottom === undefined || top === undefined || !isFinite(bottom) || !isFinite(top) || bottom === top) return colorStart;
    try {
        const gradient = ctx.chart.ctx.createLinearGradient(0, top, 0, bottom);
        gradient.addColorStop(0, colorStart);
        gradient.addColorStop(1, colorEnd || 'rgba(255,255,255,0)');
        return gradient;
    } catch(e) {
        return colorStart;
    }
}

function getArrayGradient(ctx, colorPairs) {
    const fallback = () => {
        if (ctx.type === 'data') return colorPairs[ctx.dataIndex % colorPairs.length][0];
        return colorPairs.map(c => c[0]);
    };
    if (!ctx || !ctx.chart || !ctx.chart.chartArea) return fallback();
    const { left, right } = ctx.chart.chartArea;
    if (left === undefined || right === undefined || !isFinite(left) || !isFinite(right) || left === right) return fallback();
    try {
        const gradients = colorPairs.map(pair => {
            const gradient = ctx.chart.ctx.createLinearGradient(left, 0, right, 0);
            gradient.addColorStop(0, pair[0]);
            gradient.addColorStop(1, pair[1]);
            return gradient;
        });
        if (ctx.type === 'data') return gradients[ctx.dataIndex % gradients.length];
        return gradients;
    } catch(e) {
        return fallback();
    }
}

Chart.defaults.font.family = "'Outfit', 'Inter', sans-serif";
Chart.defaults.color = '#5A5A6E';
Chart.defaults.plugins.legend.labels.usePointStyle = true;
Chart.defaults.plugins.legend.labels.pointStyle = 'circle';
Chart.defaults.plugins.tooltip.backgroundColor = '#1A1A2E';
Chart.defaults.plugins.tooltip.titleFont = { family: "'Outfit', sans-serif", weight: '700', size: 13 };
Chart.defaults.plugins.tooltip.bodyFont = { family: "'Inter', sans-serif", size: 12 };

// Helper animaciones numéricas
function animateCountUp(element, targetValue, duration = 900) {
    if(!element) return;
    const isFloat = String(targetValue).includes('.');
    const start = 0;
    const end = parseFloat(targetValue);
    if (isNaN(end)) { element.textContent = targetValue; return; }
    const startTime = performance.now();
    function update(currentTime) {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = start + (end - start) * eased;
        element.textContent = isFloat ? current.toFixed(isFloat ? (String(targetValue).split('.')[1] || '').length : 0) : Math.round(current).toLocaleString();
        if (progress < 1) requestAnimationFrame(update);
    }
    requestAnimationFrame(update);
}

function loadCSV(url) {
    return new Promise((resolve, reject) => {
        Papa.parse(url, {
            download: true,
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            transformHeader: h => h.toLowerCase().trim(),
            complete: resolve,
            error: reject
        });
    });
}

function normalizeText(text) {
    if (!text || String(text).toUpperCase() === 'UNDEFINED') return '';
    return String(text).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().trim();
}

// ═══════════════════════════════════════════════
// Inicialización
// ═══════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
    Promise.all([
        loadCSV('data/migraciones_posibles.csv'),
        loadCSV('data/conexiones_nivel3_torres_estatales.csv'),
        loadCSV('data/torres_propuestas_actualizado.csv'),
        loadCSV('data/Dataset_Instituciones_Unificadas.csv'),
        fetch('data/INFORMACION TORRES.txt').then(r => r.json()).catch(() => [])
    ]).then(([dMig, dCon, dNT, dPadron, torres]) => {
        
        const sanitize = (val) => {
            if (typeof val !== 'string') return val;
            if (!val.includes('\uFFFD')) return val;
            return val.replace(/NI\uFFFDoS/g, 'NIÑOS').replace(/\uFFFD/g, 'ñ');
        };
        const cleanRow = (row) => { for (let k in row) row[k] = sanitize(row[k]); return row; };

        dataMig = dMig.data.filter(r => r.id_institucion || r.institucion).map(cleanRow);
        dataCon = dCon.data.filter(r => r.id_institucion || r.institucion).map(cleanRow);
        dataNT = dNT.data.filter(r => r.nombre || r.grupo).map(cleanRow);
        dataPadron = dPadron.data.filter(r => r.id || r.nombre).map(cleanRow);
        torresEstatales = torres || [];

        // Join: Migracion necesita lat/lon y municipio de Padron
        dataMig.forEach(mig => {
            const match = dataPadron.find(p => String(p.id) === String(mig.id_institucion));
            if(match) {
                mig.latitud = match.latitud || match.LATITUD;
                mig.longitud = match.longitud || match.LONGITUD;
                mig.municipio = match.municipio;
                mig.sector = match.grupo_institucion;
            } else {
                mig.municipio = 'Desconocido';
            }
        });

        // Join: NT (Nuevas Torres) necesita municipio
        dataNT.forEach(nt => {
            const match = dataPadron.find(p => p.latitud === nt.latitud && p.longitud === nt.longitud);
            nt.municipio = match ? match.municipio : 'Desconocido';
        });

        filteredMig = [...dataMig];
        filteredCon = [...dataCon];
        filteredNT = [...dataNT];
        filteredPadron = [...dataPadron];

        initFilters();
        applyAllFilters();
        
        document.getElementById('loadingOverlay').classList.add('hidden');
        setTimeout(() => { if(mapMig) mapMig.invalidateSize(); }, 300);
    }).catch(e => {
        console.error(e);
        document.getElementById('loadingOverlay').classList.add('hidden');
        alert("Error cargando datos. Inicie un servidor local (ej. python -m http.server 8080).");
    });
});

// ═══════════════════════════════════════════════
// Navegación por Pestañas
// ═══════════════════════════════════════════════
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');

    document.querySelectorAll('.tab-button').forEach(b => b.classList.remove('active'));
    document.getElementById('btn-' + tabId).classList.add('active');

    window.dispatchEvent(new Event('resize'));
    
    setTimeout(() => {
        if(tabId === 'tab-migracion' && mapMig) {
            mapMig.invalidateSize();
            if(mapMigBounds) fitMapToData(mapMig, mapMigBounds);
        }
        if(tabId === 'tab-conexion' && mapCon) {
            mapCon.invalidateSize();
            if(mapConBounds) fitMapToData(mapCon, mapConBounds);
        }
        if(tabId === 'tab-nuevas-torres' && mapNT) {
            mapNT.invalidateSize();
            if(mapNTBounds) fitMapToData(mapNT, mapNTBounds);
        }
    }, 200);
}

// ═══════════════════════════════════════════════
// Filtros y KPIs
// ═══════════════════════════════════════════════
function initFilters() {
    const pop = (id, arr) => {
        const el = document.getElementById(id);
        if(!el) return;
        [...new Set(arr.filter(Boolean))].sort().forEach(v => el.appendChild(new Option(v, v)));
    };

    pop('map-mig-filter-mun', dataMig.map(r => normalizeText(r.municipio)));
    pop('map-mig-filter-prov', dataMig.map(r => normalizeText(r.proveedor)));
    
    pop('map-con-filter-mun', dataCon.map(r => normalizeText(r.municipio)));
    
    pop('map-nt-filter-sec', dataNT.map(r => normalizeText(r.grupo)));

    pop('padron-filter-mun', dataPadron.map(r => normalizeText(r.municipio)));
    pop('padron-filter-sec', dataPadron.map(r => normalizeText(r.grupo_institucion)));

    // Event listeners
    ['mig', 'con', 'nt', 'padron'].forEach(prefix => {
        document.querySelectorAll(`[id^="map-${prefix}-filter"], [id^="${prefix}-filter"]`).forEach(select => {
            select.addEventListener('change', () => applyFilters(prefix));
        });
    });
}

function resetFilters(prefix) {
    document.querySelectorAll(`[id^="map-${prefix}-filter"], [id^="${prefix}-filter"]`).forEach(select => select.value = 'all');
    applyFilters(prefix);
}

function applyAllFilters() {
    applyFilters('mig');
    applyFilters('con');
    applyFilters('nt');
    applyFilters('padron');
}

function applyFilters(prefix) {
    if (prefix === 'mig') {
        const mun = document.getElementById('map-mig-filter-mun').value;
        const prov = document.getElementById('map-mig-filter-prov').value;
        filteredMig = dataMig.filter(r => 
            (mun === 'all' || normalizeText(r.municipio) === mun) &&
            (prov === 'all' || normalizeText(r.proveedor) === prov)
        );
        currentPageMig = 1;
        updateMig();
    } 
    else if (prefix === 'con') {
        const mun = document.getElementById('map-con-filter-mun').value;
        filteredCon = dataCon.filter(r => (mun === 'all' || normalizeText(r.municipio) === mun));
        currentPageCon = 1;
        updateCon();
    }
    else if (prefix === 'nt') {
        const sec = document.getElementById('map-nt-filter-sec').value;
        filteredNT = dataNT.filter(r => (sec === 'all' || normalizeText(r.grupo) === sec));
        currentPageNT = 1;
        updateNT();
    }
    else if (prefix === 'padron') {
        const mun = document.getElementById('padron-filter-mun').value;
        const sec = document.getElementById('padron-filter-sec').value;
        const ipc = document.getElementById('padron-filter-ipc').value;
        
        filteredPadron = dataPadron.filter(r => {
            const mMatch = mun === 'all' || normalizeText(r.municipio) === mun;
            const sMatch = sec === 'all' || normalizeText(r.grupo_institucion) === sec;
            const ipcTxt = normalizeText(r.ipc);
            const iMatch = ipc === 'all' || ipcTxt.includes(normalizeText(ipc).split(' ')[1]); // Nivel 1, Nivel 2 etc.
            return mMatch && sMatch && iMatch;
        });
        currentPagePadron = 1;
        updatePadron();
    }
}

// ═══════════════════════════════════════════════
// Update Funciones (KPIs, Tablas, Mapas, Gráficas)
// ═══════════════════════════════════════════════

// MIGRACION (Nivel 2)
function updateMig() {
    // KPIs
    animateCountUp(document.getElementById('mig-kpi-inst'), filteredMig.length);
    // Hardcode ahorro total if no filter, else calculate (approx 15.6k per inst)
    const factorAhorro = 15600; 
    const ahorroTotal = filteredMig.length * factorAhorro / 1000000;
    animateCountUp(document.getElementById('mig-kpi-ahorro'), ahorroTotal.toFixed(1));
    const vistas = filteredMig.filter(r => String(r.linea_vista).toLowerCase() === 'true').length;
    animateCountUp(document.getElementById('mig-kpi-vista'), vistas);
    const sumDist = filteredMig.reduce((acc, r) => acc + (Number(r.dist_km)||0), 0);
    animateCountUp(document.getElementById('mig-kpi-dist'), filteredMig.length ? (sumDist/filteredMig.length).toFixed(1) : 0);

    renderTableMig();
    renderMap('mig');
    
    // Charts
    const provCounts = {};
    const distBins = Array(10).fill(0);
    let maxD = 0;
    filteredMig.forEach(r => {
        provCounts[r.proveedor || 'N/A'] = (provCounts[r.proveedor || 'N/A'] || 0) + 1;
        if(Number(r.dist_km) > maxD) maxD = Number(r.dist_km);
    });
    
    const bs = maxD/10 || 1;
    filteredMig.forEach(r => {
        let bi = Math.floor(Number(r.dist_km)/bs);
        if(bi>=10) bi=9;
        distBins[bi]++;
    });

    const provData = Object.entries(provCounts).sort((a,b)=>b[1]-a[1]).slice(0,8);

    if(chartMigProv) chartMigProv.destroy();
    chartMigProv = new Chart(document.getElementById('chart-mig-proveedores'), {
        type: 'bar',
        data: {
            labels: provData.map(d=>d[0]),
            datasets: [{ 
                data: provData.map(d=>d[1]), 
                backgroundColor: (ctx) => safeGradient(ctx, colors.accent, 'rgba(204,108,34,0.1)'), 
                borderColor: colors.accent,
                borderWidth: 1,
                borderRadius: 4 
            }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: {legend:{display:false}} }
    });

    if(chartMigDist) chartMigDist.destroy();
    chartMigDist = new Chart(document.getElementById('chart-mig-distribucion'), {
        type: 'bar',
        data: {
            labels: Array(10).fill(0).map((_,i) => `${(i*bs).toFixed(1)}-${((i+1)*bs).toFixed(1)}`),
            datasets: [{ 
                data: distBins, 
                backgroundColor: (ctx) => safeGradient(ctx, colors.primary, 'rgba(138,0,79,0.1)'), 
                borderColor: colors.primary,
                borderWidth: 1,
                borderRadius: 4 
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: {legend:{display:false}} }
    });
}

function renderTableMig() {
    const tbody = document.getElementById('tbody-mig');
    document.getElementById('info-mig').textContent = `Mostrando ${filteredMig.length} registros`;
    tbody.innerHTML = '';
    const start = (currentPageMig - 1) * ITEMS_PER_PAGE;
    const data = filteredMig.slice(start, start + ITEMS_PER_PAGE);

    data.forEach(row => {
        const lv = String(row.linea_vista).toLowerCase() === 'true';
        tbody.innerHTML += `<tr>
            <td>${row.id_institucion}</td>
            <td><strong>${row.institucion}</strong></td>
            <td>${row.municipio || 'N/A'}</td>
            <td>${row.proveedor || 'N/A'}</td>
            <td>${row.torre_cercana || 'N/A'}</td>
            <td>${Number(row.dist_km).toFixed(2)}</td>
            <td><span class="badge ${lv ? 'badge-success' : 'badge-danger'}">${lv ? 'Directa' : 'Obstruida'}</span></td>
        </tr>`;
    });
    renderPagination('mig', Math.ceil(filteredMig.length/ITEMS_PER_PAGE));
}


// CONEXION INICIAL (Nivel 3)
let chartConSec = null, chartConViab = null;
function updateCon() {
    animateCountUp(document.getElementById('con-kpi-inst'), filteredCon.length);
    const vistas = filteredCon.filter(r => String(r.linea_vista).toLowerCase() === 'true').length;
    animateCountUp(document.getElementById('con-kpi-vista'), vistas);
    animateCountUp(document.getElementById('con-kpi-obs'), filteredCon.length - vistas);
    const sumDist = filteredCon.reduce((acc, r) => acc + (Number(r.dist_km)||0), 0);
    animateCountUp(document.getElementById('con-kpi-dist'), filteredCon.length ? (sumDist/filteredCon.length).toFixed(1) : 0);

    renderTableCon();
    renderMap('con');

    const secCounts = {};
    filteredCon.forEach(r => { secCounts[r.sector || 'N/A'] = (secCounts[r.sector || 'N/A'] || 0) + 1; });
    const secData = Object.entries(secCounts).sort((a,b)=>b[1]-a[1]);

    if(chartConSec) chartConSec.destroy();
    chartConSec = new Chart(document.getElementById('chart-con-sectores'), {
        type: 'bar',
        data: {
            labels: secData.map(d=>d[0]),
            datasets: [{ 
                data: secData.map(d=>d[1]), 
                backgroundColor: (ctx) => safeGradient(ctx, colors.success, 'rgba(15,118,110,0.1)'), 
                borderColor: colors.success,
                borderWidth: 1,
                borderRadius: 4 
            }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: {legend:{display:false}} }
    });

    if(chartConViab) chartConViab.destroy();
    chartConViab = new Chart(document.getElementById('chart-con-viabilidad'), {
        type: 'bar',
        data: {
            labels: ['Viable Directa', 'Requiere Revisión'],
            datasets: [{ 
                data: [vistas, filteredCon.length - vistas], 
                backgroundColor: (ctx) => getArrayGradient(ctx, [[colors.success, 'rgba(15,118,110,0.1)'], [colors.danger, 'rgba(185,28,28,0.1)']]), 
                borderColor: [colors.success, colors.danger],
                borderWidth: 1,
                borderRadius: 4 
            }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: {legend:{display:false}} }
    });
}

function renderTableCon() {
    const tbody = document.getElementById('tbody-con');
    document.getElementById('info-con').textContent = `Mostrando ${filteredCon.length} registros`;
    tbody.innerHTML = '';
    const start = (currentPageCon - 1) * ITEMS_PER_PAGE;
    const data = filteredCon.slice(start, start + ITEMS_PER_PAGE);

    data.forEach(row => {
        const lv = String(row.linea_vista).toLowerCase() === 'true';
        tbody.innerHTML += `<tr>
            <td>${row.id_institucion}</td>
            <td><strong>${row.institucion}</strong></td>
            <td>${row.sector || 'N/A'}</td>
            <td>${row.municipio || 'N/A'}</td>
            <td>${row.torre_cercana || 'N/A'}</td>
            <td>${Number(row.dist_km).toFixed(2)}</td>
            <td><span class="badge ${lv ? 'badge-success' : 'badge-danger'}">${lv ? 'Viable' : 'Obstruida'}</span></td>
        </tr>`;
    });
    renderPagination('con', Math.ceil(filteredCon.length/ITEMS_PER_PAGE));
}


// NUEVAS TORRES (Nivel 4)
let chartNTDep = null, chartNTBack = null;
function updateNT() {
    animateCountUp(document.getElementById('nt-kpi-torres'), filteredNT.length);
    const sits = filteredNT.reduce((acc, r) => acc + (Number(r.cantidad_instituciones)||0), 0);
    animateCountUp(document.getElementById('nt-kpi-sitios'), sits);
    const sumDist = filteredNT.reduce((acc, r) => acc + (Number(r.dist_km_torre_estatal_mas_cercana)||0), 0);
    animateCountUp(document.getElementById('nt-kpi-dist'), filteredNT.length ? (sumDist/filteredNT.length).toFixed(1) : 0);
    const vistas = filteredNT.filter(r => String(r.linea_vista).toLowerCase() === 'true').length;
    document.getElementById('nt-kpi-vista').textContent = `${vistas} / ${filteredNT.length}`;

    renderTableNT();
    renderMap('nt');

    const depCounts = {};
    filteredNT.forEach(r => { depCounts[r.dependencia_torre_estatal || 'N/A'] = (depCounts[r.dependencia_torre_estatal || 'N/A'] || 0) + 1; });
    
    if(chartNTDep) chartNTDep.destroy();
    chartNTDep = new Chart(document.getElementById('chart-nt-dependencia'), {
        type: 'bar',
        data: {
            labels: Object.keys(depCounts),
            datasets: [{ 
                data: Object.values(depCounts), 
                backgroundColor: (ctx) => safeGradient(ctx, colors.primary, 'rgba(138,0,79,0.1)'), 
                borderColor: colors.primary,
                borderWidth: 1,
                borderRadius: 4 
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: {legend:{display:false}} }
    });

    if(chartNTBack) chartNTBack.destroy();
    chartNTBack = new Chart(document.getElementById('chart-nt-backhaul'), {
        type: 'bar',
        data: {
            labels: ['Directa', 'Obstruida'],
            datasets: [{ 
                data: [vistas, filteredNT.length - vistas], 
                backgroundColor: (ctx) => getArrayGradient(ctx, [[colors.success, 'rgba(15,118,110,0.1)'], [colors.danger, 'rgba(185,28,28,0.1)']]), 
                borderColor: [colors.success, colors.danger],
                borderWidth: 1,
                borderRadius: 4 
            }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: {legend:{display:false}} }
    });
}

function renderTableNT() {
    const tbody = document.getElementById('tbody-nt');
    document.getElementById('info-nt').textContent = `Mostrando ${filteredNT.length} registros`;
    tbody.innerHTML = '';
    const start = (currentPageNT - 1) * ITEMS_PER_PAGE;
    const data = filteredNT.slice(start, start + ITEMS_PER_PAGE);

    data.forEach(row => {
        const lv = String(row.linea_vista).toLowerCase() === 'true';
        tbody.innerHTML += `<tr>
            <td><strong>${row.grupo || 'N/A'}</strong></td>
            <td>${row.nombre || 'N/A'}</td>
            <td>${Number(row.dist_km_torre_estatal_mas_cercana).toFixed(2)}</td>
            <td>${row.cantidad_instituciones}</td>
            <td>${row.torre_estatal_cercana || 'N/A'}</td>
            <td><span class="badge ${lv ? 'badge-success' : 'badge-danger'}">${lv ? 'Directa' : 'Obstruida'}</span></td>
        </tr>`;
    });
    renderPagination('nt', Math.ceil(filteredNT.length/ITEMS_PER_PAGE));
}


// PADRON GENERAL
let chartPadSec = null, chartPadMun = null;
function updatePadron() {
    let n1 = 0, n2 = 0, n3 = 0, n4 = 0;
    filteredPadron.forEach(r => {
        const ipc = String(r.ipc).toLowerCase();
        if(ipc.includes('nivel 1')) n1++;
        else if(ipc.includes('nivel 2')) n2++;
        else if(ipc.includes('nivel 3')) n3++;
        else if(ipc.includes('nivel 4')) n4++;
    });

    animateCountUp(document.getElementById('padron-kpi-n1'), n1);
    animateCountUp(document.getElementById('padron-kpi-n2'), n2);
    animateCountUp(document.getElementById('padron-kpi-n3'), n3);
    animateCountUp(document.getElementById('padron-kpi-n4'), n4);

    renderTablePadron();

    const secCounts = { 'N1':{}, 'N2':{}, 'N3':{}, 'N4':{} };
    const munCounts = {};
    
    filteredPadron.forEach(r => {
        const sec = r.grupo_institucion || 'N/A';
        const ipc = String(r.ipc).toLowerCase();
        let key = ipc.includes('1') ? 'N1' : ipc.includes('2') ? 'N2' : ipc.includes('3') ? 'N3' : 'N4';
        secCounts[key][sec] = (secCounts[key][sec] || 0) + 1;
        munCounts[r.municipio || 'N/A'] = (munCounts[r.municipio || 'N/A'] || 0) + 1;
    });

    const secs = [...new Set(filteredPadron.map(r=>r.grupo_institucion))].filter(Boolean);

    if(chartPadSec) chartPadSec.destroy();
    chartPadSec = new Chart(document.getElementById('chart-padron-sectores'), {
        type: 'bar',
        data: {
            labels: secs,
            datasets: [
                { label: 'Nivel 1', data: secs.map(s => secCounts['N1'][s]||0), backgroundColor: (ctx) => safeGradient(ctx, colors.success, 'rgba(15,118,110,0.1)'), borderColor: colors.success, borderWidth: 1 },
                { label: 'Nivel 2', data: secs.map(s => secCounts['N2'][s]||0), backgroundColor: (ctx) => safeGradient(ctx, colors.gold, 'rgba(214,179,95,0.1)'), borderColor: colors.gold, borderWidth: 1 },
                { label: 'Nivel 3', data: secs.map(s => secCounts['N3'][s]||0), backgroundColor: (ctx) => safeGradient(ctx, colors.primary, 'rgba(138,0,79,0.1)'), borderColor: colors.primary, borderWidth: 1 },
                { label: 'Nivel 4', data: secs.map(s => secCounts['N4'][s]||0), backgroundColor: (ctx) => safeGradient(ctx, colors.danger, 'rgba(185,28,28,0.1)'), borderColor: colors.danger, borderWidth: 1 }
            ]
        },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: {stacked:true}, y: {stacked:true} } }
    });

    const munData = Object.entries(munCounts).sort((a,b)=>b[1]-a[1]).slice(0,10);
    if(chartPadMun) chartPadMun.destroy();
    chartPadMun = new Chart(document.getElementById('chart-padron-municipios'), {
        type: 'bar',
        data: {
            labels: munData.map(d=>d[0]),
            datasets: [{ 
                label: 'Instituciones', 
                data: munData.map(d=>d[1]), 
                backgroundColor: (ctx) => safeGradient(ctx, colors.primary, 'rgba(138,0,79,0.1)'), 
                borderColor: colors.primary,
                borderWidth: 1,
                borderRadius: 4 
            }]
        },
        options: { indexAxis: 'y', responsive: true, maintainAspectRatio: false, plugins: {legend:{display:false}} }
    });
}

function renderTablePadron() {
    const tbody = document.getElementById('tbody-padron');
    document.getElementById('info-padron').textContent = `Mostrando ${filteredPadron.length} registros`;
    tbody.innerHTML = '';
    const start = (currentPagePadron - 1) * ITEMS_PER_PAGE;
    const data = filteredPadron.slice(start, start + ITEMS_PER_PAGE);

    data.forEach(row => {
        let badge = 'tier-t1';
        let bg = 'var(--color-success)';
        let c = '#fff';
        const ipcStr = String(row.ipc).toLowerCase();
        
        if(ipcStr.includes('nivel 1')) { bg = '#0F766E'; }
        else if(ipcStr.includes('nivel 2')) { bg = '#D6B35F'; c = '#000'; }
        else if(ipcStr.includes('nivel 3')) { bg = '#8A004F'; }
        else if(ipcStr.includes('nivel 4')) { bg = '#B91C1C'; }

        tbody.innerHTML += `<tr>
            <td>${row.id}</td>
            <td><strong>${row.nombre}</strong></td>
            <td>${row.municipio}</td>
            <td>${row.grupo_institucion || 'N/A'}</td>
            <td><span class="tier-tag" style="background:${bg}; color:${c};">${row.ipc}</span></td>
        </tr>`;
    });
    renderPagination('padron', Math.ceil(filteredPadron.length/ITEMS_PER_PAGE));
}

// ═══════════════════════════════════════════════
// MAPAS LEAFLET
// ═══════════════════════════════════════════════
function initMapContainer(mapId) {
    let m = L.map(mapId, {zoomControl: false, preferCanvas: true}).setView([29.2972, -110.3309], 6);
    L.control.zoom({position: 'topleft'}).addTo(m);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap', subdomains: 'abcd', maxZoom: 19, detectRetina: true
    }).addTo(m);
    return m;
}

function createMapIcon(type, color) {
    const iconHtml = type === 'tower'
        ? `<span class="map-tower-pin" style="--marker-color:${color}"></span>`
        : `<span class="map-proposed-pin" style="--marker-color:${color}"></span>`;

    return L.divIcon({
        html: iconHtml,
        className: 'map-div-icon',
        iconSize: [14, 14],
        iconAnchor: [7, 7],
        popupAnchor: [0, -10]
    });
}

function fitMapToData(map, bounds) {
    if(!map || !bounds || !bounds.length) return;
    const paddedBounds = L.latLngBounds(bounds).pad(0.08);
    map.fitBounds(paddedBounds, {
        paddingTopLeft: [60, 60],
        paddingBottomRight: [180, 80],
        maxZoom: 11
    });
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

function hasValue(value) {
    return value !== undefined && value !== null && value !== '' && value !== '-';
}

function displayValue(value, fallback = 'N/D') {
    return hasValue(value) ? escapeHtml(value) : fallback;
}

function formatKm(value) {
    const n = Number(value);
    return Number.isFinite(n) ? `${n.toFixed(2)} km` : 'N/D';
}

function formatMeters(value) {
    const n = Number(value);
    return Number.isFinite(n) ? `${n.toFixed(2)} m` : 'N/D';
}

function lineOfSightInfo(row) {
    const ok = String(row.linea_vista).toLowerCase() === 'true';
    return {
        ok,
        text: ok ? 'Linea de vista directa' : 'Requiere repetidor o revision tecnica',
        className: ok ? 'popup-status--ok' : 'popup-status--warning'
    };
}

function popupRows(rows) {
    return rows
        .filter(row => hasValue(row.value))
        .map(row => `
            <div class="popup-row">
                <span class="popup-label">${escapeHtml(row.label)}</span>
                <span class="popup-value">${row.html ? row.value : escapeHtml(row.value)}</span>
            </div>
        `)
        .join('');
}

function buildInfoPopup(title, rows, status = null) {
    const statusHtml = status ? `<div class="popup-status ${status.className}">${escapeHtml(status.text)}</div>` : '';
    return `
        <div class="map-info-popup">
            <div class="popup-title">${displayValue(title, 'Detalle')}</div>
            ${statusHtml}
            ${popupRows(rows)}
        </div>
    `;
}

function buildInstitutionPopup(prefix, row) {
    const status = lineOfSightInfo(row);
    if(prefix === 'mig') {
        return buildInfoPopup(row.institucion || row.nombre, [
            { label: 'ID', value: row.id_institucion },
            { label: 'Municipio', value: row.municipio },
            { label: 'Sector', value: row.sector },
            { label: 'Proveedor actual', value: row.proveedor },
            { label: 'Torre destino', value: row.torre_cercana },
            { label: 'Distancia', value: formatKm(row.dist_km) },
            { label: 'Viabilidad', value: row.conexion_migracion },
            { label: 'Obstruccion max.', value: formatMeters(row.obstruccion_max_m) }
        ], status);
    }

    if(prefix === 'con') {
        return buildInfoPopup(row.institucion || row.nombre, [
            { label: 'ID', value: row.id_institucion },
            { label: 'Sector', value: row.sector },
            { label: 'Municipio', value: row.municipio },
            { label: 'Torre cercana', value: row.torre_cercana },
            { label: 'Dependencia torre', value: row.dependencia_torre_estatal },
            { label: 'Distancia', value: formatKm(row.dist_km) },
            { label: 'Viabilidad', value: row.conexion_inicial },
            { label: 'Obstruccion max.', value: formatMeters(row.obstruccion_max_m) }
        ], status);
    }

    return buildInfoPopup(row.nombre, [
        { label: 'Sector', value: row.grupo },
        { label: 'Cluster', value: row.cluster },
        { label: 'Instituciones beneficiadas', value: row.cantidad_instituciones },
        { label: 'Dist. promedio cluster', value: formatKm(row.distancia_promedio_cluster) },
        { label: 'Dist. maxima real', value: formatKm(row.distancia_maxima_real) },
        { label: 'Backhaul propuesto', value: row.torre_estatal_cercana },
        { label: 'Dependencia backhaul', value: row.dependencia_torre_estatal },
        { label: 'Distancia a backhaul', value: formatKm(row.dist_km_torre_estatal_mas_cercana) },
        { label: 'Conexion backhaul', value: row.conexion_backhaul }
    ], status);
}

function buildDestinationTowerPopup(prefix, row) {
    const status = lineOfSightInfo(row);
    return buildInfoPopup(row.torre_cercana || row.torre_estatal_cercana, [
        { label: 'Tipo', value: prefix === 'nt' ? 'Backhaul estatal' : 'Torre destino' },
        { label: 'Institucion vinculada', value: row.institucion || row.nombre },
        { label: 'Municipio', value: row.municipio },
        { label: 'Dependencia', value: row.dependencia_torre_estatal },
        { label: 'Distancia al punto', value: formatKm(row.dist_km || row.dist_km_torre_estatal_mas_cercana) },
        { label: 'Resultado tecnico', value: row.conexion_migracion || row.conexion_inicial || row.conexion_backhaul }
    ], status);
}

function buildStateTowerPopup(tower) {
    const props = tower.geojson?.properties || {};
    const proveedores = Array.isArray(props.proveedores) && props.proveedores.length
        ? props.proveedores.map(p => p['nombre proveedor']).filter(Boolean).join(', ')
        : '';
    return buildInfoPopup(props.nombre || `Torre ${tower.id}`, [
        { label: 'Municipio', value: props.municipio },
        { label: 'Dependencia', value: props['dependencia administradora'] || props.propietario || props.arrendador },
        { label: 'Grupo gubernamental', value: props['grupo gubernamental'] },
        { label: 'Estatus', value: props.estatus },
        { label: 'Tipo', value: props.tipo },
        { label: 'Altura', value: props.altura && props.altura !== '-' ? `${props.altura} m` : '' },
        { label: 'Espacio disponible', value: props['espacio disponible'] },
        { label: 'Proveedores', value: proveedores }
    ]);
}

function buildClusterMemberPopup(inst) {
    return buildInfoPopup(inst.nombre, [
        { label: 'ID', value: inst.id },
        { label: 'Sector', value: inst.grupo_institucion },
        { label: 'Municipio', value: inst.municipio },
        { label: 'Localidad', value: inst.localidad },
        { label: 'Conectividad', value: inst.conectividad },
        { label: 'IPC', value: inst.ipc },
        { label: 'Dist. torre estatal', value: formatKm(inst.distancia_torre_estatal_cercana) }
    ]);
}

function addCustomLegend(map, layersConfig) {
    if(map.customLegend) {
        map.removeControl(map.customLegend);
    }
    const legend = L.control({ position: 'topright' });
    legend.onAdd = function() {
        const div = L.DomUtil.create('div', 'map-custom-legend');
        let html = '<h4>Capas</h4>';
        
        layersConfig.forEach((cfg, i) => {
            const shapeClass = cfg.type === 'line' ? 'legend-line' : cfg.type === 'tower' ? 'legend-tower' : 'legend-dot';
            const iconHtml = `<span class="${shapeClass}" style="--legend-color:${cfg.color};"></span>`;
            html += `<div class="map-legend-row">
                <input type="checkbox" checked id="legend-chk-${map._container.id}-${i}">
                ${iconHtml}
                <label for="legend-chk-${map._container.id}-${i}">${cfg.name}</label>
            </div>`;
        });
        
        div.innerHTML = html;
        L.DomEvent.disableClickPropagation(div);
        return div;
    };
    legend.addTo(map);
    map.customLegend = legend;

    setTimeout(() => {
        layersConfig.forEach((cfg, i) => {
            const chk = document.getElementById(`legend-chk-${map._container.id}-${i}`);
            if(chk) {
                chk.addEventListener('change', (e) => {
                    if(e.target.checked) map.addLayer(cfg.layerGroup);
                    else map.removeLayer(cfg.layerGroup);
                });
            }
        });
    }, 10);
}

function renderMap(prefix) {
    let bounds = [];
    let map = prefix === 'mig' ? mapMig : prefix === 'con' ? mapCon : mapNT;
    
    if(!map) {
        map = initMapContainer(`map-${prefix === 'mig' ? 'migracion' : prefix === 'con' ? 'conexion' : 'nuevas-torres'}`);
        if(prefix === 'mig') mapMig = map;
        if(prefix === 'con') mapCon = map;
        if(prefix === 'nt') mapNT = map;
    }

    if(map.layersConfig) {
        map.layersConfig.forEach(cfg => map.removeLayer(cfg.layerGroup));
    }

    const layerTE = L.layerGroup();
    const layerTorresProp = L.layerGroup();
    const layerLinks = L.layerGroup();
    const layerViable = L.layerGroup();
    const layerObs = L.layerGroup();

    torresEstatales.forEach(t => {
        if(!t.geojson || !t.geojson.geometry) return;
        const coords = t.geojson.geometry.coordinates;
        if(coords && coords.length === 2) {
            const m = L.marker([coords[1], coords[0]], {
                icon: createMapIcon('tower', colors.primaryDark),
                zIndexOffset: 500
            });
            m.addTo(layerTE).bindPopup(buildStateTowerPopup(t), { maxWidth: 360 });
            m.on('click', () => map.setView([coords[1], coords[0]], 14));
        }
    });

    const dataList = prefix === 'mig' ? filteredMig : prefix === 'con' ? filteredCon : filteredNT;
    const instColorViable = prefix === 'nt' ? colors.accent : prefix === 'mig' ? colors.success : colors.success;
    const instColorObs = prefix === 'nt' ? colors.primary : colors.danger;
    const destTowerColor = prefix === 'nt' ? colors.primaryDark : prefix === 'mig' ? colors.gold : colors.primary;

    dataList.forEach(r => {
        const lat = parseFloat(r.latitud);
        const lon = parseFloat(r.longitud);
        const tLat = parseFloat(r.latitud_torre || r.latitud_torre_estatal || r.latitud_torre_estatal_mas_cercana);
        const tLon = parseFloat(r.longitud_torre || r.longitud_torre_estatal || r.longitud_torre_estatal_mas_cercana);
        const lv = String(r.linea_vista).toLowerCase() === 'true';
        
        if(!isNaN(lat) && !isNaN(lon)) {
            bounds.push([lat, lon]);
            
            const m = L.circleMarker([lat, lon], {
                radius: prefix === 'nt' ? 7 : lv ? 4 : 5, 
                fillColor: lv ? instColorViable : instColorObs, 
                color: '#fff',
                weight: 1.5,
                opacity: 0.95,
                fillOpacity: lv ? 0.72 : 0.9,
                className: lv ? 'map-point-viable' : 'map-point-obstructed'
            });
            m.addTo(lv ? layerViable : layerObs).bindPopup(buildInstitutionPopup(prefix, r), { maxWidth: 380 });
            m.on('click', () => map.setView([lat, lon], 14));

            if(!isNaN(tLat) && !isNaN(tLon)) {
                bounds.push([tLat, tLon]);
                
                const tm = L.marker([tLat, tLon], {
                    icon: createMapIcon('tower', destTowerColor),
                    zIndexOffset: 700
                });
                tm.addTo(layerTorresProp).bindPopup(buildDestinationTowerPopup(prefix, r), { maxWidth: 360 });
                tm.on('click', () => map.setView([tLat, tLon], 14));
                
                L.polyline([[lat, lon], [tLat, tLon]], {
                    color: lv ? instColorViable : instColorObs, 
                    weight: lv ? 1.1 : 1.4,
                    opacity: lv ? 0.24 : 0.42,
                    dashArray: lv ? null : '5, 5',
                    className: 'map-link-line'
                }).addTo(layerLinks);
            }

            if(prefix === 'nt') {
                const clusterRadius = (parseFloat(r.distancia_maxima_cluster) || 2) * 1000;
                L.circle([lat, lon], {
                    radius: clusterRadius,
                    color: lv ? instColorViable : instColorObs,
                    fillColor: lv ? instColorViable : instColorObs,
                    fillOpacity: 0.1,
                    weight: 1,
                    dashArray: '4, 4'
                }).addTo(lv ? layerViable : layerObs);

                if (dataPadron && dataPadron.length > 0) {
                    const instsInCluster = dataPadron.filter(inst => {
                        const ilat = parseFloat(inst.latitud);
                        const ilon = parseFloat(inst.longitud);
                        if(isNaN(ilat) || isNaN(ilon)) return false;
                        const d = map.distance([lat, lon], [ilat, ilon]);
                        return d <= clusterRadius;
                    });
                    
                    instsInCluster.forEach(inst => {
                        L.circleMarker([inst.latitud, inst.longitud], {
                            radius: 3, fillColor: '#ffffff', color: lv ? instColorViable : instColorObs, weight: 1.5, opacity: 0.75, fillOpacity: 0.75
                        }).addTo(lv ? layerViable : layerObs).bindPopup(buildClusterMemberPopup(inst), { maxWidth: 340 });
                    });
                }
            }
        }
    });

    layerLinks.addTo(map);
    layerTorresProp.addTo(map);
    layerViable.addTo(map);
    layerObs.addTo(map);
    
    let layersConfig = [];
    if(prefix === 'mig') {
        layersConfig = [
            { name: 'Enlaces institución-torre', color: instColorViable, type: 'line', layerGroup: layerLinks },
            { name: 'Torres destino', color: destTowerColor, type: 'tower', layerGroup: layerTorresProp },
            { name: 'Instituciones con línea de vista', color: instColorViable, type: 'point', layerGroup: layerViable },
            { name: 'Instituciones con obstrucción', color: instColorObs, type: 'point', layerGroup: layerObs }
        ];
    } else if (prefix === 'con') {
        layersConfig = [
            { name: 'Enlaces institución-torre', color: instColorViable, type: 'line', layerGroup: layerLinks },
            { name: 'Torres destino', color: destTowerColor, type: 'tower', layerGroup: layerTorresProp },
            { name: 'Instituciones con línea de vista', color: instColorViable, type: 'point', layerGroup: layerViable },
            { name: 'Instituciones con obstrucción', color: instColorObs, type: 'point', layerGroup: layerObs }
        ];
    } else {
        layersConfig = [
            { name: 'Enlaces a backhaul', color: instColorViable, type: 'line', layerGroup: layerLinks },
            { name: 'Torres estatales backhaul', color: colors.primaryDark, type: 'tower', layerGroup: layerTorresProp },
            { name: 'Clústeres con línea de vista', color: instColorViable, type: 'point', layerGroup: layerViable },
            { name: 'Clústeres con obstrucción', color: instColorObs, type: 'point', layerGroup: layerObs }
        ];
    }

    map.layersConfig = layersConfig;
    addCustomLegend(map, layersConfig);

    if(bounds.length) {
        if(prefix === 'mig') mapMigBounds = bounds;
        if(prefix === 'con') mapConBounds = bounds;
        if(prefix === 'nt') mapNTBounds = bounds;

        const tabId = `tab-${prefix === 'mig' ? 'migracion' : prefix === 'con' ? 'conexion' : 'nuevas-torres'}`;
        if(document.getElementById(tabId).classList.contains('active')) {
            fitMapToData(map, bounds);
        }
    }
}


// ═══════════════════════════════════════════════
// Paginación y Ordenamiento Compartidos
// ═══════════════════════════════════════════════
function renderPagination(prefix, totalPages) {
    const el = document.getElementById(`pagination-${prefix}`);
    if(!el) return;
    totalPages = Math.max(totalPages || 1, 1);
    let current = prefix==='mig'?currentPageMig : prefix==='con'?currentPageCon : prefix==='nt'?currentPageNT : currentPagePadron;
    current = Math.min(Math.max(current, 1), totalPages);
    
    let html = `<button class="page-btn" ${current===1?'disabled':''} onclick="changePage('${prefix}', ${current-1})">◀</button>`;
    html += `<span class="page-info">Pág ${current} de ${totalPages || 1}</span>`;
    html += `<button class="page-btn" ${current>=totalPages?'disabled':''} onclick="changePage('${prefix}', ${current+1})">▶</button>`;
    el.innerHTML = html;
}

function getFilteredRows(prefix) {
    if(prefix === 'mig') return filteredMig;
    if(prefix === 'con') return filteredCon;
    if(prefix === 'nt') return filteredNT;
    if(prefix === 'padron') return filteredPadron;
    return [];
}

function getTotalPages(prefix) {
    return Math.max(Math.ceil(getFilteredRows(prefix).length / ITEMS_PER_PAGE), 1);
}

function changePage(prefix, page) {
    page = Math.min(Math.max(Number(page) || 1, 1), getTotalPages(prefix));
    if(prefix==='mig') { currentPageMig = page; renderTableMig(); }
    if(prefix==='con') { currentPageCon = page; renderTableCon(); }
    if(prefix==='nt') { currentPageNT = page; renderTableNT(); }
    if(prefix==='padron') { currentPagePadron = page; renderTablePadron(); }
}

let sortDirs = { mig: 1, con: 1, nt: 1, padron: 1 };

const sortFieldAliases = {
    nt: {
        dist: 'dist_km_torre_estatal_mas_cercana',
        inst: 'cantidad_instituciones',
        torre: 'torre_estatal_cercana',
        vista: 'linea_vista'
    },
    padron: {
        sector: 'grupo_institucion'
    }
};

function resolveSortField(prefix, field) {
    return (sortFieldAliases[prefix] && sortFieldAliases[prefix][field]) || field;
}

function sortTable(prefix, field) {
    if(!sortDirs[prefix]) sortDirs[prefix] = 1;
    sortDirs[prefix] *= -1;
    const arr = getFilteredRows(prefix);
    const resolvedField = resolveSortField(prefix, field);
    arr.sort((a,b) => {
        let valA = a[resolvedField], valB = b[resolvedField];
        if(!isNaN(valA) && !isNaN(valB)) return (valA - valB) * sortDirs[prefix];
        return String(valA||'').localeCompare(String(valB||'')) * sortDirs[prefix];
    });
    if(prefix==='mig') { currentPageMig=1; renderTableMig(); }
    if(prefix==='con') { currentPageCon=1; renderTableCon(); }
    if(prefix==='nt') { currentPageNT=1; renderTableNT(); }
    if(prefix==='padron') { currentPagePadron=1; renderTablePadron(); }
}

function sortTablePadron(field) {
    sortTable('padron', field);
}
