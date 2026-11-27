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

type Order = {
  id: string;
  customerName?: string;
  customerEmail?: string;
  subtotal?: number;
  status?: string;
  createdAt?: string;
};

type Earning = {
  id: string;
  orderId: string;
  merchantId: string;
  netEarnings: number;
  grossSales: number;
  status: string;
};

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [loading, setLoading] = useState(true);
  const [confirmingId, setConfirmingId] = useState("");

  async function loadData() {
    setLoading(true);

    const ordersSnap = await getDocs(
      query(collection(db, "orders"), where("status", "==", "pending"))
    );
    const ordersList: Order[] = ordersSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Order, "id">),
    }));
    setOrders(ordersList);

    const earningsSnap = await getDocs(
      query(collection(db, "merchantEarnings"), where("status", "==", "pending"))
    );
    const earningsList: Earning[] = earningsSnap.docs.map((d) => ({
      id: d.id,
      ...(d.data() as Omit<Earning, "id">),
    }));
    setEarnings(earningsList);

    setLoading(false);
  }

  useEffect(() => {
    loadData();
  }, []);

  async function handleConfirmPayment(order: Order) {
    if (!confirm(`Confirm payment for order ${order.id} - $${order.subtotal}?`)) return;

    setConfirmingId(order.id);

    try {
      const orderRef = doc(db, "orders", order.id);
      await updateDoc(orderRef, {
        status: "paid",
        paidAt: new Date().toISOString(),
      });

      const earningsForOrder = earnings.filter((e) => e.orderId === order.id);

      for (const earning of earningsForOrder) {
        await updateDoc(doc(db, "merchantEarnings", earning.id), {
          status: "available",
        });
      }

      alert("Payment confirmed! Merchant earnings are now available.");
      await loadData();
    } catch (error) {
      console.error(error);
      alert("Could not confirm. Check console for error.");
    }

    setConfirmingId("");
  }

  if (loading) {
    return <main style={{ padding: "20px" }}><p>Loading pending orders...</p></main>;
  }

  if (orders.length === 0) {
    return (
      <main style={{ padding: "20px" }}>
        <h1>Pending Orders</h1>
        <p>No pending orders. All good ✅</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <h1>Pending Orders - Confirm Payment</h1>
      <p style={{ color: "#666" }}>
        Check Paystack Dashboard first. If Paystack says SUCCESS, click Confirm.
      </p>

      {orders.map((order) => {
        const earningsForOrder = earnings.filter((e) => e.orderId === order.id);
        return (
          <div
            key={order.id}
            style={{
              border: "1px solid #eee",
              borderRadius: "12px",
              padding: "16px",
              marginBottom: "16px",
              background: "#fff",
            }}
          >
            <strong>{order.id}</strong>
            <p style={{ margin: "6px 0" }}>
              Customer: {order.customerName} ({order.customerEmail})
            </p>
            <p style={{ margin: "6px 0" }}>
              Total: ${order.subtotal?.toFixed(2)} | Status: {order.status}
            </p>

            <p style={{ margin: "6px 0", fontSize: "14px" }}>
              Earnings to release:
            </p>
            {earningsForOrder.length === 0 ? (
              <p style={{ fontSize: "13px", color: "#999" }}>No earnings found for this order.</p>
            ) : (
              earningsForOrder.map((e) => (
                <p key={e.id} style={{ fontSize: "13px", margin: "2px 0", color: "#333" }}>
                  - Merchant {e.merchantId.slice(0, 8)}... gets ${e.netEarnings.toFixed(2)} (gross ${e.grossSales.toFixed(2)})
                </p>
              ))
            )}

            <button
              onClick={() => handleConfirmPayment(order)}
              disabled={confirmingId === order.id}
              style={{
                marginTop: "12px",
                padding: "10px 16px",
                background: "#16a34a",
                color: "#fff",
                border: "none",
                borderRadius: "8px",
                cursor: "pointer",
                opacity: confirmingId === order.id ? 0.6 : 1,
              }}
            >
              {confirmingId === order.id ? "Confirming..." : "✅ Confirm Payment"}
            </button>
          </div>
        );
      })}
    </main>
  );
}
