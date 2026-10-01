// Geographic utility functions for LifeLink
// This module contains Haversine distance calculations and other geo helpers
// for finding nearby volunteers based on latitude/longitude coordinates

/**
 * Calculate the great-circle distance between two points on Earth using the Haversine formula.
 * This is the most accurate method for calculating distances on a sphere and gives us
 * the straight-line distance between two GPS coordinates in meters.
 *
 * Formula: a = sin²(Δφ/2) + cos φ1 ⋅ cos φ2 ⋅ sin²(Δλ/2)
 *          c = 2 ⋅ atan2( √a, √(1−a) )
 *          d = R ⋅ c
 * Where φ is latitude, λ is longitude, R is Earth's radius (6371 km)
 *
 * @param {{lat: number, lng: number}} a - First point with lat/lng
 * @param {{lat: number, lng: number}} b - Second point with lat/lng
 * @returns {number} Distance in meters
 */
export const haversineMeters = (a, b) => {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (a.lat * Math.PI) / 180;
  const φ2 = (b.lat * Math.PI) / 180;
  const Δφ = ((b.lat - a.lat) * Math.PI) / 180;
  const Δλ = ((b.lng - a.lng) * Math.PI) / 180;

  const a_hav = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
               Math.cos(φ1) * Math.cos(φ2) *
               Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a_hav), Math.sqrt(1 - a_hav));

  return R * c;
};

/**
 * Format a distance in meters into a human-readable string.
 * Uses meters for distances under 1km, kilometers for larger distances.
 * This provides clear, contextual distance information for users.
 *
 * @param {number} meters - Distance in meters
 * @returns {string} Formatted distance string (e.g., "240 m" or "1.2 km")
 */
export const formatDistance = (meters) => {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }
  return `${(meters / 1000).toFixed(1)} km`;
};
