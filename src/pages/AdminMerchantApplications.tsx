import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocs,
  updateDoc,
} from "firebase/firestore";

import { db, auth } from "../firebase";
import type { MerchantApplication } from "../types/merchant";

type MerchantApplicationWithId = MerchantApplication;

export default function AdminMerchantApplications() {
  const [applications, setApplications] =
    useState<MerchantApplicationWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function loadApplications() {
    try {
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error(
          "You must be logged in as the admin.",
        );
      }

      const snapshot = await getDocs(
        collection(db, "merchantApplications"),
      );

      const results = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...(item.data() as Omit<
            MerchantApplication,
            "id"
          >),
        }))
        .filter(
          (application) =>
            application.status === "pending",
        );

      setApplications(results);
    } catch (err) {
      console.error(
        "Merchant applications error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to load merchant applications.",
      );
    } finally {
      setLoading(false);
    }
  }

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
      console.error(
        "Approve application error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to approve merchant application.",
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
      console.error(
        "Reject application error:",
        err,
      );

      setError(
        err instanceof Error
          ? err.message
          : "Unable to reject merchant application.",
      );
    }
  }

  useEffect(() => {
    loadApplications();
  }, []);

  if (loading) {
    return (
      <main>
        <h1>Merchant Applications</h1>
        <p>Loading merchant applications...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <h1>Merchant Applications</h1>
        <p>{error}</p>
      </main>
    );
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
