import { database } from "./firebase-config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { requireAuth } from "./auth.js";

const MAX_POINTS = 60;
let isPaused = false;
let liveInterval = null;

const charts = {};
const latestData = {
    env: {},
    plant: {},
    analysis: {}
};

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Auth check
    await requireAuth();
    
    // 2. Initialize Charts
    initAllCharts();
    
    // 3. Set up Firebase Listeners
    setupFirebaseListeners();
    
    // 4. Start Live Update Interval
    startLiveUpdates();
    
    // 5. UI Controls
    setupUIControls();

    // Fade out loading
    setTimeout(() => {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) overlay.style.opacity = '0';
        setTimeout(() => overlay?.remove(), 500);
    }, 1500);
});

function initAllCharts() {
    // Shared Colors
    const colors = {
        primary: '#059669',
        secondary: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        info: '#3b82f6',
        slate: '#64748b'
    };

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
            duration: 250
        },
        layout: {
            padding: {
                top: 8,
                right: 8,
                bottom: 0,
                left: 0
            }
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(15, 23, 42, 0.9)',
                titleFont: { size: 10, weight: 'bold' },
                bodyFont: { size: 12 },
                padding: 12,
                cornerRadius: 12,
            }
        },
        scales: {
            x: {
                ticks: {
                    maxTicksLimit: 6,
                    color: '#94a3b8',
                    font: { size: 10, weight: 'bold' }
                },
                grid: { display: false }
            },
            y: {
                beginAtZero: false,
                grid: { color: "rgba(20, 80, 55, 0.08)", drawBorder: false },
                ticks: {
                    maxTicksLimit: 5,
                    color: '#94a3b8',
                    font: { size: 10, weight: 'bold' },
                    padding: 8
                }
            }
        }
    };

    // --- Environmental ---
    charts.airTemp = createLineChart('chart-airTemp', colors.warning, commonOptions);
    charts.humidity = createLineChart('chart-humidity', colors.info, commonOptions);
    charts.pressure = createLineChart('chart-pressure', '#6366f1', commonOptions);
    charts.altitude = createLineChart('chart-altitude', '#0ea5e9', commonOptions);
    charts.light = createLineChart('chart-light', colors.warning, commonOptions);
    charts.rainPercent = createLineChart('chart-rainPercent', colors.info, commonOptions);
    charts.soilTemp = createLineChart('chart-soilTemp', '#f97316', commonOptions);
    charts.soilMoisture = createLineChart('chart-soilMoisture', colors.primary, commonOptions, true);
    charts.motion = createStepChart('chart-motion', colors.slate, commonOptions);

    // --- Plant ---
    charts.confidence = createLineChart('chart-confidence', colors.primary, commonOptions);

    // --- AI Analysis ---
    charts.farmHealth = createLineChart('chart-farmHealth', colors.secondary, {
        ...commonOptions,
        scales: {
            ...commonOptions.scales,
            y: { ...commonOptions.scales.y, min: 0, max: 100 }
        }
    });
}

function createLineChart(id, color, options, fill = false) {
    const ctx = document.getElementById(id);
    if (!ctx) return null;
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                data: [],
                borderColor: color,
                borderWidth: 3,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBackgroundColor: color,
                pointHoverBorderColor: '#fff',
                pointHoverBorderWidth: 2,
                tension: 0.4,
                fill: fill,
                backgroundColor: fill ? `${color}10` : 'transparent'
            }]
        },
        options: options
    });
}

function createStepChart(id, color, options, max = 1.2) {
    const ctx = document.getElementById(id);
    if (!ctx) return null;
    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                data: [],
                borderColor: color,
                borderWidth: 2.5,
                pointRadius: 0,
                stepped: true,
                fill: true,
                backgroundColor: `${color}08`
            }]
        },
        options: {
            ...options,
            scales: {
                ...options.scales,
                y: { ...options.scales.y, min: 0, max: max, ticks: { stepSize: 1 } }
            }
        }
    });
}

function setupFirebaseListeners() {
    // Environment
    onValue(ref(database, 'agrinova/environment/live'), (snapshot) => {
        latestData.env = snapshot.val() || {};
        updateSyncUI();
        updateStaticLabels();
    });

    // Plant
    onValue(ref(database, 'agrinova/plant/live'), (snapshot) => {
        latestData.plant = snapshot.val() || {};
    });

    // Analysis
    onValue(ref(database, 'agrinova/analysis/live'), (snapshot) => {
        latestData.analysis = snapshot.val() || {};
    });
}

function startLiveUpdates() {
    if (liveInterval) clearInterval(liveInterval);
    liveInterval = setInterval(() => {
        if (isPaused) return;

        const now = new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
        
        // Environment Data
        addPoint(charts.airTemp, now, safeNum(latestData.env.airTemp));
        addPoint(charts.humidity, now, safeNum(latestData.env.humidity));
        addPoint(charts.pressure, now, safeNum(latestData.env.pressure));
        addPoint(charts.altitude, now, safeNum(latestData.env.altitude));
        
        // Light Special Rule
        const lightVal = safeNum(latestData.env.light);
        addPoint(charts.light, now, lightVal <= -1 ? null : lightVal);

        addPoint(charts.rainPercent, now, safeNum(latestData.env.rainPercent));
        addPoint(charts.soilTemp, now, safeNum(latestData.env.soilTemp));
        
        // Soil Moisture
        addPoint(charts.soilMoisture, now, safeNum(latestData.env.soilMoisture));
        
        // Motion Activity (Step Chart)
        const motionVal = latestData.env.motionDetected === true ? 1 : 0;
        addPoint(charts.motion, now, motionVal);

        // Plant Data
        addPoint(charts.confidence, now, safeNum(latestData.plant.confidence));
        
        // Analysis Data
        addPoint(charts.farmHealth, now, safeNum(latestData.analysis.farmHealthScore));
        
        updateSyncUI();
        updateValueLabels();
    }, 1000);
}

function addPoint(chart, label, value) {
    if (!chart) return;
    chart.data.labels.push(label);
    chart.data.datasets[0].data.push(value);

    if (chart.data.labels.length > MAX_POINTS) {
        chart.data.labels.shift();
        chart.data.datasets[0].data.shift();
    }
    chart.update('none');
}

function safeNum(val) {
    if (val === null || val === undefined || val === '') return null;
    const num = Number(val);
    return isNaN(num) ? null : num;
}

function setupUIControls() {
    // Tab Filtering
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active', 'bg-white', 'text-primary', 'shadow-sm'));
            tabs.forEach(t => t.classList.add('text-slate-500'));
            
            tab.classList.remove('text-slate-500');
            tab.classList.add('active', 'bg-white', 'text-primary', 'shadow-sm');

            const category = tab.dataset.tab;
            filterGraphs(category);
        });
    });

    // Pause/Resume
    const pauseBtn = document.getElementById('pause-btn');
    const pauseText = document.getElementById('pause-text');
    pauseBtn.addEventListener('click', () => {
        isPaused = !isPaused;
        pauseText.innerText = isPaused ? 'Resume Live' : 'Pause Live';
        pauseBtn.querySelector('i').setAttribute('data-lucide', isPaused ? 'play-circle' : 'pause-circle');
        
        const windowLabel = document.getElementById('window-status');
        if (windowLabel) windowLabel.innerText = isPaused ? 'Live Paused' : 'Window Range';
        
        lucide.createIcons();
    });

    // Clear
    const clearBtn = document.getElementById('clear-btn');
    clearBtn.addEventListener('click', () => {
        Object.values(charts).forEach(chart => {
            if (chart) {
                chart.data.labels = [];
                chart.data.datasets[0].data = [];
                chart.update();
            }
        });
    });
}

function filterGraphs(category) {
    const containers = document.querySelectorAll('.chart-container');
    containers.forEach(container => {
        if (category === 'all' || container.dataset.category === category) {
            container.style.display = 'block';
        } else {
            container.style.display = 'none';
        }
    });
}

function updateSyncUI() {
    const syncEl = document.getElementById('last-updated-val');
    if (syncEl) syncEl.innerText = new Date().toLocaleTimeString();
}

function updateValueLabels() {
    const env = latestData.env;
    const plant = latestData.plant;
    const analysis = latestData.analysis;

    updateLabel('label-airTemp', env.airTemp, '°C');
    updateLabel('label-humidity', env.humidity, '%');
    updateLabel('label-pressure', env.pressure, ' hPa');
    updateLabel('label-altitude', env.altitude, ' m');
    updateLabel('label-rainPercent', env.rainPercent, '%');
    updateLabel('label-soilTemp', env.soilTemp, '°C');
    
    // Light label rule
    const lightLabel = document.getElementById('label-light');
    if (lightLabel) {
        if (env.light <= -1) {
            lightLabel.innerText = 'SENSOR ISSUE';
            lightLabel.className = 'text-xs font-black text-orange-500 tracking-widest';
        } else {
            lightLabel.innerText = (env.light !== undefined ? Math.round(env.light) : '--') + ' lx';
            lightLabel.className = 'text-lg font-bold text-slate-900 tracking-tighter';
        }
    }

    updateLabel('label-soilMoisture', env.soilMoisture, '%');
    
    const motionLabel = document.getElementById('label-motion');
    if (motionLabel) {
        if (env.motionDetected === true) {
            motionLabel.innerText = 'DETECTED';
            motionLabel.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-red-100 text-red-600 animate-pulse';
        } else {
            motionLabel.innerText = 'NONE';
            motionLabel.className = 'px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600';
        }
    }

    updateLabel('label-confidence', plant.confidence, '%');
    
    updatePlantStatusBadge(plant);
    updateLabel('label-farmHealth', analysis.farmHealthScore, '%');
}

function updatePlantStatusBadge(plant) {
    const badge = document.getElementById('plant-status-badge');
    if (!badge) return;

    let text = '--';
    let classes = '';
    const conf = safeNum(plant.confidence);
    const status = plant.plantStatus || '';
    const isAbnormal = plant.isAbnormal === true;

    if (isAbnormal) {
        text = 'ABNORMAL';
        classes = 'bg-red-100 text-red-600';
    } else if (status === 'UNHEALTHY') {
        text = 'UNHEALTHY';
        classes = 'bg-red-100 text-red-600';
    } else if (status === 'STRESSED') {
        text = 'STRESSED';
        classes = 'bg-orange-100 text-orange-600';
    } else if (conf !== null && conf < 70) {
        text = 'LOW CONFIDENCE';
        classes = 'bg-orange-100 text-orange-600';
    } else if (conf !== null && conf >= 85 && status === 'HEALTHY') {
        text = 'HEALTHY';
        classes = 'bg-emerald-100 text-emerald-600';
    } else if (conf !== null && conf >= 70 && status !== 'UNHEALTHY') {
        text = 'STABLE';
        classes = 'bg-lime-100 text-lime-600';
    }

    if (text !== '--') {
        badge.innerText = text;
        badge.className = `mt-1 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${classes}`;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

function updateStaticLabels() {
    // Static labels logic (currently none after removal of GPS and Plant Alert)
}

function updateLabel(id, val, unit = '') {
    const el = document.getElementById(id);
    if (!el) return;
    if (val === undefined || val === null || val === '') {
        el.innerText = '--' + unit;
        return;
    }
    el.innerText = (typeof val === 'number' ? (val % 1 === 0 ? val : val.toFixed(1)) : val) + unit;
}
