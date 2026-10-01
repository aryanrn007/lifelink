import { db } from './firebase';
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  onSnapshot,
  serverTimestamp,
  arrayUnion
} from 'firebase/firestore';

/**
 * Create a new emergency document in Firestore.
 * This is called when a user triggers the SOS button after selecting an emergency type.
 * We use serverTimestamp() for consistent time across all clients and to handle timezone issues.
 *
 * @param {Object} data - Emergency data
 * @param {string} data.uid - User's unique ID from Firebase Auth
 * @param {string} data.name - User's display name
 * @param {string} data.collegeId - User's college ID (helps deter prank alerts)
 * @param {string} data.type - Emergency type (cardiac, choking, bleeding, etc.)
 * @param {{lat: number, lng: number}} data.location - GPS coordinates
 * @returns {Promise<string>} The new document ID
 */
export const createEmergency = async ({ uid, name, collegeId, type, location }) => {
  const emergenciesRef = collection(db, 'emergencies');
  const docRef = await addDoc(emergenciesRef, {
    callerUid: uid,
    callerName: name,
    callerCollegeId: collegeId,
    type,
    status: 'open',
    location,
    radiusM: 500,
    createdAt: serverTimestamp(),
    expandedAt: serverTimestamp(),
    responders: []
  });
  return docRef.id;
};

/**
 * Subscribe to real-time updates for a specific emergency.
 * Uses Firestore's onSnapshot for real-time sync, which is critical for emergency scenarios
 * where responders need to see status changes immediately.
 *
 * @param {string} id - Emergency document ID
 * @param {Function} callback - Callback function called with (error, snapshot, data)
 * @returns {Function} Unsubscribe function to stop listening
 */
export const subscribeToEmergency = (id, callback) => {
  const emergencyRef = doc(db, 'emergencies', id);
  return onSnapshot(
    emergencyRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(null, snapshot, snapshot.data());
      } else {
        callback(new Error('Emergency not found'), null, null);
      }
    },
    (error) => callback(error, null, null)
  );
};

/**
 * Update the caller's location in the emergency document.
 * This is called periodically (every 10s) while the emergency is active so responders
 * can track the caller's movement if they're on the way. This is important for mobile
 * callers who might be moving toward a safer location.
 *
 * @param {string} id - Emergency document ID
 * @param {{lat: number, lng: number}} location - New GPS coordinates
 * @returns {Promise<void>}
 */
export const updateCallerLocation = async (id, location) => {
  const emergencyRef = doc(db, 'emergencies', id);
  await updateDoc(emergencyRef, { location });
};

/**
 * Cancel an emergency by setting its status to "cancelled".
 * This allows the caller to cancel if the situation resolves or was triggered accidentally.
 * Cancelled emergencies should still be visible to responders so they know not to respond.
 *
 * @param {string} id - Emergency document ID
 * @returns {Promise<void>}
 */
export const cancelEmergency = async (id) => {
  const emergencyRef = doc(db, 'emergencies', id);
  await updateDoc(emergencyRef, { status: 'cancelled' });
};

/**
 * Mark an emergency as resolved by setting its status to "resolved".
 * This is called when the caller confirms they are safe or the situation has been handled.
 * Resolved emergencies help track successful responses and provide data for analytics.
 *
 * @param {string} id - Emergency document ID
 * @returns {Promise<void>}
 */
export const resolveEmergency = async (id) => {
  const emergencyRef = doc(db, 'emergencies', id);
  await updateDoc(emergencyRef, { status: 'resolved' });
};

/**
 * DEBUG ONLY: Simulate a responder accepting the emergency.
 * This function is only used when ?debug=1 is in the URL to test the UI before
 * Phase 3 (real responder logic) is implemented. It adds a fake responder to the
 * emergency document and sets the status to "accepted".
 *
 * @param {string} id - Emergency document ID
 * @param {Object} callerLocation - Caller's current location for demo purposes
 * @returns {Promise<void>}
 */
export const debugSimulateResponderAccept = async (id, callerLocation) => {
  const emergencyRef = doc(db, 'emergencies', id);
  await updateDoc(emergencyRef, {
    responders: arrayUnion({
      uid: 'demo1',
      name: 'Demo Volunteer',
      role: 'patient',
      distanceM: 240,
      acceptedAt: Date.now(),
      location: {
        lat: callerLocation.lat + 0.002,
        lng: callerLocation.lng
      }
    }),
    status: 'accepted'
  });
};
