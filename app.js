import { I18n } from './i18n.js';
import { PVOutputAPI } from './api.js';
import { DashboardCharts } from './charts.js';
import { DashboardUI } from './ui.js';
import * as utils from './utils.js';

// Global Configuration & Defaults
const DEFAULTS = {
  systemId: "",
  apiKey: "",
  proxyUrl: "",
  refreshInterval: 300000 // 5 minutes
};

// State Store
const state = {
  systemId: "",
  apiKey: "",
  proxyUrl: "",
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
  openMeteo: null,

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
  summaryYear: document.getElementById("summary-yield-year"),

  // Intraday & History Chart Canvas Elements
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

// Initialize Modules
const i18n = new I18n();
const api = new PVOutputAPI(state, i18n);
const charts = new DashboardCharts(state, elements, i18n, utils);
const ui = new DashboardUI(state, elements, i18n, charts);

// Runtime Credentials Resolver
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

// Async secrets.json loader
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

function initUI() {
  elements.navSystemId.textContent = state.systemId ? state.systemId : "--";
  elements.inputSystemId.value = state.systemId;
  elements.inputApiKey.value = state.apiKey;
  elements.inputProxyUrl.value = state.proxyUrl;
  elements.inputRefreshInterval.value = state.refreshInterval.toString();

  if (!state.systemId || !state.apiKey) {
    ui.updateBadge("disconnected", i18n.get('statusConfigMissing'));
    ui.showStatusBanner(i18n.get('statusWelcome'), "info");
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
        await i18n.loadLanguageConfig();
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

    ui.renderDashboardUI();

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
      charts.renderHistoryChart();
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

// Staggered Sequential Fetcher with 1500ms delay to prevent PVOutput HTTP 403 rate-limiting
async function loadAllDashboardData(manual = false) {
  if (!state.systemId || !state.apiKey) {
    ui.updateBadge("disconnected", i18n.get('statusConfigMissing'));
    ui.showStatusBanner("Bitte PVOutput System-ID & API-Key in den Einstellungen eintragen.", "info");
    return;
  }

  if (state.isFetching) return;
  state.isFetching = true;

  ui.updateBadge("connecting", manual ? i18n.get('statusConnecting') : i18n.get('statusUpdating'));
  ui.showStatusBanner(i18n.get('statusLoadingSolar'), "info");

  let successCount = 0;
  let rateLimitHit = false;

  try {
    // 1. Fetch Intraday 5-min history & Live Status in 1 request
    try {
      const historyIntradayRaw = await api.fetchPVOutput("getstatus.jsp", { h: 1, limit: 288 });
      if (historyIntradayRaw) {
        state.intradayHistory = api.parseIntradayHistory(historyIntradayRaw);
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

    // 2. Fetch Output History (365 days)
    if (state.rawDailyOutputs.length === 0 || manual) {
      await utils.delay(1500);
      try {
        const outputRaw = await api.fetchPVOutput("getoutput.jsp", { limit: 365 });
        if (outputRaw) {
          state.rawDailyOutputs = api.parseOutputRows(outputRaw);
          api.computeOutputAggregations(state.rawDailyOutputs);
          successCount++;
        }
      } catch (e) {
        if (e.message === "RATE_LIMIT_EXCEEDED") rateLimitHit = true;
        console.warn("getoutput.jsp fetch warning:", e);
      }
    }

    // 3. Fetch Overall Statistic
    if (!state.statistic || manual) {
      await utils.delay(1500);
      try {
        const statRaw = await api.fetchPVOutput("getstatistic.jsp");
        if (statRaw) {
          state.statistic = api.parseStatistic(statRaw);
          successCount++;
        }
      } catch (e) {
        if (e.message === "RATE_LIMIT_EXCEEDED") rateLimitHit = true;
        console.warn("getstatistic.jsp fetch warning:", e);
      }
    }

    // 4. Fetch System Info
    if (!state.systemInfo || manual) {
      await utils.delay(1500);
      try {
        const sysRaw = await api.fetchPVOutput("getsystem.jsp");
        if (sysRaw) {
          state.systemInfo = api.parseSystemInfo(sysRaw);
          successCount++;
        }
      } catch (e) {
        if (e.message === "RATE_LIMIT_EXCEEDED") rateLimitHit = true;
        console.warn("getsystem.jsp fetch warning:", e);
      }
    }

    // 5. Fetch Open-Meteo weather
    try {
      const lat = (state.systemInfo && state.systemInfo.latitude !== null) ? state.systemInfo.latitude : 52.52;
      const lng = (state.systemInfo && state.systemInfo.longitude !== null) ? state.systemInfo.longitude : 13.40;
      const weatherData = await api.fetchOpenMeteo(lat, lng);
      if (weatherData) {
        state.openMeteo = weatherData;
      }
    } catch (e) {
      console.warn("Open-Meteo fetch error in loadAllDashboardData:", e);
    }

    syncTodayOutputWithLiveStatus();
    ui.renderDashboardUI();

    if (rateLimitHit) {
      ui.updateBadge("connecting", i18n.get('statusApiLimit'));
      if (successCount === 0) {
        ui.showStatusBanner(i18n.get('statusApiLimitError'), "warning");
      } else {
        ui.showStatusBanner(i18n.get('statusApiLimitWarn'), "warning");
      }
    } else if (successCount > 0) {
      ui.updateBadge("connected", i18n.get('statusConnected'));
      ui.hideStatusBanner();
    } else {
      ui.updateBadge("disconnected", i18n.get('statusDisconnected'));
      ui.showStatusBanner(i18n.get('statusNoData'), "error");
    }

  } catch (err) {
    console.error("PVOutput Fetch Error:", err);
    ui.renderDashboardUI();
    if (err.message === "RATE_LIMIT_EXCEEDED") {
      ui.updateBadge("connecting", i18n.get('statusApiLimit'));
      ui.showStatusBanner(i18n.get('statusApiLimitError'), "warning");
    } else {
      ui.updateBadge("disconnected", i18n.get('statusDisconnected'));
      ui.showStatusBanner(i18n.get('statusCorsError'), "error");
    }
  } finally {
    state.isFetching = false;
  }
}

// Initialize Application
document.addEventListener("DOMContentLoaded", async () => {
  await i18n.loadLanguageConfig();
  const initialCreds = resolveCredentials();
  state.systemId = initialCreds.systemId;
  state.apiKey = initialCreds.apiKey;
  state.proxyUrl = initialCreds.proxyUrl;

  await loadSecretsJson();
  initUI();
  setupEventListeners();
  ui.renderDashboardUI();
  loadAllDashboardData();
  startAutoRefresh();
});
