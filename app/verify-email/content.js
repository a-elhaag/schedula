"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import Button from "@/components/Button";
import "./styles.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();

  const token = useMemo(
    () => searchParams.get("token")?.trim() ?? "",
    [searchParams],
  );
  const emailFromQuery = useMemo(
    () => searchParams.get("email")?.trim().toLowerCase() ?? "",
    [searchParams],
  );

  const [email, setEmail] = useState(emailFromQuery);
  const [verifyStatus, setVerifyStatus] = useState(
    token ? "idle" : "missing-token",
  );
  const [verifyMessage, setVerifyMessage] = useState("");
  const [resendStatus, setResendStatus] = useState("idle");
  const [resendMessage, setResendMessage] = useState("");

  const isVerifying = verifyStatus === "submitting";
  const verifySuccess = verifyStatus === "success";
  const verifyError = verifyStatus === "error";
  const isResending = resendStatus === "submitting";
  const resendSuccess = resendStatus === "success";
  const resendError = resendStatus === "error";

  async function submitVerification() {
    if (!token) {
      setVerifyStatus("missing-token");
      setVerifyMessage(
        "This verification link is missing a token. Please request a new email.",
      );
      return;
    }

    setVerifyStatus("submitting");
    setVerifyMessage("");

    try {
      const response = await fetch("/api/auth/verify-email", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        const errorMsg = data?.message ?? "Unable to verify your email right now.";
        throw new Error(errorMsg);
      }

      setVerifyStatus("success");
      setVerifyMessage(
        data?.message ?? "Email verified successfully. You can now sign in.",
      );
      // Add a redirect to signin after 3 seconds
      setTimeout(() => {
        window.location.href = "/signin";
      }, 3000);
    } catch (error) {
      setVerifyStatus("error");
      setVerifyMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong while verifying your email.",
      );
    }
  }

  useEffect(() => {
    if (token) {
      submitVerification();
    }
    // Runs once on mount with query token.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleResend(event) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setResendStatus("error");
      setResendMessage("Please enter a valid email address.");
      return;
    }

    setResendStatus("submitting");
    setResendMessage("");

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(
          data?.message ?? "Unable to resend verification email right now.",
        );
      }

      setResendStatus("success");
      setResendMessage(
        data?.message ??
          "If an account exists for this email, a new verification link has been sent.",
      );
    } catch (error) {
      setResendStatus("error");
      setResendMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again in a moment.",
      );
    }
  }

  return (
    <div className="page-container">
      <div className="verify-card">
        <h1>Verify Email</h1>
        <p className="subtitle">We are confirming your account email.</p>

        <div className="verify-status">
          {isVerifying ? (
            <p className="feedback neutral">Verifying your email...</p>
          ) : null}
          {verifySuccess ? (
            <p className="feedback success" role="status">
              {verifyMessage}
            </p>
          ) : null}
          {verifyError || verifyStatus === "missing-token" ? (
            <p className="feedback error" role="alert">
              {verifyMessage || "This verification link is invalid or expired."}
            </p>
          ) : null}
        </div>

        <form className="resend-form" onSubmit={handleResend} noValidate>
          <label htmlFor="email" className="field-label">
            Need a new verification email?
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@university.edu"
            disabled={isResending}
            className="email-input"
          />

          <Button
            type="submit"
            disabled={isResending}
            className="submit-btn"
            aria-busy={isResending}
          >
            {isResending ? "Sending..." : "Resend verification email"}
          </Button>
        </form>

        {resendSuccess ? (
          <p className="feedback success" role="status">
            {resendMessage}
          </p>
        ) : null}

        {resendError ? (
          <p className="feedback error" role="alert">
            {resendMessage}
          </p>
        ) : null}

        <p className="back-link">
          Ready to continue? <Link href="/signin">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
