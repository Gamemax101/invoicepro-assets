/* InvoicePro Service Worker
 * Version: 1.3.0
 * Strategy: cache-first for static assets, network-first with offline fallback for pages.
 */
(function () {
  'use strict';

  var CACHE = 'invoicepro-v1.3.0';
  var CORE_ASSETS = [
    '/',
    '/?utm_source=pwa',
    '/p/invoice-generator.html',
    '/p/receipt-generator.html',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Plus+Jakarta+Sans:wght@500;600;700;800&display=swap'
  ];

  self.addEventListener('install', function (e) {
    self.skipWaiting();
    e.waitUntil(
      caches.open(CACHE).then(function (c) {
        return c.addAll(CORE_ASSETS).catch(function () { /* ignore individual failures */ });
      })
    );
  });

  self.addEventListener('activate', function (e) {
    e.waitUntil(
      caches.keys().then(function (keys) {
        return Promise.all(
          keys.filter(function (k) { return k !== CACHE; })
              .map(function (k) { return caches.delete(k); })
        );
      }).then(function () { return self.clients.claim(); })
    );
  });

  self.addEventListener('fetch', function (event) {
    var req = event.request;

    // Only handle GET.
    if (req.method !== 'GET') return;

    var url = new URL(req.url);

    // Cross-origin (fonts, ads, analytics): try network, fall back to cache. Never fail the page.
    if (url.origin !== self.location.origin) {
      event.respondWith(
        fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy).catch(function () {}); });
          return res;
        }).catch(function () {
          return caches.match(req);
        })
      );
      return;
    }

    // Navigations (pages): network-first with cached fallback + offline page.
    if (req.mode === 'navigate') {
      event.respondWith(
        fetch(req).then(function (res) {
          var copy = res.clone();
          caches.open(CACHE).then(function (c) { c.put(req, copy).catch(function () {}); });
          return res;
        }).catch(function () {
          return caches.match(req).then(function (cached) {
            return cached || caches.match('/') || caches.match('/p/invoice-generator.html');
          });
        })
      );
      return;
    }

    // Same-origin static assets: cache-first.
    event.respondWith(
      caches.match(req).then(function (cached) {
        if (cached) return cached;
        return fetch(req).then(function (res) {
          if (res && res.status === 200) {
            var copy = res.clone();
            caches.open(CACHE).then(function (c) { c.put(req, copy).catch(function () {}); });
          }
          return res;
        }).catch(function () { return cached; });
      })
    );
  });
})();
