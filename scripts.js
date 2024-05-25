mapboxgl.accessToken = 'pk.eyJ1IjoiZWxseWpheSIsImEiOiJjbHVvN2Zzbm8xdnNvMmtsaDBlYXp1YnIyIn0.P6K-WT8gt6maWr8x_28U8A';
const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/navigation-night-v1',
    center: [124.88766909176402, 6.948867498551588],
    zoom: 13
});

// Add geolocate control to the map.
map.addControl(
    new mapboxgl.GeolocateControl({
        positionOptions: {
            enableHighAccuracy: true
        },
        trackUserLocation: true,
        showUserHeading: true
    })
);

// Initialize Firebase
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

// Initialize marker
var marker = new mapboxgl.Marker()
    .setLngLat([0, 0]) // Initial position
    .addTo(map);

// Reference to Firebase Realtime Database
var dbRef = firebase.database().ref().child('drivers');

// Create an empty array to store marker instances
var markers = [];

// Update location on the map every time the data changes
dbRef.on('value', function(snapshot) {
    // Clear existing markers
    markers.forEach(marker => marker.remove());
    markers = [];

    // Iterate over each driver in the snapshot
    snapshot.forEach(function(childSnapshot) {
        var driver = childSnapshot.val();
        if (driver.latitude && driver.longitude) {
            // Create a new marker for each driver using custom bus icon
            var el = document.createElement('div');
            el.className = 'marker';
            el.style.backgroundImage = 'url(bus-icon.png)';
        
            el.style.backgroundSize = '100%';

            var newMarker = new mapboxgl.Marker(el)
                .setLngLat([driver.longitude, driver.latitude])
                .addTo(map);
            markers.push(newMarker); // Add the marker instance to the array
        }
    });
});
