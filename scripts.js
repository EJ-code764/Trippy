mapboxgl.accessToken = 'pk.eyJ1IjoiZWxseWpheSIsImEiOiJjbHVvN2Zzbm8xdnNvMmtsaDBlYXp1YnIyIn0.P6K-WT8gt6maWr8x_28U8A';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/navigation-night-v1',
    center: [124.88766909176402, 6.948867498551588],
    zoom: 13
});

map.addControl(
    new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
    })
);

const config = {
    apiKey: "AIzaSyDxa85bLn8OYo4HkHJdiSCuR-E8tZ0EN4M",
    authDomain: "drivers-app-3a151.firebaseapp.com",
    databaseURL: "https://drivers-app-3a151-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "drivers-app-3a151",
    storageBucket: "drivers-app-3a151.appspot.com",
    messagingSenderId: "443010735986",
    appId: "1:443010735986:web:777bfa2f260753414dc7eb",
    measurementId: "G-E1X96H3TZ2"
};

firebase.initializeApp(config);

var dbRef = firebase.database().ref().child('drivers');
var routesRef = firebase.database().ref().child('bus_routes');

var markers = [];
var currentRoute = null;
var currentDriverId = null;
var currentDestination = null;

routesRef.on('value', function(snapshot) {
    var busRoutesList = document.getElementById('busRoutesList');
    busRoutesList.innerHTML = ''; 

    snapshot.forEach(function(childSnapshot) {
        var route = childSnapshot.val();
        var routeId = childSnapshot.key;

        var listItem = document.createElement('li');
        listItem.textContent = route.name;
        listItem.dataset.routeId = routeId;

        listItem.addEventListener('click', function() {
            showRouteOnMap(route, routeId);
        });

        busRoutesList.appendChild(listItem);
    });
});

function showRouteOnMap(route, routeId) {
    
    if (map.getLayer('route')) {
        map.removeLayer('route');
    }
    if (map.getSource('route')) {
        map.removeSource('route');
    }

    
    var directionsRequest = 'https://api.mapbox.com/directions/v5/mapbox/driving/' + route.origin.longitude + ',' + route.origin.latitude + ';' + route.destination.longitude + ',' + route.destination.latitude + '?steps=true&geometries=geojson&access_token=' + mapboxgl.accessToken;

    fetch(directionsRequest)
        .then(response => response.json())
        .then(data => {
            var routeData = data.routes[0];

          
            map.addSource('route', {
                'type': 'geojson',
                'data': {
                    'type': 'Feature',
                    'geometry': routeData.geometry
                }
            });

            map.addLayer({
                'id': 'route',
                'type': 'line',
                'source': 'route',
                'layout': {
                    'line-join': 'round',
                    'line-cap': 'round'
                },
                'paint': {
                    'line-color': '#ADD8E6',
                    'line-width': 8
                }
            });

           
            const bounds = new mapboxgl.LngLatBounds(
                [route.origin.longitude, route.origin.latitude],
                [route.destination.longitude, route.destination.latitude]
            );
            map.fitBounds(bounds, { padding: 50 });

           
            currentRoute = route;
            currentDriverId = route.driver_id;
            currentDestination = route.destination;

           
            checkForActiveBuses(currentDriverId, currentDestination);
        });
}

function checkForActiveBuses(driverId, destination) {
    dbRef.orderByKey().equalTo(driverId).on('value', function(snapshot) {
        snapshot.forEach(function(childSnapshot) {
            var driver = childSnapshot.val();
            if (driver.isSharingLocation && driver.latitude && driver.longitude) {
               
                calculateRealtimeETA([driver.longitude, driver.latitude], [destination.longitude, destination.latitude], driver.speed);

              
                childSnapshot.ref.on('value', function(driverSnapshot) {
                    var updatedDriver = driverSnapshot.val();
                    if (updatedDriver.isSharingLocation && updatedDriver.latitude && updatedDriver.longitude) {
                        calculateRealtimeETA([updatedDriver.longitude, updatedDriver.latitude], [destination.longitude, destination.latitude], updatedDriver.speed);
                    }
                });
            }
        });
    });
}

function calculateRealtimeETA(driverCoords, destinationCoords, speed) {
    var directionsRequest = 'https://api.mapbox.com/directions/v5/mapbox/driving/' + driverCoords[0] + ',' + driverCoords[1] + ';' + destinationCoords[0] + ',' + destinationCoords[1] + '?steps=true&geometries=geojson&access_token=' + mapboxgl.accessToken;

    fetch(directionsRequest)
        .then(response => response.json())
        .then(data => {
            var routeData = data.routes[0];
            var eta = calculateETA(routeData.duration);

            var etaDisplay = document.getElementById('etaDisplay');
            etaDisplay.textContent = 'ETA: ' + eta;

            var speedDisplay = document.getElementById('speedDisplay');
            speedDisplay.textContent = 'Speed: ' + speed + ' km/h';
        });
}

function calculateETA(routeDuration) {
    var totalMinutes = Math.round(routeDuration / 60);
    var hours = Math.floor(totalMinutes / 60);
    var minutes = totalMinutes % 60;
    
    if (hours > 0) {
        return hours + ' hours ' + minutes + ' minutes';
    } else {
        return minutes + ' minutes';
    }
}


dbRef.on('value', function(snapshot) {
  
    markers.forEach(marker => marker.remove());
    markers = [];

   
    snapshot.forEach(function(childSnapshot) {
        var driver = childSnapshot.val();
        if (driver.isSharingLocation && driver.latitude && driver.longitude) {
          
            var el = document.createElement('div');
            el.className = 'marker';
            el.style.backgroundImage = 'url(bus-icon3.png)';
            el.style.backgroundSize = '100%';

            var newMarker = new mapboxgl.Marker(el)
                .setLngLat([driver.longitude, driver.latitude])
                .addTo(map);
            markers.push(newMarker); 
        }
    });
});

document.getElementById('sidebarToggle').addEventListener('click', function() {
    var sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('show');
});
