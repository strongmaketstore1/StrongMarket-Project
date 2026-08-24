import type { Product } from "./product";

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
}

export type OrderStatus =
  | "pending"
  | "paid"
  | "failed"
  | "cancelled";

export interface Order {
  id: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  currency: string;
  status: OrderStatus;
  paymentReference?: string;
  createdAt: string;
}

export function createOrderItems(
  products: {
    product: Product;
    quantity: number;
  }[],
): OrderItem[] {
  return products.map((item) => ({
    productId: item.product.id,
    productName: item.product.name,
    quantity: item.quantity,
    price: item.product.price,
    merchantId: item.product.merchantId,
  }));
}