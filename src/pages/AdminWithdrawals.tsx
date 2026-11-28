import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

type WithdrawalRequest = {
  id: string;
  merchant_id: string;
  merchant_name: string;
  amount: number;
  bank_name: string;
  account_number: string;
  account_name: string;
  status: string;
  created_at: string;
};

export default function AdminWithdrawals() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState("");
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  async function loadRequests() {
    setLoading(true);
    let q = supabase
      .from("withdrawals")
      .select("*")
      .order("created_at", { ascending: false });

    if (filter === 'pending') {
      q = q.eq("status", "pending");
    }

    const { data, error } = await q;
    if (error) {
      console.log("Load error:", error.message);
      alert("Error loading: " + error.message);
      setLoading(false);
      return;
    }
    setRequests((data as WithdrawalRequest[]) || []);
    setLoading(false);
  }

  useEffect(() => {
    loadRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleApprove(req: WithdrawalRequest) {
    const bankInfo = `Bank: ${req.bank_name}\nAccount: ${req.account_number}\nName: ${req.account_name}`;

    if (!confirm(`You have PAID $${Number(req.amount).toFixed(2)} to ${req.account_name}?\n\n${bankInfo}\n\nClick OK only if you already sent the money.`)) return;

    setProcessingId(req.id);
    try {
      const { error } = await supabase
        .from("withdrawals")
        .update({ status: "completed" })
        .eq("id", req.id);

      if (error) throw error;
      alert("Withdrawal approved! Merchant will see Completed.");
      await loadRequests();
    } catch (error: any) {
      console.error(error);
      alert("Could not approve: " + error.message);
    }
    setProcessingId("");
  }

  async function handleReject(req: WithdrawalRequest) {
    if (!confirm(`Reject withdrawal for $${Number(req.amount).toFixed(2)}? Merchant keeps the money as available.`)) return;
    setProcessingId(req.id);
    try {
      const { error } = await supabase
        .from("withdrawals")
        .update({ status: "declined" })
        .eq("id", req.id);
      if (error) throw error;
      alert("Withdrawal rejected.");
      await loadRequests();
    } catch (error: any) {
      console.error(error);
      alert("Could not reject: " + error.message);
    }
    setProcessingId("");
  }

  async function handleProcessing(req: WithdrawalRequest) {
    setProcessingId(req.id);
    const { error } = await supabase
      .from("withdrawals")
      .update({ status: "processing" })
      .eq("id", req.id);
    if (error) alert(error.message);
    else await loadRequests();
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

  const getStatusBadge = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'completed') return { background: '#D1FAE5', color: '#065F46', label: 'Completed' };
    if (s === 'processing') return { background: '#FEF3C7', color: '#92400E', label: 'Processing' };
    if (s === 'declined') return { background: '#FEE2E2', color: '#991B1B', label: 'Declined' };
    return { background: '#DBEAFE', color: '#1E40AF', label: 'Pending' };
  };

  if (loading) {
    return <main style={{ padding: "20px" }}><p>Loading withdrawal requests...</p></main>;
  }

  return (
    <main style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <h1>Withdrawal Requests</h1>
      <p style={{ color: "#666" }}>Pay the merchant FIRST (bank / Paystack), then click Approve.</p>

      <div style={{ display: "flex", gap: 8, margin: "16px 0" }}>
        <button onClick={() => setFilter('pending')} style={{ padding: "8px 16px", borderRadius: 20, border: "1px solid #E2E8F0", background: filter === 'pending' ? '#111827' : '#fff', color: filter === 'pending' ? '#fff' : '#111827', cursor: "pointer", fontWeight: 600, fontSize: 13 }}>Pending Only</button>
        <button onClick={() => setFilter('all')} style={{ padding: "8px 16px", borderRadius: 20, border: "1px solid #E2E8F0", background: filter === 'all' ? '#111827' : '#fff', color: filter === 'all' ? '#fff' : '#111827', cursor: "pointer", fontWeight: 600, fontSize: 13 }}>All Withdrawals</button>
        <button onClick={loadRequests} style={{ padding: "8px 16px", borderRadius: 20, border: "1px solid #E2E8F0", background: "#fff", cursor: "pointer", fontWeight: 600, fontSize: 13 }}>↻ Refresh</button>
      </div>

      {requests.length === 0 && (
        <p>No {filter === 'pending' ? 'pending' : ''} withdrawals. All good ✅</p>
      )}

      {requests.map((req) => {
        const badge = getStatusBadge(req.status);
        return (
          <div key={req.id} style={{ border: "1px solid #eee", borderRadius: "16px", padding: "20px", marginBottom: "16px", background: "#fff", boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>
              <div>
                <strong style={{ fontSize: "16px" }}>{req.account_name || req.merchant_name}</strong>
                <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#999" }}>Merchant ID: {req.merchant_id}</p>
                <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#999" }}>{new Date(req.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
                <span style={{ display: 'inline-block', marginTop: 6, padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, background: badge.background, color: badge.color }}>{badge.label}</span>
              </div>
              <div style={{ background: "#fef3c7", borderRadius: "8px", padding: "8px 12px", textAlign: "right", flexShrink: 0 }}>
                <p style={{ margin: 0, fontSize: "11px", fontWeight: 700, color: "#92400e", textTransform: "uppercase" }}>Amount</p>
                <p style={{ margin: 0, fontSize: "18px", fontWeight: 800 }}>${Number(req.amount).toFixed(2)}</p>
              </div>
            </div>

            <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "14px 16px", marginTop: "16px" }}>
              <p style={{ margin: "0 0 8px", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "#666" }}>Payout Details</p>
              <div style={rowStyle}><span style={{ color: "#666" }}>Bank Name</span><strong>{req.bank_name}</strong></div>
              <div style={rowStyle}><span style={{ color: "#666" }}>Account Number</span><strong>{req.account_number}</strong></div>
              <div style={{ ...rowStyle, borderBottom: "none" }}><span style={{ color: "#666" }}>Account Name</span><strong>{req.account_name}</strong></div>
            </div>

            {req.status === 'pending' && (
              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button
                  onClick={() => handleApprove(req)}
                  disabled={processingId === req.id}
                  style={{ flex: 1, padding: "13px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "15px", fontWeight: 700 }}
                >
                  {processingId === req.id ? "Processing..." : "✅ I Paid - Approve"}
                </button>
                <button
                  onClick={() => handleProcessing(req)}
                  disabled={processingId === req.id}
                  style={{ flex: 1, padding: "13px", background: "#FEF3C7", color: "#92400E", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "15px", fontWeight: 700 }}
                >
                  Mark Processing
                </button>
                <button
                  onClick={() => handleReject(req)}
                  disabled={processingId === req.id}
                  style={{ flex: 1, padding: "13px", background: "#fff", color: "#ef4444", border: "1px solid #ef4444", borderRadius: "10px", cursor: "pointer", fontSize: "15px", fontWeight: 700 }}
                >
                  Reject
                </button>
              </div>
            )}
            {req.status === 'processing' && (
              <div style={{ display: "flex", gap: "10px", marginTop: "16px" }}>
                <button onClick={() => handleApprove(req)} disabled={processingId === req.id} style={{ flex: 1, padding: "13px", background: "#16a34a", color: "#fff", border: "none", borderRadius: "10px", cursor: "pointer", fontSize: "15px", fontWeight: 700 }}>✅ I Paid - Approve</button>
                <button onClick={() => handleReject(req)} disabled={processingId === req.id} style={{ flex: 1, padding: "13px", background: "#fff", color: "#ef4444", border: "1px solid #ef4444", borderRadius: "10px", cursor: "pointer", fontSize: "15px", fontWeight: 700 }}>Reject</button>
              </div>
            )}
          </div>
        );
      })}
    </main>
  );
}
