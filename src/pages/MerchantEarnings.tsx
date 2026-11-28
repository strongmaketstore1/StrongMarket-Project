import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';

const API = "https://YOUR-RENDER-URL-HERE"; // <-- PUT YOUR RENDER URL HERE, e.g. https://chilvo-backend.onrender.com

type PayoutStatus = 'Requested' | 'Processing' | 'Completed' | 'Declined';

interface Payout {
  id: string;
  reference: string;
  amount: number;
  method: string;
  beneficiaryName: string;
  accountDetails: string;
  bankName: string;
  date: string;
  status: PayoutStatus;
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '12px',
  borderRadius: '8px',
  border: '1px solid #E2E8F0',
  fontSize: '14px',
  marginBottom: '16px',
  outline: 'none',
  boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block',
  fontSize: '13px',
  fontWeight: 600,
  color: '#1A202C',
  marginBottom: '6px',
};

const buttonStyle: React.CSSProperties = {
  width: '100%',
  padding: '13px',
  background: '#111827',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontWeight: 600,
  cursor: 'pointer',
  fontSize: '14px',
};

const mapDbStatus = (s: string): PayoutStatus => {
  const v = (s || 'pending').toLowerCase();
  if (v === 'completed') return 'Completed';
  if (v === 'processing') return 'Processing';
  if (v === 'declined' || v === 'rejected') return 'Declined';
  return 'Requested';
};

export default function MerchantEarnings() {
  const [userId, setUserId] = useState("");
  const [totalEarned, setTotalEarned] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [accountDetails, setAccountDetails] = useState('');
  const [bankName, setBankName] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [showReceipt, setShowReceipt] = useState<Payout | null>(null);
  const [pageLoading, setPageLoading] = useState(true);

  const balance = Math.max(0, totalEarned - totalWithdrawn);

  async function getToken() {
    const user = getAuth().currentUser;
    if (!user) return null;
    return await user.getIdToken();
  }

  // 1. Get real logged-in merchant from Firebase
  useEffect(() => {
    const user = getAuth().currentUser;
    if (user) setUserId(user.uid);
    else setPageLoading(false);
    // If Firebase takes a moment to load, check again
    const unsub = getAuth().onAuthStateChanged((u) => {
      if (u) setUserId(u.uid);
      else setPageLoading(false);
    });
    return () => unsub();
  }, []);

  // 2. Load earnings + payouts for THIS merchant only, from backend / Firebase
  useEffect(() => {
    if (!userId) return;
    fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const fetchAll = async () => {
    setPageLoading(true);
    await Promise.all([fetchEarnings(), fetchPayouts()]);
    setPageLoading(false);
  };

  const fetchEarnings = async () => {
    const token = await getToken();
    if (!token) { setTotalEarned(0); return; }
    try {
      const res = await fetch(`${API}/api/merchant/earnings`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setTotalEarned(Number(json.totalEarned || 0));
      else setTotalEarned(0);
    } catch {
      setTotalEarned(0);
    }
  };

  const fetchPayouts = async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch(`${API}/api/merchant/withdrawals`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (!json.success) return;
      const data = json.withdrawals || [];
      const mapped: Payout[] = data.map((row: any) => ({
        id: row.id,
        reference: `CHV-${String(row.id).slice(0, 8).toUpperCase()}`,
        amount: Number(row.amount),
        method: row.method || (row.bankName?.includes('TRC20') || row.bankName?.includes('USDT') ? 'Crypto Wallet (USDT)' : 'Bank Transfer'),
        beneficiaryName: row.accountName || row.beneficiaryName || 'Merchant',
        accountDetails: row.accountNumber || '',
        bankName: (row.bankName || '').replace(' - USDT', ''),
        date: new Date(row.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: mapDbStatus(row.status),
      }));
      setPayouts(mapped);
      const withdrawn = data
        .filter((r: any) => r.status !== 'declined' && r.status !== 'rejected')
        .reduce((acc: number, r: any) => acc + Number(r.amount || 0), 0);
      setTotalWithdrawn(withdrawn);
      if (data.length > 0) {
        const last = data[0];
        if (last.accountName) setBeneficiaryName(last.accountName);
        if (last.accountNumber) setAccountDetails(last.accountNumber);
        if (last.bankName) setBankName(last.bankName.replace(' - USDT', ''));
        if (last.bankName?.includes('USDT') || last.method === 'Crypto Wallet (USDT)') setPaymentMethod('Crypto Wallet (USDT)');
      }
    } catch (e) {
      console.log('Fetch error:', e);
    }
  };

  const generateReference = () => {
    const num = Math.floor(10000 + Math.random() * 90000);
    return `CHV-2026-00${num.toString().slice(0, 3)}`;
  };

  const maskAccount = (acc: string) => {
    if (!acc) return '****';
    if (acc.startsWith('****')) return acc;
    return `****${acc.slice(-4)}`;
  };

  const handleRequestPayout = async () => {
    if (!userId) { alert('Please login first.'); return; }
    if (!beneficiaryName || !accountDetails || !bankName || !amount) { alert('Please complete all payout details.'); return; }
    if (parseFloat(amount) > balance) { alert(`Insufficient balance. Available: $${balance.toFixed(2)}`); return; }
    if (parseFloat(amount) <= 0) { alert('Enter a valid amount.'); return; }

    setLoading(true);
    const token = await getToken();
    if (!token) { setLoading(false); alert('Please login again.'); return; }
    const reference = generateReference();

    try {
      const res = await fetch(`${API}/api/merchant/withdrawals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount: parseFloat(amount),
          bankName: paymentMethod === 'Crypto Wallet (USDT)' ? `${bankName} - USDT` : bankName,
          accountNumber: accountDetails,
          accountName: beneficiaryName,
          method: paymentMethod,
        }),
      });
      const json = await res.json();
      if (!json.success) { alert('Error: ' + (json.message || 'Failed')); setLoading(false); return; }

      const newPayout: Payout = {
        id: json.id || Date.now().toString(),
        reference: reference,
        amount: parseFloat(amount),
        method: paymentMethod,
        beneficiaryName,
        accountDetails,
        bankName,
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
        status: 'Requested',
      };
      setPayouts([newPayout, ...payouts]);
      setTotalWithdrawn(totalWithdrawn + parseFloat(amount));
      setAmount('');
      alert(`Payout Request Submitted\nReference: ${reference}\nAdmin has been notified.`);
    } catch (e: any) {
      alert('Error: ' + (e.message || 'Failed'));
    }
    setLoading(false);
  };

  const getStatusStyle = (status: PayoutStatus): React.CSSProperties => {
    const base: React.CSSProperties = { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600, whiteSpace: 'nowrap' };
    if (status === 'Completed') return { ...base, background: '#D1FAE5', color: '#065F46' };
    if (status === 'Processing') return { ...base, background: '#FEF3C7', color: '#92400E' };
    if (status === 'Requested') return { ...base, background: '#DBEAFE', color: '#1E40AF' };
    return { ...base, background: '#FEE2E2', color: '#991B1B' };
  };

  if (pageLoading) {
    return <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}><p>Loading earnings...</p></div>;
  }

  if (!userId) {
    return <div style={{ maxWidth: 900, margin: '0 auto', padding: 16 }}><p>Please login to see your earnings.</p></div>;
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 16, fontFamily: 'Inter, sans-serif', boxSizing: 'border-box' }}>
      <style>{`
        .payout-grid { display: flex; flex-direction: column; gap: 20px; }
        @media (min-width: 768px) {
          .payout-grid { display: grid !important; grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      <h2 style={{ fontSize: 24, fontWeight: 700, margin: '0 0 4px 0' }}>Earnings & Payouts</h2>
      <p style={{ color: '#64748B', fontSize: 14, margin: 0 }}>Manage your earnings and request secure payouts.</p>

      <div style={{ background: '#111827', color: '#fff', padding: 20, borderRadius: 12, margin: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>Available Balance</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>${balance.toFixed(2)} USD</div>
          <div style={{ fontSize: 12, opacity: 0.7, marginTop: 4 }}>Total Earned: ${totalEarned.toFixed(2)} • Withdrawn: ${totalWithdrawn.toFixed(2)}</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 13, opacity: 0.8 }}>Chilvo Merchant<br />Payouts in 1-3 Business Days</div>
      </div>

      <div className="payout-grid">
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, boxSizing: 'border-box', minWidth: 0 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, marginTop: 0 }}>Request Payout</h3>

          <label style={labelStyle}>Payout Amount (USD)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={inputStyle} />

          <label style={labelStyle}>Payout Method</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={inputStyle}>
            <option>Bank Transfer</option>
            <option>Crypto Wallet (USDT)</option>
          </select>

          <label style={labelStyle}>Beneficiary Name</label>
          <input type="text" value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} placeholder="Full name as it appears on bank account" style={inputStyle} />

          <label style={labelStyle}>Beneficiary Account Details</label>
          <input type="text" value={accountDetails} onChange={(e) => setAccountDetails(e.target.value)} placeholder="Account Number / IBAN / USDT Wallet Address" style={inputStyle} />

          <label style={labelStyle}>Bank Name / Network</label>
          <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. GTBank, Chase, Barclays, TRC20" style={inputStyle} />

          <button onClick={handleRequestPayout} disabled={loading} style={{ ...buttonStyle, opacity: loading ? 0.6 : 1 }}>{loading ? 'Sending...' : 'Submit Payout Request'}</button>
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 10, textAlign: 'center' }}>Secured by Chilvo Payments. Payouts are reviewed before processing. Admin pays via Grey / Paystack.</p>
        </div>

        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20, boxSizing: 'border-box', minWidth: 0 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, marginTop: 0 }}>Payout History</h3>
          {payouts.map((p) => (
            <div key={p.id} style={{ borderBottom: '1px solid #F1F5F9', padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 14 }}>${p.amount.toFixed(2)} USD</div>
                <div style={{ fontSize: 12, color: '#64748B', wordBreak: 'break-word' }}>{p.reference} • {p.date}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>{p.method} • {p.bankName} • {maskAccount(p.accountDetails)}</div>
              </div>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <span style={getStatusStyle(p.status)}>{p.status}</span>
                <div>
                  <button onClick={() => setShowReceipt(p)} style={{ background: 'none', border: 'none', color: '#2563EB', fontSize: 12, cursor: 'pointer', marginTop: 6, fontWeight: 600 }}>View Receipt →</button>
                </div>
              </div>
            </div>
          ))}
          {payouts.length === 0 && <p style={{ fontSize: 13, color: '#94A3B8' }}>No payouts yet.</p>}
        </div>
      </div>

      {showReceipt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', zIndex: 50, padding: 16, overflowY: 'auto', boxSizing: 'border-box' }} onClick={() => setShowReceipt(null)}>
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 480, width: '100%', padding: 24, margin: '20px auto', boxSizing: 'border-box' }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>CHILVO</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>Payout Receipt</div>
            </div>
            <div style={{ marginTop: 16, fontSize: 14, lineHeight: 1.7 }}>
              <p>Dear {showReceipt.beneficiaryName},</p>
              <p>
                {showReceipt.status === 'Completed'
                  ? 'We are pleased to inform you that your payout request has been successfully processed.'
                  : 'We have received your payout request and it is currently being reviewed. You will be notified once it is processed.'}
              </p>
              <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 8, margin: '12px 0', wordBreak: 'break-word' }}>
                <div><strong>Payout Reference:</strong> {showReceipt.reference}</div>
                <div><strong>Date:</strong> {showReceipt.date}</div>
                <div><strong>Amount:</strong> ${showReceipt.amount.toFixed(2)} USD</div>
                <div><strong>Payout Method:</strong> {showReceipt.method}</div>
                <div><strong>Beneficiary:</strong> {showReceipt.beneficiaryName} - {showReceipt.bankName} {maskAccount(showReceipt.accountDetails)}</div>
                <div><strong>Status:</strong> {showReceipt.status}</div>
              </div>
              <p style={{ fontSize: 13, color: '#64748B' }}>Funds should reflect in your account within 1-3 business days depending on your bank. For any enquiries, please contact support@chilvo.com with your Payout Reference.</p>
              <p style={{ fontSize: 13 }}>Thank you for being a valued Chilvo Merchant.<br /><strong>Best Regards,<br />Chilvo Finance Team</strong><br />www.chilvo.com</p>
            </div>
            <button onClick={() => setShowReceipt(null)} style={buttonStyle}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
}
