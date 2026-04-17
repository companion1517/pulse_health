/* Pulse Health service worker — offline-first, cache-on-install.
 * All assets are cached; navigations fall back to index.html.
 * No network calls beyond Google Fonts (cached).
 */

const CACHE_NAME = 'pulse-health-v2';
const ASSETS = [
  './',
  './index.html',
  './styles.css',
  './app.css',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './components/Icon.jsx',
  './components/DB.jsx',
  './components/Store.jsx',
  './components/DataStore.jsx',
  './components/UI.jsx',
  './components/WeightModule.jsx',
  './components/FastModule.jsx',
  './components/HRModule.jsx',
  './components/HRCamera.jsx',
  './components/WorkoutModule.jsx',
  './components/ExtraScreens.jsx',
  './components/Home.jsx',
  './components/AppShell.jsx',
  // CDN deps
  'https://unpkg.com/react@18.3.1/umd/react.development.js',
  'https://unpkg.com/react-dom@18.3.1/umd/react-dom.development.js',
  'https://unpkg.com/@babel/standalone@7.29.0/babel.min.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache =>
      Promise.all(ASSETS.map(url =>
        cache.add(url).catch(err => console.warn('SW: failed to cache', url, err))
      ))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Navigation requests -> serve index.html from cache (SPA)
  if (e.request.mode === 'navigate') {
    e.respondWith(
      caches.match('./index.html').then(r => r || fetch(e.request))
    );
    return;
  }

  // Cache-first for everything else
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(resp => {
        // Opportunistically cache same-origin + font files
        if (resp.ok && (url.origin === location.origin || url.host.includes('gstatic.com') || url.host.includes('googleapis.com') || url.host.includes('unpkg.com'))) {
          const clone = resp.clone();
          caches.open(CACHE_NAME).then(c => c.put(e.request, clone));
        }
        return resp;
      }).catch(() => caches.match('./index.html'));
    })
  );
});
