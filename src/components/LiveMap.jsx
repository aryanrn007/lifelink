import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import L from 'leaflet';

// Fix Leaflet default marker icon URLs for Vite
// Vite's asset handling doesn't work with Leaflet's default icon paths,
// so we need to manually set the icon URLs to the CDN versions.
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

/**
 * MapBounds - Component to auto-fit map bounds to include all markers.
 * This ensures the caller and all responders are visible on the map.
 * Also calls invalidateSize() to fix blank/grey map issues when the map
 * renders in a container that was previously hidden or had zero height.
 *
 * @param {Object} props
 * @param {Array} props.positions - Array of [lat, lng] positions to fit
 */
function MapBounds({ positions }) {
  const map = useMap();

  useEffect(() => {
    // Fix blank/grey map by invalidating size when component mounts
    map.invalidateSize();
    
    if (positions && positions.length > 0) {
      const bounds = L.latLngBounds(positions);
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 16 });
    }
  }, [positions, map]);

  return null;
}

/**
 * LiveMap - Displays a map with caller and responder markers.
 * Uses OpenStreetMap tiles (free, no API key required). The map auto-fits
 * to show all markers and has a fixed height of 40vh as specified.
 *
 * @param {Object} props
 * @param {{lat: number, lng: number}} props.callerLocation - Caller's GPS location
 * @param {Array} props.responders - Array of responder objects with location data
 */
export default function LiveMap({ callerLocation, responders }) {
  if (!callerLocation) {
    return (
      <div className="h-[40vh] bg-bg-card rounded-xl flex items-center justify-center border border-gray-700">
        <p className="text-gray-400">Waiting for location...</p>
      </div>
    );
  }

  // Build positions array for auto-fitting bounds
  const positions = [[callerLocation.lat, callerLocation.lng]];

  // Add responder positions if they have location data
  responders?.forEach((responder) => {
    if (responder.location) {
      positions.push([responder.location.lat, responder.location.lng]);
    }
  });

  // Custom icon for caller (red)
  const callerIcon = new L.Icon({
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
    className: 'caller-marker'
  });

  // Custom icon for responders (blue)
  const responderIcon = new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41]
  });

  return (
    <div className="h-[40vh] rounded-xl overflow-hidden border border-gray-700">
      <MapContainer
        center={[callerLocation.lat, callerLocation.lng]}
        zoom={16}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Caller marker */}
        <Marker
          position={[callerLocation.lat, callerLocation.lng]}
          icon={callerIcon}
        />
        
        {/* Responder markers */}
        {responders?.map((responder, index) =>
          responder.location ? (
            <Marker
              key={`${responder.uid}-${index}`}
              position={[responder.location.lat, responder.location.lng]}
              icon={responderIcon}
            />
          ) : null
        )}
        
        {/* Auto-fit bounds */}
        <MapBounds positions={positions} />
      </MapContainer>
    </div>
  );
}
