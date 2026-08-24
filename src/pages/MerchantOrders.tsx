import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

import { auth } from "../firebase";
import { getOrders } from "../service";
import type { Order } from "../service";

export default function MerchantOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
  const unsubscribe = onAuthStateChanged(
    auth,
    (user) => {
      if (!user) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const savedOrders = getOrders();

      const merchantOrders = savedOrders.filter(
        (order) =>
          order.items.some(
            (item) =>
              item.merchantId === user.uid,
          ),
      );

      setOrders(merchantOrders);
      setLoading(false);
    },
  );

  return () => unsubscribe();
}, []);

  if (loading) {
    return (
      <main>
        <h1>Orders</h1>
        <p>Loading orders...</p>
      </main>
    );
  }

  return (
    <main>
      <h1>Orders</h1>

      <p>
        View orders placed for StrongMarketStore
        products.
      </p>

      {orders.length === 0 ? (
        <p>No orders yet.</p>
      ) : (
        <section>
          {orders.map((order) => (
            <article key={order.id}>
              <h2>Order {order.id}</h2>

              <p>
                Customer: {order.customerName}
              </p>

              <p>
                Email: {order.customerEmail}
              </p>

              <p>
                Status: {order.status}
              </p>

              <p>
                Total: {order.currency}{" "}
                {order.subtotal.toLocaleString("en-NG")}
              </p>

              <h3>Products</h3>

              {order.items.map((item) => (
                <p key={item.productId}>
                  {item.productName} × {item.quantity}
                </p>
              ))}

              <p>
                Date:{" "}
                {new Date(
                  order.createdAt,
                ).toLocaleString("en-NG")}
              </p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}