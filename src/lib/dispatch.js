import { haversineMeters } from './geo';

/**
 * Check if a responder is eligible to respond to an emergency based on distance.
 * This is a pure function with no Firebase calls, making it fast and testable.
 * It simply checks if the responder is within the emergency's search radius.
 *
 * Phase 4 will extend this with nearest-3 selection and radius expansion logic
 * to prioritize the closest responders and expand the search if no one is available.
 *
 * @param {{lat: number, lng: number}} responderLocation - Responder's GPS coordinates
 * @param {Object} emergency - Emergency object from Firestore
 * @param {{lat: number, lng: number}} emergency.location - Emergency GPS coordinates
 * @param {number} emergency.radiusM - Search radius in meters
 * @returns {boolean} True if responder is within the emergency's radius
 */
export const isEligible = (responderLocation, emergency) => {
  if (!responderLocation || !emergency?.location || !emergency?.radiusM) {
    return false;
  }

  const distance = haversineMeters(responderLocation, emergency.location);
  return distance <= emergency.radiusM;
};
