import React from 'react';
import { debugSimulateResponderAccept } from '../lib/emergencies';

/**
 * DebugSimulator - DEBUG ONLY component for testing the caller UI before Phase 3.
 * This component is only rendered when ?debug=1 is in the URL. It simulates a responder
 * accepting the emergency by adding a fake responder to the Firestore document.
 * This allows testing the responder list, map, and status banner without real responders.
 *
 * IMPORTANT: This is for development/testing only and should be removed or disabled
 * in production. The URL check provides a simple way to enable it without config changes.
 *
 * @param {Object} props
 * @param {string} props.emergencyId - Emergency document ID
 * @param {{lat: number, lng: number}} props.callerLocation - Caller's current location
 */
export default function DebugSimulator({ emergencyId, callerLocation }) {
  const handleSimulate = async () => {
    try {
      await debugSimulateResponderAccept(emergencyId, callerLocation);
      alert('Demo responder added! Check the responder list and map.');
    } catch (error) {
      console.error('Debug simulation failed:', error);
      alert('Failed to simulate responder: ' + error.message);
    }
  };

  return (
    <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
      <p className="text-xs text-yellow-400 mb-2 font-mono">DEBUG MODE ACTIVE</p>
      <button
        onClick={handleSimulate}
        className="w-full py-2 px-4 bg-yellow-500 text-black font-semibold rounded-lg text-sm hover:bg-yellow-400 transition-colors"
      >
        Simulate responder accepts
      </button>
    </div>
  );
}
