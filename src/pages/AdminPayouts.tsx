import React, { useState } from 'react';

type PayoutStatus = 'Requested' | 'Processing' | 'Completed' | 'Declined';

interface Payout {
  id: string;
  reference: string;
  merchantName: string;
  merchantEmail: string;
  amount: number;
  method: string;
  beneficiaryName: string;
  accountDetails: string;
  bankName: string;
  date: string;
  status: PayoutStatus;
}

export default function AdminPayouts() {
  const [payouts, setPayouts] = useState<Payout[]>([
    {
      id: '1',
      reference: 'CHV-2026-00122',
      merchantName: 'John Doe',
      merchantEmail: 'john@test.com',
      amount: 120,
      method: 'Bank Transfer',
      beneficiaryName: 'John Doe',
      accountDetails: '3177059402',
      bankName: 'GTBank',
      date: '20 Nov 2026',
      status: 'Completed',
    },
    {
      id: '2',
      reference: 'CHV-2026-00123',
      merchantName: 'Bethel',
      merchantEmail: 'bethel@test.com',
      amount: 50,
      method: 'Bank Transfer',
      beneficiaryName: 'Bethel',
      accountDetails: '3177059402',
      bankName: 'GTBank',
      date: '26 Nov 2026',
      status: 'Requested',
    },
  ]);

  const mask = (acc: string) => `****${acc.slice(-4)}`;

  const updateStatus = (id: string, newStatus: PayoutStatus) => {
    if (newStatus === 'Completed' && !window.confirm('Have you actually sent this money? Confirm only after transfer.')) return;
    if (newStatus === 'Declined' && !window.confirm('Decline this payout? Merchant will be notified.')) return;

    setPayouts(payouts.map(p => p.id === id ? { ...p, status: newStatus } : p));
    alert(`Payout ${newStatus}`);
  };

  const getStyle = (s: PayoutStatus) => {
    const base: React.CSSProperties = { padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600 };
    if (s === 'Completed') return { ...base, background: '#D1FAE5', color: '#065F46' };
    if (s === 'Requested') return { ...base, background: '#DBEAFE', color: '#1E40AF' };
    if (s === 'Processing') return { ...base, background: '#FEF3C7', color: '#92400E' };
    return { ...base, background: '#FEE2E2', color: '#991B1B' };
  };

  const pendingTotal = payouts.filter(p => p.status === 'Requested').reduce((sum, p) => sum + p.amount, 0);

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 16, fontFamily: 'Inter, sans-serif' }}>
      <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Admin - Payout Approvals</h2>
      <p style={{ color: '#64748B', fontSize: 14 }}>Review and approve merchant payouts. Only approve after you send money.</p>

      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', margin: '20px 0' }}>
        <div style={{ background: '#FEF3C7', padding: 16, borderRadius: 12, flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 13 }}>Pending Payouts</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>${pendingTotal.toFixed(2)}</div>
        </div>
        <div style={{ background: '#D1FAE5', padding: 16, borderRadius: 12, flex: 1, minWidth: 140 }}>
          <div style={{ fontSize: 13 }}>Total Requests</div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>{payouts.length}</div>
        </div>
      </div>

      {payouts.map(p => (
        <div key={p.id} style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 12, padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontWeight: 700 }}>${p.amount.toFixed(2)} - {p.merchantName}</div>
              <div style={{ fontSize: 12, color: '#64748B' }}>{p.reference} • {p.date} • {p.merchantEmail}</div>
              <div style={{ fontSize: 13, marginTop: 6 }}>
                <strong>{p.method}</strong> - {p.beneficiaryName} - {p.bankName} {mask(p.accountDetails)}
              </div>
            </div>
            <span style={getStyle(p.status)}>{p.status}</span>
          </div>

          {p.status === 'Requested' && (
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => updateStatus(p.id, 'Processing')} style={{ background: '#FEF3C7', color: '#92400E', border: 'none', padding: '10px 14px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', flex: 1 }}>Mark Processing</button>
              <button onClick={() => updateStatus(p.id, 'Completed')} style={{ background: '#111827', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', flex: 1 }}>Approve & Complete</button>
              <button onClick={() => updateStatus(p.id, 'Declined')} style={{ background: '#FEE2E2', color: '#991B1B', border: 'none', padding: '10px 14px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', flex: 1 }}>Decline</button>
            </div>
          )}

          {p.status === 'Processing' && (
            <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
              <button onClick={() => updateStatus(p.id, 'Completed')} style={{ background: '#111827', color: '#fff', border: 'none', padding: '10px 14px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', flex: 1 }}>Mark Completed</button>
              <button onClick={() => updateStatus(p.id, 'Declined')} style={{ background: '#FEE2E2', color: '#991B1B', border: 'none', padding: '10px 14px', borderRadius: 8, fontWeight: 600, cursor: 'pointer', flex: 1 }}>Decline</button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
