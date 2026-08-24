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

export default function MerchantEditProduct() {
  const { productId } = useParams();
  const navigate = useNavigate();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [shortDescription, setShortDescription] =
    useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] =
    useState<ProductCategory>("ebooks");
  const [image, setImage] = useState("");
  const [fileName, setFileName] = useState("");

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
        const productRef = doc(
          db,
          "products",
          productId,
        );

        const snapshot = await getDoc(productRef);

        if (!snapshot.exists()) {
          setMessage("Product not found.");
          setLoading(false);
          return;
        }

        const data = snapshot.data();

        if (data.merchantId !== user.uid) {
          setMessage(
            "You are not allowed to edit this product.",
          );
          setLoading(false);
          return;
        }

        setName(data.name || "");
        setDescription(data.description || "");
        setShortDescription(
          data.shortDescription || "",
        );
        setPrice(String(data.price ?? ""));
        setCategory(
          data.category || "ebooks",
        );
        setImage(data.image || "");
        setFileName(data.fileName || "");
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
      const productRef = doc(
        db,
        "products",
        productId,
      );

      const snapshot = await getDoc(productRef);

      if (!snapshot.exists()) {
        setMessage("Product not found.");
        return;
      }

      const data = snapshot.data();

      if (data.merchantId !== user.uid) {
        setMessage(
          "You are not allowed to edit this product.",
        );
        return;
      }

      await updateDoc(productRef, {
        name: name.trim(),
        description: description.trim(),
        shortDescription:
          shortDescription.trim(),
        price: Number(price),
        currency: "NGN",
        category,
        image: image.trim(),
        fileName: fileName.trim(),
      });

      setMessage("Product updated successfully.");

      setTimeout(() => {
        navigate("/merchant/products");
      }, 800);
    } catch (error) {
      console.error(error);
      setMessage(
        "Unable to update product. Please try again.",
      );
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
            type="text"
            value={image}
            onChange={(event) =>
              setImage(event.target.value)
            }
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
          />
        </div>

        <button
          type="submit"
          disabled={saving}
        >
          {saving
            ? "Saving..."
            : "Save Changes"}
        </button>
      </form>

      {message && <p>{message}</p>}
    </main>
  );
}