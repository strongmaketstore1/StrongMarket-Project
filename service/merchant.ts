import {
  addDoc,
  collection,
  doc,
  updateDoc,
} from "firebase/firestore";

import { db } from "../src/firebase";

import type { MerchantApplication } from "../src/types/merchant";

export async function submitMerchantApplication(
  userId: string,
  businessName: string,
  businessDescription: string,
) {
  const application: Omit<
    MerchantApplication,
    "id"
  > = {
    userId,
    businessName,
    businessDescription,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const docRef = await addDoc(
    collection(db, "merchantApplications"),
    application,
  );

  await updateDoc(
  doc(db, "users", userId),
  {
    merchantStatus: "pending",
  },
);
  
  return {
    id: docRef.id,
    ...application,
  };
}