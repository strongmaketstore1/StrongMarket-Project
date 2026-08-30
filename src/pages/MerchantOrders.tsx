import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";
import {
  collection,
  onSnapshot,
  query,
  where,
} from "firebase/firestore";

import { auth, db } from "../firebase";

type OrderItem = {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  merchantId?: string;
};

type Order = {
  id: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  currency: string;
  status: string;
  paymentReference?: string;
  createdAt: string;
  merchantIds?: string[];
};

export default function MerchantOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let unsubscribeOrders: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(
      auth,
      (user) => {
        if (!user) {
          setOrders([]);
          setMessage("You must be logged in.");
          setLoading(false);
          return;
        }

        setMessage("");

        const ordersQuery = query(
          collection(db, "orders"),
          where("merchantIds", "array-contains", user.uid),
        );

        unsubscribeOrders = onSnapshot(
          ordersQuery,
          (snapshot) => {
            const merchantOrders = snapshot.docs.map(
              (orderDoc) => ({
                id: orderDoc.id,
                ...orderDoc.data(),
              }),
            ) as Order[];

            setOrders(merchantOrders);
            setLoading(false);
          },
          (error) => {
            console.error(error);
            setMessage(
              "Unable to load your orders.",
            );
            setLoading(false);
          },
        );
      },
    );

    return () => {
      unsubscribeOrders?.();
      unsubscribeAuth();
    };
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
        View orders placed for your
        StrongMarketStore products.
      </p>

      {message && <p>{message}</p>}

      {!message && orders.length === 0 && (
        <p>No orders yet.</p>
      )}

      {orders.length > 0 && (
        <section>
          {orders.map((order) => (
            <article key={order.id}>
              <h2>
                Order {order.id}
              </h2>

              <p>
                Customer:{" "}
                {order.customerName}
              </p>

              <p>
                Email:{" "}
                {order.customerEmail}
              </p>

              <p>
                Status:{" "}
                {order.status}
              </p>

              <p>
                Total:{" "}
                {order.currency}{" "}
                {order.subtotal.toLocaleString(
                  "en-NG",
                )}
              </p>

              <h3>
                Products
              </h3>

              {order.items
                .filter(
                  (item) =>
                    item.merchantId ===
                    auth.currentUser?.uid,
                )
                .map((item) => (
                  <p
                    key={item.productId}
                  >
                    {item.productName} ×{" "}
                    {item.quantity}
                  </p>
                ))}

              <p>
                Date:{" "}
                {new Date(
                  order.createdAt,
                ).toLocaleString(
                  "en-NG",
                )}
              </p>
            </article>
          ))}
        </section>
      )}
    </main>
  );
}