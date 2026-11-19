import { useState } from "react";
import type { FormEvent } from "react";

import { auth } from "../firebase";
import { submitMerchantApplication } from "../../service/merchant";

export default function MerchantApply() {
  const [businessName, setBusinessName] = useState("");
  const [businessDescription, setBusinessDescription] =
    useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const user = auth.currentUser;

      if (!user) {
        setMessage(
          "You must be logged in to apply as a merchant.",
        );
        setLoading(false);
        return;
      }

      // NEW: Get email from logged-in account - this is where approval email will go
      const email = user.email || "";

      if (!email) {
        setMessage("Your account has no email. Please update your account email first.");
        setLoading(false);
        return;
      }

      await submitMerchantApplication(
        user.uid,
        businessName,
        businessDescription,
        email, // NEW - 4th param
      );

      setMessage(
        "Application submitted successfully. You will get an email when Admin approves you. Your application is now pending review.",
      );

      setBusinessName("");
      setBusinessDescription("");
    } catch (error) {
      console.error(error);
      setMessage(
        "Something went wrong while submitting your application.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ width: "100%", boxSizing: "border-box", padding: "24px 16px 32px", overflowX: "hidden" }}>
      <h1 style={{ fontSize: "30px", lineHeight: "1.15", margin: "0 0 8px" }}>Become a Merchant</h1>

      <p style={{ fontSize: "15px", lineHeight: "1.5", color: "#555", margin: "0 0 20px" }}>
        Apply to sell your products on CHILVO.
      </p>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px", width: "100%" }}>
        <div style={{ width: "100%" }}>
          <label htmlFor="businessName" style={{ display: "block", fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>
            Business Name
          </label>

          <input
            id="businessName"
            type="text"
            value={businessName}
            onChange={(event) =>
              setBusinessName(event.target.value)
            }
            required
            style={{ width: "100%", boxSizing: "border-box", padding: "14px", fontSize: "16px", borderRadius: "10px", border: "1px solid #d1d5db", outline: "none" }}
          />
        </div>

        <div style={{ width: "100%" }}>
          <label htmlFor="businessDescription" style={{ display: "block", fontSize: "16px", fontWeight: "700", marginBottom: "8px" }}>
            Business Description
          </label>

          <textarea
            id="businessDescription"
            value={businessDescription}
            onChange={(event) =>
              setBusinessDescription(event.target.value)
            }
            required
            rows={5}
            style={{ width: "100%", boxSizing: "border-box", padding: "14px", fontSize: "16px", borderRadius: "10px", border: "1px solid #d1d5db", outline: "none", resize: "vertical" }}
          />
        </div>

        <div style={{ width: "100%", background: "#f9fafb", padding: "12px", borderRadius: "10px", border: "1px solid #e5e7eb" }}>
          <p style={{ fontSize: "14px", margin: 0, color: "#555" }}>
            Approval email will be sent to: <strong>{auth.currentUser?.email || "Your account email"}</strong>
          </p>
        </div>

        <button
          type="submit"
          disabled={loading}
          style={{
            width: "100%",
            background: loading ? "#93c5fd" : "#2563eb",
            color: "#fff",
            border: "none",
            borderRadius: "10px",
            padding: "16px",
            fontSize: "20px",
            fontWeight: "800",
            cursor: loading ? "not-allowed" : "pointer",
            boxSizing: "border-box",
          }}
        >
          {loading
            ? "Submitting..."
            : "Submit Application"}
        </button>
      </form>

      {message && <p style={{ fontSize: "15px", lineHeight: "1.5", marginTop: "16px", padding: "12px", borderRadius: "10px", background: "#eff6ff", color: "#1e40af" }}>{message}</p>}
    </div>
  );
}
