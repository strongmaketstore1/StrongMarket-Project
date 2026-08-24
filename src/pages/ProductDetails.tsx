import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  collection,
  getDocs,
  query,
  where,
} from "firebase/firestore";

import { products } from "../data/products";
import { useCart } from "../context/CartContext";
import { db } from "../firebase";
import type { Product } from "../types/product";

export default function ProductDetails() {
  const { slug } = useParams<{ slug: string }>();
  const { addToCart } = useCart();

  const [product, setProduct] =
    useState<Product | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProduct() {
      if (!slug) {
        setLoading(false);
        return;
      }

      // First check the existing platform products.
      const staticProduct = products.find(
        (item) => item.slug === slug,
      );

      if (staticProduct) {
        setProduct(staticProduct);
        setLoading(false);
        return;
      }

      // If it is not a platform product,
      // look for a merchant product in Firestore.
      try {
        const productsQuery = query(
          collection(db, "products"),
          where("slug", "==", slug),
        );

        const snapshot = await getDocs(
          productsQuery,
        );

        if (!snapshot.empty) {
          const productDoc = snapshot.docs[0];

          setProduct({
            id: productDoc.id,
            ...productDoc.data(),
          } as Product);
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
  }, [slug]);

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
    <main className="product-details-page">
      <div className="product-details">
        <div className="product-details-image">
          <span>
            {product.category
              .replace("-", " ")
              .toUpperCase()}
          </span>
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
            {product.currency === "NGN"
              ? "₦"
              : product.currency}
            {product.price.toLocaleString(
              "en-NG",
            )}
          </div>

          <button
            className="primary-btn"
            type="button"
            onClick={() =>
              addToCart(product)
            }
          >
            Add to Cart
          </button>

          <div className="purchase-benefits">
            <div>
              <strong>
                Instant access
              </strong>

              <span>
                Download your purchase after
                payment.
              </span>
            </div>

            <div>
              <strong>
                Digital product
              </strong>

              <span>
                No physical shipping required.
              </span>
            </div>

            <div>
              <strong>
                Secure checkout
              </strong>

              <span>
                Your purchase is processed
                securely.
              </span>
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