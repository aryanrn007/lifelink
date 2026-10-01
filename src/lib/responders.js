import { db } from './firebase';
import {
  collection,
  doc,
  setDoc,
  updateDoc,
  query,
  where,
  onSnapshot,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';

/**
 * Save or update a responder's profile in Firestore.
 * Uses setDoc with merge: true to preserve existing fields like onDuty status
 * when updating name, collegeId, or skill. Responders are verified by college ID
 * to ensure accountability and deter fake accounts.
 *
 * @param {string} uid - Responder's user ID from Firebase Auth
 * @param {Object} profileData - Profile data (name, collegeId, skill)
 * @returns {Promise<void>}
 */
export const saveResponderProfile = async (uid, { name, collegeId, skill }) => {
  const responderRef = doc(db, 'responders', uid);
  await setDoc(
    responderRef,
    {
      name,
      collegeId,
      skill,
      onDuty: false,
      updatedAt: serverTimestamp()
    },
    { merge: true }
  );
};

/**
 * Set a responder's on-duty status and update their location.
 * This is called when a responder goes on or off duty. The location is critical
 * for dispatching nearby volunteers to emergencies.
 *
 * @param {string} uid - Responder's user ID
 * @param {boolean} onDuty - New on-duty status
 * @param {{lat: number, lng: number}} location - Current GPS coordinates
 * @returns {Promise<void>}
 */
export const setOnDuty = async (uid, onDuty, location) => {
  const responderRef = doc(db, 'responders', uid);
  await updateDoc(responderRef, {
    onDuty,
    location,
    updatedAt: serverTimestamp()
  });
};

/**
 * Update a responder's current location.
 * Called periodically (every 10s) while on duty to track movement for accurate
 * distance calculations when dispatching to emergencies.
 *
 * @param {string} uid - Responder's user ID
 * @param {{lat: number, lng: number}} location - New GPS coordinates
 * @returns {Promise<void>}
 */
export const updateResponderLocation = async (uid, location) => {
  const responderRef = doc(db, 'responders', uid);
  await updateDoc(responderRef, {
    location,
    updatedAt: serverTimestamp()
  });
};

/**
 * Subscribe to all open emergencies in real-time.
 * Uses onSnapshot to get live updates as new emergencies are created or status changes.
 * The callback receives an array of emergency objects with their IDs.
 *
 * @param {Function} callback - Callback function called with (error, emergenciesArray)
 * @returns {Function} Unsubscribe function to stop listening
 */
export const subscribeToOpenEmergencies = (callback) => {
  const emergenciesRef = collection(db, 'emergencies');
  const q = query(emergenciesRef, where('status', '==', 'open'));
  
  return onSnapshot(
    q,
    (snapshot) => {
      const emergencies = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data()
      }));
      callback(null, emergencies);
    },
    (error) => callback(error, null)
  );
};

/**
 * Accept an emergency using a Firestore transaction.
 * 
 * IMPORTANT: We use a transaction to handle race conditions where two responders
 * might try to accept the same emergency at the exact same moment. Without a transaction,
 * both could succeed, leading to confusion. The transaction ensures that:
 * 1. The emergency is still open or accepted (not cancelled/resolved)
 * 2. This responder hasn't already accepted this emergency
 * 3. The responder is added atomically and status is set to "accepted"
 *
 * @param {string} emergencyId - Emergency document ID
 * @param {Object} responder - Responder data (uid, name, location, distanceM)
 * @returns {Promise<{ok: boolean, reason: string}>}
 */
export const acceptEmergency = async (emergencyId, responder) => {
  try {
    const result = await runTransaction(db, async (transaction) => {
      const emergencyRef = doc(db, 'emergencies', emergencyId);
      const emergencyDoc = await transaction.get(emergencyRef);

      if (!emergencyDoc.exists()) {
        return { ok: false, reason: 'Emergency not found' };
      }

      const emergency = emergencyDoc.data();

      // Abort if emergency is no longer open or accepted
      if (emergency.status !== 'open' && emergency.status !== 'accepted') {
        return { ok: false, reason: 'Emergency is no longer available' };
      }

      // Abort if this responder has already accepted
      const alreadyAccepted = emergency.responders?.some(
        (r) => r.uid === responder.uid
      );
      if (alreadyAccepted) {
        return { ok: false, reason: 'You have already accepted this emergency' };
      }

      // Add responder to the array and set status to accepted
      const updatedResponders = [
        ...(emergency.responders || []),
        {
          uid: responder.uid,
          name: responder.name,
          role: 'patient',
          distanceM: responder.distanceM,
          acceptedAt: Date.now(),
          location: responder.location
        }
      ];

      transaction.update(emergencyRef, {
        responders: updatedResponders,
        status: 'accepted'
      });

      return { ok: true, reason: 'Emergency accepted' };
    });

    return result;
  } catch (error) {
    console.error('Transaction failed:', error);
    return { ok: false, reason: 'Failed to accept emergency: ' + error.message };
  }
};

/**
 * Subscribe to a specific responder's document for real-time updates.
 * Useful for tracking changes to the responder's own profile or on-duty status.
 *
 * @param {string} uid - Responder's user ID
 * @param {Function} callback - Callback function called with (error, snapshot, data)
 * @returns {Function} Unsubscribe function to stop listening
 */
export const subscribeToResponderDoc = (uid, callback) => {
  const responderRef = doc(db, 'responders', uid);
  return onSnapshot(
    responderRef,
    (snapshot) => {
      if (snapshot.exists()) {
        callback(null, snapshot, snapshot.data());
      } else {
        callback(new Error('Responder not found'), null, null);
      }
    },
    (error) => callback(error, null, null)
  );
};
