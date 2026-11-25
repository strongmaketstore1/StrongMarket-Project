import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { addDoc, collection } from "firebase/firestore";
import { auth, db } from "../firebase";

const CLOUD = "hvssq06f";
const PRESET = "chilvo_unsigned";

async function uploadToCloudinary(file: File, type: "image" | "raw") {
  const fd = new FormData();
  fd.append("file", file);
  fd.append("upload_preset", PRESET);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD}/${type}/upload`, { method: "POST", body: fd });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || "Upload failed");
  return data as { secure_url: string; public_id: string };
}

export default function MerchantAddProduct() {
  const [userId, setUserId] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [name, setName] = useState("");
  const [category, setCategory] = useState("Templates");
  const [price, setPrice] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [description, setDescription] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [productFile, setProductFile] = useState<File | null>(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const un = onAuthStateChanged(auth, (u) => {
      if (u) { setUserId(u.uid); setUserEmail(u.email || ""); }
    });
    return () => un();
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!userId) { setMsg("Please log in as merchant."); return; }
    if (!name.trim() || !price || !imageFile || !productFile) { setMsg("Fill name, price, cover image and product file."); return; }
    setBusy(true); setMsg("Uploading...");
    try {
      const img = await uploadToCloudinary(imageFile, "image");
      const fileUp = await uploadToCloudinary(productFile, "raw");
      await addDoc(collection(db, "products"), {
        name: name.trim(),
        category,
        price: Number(price),
        shortDescription: shortDescription.trim(),
        description: description.trim(),
        image: img.secure_url,
        fileName: productFile.name,
        cloudinaryFileRef: fileUp.public_id,
        merchantId: userId,
        merchantEmail: userEmail,
        status: "pending",
        rejectReason: "",
        createdAt: new Date().toISOString(),
      });
      setMsg("✅ Sent for review! Admin will approve it.");
      setName(""); setPrice(""); setShortDescription(""); setDescription("");
      setImageFile(null); setProductFile(null);
    } catch (err: any) { setMsg(err.message || "Failed to add product."); }
    finally { setBusy(false); }
  }

  const input: React.CSSProperties = { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #e5e7eb", boxSizing: "border-box", marginTop: "6px" };

  return (
    <main style={{ padding: "20px", maxWidth: "700px", margin: "0 auto", fontFamily: "Inter, Arial" }}>
      <h1>Add Product</h1>
      <p style={{ color: "#666" }}>Upload your product. Admin will review it before it goes live.</p>
      {msg && <p style={{ background: "#eef2ff", padding: "12px", borderRadius: "10px" }}>{msg}</p>}
      <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
        <label><strong>Product Name</strong><input style={input} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Professional CV Template" /></label>
        <label><strong>Category</strong><select style={input} value={category} onChange={(e) => setCategory(e.target.value)}><option>Templates</option><option>Ebooks</option><option>Courses</option><option>Design</option><option>Music</option><option>Other</option></select></label>
        <label><strong>Price (USD)</strong><input style={input} type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="9.99" /></label>
        <label><strong>Short Description</strong><input style={input} value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} placeholder="One line for shop listing" /></label>
        <label><strong>Full Description</strong><textarea style={{ ...input, minHeight: "90px" }} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What will buyer get?" /></label>
        <label><strong>Cover Image (JPG/PNG)</strong><input style={input} type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files?.[0] || null)} /></label>
        <label><strong>Product File (PDF / DOC / ZIP)</strong><input style={input} type="file" onChange={(e) => setProductFile(e.target.files?.[0] || null)} /></label>
        <button disabled={busy} style={{ background: "#111827", color: "#fff", padding: "14px", borderRadius: "10px", border: "none", fontWeight: 700, cursor: "pointer" }}>{busy ? "Uploading..." : "Submit for Review"}</button>
      </form>
    </main>
  );
}
