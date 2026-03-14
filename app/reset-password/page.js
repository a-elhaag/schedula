"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import "./styles.css";

const PASSWORD_MIN_LENGTH = 8;

function validatePassword(password) {
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (password.length < PASSWORD_MIN_LENGTH) {
    return "Password must be at least 8 characters.";
  }

  if (!hasUpper || !hasLower || !hasNumber) {
    return "Password must include uppercase, lowercase, and a number.";
  }

  return "";
}

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = useMemo(() => searchParams.get("token")?.trim() ?? "", [searchParams]);

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const isSubmitting = status === "submitting";
  const isSuccess = status === "success";
  const isError = status === "error";
  const isTokenMissing = token.length === 0;

  async function handleSubmit(event) {
    event.preventDefault();

    if (isTokenMissing) {
      setStatus("error");
      setMessage("Reset link is invalid or incomplete. Please request a new one.");
      return;
    }

    const passwordIssue = validatePassword(password);
    if (passwordIssue) {
      setStatus("error");
      setMessage(passwordIssue);
      return;
    }

    if (password !== confirmPassword) {
      setStatus("error");
      setMessage("Passwords do not match.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message ?? "Unable to reset password right now.");
      }

      setStatus("success");
      setMessage(data?.message ?? "Password updated successfully. You can sign in now.");
      setPassword("");
      setConfirmPassword("");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again in a moment."
      );
    }
  }

  return (
    <div className="page-container">
      <div className="reset-card">
        <h1>Reset Password</h1>
        <p className="subtitle">Choose a new secure password for your account.</p>

        <form className="reset-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="password" className="field-label">
            New password
          </label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            disabled={isSubmitting || isTokenMissing || isSuccess}
            className="password-input"
          />

          <label htmlFor="confirm-password" className="field-label">
            Confirm password
          </label>
          <input
            id="confirm-password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Re-enter your password"
            disabled={isSubmitting || isTokenMissing || isSuccess}
            className="password-input"
          />

          <p className="password-hint">
            Use at least 8 characters with uppercase, lowercase, and a number.
          </p>

          <Button
            type="submit"
            disabled={isSubmitting || isTokenMissing || isSuccess}
            className="submit-btn"
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Updating..." : "Update password"}
          </Button>
        </form>

        {isTokenMissing ? (
          <p className="feedback error" role="alert">
            This reset link is missing a token. Please request a new password reset email.
          </p>
        ) : null}

        {isSuccess ? (
          <p className="feedback success" role="status">
            {message}
          </p>
        ) : null}

        {isError ? (
          <p className="feedback error" role="alert">
            {message}
          </p>
        ) : null}

        <p className="back-link">
          Remembered your password? <Link href="/signin">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
