import type { Product } from "./types/product";

export interface OrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  merchantId?: string;
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
    merchantId: (
      item.product as Product & {
        merchantId?: string;
      }
    ).merchantId,
  }));
}
const ORDERS_KEY = "strongmarketstore-orders";

export function saveOrder(order: Order): void {
  const existingOrders = getOrders();

  localStorage.setItem(
    ORDERS_KEY,
    JSON.stringify([...existingOrders, order]),
  );
}

export function getOrders(): Order[] {
  try {
    const saved = localStorage.getItem(ORDERS_KEY);

    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

export function getOrderById(
  orderId: string,
): Order | undefined {
  return getOrders().find(
    (order) => order.id === orderId,
  );
}

export function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  paymentReference?: string,
): Order | undefined {
  const orders = getOrders();

  const index = orders.findIndex(
    (order) => order.id === orderId,
  );

  if (index === -1) {
    return undefined;
  }

  const updatedOrder = {
    ...orders[index],
    status,
    ...(paymentReference
      ? { paymentReference }
      : {}),
  };

  orders[index] = updatedOrder;

  localStorage.setItem(
    ORDERS_KEY,
    JSON.stringify(orders),
  );

  return updatedOrder;
}