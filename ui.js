import { formatGermanDate, formatEnergyDisplay, formatTodayYYYYMMDD } from './utils.js';

export class DashboardUI {
  constructor(state, elements, i18n, charts) {
    this.state = state;
    this.elements = elements;
    this.i18n = i18n;
    this.charts = charts;
  }

  updateBadge(mode, text) {
    this.elements.connPill.className = `badge badge-${mode}`;
    this.elements.connPill.textContent = text;
  }

  showStatusBanner(msg, type = "info") {
    this.elements.statusBanner.className = `status-banner status-${type}`;
    this.elements.statusBanner.style.display = "block";
    this.elements.statusBannerText.textContent = msg;
  }

  hideStatusBanner() {
    this.elements.statusBanner.style.display = "none";
  }

  updateSunArc() {
    const container = document.getElementById("sun-arc-container");
    const progressPath = document.getElementById("sun-arc-progress");
    const sunGroup = document.getElementById("sun-pointer");
    if (!container || !progressPath || !sunGroup) return;

    if (!window.SunCalc) {
      container.style.display = "none";
      return;
    }

    const lat = (this.state.systemInfo && this.state.systemInfo.latitude !== null) ? this.state.systemInfo.latitude : 52.52;
    const lng = (this.state.systemInfo && this.state.systemInfo.longitude !== null) ? this.state.systemInfo.longitude : 13.40;

    let now = new Date();
    if (this.state.liveStatus && this.state.liveStatus.date && this.state.liveStatus.time) {
      const y = parseInt(this.state.liveStatus.date.substring(0, 4), 10);
      const m = parseInt(this.state.liveStatus.date.substring(4, 6), 10) - 1;
      const d = parseInt(this.state.liveStatus.date.substring(6, 8), 10);
      const [hh, mm] = this.state.liveStatus.time.split(":").map(Number);
      now = new Date(y, m, d, hh, mm);
    }

    const times = window.SunCalc.getTimes(now, lat, lng);
    const sunrise = times.sunrise;
    const sunset = times.sunset;

    // Helper to format Date to HH:MM
    const formatTime = (dateObj) => {
      if (!dateObj || isNaN(dateObj.getTime())) return "--:--";
      const h = String(dateObj.getHours()).padStart(2, '0');
      const m = String(dateObj.getMinutes()).padStart(2, '0');
      return `${h}:${m}`;
    };

    const sunriseEl = document.getElementById("sun-arc-sunrise");
    const sunsetEl = document.getElementById("sun-arc-sunset");
    if (sunriseEl) sunriseEl.textContent = formatTime(sunrise);
    if (sunsetEl) sunsetEl.textContent = formatTime(sunset);

    container.style.display = "block";

    let progress = 0;
    if (now > sunset) {
      progress = 1;
    } else if (now > sunrise) {
      const totalDayTime = sunset.getTime() - sunrise.getTime();
      const elapsed = now.getTime() - sunrise.getTime();
      progress = Math.max(0, Math.min(1, elapsed / totalDayTime));
    }

    const arcLength = progressPath.getTotalLength ? progressPath.getTotalLength() : 321.3;
    progressPath.style.strokeDasharray = arcLength;
    progressPath.style.strokeDashoffset = arcLength - (arcLength * progress);

    let sunX, sunY;
    if (progressPath.getPointAtLength) {
      const point = progressPath.getPointAtLength(arcLength * progress);
      sunX = point.x;
      sunY = point.y;
    } else {
      // Fallback if getPointAtLength is not available
      const angleDeg = 180 - (progress * 180);
      const angleRad = angleDeg * (Math.PI / 180);
      sunX = 140 + 130 * Math.cos(angleRad);
      sunY = 80 - 70 * Math.sin(angleRad);
    }

    sunGroup.setAttribute("transform", `translate(${sunX}, ${sunY})`);
  }

  renderDashboardUI() {
    const todayStr = this.state.liveStatus ? this.state.liveStatus.date : formatTodayYYYYMMDD();
    let todayOutput = this.state.outputData.d.find(item => item.dateStr === todayStr);
    if (!todayOutput && this.state.outputData.d.length > 0) {
      todayOutput = this.state.outputData.d[this.state.outputData.d.length - 1];
    }

    const liveOrTodayWh = this.state.liveStatus ? Math.max(this.state.liveStatus.energyWh, todayOutput ? todayOutput.energyWh : 0) : (todayOutput ? todayOutput.energyWh : null);

    // 1. Update Live Card & Header
    if (this.state.liveStatus) {
      this.elements.livePowerVal.textContent = Math.round(this.state.liveStatus.powerW).toLocaleString("de-DE");
      this.elements.liveTodayKwh.textContent = formatEnergyDisplay(liveOrTodayWh);
      const dateFormatted = formatGermanDate(this.state.liveStatus.date);
      this.elements.liveTime.textContent = dateFormatted !== "--" ? `${this.i18n.get('liveTimeStand')} ${dateFormatted}, ${this.state.liveStatus.time} ${this.i18n.get('liveTimeUhr')}` : `${this.i18n.get('liveTimeStand')} ${this.state.liveStatus.time} ${this.i18n.get('liveTimeUhr')}`;
      this.elements.liveEfficiency.textContent = this.state.liveStatus.efficiency > 0 ? `${this.state.liveStatus.efficiency.toFixed(2)} kWh/kW` : "-- kWh/kW";

      if (this.state.openMeteo && this.state.openMeteo.temperature_2m !== undefined) {
        this.elements.liveTemp.textContent = `${this.state.openMeteo.temperature_2m.toFixed(1)} °C`;
      } else {
        this.elements.liveTemp.textContent = this.state.liveStatus.tempC !== null ? `${this.state.liveStatus.tempC.toFixed(1)} °C` : "-- °C";
      }
    } else {
      this.elements.livePowerVal.textContent = "--";
      this.elements.liveTodayKwh.textContent = "--";
      this.elements.liveTime.textContent = `${this.i18n.get('liveTimeStand')} --:-- ${this.i18n.get('liveTimeUhr')}`;
      this.elements.liveEfficiency.textContent = "-- kWh/kW";
      if (this.state.openMeteo && this.state.openMeteo.temperature_2m !== undefined) {
        this.elements.liveTemp.textContent = `${this.state.openMeteo.temperature_2m.toFixed(1)} °C`;
      } else {
        this.elements.liveTemp.textContent = "-- °C";
      }
    }

    // Today's Peak Power & Weather
    if (todayOutput) {
      this.elements.livePeakPower.textContent = todayOutput.peakPowerW ? `${todayOutput.peakPowerW} W` : "-- W";
      this.elements.livePeakTime.textContent = todayOutput.peakTime ? `${this.i18n.get('um')} ${todayOutput.peakTime} ${this.i18n.get('liveTimeUhr')}` : `--:-- ${this.i18n.get('liveTimeUhr')}`;
    } else {
      this.elements.livePeakPower.textContent = "-- W";
      this.elements.livePeakTime.textContent = `--:-- ${this.i18n.get('liveTimeUhr')}`;
    }

    const weatherIconEl = document.getElementById("live-condition-icon");
    if (this.state.openMeteo && this.state.openMeteo.weather_code !== undefined) {
      const code = this.state.openMeteo.weather_code;
      let weatherKey = "weatherUnknown";
      let icon = "❓";

      if (code === 0) { weatherKey = "weatherFine"; icon = "☀️"; }
      else if (code === 1) { weatherKey = "weatherPartlyCloudy"; icon = "🌤️"; }
      else if (code === 2) { weatherKey = "weatherPartlyCloudy"; icon = "⛅"; }
      else if (code === 3) { weatherKey = "weatherCloudy"; icon = "☁️"; }
      else if (code === 45 || code === 48) { weatherKey = "weatherFog"; icon = "🌫️"; }
      else if (code >= 51 && code <= 55) { weatherKey = "weatherDrizzle"; icon = "🌦️"; }
      else if (code >= 61 && code <= 65) { weatherKey = "weatherRain"; icon = "🌧️"; }
      else if (code >= 71 && code <= 75) { weatherKey = "weatherSnow"; icon = "❄️"; }
      else if (code >= 80 && code <= 82) { weatherKey = "weatherShowers"; icon = "🌧️"; }
      else if (code >= 95 && code <= 99) { weatherKey = "weatherThunderstorm"; icon = "⛈️"; }

      this.elements.liveCondition.textContent = this.i18n.get(weatherKey);
      if (weatherIconEl) weatherIconEl.textContent = icon;
    } else if (todayOutput && todayOutput.condition) {
      const condLower = (todayOutput.condition || "").toLowerCase();
      this.elements.liveCondition.textContent = this.i18n.get("weather" + condLower.split(" ").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join("")) || todayOutput.condition || "--";
      if (weatherIconEl) weatherIconEl.textContent = "🔆";
    } else {
      this.elements.liveCondition.textContent = "--";
      if (weatherIconEl) weatherIconEl.textContent = "🔆";
    }

    // 2. Update Yield Summary Tiles
    if (liveOrTodayWh !== null) {
      if (Math.abs(liveOrTodayWh) < 1000) {
        this.elements.summaryDay.textContent = Math.round(liveOrTodayWh).toString();
        if (this.elements.summaryDayUnit) this.elements.summaryDayUnit.textContent = "Wh";
      } else {
        const kwh = liveOrTodayWh / 1000;
        this.elements.summaryDay.textContent = kwh.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (this.elements.summaryDayUnit) this.elements.summaryDayUnit.textContent = "kWh";
      }
    } else {
      this.elements.summaryDay.textContent = "--";
      if (this.elements.summaryDayUnit) this.elements.summaryDayUnit.textContent = "kWh";
    }

    if (this.state.outputData.d.length > 0) {
      const last7 = this.state.outputData.d.slice(-7);
      const sumWeek = last7.reduce((acc, curr) => acc + curr.energyKwh, 0);
      this.elements.summaryWeek.textContent = sumWeek.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    } else {
      this.elements.summaryWeek.textContent = "--";
    }

    if (this.state.outputData.m.length > 0) {
      const currentMonth = this.state.outputData.m[this.state.outputData.m.length - 1];
      this.elements.summaryMonth.textContent = currentMonth.energyKwh.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    } else {
      this.elements.summaryMonth.textContent = "--";
    }

    if (this.state.outputData.y.length > 0) {
      const currentYear = this.state.outputData.y[this.state.outputData.y.length - 1];
      this.elements.summaryYear.textContent = currentYear.energyKwh.toLocaleString("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    } else {
      this.elements.summaryYear.textContent = "--";
    }

    // 3. Render Charts
    this.charts.renderIntradayChart();
    this.charts.renderHistoryChart();

    // Update Sun Arc Position
    this.updateSunArc();

    // 4. Update Lifetime Stats & System Configuration
    if (this.state.statistic) {
      this.elements.statTotalEnergy.textContent = `${Math.round(this.state.statistic.totalEnergyKwh).toLocaleString("de-DE")} kWh`;
      this.elements.statAvgDaily.textContent = `${this.state.statistic.avgDailyKwh.toFixed(2).replace(".", ",")} kWh/Tag`;
      this.elements.statMaxDaily.textContent = `${this.state.statistic.maxDailyKwh.toFixed(2).replace(".", ",")} kWh`;
      this.elements.statMaxDailyDate.textContent = `${this.i18n.get('statMaxDate')} ${formatGermanDate(this.state.statistic.maxDailyDate)}`;
      this.elements.statOutputsCount.textContent = `${this.state.statistic.outputsCount.toLocaleString("de-DE")} ${this.i18n.get('tage')}`;
    } else {
      this.elements.statTotalEnergy.textContent = "-- kWh";
      this.elements.statAvgDaily.textContent = "-- kWh/Tag";
      this.elements.statMaxDaily.textContent = "-- kWh";
      this.elements.statMaxDailyDate.textContent = `${this.i18n.get('statMaxDate')} --`;
      this.elements.statOutputsCount.textContent = `-- ${this.i18n.get('tage')}`;
    }

    if (this.state.systemInfo) {
      this.elements.sysName.textContent = this.state.systemInfo.name || "--";
      this.elements.sysSize.textContent = this.state.systemInfo.capacityWp ? `${this.state.systemInfo.capacityWp} Wp` : "--";
      this.elements.sysPanels.textContent = this.state.systemInfo.panels || "--";
      this.elements.sysInverter.textContent = this.state.systemInfo.inverter || "--";
    } else {
      this.elements.sysName.textContent = "--";
      this.elements.sysSize.textContent = "-- Wp";
      this.elements.sysPanels.textContent = "--";
      this.elements.sysInverter.textContent = "--";
    }
  }
}
