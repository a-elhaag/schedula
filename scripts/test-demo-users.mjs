#!/usr/bin/env node

/**
 * scripts/test-demo-users.mjs
 *
 * Utility script to test the app with different demo users
 * Usage: node scripts/test-demo-users.mjs [student|professor|ta|coordinator]
 */

const DEMO_USERS = {
  coordinator: {
    id: "666666666666666666666601",
    email: "coordinator@demo.local",
    role: "coordinator",
  },
  professor: {
    id: "666666666666666666666602",
    email: "professor@demo.local",
    role: "professor",
  },
  ta: {
    id: "666666666666666666666603",
    email: "ta@demo.local",
    role: "ta",
  },
  student: {
    id: "666666666666666666666604",
    email: "student.level1@demo.local",
    role: "student",
  },
};

const role = process.argv[2]?.toLowerCase() || "coordinator";
const user = DEMO_USERS[role];

if (!user) {
  console.error(`❌ Unknown role: ${role}`);
  console.error(`\nAvailable roles: ${Object.keys(DEMO_USERS).join(", ")}`);
  process.exit(1);
}

const baseUrl = "http://localhost:3000";

console.log(`\n🧪 Testing with ${role.toUpperCase()}\n`);
console.log(`📧 Email: ${user.email}`);
console.log(`🆔 User ID: ${user.id}`);
console.log(`👤 Role: ${user.role}\n`);

// Example API requests with headers
const examples = {
  coordinator: {
    description: "Coordinator Setup",
    curl: `curl -i -H "x-user-id: ${user.id}" ${baseUrl}/api/coordinator/setup`,
  },
  professor: {
    description: "Professor Availability",
    curl: `curl -i -H "x-user-id: ${user.id}" ${baseUrl}/api/staff/availability?userId=${user.id}`,
  },
  ta: {
    description: "TA Availability",
    curl: `curl -i -H "x-user-id: ${user.id}" ${baseUrl}/api/staff/availability?userId=${user.id}`,
  },
  student: {
    description: "Student Schedule",
    curl: `curl -i -H "x-user-id: ${user.id}" ${baseUrl}/api/student/schedule?userId=${user.id}`,
  },
};

const example = examples[role];
if (example) {
  console.log(`✨ Example API request:\n`);
  console.log(`   ${example.description}:`);
  console.log(`   ${example.curl}\n`);
}

// Browser links
const browserLinks = {
  coordinator: `${baseUrl}/coordinator/setup`,
  professor: `${baseUrl}/staff/schedule`,
  ta: `${baseUrl}/staff/schedule`,
  student: `${baseUrl}/student/schedule`,
};

const browserLink = browserLinks[role];
if (browserLink) {
  console.log(`🌐 Browser link:`);
  console.log(`   ${browserLink}\n`);
  console.log(`📝 Dev tools: Use x-user-id header to switch users`);
  console.log(`   localStorage: Set BYPASS_AUTH_USER_ID to ${user.id}\n`);
}

console.log(`💡 Tips:`);
console.log(`   • Run seed script: npm run db:seed`);
console.log(`   • Update .env BYPASS_AUTH_USER_ID to: ${user.id}`);
console.log(`   • Or use header in requests: -H "x-user-id: ${user.id}"\n`);
