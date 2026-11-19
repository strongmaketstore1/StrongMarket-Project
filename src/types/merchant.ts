export type MerchantApplicationStatus =
  | "pending"
  | "approved"
  | "rejected";

export type MerchantApplication = {
  id: string;
  userId: string;
  businessName: string;
  businessDescription: string;
  email: string;
  status: string;
  createdAt: string;
};
