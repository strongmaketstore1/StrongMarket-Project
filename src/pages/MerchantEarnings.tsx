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

  // ✅ NEW - Separate professional fields
  const [paymentMethod, setPaymentMethod] = useState("Bank Transfer");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [requesting, setRequesting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);

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

  function showMessage(text: string, isError = false) {
    setMessage(text);
    setMessageIsError(isError);
  }

  async function handleRequestWithdrawal() {
    const user = auth.currentUser;
    if (!user) { showMessage("Please log in.", true); return; }
    if (availableBalance <= 0) { showMessage("You have no available balance to withdraw.", true); return; }

    // ✅ Validation per field
    if (!bankName.trim()) { showMessage("Please enter your bank name.", true); return; }
    if (!accountNumber.trim()) { showMessage("Please enter your account number.", true); return; }
    if (accountNumber.trim().length < 10) { showMessage("Account number looks too short. Please check it.", true); return; }
    if (!accountName.trim()) { showMessage("Please enter the account holder name.", true); return; }

    setRequesting(true);
    showMessage("");
    try {
      const availableEarnings = earnings.filter((e) => e.status === "available");

      // ✅ Clean paymentDetails for Admin to read + separate fields for future
      const paymentDetails = `${paymentMethod} | Bank: ${bankName.trim()} | Account No: ${accountNumber.trim()} | Account Name: ${accountName.trim()}`;

      await addDoc(collection(db, "withdrawalRequests"), {
        merchantId: user.uid,
        merchantEmail: user.email,
        amount: availableBalance,
        currency: "USD",
        paymentMethod,
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        accountName: accountName.trim(),
        paymentDetails,
        earningIds: availableEarnings.map((e) => e.id),
        status: "requested",
        createdAt: new Date().toISOString(),
      });
      showMessage(`Withdrawal request for ${formatUSD(availableBalance)} sent! Admin will review it.`);
      setBankName("");
      setAccountNumber("");
      setAccountName("");
      setPaymentMethod("Bank Transfer");
    } catch (error) {
      console.error(error);
      showMessage("Could not send request. Try again.", true);
    }
    setRequesting(false);
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "13px 12px",
    border: "1px solid #ddd",
    borderRadius: "10px",
    fontSize: "15px",
    boxSizing: "border-box",
    background: "#fff",
    outline: "none",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "13px",
    fontWeight: 700,
    marginBottom: "6px",
    color: "#111",
  };

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

      {/* ✅ PROFESSIONAL WITHDRAWAL FORM */}
      <section style={{ background: "#fff", border: "1px solid #eee", borderRadius: "16px", padding: "22px 18px", marginBottom: "20px", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
          <div>
            <h2 style={{ margin: "0 0 6px", fontSize: "22px" }}>Request Withdrawal</h2>
            <p style={{ fontSize: "13px", color: "#666", margin: 0 }}>Enter your payout details below. Make sure they match your bank account.</p>
          </div>
          <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "10px", padding: "10px 12px", textAlign: "right", flexShrink: 0 }}>
            <p style={{ margin: 0, fontSize: "11px", color: "#166534", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Available</p>
            <p style={{ margin: "2px 0 0", fontSize: "18px", fontWeight: 800, color: "#166534" }}>{formatUSD(availableBalance)}</p>
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "14px", marginTop: "20px" }}>
          <div>
            <label style={labelStyle}>Payment Method</label>
            <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={inputStyle}>
              <option>Bank Transfer</option>
              <option>Paystack</option>
              <option>Mobile Money</option>
            </select>
          </div>

          <div>
            <label style={labelStyle}>Bank Name</label>
            <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. GTBank, Access Bank, First Bank" style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Account Number</label>
            <input type="text" inputMode="numeric" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value.replace(/[^0-9]/g, ""))} placeholder="e.g. 0123456789" maxLength={11} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Account Name</label>
            <input type="text" value={accountName} onChange={(e) => setAccountName(e.target.value)} placeholder="Name on the account" style={inputStyle} />
          </div>
        </div>

        <button
          onClick={handleRequestWithdrawal}
          disabled={requesting || availableBalance <= 0}
          style={{ marginTop: "18px", width: "100%", padding: "14px", background: availableBalance > 0 ? "#111" : "#ccc", color: "#fff", border: "none", borderRadius: "10px", cursor: availableBalance > 0 ? "pointer" : "not-allowed", fontSize: "16px", fontWeight: 700 }}
        >
          {requesting ? "Sending Request..." : availableBalance > 0 ? `Request ${formatUSD(availableBalance)} Withdrawal` : "No Available Balance"}
        </button>

        {message && (
          <p style={{ fontSize: "13px", marginTop: "12px", padding: "10px 12px", borderRadius: "8px", background: messageIsError ? "#fef2f2" : "#f0fdf4", color: messageIsError ? "#b91c1c" : "#166534", border: `1px solid ${messageIsError ? "#fecaca" : "#bbf7d0"}` }}>
            {message}
          </p>
        )}

        <p style={{ fontSize: "12px", color: "#999", margin: "12px 0 0", textAlign: "center" }}>
          Withdrawals are reviewed by Chilvo Admin. Please allow 1-3 business days.
        </p>
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
