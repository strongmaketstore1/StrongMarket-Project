import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged, type User } from "firebase/auth";

import { auth, db } from "../firebase";
import { doc, getDoc } from "firebase/firestore";
import { getCustomerOrders } from "../firestoreOrders";
import type { Order } from "../types/order";

type UserProfile = {
  name?: string;
  email?: string;
  role?: string;
  merchantStatus?: string;
  photoURL?: string;
};

export default function Account() {
  const [user, setUser] = useState<User | null>(
    auth.currentUser,
  );

  const [profile, setProfile] =
    useState<UserProfile | null>(null);

  const [orders, setOrders] = useState<Order[]>([]);

  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] =
    useState(false);

  const [ordersError, setOrdersError] =
    useState("");

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);

        if (!currentUser) {
          setProfile(null);
          setOrders([]);
          setLoading(false);
          return;
        }

        try {
          const userSnapshot = await getDoc(
            doc(db, "users", currentUser.uid),
          );

          if (userSnapshot.exists()) {
            setProfile(
              userSnapshot.data() as UserProfile,
            );
          } else {
            setProfile({
              name:
                currentUser.displayName ?? "",
              email:
                currentUser.email ?? "",
            });
          }

          setOrdersLoading(true);
          setOrdersError("");

          const customerOrders =
            await getCustomerOrders(
              currentUser.uid,
            );

          setOrders(customerOrders);
        } catch (error) {
          console.error(
            "Unable to load account:",
            error,
          );

          setOrdersError(
            "Unable to load your orders right now.",
          );
        } finally {
          setOrdersLoading(false);
          setLoading(false);
        }
      },
    );

    return unsubscribe;
  }, []);

  if (loading) {
    return (
      <main>
        <section>
          <h1>My Account</h1>
          <p>Loading your account...</p>
        </section>
      </main>
    );
  }

  if (!user) {
    return (
      <main>
        <section>
          <h1>My Account</h1>

          <p>
            Please sign in to view your account.
          </p>

          <Link to="/login">
            Sign In
          </Link>
        </section>
      </main>
    );
  }

  const isMerchant =
    profile?.merchantStatus === "approved";

  return (
    <main>
      <section>
        <h1>My Account</h1>

        <p>
          Manage your CHILVO account and activities.
        </p>

        <div>
  <h2>Profile</h2>

  <div>
    {profile?.photoURL || user.photoURL ? (
      <img
        src={
          profile?.photoURL ||
          user.photoURL ||
          ""
        }
        alt={
          profile?.name ||
          user.displayName ||
          "Profile"
        }
        width="96"
        height="96"
      />
    ) : (
      <div
        aria-label="Profile placeholder"
        style={{
          width: "96px",
          height: "96px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "50%",
          fontSize: "2rem",
          fontWeight: "700",
          background: "#f1f5f9",
        }}
      >
        {(profile?.name ||
          user.displayName ||
          "C")
          .charAt(0)
          .toUpperCase()}
      </div>
    )}
  </div>

  <p>
    <strong>Name:</strong>{" "}
    {profile?.name ||
      user.displayName ||
      "Not provided"}
  </p>

  <p>
    <strong>Email:</strong>{" "}
    {profile?.email ||
      user.email ||
      "Not available"}
  </p>

  <p>
    <strong>Account type:</strong>{" "}
    {isMerchant
      ? "Merchant"
      : "Customer"}
  </p>

  <p>
    <strong>Email verification:</strong>{" "}
    {user.emailVerified
      ? "Verified"
      : "Not verified"}
  </p>

  {isMerchant && (
    <p>
      <strong>Merchant status:</strong>{" "}
      Approved
    </p>
  )}

  <p>
    <button
      type="button"
      className="secondary-btn"
      disabled
    >
      Edit Profile
    </button>
  </p>
</div>

        <div>
          <h2>My Orders</h2>

          {ordersLoading && (
            <p>Loading your orders...</p>
          )}

          {!ordersLoading && ordersError && (
            <p role="alert">
              {ordersError}
            </p>
          )}

          {!ordersLoading &&
            !ordersError &&
            orders.length === 0 && (
              <div>
                <p>
                  You haven't placed any orders yet.
                </p>

                <Link to="/shop">
                  Browse Products
                </Link>
              </div>
            )}

          {!ordersLoading &&
            !ordersError &&
            orders.length > 0 && (
              <div>
                {orders.map((order) => (
                  <article key={order.id}>
                    <h3>
                      Order #{order.id}
                    </h3>

                    <p>
                      <strong>Date:</strong>{" "}
                      {new Date(
                        order.createdAt,
                      ).toLocaleDateString()}
                    </p>

                    <p>
                      <strong>Status:</strong>{" "}
                      {order.status}
                    </p>

                    <p>
                      <strong>Total:</strong>{" "}
                      {order.currency === "NGN"
                        ? "₦"
                        : "$"}
                      {order.subtotal.toLocaleString()}
                    </p>

                    <div>
                      <strong>
                        Products:
                      </strong>

                      <ul>
                        {order.items.map(
                          (item) => (
                            <li
                              key={
                                item.productId
                              }
                            >
                              {item.productName} ×{" "}
                              {item.quantity}
                            </li>
                          ),
                        )}
                      </ul>
                    </div>

                    {order.paymentReference && (
                      <p>
                        <strong>
                          Payment reference:
                        </strong>{" "}
                        {order.paymentReference}
                      </p>
                    )}
                  </article>
                ))}
              </div>
            )}
        </div>

        <div>
          <h2>Shopping</h2>

          <p>
            View your purchases and continue
            shopping on CHILVO.
          </p>

          <p>
            <Link to="/cart">
              Go to Cart
            </Link>
          </p>

          <p>
            <Link to="/shop">
              Browse Products
            </Link>
          </p>
        </div>

        {isMerchant && (
          <div>
            <h2>Merchant</h2>

            <p>
              Manage your digital products,
              orders, and sales.
            </p>

            <p>
              <Link to="/merchant/dashboard">
                Merchant Dashboard
              </Link>
            </p>

            <p>
              <Link to="/merchant/products">
                My Products
              </Link>
            </p>

            <p>
              <Link to="/merchant/orders">
                Orders
              </Link>
            </p>

            <p>
              <Link to="/merchant/sales">
                Sales
              </Link>
            </p>
          </div>
        )}
      </section>
    </main>
  );
}
