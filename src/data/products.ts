import type { Product } from "../types/product";

export const products: Product[] = [
  {
    id: "digital-growth-guide",
    name: "The Digital Growth Guide",
    slug: "digital-growth-guide",
    description:
      "A practical digital guide for building, improving, and growing an online business.",
    shortDescription:
      "A practical guide for building and growing online.",
    price: 15000,
    currency: "NGN",
    category: "ebooks",
    image: "/products/digital-growth-guide.jpg",
    featured: true,
    rating: 4.8,
    reviewCount: 24,
    createdAt: "2026-08-18",
  },
  {
    id: "business-starter-kit",
    name: "Business Starter Kit",
    slug: "business-starter-kit",
    description:
      "A collection of practical resources for planning and launching a new business.",
    shortDescription:
      "Essential resources for launching your next idea.",
    price: 22000,
    currency: "NGN",
    category: "business",
    image: "/products/business-starter-kit.jpg",
    featured: true,
    rating: 4.9,
    reviewCount: 31,
    createdAt: "2026-08-18",
  },
  {
    id: "ai-productivity-toolkit",
    name: "AI Productivity Toolkit",
    slug: "ai-productivity-toolkit",
    description:
      "A collection of AI prompts and productivity workflows designed to help you work smarter.",
    shortDescription:
      "Prompts and workflows designed to save you time.",
    price: 19000,
    currency: "NGN",
    category: "ai-productivity",
    image: "/products/ai-productivity-toolkit.jpg",
    featured: true,
    rating: 4.7,
    reviewCount: 18,
    createdAt: "2026-08-18",
  },
  {
    id: "social-media-template-pack",
    name: "Social Media Template Pack",
    slug: "social-media-template-pack",
    description:
      "A collection of customizable templates for creating consistent social media content.",
    shortDescription:
      "Ready-to-use templates for your social media content.",
    price: 12000,
    currency: "NGN",
    category: "templates",
    image: "/products/social-media-template-pack.jpg",
    featured: false,
    rating: 4.6,
    reviewCount: 15,
    createdAt: "2026-08-18",
  },
];