import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useCart } from "../context/CartContext";

export default function OrderSuccess() {
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();

  const [status, setStatus] = useState<
    "checking" | "paid" | "failed"
  >("checking");

  const reference =
    searchParams.get("reference");

  useEffect(() => {
    async function confirmPayment() {
      if (!reference) {
        setStatus("failed");
        return;
      }

      try {
        // Ask the secure Render server to verify
        // Paystack and update the Firestore order.
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

          alert(
            `Payment confirmation failed: ${JSON.stringify(
              result,
            )}`,
          );

          setStatus("failed");
          return;
        }

        // Payment is confirmed and the server
        // has marked the order as paid.
        clearCart();

        setStatus("paid");
      } catch (error) {
        console.error(
          "Payment confirmation error:",
          error,
        );

        alert(
          `Payment confirmation error: ${
            error instanceof Error
              ? error.message
              : JSON.stringify(error)
          }`,
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
          <div className="success-icon">
            !
          </div>

          <p className="eyebrow">
            PAYMENT NOT CONFIRMED
          </p>

          <h1>
            We couldn't confirm your payment.
          </h1>

          <p>
            Your order has not been marked as
            paid. Please try the payment again.
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
        <div className="success-icon">
          ✓
        </div>

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