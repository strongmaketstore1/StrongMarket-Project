export interface PaystackPaymentData {
  email: string;
  amount: number;
  reference?: string;
  callback_url?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  metadata?: Record<string, unknown>;
}

export interface PaystackSuccessResponse {
  reference: string;
  message: string;
  transactionId?: string;
}

interface PaystackInitializeResponse {
  status: boolean;
  message: string;
  data?: {
    authorization_url?: string;
    access_code?: string;
    reference?: string;
  };
}

export async function startPaystackPayment(
  data: PaystackPaymentData,
  _publicKey: string,
  onSuccess: (response: PaystackSuccessResponse) => void,
  onCancel?: () => void,
  onError?: (error: Error) => void,
) {
  try {
    if (!data.email) {
      throw new Error("Email address is required.");
    }

    if (!data.amount || data.amount <= 0) {
      throw new Error(
        "A valid payment amount is required.",
      );
    }

    const response = await fetch(
  "https://strongmarket-payment-server.onrender.com/api/paystack/initialize",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: data.email,
          amount: data.amount,
          reference: data.reference,
          callback_url: data.callback_url,
          metadata: data.metadata,
        }),
      },
    );

    const responseText = await response.text();

    if (!responseText.trim()) {
      throw new Error(
        `Paystack server returned an empty response (HTTP ${response.status}).`,
      );
    }

    let result: PaystackInitializeResponse;

    try {
      result =
        JSON.parse(
          responseText,
        ) as PaystackInitializeResponse;
    } catch {
      throw new Error(
        `Paystack server returned an invalid response (HTTP ${response.status}).`,
      );
    }

    if (!response.ok || !result.status) {
      throw new Error(
        result.message ||
          "Unable to initialize Paystack payment.",
      );
    }

    const authorizationUrl =
      result.data?.authorization_url;

    if (!authorizationUrl) {
      throw new Error(
        "Paystack did not return a payment URL.",
      );
    }

    window.location.href =
      authorizationUrl;

    if (result.data?.reference) {
      onSuccess({
        reference:
          result.data.reference,
        message: result.message,
      });
    }
  } catch (error) {
    const paymentError =
      error instanceof Error
        ? error
        : new Error(
            "Unable to initialize payment.",
          );

    onError?.(paymentError);
  }

  return onCancel;
}