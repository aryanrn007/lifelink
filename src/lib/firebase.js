import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Initialize Firebase from environment variables
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase app
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
const auth = getAuth(app);

// Initialize Cloud Firestore
const db = getFirestore(app);

// Sign in anonymously on app load for temporary user sessions
// This allows unauthenticated users to interact with Firebase with limited permissions.
// IMPORTANT: Firestore must be in test mode or have rules allowing anonymous auth
// reads/writes. Check Firestore Rules tab in Firebase Console if getting
// "Missing or insufficient permissions" errors.
signInAnonymously(auth).catch((error) => {
  console.error('Anonymous sign-in failed:', error);
});

// Custom hook to get the current user's UID
// Provides the authenticated user's ID to components that need it
export const useAuthUid = () => {
  return new Promise((resolve) => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user ? user.uid : null);
    });
  });
};

// Export Firebase instances for use throughout the app
export { auth, db };
