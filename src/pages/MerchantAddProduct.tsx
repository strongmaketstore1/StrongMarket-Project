import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { addDoc, collection } from "firebase/firestore";

import { auth, db } from "../firebase";
import type { ProductCategory } from "../types/product";

const categories: {
  label: string;
  value: ProductCategory;
}[] = [
  { label: "Ebooks", value: "ebooks" },
  { label: "Business", value: "business" },
  { label: "Templates", value: "templates" },
  {
    label: "AI & Productivity",
    value: "ai-productivity",
  },
  { label: "Design", value: "design" },
  { label: "Marketing", value: "marketing" },
];

export default function MerchantAddProduct() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] =
    useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] =
    useState<ProductCategory>("ebooks");
  const [image, setImage] = useState("");
  const [fileName, setFileName] = useState("");
  const [cloudinaryPublicId, setCloudinaryPublicId] =
  useState("");
  const [uploadingFile, setUploadingFile] =
  useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function uploadProductFile(
  event: ChangeEvent<HTMLInputElement>,
) {
  const file = event.target.files?.[0];

  if (!file) {
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
      },
    );

    const result = await response.json();

    if (!response.ok || result?.success !== true) {
      setMessage(
        result?.message ||
          "Unable to upload product file.",
      );
      return;
    }

    setCloudinaryPublicId(result.publicId);
    setFileName(result.fileName || file.name);

    setMessage(
      "Product file uploaded successfully.",
    );
  } catch (error) {
    console.error(
      "Product file upload error:",
      error,
    );

    setMessage(
      "Unable to upload product file. Please try again.",
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

      const productSlug = name
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-₦)/g, "");

      await addDoc(collection(db, "products"), {
        name: name.trim(),
        slug: productSlug,
        description: description.trim(),
        shortDescription: shortDescription.trim(),
        price: Number(price),
        currency: "NGN",
        category,
        image: image.trim(),
        fileName: fileName.trim(),
        cloudinaryPublicId:
        cloudinaryPublicId.trim(),
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
      setCategory("ebooks");
      setImage("");
      setFileName("");
      setCloudinaryPublicId("");
    } catch (error) {
  console.error("Add product error:", error);

  setMessage(
    error instanceof Error
      ? error.message
      : "Unable to add product. Please try again.",
  );
} finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Add Product</h1>

      <p>
        Add a digital product to StrongMarketStore.
      </p>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="name">
            Product Name
          </label>

          <input
            id="name"
            type="text"
            value={name}
            onChange={(event) =>
              setName(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label htmlFor="shortDescription">
            Short Description
          </label>

          <input
            id="shortDescription"
            type="text"
            value={shortDescription}
            onChange={(event) =>
              setShortDescription(
                event.target.value,
              )
            }
            required
          />
        </div>

        <div>
          <label htmlFor="description">
            Description
          </label>

          <textarea
            id="description"
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label htmlFor="price">
            Price (NGN)
          </label>

          <input
            id="price"
            type="number"
            min="0"
            step="0.01"
            value={price}
            onChange={(event) =>
              setPrice(event.target.value)
            }
            required
          />
        </div>

        <div>
          <label htmlFor="category">
            Category
          </label>

          <select
            id="category"
            value={category}
            onChange={(event) =>
              setCategory(
                event.target.value as ProductCategory,
              )
            }
          >
            {categories.map((item) => (
              <option
                key={item.value}
                value={item.value}
              >
                {item.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="image">
            Product Image
          </label>

          <input
  id="image"
  type="file"
  accept="image/png,image/jpeg,image/webp"
  onChange={async (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    try {
      const user = auth.currentUser;

      if (!user) {
        setMessage("You must be logged in.");
        return;
      }

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
        },
      );

      const result = await response.json();

      if (!response.ok || result?.success !== true) {
        setMessage(
          result?.message ||
            "Unable to upload product image.",
        );
        return;
      }

      setImage(result.secureUrl || "");
      setMessage(
        "Product image uploaded successfully.",
      );
    } catch (error) {
      console.error(
        "Product image upload error:",
        error,
      );

      setMessage(
        error instanceof Error
          ? error.message
          : "Unable to upload product image.",
      );
    }
  }}
/>
        </div>

        <div>
          <label htmlFor="fileName">
            Digital File Name
          </label>

          <input
            id="fileName"
            type="text"
            value={fileName}
            onChange={(event) =>
              setFileName(event.target.value)
            }
            placeholder="my-product.pdf"
          />
        </div>

        <div>
  <label htmlFor="productFile">
    Digital Product File
  </label>

  <input
    id="productFile"
    type="file"
    accept=".pdf,.zip,.doc,.docx"
    onChange={uploadProductFile}
  />
</div>
        
        <div>
  <label htmlFor="cloudinaryPublicId">
    Cloudinary Public ID
  </label>

  <input
    id="cloudinaryPublicId"
    type="text"
    value={cloudinaryPublicId}
    onChange={(event) =>
      setCloudinaryPublicId(event.target.value)
    }
    placeholder="strongmarket/products/my-product"
  />
</div>
        
       <button
  type="submit"
  disabled={loading || uploadingFile}
>
  {uploadingFile
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
