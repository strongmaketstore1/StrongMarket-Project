export type ProductCategory = "templates" | "prompt-packs" | "guides";

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
  cloudinaryPublicId?: string;
  cloudinaryFileRef?: string;
  featured: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  merchantId?: string;
}
