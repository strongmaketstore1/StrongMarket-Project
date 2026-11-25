export type ProductCategory = "templates" | "prompt-packs" | "guides" | "ebooks" | "courses" | "design" | "music" | "other" | "Templates" | "Ebooks" | "Courses" | "Design" | "Music" | "Other";

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
  fileUrl?: string;
  downloadUrl?: string;
  cloudinaryPublicId?: string;
  cloudinaryFileRef?: string;
  featured: boolean;
  rating: number;
  reviewCount: number;
  createdAt: string;
  merchantId?: string;
  merchantEmail?: string;
  status?: string;
  rejectReason?: string;
}
