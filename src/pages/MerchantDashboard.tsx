import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  doc,
  getDoc,
  updateDoc,
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

  // ✅ Store Branding - separate from My Account photo
  const [storeName, setStoreName] = useState("");
  const [storeLogoUrl, setStoreLogoUrl] = useState("");
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [savingStore, setSavingStore] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) {
        setStatus("none");
        setLoading(false);
        return;
      }

      setCurrentUserId(user.uid);

      try {
        const userSnapshot = await getDoc(doc(db, "users", user.uid));

        if (!userSnapshot.exists()) {
          setStatus("none");
          return;
        }

        const data = userSnapshot.data();
        const merchantStatus = data.merchantStatus ?? "none";
        setStatus(merchantStatus);

        // Load store branding
        setStoreName(data.storeName || data.name || "");
        setStoreLogoUrl(data.storeLogoUrl || "");

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

  // ✅ Upload Store Logo via Backend + Cloudinary - NOT base64, NOT photoURL
  async function handleStoreLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !auth.currentUser) return;
    setUploadingLogo(true);
    try {
      const token = await auth.currentUser.getIdToken();
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("https://strongmarket-payment-server.onrender.com/api/store/logo/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.message || "Upload failed");
      setStoreLogoUrl(data.storeLogoUrl);
      alert("Store logo updated! Buyers will now see this logo, not your face.");
    } catch (err) {
      console.error(err);
      alert("Failed to save logo.");
    }
    setUploadingLogo(false);
  }

  async function handleSaveStoreName() {
    if (!currentUserId) return;
    setSavingStore(true);
    try {
      await updateDoc(doc(db, "users", currentUserId), {
        storeName: storeName.trim(),
      });
      alert("Store name saved!");
    } catch (err) {
      console.error(err);
      alert("Failed to save store name.");
    }
    setSavingStore(false);
  }

  async function handleRemoveLogo() {
    if (!currentUserId) return;
    const ok = window.confirm("Remove store logo? Your store will show your initial letter again.");
    if (!ok) return;
    try {
      await updateDoc(doc(db, "users", currentUserId), {
        storeLogoUrl: "",
      });
      setStoreLogoUrl("");
    } catch (err) {
      console.error(err);
      alert("Failed to remove logo.");
    }
  }

  const pageStyle: React.CSSProperties = {
    maxWidth: "1100px",
    margin: "0 auto",
    padding: "20px 14px 40px",
    background: "#f4f6f9",
    minHeight: "70vh",
  };

  const cardBase: React.CSSProperties = {
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

  // APPROVED
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

      {/* ✅ STORE BRANDING - Different from My Account */}
      <section style={{ background: "#fff", border: "1px solid #eee", borderRadius: "14px", padding: "18px", marginTop: "16px" }}>
        <h3 style={{ margin: "0 0 6px" }}>🏪 Store Branding</h3>
        <p style={{ color: "#666", fontSize: "13px", margin: "0 0 14px", lineHeight: "1.5" }}>
          This is what buyers see on your Store Page. Different from your personal photo in My Account.
        </p>

        <div style={{ display: "flex", alignItems: "center", gap: "14px", marginBottom: "14px" }}>
          {storeLogoUrl ? (
            <img src={storeLogoUrl} alt="Store logo" style={{ width: "72px", height: "72px", borderRadius: "12px", objectFit: "contain", background: "#fff", border: "1px solid #eee", padding: "4px", boxSizing: "border-box" }} />
          ) : (
            <div style={{ width: "72px", height: "72px", borderRadius: "50%", background: "#0a2540", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "28px", fontWeight: 800, flexShrink: 0 }}>
              {(storeName || "S").charAt(0).toUpperCase()}
            </div>
          )}
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <label style={{ background: "#0a2540", color: "#fff", padding: "10px 16px", borderRadius: "10px", cursor: "pointer", fontSize: "14px", fontWeight: 700, textAlign: "center", display: "inline-block" }}>
              {uploadingLogo ? "Uploading..." : "Upload Store Logo"}
              <input type="file" accept="image/*" onChange={handleStoreLogoChange} style={{ display: "none" }} />
            </label>
            {storeLogoUrl && (
              <button type="button" onClick={handleRemoveLogo} style={{ background: "transparent", border: "none", color: "#ef4444", fontSize: "13px", cursor: "pointer", textAlign: "left", padding: 0 }}>
                Remove logo
              </button>
            )}
          </div>
        </div>

        <label style={{ fontSize: "13px", fontWeight: 700 }}>Store Name</label>
        <input
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          placeholder="e.g. USA Bethel"
          style={{ width: "100%", padding: "11px", borderRadius: "10px", border: "1px solid #ddd", margin: "6px 0 12px", boxSizing: "border-box", fontSize: "14px" }}
        />
        <button onClick={handleSaveStoreName} disabled={savingStore} style={{ background: "#1d4ed8", color: "#fff", border: "none", padding: "11px 18px", borderRadius: "10px", cursor: "pointer", fontWeight: 700, width: "100%" }}>
          {savingStore ? "Saving..." : "Save Store Branding"}
        </button>
        <p style={{ fontSize: "12px", color: "#888", margin: "10px 0 0" }}>
          Tip: Use a square logo (like CHILVO logo). Your personal face in My Account will not change.
        </p>
      </section>

      {/* Merchant Center */}
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

      {/* Overview */}
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
            <div style={{ fontSize: "22px", fontWeight: 800 }}>${stats.earnings.toLocaleString()}</div>
          </div>
        </div>
        <p style={{ color: "#666", fontSize: "14px", marginBottom: 0 }}>
          Tap any card above to manage your store.
        </p>
      </section>
    </main>
  );
}
