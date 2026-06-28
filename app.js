import { createVarcoConsumerClient, consumerIdentityFromPrivateKey } from "https://esm.sh/@varco/client@0.6.0";

// Define the exact Lovelace manifest for permissions request
const manifest = {
  "name": "M75 / Home",
  "version": "0.1.0",
  "read_entities": [
    "sensor.altpapier_9449",
    "sensor.bio_9449",
    "sensor.co2_signal_co2_intensity",
    "sensor.co2_signal_grid_fossil_fuel_percentage",
    "sensor.gelbe_tonne_9449",
    "sensor.m75_solarertrag_jahrlich",
    "sensor.m75_solarertrag_monatlich",
    "sensor.m75_solarertrag_taglich",
    "sensor.m75_solarertrag_wochentlich",
    "sensor.power_production_now_2",
    "sensor.restabfall_9449",
    "sensor.smartmeter_energy_power_curr",
    "sensor.solar_share",
    "sensor.solaranlage_energy_power_2",
    "sensor.solaranlage_energy_today_2",
    "weather.forecast_m75"
  ],
  "subscriptions": [
    "sensor.altpapier_9449",
    "sensor.bio_9449",
    "sensor.co2_signal_co2_intensity",
    "sensor.co2_signal_grid_fossil_fuel_percentage",
    "sensor.gelbe_tonne_9449",
    "sensor.m75_solarertrag_jahrlich",
    "sensor.m75_solarertrag_monatlich",
    "sensor.m75_solarertrag_taglich",
    "sensor.m75_solarertrag_wochentlich",
    "sensor.power_production_now_2",
    "sensor.restabfall_9449",
    "sensor.smartmeter_energy_power_curr",
    "sensor.solar_share",
    "sensor.solaranlage_energy_power_2",
    "sensor.solaranlage_energy_today_2",
    "weather.forecast_m75"
  ],
  "history": [
    "sensor.power_production_now_2",
    "sensor.smartmeter_energy_power_curr",
    "sensor.solaranlage_energy_power_2",
    "sensor.solaranlage_energy_today_2"
  ],
  "camera_snapshots": [],
  "actions": [],
  "dashboard": {
    "title": "M75",
    "url_path": "dashboard-m75",
    "view_title": "Home",
    "cards": [
      {
        "type": "vertical-stack",
        "title": "Vertical stack",
        "entities": [
          "sensor.solar_share",
          "sensor.solaranlage_energy_power_2"
        ]
      },
      {
        "type": "entities",
        "title": "CO2 signal",
        "entities": [
          "sensor.co2_signal_co2_intensity",
          "sensor.co2_signal_grid_fossil_fuel_percentage"
        ]
      },
      {
        "type": "history-graph",
        "title": "Solaranlage",
        "entities": [
          "sensor.power_production_now_2",
          "sensor.solaranlage_energy_power_2"
        ]
      },
      {
        "type": "history-graph",
        "title": "Energiebezug",
        "entities": [
          "sensor.smartmeter_energy_power_curr",
          "sensor.solaranlage_energy_power_2"
        ]
      },
      {
        "type": "weather-forecast",
        "title": "Weather forecast",
        "entities": [
          "weather.forecast_m75"
        ]
      },
      {
        "type": "entities",
        "title": "Entities",
        "entities": [
          "sensor.m75_solarertrag_jahrlich",
          "sensor.m75_solarertrag_monatlich",
          "sensor.m75_solarertrag_taglich",
          "sensor.m75_solarertrag_wochentlich"
        ]
      },
      {
        "type": "entities",
        "title": "🗑️ Abfallkalender M75",
        "entities": [
          "sensor.altpapier_9449",
          "sensor.bio_9449",
          "sensor.gelbe_tonne_9449",
          "sensor.restabfall_9449"
        ]
      },
      {
        "type": "statistics-graph",
        "title": "Statistics graph",
        "entities": [
          "sensor.solaranlage_energy_today_2"
        ]
      }
    ]
  }
};

const AUTHORITY_ID = "SFxZ6jlLjm44y4usVeKWWZ8avrh_xWeFe28o9RGlZaw";
const BRIDGE_URL = "wss://varco-bridge.andreabaccega.com";

// Hardcoded private key for public access without pairing
const PUBLIC_DASHBOARD_PRIVATE_KEY = "7993bf7850190169a9a8ac7b29dc24764444bae4bb2342018b01121bfa2b87be";
const sharedIdentity = consumerIdentityFromPrivateKey(PUBLIC_DASHBOARD_PRIVATE_KEY);

// State cache for entities
const stateCache = {};
let client = null;

// DOM Elements
const connPill = document.getElementById("conn-pill");
const reconnectBtn = document.getElementById("reconnect-btn");
const pairingSection = document.getElementById("pairing-section");
const pairingCodeEl = document.getElementById("pairing-code");
const dashboardGrid = document.getElementById("dashboard-grid");

// Weather Translation lookup table
const weatherTranslations = {
  "sunny": "Sonnig",
  "clear-night": "Klare Nacht",
  "partlycloudy": "Leicht bewölkt",
  "cloudy": "Bewölkt",
  "rainy": "Regnerisch",
  "pouring": "Starker Regen",
  "snowy": "Schneefall",
  "fog": "Nebel",
  "windy": "Windig",
  "unknown": "Unbekannt"
};

// Initialize application
async function init() {
  setupListeners();
  
  // Try to pair and connect
  try {
    updateConnectionStatus({ mode: "connecting", detail: "Verbindung wird initialisiert..." });
    
    client = createVarcoConsumerClient({
      authorityId: AUTHORITY_ID,
      bridgeUrl: BRIDGE_URL,
      manifest,
      identity: sharedIdentity,
      reconnect: true,
      onTransportStatus: (status) => {
        console.log("Varco Status Update:", status);
        updateConnectionStatus(status);
      }
    });

    // Request Access (triggers pairing code generation if not already approved)
    const access = await client.requestAccess();
    console.log("Access Request:", access);
    
    if (access.status === "approved") {
      hidePairing();
    } else {
      showPairing(access.pairing_code);
    }

    // Connect to the bridge
    await client.connect();
    hidePairing();
    
    // Subscribe to entities
    subscribeToData();
    
    // Fetch and draw history charts
    refreshHistoryData();
    
    // Refresh history every 5 minutes
    setInterval(refreshHistoryData, 5 * 60 * 1000);
    
  } catch (error) {
    console.error("Connection failed:", error);
    updateConnectionStatus({ mode: "disconnected", detail: error.message });
  }
}

function setupListeners() {
  reconnectBtn.addEventListener("click", async () => {
    if (client) {
      try {
        updateConnectionStatus({ mode: "connecting", detail: "Verbindung wird neu aufgebaut..." });
        await client.close();
      } catch (e) {}
    }
    init();
  });
  
  // Redraw charts on resize to keep SVG responsive
  window.addEventListener("resize", () => {
    drawSolarChart();
    drawGridChart();
    drawSolarYield10DaysChart();
  });
}

function updateConnectionStatus(status) {
  connPill.className = "badge";
  
  if (status.mode === "connected" || status.mode === "p2p") {
    connPill.classList.add("badge-connected");
    connPill.textContent = status.mode === "p2p" ? "Verbunden (P2P)" : "Verbunden (Relay)";
  } else if (status.mode === "connecting" || status.detail?.includes("connecting") || status.detail?.includes("initialisiert") || status.detail?.includes("neu aufgebaut")) {
    connPill.classList.add("badge-connecting");
    connPill.textContent = "Verbinde...";
  } else {
    connPill.classList.add("badge-disconnected");
    connPill.textContent = "Nicht verbunden";
  }
  
  if (status.detail) {
    connPill.title = status.detail;
  }
}

function showPairing(code) {
  pairingSection.style.display = "block";
  pairingCodeEl.textContent = formatPairingCode(code);
}

function hidePairing() {
  pairingSection.style.display = "none";
}

function formatPairingCode(code) {
  if (!code) return "--- - ---";
  if (code.length === 6) {
    return `${code.slice(0, 3)} - ${code.slice(3)}`;
  }
  return code;
}

// Subscriptions
let currentSubscriptionId = null;
async function subscribeToData() {
  if (!client) return;
  
  try {
    if (currentSubscriptionId) {
      await client.unsubscribe(currentSubscriptionId);
    }
    
    currentSubscriptionId = await client.subscribeEntities(manifest.subscriptions, (msg) => {
      console.log("Subscription payload:", msg);
      if (msg && msg.states) {
        Object.assign(stateCache, msg.states);
        updateDashboardUI();
      }
    });
  } catch (error) {
    console.error("Subscription failed:", error);
  }
}

// Parse and format waste collection state values (numbers or ISO dates or relative strings) to German
function formatWasteDays(stateVal) {
  if (stateVal === undefined || stateVal === null) return "--";
  
  const stateStr = String(stateVal).trim();
  if (stateStr === "" || stateStr.toLowerCase() === "unknown") return "--";
  
  // Try to parse as integer (number of days)
  const daysNum = parseInt(stateStr, 10);
  if (!Number.isNaN(daysNum) && String(daysNum) === stateStr) {
    if (daysNum === 0) return "Heute";
    if (daysNum === 1) return "Morgen";
    if (daysNum === 2) return "Übermorgen";
    return `in ${daysNum} Tagen`;
  }
  
  // Try to parse as ISO Date (e.g. YYYY-MM-DD)
  if (/^\d{4}-\d{2}-\d{2}$/.test(stateStr)) {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const targetDate = new Date(stateStr);
      targetDate.setHours(0, 0, 0, 0);
      const diffTime = targetDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 0) return "Heute";
      if (diffDays === 1) return "Morgen";
      if (diffDays === 2) return "Übermorgen";
      if (diffDays > 2) return `in ${diffDays} Tagen`;
      if (diffDays < 0) return "Vorüber";
    } catch (e) {}
  }
  
  // Try parsing English/German strings
  const lowerStr = stateStr.toLowerCase();
  if (lowerStr === "today" || lowerStr === "heute") return "Heute";
  if (lowerStr === "tomorrow" || lowerStr === "morgen") return "Morgen";
  const daysMatch = lowerStr.match(/in (\d+) days?/i) || lowerStr.match(/in (\d+) tagen?/i);
  if (daysMatch) {
    const days = parseInt(daysMatch[1], 10);
    if (days === 1) return "Morgen";
    if (days === 2) return "Übermorgen";
    return `in ${days} Tagen`;
  }
  
  return stateStr;
}

// Update UI Widgets
function updateDashboardUI() {
  // 1. Solar share & Solaranlage Power
  const solarShare = stateCache["sensor.solar_share"];
  const solarPower = stateCache["sensor.solaranlage_energy_power_2"];
  
  if (solarShare) {
    const val = Math.round(parseFloat(solarShare.state) || 0);
    const gauge = document.getElementById("solar-share-gauge");
    const label = document.getElementById("solar-share-val");
    if (gauge && label) {
      gauge.style.setProperty("--val", val);
      label.textContent = `${val}%`;
    }
  }
  if (solarPower) {
    const val = Math.round(parseFloat(solarPower.state) || 0);
    const label = document.getElementById("solar-power-val");
    if (label) label.textContent = val;
  }

  // 2. Weather Card
  const weather = stateCache["weather.forecast_m75"];
  if (weather) {
    const temp = parseFloat(weather.attributes.temperature || weather.state) || 0;
    const humidity = weather.attributes.humidity || 0;
    const condition = weather.state || "unknown";
    
    const translatedCondition = weatherTranslations[condition.toLowerCase()] || condition;
    
    document.getElementById("weather-temp").textContent = temp.toFixed(1);
    document.getElementById("weather-humidity").textContent = `${humidity}%`;
    document.getElementById("weather-condition").textContent = translatedCondition;
    document.getElementById("weather-state").textContent = translatedCondition;
    
    // Map condition to emoji
    const weatherIcons = {
      "sunny": "☀️",
      "clear-night": "🌙",
      "partlycloudy": "⛅",
      "cloudy": "☁️",
      "rainy": "🌧",
      "pouring": "⛈",
      "snowy": "❄️",
      "fog": "🌫",
      "windy": "💨"
    };
    document.getElementById("weather-icon").textContent = weatherIcons[condition.toLowerCase()] || "⛅";
  }

  // 3. Carbon Signal
  const co2Intensity = stateCache["sensor.co2_signal_co2_intensity"];
  const fossilPercent = stateCache["sensor.co2_signal_grid_fossil_fuel_percentage"];
  
  if (co2Intensity) {
    const intensity = parseFloat(co2Intensity.state) || 0;
    document.getElementById("co2-intensity-val").textContent = Math.round(intensity);
    
    const carbonBar = document.getElementById("carbon-bar");
    const carbonRating = document.getElementById("co2-rating-val");
    
    const pct = Math.min(100, Math.max(5, (intensity / 500) * 100));
    if (carbonBar) carbonBar.style.width = `${pct}%`;
    
    let rating = "Niedrig";
    if (intensity > 250) {
      rating = "Hoch";
      if (carbonBar) carbonBar.style.background = "linear-gradient(to right, #10b981, #f59e0b, #ef4444)";
    } else if (intensity > 150) {
      rating = "Mittel";
      if (carbonBar) carbonBar.style.background = "linear-gradient(to right, #10b981, #f59e0b)";
    } else {
      rating = "Niedrig";
      if (carbonBar) carbonBar.style.background = "#10b981";
    }
    if (carbonRating) carbonRating.textContent = rating;
  }
  
  if (fossilPercent) {
    const pct = parseFloat(fossilPercent.state) || 0;
    document.getElementById("co2-fossil-val").textContent = `${pct.toFixed(1)}%`;
  }

  // 4. Waste Collection (Individual Sensors)
  const bins = [
    { id: "altpapier", entity: "sensor.altpapier_9449" },
    { id: "bio", entity: "sensor.bio_9449" },
    { id: "gelbe-tonne", entity: "sensor.gelbe_tonne_9449" },
    { id: "restabfall", entity: "sensor.restabfall_9449" }
  ];
  
  bins.forEach(bin => {
    const sensor = stateCache[bin.entity];
    const itemEl = document.getElementById(`waste-${bin.id}`);
    const valEl = document.getElementById(`waste-${bin.id}-val`);
    
    if (sensor && valEl && itemEl) {
      const parsedVal = formatWasteDays(sensor.state);
      valEl.textContent = parsedVal;
      
      const lowerVal = parsedVal.toLowerCase();
      const isDue = lowerVal === "heute" || lowerVal === "morgen" || lowerVal === "übermorgen" || lowerVal.includes("in 1 tag") || lowerVal.includes("in 2 tag");
      if (isDue) {
        itemEl.classList.add("waste-due");
      } else {
        itemEl.classList.remove("waste-due");
      }
    }
  });

  // 5. Yield Stats
  const yieldDaily = stateCache["sensor.solaranlage_energy_today_2"] || stateCache["sensor.m75_solarertrag_taglich"];
  const yieldWeekly = stateCache["sensor.m75_solarertrag_wochentlich"];
  const yieldMonthly = stateCache["sensor.m75_solarertrag_monatlich"];
  const yieldYearly = stateCache["sensor.m75_solarertrag_jahrlich"];
  
  if (yieldDaily) document.getElementById("yield-daily").textContent = `${parseFloat(yieldDaily.state).toFixed(2)} kWh`;
  if (yieldWeekly) document.getElementById("yield-weekly").textContent = `${parseFloat(yieldWeekly.state).toFixed(2)} kWh`;
  if (yieldMonthly) document.getElementById("yield-monthly").textContent = `${parseFloat(yieldMonthly.state).toFixed(2)} kWh`;
  if (yieldYearly) document.getElementById("yield-yearly").textContent = `${parseFloat(yieldYearly.state).toFixed(2)} kWh`;
}

// History Handling
let solarHistory = [];
let forecastHistory = [];
let gridHistory = [];
let solarYield10DaysHistory = [];

async function refreshHistoryData() {
  if (!client) return;
  
  try {
    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const entities24h = [
      "sensor.solaranlage_energy_power_2",
      "sensor.power_production_now_2",
      "sensor.smartmeter_energy_power_curr"
    ];
    const historyData = await client.queryHistory(entities24h, { start_time: startTime });
    
    console.log("History Data (24h):", historyData);
    
    if (historyData) {
      solarHistory = parseHistorySeries(historyData["sensor.solaranlage_energy_power_2"]);
      forecastHistory = parseHistorySeries(historyData["sensor.power_production_now_2"]);
      gridHistory = parseHistorySeries(historyData["sensor.smartmeter_energy_power_curr"]);
      
      drawSolarChart();
      drawGridChart();
    }
  } catch (error) {
    console.error("Failed to fetch 24h history:", error);
  }

  try {
    const startTime10Days = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString();
    const historyData10Days = await client.queryHistory(["sensor.solaranlage_energy_today_2"], { start_time: startTime10Days });
    
    console.log("History Data (10 Days):", historyData10Days);
    
    if (historyData10Days && historyData10Days["sensor.solaranlage_energy_today_2"]) {
      solarYield10DaysHistory = parseHistorySeries(historyData10Days["sensor.solaranlage_energy_today_2"]);
      drawSolarYield10DaysChart();
    }
  } catch (error) {
    console.error("Failed to fetch 10-day history:", error);
  }
}

function parseHistorySeries(rawSeries) {
  if (!rawSeries || !Array.isArray(rawSeries)) return [];
  
  return rawSeries.map(item => {
    let time = 0;
    if (item.last_changed) time = Date.parse(item.last_changed);
    else if (item.lu) time = item.lu * 1000;
    else if (item.last_updated) time = Date.parse(item.last_updated);
    
    let val = 0;
    if (item.state !== undefined && item.state !== null) val = parseFloat(item.state);
    else if (item.s !== undefined) val = parseFloat(item.s);
    
    return { time, val: Number.isNaN(val) ? 0 : val };
  }).filter(item => !Number.isNaN(item.time) && item.time > 0);
}

// Chart Drawers (SVG path builder)
function drawSolarChart() {
  const svg = document.getElementById("solar-history-svg");
  const forecastPath = document.getElementById("chart-solar-forecast-path");
  const actualPath = document.getElementById("chart-solar-actual-path");
  if (!svg || !forecastPath || !actualPath) return;

  const dataActual = solarHistory;
  const dataForecast = forecastHistory;
  
  const w = 500;
  const h = 220;
  
  const padLeft = 55;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 50;
  
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;
  
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  
  const maxActual = Math.max(...dataActual.map(d => d.val), 0);
  const maxForecast = Math.max(...dataForecast.map(d => d.val), 0);
  const maxVal = Math.max(1000, maxActual, maxForecast) * 1.1;
  
  forecastPath.setAttribute("d", buildSVGPath(dataForecast, oneDayAgo, now, maxVal, padLeft, chartW, padTop, chartH));
  actualPath.setAttribute("d", buildSVGPath(dataActual, oneDayAgo, now, maxVal, padLeft, chartW, padTop, chartH));
  
  const maxKW = (maxVal / 1000).toFixed(1);
  const midKW = (maxVal / 2000).toFixed(1);
  
  svg.querySelectorAll(".y-label")[0].textContent = `${maxKW}kW`;
  svg.querySelectorAll(".y-label")[1].textContent = `${midKW}kW`;
}

function drawGridChart() {
  const svg = document.getElementById("grid-history-svg");
  const gridPath = document.getElementById("chart-smartmeter-path");
  const solarComparePath = document.getElementById("chart-solar-compare-path");
  if (!svg || !gridPath || !solarComparePath) return;

  const dataGrid = gridHistory;
  const dataSolar = solarHistory;
  
  const w = 500;
  const h = 220;
  
  const padLeft = 55;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 50;
  
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;
  
  const now = Date.now();
  const oneDayAgo = now - 24 * 60 * 60 * 1000;
  
  const valsGrid = dataGrid.map(d => d.val);
  const valsSolar = dataSolar.map(d => d.val);
  const maxVal = Math.max(2000, ...valsGrid, ...valsSolar) * 1.1;
  const minVal = Math.min(0, ...valsGrid);
  
  gridPath.setAttribute("d", buildSVGPathRange(dataGrid, oneDayAgo, now, minVal, maxVal, padLeft, chartW, padTop, chartH));
  solarComparePath.setAttribute("d", buildSVGPathRange(dataSolar, oneDayAgo, now, minVal, maxVal, padLeft, chartW, padTop, chartH));
  
  const maxKW = (maxVal / 1000).toFixed(1);
  const midKW = ((maxVal + minVal) / 2000).toFixed(1);
  const minKW = (minVal / 1000).toFixed(1);
  
  svg.querySelectorAll(".y-label")[0].textContent = `${maxKW}kW`;
  svg.querySelectorAll(".y-label")[1].textContent = `${midKW}kW`;
  svg.querySelectorAll(".y-label")[2].textContent = `${minKW}kW`;
}

// Build SVG line path string for [0, maxVal]
function buildSVGPath(data, minTime, maxTime, maxVal, xOffset, width, yOffset, height) {
  if (data.length === 0) return "";
  
  const sorted = [...data].sort((a, b) => a.time - b.time);
  
  let path = "";
  for (let i = 0; i < sorted.length; i++) {
    const point = sorted[i];
    
    const timeDelta = maxTime - minTime;
    const xPct = timeDelta > 0 ? (point.time - minTime) / timeDelta : 0;
    const x = xOffset + xPct * width;
    
    const yPct = maxVal > 0 ? point.val / maxVal : 0;
    const y = yOffset + height - yPct * height;
    
    const clampedX = Math.max(xOffset, Math.min(xOffset + width, x));
    const clampedY = Math.max(yOffset, Math.min(yOffset + height, y));
    
    if (i === 0) {
      path += `M ${clampedX.toFixed(1)} ${clampedY.toFixed(1)}`;
    } else {
      path += ` L ${clampedX.toFixed(1)} ${clampedY.toFixed(1)}`;
    }
  }
  return path;
}

// Build SVG line path for ranges [minVal, maxVal] (supporting negative values)
function buildSVGPathRange(data, minTime, maxTime, minVal, maxVal, xOffset, width, yOffset, height) {
  if (data.length === 0) return "";
  
  const sorted = [...data].sort((a, b) => a.time - b.time);
  const valRange = maxVal - minVal;
  
  let path = "";
  for (let i = 0; i < sorted.length; i++) {
    const point = sorted[i];
    
    const timeDelta = maxTime - minTime;
    const xPct = timeDelta > 0 ? (point.time - minTime) / timeDelta : 0;
    const x = xOffset + xPct * width;
    
    const yPct = valRange > 0 ? (point.val - minVal) / valRange : 0;
    const y = yOffset + height - yPct * height;
    
    const clampedX = Math.max(xOffset, Math.min(xOffset + width, x));
    const clampedY = Math.max(yOffset, Math.min(yOffset + height, y));
    
    if (i === 0) {
      path += `M ${clampedX.toFixed(1)} ${clampedY.toFixed(1)}`;
    } else {
      path += ` L ${clampedX.toFixed(1)} ${clampedY.toFixed(1)}`;
    }
  }
  return path;
}

// Get daily yield values (max - min) over the last 10 days to support lifetime accumulator sensors
function getDailyYieldValues(series) {
  const dailyStats = {};
  
  // Initialize last 10 days using calendar date offset
  const now = new Date();
  const dayStrings = [];
  for (let i = 9; i >= 0; i--) {
    const d = new Date();
    d.setDate(now.getDate() - i);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    dailyStats[key] = { min: Infinity, max: -Infinity };
    dayStrings.push(key);
  }
  
  // Find minimum and maximum values on each day
  for (const point of series) {
    const d = new Date(point.time);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    const key = `${yyyy}-${mm}-${dd}`;
    if (key in dailyStats) {
      if (point.val < dailyStats[key].min) {
        dailyStats[key].min = point.val;
      }
      if (point.val > dailyStats[key].max) {
        dailyStats[key].max = point.val;
      }
    }
  }
  
  // Calculate yield (max - min) and convert to array of { day: string, label: string, val: number }
  const weekdays = ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"];
  return dayStrings.map(key => {
    const [yyyy, mm, dd] = key.split('-');
    const dateObj = new Date(parseInt(yyyy), parseInt(mm) - 1, parseInt(dd));
    const label = `${dd}.${mm}.`;
    const weekday = weekdays[dateObj.getDay()];

    // Calculate the yield for the day. If min or max is untouched, yield is 0.
    const stats = dailyStats[key];
    let dailyYield = 0;
    if (stats.min !== Infinity && stats.max !== -Infinity) {
      dailyYield = stats.max - stats.min;
      // Safeguard against reset bugs or weird data where max < min
      if (dailyYield < 0) dailyYield = 0;
    }

    return {
      day: key,
      shortLabel: label,
      weekday,
      val: dailyYield
    };
  });
}

function drawSolarYield10DaysChart() {
  const svg = document.getElementById("solar-yield-10days-svg");
  const barsGroup = document.getElementById("bars-group");
  const labelsGroup = document.getElementById("labels-group");
  if (!svg || !barsGroup || !labelsGroup) return;

  const dataYield = solarYield10DaysHistory;
  const dailyData = getDailyYieldValues(dataYield);

  const w = 500;
  const h = 220;
  
  const padLeft = 55;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 50;
  
  const chartW = w - padLeft - padRight;
  const chartH = h - padTop - padBottom;

  const maxVal = Math.max(...dailyData.map(d => d.val), 1) * 1.1;

  barsGroup.innerHTML = "";
  labelsGroup.innerHTML = "";

  const slotWidth = chartW / 10;
  const barWidth = slotWidth * 0.65;
  const barGap = slotWidth * 0.35;

  for (let i = 0; i < dailyData.length; i++) {
    const d = dailyData[i];
    const x = padLeft + i * slotWidth + barGap / 2;
    const yPct = maxVal > 0 ? d.val / maxVal : 0;
    const barHeight = yPct * chartH;
    const y = padTop + chartH - barHeight;
    
    // Create rect for bar
    const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    rect.setAttribute("x", x.toFixed(1));
    rect.setAttribute("y", y.toFixed(1));
    rect.setAttribute("width", barWidth.toFixed(1));
    rect.setAttribute("height", Math.max(2, barHeight).toFixed(1));
    rect.setAttribute("rx", 4);
    rect.setAttribute("fill", "url(#solar-yield-gradient)");
    rect.setAttribute("class", "chart-bar");
    
    // Tooltip
    const title = document.createElementNS("http://www.w3.org/2000/svg", "title");
    title.textContent = `${d.weekday} ${d.shortLabel}: ${d.val.toFixed(2)} kWh`;
    rect.appendChild(title);
    
    barsGroup.appendChild(rect);
    
    // Create value label on top
    if (d.val > 0) {
      const valText = document.createElementNS("http://www.w3.org/2000/svg", "text");
      valText.setAttribute("x", (x + barWidth / 2).toFixed(1));
      valText.setAttribute("y", (y - 6).toFixed(1));
      valText.setAttribute("class", "chart-label value-label");
      valText.setAttribute("text-anchor", "middle");
      valText.textContent = d.val.toFixed(1);
      labelsGroup.appendChild(valText);
    }
    
    // Create X-axis label (weekday)
    const weekdayText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    weekdayText.setAttribute("x", (x + barWidth / 2).toFixed(1));
    weekdayText.setAttribute("y", 192);
    weekdayText.setAttribute("class", "chart-label x-label");
    weekdayText.setAttribute("text-anchor", "middle");
    weekdayText.textContent = d.weekday;
    labelsGroup.appendChild(weekdayText);
    
    // Create X-axis label (date)
    const dateText = document.createElementNS("http://www.w3.org/2000/svg", "text");
    dateText.setAttribute("x", (x + barWidth / 2).toFixed(1));
    dateText.setAttribute("y", 205);
    dateText.setAttribute("class", "chart-label x-label date-label");
    dateText.setAttribute("text-anchor", "middle");
    dateText.textContent = d.shortLabel;
    labelsGroup.appendChild(dateText);
  }

  // Update Y-axis labels
  const maxLabel = document.getElementById("yield-10days-y-max");
  const midLabel = document.getElementById("yield-10days-y-mid");
  if (maxLabel) maxLabel.textContent = `${maxVal.toFixed(1)} kWh`;
  if (midLabel) midLabel.textContent = `${(maxVal / 2).toFixed(1)} kWh`;
}

// Start application
init();
