export class I18n {
  constructor() {
    this.texts = {
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
    this.availableLanguages = {};
  }

  async loadLanguageConfig() {
    try {
      // 1. Fetch available languages registry
      const regRes = await fetch("languages.json", { cache: "no-store" });
      if (regRes.ok) {
        this.availableLanguages = await regRes.json();
        this.populateLanguageDropdown();
      }

      // 2. Fetch selected language strings
      const currentLang = localStorage.getItem("pv_language") || "de";
      const res = await fetch(`lang/${currentLang}.json`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        this.texts = { ...this.texts, ...data };
        this.applyTranslations();
      }
    } catch (err) {
      console.warn("Could not load language configuration, using default translations.", err);
    }
  }

  populateLanguageDropdown() {
    const select = document.getElementById("input-language");
    if (!select) return;

    select.innerHTML = "";
    const currentLang = localStorage.getItem("pv_language") || "de";

    for (const [code, name] of Object.entries(this.availableLanguages)) {
      const option = document.createElement("option");
      option.value = code;
      option.textContent = name;
      if (code === currentLang) {
        option.selected = true;
      }
      select.appendChild(option);
    }
  }

  applyTranslations() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (this.texts[key]) {
        el.textContent = this.texts[key];
      }
    });
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (this.texts[key]) {
        el.title = this.texts[key];
      }
    });
  }

  get(key) {
    return this.texts[key] || "";
  }
}
