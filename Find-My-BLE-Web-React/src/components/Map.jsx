import { useEffect, useRef, useCallback } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useQuery } from '@tanstack/react-query';

const DEFAULT_CENTER = [26.8206, 30.8025];
const DEFAULT_ZOOM = 6;

// Helper function to format timestamp
const formatTimestamp = (timestamp) => {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  });
};

const Map = ({ onLocationUpdate }) => {
  const mapContainerRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerGroupRef = useRef(null);

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

  // Function to fit bounds
  const fitBounds = useCallback((locations) => {
    if (!mapInstanceRef.current || !locations || locations.length === 0) return;
    
    const bounds = L.latLngBounds(
      locations.map((loc) => [loc.latitude, loc.longitude])
    );
    mapInstanceRef.current.fitBounds(bounds, { padding: [50, 50] });
  }, []);

  // Initialize map (only once)
  useEffect(() => {
    if (!mapContainerRef.current || mapInstanceRef.current) return;

    // Initialize the map centered on Egypt
    const mapInstance = L.map(mapContainerRef.current, {
      center: DEFAULT_CENTER,
      zoom: DEFAULT_ZOOM,
      zoomControl: true,
      attributionControl: true
    });
    
    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(mapInstance);

    // Create marker group
    const markerGroup = L.layerGroup().addTo(mapInstance);

    // Add recenter control
    const RecenterControl = L.Control.extend({
      options: {
        position: 'topleft'
      },
      onAdd: function() {
        const container = L.DomUtil.create('div', 'leaflet-bar leaflet-control');
        const button = L.DomUtil.create('a', '', container);
        button.innerHTML = '⌖';
        button.title = 'Recenter map';
        button.style.fontSize = '18px';
        button.style.lineHeight = '30px';
        button.style.textAlign = 'center';
        button.style.fontWeight = 'bold';
        button.style.textDecoration = 'none';
        button.style.color = '#666';
        button.style.width = '30px';
        button.style.height = '30px';
        button.style.backgroundColor = 'white';
        button.style.cursor = 'pointer';
        button.style.display = 'block';
        
        L.DomEvent.on(button, 'click', function(e) {
          L.DomEvent.stopPropagation(e);
          L.DomEvent.preventDefault(e);
          fitBounds(lastLocationsRef.current);
        });
        
        return container;
      }
    });

    // Add the recenter control
    mapInstance.addControl(new RecenterControl());

    // Store references
    mapInstanceRef.current = mapInstance;
    markerGroupRef.current = markerGroup;

    // Force a resize to ensure proper rendering
    setTimeout(() => {
      mapInstance.invalidateSize();
    }, 100);

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
        markerGroupRef.current = null;
      }
    };
  }, []); // Empty dependency array means this only runs once on mount

  // Keep track of the last locations for the recenter button
  const lastLocationsRef = useRef([]);

  // Update markers function with enhanced popup
  const updateMarkers = useCallback((locations) => {
    if (!markerGroupRef.current || !mapInstanceRef.current) return;

    markerGroupRef.current.clearLayers();
    
    if (locations && locations.length > 0) {
      lastLocationsRef.current = locations;
      locations.forEach((location) => {
        const popupContent = `
          <div class="popup-content">
            <h3>${location.name}</h3>
            <div style="display: flex; align-items: center; margin: 8px 0;">
              <span class="status-indicator ${location.isActive ? 'active' : 'inactive'}"></span>
              <span style="color: ${location.isActive ? '#4CAF50' : '#f44336'}; font-weight: 500;">
                ${location.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            <p style="margin: 8px 0;">
              <strong>Last Updated:</strong><br/>
              ${formatTimestamp(location.timestamp)}
            </p>
            <p style="margin: 8px 0; font-family: monospace; font-size: 0.9em; background: #f5f5f5; padding: 4px 8px; border-radius: 4px;">
              [${location.latitude.toFixed(6)}, ${location.longitude.toFixed(6)}]
            </p>
          </div>
        `;

        const marker = L.marker([location.latitude, location.longitude], {
          icon: location.isActive ? markerIcons.active : markerIcons.inactive,
        }).bindPopup(popupContent, {
          maxWidth: 300,
          className: 'custom-popup',
          closeButton: false,
          autoPan: true,
          autoPanPadding: [50, 50]
        });
        
        markerGroupRef.current.addLayer(marker);
      });
    }
  }, []);

  // Fetch and display locations
  const { isLoading, isError } = useQuery({
    queryKey: ['locations'],
    queryFn: async () => {
      try {
        const response = await fetch("http://localhost:5000/api/itag_data");
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        const result = await response.json();
        const locations = result.data.map((item) => ({
          name: item.deviceId,
          latitude: item.latitude,
          longitude: item.longitude,
          isActive: item.state === "active",
          timestamp: item.timestamp
        }));

        onLocationUpdate(locations);
        updateMarkers(locations);
        return locations;
      } catch (error) {
        console.error("Error:", error);
        throw error;
      }
    },
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    staleTime: 0, // Always fetch fresh data
  });

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div 
        ref={mapContainerRef}
        style={{ 
          width: '100%', 
          height: '100%', 
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 1 
        }}
      />
      
      {/* Enhanced Loading Overlay */}
      <div 
        className={`overlay ${isLoading ? 'visible' : ''}`}
        style={{ 
          display: isLoading ? 'flex' : 'none',
          zIndex: 1000 
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <div className="loading-spinner" />
          <p style={{ marginTop: '16px', fontSize: '1.1em' }}>
            Updating locations...
          </p>
        </div>
      </div>

      {/* Enhanced Error Overlay */}
      <div 
        className={`overlay ${isError ? 'visible' : ''}`}
        style={{ 
          display: isError ? 'flex' : 'none',
          zIndex: 1000 
        }}
      >
        <div className="error-message bg-white p-6 rounded-lg shadow-lg text-center max-w-md">
          <div style={{ 
            color: '#f44336', 
            fontSize: '24px', 
            marginBottom: '16px' 
          }}>
            ⚠️
          </div>
          <h3 style={{ 
            color: '#333', 
            fontSize: '1.2em', 
            marginBottom: '12px' 
          }}>
            Connection Error
          </h3>
          <p style={{ 
            color: '#666', 
            marginBottom: '16px' 
          }}>
            Failed to load iTAG locations. Please check if the server is running.
          </p>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-all duration-200 transform hover:scale-105 active:scale-95"
          >
            Try Again
          </button>
        </div>
      </div>
    </div>
  );
};

export default Map; 