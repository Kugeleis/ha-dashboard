# M75 / Home Assistant Varco Dashboard

A sleek, lightweight, and secure dashboard for the Home Assistant layout **M75 / Home**, built with modern pure web technologies: **HTML5**, **PicoCSS**, and **Vanilla Javascript**.

It runs entirely in the browser with **no build steps** and connects securely using the **Varco** integration protocol.

## 🚀 GitHub Pages Auto-Deployment

This repository is configured with a GitHub Actions workflow ([pages.yml](.github/workflows/pages.yml)) that automatically deploys the dashboard to **GitHub Pages** as soon as it is pushed to GitHub on the `main` or `master` branch.

Once hosted, you will be able to access the live dashboard at:
`https://<your-username>.github.io/ha-dashboard/`

## 🔒 Security & Connection (Varco)

Instead of using long-lived Home Assistant access tokens or exposing your Home Assistant instance to the public internet, this dashboard uses **Varco** for **End-to-End Encrypted (E2EE)** communication over WebRTC and secure relays.

### Public Dashboard Mode
This dashboard is configured for **public access without per-device pairing prompts**. To achieve this, it uses a **shared, hardcoded Consumer Identity (Private Key)** in `app.js`.

Because the dashboard manifest only requests `read_entities` and no actionable permissions, this key functions as a safe, read-only token specifically scoped to the dashboard's needs.

### Setup & Initial Pairing Steps
When deploying this dashboard for your own Home Assistant instance, you need to pair the shared key **once**:

1. **Set your Authority ID**: In `app.js`, update `const AUTHORITY_ID` with the Authority ID from your Home Assistant Varco integration.
2. **(Optional) Generate a new shared key**: The repository includes a pre-generated shared key (`PUBLIC_DASHBOARD_PRIVATE_KEY` in `app.js`). If you want to generate your own, you can run `node -e 'import("@noble/hashes/utils").then(u => console.log(u.bytesToHex(u.randomBytes(32))))'` and replace the key in `app.js`.
3. **Open the Dashboard**: Visit your hosted dashboard URL (or open it locally).
4. **Pair Once**: The dashboard will display a **Pairing Code** (e.g., `123 - 456`) the very first time.
5. **Approve in Home Assistant**: Open your Home Assistant, check the notification tray, and approve the request for **M75 / Home** matching the pairing code.

**That's it!** Once approved, the shared key is authorized. Anyone visiting the public dashboard URL will now immediately see the live entity states and history graphs without being prompted for a pairing code, as their browser will utilize the pre-approved shared identity.

## 📊 Dashboard Widgets

- **Solar Power & Share**: Conic-gradient gauge visual representing `sensor.solar_share` alongside current solar generation in Watts (`sensor.solaranlage_energy_power_2`).
- **Weather Forecast**: Visual cards for current weather state, temperature, and humidity from `weather.forecast_m75`.
- **Grid Carbon Intensity**: Displays actual intensity and percentage of fossil fuel with a dynamic level indicator based on `sensor.co2_signal_co2_intensity` and `sensor.co2_signal_grid_fossil_fuel_percentage`.
- **Yield Statistics**: Grid metrics tracking Daily, Weekly, Monthly, and Yearly solar production.
- **Waste Collection**: Highlights waste collection schedule from `sensor.waste_collection_schedule_abfallkalender` with visual warning alerts if collection is coming up.
- **SVG History Charts**: Inline responsive graphs plotting 24-hour histories of Actual vs. Forecasted Solar power and Current Grid demand vs. Solar generation.

## 🛠️ Local Development

To run and preview the dashboard locally:
```bash
python3 -m http.server 8080 --bind 127.0.0.1
```
Then visit `http://127.0.0.1:8080` in your web browser.
