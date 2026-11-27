import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { createOrderItems } from "../types/order";
import { startPaystackPayment } from "../paystackService";
import {
  createFirestoreOrder,
  getMerchantIds,
} from "../firestoreOrders";
import type { Order } from "../types/order";
import { auth, db } from "../firebase";
import { addDoc, collection } from "firebase/firestore";

export default function Checkout() {
  const { items, itemCount, subtotal } = useCart();

  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [error, setError] = useState("");
  const [isPaying, setIsPaying] = useState(false);

  const currencySymbol = "$";
  const displayLocale = "en-US";

  // Paystack expects payment amounts in the smallest
  // currency unit: cents for USD.
  const paymentAmount = Math.round(subtotal * 100);

  useEffect(() => {
    const user = auth.currentUser;

    if (!user) {
      return;
    }

    setCustomerName(user.displayName || "");
    setCustomerEmail(user.email || "");
  }, []);

  if (items.length === 0) {
    return (
      <main className="checkout-page" style={{ padding: "16px", maxWidth: "800px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <div className="empty-cart" style={{ textAlign: "center", padding: "40px 0" }}>
          <p className="eyebrow">CHECKOUT</p>

          <h1>Your cart is empty.</h1>

          <p>
            Add a digital product before continuing to
            checkout.
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

    if (!Number.isFinite(subtotal) || subtotal <= 0) {
      setError("Your order total is invalid. Please review your cart.");
      return;
    }

    setIsPaying(true);

    try {
      const orderId = `CHILVO-${Date.now()}`;
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
        currency: "USD",
        status: "pending",
        paymentReference,
        createdAt: new Date().toISOString(),
      };

      await createFirestoreOrder(order);

      // NEW - Create pending earnings for each merchant
      const byMerchant: Record<string, number> = {};
      for (const item of orderItems) {
        const totalForItem = item.price * item.quantity;
        byMerchant[item.merchantId] = (byMerchant[item.merchantId] || 0) + totalForItem;
      }

      for (const merchantId in byMerchant) {
        const gross = byMerchant[merchantId];
        const commission = gross * 0.10;
        const net = gross - commission;

        await addDoc(collection(db, "merchantEarnings"), {
          orderId: orderId,
          merchantId: merchantId,
          currency: "USD",
          grossSales: gross,
          commissionRate: 0.10,
          commissionAmount: commission,
          netEarnings: net,
          status: "pending",
          createdAt: new Date().toISOString(),
        });
      }

      startPaystackPayment(
        {
          email: customerEmail.trim(),
          amount: paymentAmount,
          currency: "USD",
          reference: paymentReference,
          callback_url:
            `${window.location.origin}/StrongMarket-Project/order-success`,
          metadata: {
            customerName: customerName.trim(),
            orderId,
            itemCount,
            subtotal,
            currency: "USD",
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

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px",
    fontSize: "15px",
    border: "1px solid #ddd",
    borderRadius: "8px",
    boxSizing: "border-box",
    marginTop: "6px",
    display: "block",
    background: "#fff",
  };

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "14px",
    fontWeight: "600",
    marginBottom: "16px",
  };

  return (
    <main className="checkout-page" style={{ padding: "16px", maxWidth: "900px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <div className="checkout-header" style={{ marginBottom: "20px" }}>
        <p className="eyebrow">SECURE CHECKOUT</p>

        <h1 style={{ fontSize: "24px", margin: "4px 0 6px", lineHeight: "1.2" }}>Complete your purchase.</h1>

        <p style={{ margin: 0, color: "#666", fontSize: "14px", lineHeight: "1.5" }}>
          Review your order and enter your details to
          continue.
        </p>
      </div>

      <div className="checkout-layout" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <section className="checkout-form" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div className="checkout-section" style={{ background: "#fff", border: "1px solid #eee", borderRadius: "12px", padding: "20px 16px" }}>
            <h2 style={{ fontSize: "18px", margin: "0 0 16px" }}>Customer information</h2>

            <label style={labelStyle}>
              Full name

              <input
                type="text"
                value={customerName}
                onChange={(event) =>
                  setCustomerName(event.target.value)
                }
                placeholder="Your full name"
                style={inputStyle}
              />
            </label>

            <label style={{ ...labelStyle, marginBottom: 0 }}>
              Email address

              <input
                type="email"
                value={customerEmail}
                onChange={(event) =>
                  setCustomerEmail(event.target.value)
                }
                placeholder="you@example.com"
                style={inputStyle}
              />
            </label>

            {error && (
              <p className="form-error" style={{ color: "#d00", background: "#fff0f0", padding: "10px 12px", borderRadius: "8px", fontSize: "13px", margin: "16px 0 0" }}>
                {error}
              </p>
            )}
          </div>

          <button
            className="primary-btn checkout-submit"
            type="button"
            onClick={handleContinue}
            disabled={isPaying}
            style={{ width: "100%", padding: "14px", fontSize: "16px", borderRadius: "10px", border: "none", cursor: "pointer", opacity: isPaying ? 0.6 : 1 }}
          >
            {isPaying ? "Opening Paystack..." : "Pay now"}
          </button>
        </section>

        <aside className="checkout-summary" style={{ background: "#f8f9fa", padding: "20px 16px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <p className="eyebrow" style={{ margin: 0 }}>YOUR ORDER</p>

          <h2 style={{ margin: "0 0 4px", fontSize: "20px" }}>Order summary</h2>

          {items.map((item) => (
            <div
              className="checkout-item"
              key={item.product.id}
              style={{ display: "flex", justifyContent: "space-between", gap: "12px", paddingBottom: "12px", borderBottom: "1px solid #eee", alignItems: "flex-start" }}
            >
              <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "2px" }}>
                <strong style={{ fontSize: "14px", lineHeight: "1.3", display: "block" }}>
                  {item.product.name}
                </strong>

                <span style={{ fontSize: "12px", color: "#666" }}>
                  Quantity: {item.quantity}
                </span>
              </div>

              <strong style={{ fontSize: "14px", whiteSpace: "nowrap" }}>
                {currencySymbol}
                {(
                  item.product.price * item.quantity
                ).toLocaleString(displayLocale, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </strong>
            </div>
          ))}

          <div className="summary-row" style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
            <span>Items</span>

            <span>{itemCount}</span>
          </div>

          <div className="summary-total" style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "700", borderTop: "1px solid #ddd", paddingTop: "12px" }}>
            <span>Total</span>

            <strong>
              {currencySymbol}
              {subtotal.toLocaleString(displayLocale, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </strong>
          </div>

          <p className="checkout-note" style={{ fontSize: "12px", color: "#666", lineHeight: "1.5", margin: 0 }}>
            Digital products are delivered electronically
            after successful payment.
          </p>
        </aside>
      </div>
    </main>
  );
}
