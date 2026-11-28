import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAoiqvoULbL8VV0GpEu_3oF7toVHObhTTM",
  authDomain: "strongmarketstore-8c707.firebaseapp.com",
  projectId: "strongmarketstore-8c707",
  storageBucket: "strongmarketstore-8c707.firebasestorage.app",
  messagingSenderId: "471795720818",
  appId: "1:471795720818:web:7448958f63e6e777ab18eb",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);

setPersistence(auth, browserLocalPersistence).catch(
  (error) => {
    console.error(
      "Firebase Auth persistence error:",
      error,
    );
  },
);
export const db = getFirestore(app);
