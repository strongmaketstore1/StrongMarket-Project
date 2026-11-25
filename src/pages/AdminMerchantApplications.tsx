import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, updateDoc, setDoc, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import { emailMerchantApproved, emailMerchantRejected } from "../utils/email";
import type { MerchantApplication } from "../types/merchant";
import type { Product } from "../types/product";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwJ9ao3k6Q_7-UiEO2NIfWrsQ96vP1yuOttIDXJEnA5YAHaafTmKAAmnteQqmTOICg/exec";
const BACKEND = "https://strongmarket-payment-server.onrender.com";

// ✅ NEW ADMIN - chilvodigital@gmail.com
const ADMIN_UID = "QUBuXshWukX4FpUyPnMpjF3GGji2";
const ADMIN_EMAIL = "chilvodigital@gmail.com";

type MerchantApplicationWithId = MerchantApplication & { email?: string; _collection?: string };
type ReviewProduct = Product & { status?: string; merchantId?: string; merchantEmail?: string; fileName?: string; cloudinaryFileRef?: string; image?: string; rejectReason?: string };
type Tab = "merchants" | "products";

// Professional merchant application emails via same script
async function sendMerchantAppEmail(to: string, subject: string, htmlBody: string, message: string) {
  try {
    await fetch(SCRIPT_URL, { method: "POST", mode: "no-cors", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to_email: to, subject, message, htmlBody }) });
  } catch (e) { console.log("Email failed", e); }
}

const proLayout = (title: string, body: string) => `<div style="font-family:Inter,Arial,sans-serif;background:#f6f7f9;padding:32px 16px;"><div style="max-width:600px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);"><div style="background:#111827;padding:24px 32px;"><div style="color:#fff;font-size:24px;font-weight:800;">CHILVO<span style="color:#6366f1;">.</span></div><div style="color:#9ca3af;font-size:13px;margin-top:4px;">Digital Marketplace</div></div><div style="padding:32px;"><h2 style="margin:0 0 12px;font-size:22px;color:#111827;">${title}</h2>${body}</div><div style="padding:20px 32px;background:#f9fafb;color:#6b7280;font-size:12px;">© 2026 CHILVO • chilvodigital@gmail.com</div></div></div>`;

export default function AdminMerchantApplications() {
  const [tab, setTab] = useState<Tab>("merchants");
  const [applications, setApplications] = useState<MerchantApplicationWithId[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [merchantMsg, setMerchantMsg] = useState("");
  const [pendingProducts, setPendingProducts] = useState<ReviewProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<ReviewProduct | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [productMsg, setProductMsg] = useState("");
  const [productsLoading, setProductsLoading] = useState(false);
  const [fileBusy, setFileBusy] = useState(false);

  async function loadApplications() {
    try {
      setError("");
      // ✅ FIXED: Only correct collection, no space typo
      const q = query(collection(db, "merchantApplications"), where("status", "==", "pending"));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data(), _collection: "merchantApplications" }) as MerchantApplicationWithId);
      setApplications(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load merchant applications.");
    } finally { setLoading(false); }
  }

  async function approveApplication(application: MerchantApplicationWithId) {
    setMerchantMsg("");
    try {
      const collName = application._collection || "merchantApplications";
      await updateDoc(doc(db, collName, application.id), { status: "approved", reviewedAt: new Date().toISOString() });
      if (application.userId) {
        await setDoc(doc(db, "users", application.userId), { role: "merchant", isMerchant: true, merchantApproved: true, merchantStatus: "approved", businessName: application.businessName, email: (application as any).email || (application as any).merchantEmail || "" }, { merge: true });
      }
      const merchantEmail = (application as any).email || (application as any).merchantEmail || "";
      if (merchantEmail) {
        await sendMerchantAppEmail(merchantEmail, "Your CHILVO Merchant Application is Approved ✅", proLayout("Your Merchant Application is Approved! 🎉", `<p style="color:#374151;line-height:1.6;">Congratulations!</p><p style="color:#374151;">Business: <b>${application.businessName}</b></p><p style="color:#374151;">You can now log in and start adding products to sell on CHILVO.</p>`), "Approved");
      }
      setMerchantMsg(`✅ Approved: ${application.businessName} - Email sent. They can now add products.`);
      setApplications((current) => current.filter((item) => item.id !== application.id));
    } catch (err) { setMerchantMsg(err instanceof Error ? err.message : "Unable to approve merchant application."); }
  }

  async function rejectMerchantApplication(application: MerchantApplicationWithId) {
    setMerchantMsg("");
    try {
      const collName = application._collection || "merchantApplications";
      await updateDoc(doc(db, collName, application.id), { status: "rejected", reviewedAt: new Date().toISOString() });
      const merchantEmail = (application as any).email || (application as any).merchantEmail || "";
      if (merchantEmail) {
        await sendMerchantAppEmail(merchantEmail, "Update on your CHILVO Merchant Application", proLayout("Update on your application", `<p style="color:#374151;">Hi, thanks for applying with <b>${application.businessName}</b>.</p><p style="color:#374151;">We couldn't approve your merchant application at this time. Please review your business details and try again.</p>`), "Rejected");
      }
      setMerchantMsg(`❌ Rejected: ${application.businessName} - Email sent.`);
      setApplications((current) => current.filter((item) => item.id !== application.id));
    } catch (err) { setMerchantMsg(err instanceof Error ? err.message : "Unable to reject merchant application."); }
  }

  async function loadPendingProducts() {
    setProductsLoading(true); setProductMsg("");
    try {
      const q = query(collection(db, "products"), where("status", "==", "pending"));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }) as ReviewProduct);
      setPendingProducts(list);
      if (list.length > 0) setSelectedProduct(list[0]); else setSelectedProduct(null);
    } catch (e: any) { setProductMsg(e.message || "Failed to load pending products."); }
    finally { setProductsLoading(false); }
  }

  async function getMerchantEmailForProduct(p: ReviewProduct): Promise<string> {
    if (p.merchantEmail) return p.merchantEmail;
    if (!p.merchantId) return "";
    try {
      const snap = await getDoc(doc(db, "users", p.merchantId));
      if (snap.exists()) return snap.data().email || "";
    } catch {}
    return "";
  }

  async function getAdminDownloadUrl(productId: string): Promise<string | null> {
    try {
      const user = auth.currentUser;
      if (!user) { setProductMsg("Please log in as admin."); return null; }
      const idToken = await user.getIdToken();
      const response = await fetch(`${BACKEND}/api/products/${encodeURIComponent(productId)}/download?orderId=${encodeURIComponent("admin-review")}`, { headers: { Authorization: `Bearer ${idToken}` } });
      const result = await response.json();
      if (!response.ok || result?.success !== true || typeof result?.downloadUrl !== "string") { setProductMsg(result?.message || "Backend blocked admin download."); return null; }
      return result.downloadUrl as string;
    } catch (e: any) { setProductMsg(e.message || "Unable to get download link."); return null; }
  }

  async function downloadSelectedProduct() {
    if (!selectedProduct) return;
    setFileBusy(true);
    const url = await getAdminDownloadUrl(selectedProduct.id);
    setFileBusy(false);
    if (!url) return;
    const a = document.createElement("a"); a.href = url; a.download = selectedProduct.fileName || ""; a.target = "_blank"; a.rel = "noreferrer"; document.body.appendChild(a); a.click(); a.remove();
  }

  async function previewSelectedProduct() {
    if (!selectedProduct) return;
    setFileBusy(true);
    const url = await getAdminDownloadUrl(selectedProduct.id);
    setFileBusy(false);
    if (!url) return;
    const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    window.open(viewerUrl, "_blank", "noopener,noreferrer");
  }

  async function approveProduct() {
    if (!selectedProduct) return;
    try {
      const user = auth.currentUser;
      if (!user) { setProductMsg("Please log in as admin."); return; }
      const idToken = await user.getIdToken();
      const response = await fetch(`${BACKEND}/api/admin/products/${encodeURIComponent(selectedProduct.id)}/approve`, { method: "POST", headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" } });
      const result = await response.json();
      if (!response.ok || result?.success !== true) { setProductMsg(result?.message || "Unable to approve product."); return; }
      const merchantEmail = await getMerchantEmailForProduct(selectedProduct);
      if (merchantEmail) {
        try { await emailMerchantApproved(merchantEmail, selectedProduct.name); } catch (e) { console.log("Approve email failed", e); }
      }
      setProductMsg(`✅ Approved: ${selectedProduct.name} - Now live in Shop. Email sent to merchant.`);
      setSelectedProduct(null); setRejectReason(""); loadPendingProducts();
    } catch (e: any) { setProductMsg(e.message); }
  }

  async function rejectProduct() {
    if (!selectedProduct) return;
    if (!rejectReason.trim()) { setProductMsg("Please write a reject reason - merchant will see it."); return; }
    try {
      const user = auth.currentUser;
      if (!user) { setProductMsg("Please log in as admin."); return; }
      const idToken = await user.getIdToken();
      const response = await fetch(`${BACKEND}/api/admin/products/${encodeURIComponent(selectedProduct.id)}/reject`, { method: "POST", headers: { Authorization: `Bearer ${idToken}`, "Content-Type": "application/json" }, body: JSON.stringify({ rejectReason: rejectReason.trim() }) });
      const result = await response.json();
      if (!response.ok || result?.success !== true) { setProductMsg(result?.message || "Unable to reject product."); return; }
      const merchantEmail = await getMerchantEmailForProduct(selectedProduct);
      if (merchantEmail) {
        try { await emailMerchantRejected(merchantEmail, selectedProduct.name, rejectReason.trim()); } catch (e) { console.log("Reject email failed", e); }
      }
      setProductMsg(`❌ Rejected: ${selectedProduct.name} - Email sent with reason.`);
      setSelectedProduct(null); setRejectReason(""); loadPendingProducts();
    } catch (e: any) { setProductMsg(e.message); }
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) { setError("You must be logged in."); setLoading(false); return; }
      // ✅ NEW ADMIN CHECK - only chilvodigital can see Admin page
      if (currentUser.uid !== ADMIN_UID && currentUser.email !== ADMIN_EMAIL) {
        setError("Access denied. Admins only.");
        setLoading(false);
        return;
      }
      loadApplications(); loadPendingProducts();
    });
    return () => unsubscribe();
  }, []);

  function getExt(name: string) { return name.split(".").pop()?.toUpperCase() || "UNKNOWN"; }

  if (loading) return (<main style={{ padding: "32px", fontFamily: "Inter, Arial" }}><h1>Admin Panel</h1><p>Loading...</p></main>);

  return (
    <main style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto", fontFamily: "Inter, Arial, sans-serif" }}>
      <div style={{ background: "#111827", borderRadius: "16px", padding: "24px", color: "#fff", marginBottom: "20px" }}>
        <h1 style={{ margin: 0, fontSize: "26px" }}>Admin Panel</h1>
        <p style={{ margin: "8px 0 0", color: "#9ca3af", fontSize: "14px" }}>Review merchants and products. Approvals send a professional email automatically.</p>
      </div>
      {error && <p style={{ background: "#fde8e8", padding: "10px", borderRadius: "8px" }}>{error}</p>}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button onClick={() => setTab("merchants")} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "none", cursor: "pointer", background: tab === "merchants" ? "#111827" : "#eef0f2", color: tab === "merchants" ? "#fff" : "#111", fontWeight: 700 }}>Merchant Applications ({applications.length})</button>
        <button onClick={() => setTab("products")} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "none", cursor: "pointer", background: tab === "products" ? "#111827" : "#eef0f2", color: tab === "products" ? "#fff" : "#111", fontWeight: 700 }}>Review Products ({pendingProducts.length} pending)</button>
      </div>

      {tab === "merchants" && (
        <div>
          <h2>Merchant Applications</h2>
          <p style={{ color: "#666" }}>If business looks real, Approve. Approve gives them access to Add Product + sends email.</p>
          {merchantMsg && <p style={{ background: "#eef2ff", padding: "12px", borderRadius: "10px" }}>{merchantMsg}</p>}
          {applications.length === 0 ? <p>No pending merchant applications.</p> : applications.map((application) => (
            <article key={application.id} style={{ border: "1px solid #eef0f2", padding: "16px", borderRadius: "14px", marginBottom: "12px", background: "#fff", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" }}>
              <h3 style={{ margin: "0 0 6px" }}>{application.businessName}</h3>
              <p style={{ margin: "0 0 6px", color: "#374151" }}>{application.businessDescription}</p>
              <p><strong>Status:</strong> {application.status}</p>
              <p><strong>Email:</strong> {(application as any).email || "No email saved"}</p>
              <p><strong>User ID:</strong> {application.userId}</p>
              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button type="button" onClick={() => approveApplication(application)} style={{ flex: 1, background: "#1a7f37", color: "#fff", padding: "14px", borderRadius: "10px", border: "none", fontWeight: 700, cursor: "pointer" }}>✅ Approve - Give Add Product Access</button>
                <button type="button" onClick={() => rejectMerchantApplication(application)} style={{ flex: 1, background: "#d1242f", color: "#fff", padding: "14px", borderRadius: "10px", border: "none", fontWeight: 700, cursor: "pointer" }}>❌ Reject</button>
              </div>
            </article>
          ))}
        </div>
      )}

      {tab === "products" && (
        <div>
          <h2>Review Products</h2>
          <p style={{ color: "#666" }}>Open the file and read it before you approve. If it's a bank statement, personal doc, or doesn't match category - REJECT it.</p>
          {productMsg && <p style={{ background: "#eef2ff", padding: "12px", borderRadius: "10px" }}>{productMsg}</p>}
          {productsLoading && <p>Loading pending products...</p>}
          {!productsLoading && pendingProducts.length === 0 && <p>No pending products. All reviewed ✅</p>}
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: "280px" }}>
              {pendingProducts.map((p) => (
                <button key={p.id} onClick={() => { setSelectedProduct(p); setRejectReason(""); setProductMsg(""); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "12px", marginBottom: "8px", borderRadius: "12px", cursor: "pointer", border: selectedProduct?.id === p.id ? "2px solid #111827" : "1px solid #e5e7eb", background: selectedProduct?.id === p.id ? "#f0f0ff" : "#fff" }}>
                  <strong>{p.name}</strong><br /><span>{p.category} • ${p.price} • {getExt(p.fileName || "")}</span><br /><span style={{ fontSize: "12px", color: "#666" }}>Merchant: {(p.merchantEmail || p.merchantId?.slice(0, 8))}...</span>
                </button>
              ))}
            </div>
            {selectedProduct && (
              <div style={{ flex: 2, minWidth: "320px", border: "1px solid #eef0f2", borderRadius: "14px", padding: "18px", background: "#fff" }}>
                <h3 style={{ marginTop: 0 }}>{selectedProduct.name}</h3>
                {selectedProduct.image && <img src={selectedProduct.image} alt={selectedProduct.name} style={{ width: "100%", maxHeight: "250px", objectFit: "cover", borderRadius: "12px" }} />}
                <p><strong>Category:</strong> {selectedProduct.category}</p>
                <p><strong>Price:</strong> ${selectedProduct.price} USD</p>
                <p><strong>Merchant Email:</strong> {selectedProduct.merchantEmail || "Will fetch from user profile"}</p>
                <p><strong>Merchant ID:</strong> {selectedProduct.merchantId}</p>
                <p><strong>Short Description:</strong><br />{selectedProduct.shortDescription}</p>
                <p><strong>Full Description:</strong><br />{selectedProduct.description}</p>
                <div style={{ background: "#f9fafb", padding: "14px", borderRadius: "12px", margin: "12px 0" }}>
                  <p><strong>📁 File to Review:</strong></p>
                  <p>File Name: {selectedProduct.fileName}</p>
                  <p>File Type: {getExt(selectedProduct.fileName || "")}</p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button onClick={previewSelectedProduct} disabled={fileBusy} style={{ background: "#111827", color: "#fff", padding: "10px 16px", borderRadius: "10px", border: "none", cursor: "pointer" }}>{fileBusy ? "Getting link..." : "Open / Preview File 🔍"}</button>
                    <button onClick={downloadSelectedProduct} disabled={fileBusy} style={{ background: "#fff", color: "#111", padding: "10px 16px", borderRadius: "10px", border: "1px solid #111", cursor: "pointer" }}>{fileBusy ? "Getting link..." : "Download File ⬇️"}</button>
                  </div>
                </div>
                <div>
                  <label><strong>Reject Reason:</strong></label>
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. This is a bank statement, not a Template. Please upload a real CV Template." style={{ width: "100%", minHeight: "70px", padding: "12px", borderRadius: "10px", marginTop: "6px", boxSizing: "border-box", border: "1px solid #e5e7eb" }} />
                </div>
                <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                  <button onClick={approveProduct} style={{ flex: 1, background: "#1a7f37", color: "#fff", padding: "14px", borderRadius: "10px", border: "none", fontWeight: 700, cursor: "pointer" }}>✅ Approve - Show in Shop + Email Merchant</button>
                  <button onClick={rejectProduct} style={{ flex: 1, background: "#d1242f", color: "#fff", padding: "14px", borderRadius: "10px", border: "none", fontWeight: 700, cursor: "pointer" }}>❌ Reject + Email Reason</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
