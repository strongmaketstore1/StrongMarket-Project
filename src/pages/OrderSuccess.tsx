import { useEffect, useRef, useState } from "react";
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

  const [order, setOrder] = useState<Order | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  const confirmationStarted = useRef(false);

  const reference =
    searchParams.get("reference") ||
    searchParams.get("trxref") ||
    sessionStorage.getItem(
      "strongmarket-paystack-reference",
    );

  async function getDownloadUrl(productId: string) {
    try {
      const user = auth.currentUser;

      if (!user) {
        alert("Please log in to download your product.");
        return null;
      }

      if (!reference) {
        alert(
          "This order does not have a valid payment reference.",
        );
        return null;
      }

      const idToken = await user.getIdToken();

      const response = await fetch(
        `https://strongmarket-payment-server.onrender.com/api/products/${encodeURIComponent(
          productId,
        )}/download?orderId=${encodeURIComponent(reference)}`,
        {
          headers: {
            Authorization: `Bearer ${idToken}`,
          },
        },
      );

      const result = await response.json();

      if (
        !response.ok ||
        result?.success !== true ||
        typeof result?.downloadUrl !== "string"
      ) {
        alert(result?.message || "Unable to download this product.");
        return null;
      }

      return result.downloadUrl as string;
    } catch (error) {
      console.error("Product download error:", error);
      alert("Unable to download this product. Please try again.");
      return null;
    }
  }

  async function downloadProduct(productId: string) {
    const downloadUrl = await getDownloadUrl(productId);
    if (!downloadUrl) return;

    // Use a real <a> tag so browser downloads instead of opening blank page
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = "";
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function previewProduct(productId: string) {
    const downloadUrl = await getDownloadUrl(productId);
    if (!downloadUrl) return;

    // DOCX / XLSX cannot preview directly in browser - use Google Docs Viewer
    const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(
      downloadUrl,
    )}&embedded=true`;
    window.open(viewerUrl, "_blank", "noopener,noreferrer");
  }

  useEffect(() => {
    if (confirmationStarted.current) {
      return;
    }

    confirmationStarted.current = true;

    let cancelled = false;

    async function confirmPayment() {
      if (!reference) {
        setErrorMessage("No Paystack payment reference was found.");
        setStatus("failed");
        return;
      }

      try {
        const user = await new Promise<typeof auth.currentUser>(
          (resolve) => {
            if (auth.currentUser) {
              resolve(auth.currentUser);
              return;
            }

            const unsubscribe = auth.onAuthStateChanged(
              (currentUser) => {
                unsubscribe();
                resolve(currentUser);
              },
            );
          },
        );

        if (cancelled) return;

        if (!user) {
          setErrorMessage(
            "Your CHILVO login session could not be restored. Please log in and try again.",
          );
          setStatus("failed");
          return;
        }

        const idToken = await user.getIdToken();

        const response = await fetch(
          "https://strongmarket-payment-server.onrender.com/api/paystack/confirm",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${idToken}`,
            },
            body: JSON.stringify({
              reference,
            }),
          },
        );

        const result = await response.json();

        if (!response.ok || result?.success !== true) {
          console.error("Payment confirmation failed:", result);

          setErrorMessage(
            result?.message || "Payment confirmation failed.",
          );

          setStatus("failed");
          return;
        }

        const paidOrder = await getFirestoreOrder(reference);

        if (!paidOrder) {
          setErrorMessage(
            "Payment was confirmed, but the order could not be loaded.",
          );
          setStatus("failed");
          return;
        }

        if (cancelled) return;

        setOrder(paidOrder);

        clearCart();

        sessionStorage.removeItem("strongmarket-paystack-reference");

        setStatus("paid");
      } catch (error) {
        console.error("Payment confirmation error:", error);

        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Unable to contact the payment server.",
        );

        setStatus("failed");
      }
    }

    confirmPayment();

    return () => {
      cancelled = true;
    };
  }, [reference, clearCart]);

  if (status === "checking") {
    return (
      <main className="order-success-page">
        <h1>Confirming Payment...</h1>
        <p>Please wait while CHILVO verifies your payment.</p>
      </main>
    );
  }

  if (status === "failed") {
    return (
      <main className="order-success-page">
        <h1>PAYMENT NOT CONFIRMED</h1>
        <p>{errorMessage || "We couldn't confirm your payment."}</p>
        <p>Your order has not been marked as paid.</p>
        <Link to="/checkout">Return to Checkout</Link>
      </main>
    );
  }

  return (
    <main className="order-success-page">
      <h1>Payment Successful 🎉</h1>

      <p>
        Your payment has been verified and your order is now marked as
        paid.
      </p>

      {order && (
        <section>
          <h2>Your Downloads</h2>

          {order.items.map((item) => (
            <div key={item.productId} className="download-item">
              <h3>{item.productName}</h3>

              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  flexWrap: "wrap",
                  marginTop: "8px",
                }}
              >
                <button
                  onClick={() => downloadProduct(item.productId)}
                >
                  Download File ⬇️
                </button>

                <button
                  onClick={() => previewProduct(item.productId)}
                >
                  Open / Preview File 👁️
                </button>
              </div>
            </div>
          ))}
        </section>
      )}

      <Link to="/shop">Continue Shopping</Link>
    </main>
  );
}
