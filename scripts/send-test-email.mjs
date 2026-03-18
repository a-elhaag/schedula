import { buildEmailTemplate, sendEmail } from "../lib/email.js";

const to = process.argv[2] || process.env.TEST_EMAIL_TO;
const baseUrl = process.env.APP_BASE_URL || "http://localhost:3000";

if (!to) {
  console.error(
    "Missing recipient. Use: node --env-file=.env scripts/send-test-email.mjs you@example.com",
  );
  process.exit(1);
}

async function main() {
  const template = buildEmailTemplate({
    type: "verify",
    actionUrl: `${baseUrl}/verify-email?token=test-token&email=${encodeURIComponent(to)}`,
  });

  const result = await sendEmail({
    to,
    subject: `[TEST] ${template.subject}`,
    text: template.text,
    html: template.html,
  });

  if (result?.skipped) {
    console.error(
      "Email was not sent. Missing config: ACS_EMAIL_CONNECTION_STRING or ACS_EMAIL_FROM",
    );
    process.exit(1);
  }

  console.log(`Test email sent to ${to}`);
}

main().catch((error) => {
  console.error("Failed to send test email:", error?.message || error);
  process.exit(1);
});
