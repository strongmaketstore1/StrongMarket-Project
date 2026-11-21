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
  email: string,
) {
  const application: Omit<
    MerchantApplication,
    "id"
  > = {
    userId,
    businessName,
    businessDescription,
    email: email.trim(),
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
