import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";

type MerchantEarning = {
  id: string;
  orderId: string;
  merchantId: string;
  currency: string;
  grossSales: number;
  commissionRate: number;
  commissionAmount: number;
  netEarnings: number;
  status: string;
  createdAt: string;
};

export default function MerchantEarnings() {
  const [loading, setLoading] = useState(true);
  const [merchantStatus, setMerchantStatus] =
    useState("none");
  const [earnings, setEarnings] = useState<MerchantEarning[]>([]);
  
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

          const status =
  userSnapshot.data().merchantStatus ?? "none";

setMerchantStatus(status);

if (status !== "approved") {
  setEarnings([]);
  return;
}

// Retrieve only this merchant's earnings.
const earningsQuery = query(
  collection(db, "merchantEarnings"),
  where("merchantId", "==", user.uid),
);

const earningsSnapshot = await getDocs(earningsQuery);

const merchantEarnings: MerchantEarning[] =
  earningsSnapshot.docs.map((earningDoc) => ({
    id: earningDoc.id,
    ...earningDoc.data(),
  })) as MerchantEarning[];

setEarnings(merchantEarnings);
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

  // Calculate totals from actual earnings records.
const totalSales = earnings.reduce(
  (total, earning) =>
    total + earning.grossSales,
  0,
);

const totalCommission = earnings.reduce(
  (total, earning) =>
    total + earning.commissionAmount,
  0,
);

const totalMerchantEarnings = earnings.reduce(
  (total, earning) =>
    total + earning.netEarnings,
  0,
);

const pendingEarnings = earnings
  .filter((earning) => earning.status === "pending")
  .reduce(
    (total, earning) =>
      total + earning.netEarnings,
    0,
  );

const availableBalance = earnings
  .filter((earning) => earning.status === "available")
  .reduce(
    (total, earning) =>
      total + earning.netEarnings,
    0,
  );

const formatUSD = (amount: number) =>
  new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
 
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
    US dollars (USD) are currently supported. British pounds
    (GBP), euros (EUR), and other currencies may be supported
    as suitable payment and payout services become available.
  </p>
</section>

      <section>
  <h2>Your Earnings</h2>

  <p>
    <strong>Total Sales:</strong>{" "}
    {formatUSD(totalSales)}
  </p>

  <p>
    <strong>CHILVO Commission:</strong>{" "}
    {formatUSD(totalCommission)}
  </p>

  <p>
    <strong>Total Merchant Earnings:</strong>{" "}
    {formatUSD(totalMerchantEarnings)}
  </p>

  <p>
    <strong>Pending Earnings:</strong>{" "}
    {formatUSD(pendingEarnings)}
  </p>

  <p>
    <strong>Available Balance:</strong>{" "}
    {formatUSD(availableBalance)}
  </p>

  <p>
    <strong>Total Withdrawn:</strong> $0.00
  </p>

  <p>
    CHILVO's commission is 10% of verified sales.
    Pending earnings are not yet available for withdrawal.
    Withdrawals have not been activated, so no payouts
    have been recorded.
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
