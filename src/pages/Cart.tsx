import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  doc,
  getDoc,
} from "firebase/firestore";

import { useCart } from "../context/CartContext";
import { db } from "../firebase";
import type { Product } from "../types/product";

export default function ProductDetails() {
  const { productId } = useParams<{
    productId: string;
  }>();

  const { addToCart } = useCart();

  const [product, setProduct] =
    useState<Product | null>(null);

  const [merchantName, setMerchantName] =
    useState("");

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProduct() {
      if (!productId) {
        setLoading(false);
        return;
      }

      try {
        const productDoc = await getDoc(
          doc(db, "products", productId),
        );

        if (productDoc.exists()) {
          const loadedProduct = {
            id: productDoc.id,
            ...productDoc.data(),
          } as Product;

          setProduct(loadedProduct);

          if (loadedProduct.merchantId) {
            const merchantDoc = await getDoc(
              doc(
                db,
                "users",
                loadedProduct.merchantId,
              ),
            );

            if (merchantDoc.exists()) {
              const merchantData =
                merchantDoc.data();

              setMerchantName(
                merchantData.name ||
                  "CHILVO Merchant",
              );
            }
          }
        }
      } catch (error) {
        console.error(
          "Unable to load product:",
          error,
        );
      } finally {
        setLoading(false);
      }
    }

    loadProduct();
  }, [productId]);

  if (loading) {
    return (
      <main>
        <p>Loading product...</p>
      </main>
    );
  }

  if (!product) {
    return (
      <main className="product-not-found">
        <p className="eyebrow">
          PRODUCT NOT FOUND
        </p>

        <h1>
          We couldn't find that product.
        </h1>

        <p>
          The product may have been removed or
          the link may be incorrect.
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

  return (
    <main className="product-details-page" style={{ padding: "16px", maxWidth: "800px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <div className="product-details">
        <div className="product-details-image" style={{ width: "100%", maxWidth: "600px", height: "240px", margin: "0 auto 20px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fff", borderRadius: "12px" }}>
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
            />
          ) : (
            <span>
              {product.category
                .replace("-", " ")
                .toUpperCase()}
            </span>
          )}
        </div>

        <div className="product-details-content">
          <p className="eyebrow">
            {product.category
              .replace("-", " ")
              .toUpperCase()}
          </p>

          <h1>{product.name}</h1>

          <div className="product-rating">
            ★ {product.rating} (
            {product.reviewCount} reviews)
          </div>

          <p className="product-description">
            {product.description}
          </p>

          <div className="product-price">
            {product.price.toLocaleString("en-US", {
              style: "currency",
              currency: "USD",
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </div>

          <button
            className="primary-btn"
            type="button"
            onClick={() => addToCart(product)}
            style={{ marginBottom: "2rem" }}
          >
            Add to Cart
          </button>

          {product.merchantId && (
            <div
              className="product-merchant"
              style={{ marginTop: "2rem" }}
            >
              <p className="eyebrow">
                SOLD BY
              </p>

              <h2>
                {merchantName ||
                  "CHILVO Merchant"}
              </h2>

              <p>
                Digital products on CHILVO
              </p>

              <Link
                className="secondary-btn"
                to={`/merchant/${product.merchantId}`}
              >
                Visit Store →
              </Link>
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "16px", marginTop: "28px" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <strong style={{ display: "block" }}>Instant access</strong>
              <span style={{ display: "block" }}>Download your purchase after payment.</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <strong style={{ display: "block" }}>Digital product</strong>
              <span style={{ display: "block" }}>No physical shipping required.</span>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
              <strong style={{ display: "block" }}>Secure checkout</strong>
              <span style={{ display: "block" }}>Your purchase is processed securely.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="product-details-description">
        <h2>About this product</h2>

        <p>{product.description}</p>
      </div>
    </main>
  );
}
