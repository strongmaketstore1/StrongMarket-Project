import { useState } from "react";
import { Link } from "react-router-dom";
import {
  addDoc,
  collection,
} from "firebase/firestore";

import { db } from "../firebase";
import { useCart } from "../context/CartContext";
import { createOrderItems } from "../service";
import { startPaystackPayment } from "../paystackService";

export default function Checkout() {
  const {
    items,
    itemCount,
    subtotal,
  } = useCart();

  const [customerName, setCustomerName] =
    useState("");

  const [customerEmail, setCustomerEmail] =
    useState("");

  const [error, setError] = useState("");

  const [isPaying, setIsPaying] =
    useState(false);

  if (items.length === 0) {
    return (
      <main className="checkout-page">
        <div className="empty-cart">
          <p className="eyebrow">CHECKOUT</p>

          <h1>Your cart is empty.</h1>

          <p>
            Add a digital product before continuing
            to checkout.
          </p>

          <Link
            className="primary-btn"
            to="/shop"
          >
            Browse Products
          </Link>
        </div>
      </main>
    );
  }

  async function handleContinue() {
    setError("");

    if (!customerName.trim()) {
      setError("Please enter your full name.");
      return;
    }

    if (!customerEmail.trim()) {
      setError(
        "Please enter your email address.",
      );
      return;
    }

    setIsPaying(true);

    try {
      const orderId = `SMS-${Date.now()}`;

      const paymentReference = orderId;

      const order = {
        id: orderId,

        customerName:
          customerName.trim(),

        customerEmail:
          customerEmail.trim(),

        items: createOrderItems(items),

        subtotal,

        currency: "NGN",

        status: "pending" as const,

        paymentReference,

        createdAt:
          new Date().toISOString(),
      };

      const merchantIds = [
        ...new Set(
          items
            .map(
              (item) =>
                item.product.merchantId,
            )
            .filter(
              (
                merchantId,
              ): merchantId is string =>
                Boolean(merchantId),
            ),
        ),
      ];

      await addDoc(
        collection(db, "orders"),
        {
          ...order,
          merchantIds,
        },
      );

      startPaystackPayment(
        {
          email:
            customerEmail.trim(),

          amount: Math.round(
            subtotal * 100,
          ),

          reference:
            paymentReference,

          callback_url:
            `${window.location.origin}/StrongMarket-Project/order-success`,

          metadata: {
            customerName:
              customerName.trim(),

            orderId,

            itemCount,
          },
        },

        import.meta.env
          .VITE_PAYSTACK_PUBLIC_KEY,

        () => {
          setIsPaying(false);
        },

        () => {
          setIsPaying(false);

          setError(
            "Payment was cancelled.",
          );
        },

        (paymentError) => {
          setIsPaying(false);

          setError(
            paymentError.message,
          );
        },
      );
    } catch (error) {
  console.error("ORDER CREATION ERROR:", error);

  setIsPaying(false);

  setError(
    error instanceof Error
      ? error.message
      : "Unable to create your order. Please try again.",
  );
}
  }

  return (
    <main className="checkout-page">
      <div className="checkout-header">
        <p className="eyebrow">
          SECURE CHECKOUT
        </p>

        <h1>
          Complete your purchase.
        </h1>

        <p>
          Review your order and enter
          your details to continue.
        </p>
      </div>

      <div className="checkout-layout">
        <section className="checkout-form">
          <div className="checkout-section">
            <h2>
              Customer information
            </h2>

            <label>
              Full name

              <input
                type="text"
                value={customerName}
                onChange={(event) =>
                  setCustomerName(
                    event.target.value,
                  )
                }
                placeholder="Your full name"
              />
            </label>

            <label>
              Email address

              <input
                type="email"
                value={customerEmail}
                onChange={(event) =>
                  setCustomerEmail(
                    event.target.value,
                  )
                }
                placeholder="you@example.com"
              />
            </label>

            {error && (
              <p className="form-error">
                {error}
              </p>
            )}
          </div>

          <div className="checkout-section">
            <h2>Payment</h2>

            <div className="payment-placeholder">
              <strong>
                Secure payment with Paystack
              </strong>

              <p>
                You will be redirected
                to Paystack to complete
                your payment securely.
              </p>
            </div>
          </div>

          <button
            className="primary-btn checkout-submit"
            type="button"
            onClick={handleContinue}
            disabled={isPaying}
          >
            {isPaying
              ? "Opening Paystack..."
              : "Pay now"}
          </button>
        </section>

        <aside className="checkout-summary">
          <p className="eyebrow">
            YOUR ORDER
          </p>

          <h2>
            Order summary
          </h2>

          {items.map((item) => (
            <div
              className="checkout-item"
              key={item.product.id}
            >
              <div>
                <strong>
                  {item.product.name}
                </strong>

                <span>
                  Quantity:{" "}
                  {item.quantity}
                </span>
              </div>

              <strong>
                ₦
                {(
                  item.product.price *
                  item.quantity
                ).toLocaleString(
                  "en-NG",
                )}
              </strong>
            </div>
          ))}

          <div className="summary-row">
            <span>Items</span>

            <span>
              {itemCount}
            </span>
          </div>

          <div className="summary-total">
            <span>Total</span>

            <strong>
              ₦
              {subtotal.toLocaleString(
                "en-NG",
              )}
            </strong>
          </div>

          <p className="checkout-note">
            Digital products are
            delivered electronically
            after successful payment.
          </p>
        </aside>
      </div>
    </main>
  );
}