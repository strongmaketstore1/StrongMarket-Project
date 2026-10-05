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
import multer from "multer";

const app = express();

const upload = multer({
  storage: multer.memoryStorage(),
});

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

/**
 * Resolve a product using either:
 * 1. Its Firestore document ID, or
 * 2. Its product slug.
 *
 * This keeps older orders and newer Firebase products
 * compatible with the same backend.
 */
async function getProductByReference(
  productReference: string,
) {
  // First try the Firestore document ID.
  const directSnapshot = await db
    .collection("products")
    .doc(productReference)
    .get();

  if (directSnapshot.exists) {
    return directSnapshot;
  }

  // If no document exists with that ID,
  // try the product slug.
  const slugSnapshot = await db
    .collection("products")
    .where("slug", "==", productReference)
    .limit(1)
    .get();

  if (!slugSnapshot.empty) {
    return slugSnapshot.docs[0];
  }

  return null;
}

const ADMIN_UIDS = [
  "K2XHC9W2xxPcdEkjrtPdBAUjAjy1",
];

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
    message: "CHILVO payment server is running.",
  });
});

// Product file/image upload
app.post(
  "/api/products/upload",
  (req, res, next) => {
    upload.single("file")(req, res, (error) => {
      if (error) {
        console.error(
          "Multer product upload error:",
          error,
        );

        return res.status(400).json({
          success: false,
          message:
            error instanceof Error
              ? error.message
              : "Unable to process uploaded file.",
        });
      }

      next();
    });
  },
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

      const userSnapshot = await db
        .collection("users")
        .doc(decodedToken.uid)
        .get();

      if (!userSnapshot.exists) {
        return res.status(403).json({
          success: false,
          message: "User account not found.",
        });
      }

      const userData = userSnapshot.data();

      if (userData?.merchantStatus !== "approved") {
        return res.status(403).json({
          success: false,
          message:
            "Approved merchant account required.",
        });
      }

      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: "Please select a file.",
        });
      }

      const isImage =
        req.file.mimetype.startsWith("image/");

      const result = await new Promise<any>(
        (resolve, reject) => {
          const stream =
            cloudinary.uploader.upload_stream(
              {
                folder: "strongmarket/products",
                resource_type: isImage
                  ? "image"
                  : "raw",
                type: isImage
                  ? "upload"
                  : "private",
              },
              (error, uploadedResult) => {
                if (error) {
                  reject(error);
                } else {
                  resolve(uploadedResult);
                }
              },
            );

          stream.end(req.file!.buffer);
        },
      );

      return res.json({
        success: true,
        message: isImage
          ? "Product image uploaded successfully."
          : "Product file uploaded successfully.",
        publicId: result.public_id,
        fileName: req.file.originalname,
        secureUrl: result.secure_url,
        resourceType: result.resource_type,
      });
    } catch (error) {
      console.error(
        "Cloudinary product upload error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          error instanceof Error
            ? error.message
            : "Unable to upload product file.",
      });
    }
  },
);
// Admin merchant application management
app.get(
  "/api/admin/merchant-applications",
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

      if (!ADMIN_UIDS.includes(decodedToken.uid)) {
        return res.status(403).json({
          success: false,
          message: "Admin authorization required.",
        });
      }

      const snapshot = await db
        .collection("merchantApplications")
        .where("status", "==", "pending")
        .get();

      const applications = snapshot.docs.map(
        (item) => ({
          id: item.id,
          ...item.data(),
        }),
      );

      return res.json({
        success: true,
        applications,
      });
    } catch (error) {
      console.error(
        "Admin merchant applications error:",
        error,
      );

      return res.status(401).json({
        success: false,
        message:
          "Unable to authorize admin access.",
      });
    }
  },
);

// Approve merchant application
app.post(
  "/api/admin/merchant-applications/:applicationId/approve",
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

      if (!ADMIN_UIDS.includes(decodedToken.uid)) {
        return res.status(403).json({
          success: false,
          message: "Admin authorization required.",
        });
      }

      const { applicationId } = req.params;

      const applicationRef = db
        .collection("merchantApplications")
        .doc(applicationId);

      const applicationSnapshot =
        await applicationRef.get();

      if (!applicationSnapshot.exists) {
        return res.status(404).json({
          success: false,
          message:
            "Merchant application not found.",
        });
      }

      const application =
        applicationSnapshot.data();

      if (!application?.userId) {
        return res.status(400).json({
          success: false,
          message:
            "Merchant application has no user ID.",
        });
      }

      await applicationRef.update({
        status: "approved",
        reviewedAt: new Date().toISOString(),
      });

      await db
        .collection("users")
        .doc(application.userId)
        .update({
          merchantStatus: "approved",
        });

      return res.json({
        success: true,
        message:
          "Merchant application approved successfully.",
      });
    } catch (error) {
      console.error(
        "Approve merchant application error:",
        error,
      );

      return res.status(500).json({
        success: false,
        message:
          "Unable to approve merchant application.",
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
          currency:
            req.body?.currency === "USD"
              ? "USD"
              : "NGN",

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

// Confirm Paystack payment
app.post(
  "/api/paystack/confirm",
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

      const { reference } = req.body || {};

      if (!reference) {
        return res.status(400).json({
          success: false,
          message:
            "Transaction reference is required.",
        });
      }

      // 1. Find the order
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

      const order = orderSnapshot.data();

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order data not found.",
        });
      }

      // 2. Verify order ownership
      if (
        order.customerId !==
        decodedToken.uid
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to confirm this order.",
        });
      }

      const items = Array.isArray(order.items)
        ? order.items
        : [];

      if (items.length === 0) {
        return res.status(400).json({
          success: false,
          message:
            "Order contains no products.",
        });
      }

      // 3. Verify the payment with Paystack
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

      // 4. Recalculate the expected amount
      // using the actual Firestore product.
      //
      // The product may be referenced by either
      // a Firestore document ID or a legacy slug.
      let expectedAmount = 0;

      const resolvedItems = [];

      for (const item of items) {
        if (
          typeof item.productId !== "string" ||
          !Number.isInteger(item.quantity) ||
          item.quantity <= 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid order items.",
          });
        }

        const productSnapshot =
          await getProductByReference(
            item.productId,
          );

        if (
          !productSnapshot ||
          !productSnapshot.exists
        ) {
          return res.status(400).json({
            success: false,
            message:
              "A product in this order could not be found.",
          });
        }

        const product =
          productSnapshot.data();

        if (
          typeof product?.price !== "number" ||
          product.price < 0
        ) {
          return res.status(400).json({
            success: false,
            message:
              "Invalid product price.",
          });
        }

        expectedAmount +=
          product.price * item.quantity;

        // Preserve the original order item while
        // adding the actual downloadable file ID.
        resolvedItems.push({
          ...item,

          ...(typeof product?.cloudinaryPublicId ===
            "string" &&
          product.cloudinaryPublicId
            ? {
                cloudinaryPublicId:
                  product.cloudinaryPublicId,
              }
            : {}),
        });
      }

      const orderCurrency =
        order.currency === "USD"
          ? "USD"
          : "NGN";

      const USD_RATE = 1500;

      const expectedPaymentAmount =
        orderCurrency === "USD"
          ? Math.round(
              (expectedAmount / USD_RATE) * 100,
            )
          : Math.round(
              expectedAmount * 100,
            );

      // 5. Verify currency and amount
      if (
        transaction.currency !==
          orderCurrency ||
        transaction.amount !==
          expectedPaymentAmount
      ) {
        console.error(
          "Payment amount mismatch:",
          {
            reference,
            expectedPaymentAmount,
            actualAmount:
              transaction.amount,
            expectedCurrency:
              orderCurrency,
            actualCurrency:
              transaction.currency,
          },
        );

        return res.status(400).json({
          success: false,
          message:
            "Payment amount does not match the order.",
        });
      }

      // 6. Mark order as paid.
      //
      // Also save the resolved download information
      // so OrderSuccess does not have to guess whether
      // a product has a downloadable file.
      await orderRef.update({
        items: resolvedItems,
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

// Secure digital product download
app.get(
  "/api/products/:productId/download",
  async (req, res) => {
    try {
      const authHeader = req.headers.authorization;

      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({
          success: false,
          message:
            "Authentication required.",
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
          message:
            "Order ID is required.",
        });
      }

      const orderRef =
        db.collection("orders").doc(orderId);

      const orderSnapshot =
        await orderRef.get();

      if (!orderSnapshot.exists) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      const order =
        orderSnapshot.data();

      if (!order) {
        return res.status(404).json({
          success: false,
          message: "Order not found.",
        });
      }

      // Verify that this order belongs to the
      // authenticated customer.
      if (
        order.customerId !==
        decodedToken.uid
      ) {
        return res.status(403).json({
          success: false,
          message:
            "You are not authorized to download this product.",
        });
      }

      // Only paid orders can download products.
      if (order.status !== "paid") {
        return res.status(403).json({
          success: false,
          message:
            "Payment is required before downloading.",
        });
      }

      // Verify that the requested product is
      // actually part of this order.
      const purchasedItem =
        Array.isArray(order.items)
          ? order.items.find(
              (item: {
                productId?: string;
              }) =>
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

      // Resolve the product using either its
      // Firestore ID or its slug.
      const productSnapshot =
        await getProductByReference(
          productId,
        );

      if (
        !productSnapshot ||
        !productSnapshot.exists
      ) {
        return res.status(404).json({
          success: false,
          message:
            "Product not found.",
        });
      }

      const product =
        productSnapshot.data();

      const cloudinaryPublicId =
        typeof product?.cloudinaryPublicId ===
        "string"
          ? product.cloudinaryPublicId
          : "";

      if (!cloudinaryPublicId) {
        return res.status(404).json({
          success: false,
          message:
            "This product does not have a downloadable file yet.",
        });
      }

      const fileName =
        typeof product?.fileName ===
        "string"
          ? product.fileName
          : "";

      const fileExtension =
        path
          .extname(fileName)
          .replace(".", "")
          .toLowerCase() || "pdf";

      // Generate a temporary private download URL.
      const downloadUrl =
        cloudinary.utils.private_download_url(
          cloudinaryPublicId,
          fileExtension,
          {
            resource_type: "raw",
            type: "private",
            attachment: true,
            expires_at:
              Math.floor(
                Date.now() / 1000,
              ) + 300,
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
      `CHILVO payment server running on port ${PORT}`,
    );
  },
);
