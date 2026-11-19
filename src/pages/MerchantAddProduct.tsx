import { useState } from "react";
import type {
  ChangeEvent,
  FormEvent,
} from "react";
import {
  addDoc,
  collection,
  doc,
  getDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";
import type { ProductCategory } from "../types/product";

const categories: {
  label: string;
  value: ProductCategory;
}[] = [
  { label: "Templates", value: "templates" },
  { label: "AI Prompt Packs", value: "prompt-packs" },
  { label: "Guides", value: "guides" },
];

// FIX: Allowed file types per category
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

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5MB

function getExtension(fileName: string): string {
  const parts = fileName.toLowerCase().split(".");
  return parts.length > 1 ? parts[parts.length - 1] : "";
}

export default function MerchantAddProduct() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] =
    useState<ProductCategory>("templates");
  const [image, setImage] = useState("");
  const [fileName, setFileName] = useState("");
  const [cloudinaryFileRef, setCloudinaryFileRef] = useState("");
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // When category changes, clear old file - it may be wrong type for new category
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
    if (!file) {
      return;
    }

    // FIX 1: Check size first
    if (file.size > MAX_FILE_SIZE) {
      setMessage("File is too large. Max size is 20MB.");
      event.target.value = "";
      return;
    }

    // FIX 2: Check extension matches category
    const ext = getExtension(file.name);
    const allowed = ALLOWED_BY_CATEGORY[category];
    if (!allowed.includes(ext)) {
      setMessage(
        `Wrong file type for ${category}. Allowed: ${allowed.map((e) => "." + e).join(", ")} - You uploaded .${ext || "unknown"}`
      );
      event.target.value = "";
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) {
        setMessage("You must be logged in.");
        return;
      }

      setUploadingFile(true);
      setMessage("");

      const idToken = await user.getIdToken();

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        "https://strongmarket-payment-server.onrender.com/api/products/upload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
          body: formData,
        }
      );

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
      setMessage(
        error instanceof Error
          ? `Upload error: ${error.message}`
          : "Unable to upload product file. Please try again."
      );
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
      if (!user) {
        setMessage("You must be logged in.");
        return;
      }

      const userSnapshot = await getDoc(doc(db, "users", user.uid));

      if (
        !userSnapshot.exists() ||
        userSnapshot.data().merchantStatus !== "approved"
      ) {
        setMessage("Only approved merchants can add products.");
        return;
      }

      if (!name.trim()) {
        setMessage("Please enter a product name.");
        return;
      }

      if (!image.trim()) {
        setMessage("Please upload a product image first.");
        return;
      }

      if (!cloudinaryFileRef.trim() || !fileName.trim()) {
        setMessage("Please upload the digital product file first.");
        return;
      }

      // FIX 3: Double-check at save time - merchant could change category after upload
      const finalExt = getExtension(fileName);
      const allowed = ALLOWED_BY_CATEGORY[category];
      if (!allowed.includes(finalExt)) {
        setMessage(
          `This file (.${finalExt}) is not allowed for ${category}. Allowed: ${allowed.map((e) => "." + e).join(", ")}. Please upload a new file.`
        );
        return;
      }

      if (!Number.isFinite(Number(price)) || Number(price) <= 0) {
        setMessage("Enter a valid price greater than zero.");
        return;
      }

      const productSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

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
      });

      setMessage("Product added successfully.");

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
      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to add product. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  const allowedForThisCategory = ALLOWED_BY_CATEGORY[category];

  return (
    <main>
      <h1>Add Product</h1>
      <p>Add a digital product to CHILVO.</p>

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
          <label htmlFor="price">Price (USD)</label>
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
              changeCategory(event.target.value as ProductCategory)
            }
          >
            {categories.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <p style={{ fontSize: "13px", color: "#666", margin: "6px 0 0" }}>
            Allowed for {category}: {allowedForThisCategory.map((e) => "." + e).join(", ")} - Max 20MB
          </p>
        </div>

        <div>
          <label htmlFor="image">Product Image</label>
          <input
            id="image"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) {
                return;
              }

              if (file.size > MAX_IMAGE_SIZE) {
                setMessage("Image is too large. Max size is 5MB.");
                event.target.value = "";
                return;
              }

              try {
                const user = auth.currentUser;
                if (!user) {
                  setMessage("You must be logged in.");
                  return;
                }

                setUploadingImage(true);
                setMessage("Uploading product image...");

                const idToken = await user.getIdToken();
                const formData = new FormData();
                formData.append("file", file);

                const response = await fetch(
                  "https://strongmarket-payment-server.onrender.com/api/products/upload",
                  {
                    method: "POST",
                    headers: {
                      Authorization: `Bearer ${idToken}`,
                    },
                    body: formData,
                  }
                );

                const result = await response.json();

                if (!response.ok || result?.success !== true) {
                  setMessage(result?.message || "Unable to upload product image.");
                  return;
                }

                setImage(result.secureUrl || "");
                setMessage("Product image uploaded successfully.");
              } catch (error) {
                console.error("Product image upload error:", error);
                setMessage(
                  error instanceof Error
                    ? error.message
                    : "Unable to upload product image."
                );
              } finally {
                setUploadingImage(false);
              }
            }}
          />
        </div>

        <div>
          <label htmlFor="fileName">Digital File Name</label>
          <input
            id="fileName"
            type="text"
            value={fileName}
            onChange={(event) => setFileName(event.target.value)}
            placeholder="my-product.pdf"
            readOnly
          />
        </div>

        <div>
          <label htmlFor="productFile">Digital Product File</label>
          <input
            id="productFile"
            type="file"
            accept={ACCEPT_BY_CATEGORY[category]}
            onChange={uploadProductFile}
          />
          {fileName && <p style={{ fontSize: "13px", color: "#1a7f37" }}>Uploaded: {fileName}</p>}
        </div>

        <button
          type="submit"
          disabled={loading || uploadingFile || uploadingImage}
        >
          {uploadingImage
            ? "Uploading Image..."
            : uploadingFile
              ? "Uploading File..."
              : loading
                ? "Adding Product..."
                : "Add Product"}
        </button>
      </form>

      {message && <p>{message}</p>}
    </main>
  );
}
