import {
  useEffect,
  useState,
} from "react";
import type {
  ChangeEvent,
  FormEvent,
} from "react";
import { Link } from "react-router-dom";
import {
  onAuthStateChanged,
  updateProfile,
  type User,
} from "firebase/auth";

import { auth, db } from "../firebase";
import {
  doc,
  getDoc,
  updateDoc,
} from "firebase/firestore";
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

  const [editingProfile, setEditingProfile] =
    useState(false);

  const [editName, setEditName] =
    useState("");

  const [editPhotoURL, setEditPhotoURL] =
    useState("");

  const [profileSaving, setProfileSaving] =
    useState(false);

  const [profileMessage, setProfileMessage] =
    useState("");

  async function handleSaveProfile(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const currentUser = auth.currentUser;

    if (!currentUser) {
      setProfileMessage(
        "You must be signed in to update your profile.",
      );
      return;
    }

    try {
      setProfileSaving(true);
      setProfileMessage("");

      const trimmedName =
        editName.trim();

      if (!trimmedName) {
        setProfileMessage(
          "Please enter your name.",
        );
        return;
      }

      await updateProfile(currentUser, {
        displayName: trimmedName,
        photoURL:
          editPhotoURL || null,
      });

      await updateDoc(
        doc(
          db,
          "users",
          currentUser.uid,
        ),
        {
          name: trimmedName,
          photoURL:
            editPhotoURL || "",
        },
      );

      await currentUser.reload();

      setUser(auth.currentUser);

      setProfile({
        ...profile,
        name: trimmedName,
        email:
          profile?.email ||
          currentUser.email ||
          "",
        photoURL:
          editPhotoURL || "",
      });

      setEditingProfile(false);

      setProfileMessage(
        "Profile updated successfully.",
      );
    } catch (error) {
      console.error(
        "Profile update error:",
        error,
      );

      setProfileMessage(
        error instanceof Error
          ? error.message
          : "Unable to update your profile.",
      );
    } finally {
      setProfileSaving(false);
    }
  }

  // STEP 4 — Profile photo upload
  async function handleProfilePhotoUpload(
    event: ChangeEvent<HTMLInputElement>,
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      setProfileMessage(
        "You must be signed in.",
      );
      return;
    }

    try {
      setProfileSaving(true);
      setProfileMessage(
        "Uploading profile photo...",
      );

      const idToken =
        await currentUser.getIdToken();

      const formData =
        new FormData();

      formData.append(
        "file",
        file,
      );

      const response =
        await fetch(
          "https://strongmarket-payment-server.onrender.com/api/products/upload",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${idToken}`,
            },
            body: formData,
          },
        );

      const result =
        await response.json();

      if (
        !response.ok ||
        result?.success !== true
      ) {
        setProfileMessage(
          result?.message ||
            "Unable to upload profile photo.",
        );
        return;
      }

      setEditPhotoURL(
        result.secureUrl || "",
      );

      setProfileMessage(
        "Profile photo uploaded. Save your profile to apply it.",
      );
    } catch (error) {
      console.error(
        "Profile photo upload error:",
        error,
      );

      setProfileMessage(
        error instanceof Error
          ? error.message
          : "Unable to upload profile photo.",
      );
    } finally {
      setProfileSaving(false);
    }
  }

  useEffect(() => {
    const unsubscribe =
      onAuthStateChanged(
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
            const userSnapshot =
              await getDoc(
                doc(
                  db,
                  "users",
                  currentUser.uid,
                ),
              );

            if (
              userSnapshot.exists()
            ) {
              setProfile(
                userSnapshot.data() as UserProfile,
              );
            } else {
              setProfile({
                name:
                  currentUser.displayName ??
                  "",
                email:
                  currentUser.email ??
                  "",
              });
            }

            setOrdersLoading(true);
            setOrdersError("");

            const customerOrders =
              await getCustomerOrders(
                currentUser.uid,
              );

            setOrders(
              customerOrders,
            );
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
          <p>
            Loading your account...
          </p>
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
    profile?.merchantStatus ===
    "approved";

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
            {profile?.photoURL ||
            user.photoURL ? (
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
                  alignItems:
                    "center",
                  justifyContent:
                    "center",
                  borderRadius: "50%",
                  fontSize: "2rem",
                  fontWeight: "700",
                  background:
                    "#f1f5f9",
                }}
              >
                {(
                  profile?.name ||
                  user.displayName ||
                  "C"
                )
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
            <strong>
              Account type:
            </strong>{" "}
            {isMerchant
              ? "Merchant"
              : "Customer"}
          </p>

          <p>
            <strong>
              Email verification:
            </strong>{" "}
            {user.emailVerified
              ? "Verified"
              : "Not verified"}
          </p>

          {isMerchant && (
            <p>
              <strong>
                Merchant status:
              </strong>{" "}
              Approved
            </p>
          )}

          <p>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => {
                setEditName(
                  profile?.name ||
                    user.displayName ||
                    "",
                );

                setEditPhotoURL(
                  profile?.photoURL ||
                    user.photoURL ||
                    "",
                );

                setProfileMessage("");
                setEditingProfile(
                  true,
                );
              }}
            >
              Edit Profile
            </button>
          </p>
        </div>

        {/* STEP 6 — Edit Profile form */}
        {editingProfile && (
          <div>
            <h3>
              Edit Profile
            </h3>

            <form
              onSubmit={
                handleSaveProfile
              }
            >
              <div>
                <label htmlFor="profileName">
                  Name
                </label>

                <input
                  id="profileName"
                  type="text"
                  value={editName}
                  onChange={(event) =>
                    setEditName(
                      event.target.value,
                    )
                  }
                  required
                />
              </div>

              <div>
                <label htmlFor="profileEmail">
                  Email
                </label>

                <input
                  id="profileEmail"
                  type="email"
                  value={
                    profile?.email ||
                    user.email ||
                    ""
                  }
                  readOnly
                />
              </div>

              <div>
                <label htmlFor="profilePhoto">
                  Profile Photo
                </label>

                <input
                  id="profilePhoto"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={
                    handleProfilePhotoUpload
                  }
                  disabled={
                    profileSaving
                  }
                />
              </div>

              {editPhotoURL && (
                <div>
                  <img
                    src={editPhotoURL}
                    alt="Profile preview"
                    width="120"
                    height="120"
                  />
                </div>
              )}

              <div>
                <button
                  type="submit"
                  className="primary-btn"
                  disabled={
                    profileSaving
                  }
                >
                  {profileSaving
                    ? "Saving..."
                    : "Save Changes"}
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => {
                    setEditingProfile(
                      false,
                    );
                    setProfileMessage(
                      "",
                    );
                  }}
                  disabled={
                    profileSaving
                  }
                >
                  Cancel
                </button>
              </div>

              {profileMessage && (
                <p role="status">
                  {profileMessage}
                </p>
              )}
            </form>
          </div>
        )}

        <div>
          <h2>My Orders</h2>

          {ordersLoading && (
            <p>
              Loading your orders...
            </p>
          )}

          {!ordersLoading &&
            ordersError && (
              <p role="alert">
                {ordersError}
              </p>
            )}

          {!ordersLoading &&
            !ordersError &&
            orders.length === 0 && (
              <div>
                <p>
                  You haven't placed any
                  orders yet.
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
                {orders.map(
                  (order) => (
                    <article
                      key={order.id}
                    >
                      <h3>
                        Order #
                        {order.id}
                      </h3>

                      <p>
                        <strong>
                          Date:
                        </strong>{" "}
                        {new Date(
                          order.createdAt,
                        ).toLocaleDateString()}
                      </p>

                      <p>
                        <strong>
                          Status:
                        </strong>{" "}
                        {order.status}
                      </p>

                      <p>
                        <strong>
                          Total:
                        </strong>{" "}
                        {order.currency ===
                        "NGN"
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
                                {
                                  item.productName
                                }{" "}
                                ×{" "}
                                {
                                  item.quantity
                                }
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
                          {
                            order.paymentReference
                          }
                        </p>
                      )}
                    </article>
                  ),
                )}
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
