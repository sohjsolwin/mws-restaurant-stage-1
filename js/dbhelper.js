/**
 * Common database helper functions.
 */

//import idb from 'idb';
let _dbPromise = undefined;
class DBHelper { /* eslint-disable-line no-unused-vars */

  // let init = () => {
  //   DBHelper._idb = _openDatabase();
  // };

  static get dbPromise() {
    if (!_dbPromise) _dbPromise = DBHelper.openDatabase();

    return _dbPromise;
  }

  /**
   * Database URL.
   * Change this to restaurants.json file location on your server.
   */
  static get DATABASE_URL() {
    const port = 1337; // Change this to your server port
    return `http://localhost:${port}/`;
  }

  static get RESTAURANTS_URL() {
    return `${DBHelper.DATABASE_URL}restaurants`;
  }

  static get REVIEWS_URL() {
    return `${DBHelper.DATABASE_URL}reviews`;
  }


  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants() {
    return DBHelper.matchOrDb(DBHelper.RESTAURANTS_URL)
      .then((response)=> {
        return response.length>0 ? Promise.resolve(response) : Promise.reject(`Request failed. Returned status of ${response.status}`);
      });
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id) {
    return DBHelper.matchSingleIdOrDb(`${DBHelper.RESTAURANTS_URL}/${id}`)
      .then((response)=> {
        return response ? response : Promise.reject(`Request failed. Returned status of ${response.status}`);
      }).then((restaurant) => {
        return DBHelper.matchSingleReviewOrDb(`${DBHelper.REVIEWS_URL}?restaurant_id=${id}`)
          .then(reviews => {
            restaurant.reviews = reviews;
            return Promise.resolve(restaurant);
          });
      });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine) {
    // Fetch all restaurants  with proper error handling
    return DBHelper.fetchRestaurants().then(restaurants => {
      return restaurants.filter(r => r.cuisine_type == cuisine);
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood) {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants().then((restaurants) => {
      // Filter restaurants to have only given neighborhood
      return restaurants.filter(r => r.neighborhood == neighborhood);
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood) {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants().then((restaurants) => {
      let results = restaurants;
      if (cuisine != 'all') { // filter by cuisine
        results = results.filter(r => r.cuisine_type == cuisine);
      }
      if (neighborhood != 'all') { // filter by neighborhood
        results = results.filter(r => r.neighborhood == neighborhood);
      }
      return results;
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods() {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants().then((restaurants) => {
      // Get all neighborhoods from all restaurants
      const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood);
      // Remove duplicates from neighborhoods
      const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i);
      return uniqueNeighborhoods;
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines() {
    // Fetch all restaurants
    return DBHelper.fetchRestaurants().then((restaurants) => {
      // Get all cuisines from all restaurants
      const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type);
      // Remove duplicates from cuisines
      const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i);
      return uniqueCuisines;
    });
  }

  /*
#### Create a new restaurant review
```
http://localhost:1337/reviews/
```

###### Parameters
```
{
    "restaurant_id": <restaurant_id>,
    "name": <reviewer_name>,
    "rating": <rating>,
    "comments": <comment_text>
}
```
  */
  static storeRestaurantReview(restaurantId, reviewerName, rating, comments) {
    return fetch(DBHelper.REVIEWS_URL, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({restaurant_id: restaurantId, name: reviewerName, rating: rating, comments: comments})
    }).then(response => {
      if (response.ok) {
        return DBHelper.dbPromise.then(function(db){
          if (db) {
            var tx = db.transaction('reviews', 'readwrite');
            var store = tx.objectStore('reviews');
            
            var dt = new Date();
            return store.put(
              {
                'id': dt,
                'restaurant_id': restaurantId,
                'name': reviewerName,
                'createdAt': dt,
                'rating': rating,
                'comments': comments,
                'temporary': true
              }, dt).then(() => {
              return Promise.resolve(response);
            });
          }
          return response;
        });
      }
    });
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  /**
   * Restaurant image URL.
   */
  static imageUrlForRestaurant(restaurant) {
    return (`/img/${restaurant.photograph}.webp`);
  }
  
  static imageUrlFallbackForRestaurant(restaurant) {
    return `this.onerror=null;this.src='/img/${restaurant.photograph}.jpg'`;
  }

  static openDatabase() {
    if(!navigator.serviceWorker) return Promise.resolve();

    return idb.open('restaurant', 2, function(upgradeDb) { /* eslint-disable-line no-undef */
      switch(upgradeDb.oldVersion) {
      case 0:
        var dbStore = upgradeDb.createObjectStore('restaurants', {keypath: 'id'});
        dbStore.createIndex('by-cuisine', 'cuisine_type');
        dbStore.createIndex('by-neighborhood', 'neighborhood');
      case 1: /* eslint-disable-line no-fallthrough */
        var revDbStore = upgradeDb.createObjectStore('reviews', {keypath: 'id'});
        revDbStore.createIndex('by-restaurant', 'restaurant_id');
      }
    });
  }

  static matchOrDb(requestUrl) {
    return DBHelper.dbPromise.then(function(db){
      if (db) {
        var tx = db.transaction('restaurants', 'readonly');
        var store = tx.objectStore('restaurants');
        return store.getAll();
      }
      return [];
    }).then(data => {
      if (data.length > 0) {
        return Promise.resolve(data);
      } else {
        return DBHelper.dbPromise.then(function(db){
          return fetch(requestUrl).then(function(response) {
            response.clone().json().then(json => {
              var tx = db.transaction('restaurants', 'readwrite');
              var store = tx.objectStore('restaurants');
              
              json.forEach(restaurant => {
                store.put(restaurant, restaurant.id);
              }); 
            });
            return response.json();
          });
        });
      }
    });
  }

  static matchSingleIdOrDb(requestUrl) {
    var restaurantId = requestUrl.replace(/\/restaurants\//, '');
    return DBHelper.dbPromise.then(function(db){
      if (db) {
        var tx = db.transaction('restaurants', 'readonly');
        var store = tx.objectStore('restaurants');
        return store.get(restaurantId);
      }
      return undefined;
    }).then(data => {
      if (data) { return Promise.resolve(data); }

      return DBHelper.dbPromise.then(function(db){
        return fetch(requestUrl).then(function(response) {
          response.clone().json().then(json => {
            var tx = db.transaction('restaurants', 'readwrite');
            var store = tx.objectStore('restaurants');
            
            store.put(json, json.id);
          });
          return response.json();
        });
      });
    });
  }

  static matchSingleReviewOrDb(requestUrl) {
    var restaurantId = /restaurant_id=(\d*)/.exec(requestUrl)[1];
    return DBHelper.dbPromise.then(function(db){
      if (db) {
        var tx = db.transaction('reviews', 'readonly');
        var store = tx.objectStore('reviews').index('by-restaurant');
        return store.getAll(restaurantId);
      }
      return undefined;
    }).then(data => {
      if (data.length > 0 ) {
        if (data.some(value => {
          return value.temporary;
        })) {
          DBHelper._removeTemporaryReviews()
            .then(() => DBHelper._fetchAndStoreReviews(requestUrl))
            .catch( () => { /* ignore */});
        }
        return Promise.resolve(data); 
      }

      return this._fetchAndStoreReviews(requestUrl);
    });
  }

  static _removeTemporaryReviews() {
    return DBHelper.dbPromise.then(function(db) {
      var tx = db.transaction('reviews', 'readwrite');
      var store = tx.objectStore('reviews');

      return store.getAll();
    }).then(reviews => {
      var filteredReviews = reviews.filter(review => review.temporary);
      return DBHelper.dbPromise.then(function(db) {
        var tx = db.transaction('reviews', 'readwrite');
        var store = tx.objectStore('reviews');

        filteredReviews.forEach(element => {
          store.delete(element.id);
        });
      });
    });
  }
  static _fetchAndStoreReviews(requestUrl) {
    return DBHelper.dbPromise.then(function(db){
      return fetch(requestUrl).then(function(response) {
        response.clone().json().then(json => {
          var tx = db.transaction('reviews', 'readwrite');
          var store = tx.objectStore('reviews');
          
          json.forEach(review => {
            store.put(review, review.id);
          }); 
        });
        return response.json();
      });
    });
  }
  /**
   * Map marker for a restaurant.
   */
  
  static mapMarkerForRestaurant(restaurant, map) {
    // https://leafletjs.com/reference-1.3.0.html#marker  

    const marker = new L.marker([restaurant.latlng.lat, restaurant.latlng.lng], 
      {
        title: restaurant.name,
        alt: restaurant.name,
        url: DBHelper.urlForRestaurant(restaurant)
      });
    marker.addTo(map);
    return marker;
  }
}