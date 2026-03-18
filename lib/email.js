import { EmailClient } from "@azure/communication-email";

const connectionString = process.env.ACS_EMAIL_CONNECTION_STRING;
const fromAddress = process.env.ACS_EMAIL_FROM;

export function getBaseUrl(request) {
  if (process.env.APP_BASE_URL) {
    return process.env.APP_BASE_URL;
  }

  const origin = request?.headers?.get("origin");
  if (origin) {
    return origin;
  }

  const host = request?.headers?.get("host");
  const proto = request?.headers?.get("x-forwarded-proto") ?? "http";

  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function sendEmail({ to, subject, html, text }) {
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
