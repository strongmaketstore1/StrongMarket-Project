import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import { registerUser } from "../auth";

export default function Register() {
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    setError("");
    setLoading(true);

    try {
      await registerUser(
        email.trim(),
        password,
        name.trim(),
      );

      setSuccess(true);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Unable to create account.",
      );
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <main>
        <section>
          <h1>Account created successfully!</h1>

          <p>
            Please verify your email address before signing
            in to CHILVO.
          </p>

          <p>
            We sent a verification email to{" "}
            <strong>{email}</strong>.
          </p>

          <p>
            Check your inbox and click the verification link.
            If you don't see the email, check your spam or
            junk folder.
          </p>

          <Link to="/login">
            <button type="button">
              Continue to Sign In
            </button>
          </Link>
        </section>
      </main>
    );
  }

  return (
    <main>
      <section>
        <h1>Create your account</h1>

        <p>
          Join CHILVO.
        </p>

        <form onSubmit={handleSubmit}>
          <label>
            Name
            <input
              type="text"
              value={name}
              onChange={(event) =>
                setName(event.target.value)
              }
              required
            />
          </label>

          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              required
            />
          </label>

          <label htmlFor="register-password">
            Password
          </label>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
            <input
              id="register-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              minLength={6}
              required
              autoComplete="new-password"
              style={{ flex: 1, minWidth: 0, boxSizing: "border-box" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              style={{
                width: "32px",
                minWidth: "32px",
                height: "32px",
                padding: "0",
                margin: "0",
                background: "none",
                border: "none",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {showPassword ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                  <path d="M9.5 12a2.5 2.5 0 0 0 5 0" />
                  <path d="M3 5l18 14" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>

          {error && (
            <p role="alert">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
          >
            {loading
              ? "Creating account..."
              : "Create Account"}
          </button>
        </form>

        <p>
          Already have an account?{" "}
          <Link to="/login">
            Sign In
          </Link>
        </p>
      </section>
    </main>
  );
}
