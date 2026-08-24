import {
  BrowserRouter,
  Link,
  Route,
  Routes,
} from "react-router-dom";

import "./App.css";
import Login from "./pages/Login";
import Register from "./pages/Register";
import MerchantApply from "./pages/MerchantApply";
import AdminMerchantApplications from "./pages/AdminMerchantApplications";
import { products } from "./data/products";
import ProductCard from "./components/ProductCard";
import Shop from "./pages/Shop";
import ProductDetails from "./pages/ProductDetails";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import OrderSuccess from "./pages/OrderSuccess";
import MerchantDashboard from "./pages/MerchantDashboard";
import MerchantAddProduct from "./pages/MerchantAddProduct";
import MerchantProducts from "./pages/MerchantProduct";
import MerchantEditProduct from "./pages/MerchantEditProduct";
import MerchantOrders from "./pages/MerchantOrders";
import MerchantSales from "./pages/MerchantSales";

import {
  CartProvider,
  useCart,
} from "./context/CartContext";

function Home() {
  const featuredProducts = products.filter(
    (product) => product.featured,
  );

  return (
    <main>
      <section className="hero" id="home">
        <div className="hero-content">
          <p className="eyebrow">
            DIGITAL PRODUCTS. INSTANT ACCESS.
          </p>

          <h1>
            Discover digital products
            <span> built to move you forward.</span>
          </h1>

          <p className="hero-text">
            Explore premium ebooks, templates, business
            resources, creative tools, and digital solutions
            designed for modern life and business.
          </p>

          <div className="hero-actions">
            <Link className="primary-btn" to="/shop">
              Explore Products
            </Link>

            <Link className="secondary-btn" to="/shop">
              Browse Categories
            </Link>
          </div>
        </div>

        <div className="hero-card">
          <div className="card-glow"></div>

          <p>FEATURED</p>

          <h2>Premium Digital Collection</h2>

          <span>
            Curated resources. Instant delivery.
          </span>
        </div>
      </section>

      <section className="categories" id="categories">
        <div className="section-heading">
          <p className="eyebrow">EXPLORE</p>

          <h2>Shop by category</h2>

          <p>
            Find the digital resources you need without
            the clutter.
          </p>
        </div>

        <div className="category-grid">
          <div className="category-card">
            <span>01</span>

            <h3>Ebooks & Guides</h3>

            <p>
              Practical knowledge for personal and
              professional growth.
            </p>
          </div>

          <div className="category-card">
            <span>02</span>

            <h3>Business</h3>

            <p>
              Resources designed to help businesses move
              faster.
            </p>
          </div>

          <div className="category-card">
            <span>03</span>

            <h3>Templates</h3>

            <p>
              Ready-to-use templates for work, content,
              and projects.
            </p>
          </div>

          <div className="category-card">
            <span>04</span>

            <h3>AI & Productivity</h3>

            <p>
              Digital tools and resources for smarter
              workflows.
            </p>
          </div>
        </div>
      </section>

      <section className="featured" id="shop">
        <div className="section-heading">
          <p className="eyebrow">BESTSELLERS</p>

          <h2>Featured products</h2>

          <p>
            Premium digital products selected for
            StrongMarketStore.
          </p>
        </div>

        <div className="product-grid">
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
  return (
    <BrowserRouter>
      <div className="app">
        <header className="navbar">
          <Link className="logo" to="/">
            Strong<span>Market</span>Store
          </Link>

          <nav>
            <Link to="/">Home</Link>

            <Link to="/shop">Shop</Link>

            <Link to="/shop">Categories</Link>

            <Link to="/merchant/apply">Become a Merchant</Link>
            
            <Link to="/">About</Link>
          </nav>

          <div className="nav-actions">
            <Link
              className="search-btn"
              to="/shop"
            >
              Search
            </Link>

            <CartButton />
          </div>
        </header>

  <Routes>
        
   <Route
  path="/admin/merchant-applications"
  element={<AdminMerchantApplications />}
/>
  <Route
  path="/merchant/apply"
  element={<MerchantApply />}
/>
  <Route
  path="/merchant/dashboard"
  element={<MerchantDashboard />}
/>
  <Route
    path="/"
    element={<Home />}
  />

  <Route
    path="/shop"
    element={<Shop />}
  />

  <Route
    path="/product/:slug"
    element={<ProductDetails />}
  />

  <Route
    path="/cart"
    element={<Cart />}
  />

  <Route
    path="/checkout"
    element={<Checkout />}
  />

  <Route
    path="/order-success"
    element={<OrderSuccess />}
  />

  <Route
    path="/login"
    element={<Login />}
  />

  <Route
    path="/register"
    element={<Register />}
  />

<Route
  path="/merchant/products/new"
  element={<MerchantAddProduct />}
/>

<Route
  path="/merchant/products"
  element={<MerchantProducts />}
/>

<Route
  path="/merchant/products/:productId/edit"
  element={<MerchantEditProduct />}
/>

<Route
  path="/merchant/orders"
  element={<MerchantOrders />}
/>

<Route
  path="/merchant/sales"
  element={<MerchantSales />}
/>
</Routes>

        <footer>
          <div>
            <Link className="logo" to="/">
              Strong<span>Market</span>Store
            </Link>

            <p>
              Premium digital products. Simple.
              Accessible. Instant.
            </p>
          </div>

          <p>
            © 2026 StrongMarketStore. All rights reserved.
          </p>
        </footer>
      </div>
    </BrowserRouter>
  );
}

function App() {
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  );
}

export default App;