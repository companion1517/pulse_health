# Privacy Policy — Pulse Health

_Last updated: 2026-04-17_

## Short version

**Pulse Health does not collect, transmit, or share any data.** Everything you log stays on your device.

## What data the app handles

All of the following is stored **exclusively** in your browser's IndexedDB (web) or the app's private storage (Android):

- Profile: name, date of birth, sex, height, unit preferences
- Weight entries
- Fasting sessions
- Heart rate readings
- Workout logs
- App settings

## What the app sends to the network

- **Nothing** once installed. There are no analytics, crash reporters, ad networks, or backend servers.
- On first load (web), the service worker downloads the app's own static files and caches them. The cached app runs fully offline thereafter.
- The Android build uses no network permission at all.

## Camera and flashlight (heart rate measurement)

- The rear camera and flashlight are used **only** while you are actively on the "Measure heart rate" screen.
- Video frames are processed in-memory to extract a single average red-channel value per frame. Frames are **never saved, transmitted, or retained**.
- As soon as you leave the screen, the camera stream is stopped and the flashlight is turned off.

## Data export

If you use Settings → Export JSON, a file is written to your device's Downloads folder. You choose whether to share it. The app does not upload it anywhere.

## Data deletion

Settings → **Erase all data** clears the local database. On Android you may also uninstall the app, which removes all associated storage.

## Children

The app is suitable for all ages but is not directed at children under 13, and we do not knowingly handle children's data (we do not handle anyone's data remotely).

## Changes

If this policy ever changes, the updated version will be in the same file in this repository, with a revised date.

## Contact

File an issue at https://github.com/companion1517/pulse_health
