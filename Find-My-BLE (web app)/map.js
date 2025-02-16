// Initialize the map centered on Egypt
const map = L.map("map").setView([26.8206, 30.8025], 6);

// Add OpenStreetMap tiles
L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
}).addTo(map);

// Define marker icons
const markerIcons = {
  active: L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: #4CAF50; width: 12px; height: 12px; border-radius: 50%; border: 1px solid #666;"></div>`,
    iconSize: [12, 12],
  }),
  inactive: L.divIcon({
    className: "custom-marker",
    html: `<div style="background-color: #f44336; width: 12px; height: 12px; border-radius: 50%; border: 1px solid #666;"></div>`,
    iconSize: [12, 12],
  }),
};

// Create marker group
const markerGroup = L.layerGroup().addTo(map);

// Update markers function
function updateMarkers(locations) {
  markerGroup.clearLayers();
  locations.forEach((location) => {
    const marker = L.marker([location.latitude, location.longitude], {
      icon: location.isActive ? markerIcons.active : markerIcons.inactive,
    }).bindPopup(location.name);
    markerGroup.addLayer(marker);
  });
}

// Fetch and display locations
async function fetchAndDisplayLocations() {
  const loadingElement = document.getElementById("loading");
  const errorElement = document.getElementById("error");

  try {
    loadingElement.style.display = "block";
    errorElement.style.display = "none";

    // Update endpoint to match new API
    const response = await fetch("http://localhost:5000/api/itag_data");
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

    const result = await response.json();
    const locations = result.data.map((item) => ({
      name: item.deviceId,
      latitude: item.latitude,
      longitude: item.longitude,
      isActive: item.state === "active",
    }));

    // Update counts
    const activeCount = locations.filter((l) => l.isActive).length;
    document.getElementById("activeCount").textContent = activeCount;
    document.getElementById("inactiveCount").textContent =
      locations.length - activeCount;

    // Update lists
    document.getElementById("activeLocations").innerHTML = locations
      .filter((l) => l.isActive)
      .map((l) => `<div>${l.name}</div>`)
      .join("");
    document.getElementById("inactiveLocations").innerHTML = locations
      .filter((l) => !l.isActive)
      .map((l) => `<div>${l.name}</div>`)
      .join("");

    updateMarkers(locations);

    // Fit bounds
    if (locations.length > 0) {
      const bounds = L.latLngBounds(
        locations.map((loc) => [loc.latitude, loc.longitude])
      );
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    loadingElement.style.display = "none";
  } catch (error) {
    console.error("Error:", error);
    loadingElement.style.display = "none";
    errorElement.style.display = "block";
    errorElement.querySelector("p").textContent =
      "Failed to load iTAG locations. Please check if the server is running.";
  }
}

// Toggle location list
function toggleLocationList(type) {
  document.getElementById(`${type}Locations`).classList.toggle("show");
}

// Initialize
document.addEventListener("DOMContentLoaded", fetchAndDisplayLocations);
