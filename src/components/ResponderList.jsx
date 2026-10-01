import React from 'react';
import { haversineMeters, formatDistance } from '../lib/geo';

/**
 * ResponderList - Displays a list of responders who have accepted the emergency.
 * Shows each responder's name, role (what they're doing), and live distance from the caller.
 * The distance is recalculated using the caller's current location and responder's location.
 *
 * @param {Object} props
 * @param {Array} props.responders - Array of responder objects from Firestore
 * @param {{lat: number, lng: number}} props.callerLocation - Caller's current GPS location
 */
export default function ResponderList({ responders, callerLocation }) {
  if (!responders || responders.length === 0) {
    return null;
  }

  const getRoleLabel = (role) => {
    if (role === 'aed') {
      return 'Fetching AED / first-aid kit';
    }
    return 'Coming to you';
  };

  return (
    <div className="space-y-3">
      {responders.map((responder, index) => {
        // Calculate live distance if both locations are available
        let distanceText = 'Unknown distance';
        if (callerLocation && responder.location) {
          const distance = haversineMeters(callerLocation, responder.location);
          distanceText = formatDistance(distance);
        } else if (responder.distanceM) {
          // Fallback to stored distance if live calculation not possible
          distanceText = formatDistance(responder.distanceM);
        }

        return (
          <div
            key={`${responder.uid}-${index}`}
            className="bg-bg-card rounded-xl p-4 border border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-white">{responder.name}</h3>
                <p className="text-sm text-gray-400">{getRoleLabel(responder.role)}</p>
              </div>
              <div className="text-right">
                <div className="text-emergency font-bold">{distanceText}</div>
                <div className="text-xs text-gray-500">away</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
