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
    if (!confirm(`You have PAID $${req.amount.toFixed(2)} to ${req.merchantEmail}?\n\nPayment: ${req.paymentDetails}\n\nClick OK only if you already sent the money.`)) return;

    setProcessingId(req.id);
    try {
      // 1. Mark request as paid
      await updateDoc(doc(db, "withdrawalRequests", req.id), {
        status: "paid",
        paidAt: new Date().toISOString(),
      });

      // 2. Mark those earnings as withdrawn
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
      await updateDoc(doc(db, "withdrawalRequests", req.id), {
        status: "rejected",
      });
      alert("Withdrawal rejected.");
      await loadRequests();
    } catch (error) {
      console.error(error);
      alert("Could not reject.");
    }
    setProcessingId("");
  }

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
        <div key={req.id} style={{ border: "1px solid #eee", borderRadius: "12px", padding: "16px", marginBottom: "16px", background: "#fff" }}>
          <strong>{req.merchantEmail}</strong>
          <p style={{ margin: "6px 0" }}>Amount: <strong>${req.amount.toFixed(2)}</strong></p>
          <p style={{ margin: "6px 0", fontSize: "14px" }}>Pay to: {req.paymentDetails}</p>
          <p style={{ margin: "6px 0", fontSize: "13px", color: "#999" }}>Merchant ID: {req.merchantId} | Earnings: {req.earningIds.length} records</p>

          <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
            <button
              onClick={() => handleApprove(req)}
              disabled={processingId === req.id}
              style={{ flex: 1, padding: "12px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer" }}
            >
              {processingId === req.id ? "Processing..." : "✅ I Paid - Approve"}
            </button>
            <button
              onClick={() => handleReject(req)}
              disabled={processingId === req.id}
              style={{ flex: 1, padding: "12px", background: "#fff", color: "#ef4444", border: "1px solid #ef4444", borderRadius: "8px", cursor: "pointer" }}
            >
              Reject
            </button>
          </div>
        </div>
      ))}
    </main>
  );
}
