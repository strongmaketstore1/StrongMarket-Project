export type MerchantApplicationStatus =
  | "pending"
  | "approved"
  | "rejected";

export interface MerchantApplication {
  id: string;
  userId: string;
  businessName: string;
  businessDescription: string;
  status: MerchantApplicationStatus;
  createdAt: string;
  reviewedAt?: string;
}