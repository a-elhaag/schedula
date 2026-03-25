/**
 * lib/demo-users.js
 * Demo user configuration for BYPASS_AUTH mode
 *
 * These users are created by running: npm run db:seed
 * ObjectIds: 666666666666666666666601-666666666666666666666607
 */

export const DEMO_USERS = {
  coordinator: {
    id:
      process.env.BYPASS_AUTH_DEMO_ID_COORDINATOR || "666666666666666666666601",
    email: "coordinator@demo.local",
    name: "Demo Coordinator",
    role: "coordinator",
  },
  professor: {
    id: process.env.BYPASS_AUTH_DEMO_ID_PROFESSOR || "666666666666666666666602",
    email: "professor@demo.local",
    name: "Demo Professor",
    role: "professor",
  },
  ta: {
    id: process.env.BYPASS_AUTH_DEMO_ID_TA || "666666666666666666666603",
    email: "ta@demo.local",
    name: "Demo Teaching Assistant",
    role: "ta",
  },
  student_l1: {
    id:
      process.env.BYPASS_AUTH_DEMO_ID_STUDENT_L1 || "666666666666666666666604",
    email: "student.level1@demo.local",
    name: "Demo Student (Level 1)",
    role: "student",
    year_level: "1",
  },
  student_l2: {
    id:
      process.env.BYPASS_AUTH_DEMO_ID_STUDENT_L2 || "666666666666666666666605",
    email: "student.level2@demo.local",
    name: "Demo Student (Level 2)",
    role: "student",
    year_level: "2",
  },
  student_l3: {
    id:
      process.env.BYPASS_AUTH_DEMO_ID_STUDENT_L3 || "666666666666666666666606",
    email: "student.level3@demo.local",
    name: "Demo Student (Level 3)",
    role: "student",
    year_level: "3",
  },
  student_l4: {
    id:
      process.env.BYPASS_AUTH_DEMO_ID_STUDENT_L4 || "666666666666666666666607",
    email: "student.level4@demo.local",
    name: "Demo Student (Level 4)",
    role: "student",
    year_level: "4",
  },
};

/**
 * Get demo user by role
 * @param {string} role - The user role (coordinator, professor, ta, student)
 * @returns {object} Demo user object
 */
export function getDemoUserByRole(role) {
  if (role === "professor" || role === "ta") return DEMO_USERS[role];
  if (role === "student") return DEMO_USERS.student_l1; // Default to L1
  return DEMO_USERS.coordinator; // Default to coordinator
}

/**
 * Get demo user by ID
 * @param {string} id - The user ID
 * @returns {object|null} Demo user object or null
 */
export function getDemoUserById(id) {
  return Object.values(DEMO_USERS).find((user) => user.id === id) || null;
}

export default DEMO_USERS;
