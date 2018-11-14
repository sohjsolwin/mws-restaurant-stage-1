
/* global DBHelper:false, L:false */
/* eslint-disable no-console */

/* eslint-disable no-unused-vars*/
let restaurant;
/* eslint-enable no-unused-vars*/
var newMap;

/**
 * Initialize map as soon as the page is loaded.
 */
document.addEventListener('DOMContentLoaded', () => {  
  initMap();
});
  
/**
 * Initialize leaflet map
 */
let initMap = () => {
  fetchRestaurantFromURL()
    .then((restaurant) => {    
      self.newMap = L.map('map', {
        center: [restaurant.latlng.lat, restaurant.latlng.lng],
        zoom: 16,
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
      fillBreadcrumb();
      DBHelper.mapMarkerForRestaurant(self.restaurant, self.newMap);
    })
    .catch(error => console.error(error));
}; 

/**
 * Get current restaurant from page URL.
 */
let fetchRestaurantFromURL = () => {
  if (self.restaurant) { // restaurant already fetched!
    return Promise.resolve(self.restaurant);
  }
  const id = getParameterByName('id');
  if (!id) { // no id found in URL
    return Promise.reject('No restaurant id in URL');
  } else {
    return DBHelper.fetchRestaurantById(id)
      .then((restaurant) => {
        self.restaurant = restaurant;
        if (!restaurant) {
          return Promise.reject('No restaurant found');
        }
        fillRestaurantHTML();
        return restaurant;
      })
      .catch(error => console.error(error));
  }
};

/**
 * Create restaurant HTML and add it to the webpage
 */
let fillRestaurantHTML = (restaurant = self.restaurant) => {
  const name = document.getElementById('restaurant-name');
  name.innerHTML = restaurant.name;

  const address = document.getElementById('restaurant-address');
  address.innerHTML = restaurant.address;

  const image = document.getElementById('restaurant-img');
  image.className = 'restaurant-img';
  image.setAttribute('alt', `Food from the ${restaurant.name} restaurant`);
  image.src = DBHelper.imageUrlForRestaurant(restaurant);
  image.setAttribute('onerror', DBHelper.imageUrlFallbackForRestaurant(restaurant));
  const cuisine = document.getElementById('restaurant-cuisine');
  cuisine.innerHTML = restaurant.cuisine_type;

  // fill operating hours
  if (restaurant.operating_hours) {
    fillRestaurantHoursHTML();
  }
  // fill reviews
  fillReviewsHTML();
};

/**
 * Create restaurant operating hours HTML table and add it to the webpage.
 */
let fillRestaurantHoursHTML = (operatingHours = self.restaurant.operating_hours) => {
  const hours = document.getElementById('restaurant-hours');
  for (let key in operatingHours) {
    const row = document.createElement('tr');

    const day = document.createElement('td');
    day.innerHTML = key;
    row.appendChild(day);

    const time = document.createElement('td');
    time.innerHTML = operatingHours[key];
    row.appendChild(time);

    hours.appendChild(row);
  }
};

/**
 * Create all reviews HTML and add them to the webpage.
 */
let fillReviewsHTML = (reviews = self.restaurant.reviews) => {
  const container = document.getElementById('reviews-container');
  const title = document.createElement('h2');
  title.innerHTML = 'Reviews';
  container.appendChild(title);

  if (!reviews) {
    const noReviews = document.createElement('p');
    noReviews.appendChild(createReviewFormHTML());
    container.appendChild(noReviews);
    return;
  }
  const ul = document.getElementById('reviews-list');
  reviews.forEach(review => {
    ul.appendChild(createReviewHTML(review));
  });

  ul.appendChild(createReviewFormHTML());

  container.appendChild(ul);
};

/**
 * Create review HTML and add it to the webpage.
 */
let createReviewHTML = (review) => {
  const li = document.createElement('li');
  const name = document.createElement('p');
  name.innerHTML = review.name;
  li.appendChild(name);

  const date = document.createElement('p');
  date.innerHTML = new Date(review.createdAt).toDateString();
  li.appendChild(date);

  const rating = document.createElement('p');
  rating.className = `stars-${review.rating}`;
  rating.innerHTML = 'Rating: ';
  li.appendChild(rating);

  const comments = document.createElement('p');
  comments.innerHTML = review.comments;
  li.appendChild(comments);

  return li;
};

let createReviewFormHTML = () => {
  const li = document.createElement('li');
  li.classList.add('user-review');
  const name = document.createElement('p');
  name.classList.add('user-review');
  
  name.setAttribute('aria-label', 'Add your review');
  name.innerText = 'Your';
  li.appendChild(name);

  const nameDiv = document.createElement('div');
  const nameLabel = document.createElement('label');
  nameLabel.classList.add('user-name-label');
  nameLabel.setAttribute('for', 'user-name-input');
  nameLabel.innerText = 'Name';
  nameLabel.setAttribute('aria-label', 'Your Name');
  nameDiv.appendChild(nameLabel);

  const nameinput = document.createElement('input');
  nameinput.id = 'user-name-input';
  nameinput.name = 'user-name-input';
  nameinput.setAttribute('type', 'text');
  nameinput.setAttribute('placeholder', 'Your name here');
  nameinput.setAttribute('aria-label', 'Your Name');
  nameinput.classList.add('user-name-input');
  nameDiv.appendChild(nameinput);
  li.appendChild(nameDiv);

  const ratingDiv = document.createElement('div');
  ratingDiv.setAttribute('aria-labelledby', 'user-rating-label');
  const ratingLabel = document.createElement('label');
  ratingLabel.classList.add('user-rating-label');
  ratingLabel.setAttribute('for', 'user-rating-input');
  ratingLabel.innerText = 'Rating';
  ratingDiv.appendChild(ratingLabel);

  for (var i=1;i<=5;i++) {
    const ratingItemLabel = document.createElement('label');
    ratingItemLabel.classList.add(`stars-${i}`);
    ratingItemLabel.classList.add('radio-inline');
    ratingItemLabel.setAttribute('for', `rating-${i}`);
    ratingItemLabel.innerText = '';
    

    const ratingInput = document.createElement('input');
    ratingInput.setAttribute('type', 'radio');
    ratingInput.setAttribute('aria-label', `${i} stars`);
    ratingInput.name='ratings';
    ratingInput.id=`rating-${i}`;
    ratingInput.setAttribute('value', `${i}`);

    ratingItemLabel.appendChild(ratingInput);
    ratingDiv.appendChild(ratingItemLabel);
  }

  li.appendChild(ratingDiv);

  const commentDiv = document.createElement('div');
  const commentLabel = document.createElement('label');
  commentLabel.classList.add('user-comment-label');
  commentLabel.setAttribute('for', 'user-comment-input');
  commentLabel.setAttribute('aria-label', 'Your Comments');
  commentLabel.innerText = 'Comments';
  commentDiv.appendChild(commentLabel);

  const commentinput = document.createElement('textarea');
  commentinput.id = 'user-comment-input';
  commentinput.name = 'user-comment-input';
  commentinput.setAttribute('aria-label', 'Your Comments');
  commentinput.classList.add('user-comment-input');
  commentDiv.appendChild(commentinput);
  li.appendChild(commentDiv);

  const submitDiv = document.createElement('div');
  const submitButton = document.createElement('a');
  submitButton.href = '#';
  submitButton.onclick = addNewReview;
  submitButton.innerHTML = 'Add your review';
  submitButton.setAttribute('aria-label', 'Submit your review');
  submitDiv.appendChild(submitButton);
  li.appendChild(submitDiv);
  return li;
};

let addNewReview = () => {
  //TODO: Inject review before li.user-review;
  let userName = document.querySelector('input[name="user-name-input"]').value;
  let userRating = document.querySelector('input[name="ratings"]:checked').value;
  let userComments = document.querySelector('textarea[name="user-comment-input"]').value;

  DBHelper.storeRestaurantReview(self.restaurant.id, userName, userRating, userComments)
    .then(response => {
      if (response) {
        location.reload();
      } else {
        alert('Something went wrong while saving your review. Please try again.');
      }
    });
};
/**
 * Add restaurant name to the breadcrumb navigation menu
 */
let fillBreadcrumb = (restaurant = self.restaurant) => {
  const breadcrumb = document.getElementById('breadcrumb');
  const li = document.createElement('li');
  li.innerHTML = restaurant.name;
  li.setAttribute('aria-current', 'page');
  breadcrumb.appendChild(li);
};

/**
 * Get a parameter by name from page URL.
 */
let getParameterByName = (name, url) => {
  if (!url)
    url = window.location.href;
  name = name.replace(/[[\]]/g, '\\$&');
  const regex = new RegExp(`[?&]${name}(=([^&#]*)|&|#|$)`),
    results = regex.exec(url);
  if (!results)
    return null;
  if (!results[2])
    return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
};

document.addEventListener('DOMContentLoaded', () => { 
  document.body.ononline = () => DBHelper._syncCache();
});