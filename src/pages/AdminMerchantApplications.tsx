import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  orderBy,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import { db, auth } from "../firebase";

import type { MerchantApplication } from "../types/merchant";

type MerchantApplicationWithId = MerchantApplication;

export default function AdminMerchantApplications() {
  const [applications, setApplications] =
    useState<MerchantApplicationWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function approveApplication(
    application: MerchantApplicationWithId,
  ) {
    try {
      await updateDoc(
        doc(
          db,
          "merchantApplications",
          application.id,
        ),
        {
          status: "approved",
        },
      );

      await updateDoc(
        doc(db, "users", application.userId),
        {
          merchantStatus: "approved",
        },
      );

      setApplications((current) =>
        current.filter(
          (item) => item.id !== application.id,
        ),
      );
    } catch (err) {
      console.error(err);
      setError(
        "Unable to approve merchant application.",
      );
    }
  }

  async function rejectApplication(
    application: MerchantApplicationWithId,
  ) {
    try {
      await updateDoc(
        doc(
          db,
          "merchantApplications",
          application.id,
        ),
        {
          status: "rejected",
        },
      );

      await updateDoc(
        doc(db, "users", application.userId),
        {
          merchantStatus: "rejected",
        },
      );

      setApplications((current) =>
        current.filter(
          (item) => item.id !== application.id,
        ),
      );
    } catch (err) {
      console.error(err);
      setError(
        "Unable to reject merchant application.",
      );
    }
  }

  useEffect(() => {
    async function loadApplications() {
      try {
        console.log("Current user:", auth.currentUser?.email);
console.log("Current UID:", auth.currentUser?.uid);
        
        const applicationsQuery = query(
          collection(db, "merchantApplications"),
          where("status", "==", "pending"),
          orderBy("createdAt", "desc"),
        );

        const snapshot = await getDocs(
          applicationsQuery,
        );

        const results = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...(doc.data() as Omit<
            MerchantApplication,
            "id"
          >),
        }));

        setApplications(results);
      } catch (err) {
        console.error(err);
        setError(
          "Unable to load merchant applications.",
        );
      } finally {
        setLoading(false);
      }
    }

    loadApplications();
  }, []);

  if (loading) {
    return <p>Loading merchant applications...</p>;
  }

  if (error) {
    return <p>{error}</p>;
  }

  return (
    <main>
      <h1>Merchant Applications</h1>

      {applications.length === 0 ? (
        <p>No pending merchant applications.</p>
      ) : (
        applications.map((application) => (
          <article key={application.id}>
            <h2>{application.businessName}</h2>

            <p>
              {application.businessDescription}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {application.status}
            </p>

            <p>
              <strong>Applicant ID:</strong>{" "}
              {application.userId}
            </p>

            <button
              type="button"
              onClick={() =>
                approveApplication(application)
              }
            >
              Approve
            </button>

            <button
              type="button"
              onClick={() =>
                rejectApplication(application)
              }
            >
              Reject
            </button>
          </article>
        ))
      )}
    </main>
  );
}
