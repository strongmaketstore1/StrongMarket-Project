import { useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { createOrderItems } from "../service";
import { startPaystackPayment } from "../paystackService";
import { createFirestoreOrder, getMerchantIds } from "../firestoreOrders";
import type { Order } from "../types/order";
import { auth } from "../firebase";

export default function Checkout() {
  const { items, itemCount, subtotal } = useCart();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [error, setError] = useState("");
  const [isPaying, setIsPaying] = useState(false);
  const [currency, setCurrency] = useState<"NGN" | "USD">("NGN");
  
  const USD_RATE = 1500;

  const paymentAmount =
  currency === "USD"
    ? Math.round((subtotal / USD_RATE) * 100)
    : Math.round(subtotal * 100);
  
  if (items.length === 0) {
    return (
      <main className="checkout-page">
        <div className="empty-cart">
          <p className="eyebrow">CHECKOUT</p>

          <h1>Your cart is empty.</h1>

          <p>
            Add a digital product before continuing to checkout.
          </p>

          <Link className="primary-btn" to="/shop">
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
      setError("Please enter your email address.");
      return;
    }

    setIsPaying(true);

    try {
      const orderId = `SMS-${Date.now()}`;
      const paymentReference = orderId;

      const orderItems = createOrderItems(items);

      const merchantIds = getMerchantIds(orderItems);

      const order: Order = {
        id: orderId,
        customerId: auth.currentUser?.uid,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim(),
        items: orderItems,
        merchantIds,
        subtotal,
        currency,
        status: "pending",
        paymentReference,
        createdAt: new Date().toISOString(),
      };

      await createFirestoreOrder(order);

      startPaystackPayment(
        {
          email: customerEmail.trim(),
          amount: paymentAmount,
          reference: paymentReference,
          callback_url:
            `${window.location.origin}/StrongMarket-Project/order-success`,
          metadata: {
            customerName: customerName.trim(),
            orderId,
            itemCount,
            subtotal,
            currency,
            merchantIds,
            items: orderItems,
          },
        },
        import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
        () => {
          setIsPaying(false);
        },
        () => {
          setIsPaying(false);
          setError("Payment was cancelled.");
        },
        (paymentError) => {
          setIsPaying(false);
          setError(paymentError.message);
        },
      );
    } catch (error) {
      console.error("PAYMENT START ERROR:", error);

      setIsPaying(false);

      setError(
        error instanceof Error
          ? error.message
          : "Unable to start payment. Please try again.",
      );
    }
  }

  return (
    <main className="checkout-page">
      <div className="checkout-header">
        <p className="eyebrow">SECURE CHECKOUT</p>

        <h1>Complete your purchase.</h1>

        <p>
          Review your order and enter your details to continue.
        </p>
      </div>

      <div className="checkout-layout">
        <section className="checkout-form">
          <div className="checkout-section">
            <h2>Customer information</h2>

            <label>
              Full name

              <input
                type="text"
                value={customerName}
                onChange={(event) =>
                  setCustomerName(event.target.value)
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
                  setCustomerEmail(event.target.value)
                }
                placeholder="you@example.com"
              />
            </label>

            <label>
              Currency

              <select
                value={currency}
                onChange={(event) =>
                  setCurrency(
                    event.target.value as "NGN" | "USD",
                  )
                }
              >
                <option value="NGN">
                  ₦ NGN — Nigerian Naira
                </option>

                <option value="USD">
                  $ USD — US Dollar
                </option>
              </select>
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
              <strong>Secure payment with Paystack</strong>

              <p>
                You will be redirected to Paystack to complete
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
            {isPaying ? "Opening Paystack..." : "Pay now"}
          </button>
        </section>

        <aside className="checkout-summary">
          <p className="eyebrow">YOUR ORDER</p>

          <h2>Order summary</h2>

          {items.map((item) => (
            <div
              className="checkout-item"
              key={item.product.id}
            >
              <div>
                <strong>{item.product.name}</strong>

                <span>
                  Quantity: {item.quantity}
                </span>
              </div>

              <strong>
                ₦
                {(
                  item.product.price * item.quantity
                ).toLocaleString("en-NG")}
              </strong>
            </div>
          ))}

          <div className="summary-row">
            <span>Items</span>

            <span>{itemCount}</span>
          </div>

          <div className="summary-total">
            <span>Total</span>

            <strong>
              ₦{subtotal.toLocaleString("en-NG")}
            </strong>
          </div>

          <p className="checkout-note">
            Digital products are delivered electronically
            after successful payment.
          </p>
        </aside>
      </div>
    </main>
  );
}
