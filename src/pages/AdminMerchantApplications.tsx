import { useEffect, useState } from "react";
import { auth } from "../firebase";
import type { MerchantApplication } from "../types/merchant";

const API_URL =
  "https://strongmarket-payment-server.onrender.com";

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
          "You must be logged in.",
        );
      }

      const idToken =
        await currentUser.getIdToken();

      const response = await fetch(
        `${API_URL}/api/admin/merchant-applications`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to load merchant applications.",
        );
      }

      setApplications(data.applications || []);
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
      const currentUser = auth.currentUser;

      if (!currentUser) {
        throw new Error(
          "You must be logged in.",
        );
      }

      const idToken =
        await currentUser.getIdToken();

      const response = await fetch(
        `${API_URL}/api/admin/merchant-applications/${application.id}/approve`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.message ||
            "Unable to approve merchant application.",
        );
      }

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

  useEffect(() => {
    loadApplications();
  }, []);

  if (loading) {
    return (
      <main>
        <h1>Merchant Applications</h1>
        <p>
          Loading merchant applications...
        </p>
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
        <p>
          No pending merchant applications.
        </p>
      ) : (
        applications.map((application) => (
          <article key={application.id}>
            <h2>
              {application.businessName}
            </h2>

            <p>
              {application.businessDescription}
            </p>

            <p>
              <strong>Status:</strong>{" "}
              {application.status}
            </p>

            <button
              type="button"
              onClick={() =>
                approveApplication(
                  application,
                )
              }
            >
              Approve
            </button>
          </article>
        ))
      )}
    </main>
  );
}
