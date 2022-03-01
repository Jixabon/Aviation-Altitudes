const OFFLINE_VERSION = '1.0.0';
const CACHE_NAME = 'avi-alts-offline';

var core_resources = [
  '/index.html',
  '/css/reset.css',
  '/css/style.css',
  '/js/script.js',
  '/images/cirrus.png',
  '/images/cirrus-shadow.png',
  'https://fonts.googleapis.com/css2?family=Cabin:wght@600&display=swap',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.addAll(core_resources);
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Enable navigation preload if it's supported.
      // See https://developers.google.com/web/updates/2017/02/navigation-preload
      if ('navigationPreload' in self.registration) {
        await self.registration.navigationPreload.enable();
      }
    })()
  );

  // Tell the active service worker to take control of the page immediately.
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    // Check the dynamic cache; if found, fetch and update cache; if not, next
    caches.open(CACHE_NAME).then(function (cache) {
      return cache.match(event.request).then(function (response) {
        var fetchPromise = fetch(event.request)
          .then(function (networkResponse) {
            cache.put(event.request, networkResponse.clone());
            return networkResponse;
          })
          .catch((e) => console.log(e));
        return response || fetchPromise;
      });
    }),
    // Check cache in general; if found, serve; if not, fetch from network
    caches.match(event.request).then(function (response) {
      return response || fetch(event.request);
    })
  );
});
