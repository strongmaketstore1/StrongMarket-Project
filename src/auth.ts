import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
} from "firebase/auth";

import { auth } from "./firebase";
import {
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";

import { db } from "./firebase";

export async function registerUser(
  email: string,
  password: string,
  displayName: string,
) {
  const credential =
    await createUserWithEmailAndPassword(
      auth,
      email,
      password,
    );

  await updateProfile(
  credential.user,
  {
    displayName,
  },
);

await setDoc(
  doc(
    db,
    "users",
    credential.user.uid,
  ),
  {
    id: credential.user.uid,
    name: displayName,
    email: credential.user.email ?? email,
    role: "customer",
merchantStatus: "none",
createdAt: new Date().toISOString(),
  },
);

const userDoc = await getDoc(
  doc(db, "users", credential.user.uid),
);

console.log(
  "Firestore user profile:",
  userDoc.exists(),
  userDoc.data(),
);
return credential.user;
}

export async function loginUser(
  email: string,
  password: string,
) {
  const credential =
    await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );

  return credential.user;
}

export async function logoutUser() {
  await signOut(auth);
}