import { useEffect, useState } from "react";
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
  { label: "Ebooks", value: "ebooks" },
  { label: "Business", value: "business" },
  { label: "Templates", value: "templates" },
  {
    label: "AI & Productivity",
    value: "ai-productivity",
  },
  { label: "Design", value: "design" },
  { label: "Marketing", value: "marketing" },
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

export default function Shop() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchProducts, setSearchProducts] = useState<Product[]>([]);
  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("all");
  const [searchTerm, setSearchTerm] = useState("");
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

  useEffect(() => {
    let cancelled = false;

    async function loadProducts() {
      setLoading(true);
      setLoadError("");

      try {
        if (searchTerm.trim()) {
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
    searchTerm,
    sortBy,
    pageIndex,
    cursors,
  ]);

  const search = searchTerm.trim().toLowerCase();

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
    if (!lastVisible || !hasNextPage || searchTerm.trim()) {
      return;
    }

    setCursors((previous) => [
      ...previous.slice(0, pageIndex),
      lastVisible,
    ]);
    setPageIndex((previous) => previous + 1);
  }

  function goToPreviousPage() {
    if (pageIndex === 0 || searchTerm.trim()) return;
    setPageIndex((previous) => previous - 1);
  }

  return (
    <main className="shop-page">
      <section className="shop-hero">
        <p className="eyebrow">CHILVO</p>

        <h1>Explore our digital marketplace.</h1>

        <p>
          Discover useful digital products created to
          help you learn, create, work, and grow.
        </p>
      </section>

      <section className="shop-content">
        <div className="shop-search">
          <input
            type="search"
            placeholder="Search digital products..."
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
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="shop-sort">
          <label htmlFor="product-sort">
            Sort products
          </label>

          <select
            id="product-sort"
            value={sortBy}
            onChange={(event) =>
              changeSort(event.target.value as SortOption)
            }
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
            <h2>{selectedCategoryLabel}</h2>

            <span>
              {loading
                ? "Loading products..."
                : searchTerm.trim()
                  ? `${filteredProducts.length} products`
                  : `${filteredProducts.length} products · Page ${pageIndex + 1}`}
            </span>
          </div>

          {loadError && <p role="alert">{loadError}</p>}

          {!loadError && !loading && filteredProducts.length === 0 && (
            <p>No products found.</p>
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
            !searchTerm.trim() && (
              <div className="shop-pagination">
                <button
                  type="button"
                  onClick={goToPreviousPage}
                  disabled={pageIndex === 0}
                >
                  Previous
                </button>

                <span>Page {pageIndex + 1}</span>

                <button
                  type="button"
                  onClick={goToNextPage}
                  disabled={!hasNextPage}
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
      return b.createdAt.localeCompare(a.createdAt);
  }
}
