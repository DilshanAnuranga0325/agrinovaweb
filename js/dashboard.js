import { requireAuth } from './auth.js';
import { ref, onValue } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { database } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    // requireAuth handles its own redirect if needed or bypasses if flag is set
    const user = await requireAuth();
    if (user) {
        initLiveDashboard();
    }
});

let lastEnvUpdate = 0;
let lastPlantUpdate = 0;

function initLiveDashboard() {
    const loadingOverlay = document.getElementById('loading-overlay');
    
    // 1. Environment Live Listener
    const envRef = ref(database, 'agrinova/environment/live');
    onValue(envRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            updateEnvironmentUI(data);
            if (data.lastUpdated) lastEnvUpdate = data.lastUpdated;
            checkSyncStatus();
            if (loadingOverlay) loadingOverlay.classList.add('opacity-0');
        } else {
            console.warn("No environment data available at agrinova/environment/live");
        }
    }, (error) => {
        console.error("Environment Sync Error:", error);
    });

    // 2. Plant Live Listener
    const plantRef = ref(database, 'agrinova/plant/live');
    onValue(plantRef, (snapshot) => {
        const data = snapshot.val();
        if (data) {
            updatePlantUI(data);
            if (data.lastUpdated) lastPlantUpdate = data.lastUpdated;
            checkSyncStatus();
            if (loadingOverlay) loadingOverlay.classList.add('opacity-0');
        } else {
            console.warn("No plant data available at agrinova/plant/live");
        }
    }, (error) => {
        console.error("Plant Sync Error:", error);
    });

    // Remove fallback mock stream to ensure real data testing
}

function updateEnvironmentUI(env) {
    // Basic values using helper
    updateText('airTemp-val', safeValue(env.airTemp, '°C'));
    updateText('humidity-val', safeValue(env.humidity, '%'));
    updateText('pressure-val', safeValue(env.pressure, ' hPa'));
    updateText('altitude-val', safeValue(env.altitude, ' m'));
    
    // Light Intensity logic
    const lightEl = document.getElementById('light-val');
    const lightCard = document.getElementById('light-card');
    if (lightEl) {
        if (env.light <= -1) {
            lightEl.innerText = "Sensor Issue";
            lightEl.className = "text-xl font-bold text-orange-500 uppercase tracking-widest";
            if (lightCard) lightCard.className = "card p-6 bg-orange-50/30 border border-orange-100 shadow-sm";
        } else {
            lightEl.innerHTML = `${safeValue(env.light)}<span class="text-sm text-slate-400 font-bold ml-1">lx</span>`;
            lightEl.className = "text-3xl font-light text-slate-900";
            if (lightCard) lightCard.className = "card p-6 bg-white hover:shadow-md transition-shadow";
        }
    }

    // Rainfall Detailed
    updateText('rainLevel-val', env.rainLevel || "--");
    updateText('rainPercent-val', env.rainPercent !== undefined ? `${env.rainPercent}%` : "--%");
    updateText('rainDetected-val', env.rainDetected !== undefined ? (env.rainDetected ? "YES" : "NO") : "--");

    // Soil Conditions
    updateText('soilTemp-val', safeValue(env.soilTemp, '°C'));
    updateText('soilMoisture-val', safeValue(env.soilMoisture, '%'));
    
    const soilCard = document.getElementById('soil-moisture-card');
    if (soilCard) {
        if (env.soilMoisture !== undefined && env.soilMoisture <= 20) {
            soilCard.className = "card p-6 bg-red-50/30 border border-red-100 shadow-sm";
        } else {
            soilCard.className = "card p-6 bg-white hover:shadow-md transition-shadow";
        }
    }

    // Motion Detected
    const motionEl = document.getElementById('motion-status');
    const motionCard = document.getElementById('motion-card');
    if (motionEl) {
        if (env.motionDetected) {
            motionEl.innerText = "MOTION DETECTED";
            motionEl.className = "px-3 py-1 rounded-full text-[10px] font-black uppercase bg-red-100 text-red-600 tracking-widest animate-pulse";
            if (motionCard) motionCard.className = "card p-6 bg-red-50/10 border border-red-50 shadow-sm flex flex-col justify-between";
        } else {
            motionEl.innerText = "NO MOTION";
            motionEl.className = "px-3 py-1 rounded-full text-[10px] font-black uppercase bg-emerald-50 text-emerald-600 tracking-widest";
            if (motionCard) motionCard.className = "card p-6 bg-white hover:shadow-md transition-shadow flex flex-col justify-between";
        }
    }

    // GPS Status
    updateText('latitude-val', fmtCoord(env.latitude));
    updateText('longitude-val', fmtCoord(env.longitude));
    const gpsBadge = document.getElementById('gps-status-badge');
    if (gpsBadge) {
        if (env.gpsValid === true) {
            gpsBadge.innerText = "GPS FIXED";
            gpsBadge.className = "mt-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-50 text-emerald-600 border border-emerald-100 inline-block";
        } else {
            gpsBadge.innerText = "GPS NOT FIXED";
            gpsBadge.className = "mt-1 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-orange-50 text-orange-600 border border-orange-100 inline-block";
        }
    }
}

function updatePlantUI(plant) {
    updateText('plantStatus-val', plant.plantStatus || "--");
    updateText('confidence-val', plant.confidence !== undefined ? `${plant.confidence}%` : "--%");
    updateText('unhealthyScore-val', safeValue(plant.avgUnhealthyScore));
    updateText('isAbnormal-val', plant.isAbnormal !== undefined ? (plant.isAbnormal ? "YES" : "NO") : "--");
    updateText('plant-alert-val', plant.alert || "No current alerts for this plant.");

    const statusBadge = document.getElementById('plant-status-badge');
    const plantCard = document.getElementById('plant-card');
    if (statusBadge) {
        const status = (plant.plantStatus || "").toUpperCase();
        statusBadge.innerText = status || "UNKNOWN";
        
        // Reset classes
        statusBadge.className = "px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest self-start ";
        
        if (status === 'HEALTHY') {
            statusBadge.classList.add("bg-emerald-50", "text-emerald-600");
            if (plantCard) plantCard.style.borderLeft = "4px solid #10b981";
        } else if (status === 'STRESSED') {
            statusBadge.classList.add("bg-orange-50", "text-orange-600");
            if (plantCard) plantCard.style.borderLeft = "4px solid #f59e0b";
        } else if (status === 'UNHEALTHY' || plant.isAbnormal) {
            statusBadge.classList.add("bg-red-50", "text-red-600");
            if (plantCard) plantCard.style.borderLeft = "4px solid #ef4444";
        } else {
            statusBadge.classList.add("bg-slate-100", "text-slate-400");
            if (plantCard) plantCard.style.borderLeft = "4px solid #cbd5e1";
        }
    }
}

function checkSyncStatus() {
    const newestTs = Math.max(lastEnvUpdate, lastPlantUpdate);
    if (newestTs > 0) {
        updateText('last-updated-val', new Date(newestTs).toLocaleString());
    }
}

// Helpers
function safeValue(val, unit = '') {
    if (val === null || val === undefined || val === '') return "--";
    if (typeof val === 'number') {
        return (val % 1 === 0 ? val : val.toFixed(2)) + unit;
    }
    return val + unit;
}

function fmtCoord(val) {
    if (val === null || val === undefined || val === '') return "--.------";
    return typeof val === 'number' ? val.toFixed(6) : val;
}

function updateText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text;
}
