import {
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  deleteUser,
} from "firebase/auth";

import { auth, db } from "./firebase";

import {
  doc,
  getDoc,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

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

  // Send email verification immediately after registration.
  await sendEmailVerification(
    credential.user,
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

  await signOut(auth);

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

  await credential.user.reload();

  if (!credential.user.emailVerified) {
    await signOut(auth);

    throw new Error(
      "Please verify your email address before signing in to CHILVO. Check your inbox for the verification email.",
    );
  }

  return credential.user;
}

export async function resendVerificationEmail(
  email: string,
  password: string,
) {
  const credential =
    await signInWithEmailAndPassword(
      auth,
      email,
      password,
    );

  await credential.user.reload();

  if (credential.user.emailVerified) {
    await signOut(auth);

    throw new Error(
      "Your email address is already verified.",
    );
  }

  await sendEmailVerification(
    credential.user,
  );

  await signOut(auth);
}

export async function resetPassword(
  email: string,
) {
  await sendPasswordResetEmail(
    auth,
    email,
  );
}

export async function logoutUser() {
  await signOut(auth);
}

export async function deleteAccount() {
  const user = auth.currentUser;

  if (!user) {
    throw new Error(
      "No user is currently signed in.",
    );
  }

  await deleteDoc(
    doc(db, "users", user.uid),
  );

  await deleteUser(user);
}
