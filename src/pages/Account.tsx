import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { onAuthStateChanged, type User } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";

import { auth, db } from "../firebase";

type UserProfile = {
  name?: string;
  email?: string;
  role?: string;
  merchantStatus?: string;
};

export default function Account() {
  const [user, setUser] = useState<User | null>(
    auth.currentUser,
  );
  const [profile, setProfile] =
    useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);

        if (!currentUser) {
          setProfile(null);
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
        } catch (error) {
          console.error(
            "Unable to load account profile:",
            error,
          );
        } finally {
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

          {isMerchant && (
            <p>
              <strong>Merchant status:</strong>{" "}
              Approved
            </p>
          )}
        </div>

        <div>
          <h2>Orders & Purchases</h2>

          <p>
            View your purchases and access your
            digital products.
          </p>

          <Link to="/cart">
            Go to Cart
          </Link>
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
