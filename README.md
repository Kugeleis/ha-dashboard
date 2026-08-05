# ☀️ PVOutput Solar Dashboard

A sleek, modern, and lightweight web dashboard for real-time monitoring and historical analysis of solar photovoltaic systems via the **PVOutput.org** API. Built with modern web technologies: **HTML5**, **Vanilla JavaScript (ES6+)**, **Chart.js**, and **Pico CSS v2**.

Designed with a 100% German user interface (*100% Deutsch*) tailored for high visual clarity, precision, and responsive performance across mobile, tablet, and desktop devices.

---

## 🏗️ Project Architecture (SOLID & ES6 Modules)

The codebase has been meticulously refactored using pure vanilla JavaScript to embrace **SOLID** principles, particularly the **Single Responsibility Principle (SRP)**, while preserving maximum readability (**KISS**). There are no complex build steps required.

The application logic is broken down into highly focused ES6 modules:
- `app.js` (Orchestrator): The main entry point. It holds the global state, binds modules together, handles timing/intervals, and orchestrates the data loading flow.
- `api.js` (`PVOutputAPI`): Strictly handles all interactions with PVOutput.org. This includes multi-proxy fallbacks, rate limit throttling, sequential data fetching, and transforming raw CSV data into clean JS objects.
- `ui.js` (`DashboardUI`): Manages the DOM. Responsible for taking state data and rendering it to the visual components, including updating texts, classes, conditional visibility, and the sun arc position.
- `charts.js` (`DashboardCharts`): Wraps the Chart.js library to specifically handle the creation, updating, and lifecycle of the historical and intraday graphs.
- `i18n.js` (`I18n`): Isolates all translation dictionaries and logic to apply current language configurations to the DOM.
- `utils.js`: A collection of pure, stateless utility functions (e.g., date parsing, number formatting, and async delays).

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

Zero secrets or credentials are hardcoded into the source code repository. Credentials are dynamically resolved at runtime using the following precedence:

1. **URL Query Parameters** (ideal for bookmarks or sharing):
   ```text
   https://yourusername.github.io/ha-dashboard/?sid=YOUR_SYSTEM_ID&key=YOUR_API_KEY
   ```
2. **Browser `localStorage`**: Persisted safely in browser storage when entered via the settings dialog.
3. **`secrets.json` File** (Local Development & GitHub Actions):
   - **Local Dev**: Create `secrets.json` locally (Git-ignored).
   - **GitHub Pages**: Automatically generated during deployment if GitHub Repository Secrets are configured.
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

## 🌐 GitHub Pages Deployment & Repository Secrets

This repository includes a GitHub Actions workflow (`.github/workflows/pages.yml`) that automatically builds and deploys the dashboard to **GitHub Pages** whenever changes are pushed to `main`.

### Configuring GitHub Repository Secrets

You can supply your PVOutput system credentials securely via GitHub Repository Secrets:

1. Go to your repository on GitHub.
2. Navigate to **Settings** → **Secrets and variables** → **Actions**.
3. Click **New repository secret** and define:
   - `PVOUTPUT_SYSTEM_ID`: Your PVOutput System ID (e.g. `12345`).
   - `PVOUTPUT_API_KEY`: Your PVOutput API Key (use a **Read-Only** API key).
   - `PVOUTPUT_PROXY_URL`: *(Optional)* Custom CORS Proxy URL.
4. Push your changes to `main`. The deployment workflow will automatically generate `secrets.json` during build time and deploy it with your static site.

> [!NOTE]
> Because GitHub Pages hosts client-side static files, `secrets.json` will be fetched by the browser. Always use a **Read-Only API Key** when deploying to GitHub Pages.

---

## ⚡ CORS & Proxy Architecture on GitHub Pages

Because **PVOutput.org** does not send `Access-Control-Allow-Origin` headers, browser applications hosted on external origins (such as `https://yourusername.github.io`) cannot fetch data directly without encountering browser CORS blocks.

To guarantee maximum reliability on GitHub Pages, this dashboard uses a **Multi-Proxy Fallback Chain**:

1. **Custom User Proxy** (if configured via settings, URL parameter, or `secrets.json`)
2. **CodeTabs Proxy** (`https://api.codetabs.com/v1/proxy?quest=`)
3. **CorsProxy.io** (`https://corsproxy.io/?`)
4. **ThingProxy** (`https://thingproxy.freeboard.io/fetch/`)
5. **AllOrigins** (`https://api.allorigins.win/raw?url=`)
6. **AllOrigins JSON Wrapper** (`https://api.allorigins.win/get?url=`)
7. **Direct URL** *(for non-browser environments)*

### 🔒 Recommended: 1-Click Custom Cloudflare Worker Proxy

If public CORS proxies experience temporary rate limits or outages, you can host your own **100% private, free CORS proxy** on Cloudflare Workers (100,000 requests/day free):

1. Go to [Cloudflare Dashboard](https://dash.cloudflare.com/) → **Workers & Pages** → **Create Application**.
2. Name your worker (e.g. `pvoutput-cors-proxy`) and click **Deploy**.
3. Click **Edit Code** and paste the following JavaScript:

```javascript
export default {
  async fetch(request) {
    const url = new URL(request.url).searchParams.get("url");
    if (!url) {
      return new Response("Missing target 'url' parameter", { status: 400 });
    }

    try {
      const response = await fetch(url, {
        headers: { "User-Agent": "Mozilla/5.0 PVOutput-Dashboard" }
      });
      const newHeaders = new Headers(response.headers);
      newHeaders.set("Access-Control-Allow-Origin", "*");
      newHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      return new Response(response.body, {
        status: response.status,
        headers: newHeaders
      });
    } catch (err) {
      return new Response("Proxy error: " + err.message, { status: 502 });
    }
  }
};
```

4. Save and deploy.
5. In your Dashboard **⚙️ Einstellungen**, set the **CORS Proxy Server** to:
   ```text
   https://pvoutput-cors-proxy.YOUR_SUBDOMAIN.workers.dev/?url=
   ```
