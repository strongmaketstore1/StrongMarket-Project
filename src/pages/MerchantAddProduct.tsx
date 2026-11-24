import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { addDoc, collection, doc, getDoc } from "firebase/firestore";
import { auth, db } from "../firebase";
import { emailAdminNewProduct } from "../utils/email";
import type { ProductCategory } from "../types/product";

const categories: { label: string; value: ProductCategory }[] = [
  { label: "Templates", value: "templates" },
  { label: "AI Prompt Packs", value: "prompt-packs" },
  { label: "Guides", value: "guides" },
];

const ALLOWED_BY_CATEGORY: Record<ProductCategory, string[]> = {
  templates: ["pdf", "docx", "xlsx", "pptx", "zip"],
  "prompt-packs": ["pdf", "txt", "md", "docx", "json", "csv", "zip"],
  guides: ["pdf", "epub", "docx", "txt"],
};

const ACCEPT_BY_CATEGORY: Record<ProductCategory, string> = {
  templates: ".pdf,.docx,.xlsx,.pptx,.zip",
  "prompt-packs": ".pdf,.txt,.md,.docx,.json,.csv,.zip",
  guides: ".pdf,.epub,.docx,.txt",
};

const MAX_FILE_SIZE = 20 * 1024 * 1024;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function getExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export default function MerchantAddProduct() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState<ProductCategory>("templates");
  const [image, setImage] = useState("");
  const [fileName, setFileName] = useState("");
  const [cloudinaryFileRef, setCloudinaryFileRef] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  function changeCategory(value: ProductCategory) {
    setCategory(value);
    if (cloudinaryFileRef || fileName) {
      setCloudinaryFileRef("");
      setFileName("");
      setMessage(`Category changed to ${value}. Please upload a new file for this category.`);
    } else {
      setMessage("");
    }
  }

  async function uploadProductFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setMessage("File is too large. Max size is 20MB.");
      event.target.value = "";
      return;
    }
    const ext = getExtension(file.name);
    const allowed = ALLOWED_BY_CATEGORY[category];
    if (!allowed.includes(ext)) {
      setMessage(`Wrong file type for ${category}. Allowed: ${allowed.map((e) => "." + e).join(", ")} - You uploaded .${ext || "unknown"}`);
      event.target.value = "";
      return;
    }
    try {
      const user = auth.currentUser;
      if (!user) { setMessage("You must be logged in."); return; }
      setUploadingFile(true);
      setMessage("");
      const idToken = await user.getIdToken();
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("https://strongmarket-payment-server.onrender.com/api/products/upload", {
        method: "POST",
        headers: { Authorization: `Bearer ${idToken}` },
        body: formData,
      });
      const result = await response.json();
      if (!response.ok || result?.success !== true) {
        setMessage(result?.message || "Unable to upload product file.");
        return;
      }
      if (!result.fileReference) {
        setMessage("File reference missing. Please try again.");
        return;
      }
      setCloudinaryFileRef(result.fileReference);
      setFileName(result.fileName || file.name);
      setMessage("Product file uploaded successfully.");
    } catch (error) {
      console.error("Product file upload error:", error);
      setMessage(error instanceof Error ? `Upload error: ${error.message}` : "Unable to upload product file. Please try again.");
    } finally {
      setUploadingFile(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setMessage("");
    setLoading(true);
    try {
      const user = auth.currentUser;
      if (!user) { setMessage("You must be logged in."); return; }
      const userSnapshot = await getDoc(doc(db, "users", user.uid));
      if (!userSnapshot.exists() || userSnapshot.data().merchantStatus !== "approved") {
        setMessage("Only approved merchants can add products.");
        return;
      }
      if (!name.trim()) { setMessage("Please enter a product name."); return; }
      if (!image.trim()) { setMessage("Please upload a product image first."); return; }
      if (!cloudinaryFileRef.trim() || !fileName.trim()) {
        setMessage("Please upload the digital product file first.");
        return;
      }
      const finalExt = getExtension(fileName);
      const allowed = ALLOWED_BY_CATEGORY[category];
      if (!allowed.includes(finalExt)) {
        setMessage(`This file (.${finalExt}) is not allowed for ${category}. Allowed: ${allowed.map((e) => "." + e).join(", ")}. Please upload a new file.`);
        return;
      }
      if (!Number.isFinite(Number(price)) || Number(price) <= 0) {
        setMessage("Enter a valid price greater than zero.");
        return;
      }
      const productSlug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
      await addDoc(collection(db, "products"), {
        name: name.trim(),
        slug: productSlug,
        description: description.trim(),
        shortDescription: shortDescription.trim(),
        price: Number(price),
        currency: "USD",
        category,
        image: image.trim(),
        fileName: fileName.trim(),
        cloudinaryFileRef: cloudinaryFileRef.trim(),
        featured: false,
        rating: 0,
        reviewCount: 0,
        createdAt: new Date().toISOString(),
        merchantId: user.uid,
        merchantEmail: user.email || "",
        status: "pending",
      });

      // Professional email to Admin - no bell, no local notification
      try {
        await emailAdminNewProduct("chilvodigital@gmail.com", name.trim(), `$${price} USD`, user.email || "Unknown merchant");
      } catch (e) {
        console.log("Email failed, but product was saved", e);
      }

      setMessage("Product submitted for review. It will appear in Shop after Admin approves it.");
      setName("");
      setDescription("");
      setShortDescription("");
      setPrice("");
      setCategory("templates");
      setImage("");
      setFileName("");
      setCloudinaryFileRef("");
    } catch (error) {
      console.error("Add product error:", error);
      setMessage(error instanceof Error ? error.message : "Unable to add product. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const allowedForThisCategory = ALLOWED_BY_CATEGORY[category];
  const inputStyle: React.CSSProperties = { width: "100%", padding: "12px 14px", borderRadius: "10px", border: "1px solid #e5e7eb", fontSize: "14px", outline: "none", background: "#fff", boxSizing: "border-box" };
  const labelStyle: React.CSSProperties = { display: "block", fontSize: "13px", fontWeight: 600, color: "#111827", marginBottom: "6px" };

  return (
    <main style={{ maxWidth: "720px", margin: "0 auto", padding: "32px 16px", fontFamily: "Inter, Arial, sans-serif" }}>
      <div style={{ background: "#111827", borderRadius: "16px", padding: "24px", color: "#fff", marginBottom: "24px" }}>
        <h1 style={{ margin: 0, fontSize: "26px", letterSpacing: "-0.5px" }}>Add Product</h1>
        <p style={{ margin: "8px 0 0", color: "#9ca3af", fontSize: "14px" }}>Add a digital product to CHILVO. It will be reviewed before going live.</p>
      </div>

      <form onSubmit={handleSubmit} style={{ background: "#fff", border: "1px solid #eef0f2", borderRadius: "16px", padding: "24px", display: "flex", flexDirection: "column", gap: "18px", boxShadow: "0 4px 20px rgba(0,0,0,0.04)" }}>
        <div>
          <label htmlFor="name" style={labelStyle}>Product Name</label>
          <input id="name" type="text" value={name} onChange={(e) => setName(e.target.value)} required style={inputStyle} placeholder="e.g. Ultimate Notion Template Pack" />
        </div>
        <div>
          <label htmlFor="shortDescription" style={labelStyle}>Short Description</label>
          <input id="shortDescription" type="text" value={shortDescription} onChange={(e) => setShortDescription(e.target.value)} required style={inputStyle} placeholder="One-line summary for Shop cards" />
        </div>
        <div>
          <label htmlFor="description" style={labelStyle}>Description</label>
          <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} required style={{ ...inputStyle, minHeight: "110px", resize: "vertical" }} placeholder="Full details, what's inside, who it's for..." />
        </div>
        <div style={{ display: "flex", gap: "16px" }}>
          <div style={{ flex: 1 }}>
            <label htmlFor="price" style={labelStyle}>Price (USD)</label>
            <input id="price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} required style={inputStyle} placeholder="19.00" />
          </div>
          <div style={{ flex: 1 }}>
            <label htmlFor="category" style={labelStyle}>Category</label>
            <select id="category" value={category} onChange={(e) => changeCategory(e.target.value as ProductCategory)} style={inputStyle}>
              {categories.map((item) => (<option key={item.value} value={item.value}>{item.label}</option>))}
            </select>
          </div>
        </div>
        <p style={{ fontSize: "13px", color: "#666", margin: "-10px 0 0" }}>Allowed for {category}: {allowedForThisCategory.map((e) => "." + e).join(", ")} - Max 20MB</p>

        <div>
          <label htmlFor="image" style={labelStyle}>Product Image</label>
          <input id="image" type="file" accept="image/png,image/jpeg,image/webp" style={inputStyle} onChange={async (event) => {
            const file = event.target.files?.[0];
            if (!file) return;
            if (file.size > MAX_IMAGE_SIZE) { setMessage("Image is too large. Max size is 5MB."); event.target.value = ""; return; }
            try {
              const user = auth.currentUser;
              if (!user) { setMessage("You must be logged in."); return; }
              setUploadingImage(true);
              setMessage("Uploading product image...");
              const idToken = await user.getIdToken();
              const formData = new FormData();
              formData.append("file", file);
              const response = await fetch("https://strongmarket-payment-server.onrender.com/api/products/upload", { method: "POST", headers: { Authorization: `Bearer ${idToken}` }, body: formData });
              const result = await response.json();
              if (!response.ok || result?.success !== true) { setMessage(result?.message || "Unable to upload product image."); return; }
              setImage(result.secureUrl || "");
              setMessage("Product image uploaded successfully.");
            } catch (error) {
              console.error("Product image upload error:", error);
              setMessage(error instanceof Error ? error.message : "Unable to upload product image.");
            } finally { setUploadingImage(false); }
          }} />
          {image && <img src={image} alt="Preview" style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "12px", marginTop: "10px" }} />}
        </div>

        <div>
          <label htmlFor="fileName" style={labelStyle}>Digital File Name</label>
          <input id="fileName" type="text" value={fileName} onChange={(e) => setFileName(e.target.value)} placeholder="my-product.pdf" readOnly style={{ ...inputStyle, background: "#f9fafb" }} />
        </div>
        <div>
          <label htmlFor="productFile" style={labelStyle}>Digital Product File</label>
          <input id="productFile" type="file" accept={ACCEPT_BY_CATEGORY[category]} onChange={uploadProductFile} style={inputStyle} />
          {fileName && <p style={{ fontSize: "13px", color: "#1a7f37" }}>Uploaded: {fileName}</p>}
        </div>

        <button type="submit" disabled={loading || uploadingFile || uploadingImage} style={{ background: "#6366f1", color: "#fff", border: "none", padding: "14px", borderRadius: "10px", fontWeight: 700, fontSize: "15px", cursor: "pointer", opacity: loading || uploadingFile || uploadingImage ? 0.6 : 1 }}>
          {uploadingImage ? "Uploading Image..." : uploadingFile ? "Uploading File..." : loading ? "Adding Product..." : "Add Product → Submit for Review"}
        </button>
      </form>
      {message && <p style={{ marginTop: "16px", background: "#f0fdf4", border: "1px solid #bbf7d0", padding: "12px 16px", borderRadius: "10px", fontSize: "14px" }}>{message}</p>}
    </main>
  );
}
