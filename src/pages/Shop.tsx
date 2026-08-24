import { useEffect, useState } from "react";
import {
  collection,
  onSnapshot,
} from "firebase/firestore";

import { products } from "../data/products";
import ProductCard from "../components/ProductCard";
import type { Product, ProductCategory } from "../types/product";
import { db } from "../firebase";

type CategoryFilter = "all" | ProductCategory;

const categories: {
  label: string;
  value: CategoryFilter;
}[] = [
  { label: "All Products", value: "all" },
  { label: "Ebooks", value: "ebooks" },
  { label: "Business", value: "business" },
  { label: "Templates", value: "templates" },
  { label: "AI & Productivity", value: "ai-productivity" },
  { label: "Design", value: "design" },
  { label: "Marketing", value: "marketing" },
];

export default function Shop() {
  const [merchantProducts, setMerchantProducts] =
    useState<Product[]>([]);

  const [selectedCategory, setSelectedCategory] =
    useState<CategoryFilter>("all");

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, "products"),
      (snapshot) => {
        const firestoreProducts =
          snapshot.docs.map((productDoc) => ({
            id: productDoc.id,
            ...productDoc.data(),
          })) as Product[];

        setMerchantProducts(firestoreProducts);
      },
      (error) => {
        console.error(
          "Unable to load merchant products:",
          error,
        );
      },
    );

    return () => unsubscribe();
  }, []);

  const allProducts = [
    ...products,
    ...merchantProducts,
  ];

  const filteredProducts =
    selectedCategory === "all"
      ? allProducts
      : allProducts.filter(
          (product) =>
            product.category === selectedCategory,
        );

  const selectedCategoryLabel =
    categories.find(
      (category) =>
        category.value === selectedCategory,
    )?.label ?? "All Products";

  return (
    <main className="shop-page">
      <section className="shop-hero">
        <p className="eyebrow">STRONGMARKETSTORE</p>

        <h1>Explore our digital marketplace.</h1>

        <p>
          Discover useful digital products created to help
          you learn, create, work, and grow.
        </p>
      </section>

      <section className="shop-content">
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
              onClick={() =>
                setSelectedCategory(
                  category.value,
                )
              }
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="shop-results">
          <div className="results-heading">
            <h2>{selectedCategoryLabel}</h2>

            <span>
              {filteredProducts.length} products
            </span>
          </div>

          <div className="product-grid">
            {filteredProducts.map((product) => (
              <ProductCard
                key={`${product.id}-${product.slug}`}
                product={product}
              />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}