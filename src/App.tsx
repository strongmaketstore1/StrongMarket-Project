import {
  BrowserRouter,
  Link,
  Route,
  Routes,
} from "react-router-dom";
import { useEffect, useState } from "react";
import { onAuthStateChanged } from "firebase/auth";

import "./App.css";

import { auth, db } from "./firebase";
import { logoutUser, deleteAccount } from "./auth";
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import type { Product } from "./types/product";
import ProductCard from "./components/ProductCard";

import Login from "./pages/Login";
import Register from "./pages/Register";
import MerchantApply from "./pages/MerchantApply";
import AdminMerchantApplications from "./pages/AdminMerchantApplications";
import Shop from "./pages/Shop";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import Account from "./pages/Account";
import MerchantStore from "./pages/MerchantStore";

import MerchantDashboard from "./pages/MerchantDashboard";
import MerchantAddProduct from "./pages/MerchantAddProduct";
import MerchantProducts from "./pages/MerchantProduct";
import MerchantEditProduct from "./pages/MerchantEditProduct";
import MerchantOrders from "./pages/MerchantOrders";
import MerchantSales from "./pages/MerchantSales";
import MerchantEarnings from "./pages/MerchantEarnings";

import {
  CartProvider,
  useCart,
} from "./context/CartContext";

function Home() {
  const [featuredProducts, setFeaturedProducts] =
    useState<Product[]>([]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const firestoreProducts =
          snapshot.docs.map((productDoc) => ({
            id: productDoc.id,
            ...productDoc.data(),
          })) as Product[];

        setFeaturedProducts(
          firestoreProducts.filter(
            (product) => product.featured,
          ),
        );
      },
      (error) => {
        console.error(
          "Unable to load featured products:",
          error
        );
      },
    );

    return () => unsubscribe();
  }, []);

  return (
    <main style={{ width: "100%", boxSizing: "border-box", overflowX: "hidden" }}>
      <section className="hero" id="home" style={{ padding: "28px 16px 24px", display: "flex", flexDirection: "column", gap: "24px", width: "100%", boxSizing: "border-box" }}>
        <div className="hero-content" style={{ width: "100%", boxSizing: "border-box" }}>
          <p className="eyebrow" style={{ margin: "0 0 10px", fontSize: "11px", letterSpacing: "1px" }}>
            DIGITAL PRODUCTS. INSTANT ACCESS.
          </p>

          <h1 style={{ fontSize: "32px", lineHeight: "1.15", margin: "0 0 12px", wordBreak: "break-word", overflowWrap: "break-word" }}>
            Discover digital products
            <span style={{ display: "block", color: "#1d4ed8" }}> built to move you forward.</span>
          </h1>

          <p className="hero-text" style={{ fontSize: "14px", lineHeight: "1.6", color: "#555", margin: "0 0 18px" }}>
            Explore premium templates, AI prompt packs, and
            guides designed for modern life and business.
          </p>

          <div className="hero-actions" style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            <Link className="primary-btn" to="/shop" style={{ padding: "12px 18px", fontSize: "14px", borderRadius: "8px" }}>
              Explore Products
            </Link>

            <Link className="secondary-btn" to="/shop" style={{ padding: "12px 18px", fontSize: "14px", borderRadius: "8px" }}>
              Browse Categories
            </Link>
          </div>
        </div>

        <div className="hero-card" style={{ width: "100%", boxSizing: "border-box", padding: "28px 20px", borderRadius: "16px", background: "#0f172a", color: "#fff", position: "relative", overflow: "hidden" }}>
          <div className="card-glow"></div>

          <p style={{ fontSize: "11px", letterSpacing: "1px", margin: "0 0 8px", color: "#93c5fd" }}>FEATURED</p>

          <h2 style={{ fontSize: "24px", lineHeight: "1.2", margin: "0 0 8px" }}>Premium Digital Collection</h2>

          <span style={{ fontSize: "13px", color: "#cbd5e1" }}>
            Curated resources. Instant delivery.
          </span>
        </div>
      </section>

      <section className="categories" id="categories" style={{ padding: "24px 16px 32px", width: "100%", boxSizing: "border-box" }}>
        <div className="section-heading" style={{ marginBottom: "18px" }}>
          <p className="eyebrow" style={{ margin: "0 0 6px" }}>EXPLORE</p>

          <h2 style={{ fontSize: "24px", margin: "0 0 6px", lineHeight: "1.2" }}>Shop by category</h2>

          <p style={{ fontSize: "13px", color: "#666", margin: 0, lineHeight: "1.5" }}>
            Find the digital resources you need without
            the clutter.
          </p>
        </div>

        <div className="category-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", width: "100%", boxSizing: "border-box" }}>
          <Link
            className="category-card"
            to="/shop?category=templates"
            style={{ padding: "16px 12px", borderRadius: "12px", display: "block", boxSizing: "border-box" }}
          >
            <span>01</span>
            <h3 style={{ fontSize: "15px", margin: "10px 0 6px", lineHeight: "1.3" }}>Templates</h3>
            <p style={{ fontSize: "12px", lineHeight: "1.5", margin: 0 }}>
              Ready-to-use templates for work, content, and projects.
            </p>
          </Link>

          <Link
            className="category-card"
            to="/shop?category=prompt-packs"
            style={{ padding: "16px 12px", borderRadius: "12px", display: "block", boxSizing: "border-box" }}
          >
            <span>02</span>
            <h3 style={{ fontSize: "15px", margin: "10px 0 6px", lineHeight: "1.3" }}>AI Prompt Packs</h3>
            <p style={{ fontSize: "12px", lineHeight: "1.5", margin: 0 }}>
              Ready-to-use prompts for smarter, faster workflows.
            </p>
          </Link>

          <Link
            className="category-card"
            to="/shop?category=guides"
            style={{ padding: "16px 12px", borderRadius: "12px", display: "block", boxSizing: "border-box" }}
          >
            <span>03</span>
            <h3 style={{ fontSize: "15px", margin: "10px 0 6px", lineHeight: "1.3" }}>Guides</h3>
            <p style={{ fontSize: "12px", lineHeight: "1.5", margin: 0 }}>
              Practical knowledge for personal and professional growth.
            </p>
          </Link>
        </div>

        <div className="product-grid" style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "20px" }}>
          {featuredProducts.map((product) => (
            <ProductCard
              key={product.id}
              product={product}
            />
          ))}
        </div>
      </section>
    </main>
  );
}

function CartButton() {
  const { itemCount } = useCart();

  return (
    <Link className="cart-btn" to="/cart">
      Cart ({itemCount})
    </Link>
  );
}

function AppContent() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [user, setUser] = useState(auth.currentUser);
  const [merchantStatus, setMerchantStatus] =
    useState<string>("none");

  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    document.body.style.overflow = mobileMenuOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(
      auth,
      async (currentUser) => {
        setUser(currentUser);

        setIsAdmin(
          currentUser?.uid ===
            "K2XHC9W2xxPcdEkjrtPdBAUjAjy1",
        );

        if (!currentUser) {
          setMerchantStatus("none");
          setIsAdmin(false);
          return;
        }

        try {
          const userSnapshot = await getDoc(
            doc(db, "users", currentUser.uid)
          );

          if (userSnapshot.exists()) {
            setMerchantStatus(
              userSnapshot.data().merchantStatus ?? "none"
            );
          } else {
            setMerchantStatus("none");
          }
        } catch (error) {
          console.error(
            "Unable to load merchant status:",
            error
          );
          setMerchantStatus("none");
        }
      }
    );

    return unsubscribe;
  }, []);

  async function handleLogout() {
    try {
      await logoutUser();
    } catch (error) {
      console.error(error);
      alert("Unable to log out.");
    }
  }

  async function handleDeleteAccount() {
    const confirmed = window.confirm(
      "Are you sure you want to permanently delete your account? This cannot be undone.",
    );

    if (!confirmed) {
      return;
    }

    try {
      await deleteAccount();

      alert("Your account has been deleted.");
    } catch (error) {
      console.error(error);

      alert(
        "Unable to delete your account. You may need to sign in again before deleting your account.",
      );
    }
  }

  const navLinkStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    padding: "22px 12px",
    fontSize: "28px",
    lineHeight: "1.4",
    color: "#111",
    fontWeight: 800,
    textDecoration: "none",
    borderBottom: "1px solid #f0f0f0",
    width: "100%",
    minHeight: "76px",
    boxSizing: "border-box",
  };

  return (
    <BrowserRouter basename="/StrongMarket-Project">
      <div className="app" style={{ width: "100%", overflowX: "hidden", paddingTop: "82px" }}>
        <header className="navbar" style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 10000, background: "#fff", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "8px", padding: "10px 12px", width: "100%", boxSizing: "border-box", borderBottom: "1px solid #eee" }}>
          <Link
            className="logo"
            to="/"
            onClick={() => setMobileMenuOpen(false)}
            style={{ flexShrink: 0 }}
          >
            <img
              src="/StrongMarket-Project/chilvo-logo-1.png"
              alt="CHILVO"
              style={{ height: "32px", width: "auto", display: "block" }}
            />
          </Link>

          <div className="nav-actions" style={{ display: "flex", alignItems: "center", gap: "6px", flexShrink: 0 }}>
            <Link
              className="search-btn"
              to="/shop"
              aria-label="Search products"
            >
              <span className="search-icon" aria-hidden="true">
                ⌕
              </span>
              <span className="search-label">Search</span>
            </Link>

            <CartButton />

            <button
              type="button"
              className="mobile-menu-btn"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              style={{ fontSize: "20px", padding: "6px 10px", background: "none", border: "none", cursor: "pointer" }}
            >
              {mobileMenuOpen ? "✕" : "☰"}
            </button>
          </div>
        </header>

        {mobileMenuOpen && (
          <nav
            id="chilvo-mobile-navigation"
            style={{ display: "flex", flexDirection: "column", background: "#fff", padding: "8px 16px 80px", borderBottom: "1px solid #eee", width: "100%", boxSizing: "border-box", position: "fixed", top: "82px", left: 0, right: 0, bottom: 0, height: "calc(100vh - 82px)", minHeight: "calc(100vh - 82px)", overflowY:
