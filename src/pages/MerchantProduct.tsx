import { useEffect, useState } from "react";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";
import { Link } from "react-router-dom";

import { auth, db } from "../firebase";
import { onAuthStateChanged } from "firebase/auth";

type Product = {
  id: string;
  name: string;
  shortDescription: string;
  price: number;
  currency: string;
  category: string;
  image?: string;
  fileName?: string;
  status?: string;
  rejectReason?: string;
};

function StatusBadge({ product }: { product: Product }) {
  const status = product.status || "pending";

  if (status === "approved") {
    return (
      <p style={{ display: "inline-block", background: "#1a7f37", color: "#fff", padding: "6px 10px", borderRadius: "20px", fontSize: "13px", fontWeight: "bold", margin: "8px 0" }}>
        ✅ Approved - Live in Shop
      </p>
    );
  }
  if (status === "rejected") {
    return (
      <div style={{ background: "#fdecea", border: "1px solid #f5b5b0", padding: "10px", borderRadius: "10px", margin: "8px 0" }}>
        <p style={{ color: "#d1242f", fontWeight: "bold", margin: 0 }}>❌ Rejected - Not in Shop</p>
        {product.rejectReason && (
          <p style={{ color: "#666", fontSize: "13px", margin: "4px 0 0" }}>
            Reason: {product.rejectReason}
          </p>
        )}
        <p style={{ color: "#666", fontSize: "13px", margin: "4px 0 0" }}>
          Fix it and tap Edit to resubmit.
        </p>
      </div>
    );
  }
  return (
    <p style={{ display: "inline-block", background: "#f59e0b", color: "#fff", padding: "6px 10px", borderRadius: "20px", fontSize: "13px", fontWeight: "bold", margin: "8px 0" }}>
      ⏳ Pending Review - Not in Shop yet
    </p>
  );
}

export default function MerchantProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        if (!user) {
          setMessage("You must be logged in.");
          setLoading(false);
          return;
        }

        const productsQuery = query(
          collection(db, "products"),
          where("merchantId", "==", user.uid),
        );

        const unsubscribeProducts = onSnapshot(
          productsQuery,
          (snapshot) => {
            const productList = snapshot.docs.map(
              (productDoc) => ({
                id: productDoc.id,
                ...productDoc.data(),
              }),
            ) as Product[];

            setProducts(productList);
            setLoading(false);
          },
          (error) => {
            console.error(error);
            setMessage(
              "Unable to load your products.",
            );
            setLoading(false);
          },
        );

        return unsubscribeProducts;
      },
    );

    return () => unsubscribeAuth();
  }, []);

  async function handleDelete(productId: string) {
    const confirmed = window.confirm(
      "Are you sure you want to delete this product?",
    );

    if (!confirmed) {
      return;
    }

    const user = auth.currentUser;

    if (!user) {
      setMessage("You must be logged in.");
      return;
    }

    try {
      const productRef = doc(
        db,
        "products",
        productId,
      );

      const productSnapshot = await getDoc(productRef);

      if (!productSnapshot.exists()) {
        setMessage("Product not found.");
        return;
      }

      const productData = productSnapshot.data();

      if (productData.merchantId !== user.uid) {
        setMessage(
          "You are not allowed to delete this product.",
        );
        return;
      }

      await deleteDoc(productRef);

      setMessage("Product deleted successfully.");
    } catch (error) {
      console.error(error);
      setMessage(
        "Unable to delete product. Please try again.",
      );
    }
  }

  if (loading) {
    return (
      <main>
        <h1>My Products</h1>
        <p>Loading products...</p>
      </main>
    );
  }

  return (
    <main style={{ padding: "20px", maxWidth: "900px", margin: "0 auto" }}>
      <h1>My Products</h1>

      <p>
        Manage the digital products you have added
        to CHILVO.
      </p>

      <Link to="/merchant/products/new" style={{ display: "inline-block", padding: "10px 16px", background: "#111", color: "#fff", borderRadius: "8px", textDecoration: "none", marginBottom: "16px" }}>
        📦 Add Product
      </Link>

      {message && <p>{message}</p>}

      {!message && products.length === 0 && (
        <p>You haven't added any products yet.</p>
      )}

      {products.length > 0 && (
        <section>
          {products.map((product) => (
            <article key={product.id} style={{ border: "1px solid #eee", borderRadius: "12px", padding: "16px", marginBottom: "12px" }}>
              {product.image && (
                <img
                  src={product.image}
                  alt={product.name}
                  width="200"
                  style={{ borderRadius: "8px" }}
                />
              )}

              <h2 style={{ margin: "10px 0 0" }}>{product.name}</h2>

              <StatusBadge product={product} />

              <p>
                {product.shortDescription}
              </p>

              <p>
                {product.currency === "USD"
                  ? "$"
                  : "₦"}
                {product.price.toLocaleString(
                  product.currency === "USD"
                    ? "en-US"
                    : "en-NG",
                  {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  },
                )}
              </p>

              <p>
                Category: {product.category}
              </p>

              {product.fileName && (
                <p>
                  Digital file: {product.fileName}
                </p>
              )}

              {/* FIXED: Buttons side-by-side, no overlap */}
              <div style={{ display: "flex", gap: "12px", alignItems: "center", marginTop: "12px", flexWrap: "wrap" }}>
                <Link
                  to={`/merchant/products/${product.id}/edit`}
                  style={{ padding: "8px 14px", background: "#111", color: "#fff", borderRadius: "8px", textDecoration: "none" }}
                >
                  ✏️ Edit
                </Link>

                <button
                  type="button"
                  onClick={() => handleDelete(product.id)}
                  style={{ padding: "8px 14px", background: "#fff", color: "#d1242f", border: "1px solid #d1242f", borderRadius: "8px", cursor: "pointer" }}
                >
                  🗑️ Delete
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}
