var staticCacheName = 'restaurant-reviews-static-v5';
var contentImgsCache = 'restaurant-reviews-imgs';
var allCaches = [
  staticCacheName,
  contentImgsCache
];

self.addEventListener('install', function(event) {
  var urlsToCache = [
    '/index.html',
    '/restaurant.html',
    '/js/main.js',
    '/js/restaurant_info.js',
    '/js/dbhelper.js',
    '/data/restaurants.json',
    '/css/styles.css'
  ];
  event.waitUntil(
    caches.open(staticCacheName).then(function(cache) {
      return cache.addAll(urlsToCache);
    }).catch(function(ex) {
      console.log("Failure to cache all");
    })
  );
});

self.addEventListener('activate', function(event) {
  console.log("Service Worker installed.");
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(cacheName) {
          return cacheName.startsWith('restaurant-reviews-') &&
                !allCaches.includes(cacheName);
        }).map(function(cacheName) {
          return caches.delete(cacheName);
        })
      );
    })
  );
});

self.addEventListener('fetch', function(event) {
  var requestUrl = new URL(event.request.url);
  if (requestUrl.origin === location.origin)
  {
    if (requestUrl.pathname === '/') {
      event.respondWith(
        caches.match('/index.html')
      );
      return;
    }
    if (requestUrl.pathname === '/restaurant.html') {
      event.respondWith(
        caches.match('/restaurant.html')
      );
      return;
    }
    if (requestUrl.pathname === '/data/restaurants.json') {
      event.respondWith(matchOrCache(event.request));
      return;
    }
    if (requestUrl.pathname.startsWith('/img/')) {
      event.respondWith(servePhoto(event.request));
      return;
    }
  }

  event.respondWith(matchOrCache(event.request));
  // event.respondWith(
  //   caches.match(event.request).then(function(response) {
  //     return response || fetch(event.request);
  //   })
  // );
});

function matchOrCache(request) {
  var originalRequest = request;
  return caches.open(staticCacheName).then(function(cache) {
    return cache.match(request).then(cacheMatch => {
      if (cacheMatch) return cacheMatch;

      return fetch(originalRequest).then(function(response) {
          cache.put(request.url, response.clone());
          return response;
        });
    }); 
  });
}

function servePhoto(request) { 
  var storageUrl = request.url.replace(/-\d+px\.jpg$/, '');
  var originalRequest = request;
  
  return caches.open('restaurant-reviews-imgs').then(function(cache) {
    return cache.match(storageUrl).then(cacheMatch => {
      if (cacheMatch) return cacheMatch;

      return fetch(originalRequest).then(function(response) {
          cache.put(storageUrl, response.clone());
          return response;
        });
    }); 
  });
}
