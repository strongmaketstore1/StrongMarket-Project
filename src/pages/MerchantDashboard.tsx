import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  doc,
  getDoc,
} from "firebase/firestore";
import {
  onAuthStateChanged,
} from "firebase/auth";

import { auth, db } from "../firebase";

export default function MerchantDashboard() {
  const [status, setStatus] = useState("none");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (user) => {
        if (!user) {
          setStatus("none");
          setLoading(false);
          return;
        }

        try {
          const userSnapshot = await getDoc(
            doc(db, "users", user.uid),
          );

          if (userSnapshot.exists()) {
            const data = userSnapshot.data();

            setStatus(
              data.merchantStatus || "none",
            );
          } else {
            setStatus("none");
          }
        } catch (error) {
          console.error(error);
          setStatus("none");
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
        <h1>Merchant Dashboard</h1>
        <p>Loading merchant status...</p>
      </main>
    );
  }

  if (status === "none") {
    return (
      <main>
        <h1>Merchant Dashboard</h1>

        <div>
          <h2>No Merchant Application</h2>

          <p>
            You have not submitted a merchant
            application yet.
          </p>
        </div>
      </main>
    );
  }

  if (status === "pending") {
    return (
      <main>
        <h1>Merchant Dashboard</h1>

        <div>
          <h2>Application Under Review</h2>

          <p>
            Your merchant application is currently
            under review.
          </p>
        </div>
      </main>
    );
  }

  if (status === "rejected") {
    return (
      <main>
        <h1>Merchant Dashboard</h1>

        <div>
          <h2>Application Rejected</h2>

          <p>
            Your merchant application was rejected.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main>
      <h1>Merchant Dashboard</h1>

      <section>
        <h2>🎉 Merchant Account Approved</h2>

        <p>
          Your merchant account has been approved!
        </p>
      </section>

      <section>
  <h2>Merchant Center</h2>

  <div>
    <Link
      className="primary-btn"
      to="/merchant/products/new"
    >
      📦 Add Product
    </Link>

    <Link
  className="primary-btn"
  to="/merchant/products"
>
  🛍️ My Products
</Link>

    <Link
  className="primary-btn"
  to="/merchant/orders"
>
  🛒 Orders
</Link>

    <Link
  className="primary-btn"
  to="/merchant/sales"
>
  💰 Sales & Earnings
</Link>
  </div>
</section>
    </main>
  );
}