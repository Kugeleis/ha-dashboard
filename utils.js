export const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export function formatTodayYYYYMMDD() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}${mm}${dd}`;
}

export function formatGermanDate(str) {
  if (!str || str.length < 8) return str || "--";
  const yyyy = str.substring(0, 4);
  const mm = str.substring(4, 6);
  const dd = str.substring(6, 8);
  return `${dd}.${mm}.${yyyy}`;
}

export function formatEnergyDisplay(energyWh) {
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

export function getWeekNumber(str) {
  if (!str || str.length < 8) return "";
  const date = new Date(parseInt(str.substring(0,4)), parseInt(str.substring(4,6)) - 1, parseInt(str.substring(6,8)));
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
}

export function getWeekKey(str) {
  if (!str || str.length < 8) return str;
  const yyyy = str.substring(0, 4);
  const kw = getWeekNumber(str);
  return `${yyyy}-W${String(kw).padStart(2, '0')}`;
}

export function getWeatherIcon(code, isDay) {
  let slug = "";
  let altText = "";

  switch (code) {
    case 0:
    case 1:
      slug = isDay ? "clear-day" : "clear-night";
      altText = code === 0 ? "clear sky" : "mainly clear";
      break;
    case 2:
      slug = isDay ? "partly-cloudy-day" : "partly-cloudy-night";
      altText = "partly cloudy";
      break;
    case 3:
      slug = "overcast";
      altText = "overcast";
      break;
    case 45:
    case 48:
      slug = isDay ? "fog-day" : "fog-night";
      altText = "fog";
      break;
    case 51:
    case 53:
    case 55:
      slug = "drizzle";
      altText = "drizzle";
      break;
    case 56:
    case 57:
      slug = "sleet";
      altText = "freezing drizzle";
      break;
    case 61:
    case 63:
      slug = "rain";
      altText = "rain";
      break;
    case 65:
      slug = "rain";
      altText = "heavy rain";
      break;
    case 66:
    case 67:
      slug = "sleet";
      altText = "freezing rain";
      break;
    case 71:
    case 73:
    case 75:
    case 77:
      slug = "snow";
      altText = "snow";
      break;
    case 80:
    case 81:
      slug = isDay ? "partly-cloudy-day-rain" : "partly-cloudy-night-rain";
      altText = "rain showers";
      break;
    case 82:
      slug = "rain";
      altText = "violent showers";
      break;
    case 85:
    case 86:
      slug = isDay ? "partly-cloudy-day-snow" : "partly-cloudy-night-snow";
      altText = "snow showers";
      break;
    case 95:
      slug = isDay ? "thunderstorms-day" : "thunderstorms-night";
      altText = "thunderstorm";
      break;
    case 96:
    case 99:
      slug = isDay ? "thunderstorms-day-rain" : "thunderstorms-night-rain";
      altText = "thunderstorm with hail";
      break;
    default:
      slug = isDay ? "partly-cloudy-day" : "partly-cloudy-night";
      altText = "cloudy";
      break;
  }

  return { slug, altText };
}
