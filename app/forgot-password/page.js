"use client";

import { useState } from "react";
import Link from "next/link";
import Button from "@/components/Button";
import "./styles.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  const isSubmitting = status === "submitting";
  const isSuccess = status === "success";
  const isError = status === "error";

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/auth/forgot-password", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message ?? "Unable to send reset instructions right now.");
      }

      setStatus("success");
      setMessage(
        data?.message ??
          "If an account exists for this email, a password reset link has been sent."
      );
      setEmail("");
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
      <div className="forgot-card">
        <h1>Forgot Password</h1>
        <p className="subtitle">
          Enter your account email and we will send password reset instructions.
        </p>

        <form className="forgot-form" onSubmit={handleSubmit} noValidate>
          <label htmlFor="email" className="field-label">
            Email address
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@university.edu"
            disabled={isSubmitting}
            className="email-input"
          />

          <Button
            type="submit"
            disabled={isSubmitting}
            className="submit-btn"
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Sending..." : "Send reset link"}
          </Button>
        </form>

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
