mapboxgl.accessToken = 'pk.eyJ1IjoiZWxseWpheSIsImEiOiJjbHVvN2Zzbm8xdnNvMmtsaDBlYXp1YnIyIn0.P6K-WT8gt6maWr8x_28U8A';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/navigation-night-v1',
    center: [124.88766909176402, 6.948867498551588],
    zoom: 13
});

function toggleSidebar() {
    var sidebar = document.getElementById('sidebar');
    var menuIcon = document.getElementById('menu-icon');

    sidebar.classList.toggle('active');
    if (sidebar.classList.contains('active')) {
        menuIcon.innerHTML = '&#10005;'; // Change to "X" icon
    } else {
        menuIcon.innerHTML = '&#9776;'; // Change back to menu icon
    }
}

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

           
            currentRoute = route.name;
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
            var routeDuration = routeData.duration;
        
        
            return adjustDurationWithHistoricalTraffic(currentRoute, routeDuration)
                .then(adjustedDuration => {
                    var eta = calculateETA(adjustedDuration);

                    console.log('Check:', adjustedDuration);

                    var etaDisplay = document.getElementById('etaDisplay');
                    etaDisplay.textContent = 'ETA: ' + eta;

                    var speedDisplay = document.getElementById('speedDisplay');
                    speedDisplay.textContent = 'Speed: ' + speed + ' km/h';
                });
        })
        .catch(error => {
            console.error('Error calculating real-time ETA:', error);
        });
}


function adjustDurationWithHistoricalTraffic(currentRoute, routeDuration) {
  
    return getHistoricalTrafficDataForRouteAndTime(currentRoute, routeDuration, new Date())
        .then(historicalTrafficData => {
            return routeDuration * ((historicalTrafficData * 60) / routeDuration);
          
        });
        
}

function mapRouteNameToIndex(currentRoute) {
    switch (currentRoute) {
        case 'Carmen - Mlang':
            return 'Route1';
        case 'Mlang - Carmen':
            return 'Route2';
        case 'Kidapawan - Koronadal':
            return 'Route3';
        case 'Cotabato - Davao':
            return 'Route4';
        // Add more cases as needed for other route names
        default:
            return null; // Return null if the route name doesn't match any mapping
    }
}

function getHistoricalTrafficDataForRouteAndTime(currentRoute, routeDuration, currentTime) {
    const routeIndex = mapRouteNameToIndex(currentRoute);
    if (!routeIndex) {
        console.error('Route not found:', currentRoute);
        return Promise.reject('Route not found');
    }
    
    const hour = currentTime.getHours();
    const day = currentTime.getDay();

    const data = {
        Route: routeIndex,
        Hour_of_the_Day: hour,
        Day_of_the_Week: day
    };

    console.log('Sending data to server:', data);

    return fetch('http://localhost:5000/predict', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) {
            throw new Error('Network response was not ok ' + response.statusText);
        }
        return response.json();
    })
    .then(data => {
        console.log('Received data from server:', data);
        return data.travelTime; // Assuming the prediction contains travel time in minutes
        
    })
    .catch(error => {
        console.error('Error fetching historical traffic data:', error);
        return routeDuration/60; // Default to original duration if there's an error
    });
}



// function getHistoricalTrafficDataForRouteAndTime(currentTime) {
//     var trafficFactor = 1.2; // Default factor for off-peak hours

//     var hour = currentTime.getHours();
//     var day = currentTime.getDay();

//     if (hour >= 7 && hour <= 9) {
//         trafficFactor = 1.4; // Morning rush hour
//     } else if (hour >= 17 && hour <= 19) {
//         trafficFactor = 1.6; // Evening rush hour
//     } else if (day === 0 || day === 6) {
//         trafficFactor = 1.3; // Weekends
//     }

//     return { trafficFactor: trafficFactor };
// }


function calculateETA(routeDuration) {
    var totalMinutes = Math.round(routeDuration / 60);
    var hours = Math.floor(totalMinutes / 60);
    var minutes = totalMinutes % 60;
    
    if (hours > 0) {
        return hours + ' hour ' + minutes + ' minutes';
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
