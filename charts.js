export class DashboardCharts {
  constructor(state, elements, i18n, utils) {
    this.state = state;
    this.elements = elements;
    this.i18n = i18n;
    this.utils = utils;
    this.intradayChartInstance = null;
    this.historyChartInstance = null;
  }

  formatGranularDateLabel(str, gran, weekKey, monthKey, yearKey) {
    if (gran === "d") {
      if (!str || str.length < 8) return str;
      return `${str.substring(6, 8)}.${str.substring(4, 6)}.`;
    }
    if (gran === "w") return weekKey ? weekKey.replace(/^.*-W/, this.i18n.get('weekShort')) : `${this.i18n.get('weekShort')}${this.utils.getWeekNumber(str)}`;
    if (gran === "m") {
      const mm = monthKey ? monthKey.substring(4, 6) : (str ? str.substring(4, 6) : "");
      return this.getMonthNameShort(mm);
    }
    if (gran === "y") return yearKey || (str ? str.substring(0, 4) : "");
    return str;
  }

  getMonthNameShort(mm) {
    const months = [
      this.i18n.get('monthJanShort'), this.i18n.get('monthFebShort'), this.i18n.get('monthMarShort'),
      this.i18n.get('monthAprShort'), this.i18n.get('monthMayShort'), this.i18n.get('monthJunShort'),
      this.i18n.get('monthJulShort'), this.i18n.get('monthAugShort'), this.i18n.get('monthSepShort'),
      this.i18n.get('monthOctShort'), this.i18n.get('monthNovShort'), this.i18n.get('monthDecShort')
    ];
    return months[parseInt(mm, 10) - 1] || mm;
  }

  renderIntradayChart() {
    const canvas = this.elements.intradayChartCanvas;
    if (!canvas || !window.Chart) return;

    const data = this.state.intradayHistory;
    if (!data || data.length === 0) {
      this.elements.intradayMaxVal.textContent = "-- W";
      if (this.intradayChartInstance) {
        this.intradayChartInstance.destroy();
        this.intradayChartInstance = null;
      }
      return;
    }

    const maxPower = Math.max(0, ...data.map(d => d.powerW));
    this.elements.intradayMaxVal.textContent = `${Math.round(maxPower)} W`;

    const labels = data.map(d => d.time);
    const values = data.map(d => d.powerW);

    if (this.intradayChartInstance) {
      this.intradayChartInstance.data.labels = labels;
      this.intradayChartInstance.data.datasets[0].data = values;
      this.intradayChartInstance.update();
      return;
    }

    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, "rgba(245, 158, 11, 0.45)");
    gradient.addColorStop(1, "rgba(245, 158, 11, 0.0)");

    this.intradayChartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: labels,
        datasets: [{
          label: this.i18n.get('chartPower'),
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
              label: (ctx) => `${this.i18n.get('tooltipPower')} ${Math.round(ctx.parsed.y)} W`
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

  renderHistoryChart() {
    const canvas = this.elements.historyChartCanvas;
    if (!canvas || !window.Chart) return;

    const gran = this.state.activeGranularity;
    const list = this.state.outputData[gran] || [];

    const titles = {
      d: this.i18n.get('historyChartTitleD'),
      w: this.i18n.get('historyChartTitleW'),
      m: this.i18n.get('historyChartTitleM'),
      y: this.i18n.get('historyChartTitleY')
    };
    this.elements.historyChartTitle.textContent = titles[gran] || "Solarertrags-Historie";

    if (!list || list.length === 0) {
      this.elements.historySummaryText.textContent = this.i18n.get('historyChartEmpty');
      this.elements.historyTotalText.textContent = `${this.i18n.get('historyTotal')} -- kWh`;
      if (this.historyChartInstance) {
        this.historyChartInstance.destroy();
        this.historyChartInstance = null;
      }
      return;
    }

    const totalKwh = list.reduce((acc, curr) => acc + curr.energyKwh, 0);
    const avgKwh = totalKwh / list.length;
    this.elements.historySummaryText.textContent = `${this.i18n.get('historyChartAvg')} ${avgKwh.toFixed(1).replace(".", ",")} kWh ${this.i18n.get('historyChartPerPeriod')}`;
    this.elements.historyTotalText.textContent = `${this.i18n.get('historyTotal')} ${Math.round(totalKwh).toLocaleString("de-DE")} kWh`;

    const labels = list.map(item => this.formatGranularDateLabel(item.dateStr, gran, item.weekKey, item.monthKey, item.yearKey));
    const values = list.map(item => Number(item.energyKwh.toFixed(2)));

    if (this.historyChartInstance) {
      this.historyChartInstance.data.labels = labels;
      this.historyChartInstance.data.datasets[0].data = values;
      this.historyChartInstance.update();
      return;
    }

    const ctx = canvas.getContext("2d");
    const gradient = ctx.createLinearGradient(0, 0, 0, 240);
    gradient.addColorStop(0, "#fbbf24");
    gradient.addColorStop(1, "#d97706");

    this.historyChartInstance = new Chart(ctx, {
      type: "bar",
      data: {
        labels: labels,
        datasets: [{
          label: this.i18n.get('chartYield'),
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
              label: (ctx) => `${this.i18n.get('tooltipYield')} ${ctx.parsed.y.toFixed(2).replace(".", ",")} kWh`
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
}
