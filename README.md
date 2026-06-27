# M75 / Home Assistant Varco Dashboard

A sleek, lightweight, and secure dashboard for the Home Assistant layout **M75 / Home**, built with modern pure web technologies: **HTML5**, **PicoCSS**, and **Vanilla Javascript**.

It runs entirely in the browser with **no build steps** and connects securely using the **Varco** integration protocol.

## 🚀 GitHub Pages Auto-Deployment

This repository is configured with a GitHub Actions workflow ([pages.yml](.github/workflows/pages.yml)) that automatically deploys the dashboard to **GitHub Pages** as soon as it is pushed to GitHub on the `main` or `master` branch.

Once hosted, you will be able to access the live dashboard at:
`https://<your-username>.github.io/ha-dashboard/`

## 🔒 Security & Connection (Varco)

Instead of using long-lived Home Assistant access tokens or exposing your Home Assistant instance to the public internet, this dashboard uses **Varco**:
- Communications are **End-to-End Encrypted (E2EE)**.
- Establishing connections uses peer-to-peer (**WebRTC**) when available, falling back to a secure bridge relay.
- Access control policy, approvals, and logs remain in your Home Assistant instance.

### Connection & Pairing Steps
1. Open the hosted dashboard on GitHub Pages.
2. If it is your first time connecting, you will see a **Pairing Code** (e.g., `123 - 456`).
3. Open your Home Assistant instance, check the notification tray, and approve the request for **M75 / Home** using the pairing code.
4. Once authorized, the dashboard will load the live entity states and historical power graphs.

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
