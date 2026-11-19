import { useState } from "react";
import { Link } from "react-router-dom";

const FAQS = [
  {
    question: "What is CHILVO?",
    answer:
      "CHILVO is a digital marketplace for templates, AI prompt packs, and guides designed for modern life and business. No shipping, no waiting - you get instant access after purchase.",
  },
  {
    question: "How do I get my product after I buy?",
    answer:
      "After your payment is confirmed, your product is available instantly in your account. You can download it right away from your Orders / Account page.",
  },
  {
    question: "Do I need an account to buy?",
    answer:
      "Yes, you need a CHILVO account to buy and to access your downloads. Creating an account is free and takes less than a minute.",
  },
  {
    question: "What payment methods do you accept?",
    answer:
      "We accept secure online payment through our checkout. You will see the available payment options at checkout before you pay.",
  },
  {
    question: "Can I get a refund?",
    answer:
      "Because digital products are delivered instantly, refunds are handled on a case-by-case basis. If your file is broken or not as described, please contact us through the support option in your account.",
  },
  {
    question: "How do I become a merchant?",
    answer:
      "Tap Become a Merchant in the menu and fill the application form. Once approved, you can add products, manage orders, and track your earnings from your Merchant Dashboard.",
  },
  {
    question: "How do merchants get paid?",
    answer:
      "Merchants can track sales and earnings in the Merchant Dashboard under Sales and Earnings. Payout details are shown there after approval.",
  },
];

export default function About() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <main style={{ padding: "24px 16px 40px", maxWidth: "700px", margin: "0 auto", boxSizing: "border-box" }}>
      <p style={{ fontSize: "11px", letterSpacing: "1px", color: "#1d4ed8", fontWeight: 700, margin: "0 0 10px" }}>
        ABOUT CHILVO
      </p>
      <h1 style={{ fontSize: "32px", lineHeight: "1.15", margin: "0 0 12px" }}>
        Premium digital products. Simple. Accessible. Instant.
      </h1>
      <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#555" }}>
        CHILVO is a digital marketplace for templates, AI prompt packs, and guides designed for modern life and business. No shipping, no waiting - you get instant access after purchase.
      </p>

      <h2 style={{ fontSize: "20px", margin: "24px 0 8px" }}>What we do</h2>
      <ul style={{ fontSize: "14px", lineHeight: "1.7", color: "#333", paddingLeft: "18px" }}>
        <li><strong>Templates</strong> - Ready-to-use templates for work, content, and projects.</li>
        <li><strong>AI Prompt Packs</strong> - Ready-to-use prompts for smarter, faster workflows.</li>
        <li><strong>Guides</strong> - Practical knowledge for personal and professional growth.</li>
      </ul>

      <h2 style={{ fontSize: "20px", margin: "24px 0 8px" }}>Why CHILVO?</h2>
      <p style={{ fontSize: "14px", lineHeight: "1.6", color: "#555" }}>
        Curated resources. Instant delivery. Secure checkout. And a place for merchants to sell their own digital products.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "24px" }}>
        <Link to="/shop" style={{ background: "#1d4ed8", color: "#fff", padding: "12px 18px", borderRadius: "8px", textDecoration: "none", fontSize: "14px" }}>
          Explore Products
        </Link>
        <Link to="/merchant/apply" style={{ border: "1px solid #ddd", padding: "12px 18px", borderRadius: "8px", textDecoration: "none", fontSize: "14px", color: "#111" }}>
          Become a Merchant
        </Link>
      </div>

      {/* FAQ */}
      <h2 style={{ fontSize: "22px", margin: "32px 0 4px" }}>Frequently Asked Questions</h2>
      <p style={{ fontSize: "13px", color: "#666", margin: "0 0 16px", lineHeight: "1.5" }}>
        Quick answers to the most common questions.
      </p>

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {FAQS.map((faq, index) => {
          const isOpen = openIndex === index;
          return (
            <div key={faq.question} style={{ border: "1px solid #eee", borderRadius: "12px", overflow: "hidden", background: "#fff" }}>
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : index)}
                aria-expanded={isOpen}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: "12px",
                  textAlign: "left",
                  background: "none",
                  border: "none",
                  padding: "16px",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: 700,
                  color: "#111",
                }}
              >
                <span>{faq.question}</span>
                <span style={{ fontSize: "18px", flexShrink: 0, color: "#1d4ed8" }}>
                  {isOpen ? "−" : "+"}
                </span>
              </button>
              {isOpen && (
                <p style={{ margin: 0, padding: "0 16px 16px", fontSize: "14px", lineHeight: "1.6", color: "#555" }}>
                  {faq.answer}
                </p>
              )}
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: "13px", color: "#666", marginTop: "24px" }}>
        © 2026 CHILVO. All rights reserved.
      </p>
    </main>
  );
}
