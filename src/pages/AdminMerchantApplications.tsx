import { useEffect, useState } from "react";
import {
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import {
  collection,
  doc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import type { MerchantApplication } from "../types/merchant";
import type { Product } from "../types/product";

const API_URL =
  "https://strongmarket-payment-server.onrender.com";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzlyhJhOVn8cj5bN1q_H9sd8Z4EMbQvJrxPpjNcUmoK8ZmENta6vrpRIKgWge1lOMwz/exec";

type MerchantApplicationWithId = MerchantApplication & {
  email?: string;
};

type ReviewProduct = Product & {
  status?: string;
  merchantId?: string;
  fileName?: string;
  cloudinaryFileRef?: string;
  image?: string;
  rejectReason?: string;
};

type Tab = "merchants" | "products";

export default function AdminMerchantApplications() {
  const [tab, setTab] = useState<Tab>("products");
  const [applications, setApplications] =
    useState<MerchantApplicationWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // --- PRODUCT REVIEW STATE ---
  const [pendingProducts, setPendingProducts] = useState<ReviewProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ReviewProduct | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [productMsg, setProductMsg] = useState("");
  const [productsLoading, setProductsLoading] = useState(false);

  async function loadApplications(currentUser: User) {
    try {
      const idToken = await currentUser.getIdToken();
      const response = await fetch(
        `${API_URL}/api/admin/merchant-applications`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to load merchant applications.");
      }
      setApplications(data.applications || []);
    } catch (err) {
      console.error("Merchant applications error:", err);
      setError(err instanceof Error ? err.message : "Unable to load merchant applications.");
    } finally {
      setLoading(false);
    }
  }

  async function approveApplication(application: MerchantApplicationWithId) {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error("You must be logged in.");
      const idToken = await currentUser.getIdToken();
      const response = await fetch(
        `${API_URL}/api/admin/merchant-applications/${application.id}/approve`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${idToken}` },
        },
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to approve merchant application.");
      }

      // NEW: Send approval email to merchant
      const merchantEmail = (application as any).email || (application as any).merchantEmail || "";
      if (merchantEmail) {
        fetch(SCRIPT_URL, {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to_email: merchantEmail,
            subject: "Your CHILVO Merchant Application is Approved ✅",
            message: "Congratulations!\n\nYour merchant application has been approved.\n\nBusiness Name: " + application.businessName + "\n\nYou can now log in and start adding your products to sell on CHILVO.\n\nWelcome aboard!\nCHILVO Team"
          })
        }).catch((err) => console.error("Approval email failed:", err));
      } else {
        console.warn("No merchant email found for application:", application.id);
      }

      setApplications((current) => current.filter((item) => item.id !== application.id));
    } catch (err) {
      console.error("Approve application error:", err);
      setError(err instanceof Error ? err.message : "Unable to approve merchant application.");
    }
  }

  // --- PRODUCT REVIEW LOGIC ---
  async function loadPendingProducts() {
    setProductsLoading(true);
    setProductMsg("");
    try {
      const q = query(collection(db, "products"), where("status", "==", "pending"));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ReviewProduct);
      setPendingProducts(list);
      if (list.length > 0) setSelectedProduct(list[0]);
      else setSelectedProduct(null);
    } catch (e: any) {
      console.error("Load pending products error:", e);
      setProductMsg(e.message || "Failed to load pending products. Check Firestore rules - admin must be able to read products.");
    } finally {
      setProductsLoading(false);
    }
  }

  async function approveProduct() {
    if (!selectedProduct) return;
    try {
      await updateDoc(doc(db, "products", selectedProduct.id), {
        status: "approved",
        reviewedAt: new Date().toISOString(),
      });
      setProductMsg(`✅ Approved: ${selectedProduct.name} - Now live in Shop`);
      setSelectedProduct(null);
      setRejectReason("");
      loadPendingProducts();
    } catch (e: any) {
      setProductMsg(e.message);
    }
  }

  async function rejectProduct() {
    if (!selectedProduct) return;
    if (!rejectReason.trim()) {
      setProductMsg("Please write a reject reason - merchant will see it.");
      return;
    }
    try {
      await updateDoc(doc(db, "products", selectedProduct.id), {
        status: "rejected",
        rejectReason: rejectReason.trim(),
        reviewedAt: new Date().toISOString(),
      });
      setProductMsg(`❌ Rejected: ${selectedProduct.name}`);
      setSelectedProduct(null);
      setRejectReason("");
      loadPendingProducts();
    } catch (e: any) {
      setProductMsg(e.message);
    }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        setError("You must be logged in.");
        setLoading(false);
        return;
      }
      loadApplications(currentUser);
      loadPendingProducts();
    });
    return () => unsubscribe();
  }, []);

  function getExt(name: string) {
    return name.split(".").pop()?.toUpperCase() || "UNKNOWN";
  }

  if (loading) {
    return (
      <main>
        <h1>Admin Panel</h1>
        <p>Loading...</p>
      </main>
    );
  }

  if (error) {
    return (
      <main>
        <h1>Admin Panel</h1>
        <p>{error}</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto" }}>
      <h1>Admin Panel</h1>

      {/* TABS */}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          onClick={() => setTab("products")}
          style={{
            flex: 1, padding: "14px", borderRadius: "10px", border: "none", cursor: "pointer",
            background: tab === "products" ? "#111" : "#eee",
            color: tab === "products" ? "#fff" : "#111",
            fontWeight: "bold",
          }}
        >
          Review Products ({pendingProducts.length} pending)
        </button>
        <button
          onClick={() => setTab("merchants")}
          style={{
            flex: 1, padding: "14px", borderRadius: "10px", border: "none", cursor: "pointer",
            background: tab === "merchants" ? "#111" : "#eee",
            color: tab === "merchants" ? "#fff" : "#111",
            fontWeight: "bold",
          }}
        >
          Merchant Applications ({applications.length})
        </button>
      </div>

      {/* ===== PRODUCTS TAB ===== */}
      {tab === "products" && (
        <div>
          <h2>Review Products</h2>
          <p>Open the file and read it before you approve. If it's a bank statement, personal doc, or doesn't match the category - REJECT it.</p>
          {productMsg && <p style={{ background: "#eef", padding: "10px", borderRadius: "8px" }}>{productMsg}</p>}
          {productsLoading && <p>Loading pending products...</p>}

          {!productsLoading && pendingProducts.length === 0 && (
            <p>No pending products. All reviewed ✅</p>
          )}

          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-start" }}>
            {/* List */}
            <div style={{ flex: 1, minWidth: "280px" }}>
              {pendingProducts.map((p) => (
                <button
                  key={p.id}
                  onClick={() => { setSelectedProduct(p); setRejectReason(""); setProductMsg(""); }}
                  style={{
                    display: "block", width: "100%", textAlign: "left", padding: "12px",
                    marginBottom: "8px", borderRadius: "10px", cursor: "pointer",
                    border: selectedProduct?.id === p.id ? "2px solid #111" : "1px solid #ddd",
                    background: selectedProduct?.id === p.id ? "#f0f0f0" : "#fff",
                  }}
                >
                  <strong>{p.name}</strong><br />
                  <span>{p.category} • ${p.price} • {getExt(p.fileName || "")}</span><br />
                  <span style={{ fontSize: "12px", color: "#666" }}>Merchant: {p.merchantId?.slice(0, 8)}...</span>
                </button>
              ))}
            </div>

            {/* Detail */}
            {selectedProduct && (
              <div style={{ flex: 2, minWidth: "320px", border: "1px solid #ddd", borderRadius: "12px", padding: "16px", background: "#fff" }}>
                <h3>{selectedProduct.name}</h3>
                {selectedProduct.image && (
                  <img src={selectedProduct.image} alt={selectedProduct.name} style={{ width: "100%", maxHeight: "250px", objectFit: "cover", borderRadius: "10px" }} />
                )}
                <p><strong>Category:</strong> {selectedProduct.category}</p>
                <p><strong>Price:</strong> ${selectedProduct.price} USD</p>
                <p><strong>Merchant ID:</strong> {selectedProduct.merchantId}</p>
                <p><strong>Uploaded:</strong> {String((selectedProduct as any).createdAt || "")}</p>
                <p><strong>Short Description:</strong><br />{selectedProduct.shortDescription}</p>
                <p><strong>Full Description:</strong><br />{selectedProduct.description}</p>

                <div style={{ background: "#f8f8f8", padding: "12px", borderRadius: "10px", margin: "12px 0" }}>
                  <p><strong>📁 File to Review:</strong></p>
                  <p>File Name: {selectedProduct.fileName}</p>
                  <p>File Type: {getExt(selectedProduct.fileName || "")}</p>
                  <p>File Link: {selectedProduct.cloudinaryFileRef ? "Available" : "MISSING"}</p>
                  {selectedProduct.cloudinaryFileRef && (
                    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                      <a href={selectedProduct.cloudinaryFileRef} target="_blank" rel="noreferrer" style={{ background: "#111", color: "#fff", padding: "10px 16px", borderRadius: "8px", textDecoration: "none" }}>
                        Open / Preview File 🔍
                      </a>
                      <a href={selectedProduct.cloudinaryFileRef} download={selectedProduct.fileName} style={{ background: "#fff", color: "#111", padding: "10px 16px", borderRadius: "8px", border: "1px solid #111", textDecoration: "none" }}>
                        Download File ⬇️
                      </a>
                    </div>
                  )}
                </div>

                <div>
                  <label><strong>Reject Reason:</strong></label>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="e.g. This is a bank statement, not a Template. Please upload a real CV Template."
                    style={{ width: "100%", minHeight: "70px", padding: "10px", borderRadius: "8px", marginTop: "6px", boxSizing: "border-box" }}
                  />
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                  <button onClick={approveProduct} style={{ flex: 1, background: "#1a7f37", color: "#fff", padding: "14px", borderRadius: "10px", border: "none", fontWeight: "bold", cursor: "pointer" }}>
                    ✅ Approve - Show in Shop
                  </button>
                  <button onClick={rejectProduct} style={{ flex: 1, background: "#d1242f", color: "#fff", padding: "14px", borderRadius: "10px", border: "none", fontWeight: "bold", cursor: "pointer" }}>
                    ❌ Reject
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ===== MERCHANTS TAB ===== */}
      {tab === "merchants" && (
        <div>
          <h2>Merchant Applications</h2>
          {applications.length === 0 ? (
            <p>No pending merchant applications.</p>
          ) : (
            applications.map((application) => (
              <article key={application.id} style={{ border: "1px solid #ddd", padding: "14px", borderRadius: "10px", marginBottom: "10px" }}>
                <h3>{application.businessName}</h3>
                <p>{application.businessDescription}</p>
                <p><strong>Status:</strong> {application.status}</p>
                <p><strong>Email:</strong> {(application as any).email || "No email saved"}</p>
                <button type="button" onClick={() => approveApplication(application)}>
                  Approve
                </button>
              </article>
            ))
          )}
        </div>
      )}
    </main>
  );
}
