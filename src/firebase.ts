// Chilvo - Firebase configuration
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBE4zvopstu5NDE2bmkknzwJSI06HnTnPU",
  authDomain: "chilvo-app.firebaseapp.com",
  projectId: "chilvo-app",
  storageBucket: "chilvo-app.firebasestorage.app",
  messagingSenderId: "809652357962",
  appId: "1:809652357962:web:e34c9e1fc16ac803354fb3"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
