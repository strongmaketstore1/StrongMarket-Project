import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, getDocs, query, updateDoc, setDoc, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import { emailMerchantApproved, emailMerchantRejected } from "../utils/email";
import type { MerchantApplication } from "../types/merchant";
import type { Product } from "../types/product";

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwJ9ao3k6Q_7-UiEO2NIfWrsQ96vP1yuOttIDXJEnA5YAHaafTmKAAmnteQqmTOICg/exec";
const BACKEND = "https://strongmarket-payment-server.onrender.com";
const ADMIN_UID = "QUBuXshWukX4FpUyPnMpjF3GGji2";
const ADMIN_EMAIL = "chilvodigital@gmail.com";

type MerchantApplicationWithId = MerchantApplication & { email?: string; _collection?: string };
type ReviewProduct = Product & { status?: string; merchantId?: string; merchantEmail?: string; fileName?: string; cloudinaryFileRef?: string; image?: string; rejectReason?: string };
type Tab = "merchants" | "products";

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
  const [actionBusy, setActionBusy] = useState(false);

  async function loadApplications() {
    try {
      setError("");
      const q = query(collection(db, "merchantApplications"), where("status", "==", "pending"));
      const snap = await getDocs(q);
      setApplications(snap.docs.map((d) => ({ id: d.id, ...d.data(), _collection: "merchantApplications" }) as MerchantApplicationWithId));
    } catch (err) { setError(err instanceof Error ? err.message : "Unable to load merchant applications."); }
    finally { setLoading(false); }
  }

  async function approveApplication(application: MerchantApplicationWithId) {
    setMerchantMsg("Approving merchant...");
    try {
      await updateDoc(doc(db, "merchantApplications", application.id), { status: "approved", reviewedAt: new Date().toISOString() });
      if (application.userId) {
        await setDoc(doc(db, "users", application.userId), { role: "merchant", isMerchant: true, merchantApproved: true, merchantStatus: "approved", businessName: application.businessName, email: (application as any).email || (application as any).merchantEmail || "" }, { merge: true });
      }
      const merchantEmail = (application as any).email || (application as any).merchantEmail || "";
      if (merchantEmail) await sendMerchantAppEmail(merchantEmail, "Your CHILVO Merchant Application is Approved ✅", proLayout("Your Merchant Application is Approved! 🎉", `<p style="color:#374151;">Congratulations! Business: <b>${application.businessName}</b></p><p style="color:#374151;">You can now log in and add products.</p>`), "Approved");
      setMerchantMsg(`✅ Approved: ${application.businessName}`);
      setApplications((c) => c.filter((i) => i.id !== application.id));
    } catch (err) { setMerchantMsg(err instanceof Error ? err.message : "Unable to approve merchant."); }
  }

  async function rejectMerchantApplication(application: MerchantApplicationWithId) {
    setMerchantMsg("Rejecting merchant...");
    try {
      await updateDoc(doc(db, "merchantApplications", application.id), { status: "rejected", reviewedAt: new Date().toISOString() });
      const merchantEmail = (application as any).email || (application as any).merchantEmail || "";
      if (merchantEmail) await sendMerchantAppEmail(merchantEmail, "Update on your CHILVO Merchant Application", proLayout("Update on your application", `<p style="color:#374151;">Hi, thanks for applying with <b>${application.businessName}</b>.</p><p style="color:#374151;">We couldn't approve it at this time.</p>`), "Rejected");
      setMerchantMsg(`❌ Rejected: ${application.businessName}`);
      setApplications((c) => c.filter((i) => i.id !== application.id));
    } catch (err) { setMerchantMsg(err instanceof Error ? err.message : "Unable to reject merchant."); }
  }

  async function loadPendingProducts() {
    setProductsLoading(true);
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
    try { const snap = await getDoc(doc(db, "users", p.merchantId)); if (snap.exists()) return snap.data().email || ""; } catch {}
    return "";
  }

  // ✅ FIXED: Use direct image/file URL first, only use Backend as fallback
  function getDirectUrl(p: ReviewProduct): string | null {
    const candidates = [
      (p as any).image,
      (p as any).cloudinaryFileRef,
      (p as any).fileUrl,
      (p as any).downloadUrl,
      (p as any).fileURL,
    ];
    for (const c of candidates) {
      if (typeof c === "string" && c.startsWith("http")) return c;
    }
    return null;
  }

  async function getAdminDownloadUrl(productId: string): Promise<string | null> {
    // 1. Try direct link first - instant, no Backend needed
    const direct = selectedProduct ? getDirectUrl(selectedProduct) : null;
    if (direct) { setProductMsg(""); return direct; }
    // 2. Fallback to Backend if no direct link saved
    try {
      const user = auth.currentUser;
      if (!user) { setProductMsg("Please log in as admin."); return null; }
      setProductMsg("Getting file link from Backend... please wait (Backend may wake up in 30s)...");
      const idToken = await user.getIdToken();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 45000);
      const response = await fetch(`${BACKEND}/api/products/${encodeURIComponent(productId)}/download?orderId=${encodeURIComponent("admin-review")}`, { headers: { Authorization: `Bearer ${idToken}` }, signal: controller.signal });
      clearTimeout(timeout);
      const result = await response.json();
      if (!response.ok || result?.success !== true || typeof result?.downloadUrl !== "string") { setProductMsg(`Download blocked by Backend: ${result?.message || "Backend still has OLD Admin UID. Approve/Reject will still work - only Download needs Backend fix."}`); return null; }
      setProductMsg("");
      return result.downloadUrl as string;
    } catch (e: any) { setProductMsg(e.name === "AbortError" ? "Backend is sleeping / too slow. Try again in 1 min." : (e.message || "Unable to get download link.")); return null; }
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
    // If it's an image, open directly. If it's a PDF/doc, use Google Viewer.
    const isImage = /\.(png|jpg|jpeg|gif|webp|avif)(\?|$)/i.test(url) || url.includes("image/upload");
    if (isImage) {
      window.open(url, "_blank", "noopener,noreferrer");
    } else {
      window.open(`https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`, "_blank", "noopener,noreferrer");
    }
  }

  // ✅ FIXED - NO BACKEND, Firestore only, instant
  async function approveProduct() {
    if (!selectedProduct) { setProductMsg("Click a product on the left first."); return; }
    if (actionBusy) return;
    setActionBusy(true);
    setProductMsg("⏳ Approving... please wait...");
    try {
      await updateDoc(doc(db, "products", selectedProduct.id), { status: "approved", reviewedAt: new Date().toISOString(), rejectReason: "" });
      const merchantEmail = await getMerchantEmailForProduct(selectedProduct);
      if (merchantEmail) { try { await emailMerchantApproved(merchantEmail, selectedProduct.name); } catch (e) { console.log("Approve email failed", e); } }
      setProductMsg(`✅ Approved: ${selectedProduct.name} - Now live in Shop.`);
      setSelectedProduct(null); setRejectReason(""); await loadPendingProducts();
    } catch (e: any) { setProductMsg(`❌ Approve failed: ${e.message} - Check Firestore Rules are Published.`); }
    finally { setActionBusy(false); }
  }

  // ✅ FIXED - NO BACKEND, Firestore only
  async function rejectProduct() {
    if (!selectedProduct) { setProductMsg("Click a product on the left first."); return; }
    if (!rejectReason.trim()) { setProductMsg("⚠️ Please write a reject reason first."); return; }
    if (actionBusy) return;
    setActionBusy(true);
    setProductMsg("⏳ Rejecting... please wait...");
    try {
      await updateDoc(doc(db, "products", selectedProduct.id), { status: "rejected", rejectReason: rejectReason.trim(), reviewedAt: new Date().toISOString() });
      const merchantEmail = await getMerchantEmailForProduct(selectedProduct);
      if (merchantEmail) { try { await emailMerchantRejected(merchantEmail, selectedProduct.name, rejectReason.trim()); } catch (e) { console.log("Reject email failed", e); } }
      setProductMsg(`❌ Rejected: ${selectedProduct.name} - Email sent.`);
      setSelectedProduct(null); setRejectReason(""); await loadPendingProducts();
    } catch (e: any) { setProductMsg(`❌ Reject failed: ${e.message}`); }
    finally { setActionBusy(false); }
  }

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) { setError("You must be logged in."); setLoading(false); return; }
      if (u.uid !== ADMIN_UID && u.email !== ADMIN_EMAIL) { setError("Access denied. Admins only."); setLoading(false); return; }
      loadApplications(); loadPendingProducts();
    });
    return () => unsub();
  }, []);

  function getExt(name: string) { return name.split(".").pop()?.toUpperCase() || "UNKNOWN"; }
  if (loading) return (<main style={{ padding: "32px", fontFamily: "Inter, Arial" }}><h1>Admin Panel</h1><p>Loading...</p></main>);

  return (
    <main style={{ padding: "20px", maxWidth: "1100px", margin: "0 auto", fontFamily: "Inter, Arial, sans-serif" }}>
      <div style={{ background: "#111827", borderRadius: "16px", padding: "24px", color: "#fff", marginBottom: "20px" }}>
        <h1 style={{ margin: 0, fontSize: "26px" }}>Admin Panel</h1>
        <p style={{ margin: "8px 0 0", color: "#9ca3af", fontSize: "14px" }}>Review merchants and products. Approvals send email automatically.</p>
      </div>
      {error && <p style={{ background: "#fde8e8", padding: "10px", borderRadius: "8px" }}>{error}</p>}
      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button type="button" onClick={() => setTab("merchants")} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "none", cursor: "pointer", background: tab === "merchants" ? "#111827" : "#eef0f2", color: tab === "merchants" ? "#fff" : "#111", fontWeight: 700 }}>Merchant Applications ({applications.length})</button>
        <button type="button" onClick={() => setTab("products")} style={{ flex: 1, padding: "14px", borderRadius: "12px", border: "none", cursor: "pointer", background: tab === "products" ? "#111827" : "#eef0f2", color: tab === "products" ? "#fff" : "#111", fontWeight: 700 }}>Review Products ({pendingProducts.length} pending)</button>
      </div>
      {tab === "merchants" && (
        <div>
          <h2>Merchant Applications</h2>
          {merchantMsg && <p style={{ background: "#eef2ff", padding: "12px", borderRadius: "10px" }}>{merchantMsg}</p>}
          {applications.length === 0 ? <p>No pending merchant applications.</p> : applications.map((a) => (
            <article key={a.id} style={{ border: "1px solid #eef0f2", padding: "16px", borderRadius: "14px", marginBottom: "12px", background: "#fff" }}>
              <h3 style={{ margin: "0 0 6px" }}>{a.businessName}</h3>
              <p style={{ margin: "0 0 6px", color: "#374151" }}>{a.businessDescription}</p>
              <p><strong>Email:</strong> {(a as any).email || "No email"}</p>
              <p><strong>User ID:</strong> {a.userId}</p>
              <div style={{ display: "flex", gap: "10px", marginTop: "12px" }}>
                <button type="button" onClick={() => approveApplication(a)} style={{ flex: 1, background: "#1a7f37", color: "#fff", padding: "14px", borderRadius: "10px", border: "none", fontWeight: 700, cursor: "pointer" }}>✅ Approve</button>
                <button type="button" onClick={() => rejectMerchantApplication(a)} style={{ flex: 1, background: "#d1242f", color: "#fff", padding: "14px", borderRadius: "10px", border: "none", fontWeight: 700, cursor: "pointer" }}>❌ Reject</button>
              </div>
            </article>
          ))}
        </div>
      )}
      {tab === "products" && (
        <div>
          <h2>Review Products</h2>
          <p style={{ color: "#666" }}>Click a product on the LEFT, then Approve / Reject on the RIGHT.</p>
          {productMsg && <p style={{ background: "#eef2ff", padding: "12px", borderRadius: "10px" }}>{productMsg}</p>}
          {productsLoading && <p>Loading pending products...</p>}
          {!productsLoading && pendingProducts.length === 0 && <p>No pending products. All reviewed ✅</p>}
          <div style={{ display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: "280px" }}>
              {pendingProducts.map((p) => (
                <button type="button" key={p.id} onClick={() => { setSelectedProduct(p); setRejectReason(""); setProductMsg(""); }} style={{ display: "block", width: "100%", textAlign: "left", padding: "12px", marginBottom: "8px", borderRadius: "12px", cursor: "pointer", border: selectedProduct?.id === p.id ? "2px solid #111827" : "1px solid #e5e7eb", background: selectedProduct?.id === p.id ? "#f0f0ff" : "#fff" }}>
                  <strong>{p.name}</strong><br /><span>{p.category} • ${p.price} • {getExt(p.fileName || "")}</span><br /><span style={{ fontSize: "12px", color: "#666" }}>{p.merchantEmail || p.merchantId}</span>
                </button>
              ))}
            </div>
            {selectedProduct && (
              <div style={{ flex: 2, minWidth: "320px", border: "1px solid #eef0f2", borderRadius: "14px", padding: "18px", background: "#fff" }}>
                <h3 style={{ marginTop: 0 }}>{selectedProduct.name}</h3>
                {selectedProduct.image && <img src={selectedProduct.image} alt={selectedProduct.name} style={{ width: "100%", maxHeight: "250px", objectFit: "cover", borderRadius: "12px" }} />}
                <p><strong>Category:</strong> {selectedProduct.category}</p>
                <p><strong>Price:</strong> ${selectedProduct.price} USD</p>
                <p><strong>Merchant:</strong> {selectedProduct.merchantEmail || selectedProduct.merchantId}</p>
                <p><strong>Short:</strong><br />{selectedProduct.shortDescription}</p>
                <p><strong>Description:</strong><br />{selectedProduct.description}</p>
                <div style={{ background: "#f9fafb", padding: "14px", borderRadius: "12px", margin: "12px 0" }}>
                  <p><strong>📁 File:</strong> {selectedProduct.fileName} ({getExt(selectedProduct.fileName || "")})</p>
                  <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                    <button type="button" onClick={previewSelectedProduct} disabled={fileBusy} style={{ background: "#111827", color: "#fff", padding: "10px 16px", borderRadius: "10px", border: "none", cursor: "pointer" }}>{fileBusy ? "Getting link..." : "Open / Preview 🔍"}</button>
                    <button type="button" onClick={downloadSelectedProduct} disabled={fileBusy} style={{ background: "#fff", color: "#111", padding: "10px 16px", borderRadius: "10px", border: "1px solid #111", cursor: "pointer" }}>{fileBusy ? "Getting link..." : "Download ⬇️"}</button>
                  </div>
                </div>
                <div>
                  <label><strong>Reject Reason:</strong></label>
                  <textarea value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="e.g. This is a bank statement, not a Template." style={{ width: "100%", minHeight: "70px", padding: "12px", borderRadius: "10px", marginTop: "6px", boxSizing: "border-box", border: "1px solid #e5e7eb" }} />
                </div>
                <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                  <button type="button" onClick={approveProduct} disabled={actionBusy} style={{ flex: 1, background: actionBusy ? "#9ca3af" : "#1a7f37", color: "#fff", padding: "14px", borderRadius: "10px", border: "none", fontWeight: 700, cursor: "pointer" }}>{actionBusy ? "Working..." : "✅ Approve - Show in Shop"}</button>
                  <button type="button" onClick={rejectProduct} disabled={actionBusy} style={{ flex: 1, background: actionBusy ? "#9ca3af" : "#d1242f", color: "#fff", padding: "14px", borderRadius: "10px", border: "none", fontWeight: 700, cursor: "pointer" }}>{actionBusy ? "Working..." : "❌ Reject"}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
