import { useState } from "react";
import type { FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { loginUser, resetPassword, resendVerificationEmail } from "../auth";

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setLoading(true);
    try {
      await loginUser(email.trim(), password);
      navigate("/");
    } catch (error) {
      const errorCode = typeof error === "object" && error !== null && "code" in error ? String(error.code) : "";
      if (errorCode === "auth/invalid-credential" || errorCode === "auth/wrong-password" || errorCode === "auth/user-not-found") {
        setError("Invalid email or password. Please check your login details and try again.");
      } else if (errorCode === "auth/too-many-requests") {
        setError("Too many sign-in attempts. Please wait a while and try again.");
      } else if (errorCode === "auth/network-request-failed") {
        setError("Connection problem. Please check your internet and try again.");
      } else {
        setError("Unable to sign in. Please check your details and try again.");
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword() {
    setError("");
    setMessage("");
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      setError("Enter your email address first.");
      return;
    }
    setResetLoading(true);
    try {
      await resetPassword(trimmedEmail);
      setMessage("Password reset email sent. Check your inbox.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to send password reset email.");
    } finally {
      setResetLoading(false);
    }
  }

  async function handleResendVerification() {
    setError("");
    setMessage("");
    const trimmedEmail = email.trim();
    if (!trimmedEmail || !password) {
      setError("Enter your email address and password first.");
      return;
    }
    setResetLoading(true);
    try {
      await resendVerificationEmail(trimmedEmail, password);
      setMessage("Verification email sent. Check your inbox and spam or junk folder.");
    } catch (error) {
      setError(error instanceof Error ? error.message : "Unable to send verification email.");
    } finally {
      setResetLoading(false);
    }
  }

  return (
    <main>
      <section>
        <h1>Welcome back</h1>
        <p>Sign in to your CHILVO account.</p>
        <form onSubmit={handleSubmit}>
          <label>
            Email
            <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>

          <label>
            Password
            <div style={{ position: "relative", width: "100%" }}>
              <input
                id="login-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="current-password"
                style={{ width: "100%", paddingRight: "42px", boxSizing: "border-box", display: "block" }}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? "Hide password" : "Show password"} className="password-eye-btn" style={{ position: "absolute", right: "10px", top: "50%", transform: "translateY(-50%)", width: "32px", height: "32px", minWidth: "32px", padding: "0", margin: "0", background: "transparent", border: "none", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
                {showPassword ? (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><path d="M9.5 12a2.5 2.5 0 0 0 5 0" /><path d="M3 5l18 14" /></svg>
                ) : (
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6b7280" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></svg>
                )}
              </button>
            </div>
          </label>

          <p><button type="button" onClick={handleForgotPassword} disabled={resetLoading}>{resetLoading ? "Sending..." : "Forgot password?"}</button></p>
          <p><button type="button" onClick={handleResendVerification} disabled={resetLoading}>{resetLoading ? "Sending..." : "Resend verification email"}</button></p>
          {error && <p role="alert">{error}</p>}
          {message && <p role="status">{message}</p>}
          <button type="submit" disabled={loading}>{loading ? "Signing in..." : "Sign In"}</button>
        </form>
        <p>Don&apos;t have an account? <Link to="/register">Create one</Link></p>
      </section>
    </main>
  );
}
