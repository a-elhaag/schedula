"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import Button from "@/components/Button";
import { Input } from "@/components/Input";
import "./styles.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validatePassword(password) {
  const hasUpper = /[A-Z]/.test(password);
  const hasLower = /[a-z]/.test(password);
  const hasNumber = /\d/.test(password);

  if (password.length < 8) {
    return "Password must be at least 8 characters.";
  }

  if (!hasUpper || !hasLower || !hasNumber) {
    return "Password must include uppercase, lowercase, and a number.";
  }

  return "";
}

export default function AcceptInvitePage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = useMemo(
    () => searchParams.get("token")?.trim() ?? "",
    [searchParams],
  );
  const emailFromQuery = useMemo(
    () => searchParams.get("email")?.trim().toLowerCase() ?? "",
    [searchParams],
  );

  const [name, setName] = useState("");
  const [email, setEmail] = useState(emailFromQuery);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState(token ? "idle" : "missing-token");
  const [message, setMessage] = useState("");

  const isSubmitting = status === "submitting";
  const isSuccess = status === "success";
  const isError = status === "error" || status === "missing-token";

  useEffect(() => {
    if (emailFromQuery) {
      setEmail(emailFromQuery);
    }
  }, [emailFromQuery]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (!token) {
      setStatus("missing-token");
      setMessage("This invite link is missing a token.");
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    if (normalizedEmail && !EMAIL_PATTERN.test(normalizedEmail)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    const passwordError = validatePassword(password);
    if (passwordError) {
      setStatus("error");
      setMessage(passwordError);
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
      const response = await fetch("/api/auth/accept-invite", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          token,
          password,
          name: normalizedName,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message ?? "Unable to accept invite right now.");
      }

      setStatus("success");
      setMessage(
        data?.message ?? "Invite accepted. Redirecting to verify email...",
      );
      setPassword("");
      setConfirmPassword("");

      const verificationToken =
        typeof data?.verificationToken === "string"
          ? data.verificationToken
          : "";

      const verifyUrl = verificationToken
        ? `/verify-email?token=${encodeURIComponent(verificationToken)}&email=${encodeURIComponent(normalizedEmail)}`
        : `/verify-email?email=${encodeURIComponent(normalizedEmail)}`;

      setTimeout(() => {
        router.push(verifyUrl);
      }, 800);
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again in a moment.",
      );
    }
  }

  return (
    <div className="page-container">
      <div className="invite-card">
        <h1>Accept Invite</h1>
        <p className="subtitle">
          Set your password to activate your Schedula account.
        </p>

        <form className="invite-form" onSubmit={handleSubmit} noValidate>
          <Input
            id="name"
            label="Full name (optional)"
            type="text"
            autoComplete="name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Your full name"
            disabled={isSubmitting || isSuccess}
          />

          <Input
            id="email"
            label="Email address"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@university.edu"
            disabled={isSubmitting || isSuccess}
          />

          <Input
            id="password"
            label="Password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="At least 8 characters"
            disabled={isSubmitting || isSuccess}
          />

          <Input
            id="confirm-password"
            label="Confirm password"
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Re-enter your password"
            disabled={isSubmitting || isSuccess}
          />

          <p className="password-hint">
            Use at least 8 characters with uppercase, lowercase, and a number.
          </p>

          <Button
            type="submit"
            disabled={isSubmitting || isSuccess}
            className="submit-btn"
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Activating..." : "Activate account"}
          </Button>
        </form>

        {isSuccess ? (
          <p className="feedback success" role="status">
            {message}
          </p>
        ) : null}

        {isError ? (
          <p className="feedback error" role="alert">
            {message || "This invite link is invalid or expired."}
          </p>
        ) : null}

        <p className="back-link">
          Already activated? <Link href="/signin">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
