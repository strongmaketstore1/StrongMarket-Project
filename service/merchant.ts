import {
  addDoc,
  collection,
} from "firebase/firestore";

import { db } from "../src/firebase";

import type { MerchantApplication } from "../src/types/merchant";

export async function submitMerchantApplication(
  userId: string,
  businessName: string,
  businessDescription: string,
  email: string, // NEW - 4th param, from auth.currentUser.email
) {
  const application: Omit<
    MerchantApplication,
    "id"
  > = {
    userId,
    businessName,
    businessDescription,
    email: email.trim(), // NEW - saved so backend can send approval email
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(
    collection(db, "merchantApplications"),
    application,
  );

  return {
    id: docRef.id,
    ...application,
  };
}
