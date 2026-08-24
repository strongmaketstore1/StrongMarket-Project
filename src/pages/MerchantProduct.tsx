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
};

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
    <main>
      <h1>My Products</h1>

      <p>
        Manage the digital products you have added
        to StrongMarketStore.
      </p>

      <Link to="/merchant/products/new">
        📦 Add Product
      </Link>

      {message && <p>{message}</p>}

      {!message && products.length === 0 && (
        <p>You haven't added any products yet.</p>
      )}

      {products.length > 0 && (
        <section>
          {products.map((product) => (
            <article key={product.id}>
              <h2>{product.name}</h2>

              <p>{product.shortDescription}</p>

              <p>
                {product.currency} {product.price}
              </p>

              <p>
                Category: {product.category}
              </p>

              {product.fileName && (
                <p>
                  Digital file: {product.fileName}
                </p>
              )}
            <Link
  to={`/merchant/products/${product.id}/edit`}
>
  ✏️ Edit
</Link>
       
       <button
  type="button"
  onClick={() => handleDelete(product.id)}
>
  🗑️ Delete
</button>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}