import { requireAuth } from './auth.js';
import { ref, onValue, set, update } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-database.js";
import { database, auth } from './firebase-config.js';

document.addEventListener('DOMContentLoaded', async () => {
    await requireAuth();
    initAnalysis();
    initChatbot();
});

function initAnalysis() {
    // 1. Listen to Live Analysis
    const liveAnalysisRef = ref(database, 'agrinova/analysis/live');
    onValue(liveAnalysisRef, (snapshot) => {
        const live = snapshot.val() || {};
        updateLiveAnalysisUI(live);
        updateQuickAnalysisCard(live);
        updateDetailedSubAnalyses(live);
    });

    // 2. Listen to Daily Report
    const dailyAnalysisRef = ref(database, 'agrinova/analysis/daily');
    onValue(dailyAnalysisRef, (snapshot) => {
        const daily = snapshot.val() || {};
        updateDailyReportUI(daily);
    });

    // 3. Listen to System Status
    const analysisSystemRef = ref(database, 'agrinova/analysis/system');
    onValue(analysisSystemRef, (snapshot) => {
        const system = snapshot.val() || {};
        updateAnalysisSystemUI(system);
    });
}

function updateLiveAnalysisUI(live) {
    if (!live) return;

    // AI Suggestions
    const sug = live.suggestions || {};
    updateText('text-suggestion-next', safeText(sug.nextActionRecommendation));
    updateText('text-suggestion-irrigation', safeText(sug.irrigationSuggestion));
    updateText('text-suggestion-fertilizer', safeText(sug.fertilizerSuggestion));
    updateText('text-suggestion-inspection', safeText(sug.inspectionSuggestion));
    updateText('text-suggestion-pest', safeText(sug.pestDiseaseWarning));

    // Irrigation Badge
    const irrBadge = document.getElementById('suggestion-irrigation-badge');
    const irrAccent = document.getElementById('suggestion-irrigation-accent');
    if (irrBadge && irrAccent) {
        const text = sug.irrigationSuggestion || '';
        if (text.toLowerCase().includes('critical') || text.toLowerCase().includes('low') || text.toLowerCase().includes('dry')) {
            irrBadge.innerText = 'CRITICAL';
            irrBadge.className = 'bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-red-100';
            irrAccent.className = 'absolute top-0 left-0 w-1.5 h-full bg-red-500';
        } else {
            irrBadge.innerText = 'IMPORTANT';
            irrBadge.className = 'bg-sky-50 text-sky-500 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-sky-100';
            irrAccent.className = 'absolute top-0 left-0 w-1.5 h-full bg-sky-500';
        }
    }

    // Pest Badge
    const pestBadge = document.getElementById('suggestion-pest-badge');
    const pestAccent = document.getElementById('suggestion-pest-accent');
    if (pestBadge && pestAccent) {
        const text = sug.pestDiseaseWarning || '';
        if (text.toLowerCase().includes('warning') || text.toLowerCase().includes('high risk') || text.toLowerCase().includes('pest')) {
            pestBadge.innerText = 'WARNING';
            pestBadge.className = 'bg-red-50 text-red-500 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full border border-red-100';
            pestAccent.className = 'absolute top-0 left-0 w-1.5 h-full bg-red-500';
        } else {
            pestBadge.innerText = 'NORMAL';
            pestBadge.className = 'bg-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full';
            pestAccent.className = 'absolute top-0 left-0 w-1.5 h-full bg-emerald-500';
        }
    }

    // Risk Alerts
    const alertsList = document.getElementById('alerts-list');
    if (alertsList) {
        const allAlerts = [
            ...(live.mainAlerts || []),
            ...(live.environmentalAnalysis?.alerts || []),
            ...(live.plantHealthAnalysis?.alerts || [])
        ];

        // Uniqueify
        const uniqueAlerts = [...new Set(allAlerts)].filter(a => a);

        if (uniqueAlerts.length > 0) {
            alertsList.innerHTML = uniqueAlerts.map(alert => `
                <div class="bg-white border border-slate-100 p-6 rounded-3xl flex items-center gap-4 shadow-sm border-l-4 border-red-500 animate-fade-up">
                    <div class="text-red-500">
                        <i data-lucide="alert-circle" size="24"></i>
                    </div>
                    <p class="text-slate-800 font-bold text-sm">${alert}</p>
                </div>
            `).join('');
            lucide.createIcons();
        } else {
            alertsList.innerHTML = `
                <div class="bg-emerald-50 border border-emerald-100 p-6 rounded-3xl flex items-center gap-4">
                    <div class="text-emerald-600">
                        <i data-lucide="shield-check" size="24"></i>
                    </div>
                    <p class="text-emerald-800 font-bold text-sm">No critical alerts detected.</p>
                </div>
            `;
            lucide.createIcons();
        }
    }
}

function updateDailyReportUI(daily) {
    if (!daily) return;

    // Header Date
    const reportDate = daily.createdAt || daily.createdAtMs;
    updateText('report-date', formatTime(reportDate));

    // Summary
    const report = daily.dailyReport || {};
    updateText('daily-summary', safeText(report.summary, "Daily analysis loading..."));
    updateText('daily-health-score', safeNumber(daily.farmHealthScore));
    updateText('daily-risk-label', safeText(daily.riskLevel));

    // Risk Badge
    const riskBadge = document.getElementById('daily-risk-badge');
    if (riskBadge) {
        const risk = daily.riskLevel || 'LOW';
        riskBadge.innerText = risk.toUpperCase();
        riskBadge.className = `w-fit px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusClass(risk)}`;
    }

    // Key Changes List
    renderList('key-changes-list', report.keyChanges, "No key changes available.");

    // Environment Summary
    const envSum = daily.environmentSummary || {};
    updateText('avg-temp', formatLabel(envSum.avgAirTemp, '°C'));
    updateText('max-temp', formatLabel(envSum.maxAirTemp, '°C'));
    updateText('avg-humidity', formatLabel(envSum.avgHumidity, '%'));
    updateText('avg-soil-moisture', formatLabel(envSum.avgSoilMoisture, '%'));
    updateText('min-soil-moisture', formatLabel(envSum.minSoilMoisture, '%'));
    updateText('avg-soil-temp', formatLabel(envSum.avgSoilTemp, '°C'));
    
    if (envSum.avgLight <= -1) {
        updateText('avg-light', 'Sensor Issue');
    } else {
        updateText('avg-light', formatLabel(envSum.avgLight, ' lx'));
    }

    // Plant Summary
    const pltSum = daily.plantSummary || {};
    updateText('summary-healthy-pct', safeNumber(pltSum.healthyPercentage));
    updateText('summary-stressed-pct', safeNumber(pltSum.stressedPercentage));
    updateText('summary-unhealthy-pct', safeNumber(pltSum.unhealthyPercentage));
    updateText('summary-abnormal-pct', safeNumber(pltSum.abnormalPercentage));
    updateText('summary-healthy-count', safeNumber(pltSum.healthyCount));
    updateText('summary-abnormal-count', safeNumber(pltSum.abnormalCount));

    // Recommended Action
    updateText('recommended-action', safeText(report.recommendedAction, 'No recommended action available.'));
}

function updateAnalysisSystemUI(system) {
    if (!system) return;

    // Quick Status
    const quickStatusEl = document.getElementById('quick-ai-status');
    const quickStatus = system.lastQuickAiStatus || system.lastQuickStatus || 'offline';
    if (quickStatusEl) {
        quickStatusEl.className = `w-2 h-2 rounded-full ${getStatusDotClass(quickStatus)}`;
    }
    updateText('last-quick-time', formatTime(system.lastQuickAnalysisAt || system.lastQuickAnalysisAtMs));

    // Daily Status
    const dailyStatusEl = document.getElementById('daily-ai-status');
    const dailyStatus = system.lastDailyAiStatus || system.lastDailyStatus || 'offline';
    if (dailyStatusEl) {
        dailyStatusEl.className = `w-2 h-2 rounded-full ${getStatusDotClass(dailyStatus)}`;
    }
    updateText('last-daily-time', formatTime(system.lastDailyAnalysisAt || system.lastDailyAnalysisAtMs));
}

function updateDetailedSubAnalyses(live) {
    const env = live.environmentalAnalysis || {};
    updateText('env-score', safeNumber(env.environmentScore));
    updateText('env-status', safeText(env.environmentStatus));
    updateText('env-rainfall', safeText(env.rainfallCondition));
    updateText('env-moisture', safeText(env.soilMoistureStatus));
    updateText('env-light-cond', safeText(env.lightCondition));

    const eRaw = env.rawValues || {};
    updateText('env-raw-temp', formatLabel(eRaw.airTemp, '°C'));
    updateText('env-raw-humid', formatLabel(eRaw.humidity, '%'));
    updateText('env-raw-soil', formatLabel(eRaw.soilMoisture, '%'));

    const plt = live.plantHealthAnalysis || {};
    updateText('plt-score', safeNumber(plt.plantScore));
    updateText('plt-status', safeText(plt.plantStatusOverall));
    updateText('plt-disease', safeText(plt.diseaseRiskLevel));
    updateText('plt-conf', formatLabel(plt.confidence, '%'));
    updateText('plt-unhealthy', safeNumber(plt.unhealthyPercentage));
    updateText('plt-detection', safeText(plt.latestAIClass));
    updateText('plt-abnormal', plt.isAbnormal ? 'YES' : 'NO');
}

function updateQuickAnalysisCard(live) {
    if (!live) return;

    updateText("quickFarmHealthScore", formatScore(live.farmHealthScore));
    updateText("quickFarmStatus", safeText(live.farmStatus));
    updateText("quickRiskLevel", safeText(live.riskLevel));
    updateText("quickEnvironmentScore", formatScore(live.environmentalAnalysis?.environmentScore));
    updateText("quickPlantScore", formatScore(live.plantHealthAnalysis?.plantScore));
    updateText("quickAiInsight", safeText(live.aiGeneratedInsight, "No quick AI insight available."));

    // Status Badge
    const statusBadge = document.getElementById('quickStatusBadge');
    if (statusBadge) {
        const status = (live.status || live.farmStatus || '').toLowerCase();
        statusBadge.innerText = (live.status || live.farmStatus || '--').toUpperCase();
        statusBadge.className = `px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${getStatusClass(status)}`;
    }

    // Health Score Color
    const healthEl = document.getElementById('quickFarmHealthScore');
    if (healthEl) {
        const score = parseInt(live.farmHealthScore);
        if (!isNaN(score)) {
            if (score < 60) healthEl.className = 'text-xl font-black text-red-600';
            else healthEl.className = 'text-xl font-black text-emerald-600';
        }
    }
}

// Chatbot Logic
function initChatbot() {
    const fab = document.getElementById('chatbot-fab');
    const panel = document.getElementById('chatbot-panel');
    const backBtn = document.getElementById('chatbot-back');
    const sendBtn = document.getElementById('chatbot-send');
    const input = document.getElementById('chatbot-input');

    if (!fab || !panel) return;

    fab.addEventListener('click', () => panel.classList.toggle('open'));
    backBtn.addEventListener('click', () => panel.classList.remove('open'));

    sendBtn.addEventListener('click', sendQuestion);
    input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') sendQuestion();
    });

    // Listen to Firebase Chatbot Paths
    onValue(ref(database, 'agrinova/chatbot/response'), (snapshot) => {
        const resp = snapshot.val();
        if (resp) handleChatbotResponse(resp);
    });

    onValue(ref(database, 'agrinova/chatbot/system'), (snapshot) => {
        const sys = snapshot.val() || {};
        updateChatbotSystemUI(sys);
    });
}

let lastRequestId = null;

async function sendQuestion() {
    const input = document.getElementById('chatbot-input');
    const text = input.value.trim();
    if (!text) return;

    const requestId = "REQ_" + Date.now();
    lastRequestId = requestId;

    appendMessage('user', text);
    input.value = '';

    try {
        await set(ref(database, 'agrinova/chatbot/question'), {
            text,
            status: "pending",
            requestId,
            askedAt: Date.now(),
            askedAtIso: new Date().toISOString()
        });
        showThinking();
    } catch (error) {
        console.error("Chatbot Error:", error);
        appendMessage('error', "Connection issue. Please try again.");
    }
}

function handleChatbotResponse(resp) {
    // Only show if it's the response to our current session or latest
    const messages = document.getElementById('chatbot-messages');
    
    // Check if thinking bubble exists and remove it if status is completed
    const thinking = document.querySelector('.chat-thinking');
    if (thinking && resp.status === 'completed') thinking.remove();

    if (resp.requestId === lastRequestId || !lastRequestId) {
        if (resp.text) {
            appendMessage('assistant', resp.text);
            updateText('chatbot-model', resp.modelUsed);
            updateText('chatbot-ai-status', resp.aiStatus || resp.status);
            lastRequestId = null; // Reset once handled
        }
        if (resp.error) {
            appendMessage('error', resp.error);
        }
    }
}

function updateChatbotSystemUI(sys) {
    updateText('chatbot-service-status', sys.serviceStatus || 'Offline');
    const dot = document.getElementById('chatbot-service-dot');
    if (dot) {
        const running = (sys.serviceStatus || '').toLowerCase() === 'running';
        dot.className = `w-2 h-2 rounded-full ${running ? 'bg-emerald-400' : 'bg-orange-400'}`;
        
        const fab = document.getElementById('chatbot-fab');
        if (fab) {
            if (running) fab.classList.add('active');
            else fab.classList.remove('active');
        }
    }
}

function appendMessage(role, text) {
    const container = document.getElementById('chatbot-messages');
    if (!container) return;

    const div = document.createElement('div');
    div.className = `chat-bubble chat-bubble-${role} animate-fade-up`;
    
    if (role === 'error') {
        div.className = 'chat-bubble-error animate-fade-up';
        div.innerHTML = `<i data-lucide="alert-circle" size="14"></i><span>${text}</span>`;
    } else {
        div.innerHTML = `<p>${text}</p>`;
    }

    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    lucide.createIcons();
}

function showThinking() {
    const container = document.getElementById('chatbot-messages');
    if (!container) return;

    // Check if already thinking
    if (document.querySelector('.chat-thinking')) return;

    const div = document.createElement('div');
    div.className = `chat-bubble chat-bubble-assistant chat-thinking animate-pulse-soft self-start rounded-tl-none border border-slate-100 italic text-slate-400 text-xs`;
    div.innerHTML = `<p>AgriNova is thinking...</p>`;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// Helpers
function safeText(value, fallback = "--") {
    return value === null || value === undefined || value === "" ? fallback : value;
}

function safeNumber(value, fallback = "--") {
    const num = Number(value);
    return Number.isFinite(num) ? num : fallback;
}

function formatTime(value) {
    if (!value) return "--";
    const date = new Date(value);
    return isNaN(date.getTime()) ? "--" : date.toLocaleString();
}

function updateText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatLabel(val, unit = '') {
    const v = safeVal(val);
    if (v === null) return '--';
    if (typeof v === 'number') return `${v.toFixed(1)}${unit}`;
    return `${v}${unit}`;
}

function safeVal(value) {
    if (value === null || value === undefined || value === "") return null;
    return value;
}

function formatScore(val) {
    const v = safeVal(val);
    if (v === null) return "--";
    return `${v}%`;
}

function renderList(id, items, emptyText = "No records available.") {
    const el = document.getElementById(id);
    if (!el) return;
    el.innerHTML = "";
    
    const itemList = items || [];
    if (itemList.length === 0) {
        el.innerHTML = `<li class="flex items-start gap-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 italic text-slate-400 text-xs">${emptyText}</li>`;
        return;
    }

    itemList.forEach((item) => {
        const text = Array.isArray(item) ? item[0] : item;
        const li = document.createElement("li");
        li.className = "flex items-start gap-4 p-4 bg-white/50 rounded-2xl border border-white/50 animate-fade-up";
        li.innerHTML = `
            <div class="mt-1.5 w-2 h-2 rounded-full bg-emerald-500 shrink-0 shadow-sm shadow-emerald-200"></div>
            <p class="text-slate-700 font-bold text-sm tracking-tight">${text}</p>
        `;
        el.appendChild(li);
    });
}

function getStatusClass(value) {
    const v = String(value || "").toLowerCase();
    if (v.includes("critical") || v.includes("abnormal") || v.includes("error") || v.includes("unhealthy") || v.includes("high")) return "bg-red-50 text-red-600 border border-red-100";
    if (v.includes("warning") || v.includes("medium") || v.includes("sensor") || v.includes("dry")) return "bg-orange-50 text-orange-600 border border-orange-100 font-bold";
    if (v.includes("healthy") || v.includes("ok") || v.includes("completed") || v.includes("low") || v.includes("normal") || v.includes("good")) return "bg-emerald-50 text-emerald-600 border border-emerald-100 font-bold";
    return "bg-slate-50 text-slate-400 border border-slate-100";
}

function getStatusDotClass(value) {
    const v = String(value || "").toLowerCase();
    if (v.includes("online") || v.includes("running") || v.includes("completed") || v.includes("active")) return "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]";
    if (v.includes("pending") || v.includes("waiting") || v.includes("busy") || v.includes("warning")) return "bg-orange-400";
    if (v.includes("error") || v.includes("failed") || v.includes("offline")) return "bg-red-500";
    return "bg-slate-300";
}
