import "dotenv/config";
import express from "express";
import axios from "axios";
import cors from "cors";
import admin from "firebase-admin";
import path from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import cloudinary from "./cloudinary";
import { readFileSync } from "fs";

const app = express();

const serviceAccount = JSON.parse(
  readFileSync(
    path.join(
      process.env.RENDER
        ? "/etc/secrets"
        : process.cwd(),
      "firebase-service-account.json",
    ),
    "utf8",
  ),
);

const firebaseApp = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(serviceAccount),
    });

const db = getFirestore(firebaseApp);
const adminAuth = getAuth(firebaseApp);

app.use(
  cors({
    origin: "https://strongmaketstore1.github.io",
  }),
);

app.use(express.json());

const PAYSTACK_SECRET_KEY =
  process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
  console.error(
    "❌ PAYSTACK_SECRET_KEY is missing",
  );
  process.exit(1);
}

// Health check
app.get("/api/health", (_req, res) => {
  res.json({
    success: true,
    message:
      "StrongMarketStore payment server is running.",
  });
});

// Authorize Cloudinary product upload
app.post(
  "/api/products/upload",
  async (req, res) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      const idToken = authHeader.substring(7);

      const decodedToken =
        await adminAuth.verifyIdToken(idToken);

      if (!decodedToken.uid) {
        return res.status(403).json({
          success: false,
          message: "Merchant authorization required.",
        });
      }

      return res.json({
        success: true,
        message: "Upload authorization confirmed.",
      });
    } catch (error) {
      console.error(
        "Cloudinary upload authorization error:",
        error,
      );

      return res.status(401).json({
        success: false,
        message: "Unable to authorize upload.",
      });
    }
  },
);

// Initialize Paystack payment
app.post(
  "/api/paystack/initialize",
  async (req, res) => {
    try {
      const {
        email,
        amount,
        reference,
        callback_url,
        metadata,
      } = req.body || {};

      if (!email || !amount) {
        return res.status(400).json({
          success: false,
          message:
            "Email and amount are required.",
        });
      }

      const response = await axios.post(
        "https://api.paystack.co/transaction/initialize",
        {
          email,
          amount,
          currency: "NGN",

          ...(reference
            ? { reference }
            : {}),

          ...(callback_url
            ? { callback_url }
            : {}),

          ...(metadata
            ? { metadata }
            : {}),
        },
        {
          headers: {
            Authorization:
              `Bearer ${PAYSTACK_SECRET_KEY}`,
            "Content-Type":
              "application/json",
          },
        },
      );

      return res.json(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Paystack initialization error:",
          error.response?.data ||
            error.message,
        );

        return res.status(
          error.response?.status || 500,
        ).json({
          success: false,
          message:
            error.response?.data?.message ||
            "Payment initialization failed.",
        });
      }

      console.error(
        "Unexpected initialization error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Payment initialization failed.",
      });
    }
  },
);

// Diagnostic: list recent Paystack transactions
app.get("/api/paystack/transactions", async (_req, res) => {
  try {
    const response = await axios.get(
      "https://api.paystack.co/transaction",
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
        params: {
          perPage: 10,
        },
      },
    );

    return res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(
        "Paystack transaction list error:",
        error.response?.data || error.message,
      );

      return res.status(
  error.response?.status || 500,
).json({
  success: false,
  paystackStatus: error.response?.status,
  paystackResponse: error.response?.data,
  message:
    error.response?.data?.message ||
    "Unable to verify Paystack transaction.",
});
    }

    console.error(
      "Unexpected transaction list error:",
      error,
    );

    return res.status(500).json({
      success: false,
      message:
        "Unable to fetch Paystack transactions.",
    });
  }
});

// Diagnostic: fetch a Paystack transaction by ID
app.get("/api/paystack/transaction/:id", async (req, res) => {
  try {
    const response = await axios.get(
      `https://api.paystack.co/transaction/${encodeURIComponent(
        req.params.id,
      )}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      },
    );

    return res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      return res.status(
        error.response?.status || 500,
      ).json({
        paystackStatus: error.response?.status,
        paystackResponse: error.response?.data,
      });
    }

    return res.status(500).json({
      success: false,
      message: "Unable to fetch transaction.",
    });
  }
});

// Diagnostic: fetch Paystack transaction timeline
app.get(
  "/api/paystack/timeline/:id_or_reference",
  async (req, res) => {
    try {
      const { id_or_reference } = req.params;

      const response = await axios.get(
        `https://api.paystack.co/transaction/timeline/${encodeURIComponent(
          id_or_reference,
        )}`,
        {
          headers: {
            Authorization:
              `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        },
      );

      return res.json(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        return res.status(
          error.response?.status || 500,
        ).json({
          paystackStatus: error.response?.status,
          paystackResponse: error.response?.data,
        });
      }

      return res.status(500).json({
        success: false,
        message:
          "Unable to fetch transaction timeline.",
      });
    }
  },
);

// Verify Paystack payment
app.get(
  "/api/paystack/verify/:reference",
  async (req, res) => {
    try {
      const { reference } = req.params;

      if (!reference) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction reference is required.",
        });
      }

      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(
          reference,
        )}`,
        {
          headers: {
            Authorization:
              `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        },
      );

      return res.json(response.data);
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Paystack verification error:",
          error.response?.data ||
            error.message,
        );

        return res.status(
  error.response?.status || 500,
).json({
  success: false,
  paystackStatus: error.response?.status,
  paystackResponse: error.response?.data,
  message:
    error.response?.data?.message ||
    "Unable to verify Paystack transaction.",
});
      }

      console.error(
        "Unexpected verification error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to verify payment.",
      });
    }
  },
);

app.post(
  "/api/paystack/confirm",
  async (req, res) => {
    try {
      const { reference } = req.body || {};

      if (!reference) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction reference is required.",
        });
      }

      // 1. Verify the payment with Paystack
      const response = await axios.get(
        `https://api.paystack.co/transaction/verify/${encodeURIComponent(
          reference,
        )}`,
        {
          headers: {
            Authorization:
              `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        },
      );  

      const transaction =
        response.data?.data;

      if (
        !response.data?.status ||
        transaction?.status !== "success"
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Payment has not been successfully verified.",
        });
      }

      // 2. Find the order using the payment reference
      const orderRef = db
        .collection("orders")
        .doc(reference);

      const orderSnapshot =
        await orderRef.get();

      if (!orderSnapshot.exists) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      // 3. Mark the order as paid using Firebase Admin
      await orderRef.update({
        status: "paid",
        paymentReference: reference,
        paidAt: new Date().toISOString(),
      });

      return res.json({
        success: true,
        message:
          "Payment verified and order marked as paid.",
        reference,
        transactionId: transaction.id,
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error(
          "Paystack confirmation error:",
          error.response?.data ||
            error.message,
        );

        return res.status(
          error.response?.status || 500,
        ).json({
          success: false,
          message:
            error.response?.data?.message ||
            "Unable to confirm payment.",
        });
      }

      console.error(
        "Unexpected payment confirmation error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to confirm payment.",
      });
    }
  },
);

app.get(
  "/api/products/:productId/download",
  async (req, res) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message: "Authentication required.",
        });
      }

      const idToken = authHeader.substring(7);
      const decodedToken =
        await adminAuth.verifyIdToken(idToken);

      const { productId } = req.params;
      const orderId =
        typeof req.query.orderId === "string"
          ? req.query.orderId
          : "";

      if (!orderId) {
        return res.status(400).json({
          success: false,
          message: "Order ID is required.",
        });
      }

      const orderRef = db.collection("orders").doc(orderId);
      const orderSnapshot = await orderRef.get();

      if (!orderSnapshot.exists) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      const order = orderSnapshot.data();

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      if (order.customerId !== decodedToken.uid) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to download this product.",
        });
      }

      if (order.status !== "paid") {
        return res.status(403).json({
          success: false,
          message:
            "Payment is required before downloading.",
        });
      }

      const purchasedItem = Array.isArray(order.items)
        ? order.items.find(
            (item: { productId?: string }) =>
              item.productId === productId,
          )
        : null;

      if (!purchasedItem) {
        return res.status(403).json({
          success: false,
          message:
            "This product is not part of your order.",
        });
      }

      const cloudinaryPublicId =
  typeof purchasedItem.cloudinaryPublicId === "string"
    ? purchasedItem.cloudinaryPublicId
    : "";

if (!cloudinaryPublicId) {
  return res.status(404).json({
    success: false,
    message:
      "This product does not have a downloadable file yet.",
  });
}

const downloadUrl =
  cloudinary.utils.private_download_url(
    cloudinaryPublicId,
    "pdf",
    {
      resource_type: "raw",
      type: "private",
      attachment: true,
      expires_at:
        Math.floor(Date.now() / 1000) + 300,
    },
  );

return res.json({
  success: true,
  downloadUrl,
});
    } catch (error) {
      console.error(
        "Secure product download error:",
        error,
      );

      return res.status(401).json({
        success: false,
        message:
          "Unable to authorize product download.",
      });
    }
  },
);

// Render provides the PORT environment variable.
// Use 3001 locally if PORT is not provided.
const PORT = Number(
  process.env.PORT || 3001,
);

app.listen(
  PORT,
  "0.0.0.0",
  () => {
    console.log(
      `StrongMarketStore payment server running on port ${PORT}`,
    );
  },
);