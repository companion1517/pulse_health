# Pulse Health

A unified, private, offline health tracker. Runs as a Progressive Web App on any modern browser, or as a minimal Android WebView wrapper (F-Droid compatible).

## Quick start — push this repo to GitHub

```bash
chmod +x setup.sh
./setup.sh
```

That script pulls the canonical GPL-3.0 text into `LICENSE`, runs `git init`, sets the remote, commits, and pushes to `companion1517/pulse_health`. Override the destination with `REPO_URL=… ./setup.sh` if you fork.

After the first push, enable GitHub Pages under **Settings → Pages → Source: GitHub Actions**. The `Deploy web app` workflow will publish on every push to `main`.

**What it tracks**

- **Weight** — log entries, goal tracking, trend chart, BMI
- **Fasting** — 16:8 / 18:6 / OMAD / custom windows, live timer, history
- **Heart rate** — manual entry, or automatic measurement via rear camera + flashlight (PPG, no external sensor needed)
- **Workouts** — log sessions with type, duration, intensity, notes

**Principles**

- **Local-only.** All data lives in your browser's IndexedDB. Nothing is uploaded. No accounts. No ads. No analytics.
- **Portable.** Export your entire dataset as JSON and re-import on another device.
- **Open.** GPL-3.0. Build it yourself, audit the code, fork it.
- **No native sensor dependencies.** Works on any phone with a camera; no smartwatch required.

## Running the web app

Any static file server works. For development:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

Or deploy to GitHub Pages, Netlify, Cloudflare Pages, etc. The repo includes a GitHub Actions workflow (`.github/workflows/web.yml`) that deploys to GitHub Pages on every push to `main`.

**Camera / flash requires HTTPS** (or localhost). The app will prompt for camera permission only when you open the heart-rate camera flow.

## Building the Android app

The `android/` folder contains a minimal Kotlin WebView wrapper. It has no Google libraries, no analytics, no proprietary dependencies — only AndroidX. F-Droid metadata is under `fastlane/metadata/android/`.

```bash
cd android
./gradlew assembleRelease
```

The GitHub Actions workflow `.github/workflows/android.yml` builds a signed APK on every tag push (`v*`) and attaches it to the release.

## Data export / import

Settings → Data → **Export JSON** downloads a file like:

```json
{ "schemaVersion": 1, "exportedAt": "...", "profile": {...}, "weight_entries": [...], ... }
```

Import merges by UUID — re-importing the same file is idempotent.

## Privacy

See [PRIVACY.md](./PRIVACY.md). Short version: nothing leaves your device. The service worker caches the app itself; no telemetry, no remote APIs.

## Heart rate camera (PPG)

The camera-based heart rate algorithm is a photoplethysmography (PPG) technique:

1. Place your fingertip over the rear camera **and** the flashlight.
2. The app samples video frames at ~22 fps and averages the red channel of each frame.
3. A valley-detection pass (13-sample window) finds heartbeat troughs.
4. BPM is computed from inter-valley timing over a 15-second window.

Accuracy is comparable to wrist-based optical sensors for resting heart rate (±3–5 bpm when held still). It is **not** a medical device.

Algorithm adapted from [berdosi/HeartBeat](https://github.com/berdosi/HeartBeat) (ISC).

## Stack

- Vanilla React 18 via CDN (no build step, no bundler, no npm)
- Babel standalone for in-browser JSX transpilation
- IndexedDB for persistence
- Service Worker for offline
- Android: single-activity Kotlin + WebView

## License

[GPL-3.0-or-later](./LICENSE). You are free to use, modify, and redistribute this software, provided derivative works remain open-source under the same license.

## Contributing

Issues and PRs welcome at https://github.com/companion1517/pulse_health
