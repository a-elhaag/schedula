/**
 * lib/demo-users.js
 * Dev user identity used when DEV_MODE=true.
 * Set DEV_USER_* in .env to match a real user in the database.
 */

export const DEV_USER = {
  id: process.env.DEV_USER_ID || "000000000000000000000001",
  email: process.env.DEV_USER_EMAIL || "dev@schedula.local",
  role: process.env.DEV_USER_ROLE || "coordinator",
  institutionId: process.env.DEV_INSTITUTION_ID || "",
};

export default DEV_USER;
