import { validate } from "email-validator";
import { generateToken } from "@/lib/auth";
import { buildEmailTemplate, getBaseUrl, sendEmail } from "@/lib/email";
import { getDb } from "@/lib/db";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const EMAIL_VERIFY_TTL_HOURS = 24;

export function validateEmail(email) {
  if (typeof email !== "string") {
    return false;
  }

  const trimmedEmail = email.trim().toLowerCase();

  // Use email-validator for RFC 5322 compliance, with regex as fallback
  return validate(trimmedEmail) || EMAIL_PATTERN.test(trimmedEmail);
}

export async function generateEmailVerificationToken(userId) {
  const token = generateToken();
  const expiresAt = new Date(
    Date.now() + EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000,
  );

  const db = await getDb();
  const usersCollection = db.collection("users");

  await usersCollection.updateOne(
    { _id: userId },
    {
      $set: {
        email_verify_token: token,
        email_verify_expires_at: expiresAt,
      },
    },
  );

  return token;
}

export async function sendEmailVerification(email, verifyToken, request) {
  const baseUrl = getBaseUrl(request);
  const verificationLink = `${baseUrl}/verify-email?token=${encodeURIComponent(
    verifyToken,
  )}&email=${encodeURIComponent(email)}`;

  const template = buildEmailTemplate({
    type: "verify",
    actionUrl: verificationLink,
  });

  return sendEmail({
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

export async function generatePasswordResetToken(userId) {
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  const db = await getDb();
  const usersCollection = db.collection("users");

  await usersCollection.updateOne(
    { _id: userId },
    {
      $set: {
        password_reset_token: token,
        password_reset_expires_at: expiresAt,
      },
    },
  );

  return token;
}

export async function sendPasswordResetEmail(email, resetToken, request) {
  const baseUrl = getBaseUrl(request);
  const resetLink = `${baseUrl}/reset-password?token=${encodeURIComponent(
    resetToken,
  )}`;

  const template = buildEmailTemplate({
    type: "reset",
    actionUrl: resetLink,
  });

  return sendEmail({
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

export async function sendInviteEmail(email, inviteToken, request, roleLabel) {
  const baseUrl = getBaseUrl(request);
  const inviteLink = `${baseUrl}/accept-invite?token=${encodeURIComponent(
    inviteToken,
  )}&email=${encodeURIComponent(email)}`;

  const template = buildEmailTemplate({
    type: "invite",
    actionUrl: inviteLink,
    roleLabel,
  });

  return sendEmail({
    to: email,
    subject: template.subject,
    text: template.text,
    html: template.html,
  });
}

export const EMAIL_VERIFY_TTL_MS = EMAIL_VERIFY_TTL_HOURS * 60 * 60 * 1000;
export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
export { EMAIL_PATTERN };
