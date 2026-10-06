import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  updateDoc,
  where,
} from "firebase/firestore";

import { db } from "./firebase";
import type {
  Order,
  OrderItem,
  OrderStatus,
} from "./types/order";

export async function createFirestoreOrder(
  order: Order,
): Promise<string> {
  await setDoc(
    doc(db, "orders", order.id),
    order,
  );

  return order.id;
}

export async function getFirestoreOrder(
  orderId: string,
): Promise<Order | null> {
  const orderSnapshot = await getDoc(
    doc(db, "orders", orderId),
  );

  if (!orderSnapshot.exists()) {
    return null;
  }

  return {
    ...(orderSnapshot.data() as Order),
    id: orderSnapshot.id,
  };
}

export async function getCustomerOrders(
  customerId: string,
): Promise<Order[]> {
  const ordersQuery = query(
    collection(db, "orders"),
    where("customerId", "==", customerId),
  );

  const ordersSnapshot = await getDocs(
    ordersQuery,
  );

  return ordersSnapshot.docs
    .map((orderDocument) => ({
      ...(orderDocument.data() as Order),
      id: orderDocument.id,
    }))
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() -
        new Date(a.createdAt).getTime(),
    );
}

export async function updateFirestoreOrderStatus(
  orderId: string,
  status: OrderStatus,
  paymentReference?: string,
): Promise<void> {
  const updates: Partial<Order> = {
    status,
  };

  if (paymentReference) {
    updates.paymentReference = paymentReference;
  }

  if (status === "paid") {
    updates.paidAt = new Date().toISOString();
  }

  await updateDoc(
    doc(db, "orders", orderId),
    updates,
  );
}

export function getMerchantIds(
  items: OrderItem[],
): string[] {
  return [
    ...new Set(
      items
        .map((item) => item.merchantId)
        .filter(
          (merchantId): merchantId is string =>
            Boolean(merchantId),
        ),
    ),
  ];
}
