/**
 * PVOutput.org Solar Dashboard - Application Logic
 * Pure Vanilla JavaScript (Client-side HTML5 & SVG)
 */

// Global Configuration & Defaults
const DEFAULTS = {
  systemId: "",
  apiKey: "",
  proxyUrl: "",
  refreshInterval: 300000 // 5 minutes
};

// Weather Translations from English PVOutput weather strings to German
// Weather strings will be fetched from language.json, fallback values provided here
let texts = {
  "weatherFine": "Sonnig",
  "weatherPartlyCloudy": "Leicht bewölkt",
  "weatherMostlyCloudy": "Stark bewölkt",
  "weatherCloudy": "Bewölkt",
  "weatherShowers": "Regenschauer",
  "weatherRain": "Regnerisch",
  "weatherDrizzle": "Sprühregen",
  "weatherSnow": "Schnee",
  "weatherFog": "Nebel",
  "weatherWindy": "Windig",
  "weatherUnknown": "Unbekannt",

  "statusConfigMissing": "Konfiguration fehlt",
  "statusWelcome": "Willkommen! Bitte geben Sie Ihre PVOutput System-ID & API-Key in den Einstellungen ein (oder per URL: ?sid=...&key=...).",
  "statusConnecting": "Lade Daten...",
  "statusUpdating": "Aktualisiere...",
  "statusLoadingSolar": "Lade Solardaten von PVOutput.org...",
  "statusApiLimit": "API-Limit erreicht",
  "statusApiLimitError": "⚠️ PVOutput API-Limit erreicht (max. 60 Anfragen/Stunde). Es konnten keine Daten geladen werden. Bitte später erneut versuchen oder eigenen Proxy/API-Key prüfen.",
  "statusApiLimitWarn": "⚠️ PVOutput API-Limit erreicht (max. 60 Anfragen/Stunde). Nächste automatische Aktualisierung in 5 Min.",
  "statusConnected": "Verbunden",
  "statusDisconnected": "Nicht verbunden",
  "statusNoData": "Keine Daten geladen. Öffentliche CORS-Proxys blockiert? Bitte Einstellungen oder eigenen Proxy prüfen.",
  "statusCorsError": "CORS/Netzwerkfehler beim Datenabruf. Bitte eigenen Proxy in den Einstellungen konfigurieren.",

  "historyChartTitleD": "Solarertrags-Historie (Täglich - Letzte 30 Tage)",
  "historyChartTitleW": "Solarertrags-Historie (Wöchentlich - Letzte 12 Wochen)",
  "historyChartTitleM": "Solarertrags-Historie (Monatlich - Letzte 12 Monate)",
  "historyChartTitleY": "Solarertrags-Historie (Jährlich - Alle Jahre)",
  "historyChartEmpty": "Keine Daten verfügbar.",
  "historyChartAvg": "Durchschnitt:",
  "historyChartPerPeriod": "pro Periode",
  "historyTotal": "Gesamtsumme:",

  "chartPower": "Leistung (W)",
  "chartYield": "Ertrag (kWh)",
  "tooltipYield": "Ertrag:",
  "tooltipPower": "Leistung:",

  "monthJan": "Januar",
  "monthFeb": "Februar",
  "monthMar": "März",
  "monthApr": "April",
  "monthMay": "Mai",
  "monthJun": "Juni",
  "monthJul": "Juli",
  "monthAug": "August",
  "monthSep": "September",
  "monthOct": "Oktober",
  "monthNov": "November",
  "monthDec": "Dezember",

  "monthJanShort": "Jan",
  "monthFebShort": "Feb",
  "monthMarShort": "Mär",
  "monthAprShort": "Apr",
  "monthMayShort": "Mai",
  "monthJunShort": "Jun",
  "monthJulShort": "Jul",
  "monthAugShort": "Aug",
  "monthSepShort": "Sep",
  "monthOctShort": "Okt",
  "monthNovShort": "Nov",
  "monthDecShort": "Dez",

  "weekShort": "KW ",
  "yearPrefix": "Jahr ",

  "um": "um",
  "tage": "Tage",

  "liveTimeStand": "Stand:",
  "liveTimeUhr": "Uhr",

  "navSubtitle": "PVOutput.org • System ID: ",
  "statMaxDate": "Datum:",
  "settingsLanguage": "Sprache"
};

let availableLanguages = {};

async function loadLanguageConfig() {
  try {
    // 1. Fetch available languages registry
    const regRes = await fetch("languages.json", { cache: "no-store" });
    if (regRes.ok) {
      availableLanguages = await regRes.json();
      populateLanguageDropdown();
    }

    // 2. Fetch selected language strings
    const currentLang = localStorage.getItem("pv_language") || "de";
    const res = await fetch(`lang/${currentLang}.json`, { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      texts = { ...texts, ...data };
      applyTranslations();
    }
  } catch (err) {
    console.warn("Could not load language configuration, using default translations.", err);
  }
}

function populateLanguageDropdown() {
  const select = document.getElementById("input-language");
  if (!select) return;

  select.innerHTML = "";
  const currentLang = localStorage.getItem("pv_language") || "de";

  for (const [code, name] of Object.entries(availableLanguages)) {
    const option = document.createElement("option");
    option.value = code;
    option.textContent = name;
    if (code === currentLang) {
      option.selected = true;
    }
    select.appendChild(option);
  }
}

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (texts[key]) {
      el.textContent = texts[key];
    }
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    if (texts[key]) {
      el.title = texts[key];
    }
  });
}


// Runtime Credentials Resolver (Order: URL Parameters -> localStorage -> window.ENV -> Defaults)
function resolveCredentials() {
  const urlParams = new URLSearchParams(window.location.search);
  const windowEnv = window.ENV || {};

  const sid = urlParams.get("sid") || urlParams.get("systemId") || localStorage.getItem("pv_sys_id") || windowEnv.SYSTEM_ID || DEFAULTS.systemId;
  const key = urlParams.get("key") || urlParams.get("apiKey") || localStorage.getItem("pv_api_key") || windowEnv.API_KEY || DEFAULTS.apiKey;
  const proxy = urlParams.get("proxy") || urlParams.get("proxyUrl") || localStorage.getItem("pv_proxy_url") || windowEnv.PROXY_URL || DEFAULTS.proxyUrl;

  if (urlParams.get("sid") || urlParams.get("systemId")) localStorage.setItem("pv_sys_id", sid);
  if (urlParams.get("key") || urlParams.get("apiKey")) localStorage.setItem("pv_api_key", key);
  if (urlParams.get("proxy") || urlParams.get("proxyUrl")) localStorage.setItem("pv_proxy_url", proxy);

  return { systemId: sid, apiKey: key, proxyUrl: proxy };
}

const initialCreds = resolveCredentials();

// State Store
const state = {
  systemId: initialCreds.systemId,
  apiKey: initialCreds.apiKey,
  proxyUrl: initialCreds.proxyUrl,
  refreshInterval: parseInt(localStorage.getItem("pv_refresh_interval") || DEFAULTS.refreshInterval, 10),

  // Data Cache
  liveStatus: null,
  intradayHistory: [],
  rawDailyOutputs: [],
  outputData: {
    d: [], // Daily
    w: [], // Weekly
    m: [], // Monthly
    y: []  // Yearly
  },
  statistic: null,
  systemInfo: null,

  // UI State
  activeGranularity: "d",
  refreshTimer: null,
  isFetching: false
};

// DOM Elements
const elements = {
  navSystemId: document.getElementById("nav-system-id"),
  connPill: document.getElementById("conn-pill"),
  refreshBtn: document.getElementById("refresh-btn"),
  settingsBtn: document.getElementById("settings-btn"),
  statusBanner: document.getElementById("status-banner"),
  statusBannerText: document.getElementById("status-banner-text"),

  // Live Card
  livePowerVal: document.getElementById("live-power-val"),
  liveTodayKwh: document.getElementById("live-today-kwh"),
  liveTime: document.getElementById("live-time"),
  livePeakPower: document.getElementById("live-peak-power"),
  livePeakTime: document.getElementById("live-peak-time"),
  liveEfficiency: document.getElementById("live-efficiency"),
  liveTemp: document.getElementById("live-temp"),
  liveCondition: document.getElementById("live-condition"),

  // Yield Summary Tiles
  summaryDay: document.getElementById("summary-yield-day"),
  summaryDayUnit: document.getElementById("summary-yield-day-unit"),
  summaryWeek: document.getElementById("summary-yield-week"),
  summaryMonth: document.getElementById("summary-yield-month"),
  summaryYear: document.getElementById("summary-yield-year"),  // Intraday & History Chart Canvas Elements
  intradayMaxVal: document.getElementById("intraday-max-val"),
  intradayChartCanvas: document.getElementById("intraday-chart"),

  // History Chart & Tabs
  historyChartTitle: document.getElementById("history-chart-title"),
  tabButtons: document.querySelectorAll(".tab-btn"),
  historySummaryText: document.getElementById("history-summary-text"),
  historyTotalText: document.getElementById("history-total-text"),
  historyChartCanvas: document.getElementById("history-chart"),

  // Statistics & System InfoInfo
  statTotalEnergy: document.getElementById("stat-total-energy"),
  statAvgDaily: document.getElementById("stat-avg-daily"),
  statMaxDaily: document.getElementById("stat-max-daily"),
  statMaxDailyDate: document.getElementById("stat-max-daily-date"),
  statOutputsCount: document.getElementById("stat-outputs-count"),

  sysName: document.getElementById("sys-name"),
  sysSize: document.getElementById("sys-size"),
  sysPanels: document.getElementById("sys-panels"),
  sysInverter: document.getElementById("sys-inverter"),

  // Modal Elements
  settingsModal: document.getElementById("settings-modal"),
  settingsForm: document.getElementById("settings-form"),
  inputSystemId: document.getElementById("input-system-id"),
  inputApiKey: document.getElementById("input-api-key"),
  inputProxyUrl: document.getElementById("input-proxy-url"),
  inputRefreshInterval: document.getElementById("input-refresh-interval"),
  modalCloseBtn: document.getElementById("modal-close-btn"),
  modalCancelBtn: document.getElementById("modal-cancel-btn")
};

// Async secrets.json loader (if available locally or on web root)
async function loadSecretsJson() {
  try {
    const res = await fetch("secrets.json", { cache: "no-store" });
    if (res.ok) {
      const data = await res.json();
      if (data) {
        if (!state.systemId && data.systemId) state.systemId = data.systemId.trim();
        if (!state.apiKey && data.apiKey) state.apiKey = data.apiKey.trim();
        if (!state.proxyUrl && data.proxyUrl) state.proxyUrl = data.proxyUrl.trim();
      }
    }
  } catch (err) {
    // secrets.json not present or unreadable, silently ignore
  }
}

// Initialize Application
document.addEventListener("DOMContentLoaded", async () => {
  await loadLanguageConfig();

  await loadSecretsJson();
  initUI();
  setupEventListeners();
  renderDashboardUI();
  loadAllDashboardData();
  startAutoRefresh();
});

function initUI() {
  elements.navSystemId.textContent = state.systemId ? state.systemId : "--";
  elements.inputSystemId.value = state.systemId;
  elements.inputApiKey.value = state.apiKey;
  elements.inputProxyUrl.value = state.proxyUrl;
  elements.inputRefreshInterval.value = state.refreshInterval.toString();

  if (!state.systemId || !state.apiKey) {
    updateBadge("disconnected", texts.statusConfigMissing);
    showStatusBanner(texts.statusWelcome, "info");
    setTimeout(() => {
      if (elements.settingsModal && !elements.settingsModal.open) {
        elements.settingsModal.showModal();
      }
    }, 400);
  }
}

function setupEventListeners() {
  elements.refreshBtn.addEventListener("click", () => {
    loadAllDashboardData(true);
  });

  elements.settingsBtn.addEventListener("click", () => {
    elements.settingsModal.showModal();
  });

  elements.modalCloseBtn.addEventListener("click", () => elements.settingsModal.close());
  elements.modalCancelBtn.addEventListener("click", () => elements.settingsModal.close());

  elements.settingsForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const langSelect = document.getElementById("input-language");
    if (langSelect) {
      const newLang = langSelect.value;
      const oldLang = localStorage.getItem("pv_language") || "de";
      if (newLang !== oldLang) {
        localStorage.setItem("pv_language", newLang);
        await loadLanguageConfig();
      }
    }

    state.systemId = elements.inputSystemId.value.trim();
    state.apiKey = elements.inputApiKey.value.trim();
    state.proxyUrl = elements.inputProxyUrl.value.trim();
    state.refreshInterval = parseInt(elements.inputRefreshInterval.value, 10);

    localStorage.setItem("pv_sys_id", state.systemId);
    localStorage.setItem("pv_api_key", state.apiKey);
    localStorage.setItem("pv_proxy_url", state.proxyUrl);
    localStorage.setItem("pv_refresh_interval", state.refreshInterval.toString());

    elements.navSystemId.textContent = state.systemId;
    elements.settingsModal.close();

    // Also re-render UI in case language changed formatters (e.g. date) or static text in UI components
    renderDashboardUI();

    startAutoRefresh();
    loadAllDashboardData(true);
  });

  // Tab Buttons for Granularity
  elements.tabButtons.forEach(btn => {
    btn.addEventListener("click", (e) => {
      const gran = e.target.getAttribute("data-granularity");
      if (!gran || gran === state.activeGranularity) return;

      elements.tabButtons.forEach(b => {
        b.classList.remove("active");
        b.setAttribute("aria-selected", "false");
      });
      e.target.classList.add("active");
      e.target.setAttribute("aria-selected", "true");

      state.activeGranularity = gran;
      renderHistoryChart();
    });
  });
}

function startAutoRefresh() {
  if (state.refreshTimer) clearInterval(state.refreshTimer);

  if (state.refreshInterval > 0) {
    state.refreshTimer = setInterval(() => {
      loadAllDashboardData(false);
    }, state.refreshInterval);
  }
}

// Utility delay for sequential staggered requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch with timeout helper
async function fetchWithTimeout(url, options = {}, timeoutMs = 2500) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        "Pragma": "no-cache",
        ...(options.headers || {})
      },
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    return res;
  } catch (err) {
    clearTimeout(timeoutId);
    throw err;
  }
}

// Helper to validate clean PVOutput text response (rejecting 403 rate limits, 500 HTML errors, JSON error objects)
function isValidPVOutputResponse(text) {
  if (!text || typeof text !== "string") return false;
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.includes("<html") || trimmed.includes("<body") || trimmed.includes("<head")) return false;
  if (trimmed.startsWith("Err") || trimmed.startsWith("Forbidden") || trimmed.includes("Exceeded 60 requests") || trimmed.includes("error code:") || trimmed.includes("Server-side requests are not allowed")) {
    return false;
  }
  return true;
}

// Network Request with Multi-Proxy Fallback Chain, Cache Busting & Short Timeout
async function fetchPVOutput(endpoint, queryParams = {}) {
  const params = new URLSearchParams({
    key: state.apiKey,
    sid: state.systemId,
    _t: Date.now().toString(), // Cache-buster timestamp to prevent proxy/browser stale caching
    ...queryParams
  });

  const targetUrl = `https://pvoutput.org/service/r2/${endpoint}?${params.toString()}`;

  const proxyCandidates = [];

  // Custom user proxy if configured
  if (state.proxyUrl) {
    proxyCandidates.push({
      type: "raw",
      url: state.proxyUrl.includes("%s") ? state.proxyUrl.replace("%s", encodeURIComponent(targetUrl)) : `${state.proxyUrl}${encodeURIComponent(targetUrl)}`
    });
  }

  // Candidate Proxies in order of reliability for browser / GitHub Pages origins
  proxyCandidates.push({ type: "raw", url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(targetUrl)}` });
  proxyCandidates.push({ type: "raw", url: `https://corsproxy.io/?${encodeURIComponent(targetUrl)}` });
  proxyCandidates.push({ type: "raw", url: `https://thingproxy.freeboard.io/fetch/${targetUrl}` });
  proxyCandidates.push({ type: "raw", url: `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}` });
  proxyCandidates.push({ type: "allorigins-json", url: `https://api.allorigins.win/get?url=${encodeURIComponent(targetUrl)}` });
  proxyCandidates.push({ type: "raw", url: targetUrl });

  let lastError = null;
  let isRateLimited = false;

  for (const proxy of proxyCandidates) {
    try {
      const res = await fetchWithTimeout(proxy.url, { cache: "no-store" }, 2500);
      let text = "";

      if (proxy.type === "allorigins-json") {
        if (res.ok) {
          try {
            const json = await res.json();
            text = (json && json.contents) ? json.contents.trim() : "";
          } catch (_) {}
        }
      } else {
        try {
          text = await res.text();
        } catch (_) {}
      }

      if (
        res.status === 429 ||
        (text && (
          text.includes("Exceeded 60 requests") ||
          text.includes("Rate Limit Exceeded") ||
          text.startsWith("Err 400: Exceeded") ||
          /exceeded \d+ requests/i.test(text)
        ))
      ) {
        isRateLimited = true;
      }

      if (res.ok && isValidPVOutputResponse(text)) {
        return text.trim();
      }
    } catch (err) {
      console.warn(`Proxy Attempt (${proxy.url}) failed:`, err);
      lastError = err;
    }
  }

  if (isRateLimited) {
    throw new Error("RATE_LIMIT_EXCEEDED");
  }

  throw lastError || new Error(`Konnte keine Verbindung zu ${endpoint} herstellen.`);
}

// Staggered Sequential Fetcher with 1500ms delay to prevent PVOutput HTTP 403 rate-limiting
async function loadAllDashboardData(manual = false) {
  if (!state.systemId || !state.apiKey) {
    updateBadge("disconnected", texts.statusConfigMissing);
    showStatusBanner("Bitte PVOutput System-ID & API-Key in den Einstellungen eintragen.", "info");
    return;
  }

  if (state.isFetching) return;
  state.isFetching = true;

  updateBadge("connecting", manual ? texts.statusConnecting : texts.statusUpdating);
  showStatusBanner(texts.statusLoadingSolar, "info");

  let successCount = 0;
  let rateLimitHit = false;

  try {
    // 1. Fetch Intraday 5-min history & Live Status in 1 request (Always run on auto-refresh & manual)
    try {
      const historyIntradayRaw = await fetchPVOutput("getstatus.jsp", { h: 1, limit: 288 });
      if (historyIntradayRaw) {
        state.intradayHistory = parseIntradayHistory(historyIntradayRaw);
        if (state.intradayHistory.length > 0) {
          const latestPoint = state.intradayHistory[state.intradayHistory.length - 1];
          if (!state.liveStatus || `${latestPoint.date}${latestPoint.time}` >= `${state.liveStatus.date}${state.liveStatus.time}`) {
            state.liveStatus = {
              date: latestPoint.date,
              time: latestPoint.time,
              energyWh: latestPoint.energyWh,
              powerW: latestPoint.powerW,
              efficiency: latestPoint.efficiency,
              tempC: latestPoint.tempC
            };
          }
        }
        successCount++;
      }
    } catch (e) {
      if (e.message === "RATE_LIMIT_EXCEEDED") rateLimitHit = true;
      console.warn("intraday history fetch warning:", e);
    }

    // 2. Fetch Output History (365 days) - only on manual refresh or if output history is missing
    if (state.rawDailyOutputs.length === 0 || manual) {
      await delay(1500);
      try {
        const outputRaw = await fetchPVOutput("getoutput.jsp", { limit: 365 });
        if (outputRaw) {
          state.rawDailyOutputs = parseOutputRows(outputRaw);
          computeOutputAggregations(state.rawDailyOutputs);
          successCount++;
        }
      } catch (e) {
        if (e.message === "RATE_LIMIT_EXCEEDED") rateLimitHit = true;
        console.warn("getoutput.jsp fetch warning:", e);
      }
    }

    // 3. Fetch Overall Statistic (only if missing or manual refresh)
    if (!state.statistic || manual) {
      await delay(1500);
      try {
        const statRaw = await fetchPVOutput("getstatistic.jsp");
        if (statRaw) {
          state.statistic = parseStatistic(statRaw);
          successCount++;
        }
      } catch (e) {
        if (e.message === "RATE_LIMIT_EXCEEDED") rateLimitHit = true;
        console.warn("getstatistic.jsp fetch warning:", e);
      }
    }

    // 4. Fetch System Info (only if missing or manual refresh)
    if (!state.systemInfo || manual) {
      await delay(1500);
      try {
        const sysRaw = await fetchPVOutput("getsystem.jsp");
        if (sysRaw) {
          state.systemInfo = parseSystemInfo(sysRaw);
          successCount++;
        }
      } catch (e) {
        if (e.message === "RATE_LIMIT_EXCEEDED") rateLimitHit = true;
        console.warn("getsystem.jsp fetch warning:", e);
      }
    }

    // Sync today's live status with daily outputs aggregation map
    syncTodayOutputWithLiveStatus();

    // Render UI Updates with actual loaded data only
    renderDashboardUI();

    if (rateLimitHit) {
      updateBadge("connecting", texts.statusApiLimit);
      if (successCount === 0) {
        showStatusBanner(texts.statusApiLimitError, "warning");
      } else {
        showStatusBanner(texts.statusApiLimitWarn, "warning");
      }
    } else if (successCount > 0) {
      updateBadge("connected", texts.statusConnected);
      hideStatusBanner();
    } else {
      updateBadge("disconnected", texts.statusDisconnected);
      showStatusBanner(texts.statusNoData, "error");
    }

  } catch (err) {
    console.error("PVOutput Fetch Error:", err);
    renderDashboardUI();
    if (err.message === "RATE_LIMIT_EXCEEDED") {
      updateBadge("connecting", texts.statusApiLimit);
      showStatusBanner(texts.statusApiLimitError, "warning");
    } else {
      updateBadge("disconnected", texts.statusDisconnected);
      showStatusBanner(texts.statusCorsError, "error");
    }
  } finally {
    state.isFetching = false;
  }
}

// Sync today's live status energy with outputData daily list
function syncTodayOutputWithLiveStatus() {
  if (!state.liveStatus || !state.liveStatus.date) return;

  const todayStr = state.liveStatus.date;
  const liveKwh = state.liveStatus.energyWh / 1000;

  let existing = state.outputData.d.find(item => item.dateStr === todayStr);
  if (existing) {
    existing.energyWh = Math.max(existing.energyWh, state.liveStatus.energyWh);
    existing.energyKwh = existing.energyWh / 1000;
    if (state.liveStatus.powerW > existing.peakPowerW) {
      existing.peakPowerW = state.liveStatus.powerW;
    }
  } else {
    state.outputData.d.push({
      dateStr: todayStr,
      energyWh: state.liveStatus.energyWh,
      energyKwh: liveKwh,
      efficiency: state.liveStatus.efficiency || 0,
      peakPowerW: state.liveStatus.powerW || 0,
      peakTime: state.liveStatus.time || "",
      condition: ""
    });
    state.outputData.d.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
    state.outputData.d = state.outputData.d.slice(-30);
  }
}

// CSV Parsers
function parseLiveStatus(raw) {
  // Single status row: Date, Time, EnergyGen(Wh), PowerGen(W), EnergyExp(Wh), PowerExp(W), Efficiency(kWh/kW), Temp(C)
  const parts = raw.split(",");
  if (parts.length < 4) return null;

  return {
    date: parts[0],
    time: parts[1],
    energyWh: parseFloat(parts[2]) || 0,
    powerW: parseFloat(parts[3]) || 0,
    efficiency: parts[6] && !isNaN(parts[6]) ? parseFloat(parts[6]) : 0,
    tempC: parts[7] && !isNaN(parts[7]) ? parseFloat(parts[7]) : null
  };
}

function parseIntradayHistory(raw) {
  // History status rows separated by ';'
  // Format: Date, Time, EnergyGen(Wh), Efficiency, PowerGen(W), EnergyExp(Wh), PowerExp(W), Voltage, Consumed, Temp(C)...
  const rows = raw.split(";").filter(r => r.trim());
  const points = [];

  for (const row of rows) {
    const p = row.split(",");
    if (p.length >= 5) {
      points.push({
        date: p[0],
        time: p[1],
        energyWh: parseFloat(p[2]) || 0,
        efficiency: parseFloat(p[3]) || 0,
        powerW: parseFloat(p[4]) || 0,
        tempC: p[9] && !isNaN(p[9]) ? parseFloat(p[9]) : null
      });
    }
  }

  return points.sort((a, b) => `${a.date}${a.time}`.localeCompare(`${b.date}${b.time}`));
}

function parseOutputRows(raw) {
  // getoutput.jsp returns daily rows separated by ';'
  // Format: Date, EnergyGen(Wh), Efficiency(kWh/kW), EnergyExp(Wh), EnergyCons(Wh), PeakPower(W), PeakTime, Condition...
  const rows = raw.split(";").filter(r => r.trim());
  const outputs = [];

  for (const row of rows) {
    const p = row.split(",");
    if (p.length >= 3) {
      outputs.push({
        dateStr: p[0],
        energyWh: parseFloat(p[1]) || 0,
        energyKwh: (parseFloat(p[1]) || 0) / 1000,
        efficiency: parseFloat(p[2]) || 0,
        peakPowerW: parseFloat(p[5]) || parseFloat(p[4]) || 0,
        peakTime: p[6] || p[5] || "",
        condition: p[7] || p[6] || ""
      });
    }
  }

  return outputs.sort((a, b) => a.dateStr.localeCompare(b.dateStr));
}

// Compute Weekly, Monthly, and Yearly aggregations from daily output rows
function computeOutputAggregations(dailyRows) {
  state.outputData.d = dailyRows.slice(-30); // Last 30 days

  // Group by Weekly (ISO Week)
  const weeksMap = {};
  dailyRows.forEach(item => {
    const weekKey = getWeekKey(item.dateStr);
    if (!weeksMap[weekKey]) {
      weeksMap[weekKey] = { dateStr: item.dateStr, weekKey, energyKwh: 0, peakPowerW: 0, efficiencySum: 0, count: 0 };
    }
    weeksMap[weekKey].energyKwh += item.energyKwh;
    weeksMap[weekKey].peakPowerW = Math.max(weeksMap[weekKey].peakPowerW, item.peakPowerW);
    weeksMap[weekKey].efficiencySum += item.efficiency;
    weeksMap[weekKey].count += 1;
  });

  state.outputData.w = Object.values(weeksMap).map(w => ({
    ...w,
    efficiency: w.count > 0 ? w.efficiencySum / w.count : 0
  })).slice(-12);

  // Group by Monthly (YYYY-MM)
  const monthsMap = {};
  dailyRows.forEach(item => {
    const monthKey = item.dateStr.substring(0, 6);
    if (!monthsMap[monthKey]) {
      monthsMap[monthKey] = { dateStr: item.dateStr, monthKey, energyKwh: 0, peakPowerW: 0, efficiencySum: 0, count: 0 };
    }
    monthsMap[monthKey].energyKwh += item.energyKwh;
    monthsMap[monthKey].peakPowerW = Math.max(monthsMap[monthKey].peakPowerW, item.peakPowerW);
    monthsMap[monthKey].efficiencySum += item.efficiency;
    monthsMap[monthKey].count += 1;
  });

  state.outputData.m = Object.values(monthsMap).map(m => ({
    ...m,
    efficiency: m.count > 0 ? m.efficiencySum / m.count : 0
  })).slice(-12);

  // Group by Yearly (YYYY)
  const yearsMap = {};
  dailyRows.forEach(item => {
    const yearKey = item.dateStr.substring(0, 4);
    if (!yearsMap[yearKey]) {
      yearsMap[yearKey] = { dateStr: item.dateStr, yearKey, energyKwh: 0, peakPowerW: 0, efficiencySum: 0, count: 0 };
    }
    yearsMap[yearKey].energyKwh += item.energyKwh;
    yearsMap[yearKey].peakPowerW = Math.max(yearsMap[yearKey].peakPowerW, item.peakPowerW);
    yearsMap[yearKey].efficiencySum += item.efficiency;
    yearsMap[yearKey].count += 1;
  });

  state.outputData.y = Object.values(yearsMap).map(y => ({
    ...y,
    efficiency: y.count > 0 ? y.efficiencySum / y.count : 0
  }));
}

function parseStatistic(raw) {
  // getstatistic.jsp format: TotalWh, ExportedWh, ImportedWh, ConsumedWh, PeakPowerW, AvgDailyKwh, MinDailyWh, StartDate, EndDate, MaxDailyKwh, MaxDailyDate
  const p = raw.split(",");
  if (p.length < 10) return null;

  return {
    totalEnergyKwh: (parseFloat(p[0]) || 0) / 1000,
    peakPowerW: parseFloat(p[4]) || 0,
    avgDailyKwh: parseFloat(p[5]) || 0,
    maxDailyKwh: parseFloat(p[9]) || 0,
    maxDailyDate: p[10] || p[9] || "",
    outputsCount: state.rawDailyOutputs ? state.rawDailyOutputs.length : 0
  };
}

function parseSystemInfo(raw) {
  // getsystem.jsp format: SystemName, Capacity(W), ExportCap, Panels, PanelCap, PanelBrand, Inverters, InverterCap, InverterBrand...
  const p = raw.split(",");
  if (p.length < 8) return null;

  return {
    name: p[0] || "--",
    capacityWp: p[1] || "--",
    panels: `${p[3] || "--"}x ${p[5] || "--"} (${p[4] || "--"} W)`,
    inverter: `${p[6] || "--"}x ${p[8] || "--"} (${p[7] || "--"} W)`
  };
}

// Energy Formatter (Wh for < 1000 Wh, 3 decimals for < 10 kWh)
function formatEnergyDisplay(energyWh) {
  if (energyWh === null || energyWh === undefined || isNaN(energyWh)) return "--";
  if (Math.abs(energyWh) < 1000) {
    return `${Math.round(energyWh)} Wh`;
  }
  const kwh = energyWh / 1000;
  if (kwh < 10) {
    return `${kwh.toLocaleString("de-DE", { minimumFractionDigits: 3, maximumFractionDigits: 3 })} kWh`;
  }
  return `${kwh.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} kWh`;
}

// UI Renderer
function renderDashboardUI() {
  const todayStr = state.liveStatus ? state.liveStatus.date : formatTodayYYYYMMDD();
  let todayOutput = state.outputData.d.find(item => item.dateStr === todayStr);
  if (!todayOutput && state.outputData.d.length > 0) {
    todayOutput = state.outputData.d[state.outputData.d.length - 1];
  }

  const liveOrTodayWh = state.liveStatus ? Math.max(state.liveStatus.energyWh, todayOutput ? todayOutput.energyWh : 0) : (todayOutput ? todayOutput.energyWh : null);

  // 1. Update Live Card & Header
  if (state.liveStatus) {
    elements.livePowerVal.textContent = Math.round(state.liveStatus.powerW).toLocaleString("de-DE");
    elements.liveTodayKwh.textContent = formatEnergyDisplay(liveOrTodayWh);
    const dateFormatted = formatGermanDate(state.liveStatus.date);
    elements.liveTime.textContent = dateFormatted !== "--" ? `${texts.liveTimeStand} ${dateFormatted}, ${state.liveStatus.time} ${texts.liveTimeUhr}` : `${texts.liveTimeStand} ${state.liveStatus.time} ${texts.liveTimeUhr}`;
    elements.liveEfficiency.textContent = state.liveStatus.efficiency > 0 ? `${state.liveStatus.efficiency.toFixed(2)} kWh/kW` : "-- kWh/kW";
    elements.liveTemp.textContent = state.liveStatus.tempC !== null ? `${state.liveStatus.tempC.toFixed(1)} °C` : "-- °C";
  } else {
    elements.livePowerVal.textContent = "--";
    elements.liveTodayKwh.textContent = "--";
    elements.liveTime.textContent = `${texts.liveTimeStand} --:-- ${texts.liveTimeUhr}`;
    elements.liveEfficiency.textContent = "-- kWh/kW";
    elements.liveTemp.textContent = "-- °C";
  }

  // Today's Peak Power & Weather
  if (todayOutput) {
    elements.livePeakPower.textContent = todayOutput.peakPowerW ? `${todayOutput.peakPowerW} W` : "-- W";
    elements.livePeakTime.textContent = todayOutput.peakTime ? `${texts.um} ${todayOutput.peakTime} ${texts.liveTimeUhr}` : `--:-- ${texts.liveTimeUhr}`;

    const condLower = (todayOutput.condition || "").toLowerCase();
    elements.liveCondition.textContent = texts["weather" + condLower.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("")] || todayOutput.condition || "--";
  } else {
    elements.livePeakPower.textContent = "-- W";
    elements.livePeakTime.textContent = `--:-- ${texts.liveTimeUhr}`;
    elements.liveCondition.textContent = "--";
  }

  // 2. Update Yield Summary Tiles
  if (liveOrTodayWh !== null) {
    if (Math.abs(liveOrTodayWh) < 1000) {
      elements.summaryDay.textContent = Math.round(liveOrTodayWh).toString();
      if (elements.summaryDayUnit) elements.summaryDayUnit.textContent = "Wh";
    } else {
      const kwh = liveOrTodayWh / 1000;
      elements.summaryDay.textContent = kwh.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      if (elements.summaryDayUnit) elements.summaryDayUnit.textContent = "kWh";
    }
  } else {
    elements.summaryDay.textContent = "--";
    if (elements.summaryDayUnit) elements.summaryDayUnit.textContent = "kWh";
  }

  if (state.outputData.d.length > 0) {
    const last7 = state.outputData.d.slice(-7);
    const sumWeek = last7.reduce((acc, curr) => acc + curr.energyKwh, 0);
    elements.summaryWeek.textContent = sumWeek.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  } else {
    elements.summaryWeek.textContent = "--";
  }

  if (state.outputData.m.length > 0) {
    const currentMonth = state.outputData.m[state.outputData.m.length - 1];
    elements.summaryMonth.textContent = currentMonth.energyKwh.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  } else {
    elements.summaryMonth.textContent = "--";
  }

  if (state.outputData.y.length > 0) {
    const currentYear = state.outputData.y[state.outputData.y.length - 1];
    elements.summaryYear.textContent = currentYear.energyKwh.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  } else {
    elements.summaryYear.textContent = "--";
  }

  // 3. Render Charts
  renderIntradayChart();
  renderHistoryChart();

  // 4. Update Lifetime Stats & System Configuration
  if (state.statistic) {
    elements.statTotalEnergy.textContent = `${Math.round(state.statistic.totalEnergyKwh).toLocaleString("de-DE")} kWh`;
    elements.statAvgDaily.textContent = `${state.statistic.avgDailyKwh.toFixed(2).replace(".", ",")} kWh/Tag`;
    elements.statMaxDaily.textContent = `${state.statistic.maxDailyKwh.toFixed(2).replace(".", ",")} kWh`;
    elements.statMaxDailyDate.textContent = `${texts.statMaxDate} ${formatGermanDate(state.statistic.maxDailyDate)}`;
    elements.statOutputsCount.textContent = `${state.statistic.outputsCount.toLocaleString("de-DE")} ${texts.tage}`;
  } else {
    elements.statTotalEnergy.textContent = "-- kWh";
    elements.statAvgDaily.textContent = "-- kWh/Tag";
    elements.statMaxDaily.textContent = "-- kWh";
    elements.statMaxDailyDate.textContent = `${texts.statMaxDate} --`;
    elements.statOutputsCount.textContent = `-- ${texts.tage}`;
  }

  if (state.systemInfo) {
    elements.sysName.textContent = state.systemInfo.name || "--";
    elements.sysSize.textContent = state.systemInfo.capacityWp ? `${state.systemInfo.capacityWp} Wp` : "--";
    elements.sysPanels.textContent = state.systemInfo.panels || "--";
    elements.sysInverter.textContent = state.systemInfo.inverter || "--";
  } else {
    elements.sysName.textContent = "--";
    elements.sysSize.textContent = "-- Wp";
    elements.sysPanels.textContent = "--";
    elements.sysInverter.textContent = "--";
  }
}

// Chart Instances Store
let intradayChartInstance = null;
let historyChartInstance = null;

// -------------------------------------------------------------
// Interactive Chart.js Renderer: Heutiger 24h Verlauf
// -------------------------------------------------------------
function renderIntradayChart() {
  const canvas = elements.intradayChartCanvas;
  if (!canvas || !window.Chart) return;

  const data = state.intradayHistory;
  if (!data || data.length === 0) {
    elements.intradayMaxVal.textContent = "-- W";
    if (intradayChartInstance) {
      intradayChartInstance.destroy();
      intradayChartInstance = null;
    }
    return;
  }

  const maxPower = Math.max(0, ...data.map(d => d.powerW));
  elements.intradayMaxVal.textContent = `${Math.round(maxPower)} W`;

  const labels = data.map(d => d.time);
  const values = data.map(d => d.powerW);

  if (intradayChartInstance) {
    intradayChartInstance.data.labels = labels;
    intradayChartInstance.data.datasets[0].data = values;
    intradayChartInstance.update();
    return;
  }

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, "rgba(245, 158, 11, 0.45)");
  gradient.addColorStop(1, "rgba(245, 158, 11, 0.0)");

  intradayChartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [{
        label: texts.chartPower,
        data: values,
        borderColor: "#f59e0b",
        borderWidth: 2.5,
        backgroundColor: gradient,
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        pointHoverRadius: 5,
        pointHoverBackgroundColor: "#fbbf24"
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: "index", intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(11, 15, 25, 0.95)",
          borderColor: "#f59e0b",
          borderWidth: 1,
          titleColor: "#fbbf24",
          bodyColor: "#f8fafc",
          callbacks: {
            label: (ctx) => `${texts.tooltipPower} ${Math.round(ctx.parsed.y)} W`
          }
        }
      },
      scales: {
        x: {
          grid: { color: "rgba(255, 255, 255, 0.05)" },
          ticks: { color: "#94a3b8", maxTicksLimit: 8, font: { family: "Plus Jakarta Sans" } }
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255, 255, 255, 0.08)" },
          ticks: {
            color: "#cbd5e1",
            font: { family: "Plus Jakarta Sans" },
            callback: (val) => `${val} W`
          }
        }
      }
    }
  });
}

// -------------------------------------------------------------
// Interactive Chart.js Renderer: Aggregierter Ertrag (Balkendiagramm)
// -------------------------------------------------------------
function renderHistoryChart() {
  const canvas = elements.historyChartCanvas;
  if (!canvas || !window.Chart) return;

  const gran = state.activeGranularity;
  const list = state.outputData[gran] || [];

  const titles = {
    d: texts.historyChartTitleD,
    w: texts.historyChartTitleW,
    m: texts.historyChartTitleM,
    y: texts.historyChartTitleY
  };
  elements.historyChartTitle.textContent = titles[gran] || "Solarertrags-Historie";

  if (!list || list.length === 0) {
    elements.historySummaryText.textContent = texts.historyChartEmpty;
    elements.historyTotalText.textContent = `${texts.historyTotal} -- kWh`;
    if (historyChartInstance) {
      historyChartInstance.destroy();
      historyChartInstance = null;
    }
    return;
  }

  const totalKwh = list.reduce((acc, curr) => acc + curr.energyKwh, 0);
  const avgKwh = totalKwh / list.length;
  elements.historySummaryText.textContent = `${texts.historyChartAvg} ${avgKwh.toFixed(1).replace(".", ",")} kWh ${texts.historyChartPerPeriod}`;
  elements.historyTotalText.textContent = `${texts.historyTotal} ${Math.round(totalKwh).toLocaleString("de-DE")} kWh`;

  const labels = list.map(item => formatGranularDateLabel(item.dateStr, gran, item.weekKey, item.monthKey, item.yearKey));
  const values = list.map(item => Number(item.energyKwh.toFixed(2)));

  if (historyChartInstance) {
    historyChartInstance.data.labels = labels;
    historyChartInstance.data.datasets[0].data = values;
    historyChartInstance.update();
    return;
  }

  const ctx = canvas.getContext("2d");
  const gradient = ctx.createLinearGradient(0, 0, 0, 240);
  gradient.addColorStop(0, "#fbbf24");
  gradient.addColorStop(1, "#d97706");

  historyChartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [{
        label: texts.chartYield,
        data: values,
        backgroundColor: gradient,
        borderRadius: 5,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: "rgba(11, 15, 25, 0.95)",
          borderColor: "#f59e0b",
          borderWidth: 1,
          titleColor: "#fbbf24",
          bodyColor: "#f8fafc",
          callbacks: {
            label: (ctx) => `${texts.tooltipYield} ${ctx.parsed.y.toFixed(2).replace(".", ",")} kWh`
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: "#94a3b8", maxTicksLimit: 12, font: { family: "Plus Jakarta Sans" } }
        },
        y: {
          beginAtZero: true,
          grid: { color: "rgba(255, 255, 255, 0.08)" },
          ticks: {
            color: "#cbd5e1",
            font: { family: "Plus Jakarta Sans" },
            callback: (val) => `${val} kWh`
          }
        }
      }
    }
  });
}

// Helpers & Formatters
function updateBadge(mode, text) {
  elements.connPill.className = `badge badge-${mode}`;
  elements.connPill.textContent = text;
}

function showStatusBanner(msg, type = "info") {
  elements.statusBanner.className = `status-banner status-${type}`;
  elements.statusBanner.style.display = "block";
  elements.statusBannerText.textContent = msg;
}

function hideStatusBanner() {
  elements.statusBanner.style.display = "none";
}

function formatTodayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

function formatGermanDate(str) {
  if (!str || str.length < 8) return str || "--";
  const yyyy = str.substring(0, 4);
  const mm = str.substring(4, 6);
  const dd = str.substring(6, 8);
  return `${dd}.${mm}.${yyyy}`;
}

function formatGranularDateLabel(str, gran, weekKey, monthKey, yearKey) {
  if (gran === "d") {
    if (!str || str.length < 8) return str;
    return `${str.substring(6, 8)}.${str.substring(4, 6)}.`;
  }
  if (gran === "w") return weekKey ? weekKey.replace(/^.*-W/, texts.weekShort) : `${texts.weekShort}${getWeekNumber(str)}`;
  if (gran === "m") {
    const mm = monthKey ? monthKey.substring(4, 6) : (str ? str.substring(4, 6) : "");
    return getMonthNameShort(mm);
  }
  if (gran === "y") return yearKey || (str ? str.substring(0, 4) : "");
  return str;
}

function formatGermanDateLong(str, gran, weekKey, monthKey, yearKey) {
  if (gran === "d") return formatGermanDate(str);
  if (gran === "w") {
    const kw = weekKey ? weekKey.replace(/^.*-W/, texts.weekShort) : `${texts.weekShort}${getWeekNumber(str)}`;
    return `${kw} (${formatGermanDate(str)})`;
  }
  if (gran === "m") {
    const mm = monthKey ? monthKey.substring(4, 6) : (str ? str.substring(4, 6) : "");
    const yyyy = monthKey ? monthKey.substring(0, 4) : (str ? str.substring(0, 4) : "");
    return `${getMonthNameLong(mm)} ${yyyy}`;
  }
  if (gran === "y") return `${texts.yearPrefix}${yearKey || (str ? str.substring(0, 4) : "")}`;
  return str;
}

function getWeekKey(str) {
  if (!str || str.length < 8) return str;
  const yyyy = str.substring(0, 4);
  const kw = getWeekNumber(str);
  return `${yyyy}-W${String(kw).padStart(2, '0')}`;
}

function getWeekNumber(str) {
  if (!str || str.length < 8) return "";
  const date = new Date(parseInt(str.substring(0,4)), parseInt(str.substring(4,6)) - 1, parseInt(str.substring(6,8)));
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

function getMonthNameShort(mm) {
  const months = [texts.monthJanShort, texts.monthFebShort, texts.monthMarShort, texts.monthAprShort, texts.monthMayShort, texts.monthJunShort, texts.monthJulShort, texts.monthAugShort, texts.monthSepShort, texts.monthOctShort, texts.monthNovShort, texts.monthDecShort];
  return months[parseInt(mm, 10) - 1] || mm;
}

function getMonthNameLong(mm) {
  const months = [texts.monthJan, texts.monthFeb, texts.monthMar, texts.monthApr, texts.monthMay, texts.monthJun, texts.monthJul, texts.monthAug, texts.monthSep, texts.monthOct, texts.monthNov, texts.monthDec];
  return months[parseInt(mm, 10) - 1] || mm;
}
