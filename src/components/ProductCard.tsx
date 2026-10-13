import { Link } from "react-router-dom";
import type { Product } from "../types/product";

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({
  product,
}: ProductCardProps) {
  return (
    <article className="product-card">
      <div className="product-image">
        {product.image ? (
          <img
            src={product.image}
            alt={product.name}
          />
        ) : (
          <span>
            {product.category
              .replace("-", " ")
              .toUpperCase()}
          </span>
        )}
      </div>

      <div className="product-info">
        <span>
          {product.category.replace("-", " ")}
        </span>

        <h3>{product.name}</h3>

        <p>{product.shortDescription}</p>

        <div className="product-meta">
          <div>
            <strong>
              {product.price.toLocaleString("en-US", {
                style: "currency",
                currency: "USD",
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </strong>

            <span className="rating">
              ★ {product.rating} (
              {product.reviewCount})
            </span>
          </div>

          <Link to={`/product/${product.id}`}>
            View Product
          </Link>
        </div>
      </div>
    </article>
  );
}
