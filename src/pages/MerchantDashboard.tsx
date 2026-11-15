import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import {
  onAuthStateChanged,
} from "firebase/auth";

import { auth, db } from "../firebase";

export default function MerchantDashboard() {
  const [status, setStatus] = useState("none");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ products: 0, orders: 0, earnings: 0 });

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus("none");
        setLoading(false);
        return;
      }

      try {
        const userSnapshot = await getDoc(doc(db, "users", user.uid));

        if (!userSnapshot.exists()) {
          setStatus("none");
          return;
        }

        const merchantStatus = userSnapshot.data().merchantStatus ?? "none";
        setStatus(merchantStatus);

        // Load stats only if approved
        if (merchantStatus === "approved") {
          try {
            const productsSnap = await getDocs(
              query(collection(db, "products"), where("merchantId", "==", user.uid))
            );
            const ordersSnap = await getDocs(
              query(collection(db, "orders"), where("merchantId", "==", user.uid))
            );

            let earnings = 0;
            ordersSnap.forEach((d) => {
              earnings += Number(d.data().total || d.data().amount || 0);
            });

            setStats({
              products: productsSnap.size,
              orders: ordersSnap.size,
              earnings,
            });
          } catch (e) {
            console.error("Stats error:", e);
          }
        }
      } catch (error) {
        console.error("Merchant status lookup error:", error);
        setStatus("none");
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  const pageStyle = {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "20px 14px 40px",
    background: "#f4f6f9",
    minHeight: "70vh",
  };

  const cardBase = {
    borderRadius: "14px",
    padding: "18px 12px",
    textDecoration: "none",
    display: "block",
    textAlign: "left",
  };

  if (loading) {
    return (
      <main style={pageStyle}>
        <h1 style={{ fontSize: "24px", fontWeight: 800, margin: 0 }}>Merchant Dashboard</h1>
        <p style={{ color: "#666" }}>Loading merchant application...</p>
      </main>
    );
  }

  if (status === "none") {
    return (
      <main style={pageStyle}>
        <h1 style={{ fontSize: "24px", fontWeight: 800 }}>Merchant Dashboard</h1>
        <div style={{ background: "#fff", padding: "20px", borderRadius: "14px", marginTop: "16px" }}>
          <h2>No Merchant Application</h2>
          <p style={{ color: "#666" }}>You have not submitted a merchant application yet.</p>
          <Link to="/become-merchant" style={{ display: "inline-block", marginTop: "12px", background: "#0a2540", color: "#fff", padding: "12px 20px", borderRadius: "10px", textDecoration: "none", fontWeight: 700 }}>
            Apply to Become a Merchant →
          </Link>
        </div>
      </main>
    );
  }

  if (status === "pending") {
    return (
      <main style={pageStyle}>
        <h1 style={{ fontSize: "24px", fontWeight: 800 }}>Merchant Dashboard</h1>
        <div style={{ background: "#fff7e6", border: "1px solid #ffe0a3", padding: "20px", borderRadius: "14px", marginTop: "16px" }}>
          <h2>⏳ Application Under Review</h2>
          <p style={{ color: "#666" }}>Your merchant application is currently under review. We will notify you once approved.</p>
        </div>
      </main>
    );
  }

  if (status === "rejected") {
    return (
      <main style={pageStyle}>
        <h1 style={{ fontSize: "24px", fontWeight: 800 }}>Merchant Dashboard</h1>
        <div style={{ background: "#fdecea", border: "1px solid #f5b5b0", padding: "20px", borderRadius: "14px", marginTop: "16px" }}>
          <h2>Application Rejected</h2>
          <p style={{ color: "#666" }}>Your merchant application was rejected. Please contact support or re-apply.</p>
        </div>
      </main>
    );
  }

  // APPROVED - THIS IS THE FIXED SECTION
  return (
    <main style={pageStyle}>
      <h1 style={{ fontSize: "24px", fontWeight: 800, margin: 0 }}>Merchant Dashboard</h1>
      <p style={{ color: "#666", fontSize: "14px", margin: "6px 0 16px" }}>
        Welcome back, manage your store here.
      </p>

      {/* Approved Banner */}
      <section style={{ background: "#d9f7e3", borderRadius: "14px", padding: "14px 16px", display: "flex", gap: "10px" }}>
        <span style={{ fontSize: "20px" }}>🎉</span>
        <div>
          <b style={{ color: "#157347" }}>Merchant Account Approved</b>
          <div style={{ color: "#2e7d4f", fontSize: "13px" }}>
            Your merchant account has been approved! You can now add products and receive orders.
          </div>
        </div>
      </section>

      {/* Merchant Center - FIXED GRID */}
      <section>
        <h2 style={{ fontSize: "16px", margin: "22px 0 12px" }}>Merchant Center</h2>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>

          <Link to="/merchant/products/new" style={{ ...cardBase, background: "#0a2540", color: "#fff" }}>
            <div style={{ fontSize: "22px" }}>➕</div>
            <div style={{ fontWeight: 800, marginTop: "8px" }}>Add Product</div>
            <div style={{ fontSize: "12px", opacity: 0.75 }}>Upload new product</div>
          </Link>

          <Link to="/merchant/products" style={{ ...cardBase, background: "#fff", color: "#111", border: "1px solid #e5e5e5" }}>
            <div style={{ fontSize: "22px" }}>📦</div>
            <div style={{ fontWeight: 800, marginTop: "8px" }}>My Products</div>
            <div style={{ fontSize: "12px", color: "#666" }}>View & edit products</div>
          </Link>

          <Link to="/merchant/orders" style={{ ...cardBase, background: "#fff", color: "#111", border: "1px solid #e5e5e5" }}>
            <div style={{ fontSize: "22px" }}>🧾</div>
            <div style={{ fontWeight: 800, marginTop: "8px" }}>Orders</div>
            <div style={{ fontSize: "12px", color: "#666" }}>See customer orders</div>
          </Link>

          <Link to="/merchant/sales" style={{ ...cardBase, background: "#fff", color: "#111", border: "1px solid #e5e5e5" }}>
            <div style={{ fontSize: "22px" }}>📊</div>
            <div style={{ fontWeight: 800, marginTop: "8px" }}>Sales & Earnings</div>
            <div style={{ fontSize: "12px", color: "#666" }}>Track your sales</div>
          </Link>

          <Link to="/merchant/earnings" style={{ ...cardBase, background: "#fff", color: "#111", border: "1px solid #e5e5e5", gridColumn: "span 2" }}>
            <div style={{ fontSize: "22px" }}>💰</div>
            <div style={{ fontWeight: 800, marginTop: "8px" }}>Earnings & Withdrawals</div>
            <div style={{ fontSize: "12px", color: "#666" }}>Withdraw your money</div>
          </Link>

        </div>
      </section>

      {/* Overview - fixes empty white space */}
      <section style={{ background: "#fff", border: "1px solid #eee", borderRadius: "14px", padding: "18px", marginTop: "16px" }}>
        <h3 style={{ margin: 0 }}>Overview</h3>
        <div style={{ display: "flex", justifyContent: "space-between", textAlign: "center", marginTop: "14px" }}>
          <div>
            <div style={{ color: "#666", fontSize: "13px" }}>Total Products</div>
            <div style={{ fontSize: "22px", fontWeight: 800 }}>{stats.products}</div>
          </div>
          <div>
            <div style={{ color: "#666", fontSize: "13px" }}>Orders</div>
            <div style={{ fontSize: "22px", fontWeight: 800 }}>{stats.orders}</div>
          </div>
          <div>
            <div style={{ color: "#666", fontSize: "13px" }}>Earnings</div>
            <div style={{ fontSize: "22px", fontWeight: 800 }}>₦{stats.earnings.toLocaleString()}</div>
          </div>
        </div>
        <p style={{ color: "#666", fontSize: "14px", marginBottom: 0 }}>
          Tap any card above to manage your store.
        </p>
      </section>
    </main>    
  );
}
