import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
import { useNavigate, useParams } from "react-router-dom";

import { auth, db } from "../firebase";
import type { ProductCategory } from "../types/product";

const categories: {
  label: string;
  value: ProductCategory;
}[] = [
  { label: "Templates", value: "templates" },
  { label: "AI Prompt Packs", value: "prompt-packs" },
  { label: "Ebooks", value: "ebooks" },
  { label: "Design", value: "design" },
  { label: "Music", value: "music" },
];

function normalizeCategory(raw: any): ProductCategory {
  const s = String(raw || "").toLowerCase().trim();
  if (s === "templates" || s === "template") return "templates";
  if (s === "prompt-packs" || s === "prompt-pack" || s === "ai prompt packs") return "prompt-packs";
  if (s === "ebooks" || s === "ebook" || s === "guides" || s === "guide" || s === "courses" || s === "course") return "ebooks";
  if (s === "design") return "design";
  if (s === "music") return "music";
  return "templates";
}

export default function MerchantEditProduct() {
  const { productId } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] =
    useState<ProductCategory>("templates");
  const [license, setLicense] = useState("personal");
  const [image, setImage] = useState("");
  const [fileName, setFileName] = useState("");
  // FIXED: Track status + reason to show banner
  const [currentStatus, setCurrentStatus] = useState("");
  const [currentRejectReason, setCurrentRejectReason] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadProduct() {
      if (!productId) {
        setMessage("Product not found.");
        setLoading(false);
        return;
      }

      const user = auth.currentUser;

      if (!user) {
        setMessage("You must be logged in.");
        setLoading(false);
        return;
      }

      try {
        const productRef = doc(db, "products", productId);
        const snapshot = await getDoc(productRef);

        if (!snapshot.exists()) {
          setMessage("Product not found.");
          setLoading(false);
          return;
        }

        const data = snapshot.data();

        if (data.merchantId !== user.uid) {
          setMessage("You are not allowed to edit this product.");
          setLoading(false);
          return;
        }

        setName(data.name || "");
        setDescription(data.description || "");
        setShortDescription(data.shortDescription || "");
        setPrice(String(data.price ?? ""));
        setCategory(normalizeCategory(data.category));
        setLicense(data.license || "personal");
        setImage(data.image || "");
        setFileName(data.fileName || "");
        // FIXED: Load status
        setCurrentStatus(data.status || "pending");
        setCurrentRejectReason(data.rejectReason || "");
      } catch (error) {
        console.error(error);
        setMessage("Unable to load product.");
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [productId]);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    if (!productId) {
      setMessage("Product not found.");
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      setMessage("You must be logged in.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const productRef = doc(db, "products", productId);
      const snapshot = await getDoc(productRef);

      if (!snapshot.exists()) {
        setMessage("Product not found.");
        return;
      }

      const data = snapshot.data();

      if (data.merchantId !== user.uid) {
        setMessage("You are not allowed to edit this product.");
        return;
      }

      // FIXED: This is the magic - resubmit for review
      await updateDoc(productRef, {
        name: name.trim(),
        description: description.trim(),
        shortDescription: shortDescription.trim(),
        price: Number(price),
        currency: "NGN",
        category,
        license: category === "music" ? license : "",
        image: image.trim(),
        fileName: fileName.trim(),
        status: "pending", // <-- Goes back to Admin queue
        rejectReason: "", // <-- Clear old reason
        updatedAt: new Date().toISOString(),
      });

      setMessage("✅ Product updated and resubmitted for review! It is now Pending again.");

      setTimeout(() => {
        navigate("/merchant/products");
      }, 1000);
    } catch (error) {
      console.error(error);
      setMessage("Unable to update product. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <main>
        <h1>Edit Product</h1>
        <p>Loading product...</p>
      </main>
    );
  }

  if (message && !name) {
    return (
      <main>
        <h1>Edit Product</h1>
        <p>{message}</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Edit Product</h1>

      {/* FIXED: Show merchant why it was rejected */}
      {currentStatus === "rejected" && (
        <div style={{ background: "#fdecea", border: "1px solid #f5b5b0", padding: "14px", borderRadius: "10px", marginBottom: "16px" }}>
          <b style={{ color: "#d1242f" }}>❌ This product was Rejected</b>
          {currentRejectReason && <p style={{ margin: "6px 0 0", color: "#666" }}>Reason: {currentRejectReason}</p>}
          <p style={{ margin: "6px 0 0", color: "#666", fontSize: "13px" }}>Fix it below and Save - it will go back to Pending for Admin to review again.</p>
        </div>
      )}
      {currentStatus === "approved" && (
        <div style={{ background: "#fff7e6", border: "1px solid #ffe0a3", padding: "14px", borderRadius: "10px", marginBottom: "16px" }}>
          <b>⚠️ Note:</b> This product is currently Approved / Live. If you save changes, it will go back to Pending and be hidden from Shop until Admin approves it again.
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">Product Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="shortDescription">Short Description</label>
          <input
            id="shortDescription"
            type="text"
            value={shortDescription}
            onChange={(event) => setShortDescription(event.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="description">Description</label>
          <textarea
            id="description"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="price">Price (NGN)</label>
          <input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
            required
          />
        </div>

        <div>
          <label htmlFor="category">Category</label>
          <select
            id="category"
            value={category}
            onChange={(event) =>
              setCategory(event.target.value as ProductCategory)
            }
          >
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {category === "music" && (
          <div>
            <label htmlFor="license">License - For Music Only</label>
            <select
              id="license"
              value={license}
              onChange={(event) => setLicense(event.target.value)}
            >
              <option value="personal">Personal - Listen only</option>
              <option value="commercial">Commercial - Use in your song / content</option>
            </select>
          </div>
        )}

        <div>
          <label htmlFor="image">Product Image</label>
          <input
            id="image"
            type="text"
            value={image}
            onChange={(event) => setImage(event.target.value)}
          />
          {image && (
            <div>
              <img src={image} alt={name} width="200" />
            </div>
          )}
        </div>

        <div>
          <label htmlFor="fileName">Digital File Name</label>
          <input
            id="fileName"
            type="text"
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
          />
        </div>

        <button type="submit" disabled={saving}>
          {saving ? "Saving..." : "Save Changes & Resubmit for Review"}
        </button>
      </form>

      {message && <p>{message}</p>}
    </main>
  );
}
