# ☀️ PVOutput Solar Dashboard

A sleek, modern, and lightweight web dashboard for real-time monitoring and historical analysis of solar photovoltaic systems via the **PVOutput.org** API. Built with modern web technologies: **HTML5**, **Vanilla JavaScript (ES6+)**, **Chart.js**, and **Pico CSS v2**.

Designed with a 100% German user interface (*100% Deutsch*) tailored for high visual clarity, precision, and responsive performance across mobile, tablet, and desktop devices.

---

## 🚀 Key Features & Architecture

- **Real-Time Generation Monitoring**: Displays current power output (Watts), daily energy yield, specific efficiency (kWh/kWp), inverter module temperature (°C), and peak power today with timestamp.
- **Interactive 24h Intraday Curve**: Chart.js smooth area line chart rendering 5-minute status history for today with zero-based Y-scaling and instant hover tooltips.
- **Granular Yield History**: Interactive Chart.js bar chart with tab switching for **Täglich** (Daily 30-day), **Wöchentlich** (Weekly 12-week), **Monatlich** (Monthly 12-month), and **Jährlich** (Yearly) production data.
- **Smart Energy Unit Formatting**: Automatically switches unit precision between Watt-hours (**Wh**) for yields under 1,000 Wh (ideal for micro-solar / Balkonkraftwerk systems) and high-precision **kWh** for larger generation values.
- **Rate-Limit Throttling Protection**: Sequential staggered API fetcher maintaining 1.5-second spacing to strictly observe PVOutput rate limits and eliminate HTTP 403 errors.
- **Lifetime Statistics & Records**: All-time energy total, daily average production, historical single-day record yield with date, and total active recording days.
- **System Specs Display**: Shows installed capacity (Wp), panel brand & counts, inverter model, and system name.

---

## 🔒 Security & Credentials Architecture

Zero secrets or credentials are stored in the source code repository. Credentials are dynamically resolved at runtime using the following precedence:

1. **URL Query Parameters** (ideal for bookmarks or GitHub Pages sharing):
   ```text
   https://yourusername.github.io/ha-dashboard/?sid=YOUR_SYSTEM_ID&key=YOUR_API_KEY
   ```
2. **Browser `localStorage`**: Persisted safely in browser storage when entered via the settings dialog.
3. **Local `secrets.json` File** (Git-ignored for local development):
   Copy `secrets_example.json` to `secrets.json` and enter your PVOutput credentials:
   ```json
   {
     "systemId": "YOUR_SYSTEM_ID",
     "apiKey": "YOUR_READONLY_API_KEY",
     "proxyUrl": ""
   }
   ```
4. **Settings Dialog**: Click **⚙️ Einstellungen** in the top navigation bar to configure or update your **System ID**, **API Key**, or custom CORS proxy URL at any time.

---

## 🛠️ Local Development

To run the dashboard locally:

1. Copy `secrets_example.json` to `secrets.json` and add your system credentials:
   ```bash
   cp secrets_example.json secrets.json
   ```
2. Start a local HTTP server:
   ```bash
   python3 -m http.server 8080 --bind 127.0.0.1
   ```
3. Open `http://127.0.0.1:8080` in your web browser.

---

## 🌐 GitHub Pages Deployment

This repository includes a GitHub Actions workflow (`.github/workflows/pages.yml`) that automatically builds and deploys the dashboard to **GitHub Pages** whenever changes are pushed to `main`.

Pass your credentials via URL query parameters or configure them once in the in-app **⚙️ Einstellungen** menu.
