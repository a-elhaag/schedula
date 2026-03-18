"use client";

import { useMemo, useState } from "react";
import Button from "@/components/Button";
import { Input } from "@/components/Input";
import Select from "@/components/Select";
import "./styles.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const ROLE_OPTIONS = [
  { label: "Professor", value: "professor" },
  { label: "Teaching Assistant", value: "ta" },
  { label: "Student", value: "student" },
];

export default function CoordinatorUsersPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("professor");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");
  const [inviteLink, setInviteLink] = useState("");

  const isSubmitting = status === "submitting";
  const isSuccess = status === "success";
  const isError = status === "error";

  const displayRole = useMemo(() => {
    const selected = ROLE_OPTIONS.find((option) => option.value === role);
    return selected ? selected.label : "User";
  }, [role]);

  async function handleSubmit(event) {
    event.preventDefault();

    const normalizedEmail = email.trim().toLowerCase();
    const normalizedName = name.trim();

    if (!EMAIL_PATTERN.test(normalizedEmail)) {
      setStatus("error");
      setMessage("Please enter a valid email address.");
      return;
    }

    if (!role) {
      setStatus("error");
      setMessage("Please choose a role.");
      return;
    }

    setStatus("submitting");
    setMessage("");
    setInviteLink("");

    try {
      const response = await fetch("/api/auth/invite", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: normalizedName,
          email: normalizedEmail,
          role,
        }),
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message ?? "Unable to create invite right now.");
      }

      if (typeof window !== "undefined" && data?.inviteToken) {
        setInviteLink(
          `${window.location.origin}/accept-invite?token=${encodeURIComponent(
            data.inviteToken,
          )}&email=${encodeURIComponent(normalizedEmail)}`,
        );
      }

      setStatus("success");
      setMessage(
        data?.message ?? `${displayRole} invite created successfully.`,
      );
      setName("");
      setEmail("");
    } catch (error) {
      setStatus("error");
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again in a moment.",
      );
    }
  }

  async function handleCopyLink() {
    if (!inviteLink) return;

    try {
      await navigator.clipboard.writeText(inviteLink);
      setMessage("Invite link copied to clipboard.");
      setStatus("success");
    } catch {
      setStatus("error");
      setMessage("Unable to copy the invite link. Please copy it manually.");
    }
  }

  return (
    <div className="page-container">
      <div className="invite-shell">
        <header className="invite-header">
          <p className="eyebrow">Coordinator Workspace</p>
          <h1>Invite Staff & Students</h1>
          <p className="subtitle">
            Create secure invite links for professors, teaching assistants, and
            students. Invited users will set their password and verify email on
            first access.
          </p>
        </header>

        <div className="invite-card">
          <form className="invite-form" onSubmit={handleSubmit} noValidate>
            <div className="field-group">
              <Input
                id="name"
                label="Full name (optional)"
                type="text"
                autoComplete="name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Jane Doe"
                disabled={isSubmitting}
              />
            </div>

            <div className="field-group">
              <Input
                id="email"
                label="Email address"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="name@university.edu"
                disabled={isSubmitting}
                required
              />
            </div>

            <Select
              label="Role"
              options={ROLE_OPTIONS}
              value={role}
              onChange={setRole}
              disabled={isSubmitting}
            />

            <Button
              type="submit"
              disabled={isSubmitting}
              className="submit-btn"
              aria-busy={isSubmitting}
            >
              {isSubmitting ? "Creating invite..." : "Create invite"}
            </Button>
          </form>

          {inviteLink ? (
            <div className="invite-link">
              <p className="link-label">Invite link</p>
              <div className="link-row">
                <input value={inviteLink} readOnly aria-label="Invite link" />
                <Button
                  type="button"
                  variant="secondary"
                  onClick={handleCopyLink}
                >
                  Copy
                </Button>
              </div>
            </div>
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
        </div>
      </div>
    </div>
  );
}
