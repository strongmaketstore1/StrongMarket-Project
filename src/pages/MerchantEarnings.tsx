import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../firebase";

export default function MerchantEarnings() {
  const [loading, setLoading] = useState(true);
  const [merchantStatus, setMerchantStatus] =
    useState("none");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          setMerchantStatus("none");
          setLoading(false);
          return;
        }

        try {
          const userSnapshot = await getDoc(
            doc(db, "users", user.uid),
          );

          if (!userSnapshot.exists()) {
            setMerchantStatus("none");
            return;
          }

          setMerchantStatus(
            userSnapshot.data().merchantStatus ?? "none",
          );
        } catch (error) {
          console.error(
            "Unable to verify merchant status:",
            error,
          );
          setMerchantStatus("error");
        } finally {
          setLoading(false);
        }
      },
    );

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <main>
        <h1>Earnings & Withdrawals</h1>
        <p>Loading your merchant account...</p>
      </main>
    );
  }

  if (merchantStatus !== "approved") {
    return (
      <main>
        <h1>Earnings & Withdrawals</h1>
        <p>
          An approved merchant account is required
          to access this section.
        </p>

        <Link
          className="primary-btn"
          to="/merchant/dashboard"
        >
          Back to Merchant Dashboard
        </Link>
      </main>
    );
  }

  return (
    <main>
      <section>
        <h1>Earnings & Withdrawals</h1>

        <p>
          Manage your earnings and track your withdrawals
          from one place.
        </p>

        <p>
          CHILVO is preparing its merchant payout system.
          Your existing sales and payment records will
          remain separate from confirmed payouts.
        </p>
      </section>

      <section>
        <h2>Currency Support</h2>

        <p>
          Nigerian naira (NGN) and US dollars (USD)
        </p>

        <p>
          British pounds (GBP), euros (EUR), and other
          currencies may be supported as suitable payment
          and payout services become available.
        </p>
      </section>

      <section>
        <h2>Your Earnings</h2>

        <p>
          Earnings and withdrawal balances will appear
          here when verified financial records are available.
        </p>

        <p>
          No withdrawal has been recorded by this page.
        </p>
      </section>

      <Link
        className="primary-btn"
        to="/merchant/sales"
      >
        View Sales & Earnings
      </Link>

      {" "}

      <Link
        className="secondary-btn"
        to="/merchant/dashboard"
      >
        Back to Merchant Dashboard
      </Link>
    </main>
  );
}
