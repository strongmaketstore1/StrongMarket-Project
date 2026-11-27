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
  addDoc,
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
  const [merchantStatus, setMerchantStatus] = useState("none");
  const [earnings, setEarnings] = useState<MerchantEarning[]>([]);
  const [paymentDetails, setPaymentDetails] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setMerchantStatus("none");
        setLoading(false);
        return;
      }
      try {
        const userSnapshot = await getDoc(doc(db, "users", user.uid));
        if (!userSnapshot.exists()) {
          setMerchantStatus("none");
          return;
        }
        const status = userSnapshot.data().merchantStatus ?? "none";
        setMerchantStatus(status);
        if (status !== "approved") {
          setEarnings([]);
          return;
        }
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
        console.error("Unable to verify merchant status:", error);
        setMerchantStatus("error");
      } finally {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const totalSales = earnings.reduce((total, earning) => total + earning.grossSales, 0);
  const totalMerchantEarnings = earnings.reduce((total, earning) => total + earning.netEarnings, 0);
  const pendingEarnings = earnings
    .filter((earning) => earning.status === "pending")
    .reduce((total, earning) => total + earning.netEarnings, 0);
  const availableBalance = earnings
    .filter((earning) => earning.status === "available")
    .reduce((total, earning) => total + earning.netEarnings, 0);
  const totalWithdrawn = earnings
    .filter((earning) => earning.status === "withdrawn" || earning.status === "paid_out")
    .reduce((total, earning) => total + earning.netEarnings, 0);

  const formatUSD = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);

  async function handleRequestWithdrawal() {
    const user = auth.currentUser;
    if (!user) { setMessage("Please log in."); return; }
    if (availableBalance <= 0) { setMessage("You have no available balance to withdraw."); return; }
    if (!paymentDetails.trim()) { setMessage("Please enter where you want to be paid - bank / Paystack / mobile money."); return; }

    setRequesting(true);
    setMessage("");
    try {
      const availableEarnings = earnings.filter((e) => e.status === "available");
      await addDoc(collection(db, "withdrawalRequests"), {
        merchantId: user.uid,
        merchantEmail: user.email,
        amount: availableBalance,
        currency: "USD",
        paymentDetails: paymentDetails.trim(),
        earningIds: availableEarnings.map((e) => e.id),
        status: "requested",
        createdAt: new Date().toISOString(),
      });
      setMessage(`Withdrawal request for ${formatUSD(availableBalance)} sent! Admin will review it.`);
      setPaymentDetails("");
    } catch (error) {
      console.error(error);
      setMessage("Could not send request. Try again.");
    }
    setRequesting(false);
  }

  if (loading) {
    return (
      <main style={{ padding: "20px", maxWidth: "700px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <h1>Earnings & Withdrawals</h1>
        <p>Loading your merchant account...</p>
      </main>
    );
  }

  if (merchantStatus !== "approved") {
    return (
      <main style={{ padding: "20px", maxWidth: "700px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <h1>Earnings & Withdrawals</h1>
        <p>An approved merchant account is required to access this section.</p>
        <Link className="primary-btn" to="/merchant/dashboard">Back to Merchant Dashboard</Link>
      </main>
    );
  }

  return (
    <main style={{ padding: "20px", maxWidth: "700px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <section>
        <h1 style={{ margin: "0 0 8px" }}>Earnings & Withdrawals</h1>
        <p style={{ color: "#666", margin: "0 0 20px" }}>Manage your earnings and track your withdrawals from one place.</p>
      </section>

      <section style={{ background: "#fff", border: "1px solid #eee", borderRadius: "12px", padding: "20px 16px", marginBottom: "20px" }}>
        <h2 style={{ margin: "0 0 16px" }}>Your Earnings</h2>
        <p><strong>Total Sales:</strong> {formatUSD(totalSales)}</p>
        <p><strong>Total Merchant Earnings:</strong> {formatUSD(totalMerchantEarnings)}</p>
        <p><strong>Pending Earnings:</strong> {formatUSD(pendingEarnings)}</p>
        <p><strong>Available Balance:</strong> {formatUSD(availableBalance)}</p>
        <p><strong>Total Withdrawn:</strong> {formatUSD(totalWithdrawn)}</p>
        <p style={{ fontSize: "13px", color: "#666", margin: "16px 0 0" }}>Pending earnings are not yet available for withdrawal.</p>
      </section>

      {/* ✅ NEW PIECE 3 - Withdrawal Request */}
      <section style={{ background: "#fff", border: "1px solid #eee", borderRadius: "12px", padding: "20px 16px", marginBottom: "20px" }}>
        <h2 style={{ margin: "0 0 8px" }}>Request Withdrawal</h2>
        <p style={{ fontSize: "13px", color: "#666", margin: "0 0 12px" }}>Available = you can withdraw it now.</p>
        <input
          type="text"
          value={paymentDetails}
          onChange={(e) => setPaymentDetails(e.target.value)}
          placeholder="Bank name + account number, or Paystack email"
          style={{ width: "100%", padding: "12px", border: "1px solid #ddd", borderRadius: "8px", boxSizing: "border-box" }}
        />
        <button
          onClick={handleRequestWithdrawal}
          disabled={requesting || availableBalance <= 0}
          style={{ marginTop: "12px", width: "100%", padding: "12px", background: availableBalance > 0 ? "#111" : "#ccc", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
        >
          {requesting ? "Sending..." : `Request ${formatUSD(availableBalance)} Withdrawal`}
        </button>
        {message && <p style={{ fontSize: "13px", marginTop: "10px" }}>{message}</p>}
      </section>

      <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
        <Link className="primary-btn" to="/merchant/sales" style={{ display: "block", textAlign: "center", padding: "14px", borderRadius: "10px", width: "100%", boxSizing: "border-box" }}>
          View Sales & Earnings
        </Link>
        <Link className="secondary-btn" to="/merchant/dashboard" style={{ display: "block", textAlign: "center", padding: "14px", borderRadius: "10px", width: "100%", boxSizing: "border-box" }}>
          Back to Merchant Dashboard
        </Link>
      </div>
    </main>
  );
}
