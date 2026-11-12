# Minimal Interval Timer

> A ultra-clean, zero-dependency, mobile-optimized interval timer web application built with vanilla HTML5, modern CSS, and ES Modules. Designed for quick-glance readability, fluid pre-countdown color transitions, and zero background drift.

GitHub Pages: <https://wdzajicek.github.io/interval-timer/>

## Features

- **Pre-Timer Countdown:** Defaults to a 3-second "Get Ready" countdown before the main timer starts. Fully customizable.
- **Dynamic Color Gradient:** The pre-timer digits smoothly transition through a **Red $\rightarrow$ Yellow $\rightarrow$ Green** color gradient relative to your custom pre-timer duration.
- **Micro-Animations:** Subtle, snappy number-swelling animations on every pre-timer tick.
- **High-Precision Main Timer:** Times down in seconds, minutes, or hours, featuring sub-second millisecond/centisecond increments so you always know when a second is about to clear.
- **Dual Playback Modes:**
  - *Single Run:* Executes the pre-timer and main timer once, then halts.
  - *Continuous Loop:* Automatically loops back to the pre-timer upon completion.
- **Persistent Settings:** Remembers your preferred durations, modes, and themes using `localStorage`.
- **Screen Wake Lock API:** Prevents mobile phone screens from dimming or locking mid-timer.
- **Theme Awareness:** Automatically respects your operating system/device color scheme (Dark/Light mode) with a manual override toggle.
- **Mobile-First Minimal UI:** Clean, distraction-free interface with a giant Start/Stop button and a collapsible settings drawer hidden behind a mobile hamburger menu.
- **Zero External Dependencies:** Built with native web standards and self-hosted static assets.

---

## Project Structure

```text
├── .github/
│   └── workflows/
│       └── deploy.yml
├── assets/
│   └── fonts/
│       └── Roboto-VariableFont_wdth,wght.ttf
├── index.html
├── style.css
├── app.js
└── package.json
```

---

## Local Development

Because this app uses modern native ES Modules (`type="module"`), browsers block direct `file://` execution due to strict local CORS security. You must run it through a local HTTP server.

1. Install the pinned local development dependencies:
   ```bash
   npm install
   ```
2. Start the local development server:
   ```bash
   npm run dev
   ```
3. Open the local URL provided in your terminal (typically `http://localhost:3000`).

---

## Automatic Deployment to GitHub Pages

This repository automatically builds and deploys to GitHub Pages using a GitHub Actions workflow whenever changes are pushed to the `main` branch.

### One-Time Repository Setup
1. Push your code to a **public** repository on GitHub.
2. Go to your repository on GitHub and click **Settings** > **Pages** (in the left sidebar).
3. Under **Build and deployment** > **Source**, change the dropdown from *Deploy from a branch* to **GitHub Actions**.
4. That's it! Every push to `main` will trigger the `.github/workflows/deploy.yml` action and update your live site automatically.
