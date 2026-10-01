import { db } from './firebase';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  onSnapshot
} from 'firebase/firestore';

// ============================================================================
// EMERGENCIES COLLECTION HELPERS
// ============================================================================

/**
 * Create a new emergency document
 * @param {Object} emergencyData - Emergency data without createdAt
 * @returns {Promise<DocumentReference>} Reference to the created document
 */
export const createEmergency = async (emergencyData) => {
  const emergenciesRef = collection(db, 'emergencies');
  return await addDoc(emergenciesRef, {
    ...emergencyData,
    createdAt: serverTimestamp(),
    expandedAt: serverTimestamp(),
    status: 'open',
    radiusM: 500,
    responders: []
  });
};

/**
 * Get a specific emergency by ID
 * @param {string} emergencyId - Emergency document ID
 * @returns {Promise<DocumentSnapshot>} Emergency document snapshot
 */
export const getEmergency = async (emergencyId) => {
  const emergencyRef = doc(db, 'emergencies', emergencyId);
  return await getDoc(emergencyRef);
};

/**
 * Update emergency status
 * @param {string} emergencyId - Emergency document ID
 * @param {string} status - New status ('open', 'accepted', 'resolved', 'cancelled')
 * @returns {Promise<void>}
 */
export const updateEmergencyStatus = async (emergencyId, status) => {
  const emergencyRef = doc(db, 'emergencies', emergencyId);
  await updateDoc(emergencyRef, { status });
};

/**
 * Expand emergency search radius
 * @param {string} emergencyId - Emergency document ID
 * @param {number} newRadiusM - New radius in meters
 * @returns {Promise<void>}
 */
export const expandEmergencyRadius = async (emergencyId, newRadiusM) => {
  const emergencyRef = doc(db, 'emergencies', emergencyId);
  await updateDoc(emergencyRef, {
    radiusM: newRadiusM,
    expandedAt: serverTimestamp()
  });
};

/**
 * Add a responder to an emergency
 * @param {string} emergencyId - Emergency document ID
 * @param {Object} responderData - Responder info (uid, name, role, distanceM)
 * @returns {Promise<void>}
 */
export const addResponderToEmergency = async (emergencyId, responderData) => {
  const emergencyRef = doc(db, 'emergencies', emergencyId);
  const emergencySnap = await getDoc(emergencyRef);
  
  if (!emergencySnap.exists()) {
    throw new Error('Emergency not found');
  }

  const emergency = emergencySnap.data();
  const updatedResponders = [
    ...emergency.responders,
    {
      ...responderData,
      acceptedAt: serverTimestamp()
    }
  ];

  await updateDoc(emergencyRef, {
    responders: updatedResponders,
    status: 'accepted'
  });
};

/**
 * Subscribe to real-time updates for an emergency
 * @param {string} emergencyId - Emergency document ID
 * @param {Function} callback - Callback function with (error, snapshot)
 * @returns {Function} Unsubscribe function
 */
export const subscribeToEmergency = (emergencyId, callback) => {
  const emergencyRef = doc(db, 'emergencies', emergencyId);
  return onSnapshot(emergencyRef, (snapshot) => {
    callback(null, snapshot);
  }, (error) => {
    callback(error, null);
  });
};

// ============================================================================
// RESPONDERS COLLECTION HELPERS
// ============================================================================

/**
 * Create or update a responder document
 * @param {string} uid - User ID (document ID)
 * @param {Object} responderData - Responder data without updatedAt
 * @returns {Promise<void>}
 */
export const upsertResponder = async (uid, responderData) => {
  const responderRef = doc(db, 'responders', uid);
  await setDoc(responderRef, {
    ...responderData,
    updatedAt: serverTimestamp()
  }, { merge: true });
};

/**
 * Get a specific responder by UID
 * @param {string} uid - Responder's user ID
 * @returns {Promise<DocumentSnapshot>} Responder document snapshot
 */
export const getResponder = async (uid) => {
  const responderRef = doc(db, 'responders', uid);
  return await getDoc(responderRef);
};

/**
 * Update responder's on-duty status
 * @param {string} uid - Responder's user ID
 * @param {boolean} onDuty - New on-duty status
 * @returns {Promise<void>}
 */
export const updateResponderOnDuty = async (uid, onDuty) => {
  const responderRef = doc(db, 'responders', uid);
  await updateDoc(responderRef, {
    onDuty,
    updatedAt: serverTimestamp()
  });
};

/**
 * Update responder's location
 * @param {string} uid - Responder's user ID
 * @param {Object} location - New location {lat, lng}
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
 * Query for nearby on-duty responders
 * Note: This returns all on-duty responders; distance filtering should be done client-side
 * @returns {Promise<QuerySnapshot>} Snapshot of on-duty responders
 */
export const getOnDutyResponders = async () => {
  const respondersRef = collection(db, 'responders');
  const q = query(respondersRef, where('onDuty', '==', true));
  return await getDocs(q);
};

/**
 * Subscribe to real-time updates for a responder
 * @param {string} uid - Responder's user ID
 * @param {Function} callback - Callback function with (error, snapshot)
 * @returns {Function} Unsubscribe function
 */
export const subscribeToResponder = (uid, callback) => {
  const responderRef = doc(db, 'responders', uid);
  return onSnapshot(responderRef, (snapshot) => {
    callback(null, snapshot);
  }, (error) => {
    callback(error, null);
  });
};

// ============================================================================
// RESOURCES COLLECTION HELPERS
// ============================================================================

/**
 * Get all resources
 * @returns {Promise<QuerySnapshot>} Snapshot of all resources
 */
export const getAllResources = async () => {
  const resourcesRef = collection(db, 'resources');
  return await getDocs(resourcesRef);
};

/**
 * Get resources by kind (aed or kit)
 * @param {string} kind - Resource kind ('aed' or 'kit')
 * @returns {Promise<QuerySnapshot>} Snapshot of filtered resources
 */
export const getResourcesByKind = async (kind) => {
  const resourcesRef = collection(db, 'resources');
  const q = query(resourcesRef, where('kind', '==', kind));
  return await getDocs(q);
};

/**
 * Create a new resource document
 * @param {Object} resourceData - Resource data
 * @returns {Promise<DocumentReference>} Reference to the created document
 */
export const createResource = async (resourceData) => {
  const resourcesRef = collection(db, 'resources');
  return await addDoc(resourcesRef, resourceData);
};
