import "dotenv/config";
import express from "express";
import axios from "axios";
import cors from "cors";
import admin from "firebase-admin";
import path from "path";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import { randomUUID } from "crypto";
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

// ============================================
// CHILVO MERCHANT EARNINGS LEDGER
// Initial commission: 10%
// ============================================

const CHILVO_COMMISSION_BPS = Number(
  process.env.CHILVO_COMMISSION_BPS ?? 1000
);

if (
  !Number.isInteger(CHILVO_COMMISSION_BPS) ||
  CHILVO_COMMISSION_BPS < 0 ||
  CHILVO_COMMISSION_BPS > 10000
) {
  throw new Error(
    "CHILVO_COMMISSION_BPS must be between 0 and 10000."
  );
}

type VerifiedEarningLine = {
  productId: string;
  merchantId: string;
  price: number;
  quantity: number;
};

async function recordMerchantEarnings(
  orderId: string,
  currency: string,
  verifiedLines: VerifiedEarningLine[]
): Promise<void> {
  if (!orderId || verifiedLines.length === 0) {
    throw new Error(
      "Cannot record earnings without verified products."
    );
  }

  if (currency !== "USD") {
    throw new Error(
      "Merchant earnings currently support USD only."
    );
  }

  const merchantTotals = new Map<
    string,
    {
      grossCents: number;
      productIds: Set<string>;
    }
  >();

  for (const line of verifiedLines) {
    if (
      !line.productId ||
      !line.merchantId ||
      !Number.isFinite(line.price) ||
      line.price <= 0 ||
      !Number.isInteger(line.quantity) ||
      line.quantity < 1
    ) {
      throw new Error(
        "Invalid verified product information."
      );
    }

    const priceCents = Math.round(line.price * 100);
    const lineTotalCents = priceCents * line.quantity;

    if (!Number.isSafeInteger(lineTotalCents)) {
      throw new Error("Product total exceeds the supported amount.");
    }

    const current = merchantTotals.get(line.merchantId) ?? {
      grossCents: 0,
      productIds: new Set<string>(),
    };

    current.grossCents += lineTotalCents;
    current.productIds.add(line.productId);

    if (!Number.isSafeInteger(current.grossCents)) {
      throw new Error("Merchant total exceeds the supported amount.");
    }

    merchantTotals.set(line.merchantId, current);
  }

  for (const [merchantId, totals] of merchantTotals) {
    const commissionCents = Math.round(
      totals.grossCents * CHILVO_COMMISSION_BPS / 10000
    );
    const netEarningsCents = totals.grossCents - commissionCents;
    const earningId = `${encodeURIComponent(orderId)}__${encodeURIComponent(merchantId)}`;
    const earningRef = db.collection("merchantEarnings").doc(earningId);

    await db.runTransaction(async (transaction) => {
      const existing = await transaction.get(earningRef);
      if (existing.exists) {
        return;
      }
      transaction.create(earningRef, {
        orderId,
        merchantId,
        productIds: Array.from(totals.productIds),
        currency: "USD",
        grossSales: totals.grossCents / 100,
        commissionRate: CHILVO_COMMISSION_BPS / 10000,
        commissionAmount: commissionCents / 100,
        netEarnings: netEarningsCents / 100,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    });
  }
}

async function getProductByReference(productReference: string) {
  const directSnapshot = await db.collection("products").doc(productReference).get();
  if (directSnapshot.exists) {
    return directSnapshot;
  }
  const slugSnapshot = await db.collection("products").where("slug", "==", productReference).limit(1).get();
  if (!slugSnapshot.empty) {
    return slugSnapshot.docs[0];
  }
  return null;
}

const ADMIN_UIDS = ["K2XHC9W2xxPcdEkjrtPdBAUjAjy1"];

app.use(
  cors({
    origin: "https://strongmaketstore1.github.io",
  }),
);

app.use(express.json());

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;

if (!PAYSTACK_SECRET_KEY) {
  console.error("❌ PAYSTACK_SECRET_KEY is missing");
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
        console.error("Multer product upload error:", error);
        return res.status(400).json({
          success: false,
          message: error instanceof Error ? error.message : "Unable to process uploaded file.",
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Authentication required." });
      }
      const idToken = authHeader.substring(7);
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      const userSnapshot = await db.collection("users").doc(decodedToken.uid).get();
      if (!userSnapshot.exists) {
        return res.status(403).json({ success: false, message: "User account not found." });
      }
      const userData = userSnapshot.data();
      if (userData?.merchantStatus !== "approved") {
        return res.status(403).json({ success: false, message: "Approved merchant account required." });
      }
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Please select a file." });
      }
      const isImage = req.file.mimetype.startsWith("image/");
      const result = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "strongmarket/products",
            resource_type: isImage ? "image" : "raw",
            type: isImage ? "upload" : "private",
          },
          (error, uploadedResult) => {
            if (error) reject(error);
            else resolve(uploadedResult);
          },
        );
        stream.end(req.file!.buffer);
      });
      let fileReference: string | undefined;
      if (!isImage) {
        fileReference = randomUUID();
        await db.collection("privateProductFiles").doc(fileReference).set({
          cloudinaryPublicId: result.public_id,
          fileName: req.file.originalname,
          merchantId: decodedToken.uid,
          createdAt: new Date().toISOString(),
        });
      }
      return res.json({
        success: true,
        message: isImage ? "Product image uploaded successfully." : "Product file uploaded successfully.",
        ...(fileReference ? { fileReference } : {}),
        fileName: req.file.originalname,
        ...(isImage ? { secureUrl: result.secure_url } : {}),
        resourceType: result.resource_type,
      });
    } catch (error) {
      console.error("Cloudinary product upload error:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unable to upload product file.",
      });
    }
  },
);

// Profile photo upload
app.post(
  "/api/profile/upload",
  (req, res, next) => {
    upload.single("file")(req, res, (error) => {
      if (error) {
        console.error("Multer profile photo upload error:", error);
        return res.status(400).json({
          success: false,
          message: error instanceof Error ? error.message : "Unable to process profile photo.",
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Authentication required." });
      }
      const idToken = authHeader.substring(7);
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Please select a profile photo." });
      }
      if (!req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({ success: false, message: "Profile photo must be an image." });
      }
      const result = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "strongmarket/profile-photos", resource_type: "image", type: "upload" },
          (error, uploadedResult) => {
            if (error) reject(error);
            else resolve(uploadedResult);
          },
        );
        stream.end(req.file!.buffer);
      });
      return res.json({
        success: true,
        message: "Profile photo uploaded successfully.",
        publicId: result.public_id,
        secureUrl: result.secure_url,
        userId: decodedToken.uid,
      });
    } catch (error) {
      console.error("Cloudinary profile photo upload error:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unable to upload profile photo.",
      });
    }
  },
);

// Store logo upload
app.post(
  "/api/store/logo/upload",
  (req, res, next) => {
    upload.single("file")(req, res, (error) => {
      if (error) {
        console.error("Multer store logo upload error:", error);
        return res.status(400).json({
          success: false,
          message: error instanceof Error ? error.message : "Unable to process store logo.",
        });
      }
      next();
    });
  },
  async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ success: false, message: "Authentication required." });
      }
      const idToken = authHeader.substring(7);
      const decodedToken = await adminAuth.verifyIdToken(idToken);
      if (!req.file) {
        return res.status(400).json({ success: false, message: "Please select a store logo." });
      }
      if (!req.file.mimetype.startsWith("image/")) {
        return res.status(400).json({ success: false, message: "Store logo must be an image." });
      }
      const userSnapshot = await db.collection("users").doc(decodedToken.uid).get();
      if (!userSnapshot.exists) {
        return res.status(403).json({ success: false, message: "User account not found." });
      }
      if (userSnapshot.data()?.merchantStatus !== "approved") {
        return res.status(403).json({ success: false, message: "Approved merchant account required." });
      }
      const result = await new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder: "strongmarket/store-logos",
            resource_type: "image",
            type: "upload",
            transformation: [{ width: 400, height: 400, crop: "fill" }],
          },
          (error, uploadedResult) => {
            if (error) reject(error);
            else resolve(uploadedResult);
          },
        );
        stream.end(req.file!.buffer);
      });
      await db.collection("users").doc(decodedToken.uid).update({
        storeLogoUrl: result.secure_url,
      });
      return res.json({
        success: true,
        message: "Store logo uploaded successfully.",
        storeLogoUrl: result.secure_url,
      });
    } catch (error) {
      console.error("Store logo upload error:", error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : "Unable to upload store logo.",
      });
    }
  },
);

// Public merchant profile
app.get("/api/merchants/:merchantId", async (req, res) => {
  try {
    const { merchantId } = req.params;
    if (!merchantId) {
      return res.status(400).json({ success: false, message: "Merchant ID is required." });
    }
    const merchantSnapshot = await db.collection("users").doc(merchantId).get();
    if (!merchantSnapshot.exists) {
      return res.status(404).json({ success: false, message: "Merchant not found." });
    }
    const merchantData = merchantSnapshot.data();
    if (merchantData?.merchantStatus !== "approved") {
      return res.status(404).json({ success: false, message: "Merchant not found." });
    }
    return res.json({
      success: true,
      merchant: {
        name: merchantData?.storeName || merchantData?.name || "CHILVO Merchant",
        storeName: merchantData?.storeName || merchantData?.name || "CHILVO Merchant",
        photoURL: merchantData?.photoURL || "",
        storeLogoUrl: merchantData?.storeLogoUrl || "",
      },
    });
  } catch (error) {
    console.error("Unable to load merchant profile:", error);
    return res.status(500).json({ success: false, message: "Unable to load merchant profile." });
  }
});

// Admin merchant application management
app.get("/api/admin/merchant-applications", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    const idToken = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    if (!ADMIN_UIDS.includes(decodedToken.uid)) {
      return res.status(403).json({ success: false, message: "Admin authorization required." });
    }
    const snapshot = await db.collection("merchantApplications").where("status", "==", "pending").get();
    const applications = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    return res.json({ success: true, applications });
  } catch (error) {
    console.error("Admin merchant applications error:", error);
    return res.status(401).json({ success: false, message: "Unable to authorize admin access." });
  }
});

// Approve merchant application
app.post("/api/admin/merchant-applications/:applicationId/approve", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    const idToken = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    if (!ADMIN_UIDS.includes(decodedToken.uid)) {
      return res.status(403).json({ success: false, message: "Admin authorization required." });
    }
    const { applicationId } = req.params;
    const applicationRef = db.collection("merchantApplications").doc(applicationId);
    const applicationSnapshot = await applicationRef.get();
    if (!applicationSnapshot.exists) {
      return res.status(404).json({ success: false, message: "Merchant application not found." });
    }
    const application = applicationSnapshot.data();
    if (!application?.userId) {
      return res.status(400).json({ success: false, message: "Merchant application has no user ID." });
    }
    await applicationRef.update({ status: "approved", reviewedAt: new Date().toISOString() });
    await db.collection("users").doc(application.userId).update({ merchantStatus: "approved" });
    return res.json({ success: true, message: "Merchant application approved successfully." });
  } catch (error) {
    console.error("Approve merchant application error:", error);
    return res.status(500).json({ success: false, message: "Unable to approve merchant application." });
  }
});

// Admin approve product
app.post("/api/admin/products/:productId/approve", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    const idToken = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    if (!ADMIN_UIDS.includes(decodedToken.uid)) {
      return res.status(403).json({ success: false, message: "Admin authorization required." });
    }
    const { productId } = req.params;
    const productRef = db.collection("products").doc(productId);
    const productSnap = await productRef.get();
    if (!productSnap.exists) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    await productRef.update({ status: "approved", reviewedAt: new Date().toISOString() });
    return res.json({ success: true, message: "Product approved." });
  } catch (e: any) {
    console.error("Approve product error:", e);
    return res.status(500).json({ success: false, message: e.message || "Unable to approve product." });
  }
});

// Admin reject product
app.post("/api/admin/products/:productId/reject", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    const idToken = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    if (!ADMIN_UIDS.includes(decodedToken.uid)) {
      return res.status(403).json({ success: false, message: "Admin authorization required." });
    }
    const { productId } = req.params;
    const { rejectReason } = req.body || {};
    const productRef = db.collection("products").doc(productId);
    const productSnap = await productRef.get();
    if (!productSnap.exists) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    await productRef.update({
      status: "rejected",
      rejectReason: typeof rejectReason === "string" ? rejectReason : "",
      reviewedAt: new Date().toISOString(),
    });
    return res.json({ success: true, message: "Product rejected." });
  } catch (e: any) {
    console.error("Reject product error:", e);
    return res.status(500).json({ success: false, message: e.message || "Unable to reject product." });
  }
});

// Initialize Paystack payment securely
app.post("/api/paystack/initialize", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    const idToken = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { email, reference, callback_url, currency } = req.body || {};
    if (typeof reference !== "string" || !reference.trim() || reference.length > 200) {
      return res.status(400).json({ success: false, message: "A valid order reference is required." });
    }
    if (currency !== "USD") {
      return res.status(400).json({ success: false, message: "CHILVO accepts USD payments only." });
    }
    if (typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ success: false, message: "A valid customer email is required." });
    }
    const allowedCallback = "https://strongmaketstore1.github.io/StrongMarket-Project/order-success";
    if (typeof callback_url !== "string" || callback_url !== allowedCallback) {
      return res.status(400).json({ success: false, message: "Invalid payment callback URL." });
    }
    const orderRef = db.collection("orders").doc(reference);
    const orderSnapshot = await orderRef.get();
    if (!orderSnapshot.exists) {
      return res.status(404).json({ success: false, message: "Checkout order not found." });
    }
    const order = orderSnapshot.data();
    if (!order) {
      return res.status(404).json({ success: false, message: "Checkout order data not found." });
    }
    if (order.customerId !== decodedToken.uid) {
      return res.status(403).json({ success: false, message: "You are not authorized to pay for this order." });
    }
    if (order.status !== "pending" || order.paymentReference !== reference) {
      return res.status(400).json({ success: false, message: "This order is not available for payment." });
    }
    if (
      order.currency !== "USD" ||
      typeof order.customerEmail !== "string" ||
      order.customerEmail.trim().toLowerCase() !== email.trim().toLowerCase()
    ) {
      return res.status(400).json({ success: false, message: "Order currency or customer details do not match." });
    }
    if (!Array.isArray(order.items) || order.items.length === 0) {
      return res.status(400).json({ success: false, message: "This order contains no products." });
    }
    let expectedAmount = 0;
    for (const item of order.items) {
      if (typeof item.productId !== "string" || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
        return res.status(400).json({ success: false, message: "The order contains invalid items." });
      }
      const productSnapshot = await getProductByReference(item.productId);
      if (!productSnapshot || !productSnapshot.exists) {
        return res.status(400).json({ success: false, message: "A product in this order could not be found." });
      }
      const product = productSnapshot.data();
      if (!product || product.currency !== "USD" || typeof product.price !== "number" || !Number.isFinite(product.price) || product.price <= 0) {
        return res.status(400).json({ success: false, message: "A product has an invalid USD price." });
      }
      expectedAmount += product.price * item.quantity;
    }
    if (!Number.isFinite(expectedAmount) || expectedAmount <= 0) {
      return res.status(400).json({ success: false, message: "Unable to calculate a valid order total." });
    }
    const amountInCents = Math.round(expectedAmount * 100);
    const savedSubtotalInCents =
      typeof order.subtotal === "number" && Number.isFinite(order.subtotal) ? Math.round(order.subtotal * 100) : -1;
    if (savedSubtotalInCents !== amountInCents) {
      return res.status(400).json({
        success: false,
        message: "The order total has changed or does not match its products. Please refresh your cart and try again.",
      });
    }
    const response = await axios.post(
      "https://api.paystack.co/transaction/initialize",
      {
        email: order.customerEmail.trim(),
        amount: amountInCents,
        currency: "USD",
        reference,
        callback_url: allowedCallback,
        metadata: { orderId: reference, customerId: decodedToken.uid, currency: "USD" },
      },
      {
        headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`, "Content-Type": "application/json" },
      },
    );
    return res.json(response.data);
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Paystack initialization error:", error.response?.data || error.message);
      return res.status(error.response?.status || 500).json({
        success: false,
        message: error.response?.data?.message || "Payment initialization failed.",
      });
    }
    console.error("Unexpected initialization error:", error);
    return res.status(500).json({ success: false, message: "Payment initialization failed." });
  }
});

// Confirm Paystack payment
app.post("/api/paystack/confirm", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    const idToken = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { reference } = req.body || {};
    if (!reference) {
      return res.status(400).json({ success: false, message: "Transaction reference is required." });
    }
    const orderRef = db.collection("orders").doc(reference);
    const orderSnapshot = await orderRef.get();
    if (!orderSnapshot.exists) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    const order = orderSnapshot.data();
    if (!order) {
      return res.status(404).json({ success: false, message: "Order data not found." });
    }
    if (order.customerId !== decodedToken.uid) {
      return res.status(403).json({ success: false, message: "You are not authorized to confirm this order." });
    }
    const items = Array.isArray(order.items) ? order.items : [];
    if (items.length === 0) {
      return res.status(400).json({ success: false, message: "Order contains no products." });
    }
    const response = await axios.get(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      { headers: { Authorization: `Bearer ${PAYSTACK_SECRET_KEY}` } },
    );
    const transaction = response.data?.data;
    if (!response.data?.status || transaction?.status !== "success") {
      return res.status(400).json({ success: false, message: "Payment has not been successfully verified." });
    }
    let expectedAmount = 0;
    const resolvedItems = [];
    const verifiedEarningLines: VerifiedEarningLine[] = [];
    for (const item of items) {
      if (typeof item.productId !== "string" || !Number.isInteger(item.quantity) || item.quantity <= 0) {
        return res.status(400).json({ success: false, message: "Invalid order items." });
      }
      const productSnapshot = await getProductByReference(item.productId);
      if (!productSnapshot || !productSnapshot.exists) {
        return res.status(400).json({ success: false, message: "A product in this order could not be found." });
      }
      const product = productSnapshot.data();
      if (!product || product.currency !== "USD" || typeof product.price !== "number" || !Number.isFinite(product.price) || product.price <= 0) {
        return res.status(400).json({ success: false, message: "This product is not available for USD checkout." });
      }
      expectedAmount += product.price * item.quantity;
      if (typeof product.merchantId === "string" && product.merchantId.trim() !== "") {
        verifiedEarningLines.push({
          productId: productSnapshot.id,
          merchantId: product.merchantId,
          price: product.price,
          quantity: item.quantity,
        });
      }
      const fileReference = typeof product?.cloudinaryFileRef === "string" ? product.cloudinaryFileRef : "";
      if (fileReference) {
        const privateFile = await db.collection("privateProductFiles").doc(fileReference).get();
        if (!privateFile.exists || privateFile.data()?.merchantId !== product?.merchantId) {
          return res.status(400).json({ success: false, message: "Unable to verify the product file." });
        }
      }
      resolvedItems.push({
        ...item,
        ...(fileReference ? { cloudinaryFileRef: fileReference } : {}),
        ...(typeof product?.cloudinaryPublicId === "string" && product.cloudinaryPublicId ? { cloudinaryPublicId: product.cloudinaryPublicId } : {}),
        ...(typeof product?.fileName === "string" && product.fileName ? { fileName: product.fileName } : {}),
      });
    }
    if (order.currency !== "USD") {
      return res.status(400).json({ success: false, message: "CHILVO accepts USD orders only." });
    }
    const orderCurrency = "USD";
    const expectedPaymentAmount = Math.round(expectedAmount * 100);
    if (transaction.currency !== orderCurrency || transaction.amount !== expectedPaymentAmount) {
      console.error("Payment amount mismatch:", {
        reference,
        expectedPaymentAmount,
        actualAmount: transaction.amount,
        expectedCurrency: orderCurrency,
        actualCurrency: transaction.currency,
      });
      return res.status(400).json({ success: false, message: "Payment amount does not match the order." });
    }
    if (verifiedEarningLines.length > 0) {
      await recordMerchantEarnings(orderRef.id, orderCurrency, verifiedEarningLines);
    }
    await orderRef.update({
      items: resolvedItems,
      status: "paid",
      paymentReference: reference,
      paidAt: new Date().toISOString(),
    });
    return res.json({
      success: true,
      message: "Payment verified and order marked as paid.",
      reference,
      transactionId: transaction.id,
    });
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error("Paystack confirmation error:", error.response?.data || error.message);
      return res.status(error.response?.status || 500).json({
        success: false,
        message: error.response?.data?.message || "Unable to confirm payment.",
      });
    }
    console.error("Unexpected payment confirmation error:", error);
    return res.status(500).json({ success: false, message: "Unable to confirm payment." });
  }
});

// Secure digital product download
app.get("/api/products/:productId/download", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Authentication required." });
    }
    const idToken = authHeader.substring(7);
    const decodedToken = await adminAuth.verifyIdToken(idToken);
    const { productId } = req.params;
    if (ADMIN_UIDS.includes(decodedToken.uid)) {
      const productSnapshotAdmin = await getProductByReference(productId);
      if (!productSnapshotAdmin || !productSnapshotAdmin.exists) {
        return res.status(404).json({ success: false, message: "Product not found." });
      }
      const productAdmin: any = productSnapshotAdmin.data();
      let cloudinaryPublicIdAdmin = "";
      let fileNameAdmin = typeof productAdmin?.fileName === "string" ? productAdmin.fileName : "";
      if (typeof productAdmin?.cloudinaryFileRef === "string" && productAdmin.cloudinaryFileRef) {
        const pf = await db.collection("privateProductFiles").doc(productAdmin.cloudinaryFileRef).get();
        const pd: any = pf.data();
        if (pf.exists && typeof pd?.cloudinaryPublicId === "string") {
          cloudinaryPublicIdAdmin = pd.cloudinaryPublicId;
          if (typeof pd?.fileName === "string") fileNameAdmin = pd.fileName;
        }
      } else if (typeof productAdmin?.cloudinaryPublicId === "string") {
        cloudinaryPublicIdAdmin = productAdmin.cloudinaryPublicId;
      }
      if (!cloudinaryPublicIdAdmin) {
        return res.status(404).json({ success: false, message: "This product does not have a downloadable file yet." });
      }
      const extAdmin = path.extname(fileNameAdmin).replace(".", "").toLowerCase() || "pdf";
      const downloadUrlAdmin = cloudinary.utils.private_download_url(cloudinaryPublicIdAdmin, extAdmin, {
        resource_type: "raw",
        type: "private",
        attachment: true,
        expires_at: Math.floor(Date.now() / 1000) + 300,
      });
      return res.json({ success: true, downloadUrl: downloadUrlAdmin });
    }
    const orderId = typeof req.query.orderId === "string" ? req.query.orderId : "";
    if (!orderId) {
      return res.status(400).json({ success: false, message: "Order ID is required." });
    }
    const orderRef = db.collection("orders").doc(orderId);
    const orderSnapshot = await orderRef.get();
    if (!orderSnapshot.exists) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    const order = orderSnapshot.data();
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found." });
    }
    if (order.customerId !== decodedToken.uid) {
      return res.status(403).json({ success: false, message: "You are not authorized to download this product." });
    }
    if (order.status !== "paid") {
      return res.status(403).json({ success: false, message: "Payment is required before downloading." });
    }
    const purchasedItem = Array.isArray(order.items)
      ? order.items.find((item: { productId?: string }) => item.productId === productId)
      : null;
    if (!purchasedItem) {
      return res.status(403).json({ success: false, message: "This product is not part of your order." });
    }
    const productSnapshot = await getProductByReference(productId);
    if (!productSnapshot || !productSnapshot.exists) {
      return res.status(404).json({ success: false, message: "Product not found." });
    }
    const product = productSnapshot.data();
    let cloudinaryPublicId = "";
    if (typeof purchasedItem.cloudinaryFileRef === "string") {
      const privateFile = await db.collection("privateProductFiles").doc(purchasedItem.cloudinaryFileRef).get();
      const privateData = privateFile.data();
      if (privateFile.exists && privateData?.merchantId === product?.merchantId && typeof privateData.cloudinaryPublicId === "string") {
        cloudinaryPublicId = privateData.cloudinaryPublicId;
      }
    } else if (typeof purchasedItem.cloudinaryPublicId === "string") {
      cloudinaryPublicId = purchasedItem.cloudinaryPublicId;
    }
    if (!cloudinaryPublicId) {
      return res.status(404).json({ success: false, message: "This product does not have a downloadable file yet." });
    }
    const fileName =
      typeof purchasedItem.fileName === "string"
        ? purchasedItem.fileName
        : typeof product?.fileName === "string"
          ? product.fileName
          : "";
    const fileExtension = path.extname(fileName).replace(".", "").toLowerCase() || "pdf";
    const downloadUrl = cloudinary.utils.private_download_url(cloudinaryPublicId, fileExtension, {
      resource_type: "raw",
      type: "private",
      attachment: true,
      expires_at: Math.floor(Date.now() / 1000) + 300,
    });
    return res.json({ success: true, downloadUrl });
  } catch (error) {
    console.error("Secure product download error:", error);
    return res.status(401).json({ success: false, message: "Unable to authorize product download." });
  }
});

// ============================================
// STEP 1 - NEW: GET merchant earnings
// ============================================
app.get("/api/merchant/earnings", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ success: false, message: "Auth required" });
    }
    const decoded = await adminAuth.verifyIdToken(authHeader.substring(7));
    const snap = await db.collection("merchantEarnings").where("merchantId", "==", decoded.uid).get();
    const earnings = snap.docs.map(d => d.data());
    const totalEarned = earnings.reduce((sum, e: any) => sum + Number(e.netEarnings || 0), 0);
    return res.json({ success: true, totalEarned, earnings });
  } catch (e: any) {
    return res.status(500).json({ success: false, message: e.message });
  }
});

// Render provides the PORT environment variable.
// Use 3001 locally if PORT is not provided.
const PORT = Number(process.env.PORT || 3001);

app.listen(PORT, "0.0.0.0", () => {
  console.log(`CHILVO payment server running on port ${PORT}`);
});
