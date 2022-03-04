const OFFLINE_VERSION = '1.6.0';
const WHATS_NEW = [];

const CACHE_PREFIX = 'avi-alts';
const CORE_CACHE = CACHE_PREFIX + '-core-' + OFFLINE_VERSION;
const STATIC_CACHE = CACHE_PREFIX + '-static';
const DYNAMIC_CACHE = CACHE_PREFIX + '-dynamic';
const CACHES = [CORE_CACHE, STATIC_CACHE, DYNAMIC_CACHE];

// Resources that must stay at the same version together
var core_resources = ['/', '/index.html', '/css/style.css', '/js/script.js'];

// Resources that aren't likely to change
var static_resources = [
  '/css/reset.css',
  '/images/cirrus.png',
  '/images/cirrus-shadow.png',
  '/css/fontawesome.min.css',
  '/css/solid.min.css',
  '/webfonts/fa-solid-900.ttf',
  '/webfonts/fa-solid-900.woff2',
];

// Resources that can update when available independent of other resources
var dynamic_resources = [
  'https://fonts.googleapis.com/css2?family=Cabin:wght@600&display=swap',
  'https://fonts.gstatic.com/s/cabin/v18/u-4X0qWljRw-PfU81xCKCpdpbgZJl6XFpfEd7eA9BIxxkYODH7alx0zoA_o.woff2',
  '/manifest.webmanifest',
  '/icons/icon-72x72.png',
  '/icons/icon-96x96.png',
  '/icons/icon-128x128.png',
  '/icons/icon-144x144.png',
  '/icons/icon-152x152.png',
  '/icons/icon-192x192.png',
  '/icons/icon-384x384.png',
  '/icons/icon-512x512.png',
  '/apple-touch-icon.png',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/favicon.ico',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CORE_CACHE).then(function (cache) {
        return cache.addAll(core_resources);
      }),
      caches.open(STATIC_CACHE).then(function (cache) {
        return cache.addAll(static_resources);
      }),
      caches.open(DYNAMIC_CACHE).then(function (cache) {
        return cache.addAll(dynamic_resources);
      }),
    ])
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      // (async () => {
      //   // Enable navigation preload if it's supported.
      //   // See https://developers.google.com/web/updates/2017/02/navigation-preload
      //   if ('navigationPreload' in self.registration) {
      //     await self.registration.navigationPreload.enable();
      //   }
      // })(),
      // Clean up old caches
      caches.keys().then(function (cacheNames) {
        return Promise.all(
          cacheNames.map(function (cacheName) {
            if (
              !CACHES.includes(cacheName) &&
              cacheName.startsWith(CACHE_PREFIX)
            ) {
              return caches.delete(cacheName);
            }
          })
        );
      }),
    ])
  );

  // Tell the active service worker to take control of the page immediately.
  self.clients.claim();

  var message = {
    version: OFFLINE_VERSION,
  };

  if (WHATS_NEW.length > 0) {
    message.whatsNew =
      WHATS_NEW.reduce((markup, newItem) => {
        return `${markup}<li>${newItem}</li>`;
      }, '<ul>') + '</ul>';
  }

  self.clients.matchAll().then((all) => {
    all.forEach((client) => {
      console.log('sending sw version');

      client.postMessage(message);
    });
  });
});

self.addEventListener('message', function (event) {
  if (event.data.action === 'skipWaiting') {
    self.skipWaiting();
  }
});

async function handleRequest(request) {
  let { url } = request;
  let offlineResponse = new Response('', {
    status: 500,
    statusText: 'offline',
  });

  if (/\.netlify\/functions/i.test(url)) {
    return fetch(request).catch((e) => offlineResponse);
  }

  // Check the core cache; if found, fetch and serve; if not, next
  const core = await caches.open(CORE_CACHE);
  var coreResponse = await core.match(request);
  if (coreResponse) {
    // cache only
    console.log('responding from core', url);
    return coreResponse;
  }

  // Check the static cache; if found, fetch, update cache and serve; if not, next
  const static = await caches.open(STATIC_CACHE);
  var staticResponse = await static.match(request);
  if (staticResponse) {
    // stale-while-validate
    console.log('responding from static', url);
    var fetchResponse = fetch(request)
      .then(function (networkResponse) {
        if (networkResponse.ok) {
          console.log('caching to static', url);
          static.put(request, networkResponse.clone());
        }
        return networkResponse;
      })
      .catch((e) => offlineResponse);
    return staticResponse || fetchResponse;
  }

  // Check the dynamic cache; if found, fetch, update cache and serve; if not, next
  const dynamic = await caches.open(DYNAMIC_CACHE);
  var dynamicResponse = await dynamic.match(request);
  if (dynamicResponse) {
    // stale-while-validate
    console.log('responding from dynamic', url);
    var fetchResponse = fetch(request)
      .then((networkResponse) => {
        if (networkResponse.ok) {
          console.log('caching to dynamic', url);
          dynamic.put(request, networkResponse.clone());
        }
        return networkResponse;
      })
      .catch((e) => offlineResponse);
    return staticResponse || fetchResponse;
  }

  try {
    var response = await fetch(request);

    if (response.ok) {
      if (/fonts.(googleapis|gstatic).com/i.test(url)) {
        dynamic.put(request, response.clone());
      }
    }

    return response;
  } catch (e) {
    return offlineResponse;
  }
}

self.addEventListener('fetch', (event) => {
  event.respondWith(handleRequest(event.request));
});
