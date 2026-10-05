import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";

import { registerUser } from "../auth";

export default function Register() {
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

        <button
          type="button"
          onClick={() => {
            window.location.href = "/login";
          }}
        >
          Continue to Sign In
        </button>
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

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(event.target.value)
              }
              minLength={6}
              required
            />
          </label>

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
