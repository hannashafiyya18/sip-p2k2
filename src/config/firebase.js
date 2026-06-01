import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

export const appId = typeof window !== 'undefined' && typeof window.__app_id !== 'undefined' ? window.__app_id : 'p2k2-default';

let app, auth, db;
try {
  if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "GANTI_DENGAN_API_KEY_ANDA") {
      app = initializeApp(firebaseConfig);
      auth = getAuth(app);
      db = getFirestore(app);
  }
} catch (error) {
  console.error("Firebase Init Error:", error);
}

export { app, auth, db };