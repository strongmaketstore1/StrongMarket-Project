import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import type { Product } from "../types/product";

type MerchantProfile = {
  name?: string;
  storeName?: string;
  merchantStatus?: string;
  photoURL?: string;
  storeLogoUrl?: string; // NEW: separate from personal photo
};

export default function MerchantStore() {
  const { merchantId } = useParams<{
    merchantId: string;
  }>();

  const { addToCart } = useCart();
 
  const [merchant, setMerchant] =
    useState<MerchantProfile | null>(null);

  const [products, setProducts] =
    useState<Product[]>([]);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    async function loadStore() {
      if (!merchantId) {
        setLoading(false);
        return;
      }

      try {
        const merchantResponse = await fetch(
  `https://strongmarket-payment-server.onrender.com/api/merchants/${merchantId}`,
);

const merchantData =
  await merchantResponse.json();

if (
  !merchantResponse.ok ||
  !merchantData.success
) {
  throw new Error(
    merchantData.message ||
      "Merchant not found.",
  );
}

setMerchant(
  merchantData.merchant as MerchantProfile,
);

        const productsQuery = query(
          collection(db, "products"),
          where(
            "merchantId",
            "==",
            merchantId,
          ),
        );

        const productsSnapshot =
          await getDocs(productsQuery);

        const merchantProducts =
          productsSnapshot.docs.map(
            (productDoc) => ({
              id: productDoc.id,
              ...productDoc.data(),
            } as Product),
          );

        setProducts(merchantProducts);
      } catch (error) {
        console.error(
          "Unable to load merchant store:",
          error,
        );
      } finally {
        setLoading(false);
      }
    }

    loadStore();
  }, [merchantId]);

  if (loading) {
    return (
      <main style={{ padding: "24px 16px" }}>
        <p>Loading merchant store...</p>
      </main>
    );
  }

  if (!merchant) {
    return (
      <main className="product-not-found" style={{ padding: "24px 16px" }}>
        <p className="eyebrow">
          MERCHANT STORE
        </p>

        <h1>
          Merchant store not found.
        </h1>

        <p>
          This merchant may no longer be
          available on CHILVO.
        </p>

        <Link
          className="primary-btn"
          to="/shop"
        >
          Back to Shop
        </Link>
      </main>
    );
  }

  // ✅ SEPARATE LOGIC: Store Logo first, Personal Photo second, Letter third
  const displayName = merchant.storeName || merchant.name || "CHILVO Merchant";
  const storeLogo = merchant.storeLogoUrl || "";
  const personalPhoto = merchant.photoURL || "";
  const displayImage = storeLogo || personalPhoto;

  return (
    <main style={{ width: "100%", boxSizing: "border-box", overflowX: "hidden", padding: "0 0 32px" }}>
      {/* HEADER - Fixed: avatar now has fixed box, object-fit cover */}
      <section style={{ padding: "24px 16px", boxSizing: "border-box" }}>
        <p className="eyebrow" style={{ margin: "0 0 16px" }}>
          CHILVO STORE
        </p>

        <div style={{ display: "flex", gap: "14px", alignItems: "flex-start" }}>
          <div style={{ width: "84px", height: "84px", flexShrink: 0, borderRadius: "50%", overflow: "hidden", background: "#eef2ff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "32px", fontWeight: 800, color: "#1d4ed8" }}>
            {displayImage ? (
              <img
                src={displayImage}
                alt={displayName}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
              />
            ) : (
              displayName.charAt(0).toUpperCase() || "C"
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: "28px", lineHeight: "1.15", margin: "0 0 6px", wordBreak: "break-word" }}>
              {displayName}
            </h1>

            <p style={{ fontSize: "14px", color: "#555", margin: "0 0 4px" }}>
              Digital products on CHILVO
            </p>

            <p style={{ fontSize: "14px", color: "#111", fontWeight: 600, margin: 0 }}>
              {products.length}{" "}
              {products.length === 1 ? "product" : "products"}{" "}
              available
            </p>
          </div>
        </div>
      </section>
          
      <section style={{ padding: "0 16px", boxSizing: "border-box" }}>
        <div style={{ marginBottom: "16px" }}>
          <p className="eyebrow" style={{ margin: "0 0 6px" }}>
            STORE PRODUCTS
          </p>

          <h2 style={{ fontSize: "24px", lineHeight: "1.2", margin: 0 }}>
            Products from{" "}
            {displayName}
          </h2>
        </div>

        {products.length === 0 ? (
          <div>
            <p>
              This merchant hasn't published
              any products yet.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
            {products.map((product) => (
              <article
                key={product.id}
                style={{ width: "100%", boxSizing: "border-box", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "16px", overflow: "hidden" }}
              >
                {/* IMAGE BOX - Fixed: fixed height, object-fit cover, no overflow */}
                <Link
                  to={`/product/${product.id}`}
                  style={{ display: "block", width: "100%", height: "220px", overflow: "hidden", background: "#f3f4f6" }}
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                    />
                  ) : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "#666", padding: "16px", boxSizing: "border-box", textAlign: "center" }}>
                      {product.category.replace("-", " ").toUpperCase()}
                    </div>
                  )}
                </Link>

                <div style={{ padding: "16px", boxSizing: "border-box" }}>
                  <p className="eyebrow" style={{ margin: "0 0 6px" }}>
                    {product.category.replace("-", " ").toUpperCase()}
                  </p>

                  <h3 style={{ fontSize: "20px", lineHeight: "1.3", margin: "0 0 8px" }}>
                    <Link
                      to={`/product/${product.id}`}
                      style={{ color: "#111", textDecoration: "none" }}
                    >
                      {product.name}
                    </Link>
                  </h3>

                  <p style={{ fontSize: "14px", lineHeight: "1.5", color: "#555", margin: "0 0 10px" }}>
                    {product.shortDescription}
                  </p>

                  <strong style={{ display: "block", fontSize: "18px", marginBottom: "14px" }}>
                    {product.currency === "NGN" ? "₦" : product.currency}
                    {product.price.toLocaleString("en-NG")}
                  </strong>

                  {/* BUTTONS - Fixed: stacked, full width, no overlap */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "10px", width: "100%" }}>
                    <Link
                      className="secondary-btn"
                      to={`/product/${product.id}`}
                      style={{ display: "block", textAlign: "center", padding: "12px", fontSize: "15px", borderRadius: "10px", boxSizing: "border-box" }}
                    >
                      View Product
                    </Link>

                    <button
                      className="primary-btn"
                      type="button"
                      onClick={() => addToCart(product)}
                      style={{ width: "100%", padding: "12px", fontSize: "15px", borderRadius: "10px", border: "none", cursor: "pointer", boxSizing: "border-box" }}
                    >
                      Add to Cart
                    </button>
                  </div>  
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
