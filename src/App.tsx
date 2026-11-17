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
            
