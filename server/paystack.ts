import "dotenv/config";
import express from "express";
import axios from "axios";
import cors from "cors";

const app = express();

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