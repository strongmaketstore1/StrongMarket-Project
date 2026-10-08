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
  merchantStatus?: string;
  photoURL?: string;
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
      <main>
        <p>Loading merchant store...</p>
      </main>
    );
  }

  if (!merchant) {
    return (
      <main className="product-not-found">
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

  return (
    <main className="merchant-store-page">
      <section className="merchant-store-header">
  <p className="eyebrow">
    CHILVO STORE
  </p>

  <div className="merchant-store-profile">
    <div className="merchant-store-avatar">
  {merchant.photoURL ? (
    <img
      src={merchant.photoURL}
      alt={merchant.name || "Merchant"}
    />
  ) : (
    merchant.name
      ?.charAt(0)
      .toUpperCase() || "C"
  )}
</div>

    <div>
      <h1>
        {merchant.name ||
          "CHILVO Merchant"}
      </h1>

      <p>
        Digital products on CHILVO
      </p>

      <p>
        {products.length}{" "}
        {products.length === 1
          ? "product"
          : "products"}{" "}
        available
      </p>
    </div>
  </div>
</section>
          
      <section>
        <div>
          <p className="eyebrow">
            STORE PRODUCTS
          </p>

          <h2>
            Products from{" "}
            {merchant.name ||
              "this merchant"}
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
          <div className="product-grid">
            {products.map((product) => (
              <article
                className="product-card"
                key={product.id}
              >
                <Link
                  to={`/product/${product.id}`}
                >
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                    />
                  ) : (
                    <div>
                      {product.category
                        .replace(
                          "-",
                          " ",
                        )
                        .toUpperCase()}
                    </div>
                  )}
                </Link>

                <div>
                  <p className="eyebrow">
                    {product.category
                      .replace(
                        "-",
                        " ",
                      )
                      .toUpperCase()}
                  </p>

                  <h3>
                    <Link
                      to={`/product/${product.id}`}
                    >
                      {product.name}
                    </Link>
                  </h3>

                  <p>
                    {product.shortDescription}
                  </p>

                  <strong>
                    {product.currency ===
                    "NGN"
                      ? "₦"
                      : product.currency}
                    {product.price.toLocaleString(
                      "en-NG",
                    )}
                  </strong>
                 <div>
                   <Link
                     className="secondary-btn"
                     to={`/product/${product.id}`}
                   >
                     View Product
                   </Link>

                   <button
                     className="primary-btn"
                     type="button"
                     onClick={() => addToCart(product)}
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
