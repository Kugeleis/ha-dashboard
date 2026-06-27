import { createVarcoConsumerClient } from "https://esm.sh/@varco/client@0.6.0";

// Define the exact Lovelace manifest for permissions request
const manifest = {
  "name": "M75 / Home",
  "version": "0.1.0",
  "read_entities": [
    "sensor.co2_signal_co2_intensity",
    "sensor.co2_signal_grid_fossil_fuel_percentage",
    "sensor.m75_solarertrag_jahrlich",
    "sensor.m75_solarertrag_monatlich",
    "sensor.m75_solarertrag_taglich",
    "sensor.m75_solarertrag_wochentlich",
    "sensor.power_production_now_2",
    "sensor.smartmeter_energy_power_curr",
    "sensor.solar_share",
    "sensor.solaranlage_energy_power_2",
    "sensor.waste_collection_schedule_abfallkalender",
    "weather.forecast_m75"
  ],
  "subscriptions": [
    "sensor.co2_signal_co2_intensity",
    "sensor.co2_signal_grid_fossil_fuel_percentage",
    "sensor.m75_solarertrag_jahrlich",
    "sensor.m75_solarertrag_monatlich",
    "sensor.m75_solarertrag_taglich",
    "sensor.m75_solarertrag_wochentlich",
    "sensor.power_production_now_2",
    "sensor.smartmeter_energy_power_curr",
    "sensor.solar_share",
    "sensor.solaranlage_energy_power_2",
    "sensor.waste_collection_schedule_abfallkalender",
    "weather.forecast_m75"
  ],
  "history": [
    "sensor.power_production_now_2",
    "sensor.smartmeter_energy_power_curr",
    "sensor.solaranlage_energy_power_2"
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
        "entities": ["sensor.solar_share", "sensor.solaranlage_energy_power_2"]
      },
      {
        "type": "entities",
        "title": "CO2 signal",
        "entities": ["sensor.co2_signal_co2_intensity", "sensor.co2_signal_grid_fossil_fuel_percentage"]
      },
      {
        "type": "history-graph",
        "title": "Solaranlage",
        "entities": ["sensor.power_production_now_2", "sensor.solaranlage_energy_power_2"]
      },
      {
        "type": "history-graph",
        "title": "Energiebezug",
        "entities": ["sensor.smartmeter_energy_power_curr", "sensor.solaranlage_energy_power_2"]
      },
      {
        "type": "weather-forecast",
        "title": "Weather forecast",
        "entities": ["weather.forecast_m75"]
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
        "title": "Stadtreinigung",
        "entities": ["sensor.waste_collection_schedule_abfallkalender"]
      }
    ]
  }
};

const AUTHORITY_ID = "SFxZ6jlLjm44y4usVeKWWZ8avrh_xWeFe28o9RGlZaw";
const BRIDGE_URL = "wss://varco-bridge.andreabaccega.com";

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
    // Use simulated mock data if connection fails, so user has a working demo
    loadMockData();
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

// Translate English Waste Collection strings to German (just in case)
function translateWasteState(stateStr) {
  if (!stateStr) return "Keine Abholung geplant";
  return stateStr
    .replace(/tomorrow/gi, "morgen")
    .replace(/today/gi, "heute")
    .replace(/in (\d+) days/gi, "in $1 Tagen")
    .replace(/in 1 day/gi, "in 1 Tag");
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

  // 4. Waste Collection
  const waste = stateCache["sensor.waste_collection_schedule_abfallkalender"];
  if (waste) {
    const stateStr = waste.state || "Keine Abholung geplant";
    const germanStateStr = translateWasteState(stateStr);
    document.getElementById("waste-val").textContent = germanStateStr;
    
    const lowerStr = stateStr.toLowerCase();
    const isSoon = lowerStr.includes("today") || lowerStr.includes("heute") || lowerStr.includes("tomorrow") || lowerStr.includes("morgen") || lowerStr.includes("in 1 tag") || lowerStr.includes("in 2 tag") || lowerStr.includes("in 3 tag") || lowerStr.includes("in 1 day") || lowerStr.includes("in 2 days") || lowerStr.includes("in 3 days");
    const wasteCard = document.getElementById("card-waste");
    
    if (isSoon) {
      wasteCard.classList.add("waste-alert");
    } else {
      wasteCard.classList.remove("waste-alert");
    }
  }

  // 5. Yield Stats
  const yieldDaily = stateCache["sensor.m75_solarertrag_taglich"];
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

async function refreshHistoryData() {
  if (!client) return;
  
  try {
    const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const historyData = await client.queryHistory(manifest.history, { start_time: startTime });
    
    console.log("History Data:", historyData);
    
    if (historyData) {
      solarHistory = parseHistorySeries(historyData["sensor.solaranlage_energy_power_2"]);
      forecastHistory = parseHistorySeries(historyData["sensor.power_production_now_2"]);
      gridHistory = parseHistorySeries(historyData["sensor.smartmeter_energy_power_curr"]);
      
      drawSolarChart();
      drawGridChart();
    }
  } catch (error) {
    console.error("Failed to fetch history:", error);
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

  const dataActual = solarHistory.length > 0 ? solarHistory : getMockHistory("actual");
  const dataForecast = forecastHistory.length > 0 ? forecastHistory : getMockHistory("forecast");
  
  const w = svg.clientWidth || 500;
  const h = 220;
  
  const padLeft = 45;
  const padRight = 20;
  const padTop = 30;
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

  const dataGrid = gridHistory.length > 0 ? gridHistory : getMockHistory("grid");
  const dataSolar = solarHistory.length > 0 ? solarHistory : getMockHistory("actual");
  
  const w = svg.clientWidth || 500;
  const h = 220;
  
  const padLeft = 45;
  const padRight = 20;
  const padTop = 30;
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

// Beautiful Simulated Data for Demo and Offline modes
function loadMockData() {
  console.log("Lade simulierte Demodaten für die Anzeige...");
  
  // Set current states
  stateCache["sensor.solar_share"] = { state: "78" };
  stateCache["sensor.solaranlage_energy_power_2"] = { state: "1350" };
  stateCache["weather.forecast_m75"] = {
    state: "partlycloudy",
    attributes: { temperature: 31.4, humidity: 42 }
  };
  stateCache["sensor.co2_signal_co2_intensity"] = { state: "185.2" };
  stateCache["sensor.co2_signal_grid_fossil_fuel_percentage"] = { state: "15.4" };
  stateCache["sensor.waste_collection_schedule_abfallkalender"] = { state: "Bioabfall morgen" };
  stateCache["sensor.m75_solarertrag_taglich"] = { state: "6.82" };
  stateCache["sensor.m75_solarertrag_wochentlich"] = { state: "48.15" };
  stateCache["sensor.m75_solarertrag_monatlich"] = { state: "192.40" };
  stateCache["sensor.m75_solarertrag_jahrlich"] = { state: "2480.12" };
  
  updateDashboardUI();
  
  // Render mock charts
  drawSolarChart();
  drawGridChart();
}

function getMockHistory(type) {
  const points = 24; // 24 hourly points
  const list = [];
  const now = Date.now();
  
  for (let i = points; i >= 0; i--) {
    const time = now - i * 60 * 60 * 1000;
    const hour = new Date(time).getHours();
    
    let val = 0;
    if (type === "actual") {
      if (hour >= 6 && hour <= 18) {
        val = 1500 * Math.sin(Math.PI * (hour - 6) / 12) + (Math.random() - 0.5) * 150;
      }
    } else if (type === "forecast") {
      if (hour >= 6 && hour <= 18) {
        val = 1420 * Math.sin(Math.PI * (hour - 6) / 12);
      }
    } else if (type === "grid") {
      const baseLoad = 800 + (Math.random() - 0.5) * 200;
      const cookingPeak = (hour >= 7 && hour <= 9) || (hour >= 18 && hour <= 20) ? 1200 : 0;
      const solarOffset = (hour >= 8 && hour <= 17) ? 800 * Math.sin(Math.PI * (hour - 8) / 9) : 0;
      val = baseLoad + cookingPeak - solarOffset;
    }
    
    list.push({ time, val: Math.max(-500, Math.round(val)) });
  }
  return list;
}

// Start application
init();
