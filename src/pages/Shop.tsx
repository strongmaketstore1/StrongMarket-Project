import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  collection,
  documentId,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type QueryDocumentSnapshot,
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

export default function Shop() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [searchProducts, setSearchProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [pageIndex, setPageIndex] = useState(0);
  const [cursors, setCursors] = useState<
    QueryDocumentSnapshot<DocumentData>[]
  >([]);
  const [lastVisible, setLastVisible] =
    useState<QueryDocumentSnapshot<DocumentData> | null>(null);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  // Dark mode - sync with App.tsx body class
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

  // FIX 1: Read ?category= from URL (from Home page)
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

  // FIX 2: Debounce search - wait 300ms after typing
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchTerm), 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      setLoadError("");

      try {
        if (debouncedSearch.trim()) {
          const snapshot = await getDocs(
            collection(db, "products"),
          );

          if (cancelled) return;

          const allProducts = snapshot.docs.map(
            (productDoc) => ({
              id: productDoc.id,
              ...productDoc.data(),
            }) as Product,
          );

          setSearchProducts(allProducts);
          setProducts([]);
          setHasNextPage(false);
          setLastVisible(null);
          return;
        }

        const constraints = [];

        if (selectedCategory !== "all") {
          constraints.push(
            where("category", "==", selectedCategory),
          );
        }

        if (sortBy === "price-low") {
          constraints.push(orderBy("price", "asc"));
        } else if (sortBy === "price-high") {
          constraints.push(orderBy("price", "desc"));
        } else if (sortBy === "name") {
          constraints.push(orderBy("name", "asc"));
        } else {
          constraints.push(orderBy("createdAt", "desc"));
        }

        constraints.push(orderBy(documentId()));

        if (pageIndex > 0 && cursors[pageIndex - 1]) {
          constraints.push(
            startAfter(cursors[pageIndex - 1]),
          );
        }

        constraints.push(limit(PAGE_SIZE + 1));

        const productsQuery = query(
          collection(db, "products"),
          ...constraints,
        );

        const snapshot = await getDocs(productsQuery);

        if (cancelled) return;

        const pageDocs = snapshot.docs.slice(0, PAGE_SIZE);

        setProducts(
          pageDocs.map((productDoc) => ({
            id: productDoc.id,
            ...productDoc.data(),
          })) as Product[],
        );

        setLastVisible(
          pageDocs.length > 0
            ? pageDocs[pageDocs.length - 1]
            : null,
        );

        setHasNextPage(snapshot.docs.length > PAGE_SIZE);
        setSearchProducts([]);
      } catch (error) {
        console.error("Unable to load products:", error);

        if (!cancelled) {
          setLoadError(
            error instanceof Error ? error.message : String(error)
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadProducts();

    return () => {
      cancelled = true;
    };
  }, [
    selectedCategory,
    debouncedSearch,
    sortBy,
    pageIndex,
  ]);

  const search = debouncedSearch.trim().toLowerCase();

  const filteredProducts = search
    ? searchProducts
        .filter((product) => {
          const matchesCategory =
            selectedCategory === "all" ||
            product.category === selectedCategory;

          return (
            matchesCategory &&
            (
              (product.name ?? "").toLowerCase().includes(search) ||
              (product.description ?? "").toLowerCase().includes(search) ||
              (product.category ?? "").toLowerCase().includes(search)
            )
          );
        })
        .sort((a, b) => compareProducts(a, b, sortBy))
    : products;

  const selectedCategoryLabel =
    categories.find(
      (category) => category.value === selectedCategory,
    )?.label ?? "All Products";

  function changeCategory(category: CategoryFilter) {
    setSelectedCategory(category);
    setPageIndex(0);
    setCursors([]);
    if (category === "all") {
      searchParams.delete("category");
    } else {
      searchParams.set("category", category);
    }
    setSearchParams(searchParams, { replace: true });
  }

  function changeSearch(value: string) {
    setSearchTerm(value);
    setPageIndex(0);
    setCursors([]);
  }

  function changeSort(value: SortOption) {
    setSortBy(value);
    setPageIndex(0);
    setCursors([]);
    setLastVisible(null);
  }

  function goToNextPage() {
    if (!lastVisible || !hasNextPage || debouncedSearch.trim()) {
      return;
    }

    setCursors((previous) => [
      ...previous.slice(0, pageIndex),
      lastVisible,
    ]);
    setPageIndex((previous) => previous + 1);
  }

  function goToPreviousPage() {
    if (pageIndex === 0 || debouncedSearch.trim()) return;
    setPageIndex((previous) => previous - 1);
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
          Discover useful digital products created to
          help you learn, create, work, and grow.
        </p>
      </section>

      <section className="shop-content">
        <div className="shop-search" style={{ width: "100%", maxWidth: "700px", margin: "0 auto 20px" }}>
          <input
            type="search"
            placeholder="Search digital products..."
            style={{ width: "100%", padding: "14px 16px", fontSize: "16px", borderRadius: "12px", border: isDark ? "1px solid #334155" : "1px solid #ddd", background: cardBg, color: text, boxSizing: "border-box" }}
            value={searchTerm}
            onChange={(event) =>
              changeSearch(event.target.value)
            }
            aria-label="Search digital products"
          />
        </div>

        <div className="category-filter">
          {categories.map((category) => (
            <button
              key={category.value}
              type="button"
              className={
                selectedCategory === category.value
                  ? "active"
                  : ""
              }
              onClick={() => changeCategory(category.value)}
              style={selectedCategory === category.value ? {} : { background: cardBg, color: text }}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="shop-sort">
          <label htmlFor="product-sort" style={{ color: text }}>
            Sort products
          </label>

          <select
            id="product-sort"
            value={sortBy}
            onChange={(event) =>
              changeSort(event.target.value as SortOption)
            }
            style={{ background: cardBg, color: text, border: isDark ? "1px solid #334155" : "1px solid #ddd" }}
          >
            {sortOptions.map((option) => (
              <option
                key={option.value}
                value={option.value}
              >
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div className="shop-results">
          <div className="results-heading">
            <h2 style={{ color: text }}>{selectedCategoryLabel}</h2>

            <span style={{ color: subText }}>
              {loading
                ? "Loading products..."
                : searchTerm.trim()
                  ? `${filteredProducts.length} products`
                  : `${filteredProducts.length} products · Page ${pageIndex + 1}`}
            </span>
          </div>

          {loadError && <p role="alert" style={{ color: "#f87171" }}>{loadError}</p>}

          {!loadError && !loading && filteredProducts.length === 0 && (
            <p style={{ color: subText }}>No products found.</p>
          )}

          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={product.id}
                product={product}
              />
            ))}
          </div>

          {!loading &&
            !loadError &&
            !debouncedSearch.trim() && (
              <div className="shop-pagination">
                <button
                  type="button"
                  onClick={goToPreviousPage}
                  disabled={pageIndex === 0}
                  style={{ background: cardBg, color: text }}
                >
                  Previous
                </button>

                <span style={{ color: text }}>Page {pageIndex + 1}</span>

                <button
                  type="button"
                  onClick={goToNextPage}
                  disabled={!hasNextPage}
                  style={{ background: cardBg, color: text }}
                >
                  Next
                </button>
              </div>
            )}
        </div>
      </section>
    </main>
  );
}

function compareProducts(
  a: Product,
  b: Product,
  sortBy: SortOption,
): number {
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
