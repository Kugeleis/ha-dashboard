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
