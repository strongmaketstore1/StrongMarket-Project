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
      <main className="cart-page">
        <div className="empty-cart">
          <p className="eyebrow">YOUR CART</p>

          <h1>Your cart is empty.</h1>

          <p>
            Discover something useful from the
            StrongMarketStore marketplace.
          </p>

          <Link className="primary-btn" to="/shop">
            Browse Products
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="cart-page">
      <div className="cart-header">
        <div>
          <p className="eyebrow">YOUR CART</p>

          <h1>Your digital products</h1>

          <p>
            {itemCount}{" "}
            {itemCount === 1 ? "item" : "items"} in your cart.
          </p>
        </div>

        <button
          className="clear-cart-btn"
          type="button"
          onClick={clearCart}
        >
          Clear Cart
        </button>
      </div>

      <div className="cart-layout">
        <section className="cart-items">
          {items.map((item) => (
            <article
              className="cart-item"
              key={item.product.id}
            >
              <div className="cart-item-image">
                <span>
                  {item.product.category
                    .replace("-", " ")
                    .toUpperCase()}
                </span>
              </div>

              <div className="cart-item-info">
                <p className="eyebrow">
                  {item.product.category
                    .replace("-", " ")
                    .toUpperCase()}
                </p>

                <h2>{item.product.name}</h2>

                <p>
                  {item.product.shortDescription}
                </p>

                <strong>
                  ${item.product.price.toFixed(2)}
                </strong>
              </div>

              <div className="cart-item-actions">
                <div className="quantity-control">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(
                        item.product.id,
                        item.quantity - 1,
                      )
                    }
                  >
                    −
                  </button>

                  <span>{item.quantity}</span>

                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(
                        item.product.id,
                        item.quantity + 1,
                      )
                    }
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
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </section>

        <aside className="cart-summary">
          <p className="eyebrow">ORDER SUMMARY</p>

          <h2>Summary</h2>

          <div className="summary-row">
            <span>Items</span>
            <span>{itemCount}</span>
          </div>

          <div className="summary-row">
            <span>Subtotal</span>
            <strong>${subtotal.toFixed(2)}</strong>
          </div>

          <div className="summary-row">
            <span>Delivery</span>
            <span>Instant</span>
          </div>

          <div className="summary-total">
            <span>Total</span>
            <strong>${subtotal.toFixed(2)}</strong>
          </div>

          <Link
  className="primary-btn checkout-btn"
  to="/checkout"
>
  Proceed to Checkout
</Link>

          <Link className="continue-shopping" to="/shop">
            Continue Shopping
          </Link>
        </aside>
      </div>
    </main>
  );
}