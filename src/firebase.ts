import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "PASTE_YOUR_VITE_FIREBASE_API_KEY_HERE",
  authDomain: "PASTE_YOUR_VITE_FIREBASE_AUTH_DOMAIN_HERE",
  projectId: "PASTE_YOUR_VITE_FIREBASE_PROJECT_ID_HERE",
  storageBucket: "PASTE_YOUR_VITE_FIREBASE_STORAGE_BUCKET_HERE",
  messagingSenderId: "PASTE_YOUR_VITE_FIREBASE_MESSAGING_SENDER_ID_HERE",
  appId: "PASTE_YOUR_VITE_FIREBASE_APP_ID_HERE",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
setPersistence(auth, browserLocalPersistence).catch((e) => console.error(e));
export const db = getFirestore(app);
