import { useEffect, useState } from "react";
import { db } from "../firebase";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";

type WithdrawalRequest = {
  id: string;
  merchantId: string;
  merchantEmail?: string;
  amount: number;
  paymentMethod?: string;
  bankName?: string;
  accountNumber?: string;
  accountName?: string;
  paymentDetails: string;
  earningIds: string[];
  status: string;
  createdAt?: string;
};

export default function AdminWithdrawals() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");

  async function loadRequests() {
    setLoading(true);
    const snap = await getDocs(
      query(collection(db, "withdrawalRequests"), where("status", "==", "requested"))
    );
    const list: WithdrawalRequest[] = snap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<WithdrawalRequest, "id">),
    }));
    list.sort((a, b) => (a.createdAt || "").localeCompare(b.createdAt || ""));
    setRequests(list);
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
  }, []);

  async function handleApprove(req: WithdrawalRequest) {
    const bankInfo = req.bankName
      ? `${req.paymentMethod || "Bank Transfer"}\nBank: ${req.bankName}\nAccount: ${req.accountNumber}\nName: ${req.accountName}`
      : req.paymentDetails;

    if (!confirm(`You have PAID $${req.amount.toFixed(2)} to ${req.merchantEmail}?\n\n${bankInfo}\n\nClick OK only if you already sent the money.`)) return;

    setProcessingId(req.id);
    try {
      await updateDoc(doc(db, "withdrawalRequests", req.id), {
        status: "paid",
        paidAt: new Date().toISOString(),
      });
      for (const earningId of req.earningIds) {
        await updateDoc(doc(db, "merchantEarnings", earningId), {
          status: "withdrawn",
        });
      }
      alert("Withdrawal approved! Earnings marked as withdrawn.");
      await loadRequests();
    } catch (error) {
      console.error(error);
      alert("Could not approve. Check console.");
    }
    setProcessingId("");
  }

  async function handleReject(req: WithdrawalRequest) {
    if (!confirm(`Reject withdrawal for $${req.amount.toFixed(2)}? Merchant keeps the money as available.`)) return;
    setProcessingId(req.id);
    try {
      await updateDoc(doc(db, "withdrawalRequests", req.id), { status: "rejected" });
      alert("Withdrawal rejected.");
      await loadRequests();
    } catch (error) {
      console.error(error);
      alert("Could not reject.");
    }
    setProcessingId("");
  }

  const rowStyle: React.CSSProperties = {
    display: "flex",
    justifyContent: "space-between",
    gap: "12px",
    padding: "8px 0",
    borderBottom: "1px solid #f5f5f5",
    fontSize: "14px",
  };

  if (loading) {
    return <main style={{ padding: "20px" }}><p>Loading withdrawal requests...</p></main>;
  }

  if (requests.length === 0) {
    return (
      <main style={{ padding: "20px" }}>
        <h1>Withdrawal Requests</h1>
        <p>No pending withdrawals. All good ✅</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <h1>Withdrawal Requests</h1>
      <p style={{ color: "#666" }}>Pay the merchant FIRST (bank / Paystack), then click Approve.</p>

      {requests.map((req) => (
        <div key={req.id} style={{ border: "1px solid #eee", borderRadius: "16px", padding: "20px", marginBottom: "16px", background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
            <div>
              <strong style={{ fontSize: "16px" }}>{req.merchantEmail}</strong>
              <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#999" }}>Merchant ID: {req.merchantId}</p>
            </div>
            <div style={{ background: "#fef3c7", borderRadius: "8px", padding: "8px 12px", textAlign: "right", flexShrink: 0 }}>
              <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>Amount</p>
              <p style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>${req.amount.toFixed(2)}</p>
            </div>
          </div>

          <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "14px 16px", marginTop: "16px" }}>
            <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#666" }}>Payout Details</p>
            {req.bankName ? (
              <>
                <div style={rowStyle}><span style={{ color: "#666" }}>Payment Method</span><strong>{req.paymentMethod || "Bank Transfer"}</strong></div>
                <div style={rowStyle}><span style={{ color: "#666" }}>Bank Name</span><strong>{req.bankName}</strong></div>
                <div style={rowStyle}><span style={{ color: "#666" }}>Account Number</span><strong>{req.accountNumber}</strong></div>
                <div style={{ ...rowStyle, borderBottom: "none" }}><span style={{ color: "#666" }}>Account Name</span><strong>{req.accountName}</strong></div>
              </>
            ) : (
              <p style={{ margin: 0, fontSize: "14px" }}>{req.paymentDetails}</p>
            )}
            <p style={{ margin: "10px 0 0", fontSize: "12px", color: "#999" }}>Earnings: {req.earningIds.length} records</p>
          </div>

          <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
            <button
              onClick={() => handleApprove(req)}
              disabled={processingId === req.id}
              style={{ flex: 1, padding: "13px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "15px", fontWeight: 700 }}
            >
              {processingId === req.id ? "Processing..." : "✅ I Paid - Approve"}
            </button>
            <button
              onClick={() => handleReject(req)}
              disabled={processingId === req.id}
              style={{ flex: 1, padding: "13px", background: "#fff", color: "#ef4444", border: "1px solid #ef4444", borderRadius: "10px", cursor: "pointer", fontSize: "15px", fontWeight: 700 }}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </main>
  );
}
