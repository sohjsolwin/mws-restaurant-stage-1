/* global DBHelper:false, L:false */
/* eslint-disable no-console */

/* eslint-disable no-unused-vars*/
let restaurants,
  neighborhoods,
  cuisines,
  markers = [];
/* eslint-enable no-unused-vars*/
var newMap;


function registerServiceWorker() {
  if (!navigator.serviceWorker) return;
  navigator.serviceWorker.register('sw.js').then(function(reg) {

    if (!navigator.serviceWorker.controller) return;

    if (reg.waiting) {
      //there's an update ready
      //indexController._updateReady(reg.waiting);
      return;
    }
    if (reg.installing) {
      //there's an update in progress
      //indexController._trackInstalling(reg.installing);
      return;
    }
    reg.addEventListener('updatefound', function() {
      //new update found. 
      //indexController._trackInstalling(reg.installing);
    });
  }).catch(function(error) {
    console.log('Registration failed!');
    console.log(error);
  });

  // Ensure refresh is only called once.
  // This works around a bug in "force update on reload".
  var refreshing;
  navigator.serviceWorker.addEventListener('controllerchange', function() {
    if (refreshing) return;
    refreshing = true;
    window.location.reload();
  });
}

registerServiceWorker();

document.getElementById('neighborhoods-select').addEventListener(
  'keydown', function(e) {
    var shiftKey = (window.event) ? event.shiftKey : e.shiftKey;
    var keycode = (window.event) ? event.keyCode : e.keyCode;
    if (shiftKey && keycode == 9)
    {
      document.getElementById('map').focus();
      e.preventDefault();
    }
  });

/**
 * Fetch neighborhoods and cuisines as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {
  initMap(); // added 
  fetchNeighborhoods();
  fetchCuisines();
});



/**
 * Fetch all neighborhoods and set their HTML.
 */
let fetchNeighborhoods = () => {
  DBHelper.fetchNeighborhoods()
    .then((neighborhoods) => {
      self.neighborhoods = neighborhoods;
    })
    .then(() => {
      fillNeighborhoodsHTML();
    })
    .catch(error => {
      console.error(error);
    });
};

/**
 * Set neighborhoods HTML.
 */
let fillNeighborhoodsHTML = (neighborhoods = self.neighborhoods) => {
  const select = document.getElementById('neighborhoods-select');
  neighborhoods.forEach(neighborhood => {
    const option = document.createElement('option');
    option.innerHTML = neighborhood;
    option.value = neighborhood;
    select.append(option);
  });
};

/**
 * Fetch all cuisines and set their HTML.
 */
let fetchCuisines = () => {
  DBHelper.fetchCuisines()
    .then((cuisines) => {
      self.cuisines = cuisines;
    })
    .then(() => {
      fillCuisinesHTML();
    })
    .catch(error => console.error(error));
};

/**
 * Set cuisines HTML.
 */
let fillCuisinesHTML = (cuisines = self.cuisines) => {
  const select = document.getElementById('cuisines-select');

  cuisines.forEach(cuisine => {
    const option = document.createElement('option');
    option.innerHTML = cuisine;
    option.value = cuisine;
    select.append(option);
  });
};

/**
 * Initialize leaflet map, called from HTML.
 */
let initMap = () => {
  var lat = 40.722216;
  var lng = -73.987501;
  self.newMap = L.map('map', {
    center: [lat, lng],
    zoom: 12,
    scrollWheelZoom: false
  });
  L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.jpg70?access_token={mapboxToken}', {
    mapboxToken: 'pk.eyJ1Ijoic29oanNvbHdpbiIsImEiOiJjamliaXM0ZjcxaW03M3dwYXRtODgzM2N6In0.dXsHJkmlbF2x9nxOoFrF_Q',
    maxZoom: 18,
    attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, ' +
      '<a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, ' +
      'Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
    id: 'mapbox.streets'
  }).addTo(newMap);

  /* https://www.visionaustralia.org/services/digital-access/resources/google-map */
  var map_canvas = document.getElementById('map');
  var hPan = Math.floor(map_canvas.offsetHeight/3);
  var wPan = Math.floor(map_canvas.offsetWidth/3);

  map_canvas.setAttribute('tabindex','0');

  map_canvas.addEventListener('focus', function(){this.style.outline = '2px solid #4D8FFD';});
  map_canvas.addEventListener('blur', function(){this.style.outline = '0';});

  map_canvas.addEventListener('keydown', function(ev){

    //exit if Ctrl or Alt is pressed
    //this allows users to scroll the page by pressing e.g. Ctrl + Arrow
    if(ev.ctrlKey || ev.altKey) return;

    var key = ev.key.toLowerCase();

    if(key==='+' || key=== 'add'){
      newMap.setZoom(newMap.getZoom() + 1);
    }else if(key==='-' || key==='subtract'){
      newMap.setZoom(newMap.getZoom() - 1);
    }else if(key==='arrowup' || key==='up'){
      newMap.panBy(0, wPan);
    }else if(key==='arrowdown' || key==='down'){
      newMap.panBy(0, -wPan);
    }else if(key==='arrowleft' || key==='left'){
      newMap.panBy(-hPan, 0);
    }else if(key==='arrowright' || key==='right'){
      newMap.panBy(hPan, 0);
    }else if(key==='escape' || key==='esc'){
      newMap.setZoom(5);
      newMap.setCenter({lat: lat, lng: lng});
    }else if(key=='tab'){
      if (ev.shiftKey) {
        document.getElementById('headerlink').focus();
      } else {
        document.getElementById('neighborhoods-select').focus();
      }
    }else{
      return;
    }
    ev.preventDefault();
  });


  updateRestaurants();
};

/**
 * Update page and map for current restaurants.
 */
let updateRestaurants = () => {
  const cSelect = document.getElementById('cuisines-select');
  const nSelect = document.getElementById('neighborhoods-select');

  const cIndex = cSelect.selectedIndex;
  const nIndex = nSelect.selectedIndex;

  const cuisine = cSelect[cIndex].value;
  const neighborhood = nSelect[nIndex].value;

  DBHelper.fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood)
    .then((restaurants) => {
      resetRestaurants(restaurants);
    })
    .then(() => fillRestaurantsHTML())
    .catch(error => console.error(error));
};

/**
 * Clear current restaurants, their HTML and remove their map markers.
 */
let resetRestaurants = (restaurants) => {
  // Remove all restaurants
  self.restaurants = [];
  const ul = document.getElementById('restaurants-list');
  ul.innerHTML = '';

  // Remove all map markers
  self.markers && self.markers.forEach(m => m.setMap(null));
  self.markers = [];
  self.restaurants = restaurants;
};

/**
 * Create all restaurants HTML and add them to the webpage.
 */
let fillRestaurantsHTML = (restaurants = self.restaurants) => {
  const ul = document.getElementById('restaurants-list');
  restaurants.forEach(restaurant => {
    ul.append(createRestaurantHTML(restaurant));
  });
  addMarkersToMap();
};

/**
 * Create restaurant HTML.
 */
let createRestaurantHTML = (restaurant) => {
  const li = document.createElement('li');

  const div = document.createElement('div');
  div.className = 'restaurant-chip';

  const image = document.createElement('img');
  image.className = 'restaurant-img';
  image.setAttribute('alt', `Overview image for the ${restaurant.name} restaurant`);
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.setAttribute('onerror', DBHelper.imageUrlFallbackForRestaurant(restaurant));
  div.append(image);

  const container = document.createElement('div');
  container.className = 'restaurant-details';

  const name = document.createElement('h2');
  name.innerHTML = restaurant.name;
  container.append(name);

  const neighborhood = document.createElement('p');
  neighborhood.innerHTML = restaurant.neighborhood;
  container.append(neighborhood);

  const address = document.createElement('p');
  address.innerHTML = restaurant.address;
  container.append(address);

  div.append(container);

  const more = document.createElement('a');
  more.innerHTML = 'View Details';
  more.setAttribute('aria-label', `View ${restaurant.name} Details`);
  more.className = 'restaurant-more-details';
  more.href = DBHelper.urlForRestaurant(restaurant);
  div.append(more);

  li.append(div);

  return li;
};

/**
 * Add markers for current restaurants to the map.
 */
let addMarkersToMap = (restaurants = self.restaurants) => {
  restaurants.forEach(restaurant => {
    // Add marker to the map
    const marker = DBHelper.mapMarkerForRestaurant(restaurant, self.newMap);
    marker.on('click', onClick);
    function onClick() {
      window.location.href = marker.options.url;
    }
  });
};