declare module "@paystack/inline-js" {
  interface PaystackTransaction {
    reference: string;
    message: string;
    id?: string | number;
    transaction?: string;
    trans?: string;
    trxref?: string;
  }

  interface PaystackError {
    message: string;
  }

  interface PaystackTransactionOptions {
    key: string;
    email: string;
    amount: number;
    currency?: string;
    reference?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    metadata?: Record<string, unknown>;

    onSuccess?: (transaction: PaystackTransaction) => void;
    onCancel?: () => void;
    onError?: (error: PaystackError) => void;
  }

  interface PaystackResumeCallbacks {
    onSuccess?: (transaction: PaystackTransaction) => void;
    onCancel?: () => void;
    onError?: (error: PaystackError) => void;
  }

  export default class Paystack {
    newTransaction(
      options: PaystackTransactionOptions,
    ): void;

    resumeTransaction(
      accessCode: string,
      callbacks?: PaystackResumeCallbacks,
    ): void;
  }
}