export type UserRole =
  | "customer"
  | "merchant"
  | "admin";

export type MerchantStatus =
  | "none"
  | "pending"
  | "approved"
  | "rejected";

export interface StoreUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  merchantStatus: MerchantStatus;
  createdAt: string;
}