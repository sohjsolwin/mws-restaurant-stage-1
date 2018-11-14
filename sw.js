var staticCacheName = 'restaurant-reviews-static-v14';
var contentImgsCache = 'restaurant-reviews-imgs';
var allCaches = [
  staticCacheName,
  contentImgsCache
];
var _dbPromise;
var callsToCache = [];

self.addEventListener('install', function(event) {
  var urlsToCache = [
    '/index.html',
    '/restaurant.html',
    '/js/main.js',
    '/js/restaurant_info.js',
    '/js/idb.js',
    '/css/styles.css',
    '/css/extra.css'
  ];
  event.waitUntil(
    caches.open(staticCacheName).then(function(cache) {
      return cache.addAll(urlsToCache);
    }).catch(function(ex) {
      console.log('Failure to cache all');
    })
  );
});

self.addEventListener('activate', function(event) {
  console.log('Service Worker installed.');
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

self.addEventListener('message', function(event) {
  if (event.data.action == 'flushCache') {
    syncOfflineRequests();
    console.log('Offline requests synced');
  }
});


self.addEventListener('fetch', function(event) {
  var requestUrl = new URL(event.request.url);
  var requestMethod = event.request.method;

  syncOfflineRequests();

  if (requestMethod == 'GET') {
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
      if (requestUrl.pathname.startsWith('/img/icons/')) {
        event.respondWith(serveIcon(event.request));
        return;
      }
      if (requestUrl.pathname.startsWith('/img/')) {
        event.respondWith(servePhoto(event.request));
        return;
      }
    }

    //don't cache our API requests, we're already storing them in IDB. 
    if (!event.request.url.includes('/reviews') && !event.request.url.includes('/restaurants')){
      event.respondWith(matchOrCache(event.request));
      // event.respondWith(
      //   caches.match(event.request).then(function(response) {
      //     return response || fetch(event.request);
      //   })
      // );
      return;
    }
  } else if (requestMethod == 'POST' || requestMethod == "PUT" || requestMethod == "DELETE") {
    // Adapted from: https://stackoverflow.com/questions/38986351/serviceworker-cache-all-failed-post-requests-when-offline-and-resubmit-when-on
      
    if (!navigator.onLine) {
      
      if ((event.request.url.includes('/reviews') || event.request.url.includes('/restaurants') )) {
        var request = event.request;
        var serialized = {
          url: request.url,
          method: request.method
        };
        request.clone().text().then(function(body) {
          serialized.body = body;
          callsToCache.push(serialized);
        });
        event.respondWith(new Response(new Blob(), { 'status' : 200 , 'statusText' : 'Response Cached' }));     
        return;
      }
    }

  }

  event.respondWith(fetch(event.request));
});

function syncOfflineRequests() {
  if(navigator.onLine && callsToCache.length > 0) {
    var newCallsToCache = [];
    callsToCache.forEach(function(reviewRequest) {
      fetch(reviewRequest.url, {
        method: reviewRequest.method,
        body: reviewRequest.body
      }).then(function(response) {
        if (!response.ok) {
          newCallsToCache.push(reviewRequest);
        }
      });
    });
    callsToCache = newCallsToCache;
  }
}

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

function serveIcon(request) { 
  var storageUrl = request.url;
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
