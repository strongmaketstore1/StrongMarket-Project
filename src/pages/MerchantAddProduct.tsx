import { useState } from "react";
import type { FormEvent } from "react";
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
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

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
        .replace(/(^-|-$)/g, "");

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
    } catch (error) {
      console.error(error);
      setMessage(
        "Unable to add product. Please try again.",
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
            type="text"
            value={image}
            onChange={(event) =>
              setImage(event.target.value)
            }
            placeholder="/products/my-product.jpg"
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

        <button
          type="submit"
          disabled={loading}
        >
          {loading
            ? "Adding Product..."
            : "Add Product"}
        </button>
      </form>

      {message && <p>{message}</p>}
    </main>
  );
}