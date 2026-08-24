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
      const userId = auth.currentUser?.uid;

      if (!userId) {
        setMessage(
          "You must be logged in to apply as a merchant.",
        );
        setLoading(false);
        return;
      }

      await submitMerchantApplication(
        userId,
        businessName,
        businessDescription,
      );

      setMessage(
        "Application submitted successfully. Your application is now pending review.",
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
    <div>
      <h1>Become a Merchant</h1>

      <p>
        Apply to sell your products on StrongMarketStore.
      </p>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="businessName">
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
          />
        </div>

        <div>
          <label htmlFor="businessDescription">
            Business Description
          </label>

          <textarea
            id="businessDescription"
            value={businessDescription}
            onChange={(event) =>
              setBusinessDescription(event.target.value)
            }
            required
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading
            ? "Submitting..."
            : "Submit Application"}
        </button>
      </form>

      {message && <p>{message}</p>}
    </div>
  );
}