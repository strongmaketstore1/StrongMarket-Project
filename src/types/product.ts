export type ProductCategory =
  | "ebooks"
  | "business"
  | "templates"
  | "ai-productivity"
  | "design"
  | "marketing";

export interface Product {
  id: string;
  name: string;
  slug: string;
  description: string;
  shortDescription: string;
  price: number;
  currency: string;
  category: ProductCategory;
  image: string;
  fileName?: string;
  featured: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  merchantId?: string;
}

