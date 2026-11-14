import { Link } from "react-router-dom";
import { useCart } from "../context/CartContext";

export default function Cart() {
  const {
    items,
    itemCount,
    subtotal,
    removeFromCart,
    updateQuantity,
    clearCart,
  } = useCart();

  if (items.length === 0) {
    return (
      <main className="cart-page" style={{ padding: "16px", maxWidth: "800px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
        <div className="empty-cart" style={{ textAlign: "center", padding: "40px 0" }}>
          <p className="eyebrow">YOUR CART</p>

          <h1>Your cart is empty.</h1>

          <p>
            Discover something useful from the
            CHILVO marketplace.
          </p>

          <Link className="primary-btn" to="/shop">
            Browse Products
          </Link>
        </div>
      </main>
    );
  }

  const formatCurrency = (amount: number) =>
    amount.toLocaleString("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  return (
    <main className="cart-page" style={{ padding: "16px", maxWidth: "900px", margin: "0 auto", width: "100%", boxSizing: "border-box" }}>
      <div className="cart-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", marginBottom: "20px" }}>
        <div>
          <p className="eyebrow">YOUR CART</p>

          <h1 style={{ fontSize: "24px", margin: "4px 0 6px", lineHeight: "1.2" }}>Your digital products</h1>

          <p style={{ margin: 0, color: "#666", fontSize: "14px" }}>
            {itemCount}{" "}
            {itemCount === 1 ? "item" : "items"} in your cart.
          </p>
        </div>

        <button
          className="clear-cart-btn"
          type="button"
          onClick={clearCart}
          style={{ background: "none", border: "1px solid #ddd", padding: "6px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", whiteSpace: "nowrap" }}
        >
          Clear Cart
        </button>
      </div>

      <div className="cart-layout" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        <section className="cart-items" style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {items.map((item) => (
            <article
              className="cart-item"
              key={item.product.id}
              style={{ display: "flex", gap: "12px", padding: "12px", background: "#fff", border: "1px solid #eee", borderRadius: "12px", alignItems: "flex-start" }}
            >
              <div className="cart-item-image" style={{ width: "80px", height: "80px", minWidth: "80px", background: "#fff", borderRadius: "8px", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", border: "1px solid #f0f0f0" }}>
                {item.product.image ? (
                  <img
                    src={item.product.image}
                    alt={item.product.name}
                    style={{ width: "100%", height: "100%", objectFit: "contain", display: "block" }}
                  />
                ) : (
                  <span style={{ fontSize: "10px", textAlign: "center", padding: "4px" }}>
                    {item.product.category
                      .replace("-", " ")
                      .toUpperCase()}
                  </span>
                )}
              </div>

              <div className="cart-item-info" style={{ flex: 1, minWidth: 0 }}>
                <p className="eyebrow" style={{ fontSize: "10px", margin: "0 0 4px" }}>
                  {item.product.category
                    .replace("-", " ")
                    .toUpperCase()}
                </p>

                <h2 style={{ fontSize: "16px", margin: "0 0 4px", lineHeight: "1.3" }}>{item.product.name}</h2>

                <p style={{ fontSize: "13px", color: "#666", margin: "0 0 8px", lineHeight: "1.4" }}>
                  {item.product.shortDescription}
                </p>

                <strong style={{ fontSize: "15px", display: "block", marginBottom: "10px" }}>
                  {formatCurrency(item.product.price)}
                </strong>

                <div className="cart-item-actions" style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <div className="quantity-control" style={{ display: "flex", alignItems: "center", gap: "0", border: "1px solid #ddd", borderRadius: "8px", overflow: "hidden" }}>
                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          item.product.id,
                          item.quantity - 1,
                        )
                      }
                      style={{ width: "32px", height: "32px", border: "none", background: "#f8f8f8", fontSize: "16px", cursor: "pointer" }}
                    >
                      −
                    </button>

                    <span style={{ width: "32px", textAlign: "center", fontSize: "14px", fontWeight: "600" }}>{item.quantity}</span>

                    <button
                      type="button"
                      onClick={() =>
                        updateQuantity(
                          item.product.id,
                          item.quantity + 1,
                        )
                      }
                      style={{ width: "32px", height: "32px", border: "none", background: "#f8f8f8", fontSize: "16px", cursor: "pointer" }}
                    >
                      +
                    </button>
                  </div>

                  <button
                    className="remove-item"
                    type="button"
                    onClick={() =>
                      removeFromCart(item.product.id)
                    }
                    style={{ background: "none", border: "none", color: "#d00", fontSize: "13px", cursor: "pointer", padding: 0 }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>

        <aside className="cart-summary" style={{ background: "#f8f9fa", padding: "20px 16px", borderRadius: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
          <p className="eyebrow" style={{ margin: 0 }}>ORDER SUMMARY</p>

          <h2 style={{ margin: "0 0 4px", fontSize: "20px" }}>Summary</h2>

          <div className="summary-row" style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
            <span>Items</span>
            <span>{itemCount}</span>
          </div>

          <div className="summary-row" style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
            <span>Subtotal</span>
            <strong>
              {formatCurrency(subtotal)}
            </strong>
          </div>
          <div className="summary-row" style={{ display: "flex", justifyContent: "space-between", fontSize: "14px" }}>
            <span>Delivery</span>
            <span>Instant</span>
          </div>

          <div className="summary-total" style={{ display: "flex", justifyContent: "space-between", fontSize: "16px", fontWeight: "700", borderTop: "1px solid #ddd", paddingTop: "12px", marginTop: "4px" }}>
            <span>Total</span>
            <strong>
              {formatCurrency(subtotal)}
            </strong>
          </div>

          <Link
            className="primary-btn checkout-btn"
            to="/checkout"
            style={{ textAlign: "center", display: "block", marginTop: "8px" }}
          >
            Proceed to Checkout
          </Link>

          <Link
            className="continue-shopping"
            to="/shop"
            style={{ textAlign: "center", fontSize: "14px" }}
          >
            Continue Shopping
          </Link>
        </aside>
      </div>
    </main>
  );
}
