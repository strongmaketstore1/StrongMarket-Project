import React, { useState } from 'react';

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

export default function MerchantEarnings() {
  const [balance] = useState(250.00);
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [accountDetails, setAccountDetails] = useState('');
  const [bankName, setBankName] = useState('');
  const [amount, setAmount] = useState('');
  const [payouts, setPayouts] = useState<Payout[]>([
    {
      id: '1',
      reference: 'CHV-2026-00122',
      amount: 120.00,
      method: 'Bank Transfer',
      beneficiaryName: 'John Doe',
      accountDetails: '****6789',
      bankName: 'GTBank',
      date: '20 Nov 2026',
      status: 'Completed',
    },
  ]);
  const [showReceipt, setShowReceipt] = useState<Payout | null>(null);

  const generateReference = () => {
    const num = Math.floor(10000 + Math.random() * 90000);
    return `CHV-2026-00${num.toString().slice(0, 3)}`;
  };

  const handleRequestPayout = () => {
    if (!beneficiaryName || !accountDetails || !bankName || !amount) {
      alert('Please complete all payout details.');
      return;
    }
    if (parseFloat(amount) > balance) {
      alert('Insufficient balance.');
      return;
    }

    const newPayout: Payout = {
      id: Date.now().toString(),
      reference: generateReference(),
      amount: parseFloat(amount),
      method: paymentMethod,
      beneficiaryName,
      accountDetails,
      bankName,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      status: 'Requested',
    };

    setPayouts([newPayout, ...payouts]);
    setAmount('');
    setBeneficiaryName('');
    setAccountDetails('');
    setBankName('');
    alert(`Payout Request Submitted\nReference: ${newPayout.reference}`);
  };

  const getStatusStyle = (status: PayoutStatus): React.CSSProperties => {
    const base: React.CSSProperties = { padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 };
    if (status === 'Completed') return { ...base, background: '#D1FAE5', color: '#065F46' };
    if (status === 'Processing') return { ...base, background: '#FEF3C7', color: '#92400E' };
    if (status === 'Requested') return { ...base, background: '#DBEAFE', color: '#1E40AF' };
    return { ...base, background: '#FEE2E2', color: '#991B1B' };
  };

  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20, fontFamily: 'Inter, sans-serif' }}>
      <h2 style={{ fontSize: 24, fontWeight: 700 }}>Earnings & Payouts</h2>
      <p style={{ color: '#64748B', fontSize: 14 }}>Manage your earnings and request secure payouts.</p>

      <div style={{ background: '#111827', color: '#fff', padding: 20, borderRadius: 12, margin: '20px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 13, opacity: 0.7 }}>Available Balance</div>
          <div style={{ fontSize: 28, fontWeight: 700 }}>${balance.toFixed(2)} USD</div>
        </div>
        <div style={{ textAlign: 'right', fontSize: 13, opacity: 0.8 }}>Chilvo Merchant<br />Payouts in 1-3 Business Days</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, alignItems: 'start' }}>
        {/* REQUEST PAYOUT */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Request Payout</h3>

          <label style={labelStyle}>Payout Amount (USD)</label>
          <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" style={inputStyle} />

          <label style={labelStyle}>Payout Method</label>
          <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={inputStyle}>
            <option>Bank Transfer</option>
            <option>Crypto Wallet (USDT)</option>
          </select>
re
          <label style={labelStyle}>Beneficiary Name</label>
          <input type="text" value={beneficiaryName} onChange={(e) => setBeneficiaryName(e.target.value)} placeholder="Full name as it appears on bank account" style={inputStyle} />

          <label style={labelStyle}>Beneficiary Account Details</label>
          <input type="text" value={accountDetails} onChange={(e) => setAccountDetails(e.target.value)} placeholder="Account Number / IBAN / USDT Wallet Address" style={inputStyle} />

          <label style={labelStyle}>Bank Name / Network</label>
          <input type="text" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="e.g. GTBank, Chase, Barclays, TRC20" style={inputStyle} />

          <button onClick={handleRequestPayout} style={buttonStyle}>Submit Payout Request</button>
          <p style={{ fontSize: 12, color: '#94A3B8', marginTop: 10, textAlign: 'center' }}>Secured by Chilvo Payments. Payouts are reviewed before processing.</p>
        </div>

        {/* HISTORY */}
        <div style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Payout History</h3>
          {payouts.map((p) => (
            <div key={p.id} style={{ borderBottom: '1px solid #F1F5F9', padding: '12px 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>${p.amount.toFixed(2)} USD</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>{p.reference} • {p.date}</div>
                <div style={{ fontSize: 12, color: '#64748B' }}>{p.method} • {p.bankName}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
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

      {/* PROFESSIONAL RECEIPT MODAL */}
      {showReceipt && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }} onClick={() => setShowReceipt(null)}>
          <div style={{ background: '#fff', borderRadius: 12, maxWidth: 480, width: '100%', padding: 24 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ textAlign: 'center', borderBottom: '1px solid #E2E8F0', paddingBottom: 16 }}>
              <div style={{ fontSize: 20, fontWeight: 800 }}>CHILVO</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>Payout Receipt</div>
            </div>
            <div style={{ marginTop: 16, fontSize: 14, lineHeight: 1.7 }}>
              <p>Dear {showReceipt.beneficiaryName},</p>
              <p>We are pleased to inform you that your payout request has been successfully processed.</p>
              <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 8, margin: '12px 0' }}>
                <div><strong>Payout Reference:</strong> {showReceipt.reference}</div>
                <div><strong>Date:</strong> {showReceipt.date}</div>
                <div><strong>Amount:</strong> ${showReceipt.amount.toFixed(2)} USD</div>
                <div><strong>Payout Method:</strong> {showReceipt.method}</div>
                <div><strong>Beneficiary:</strong> {showReceipt.beneficiaryName} - {showReceipt.bankName} {showReceipt.accountDetails}</div>
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
