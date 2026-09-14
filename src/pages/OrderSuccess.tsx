import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useCart } from "../context/CartContext";
import { auth } from "../firebase";
import { getFirestoreOrder } from "../firestoreOrders";
import type { Order } from "../types/order";

export default function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();

  const [status, setStatus] = useState<
    "checking" | "paid" | "failed"
  >("checking");

const [order, setOrder] =
  useState<Order | null>(null);
  
  const reference =
    searchParams.get("reference") ||
    searchParams.get("trxref") ||
    sessionStorage.getItem(
      "strongmarket-paystack-reference",
    );

  async function downloadProduct(productId: string) {
  try {
    const user = auth.currentUser;

    if (!user) {
      alert("Please log in to download your product.");
      return;
    }

    const idToken = await user.getIdToken();

    const response = await fetch(
      `https://strongmarket-payment-server.onrender.com/api/products/${productId}/download?orderId=${encodeURIComponent(reference || "")}`,
      {
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      },
    );

    const result = await response.json();

    if (!response.ok || result?.success !== true) {
      alert(
        result?.message ||
          "Unable to download this product.",
      );
      return;
    }

    window.open(
      result.downloadUrl,
      "_blank",
      "noopener,noreferrer",
    );
  } catch (error) {
    console.error(
      "Product download error:",
      error,
    );

    alert(
      "Unable to download this product. Please try again.",
    );
  }
}
  
useEffect(() => {
    async function confirmPayment() {
      if (!reference) {
        console.error("No Paystack reference found.");
        setStatus("failed");
        return;
      }

      try {
        const response = await fetch(
          "https://strongmarket-payment-server.onrender.com/api/paystack/confirm",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              reference,
            }),
          },
        );

        const result = await response.json();

        if (
          !response.ok ||
          result?.success !== true
        ) {
          console.error(
            "Payment confirmation failed:",
            result,
          );

          setStatus("failed");
          return;
        }

        const paidOrder =
  await getFirestoreOrder(reference);

if (!paidOrder) {
  console.error(
    "Paid order could not be found:",
    reference,
  );

  setStatus("failed");
  return;
}

setOrder(paidOrder);

clearCart();

sessionStorage.removeItem(
  "strongmarket-paystack-reference",
);

setStatus("paid");
      } catch (error) {
        console.error(
          "Payment confirmation error:",
          error,
        );

        setStatus("failed");
      }
    }

    confirmPayment();
  }, [reference, clearCart]);

  if (status === "checking") {
    return (
      <main className="order-success-page">
        <div className="order-success">
          <p className="eyebrow">
            VERIFYING PAYMENT
          </p>

          <h1>
            Confirming your payment...
          </h1>

          <p>
            Please wait while we confirm your
            Paystack transaction.
          </p>
        </div>
      </main>
    );
  }

  if (status === "failed") {
    return (
      <main className="order-success-page">
        <div className="order-success">
          <div className="success-icon">!</div>

          <p className="eyebrow">
            PAYMENT NOT CONFIRMED
          </p>

          <h1>
            We couldn't confirm your payment.
          </h1>

          <p>
            Your order has not been marked as
            paid. Please return to checkout and
            try again.
          </p>

          <div className="success-actions">
            <Link
              className="primary-btn"
              to="/checkout"
            >
              Return to Checkout
            </Link>

            <Link
              className="secondary-btn"
              to="/shop"
            >
              Continue Shopping
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="order-success-page">
      <div className="order-success">
        <div className="success-icon">✓</div>

        <p className="eyebrow">
          PAYMENT SUCCESSFUL
        </p>

        <h1>
          Your order has been paid.
        </h1>

        <p>
          Your Paystack payment was successfully
          verified and your order has been marked
          as paid.
        </p>

        <div className="success-status">
  <strong>Payment status</strong>
  <span>Paid</span>
</div>

<div className="purchased-products">
  <h2>Your Downloads</h2>

  {order?.items.map((item) => (
    <div
      className="purchased-product"
      key={item.productId}
    >
      <div>
        <strong>{item.productName}</strong>
        <span>
          Digital product — ready to download
        </span>
      </div>

      <button
        className="primary-btn"
        type="button"
        onClick={() =>
          downloadProduct(item.productId)
        }
        disabled={!item.cloudinaryPublicId}
      >
        {item.cloudinaryPublicId
          ? "Download Product"
          : "File Coming Soon"}
      </button>
    </div>
  ))}
</div>

        <div className="success-actions">
          <Link
            className="primary-btn"
            to="/shop"
          >
            Continue Shopping
          </Link>

          <Link
            className="secondary-btn"
            to="/"
          >
            Return Home
          </Link>
        </div>
      </div>
    </main>
  );
}