"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/Button";
import { Input } from "@/components/Input";
import "./styles.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignInPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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

    if (password.length < 8) {
      setStatus("error");
      setMessage("Password must be at least 8 characters.");
      return;
    }

    setStatus("submitting");
    setMessage("");

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message ?? "Unable to sign in right now.");
      }

      setStatus("success");
      setMessage(data?.message ?? "Signed in successfully. Redirecting...");

      const redirectTo =
        typeof data?.redirectTo === "string" && data.redirectTo.startsWith("/")
          ? data.redirectTo
          : "/coordinator/setup";

      setTimeout(() => {
        router.push(redirectTo);
      }, 350);
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
      <div className="signin-card">
        <h1>Sign In</h1>
        <p className="subtitle">Sign in to your Schedula account.</p>

        <form className="signin-form" onSubmit={handleSubmit} noValidate>
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
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter your password"
            disabled={isSubmitting || isSuccess}
          />

          <p className="actions-row">
            <Link href="/forgot-password">Forgot password?</Link>
          </p>

          <Button
            type="submit"
            disabled={isSubmitting || isSuccess}
            className="submit-btn"
            aria-busy={isSubmitting}
          >
            {isSubmitting ? "Signing in..." : "Sign in"}
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
          New here? <Link href="/signup">Create an account</Link>
        </p>
      </div>
    </div>
  );
}
