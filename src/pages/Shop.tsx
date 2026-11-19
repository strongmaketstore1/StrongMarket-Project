import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  collection,
  getDocs,
} from "firebase/firestore";

import ProductCard from "../components/ProductCard";
import type {
  Product,
  ProductCategory,
} from "../types/product";
import { db } from "../firebase";

type CategoryFilter = "all" | ProductCategory;

type SortOption =
  | "newest"
  | "price-low"
  | "price-high"
  | "name";

const PAGE_SIZE = 12;

const categories: {
  label: string;
  value: CategoryFilter;
}[] = [
  { label: "All Products", value: "all" },
  { label: "Templates", value: "templates" },
  { label: "AI Prompt Packs", value: "prompt-packs" },
  { label: "Guides", value: "guides" },
];

const sortOptions: {
  label: string;
  value: SortOption;
}[] = [
  { label: "Newest First", value: "newest" },
  { label: "Price: Low to High", value: "price-low" },
  { label: "Price: High to Low", value: "price-high" },
  { label: "Name: A–Z", value: "name" },
];

function getCreatedAtString(p: Product): string {
  const v: any = (p as any).createdAt;
  if (!v) return "";
  if (typeof v === "string") return v;
  if (typeof v.toDate === "function") return v.toDate().toISOString();
  if (v.seconds) return new Date(v.seconds * 1000).toISOString();
  return String(v);
}

function normalizeCategory(raw: any): string {
  if (!raw) return "";
  const s = String(raw).toLowerCase().trim();
  if (s === "template" || s === "templates") return "templates";
  if (s === "prompt-pack" || s === "prompt-packs" || s === "prompt pack" || s === "ai prompt packs") return "prompt-packs";
  if (s === "guide" || s === "guides") return "guides";
  return s;
}

// Only show approved products. Old products with no status still show.
function isVisible(p: any): boolean {
  if (!p.status) return true;
  return p.status === "approved";
}

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [pageIndex, setPageIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem("chilvo-theme") === "dark";
    } catch {
      return false;
    }
  });

  useEffect(() => {
    const check = () => {
      try {
        setIsDark(localStorage.getItem("chilvo-theme") === "dark");
      } catch {}
    };
    window.addEventListener("storage", check);
    const obs = new MutationObserver(check);
    obs.observe(document.body, { attributes: true, attributeFilter: ["class"] });
    return () => {
      window.removeEventListener("storage", check);
      obs.disconnect();
    };
  }, []);

  // Read ?category= from URL (from Home page)
  useEffect(() => {
    const cat = searchParams.get("category");
    if (cat === "templates" || cat === "prompt-packs" || cat === "guides") {
      setSelectedCategory(cat);
    } else if (cat === "all") {
      setSelectedCategory("all");
    }
    const q = searchParams.get("search");
    if (q) setSearchTerm(q);
  }, [searchParams]);

  // Debounce search - wait 300ms after typing
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  // Load ALL products once - no orderBy, so products without createdAt still show
  // Filtering is done in app, not in Firestore, so no composite index needed
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setLoadError("");
      try {
        const snapshot = await getDocs(collection(db, "products"));
        if (cancelled) return;
        const list = snapshot.docs.map((d) => ({
          id: d.id,
          ...d.data(),
        }) as Product);
        setAllProducts(list);
      } catch (error) {
        console.error("Unable to load products:", error);
        if (!cancelled) setLoadError(error instanceof Error ? error.message : String(error));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  const search = debouncedSearch.trim().toLowerCase();

  // Filter + sort in app
  const filteredProducts = allProducts
    .filter((p) => isVisible(p))
    .filter((p) => {
      if (selectedCategory !== "all" && normalizeCategory((p as any).category) !== selectedCategory) return false;
      if (!search) return true;
      return (
        (p.name ?? "").toLowerCase().includes(search) ||
        (p.description ?? "").toLowerCase().includes(search) ||
        (p.category ?? "").toLowerCase().includes(search)
      );
    })
    .sort((a, b) => compareProducts(a, b, sortBy));

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(pageIndex, totalPages - 1);
  const pagedProducts = filteredProducts.slice(safePage * PAGE_SIZE, safePage * PAGE_SIZE + PAGE_SIZE);

  const selectedCategoryLabel =
    categories.find((c) => c.value === selectedCategory)?.label ?? "All Products";

  function changeCategory(category: CategoryFilter) {
    setSelectedCategory(category);
    setPageIndex(0);
    if (category === "all") searchParams.delete("category");
    else searchParams.set("category", category);
    setSearchParams(searchParams, { replace: true });
  }

  function changeSearch(value: string) {
    setSearchTerm(value);
    setPageIndex(0);
  }

  function changeSort(value: SortOption) {
    setSortBy(value);
    setPageIndex(0);
  }

  const bg = isDark ? "#0f172a" : "#ffffff";
  const text = isDark ? "#ffffff" : "#111111";
  const subText = isDark ? "#cbd5e1" : "#666666";
  const cardBg = isDark ? "#1e293b" : "#ffffff";

  return (
    <main className="shop-page" style={{ background: bg, color: text, minHeight: "100vh" }}>
      <section className="shop-hero" style={{ background: bg, color: text }}>
        <p className="eyebrow">CHILVO</p>
        <h1 style={{ color: text }}>Explore our digital marketplace.</h1>
        <p style={{ color: subText }}>
          Discover useful digital products created to help you learn, create, work, and grow.
        </p>
      </section>

      <section className="shop-content">
        <div className="shop-search" style={{ width: "100%", maxWidth: "700px", margin: "0 auto 20px" }}>
          <input
            type="search"
            placeholder="Search digital products..."
            style={{ width: "100%", padding: "14px 16px", fontSize: "16px", borderRadius: "12px", border: isDark ? "1px solid #334155" : "1px solid #ddd", background: cardBg, color: text, boxSizing: "border-box" }}
            value={searchTerm}
            onChange={(event) => changeSearch(event.target.value)}
            aria-label="Search digital products"
          />
        </div>

        <div className="category-filter">
          {categories.map((category) => (
            <button
              key={category.value}
              type="button"
              className={selectedCategory === category.value ? "active" : ""}
              onClick={() => changeCategory(category.value)}
              style={selectedCategory === category.value ? {} : { background: cardBg, color: text }}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="shop-sort">
          <label htmlFor="product-sort" style={{ color: text }}>Sort products</label>
          <select
            id="product-sort"
            value={sortBy}
            onChange={(event) => changeSort(event.target.value as SortOption)}
            style={{ background: cardBg, color: text, border: isDark ? "1px solid #334155" : "1px solid #ddd" }}
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        <div className="shop-results">
          <div className="results-heading">
            <h2 style={{ color: text }}>{selectedCategoryLabel}</h2>
            <span style={{ color: subText }}>
              {loading ? "Loading products..." : `${filteredProducts.length} products · Page ${safePage + 1} of ${totalPages}`}
            </span>
          </div>

          {loadError && <p role="alert" style={{ color: "#f87171" }}>{loadError}</p>}

          {!loadError && !loading && filteredProducts.length === 0 && (
            <p style={{ color: subText }}>No products found.</p>
          )}

          <div className="product-grid">
            {pagedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>

          {!loading && !loadError && filteredProducts.length > PAGE_SIZE && (
            <div className="shop-pagination">
              <button type="button" onClick={() => setPageIndex(Math.max(0, safePage - 1))} disabled={safePage === 0} style={{ background: cardBg, color: text }}>
                Previous
              </button>
              <span style={{ color: text }}>Page {safePage + 1} of {totalPages}</span>
              <button type="button" onClick={() => setPageIndex(Math.min(totalPages - 1, safePage + 1))} disabled={safePage >= totalPages - 1} style={{ background: cardBg, color: text }}>
                Next
              </button>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function compareProducts(a: Product, b: Product, sortBy: SortOption): number {
  switch (sortBy) {
    case "price-low":
      return a.price - b.price;
    case "price-high":
      return b.price - a.price;
    case "name":
      return a.name.localeCompare(b.name);
    case "newest":
    default:
      return getCreatedAtString(b).localeCompare(getCreatedAtString(a));
  }
}
