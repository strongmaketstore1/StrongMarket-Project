import { useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";

import { useCart } from "../context/CartContext";
import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getFirestoreOrder } from "../firestoreOrders";
import type { Order, OrderItem } from "../types/order";

const BACKEND = "https://strongmarket-payment-server.onrender.com";

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

  // ✅ FIXED: Get real file link directly, no Backend needed for new orders
  function buildUrlFromRef(ref: string): string | null {
    if (!ref) return null;
    if (ref.startsWith("http")) return ref;
    return `https://res.cloudinary.com/hvssq06f/raw/upload/${ref}`;
  }

  async function getDownloadUrl(item: OrderItem): Promise<string | null> {
    // 1. New orders: fileUrl saved in OrderItem at checkout
    if (item.fileUrl && item.fileUrl.startsWith("http")) return item.fileUrl;
    if (item.cloudinaryFileRef) {
      const rebuilt = buildUrlFromRef(item.cloudinaryFileRef);
      if (rebuilt) return rebuilt;
    }
    if (item.cloudinaryPublicId) {
      const rebuilt = buildUrlFromRef(item.cloudinaryPublicId);
      if (rebuilt) return rebuilt;
    }

    // 2. Old orders: no fileUrl in order, fetch it from the product itself
    try {
      const snap = await getDoc(doc(db, "products", item.productId));
      if (snap.exists()) {
        const p: any = snap.data();
        if (typeof p.fileUrl === "string" && p.fileUrl.startsWith("http")) return p.fileUrl;
        if (typeof p.cloudinaryFileRef === "string" && p.cloudinaryFileRef) {
          const rebuilt = buildUrlFromRef(p.cloudinaryFileRef);
          if (rebuilt) return rebuilt;
        }
      }
    } catch (e) {
      console.log("Could not load product for download", e);
    }

    // 3. Last fallback: Backend (for very old products)
    try {
      const user = auth.currentUser;
      if (!user) {
        alert("Please log in to download your product.");
        return null;
      }
      if (!reference) {
        alert("This order does not have a valid payment reference.");
        return null;
      }
      const idToken = await user.getIdToken();
      const response = await fetch(
        `${BACKEND}/api/products/${encodeURIComponent(item.productId)}/download?orderId=${encodeURIComponent(reference)}`,
        { headers: { Authorization: `Bearer ${idToken}` } },
      );
      const result = await response.json();
      if (!response.ok || result?.success !== true || typeof result?.downloadUrl !== "string") {
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

  async function downloadProduct(item: OrderItem) {
    const downloadUrl = await getDownloadUrl(item);
    if (!downloadUrl) return;
    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = item.fileName || item.productName || "";
    a.target = "_blank";
    a.rel = "noreferrer";
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  async function previewProduct(item: OrderItem) {
    const downloadUrl = await getDownloadUrl(item);
    if (!downloadUrl) return;
    const name = (item.fileName || item.productName || "").toLowerCase();
    const isImageFile = /\.(png|jpg|jpeg|gif|webp|avif)$/.test(name);
    if (isImageFile) {
      window.open(downloadUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (/\.(pdf|doc|docx|xls|xlsx|ppt|pptx|txt)$/.test(name)) {
      const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(downloadUrl)}&embedded=true`;
      window.open(viewerUrl, "_blank", "noopener,noreferrer");
      return;
    }
    // ZIP / MP3 / MP4 / other - just open/download it
    window.open(downloadUrl, "_blank", "noopener,noreferrer");
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
          `${BACKEND}/api/paystack/confirm`,
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
                  onClick={() => downloadProduct(item)}
                >
                  Download File ⬇️
                </button>

                <button
                  onClick={() => previewProduct(item)}
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
