import { EmailClient } from "@azure/communication-email";

const BRAND = {
  name: "Schedula",
  primary: "#0B4F8A",
  accent: "#0071E3",
  background: "#F5F7FB",
  text: "#1D2433",
  muted: "#5C677A",
  border: "#E3E8F0",
};

export function getBaseUrl(request) {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL;
  }

  // Support deployments behind reverse proxies and managed hosts.
  const forwardedHost = request?.headers?.get("x-forwarded-host");
  const forwardedProto = request?.headers?.get("x-forwarded-proto");
  if (forwardedHost) {
    return `${forwardedProto ?? "https"}://${forwardedHost}`;
  }

  const origin = request?.headers?.get("origin");
  if (origin) {
    return origin;
  }

  // Vercel/managed-host fallback when request headers are limited.
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL}`;
  }

  const host = request?.headers?.get("host");
  const proto = request?.headers?.get("x-forwarded-proto") ?? "http";

  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function sendEmail({ to, subject, html, text }) {
  // Read at call time so jest.setup.js can override env vars before tests run
  const connectionString = process.env.ACS_EMAIL_CONNECTION_STRING;
  const fromAddress      = process.env.ACS_EMAIL_FROM;

  if (!connectionString || !fromAddress) {
    return { skipped: true, reason: "missing_config" };
  }

  const client = new EmailClient(connectionString);
  const poller = await client.beginSend({
    senderAddress: fromAddress,
    content: {
      subject,
      html,
      plainText: text,
    },
    recipients: {
      to: [{ address: to }],
    },
  });

  await poller.pollUntilDone();

  return { skipped: false };
}

function buildShell({ title, body, actionUrl, actionText, preheader }) {
  const safePreheader = preheader ? `${preheader}` : "";
  return {
    html: `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0; padding:0; background:${BRAND.background}; font-family: 'Segoe UI', Arial, sans-serif; color:${BRAND.text};">
    <span style="display:none; visibility:hidden; opacity:0; color:transparent; height:0; width:0;">
      ${safePreheader}
    </span>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BRAND.background}; padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px; background:#fff; border:1px solid ${BRAND.border}; border-radius:18px; overflow:hidden;">
            <tr>
              <td style="padding:24px 28px; background:${BRAND.primary}; color:#fff;">
                <h1 style="margin:0; font-size:20px; letter-spacing:0.2px;">${BRAND.name}</h1>
              </td>
            </tr>
            <tr>
              <td style="padding:28px;">
                <h2 style="margin:0 0 12px; font-size:22px; color:${BRAND.text};">${title}</h2>
                <div style="font-size:15px; line-height:1.6; color:${BRAND.muted};">${body}</div>
                <div style="margin:24px 0;">
                  <a href="${actionUrl}" style="display:inline-block; padding:12px 20px; background:${BRAND.accent}; color:#fff; text-decoration:none; border-radius:10px; font-weight:600;">
                    ${actionText}
                  </a>
                </div>
                <p style="margin:0; font-size:13px; color:${BRAND.muted};">If the button doesn’t work, copy and paste this link:</p>
                <p style="margin:8px 0 0; font-size:13px; color:${BRAND.accent}; word-break:break-all;">${actionUrl}</p>
              </td>
            </tr>
            <tr>
              <td style="padding:18px 28px; background:#F8FAFD; font-size:12px; color:${BRAND.muted}; border-top:1px solid ${BRAND.border};">
                ${BRAND.name} • Scheduling made simple
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
  };
}

export function buildEmailTemplate({
  type,
  actionUrl,
  inviterName,
  roleLabel,
}) {
  const roleText = roleLabel ? ` as a ${roleLabel}` : "";

  switch (type) {
    case "invite": {
      const title = "You are invited to Schedula";
      const body = `<p>You have been invited${roleText}.</p><p>Set your password to activate your account and start scheduling.</p>`;
      return {
        subject: "Your Schedula invite",
        text: `You have been invited${roleText}. Activate your account: ${actionUrl}`,
        ...buildShell({
          title,
          body,
          actionUrl,
          actionText: "Accept invite",
          preheader: "Activate your Schedula account",
        }),
      };
    }
    case "reset": {
      const title = "Reset your password";
      const body = `<p>We received a request to reset your Schedula password.</p><p>If this wasn’t you, you can ignore this email.</p>`;
      return {
        subject: "Reset your Schedula password",
        text: `Reset your Schedula password: ${actionUrl}`,
        ...buildShell({
          title,
          body,
          actionUrl,
          actionText: "Reset password",
          preheader: "Reset your Schedula password",
        }),
      };
    }
    default: {
      const title = "Verify your email";
      const body = `<p>Please verify your email to activate your Schedula account.</p><p>This keeps your account secure and ready for scheduling.</p>`;
      return {
        subject: "Verify your Schedula email",
        text: `Verify your email to activate your Schedula account: ${actionUrl}`,
        ...buildShell({
          title,
          body,
          actionUrl,
          actionText: "Verify email",
          preheader: "Verify your Schedula account",
        }),
      };
    }
  }
}
