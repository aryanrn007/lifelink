import React from 'react';
import { haversineMeters, formatDistance } from '../lib/geo';

// Emergency type icons for quick visual identification
const EMERGENCY_ICONS = {
  cardiac: '💓',
  choking: '🫁',
  bleeding: '🩸',
  accident: '🚗',
  burn: '🔥',
  other: '🆘'
};

/**
 * AlertOverlay - Full-screen red pulsing overlay for emergency alerts.
 * Shows when a responder is eligible to respond to an emergency. The pulsing
 * animation creates urgency and draws attention to the alert. Displays emergency
 * type, distance, caller name, and action buttons.
 *
 * @param {Object} props
 * @param {Object} props.emergency - Emergency object from Firestore
 * @param {{lat: number, lng: number}} props.responderLocation - Responder's current location
 * @param {Function} props.onAccept - Callback when ACCEPT button is pressed
 * @param {Function} props.onDismiss - Callback when "Can't make it" is pressed
 */
export default function AlertOverlay({ emergency, responderLocation, onAccept, onDismiss }) {
  const getDistance = () => {
    if (!responderLocation || !emergency?.location) {
      return 'Unknown';
    }
    const distance = haversineMeters(responderLocation, emergency.location);
    return formatDistance(distance);
  };

  return (
    <div className="fixed inset-0 bg-emergency/95 flex items-center justify-center z-50 p-6">
      {/* Pulsing animation background */}
      <div className="absolute inset-0 bg-emergency animate-pulse opacity-20"></div>
      
      <div className="relative z-10 w-full max-w-md">
        <div className="bg-bg-dark rounded-2xl p-6 border-4 border-white shadow-2xl">
          {/* Emergency type icon */}
          <div className="text-center mb-4">
            <span className="text-7xl">
              {EMERGENCY_ICONS[emergency?.type] || EMERGENCY_ICONS.other}
            </span>
          </div>

          {/* Emergency type text */}
          <h2 className="text-3xl font-bold text-white text-center mb-2 capitalize">
            {emergency?.type || 'Emergency'}
          </h2>

          {/* Distance */}
          <div className="text-center mb-4">
            <span className="text-emergency text-2xl font-bold">{getDistance()}</span>
            <span className="text-gray-300 ml-2">away</span>
          </div>

          {/* Caller name */}
          <div className="text-center mb-6">
            <p className="text-gray-400 text-sm">Caller: {emergency?.callerName || 'Unknown'}</p>
          </div>

          {/* Action buttons */}
          <div className="space-y-3">
            <button
              onClick={onAccept}
              className="w-full py-4 bg-green-600 text-white font-bold text-xl rounded-xl hover:bg-green-700 transition-colors min-h-[56px]"
            >
              ACCEPT
            </button>
            
            <button
              onClick={onDismiss}
              className="w-full py-3 bg-gray-700 text-gray-300 font-semibold rounded-xl hover:bg-gray-600 transition-colors"
            >
              Can't make it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
