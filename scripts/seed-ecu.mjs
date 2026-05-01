/**
 * scripts/seed-ecu.mjs
 *
 * Seeds the Schedula DB with real ECU Spring-2026 data:
 *  1. Institution (ECU SET dept) — upsert
 *  2. All staff (professors + TAs) — auto-verified, joinable immediately
 *  3. All courses (L0-L4) with new flat schema
 *  4. Staff → course assignments (professor_id, ta_ids)
 *  5. Staff availability (days derived from their schedule)
 *  6. Levels config (groups/subgroups) stored in settings collection
 *
 * Run: node --env-file=.env scripts/seed-ecu.mjs
 */

import { client, DB_NAME } from "./db/client.mjs";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";

// ─── Institution ──────────────────────────────────────────────────────────────

const INSTITUTION_SLUG = "ecu-set";

// ─── Staff (name → email mapping from staff.csv) ─────────────────────────────

const STAFF = [
  // Professors
  { name: "Mohammad Ismail",       email: "mohammad.ismail@ecu.edu",       role: "professor", dept: "SET"  },
  { name: "Mohammad Meiad",        email: "mohammad.meiad@ecu.edu",        role: "professor", dept: "SET"  },
  { name: "Fatima Saqr",           email: "fatima.saqr@ecu.edu",           role: "professor", dept: "SET"  },
  { name: "Doaa Mabrouk",          email: "doaa.mabrouk@ecu.edu",          role: "professor", dept: "SET"  },
  { name: "Sherry Ali",            email: "sherry.ali@ecu.edu",            role: "professor", dept: "SET"  },
  { name: "Hisham Reda",           email: "hisham.reda@ecu.edu",           role: "professor", dept: "SET"  },
  { name: "Eslam Mohammad",        email: "eslam.mohammad@ecu.edu",        role: "professor", dept: "SET"  },
  { name: "Sabah Saad",            email: "sabah.saad@ecu.edu",            role: "professor", dept: "SET"  },
  { name: "Myar Ali",              email: "meyar.ali@ecu.edu",             role: "professor", dept: "SET"  },
  { name: "Sulaiman Mabrouk",      email: "sulaiman.mabrouk@ecu.edu",      role: "professor", dept: "SET"  },
  { name: "Ahmed Othman",          email: "ahmed.othman@ecu.edu",          role: "professor", dept: "SET"  },
  { name: "Mostafa Abdelsalam",    email: "mostafa.abdelslam@ecu.edu",     role: "professor", dept: "SET"  },
  { name: "Qadry",                 email: "qadry@ecu.edu",                 role: "professor", dept: "SET"  },
  { name: "Lamia",                 email: "lamia@ecu.edu",                 role: "professor", dept: "SET"  },
  { name: "Emad Abdelhafeez",      email: "emad.abdelhafeez@ecu.edu",      role: "professor", dept: "PHM" },
  { name: "Mohammad El-Sayed",     email: "mohammad.elsayed@ecu.edu",      role: "professor", dept: "PHM" },
  { name: "Mohammad Tayseer",      email: "mohammad.tayseer@ecu.edu",      role: "professor", dept: "PHM" },
  { name: "Hussein El-Sayed",      email: "hussein.elsayed@ecu.edu",       role: "professor", dept: "PHM" },
  { name: "Ihab Nasir",            email: "ihab.nasir@ecu.edu",            role: "professor", dept: "MCE" },
  { name: "Mohammad Abdelrahman",  email: "mohammad.abdelrahman@ecu.edu",  role: "professor", dept: "MCE" },
  // TAs
  { name: "Yara Mahmoud",          email: "yara.mahmoud@ecu.edu",          role: "ta", dept: "SET" },
  { name: "Asmaa El-Baghdadi",     email: "asmaa.elbaghdadi@ecu.edu",      role: "ta", dept: "SET" },
  { name: "Norhan Mamdouh",        email: "norhan.mamdouh@ecu.edu",        role: "ta", dept: "SET" },
  { name: "Rim Walid",             email: "rim.walid@ecu.edu",             role: "ta", dept: "SET" },
  { name: "Fadi Romani",           email: "fadi.romani@ecu.edu",           role: "ta", dept: "SET" },
  { name: "Mohammad Tarek",        email: "mohammad.tarek@ecu.edu",        role: "ta", dept: "SET" },
  { name: "Tahia Ahmed",           email: "tahia.ahmed@ecu.edu",           role: "ta", dept: "SET" },
  { name: "Doaa Amin",             email: "doaa.amin@ecu.edu",             role: "ta", dept: "SET" },
  { name: "Ahmed Samir",           email: "ahmed.samir@ecu.edu",           role: "ta", dept: "SET" },
  { name: "Hajar Rabie",           email: "hajar.rabie@ecu.edu",           role: "ta", dept: "SET" },
  { name: "Meyada Alaa",           email: "meyada.alaa@ecu.edu",           role: "ta", dept: "SET" },
  { name: "Abdelrahman Jaber",     email: "abdelrahman.jaber@ecu.edu",     role: "ta", dept: "SET" },
  { name: "Mohammad Khattab",      email: "mohammad.khattab@ecu.edu",      role: "ta", dept: "SET" },
  { name: "Hussein Mohammad",      email: "hussein.mohammad@ecu.edu",      role: "ta", dept: "SET" },
  { name: "Kirollos Samy",         email: "kirollos.samy@ecu.edu",         role: "ta", dept: "SET" },
  { name: "Mohammad Hani",         email: "mohammad.hani@ecu.edu",         role: "ta", dept: "SET" },
  { name: "Rawan Sultan",          email: "rawan.sultan@ecu.edu",          role: "ta", dept: "PHM" },
  { name: "Peter Talaat",          email: "peter.talaat@ecu.edu",          role: "ta", dept: "PHM" },
  { name: "Yomna Basem",           email: "yomna.basem@ecu.edu",           role: "ta", dept: "PHM" },
  { name: "Ahmed Tamer",           email: "ahmed.tamer@ecu.edu",           role: "ta", dept: "PHM" },
  { name: "Nada Awad",             email: "nada.awad@ecu.edu",             role: "ta", dept: "PHM" },
  { name: "Noha Khalaf",           email: "noha.khalaf@ecu.edu",           role: "ta", dept: "PHM" },
  { name: "Dina Zaki",             email: "dina.zaki@ecu.edu",             role: "ta", dept: "PHM" },
  { name: "Nada Omar",             email: "nada.omar@ecu.edu",             role: "ta", dept: "PHM" },
  { name: "Noha Hussein",          email: "noha.hussein@ecu.edu",          role: "ta", dept: "PHM" },
  { name: "Nada Ayman",            email: "nada.ayman@ecu.edu",            role: "ta", dept: "PHM" },
  { name: "Omar Mohammad",         email: "omar.mohammad@ecu.edu",         role: "ta", dept: "PHM" },
  { name: "Janna Medhat",          email: "janna.medhat@ecu.edu",          role: "ta", dept: "PHM" },
  { name: "Hajar Ahmed",           email: "hajar.ahmed@ecu.edu",           role: "ta", dept: "PHM" },
  { name: "Mona Ahmed",            email: "mona.ahmed@ecu.edu",            role: "ta", dept: "PHM" },
  { name: "Fironya Medhat",        email: "fironya.medhat@ecu.edu",        role: "ta", dept: "PHM" },
  { name: "Mona Saleh",            email: "mona.saleh@ecu.edu",            role: "ta", dept: "PHM" },
  { name: "Ashraf Mohammad",       email: "ashraf.mohammad@ecu.edu",       role: "ta", dept: "PHM" },
  { name: "Yasmin Magdy",          email: "yasmin.magdy@ecu.edu",          role: "ta", dept: "PHM" },
  { name: "Nada Ouda",             email: "nada.ouda@ecu.edu",             role: "ta", dept: "PHM" },
  { name: "Majed",                 email: "majed@ecu.edu",                 role: "ta", dept: "MCE" },
  { name: "Omar Ashraf",           email: "omar.ashraf@ecu.edu",           role: "ta", dept: "MCE" },
  { name: "Bishoy",                email: "bishoy@ecu.edu",                role: "ta", dept: "MCE" },
];

// ─── Courses ─────────────────────────────────────────────────────────────────

const COURSES = [
  // Freshman (level 0)
  { code: "SET012", name: "Engineering Computation",                  level: 0, has_lecture: true,  has_tutorial: false, has_lab: false, has_tut_lab: true,  groups_per_lecture: 1 },
  { code: "PHM013", name: "Calculus for Engineering 2",               level: 0, has_lecture: true,  has_tutorial: true,  has_lab: false, has_tut_lab: false, groups_per_lecture: 3 },
  { code: "PHM014", name: "Linear Algebra and Analytical Geometry",   level: 0, has_lecture: true,  has_tutorial: true,  has_lab: false, has_tut_lab: false, groups_per_lecture: 3 },
  { code: "PHM022", name: "Waves Electricity and Magnetic Fields",    level: 0, has_lecture: true,  has_tutorial: false, has_lab: true,  has_tut_lab: false, groups_per_lecture: 3 },
  { code: "PHM033", name: "Engineering Mechanics 2 Dynamics",         level: 0, has_lecture: true,  has_tutorial: true,  has_lab: false, has_tut_lab: false, groups_per_lecture: 3 },
  { code: "MCE024", name: "Production Engineering",                   level: 0, has_lecture: true,  has_tutorial: false, has_lab: true,  has_tut_lab: false, groups_per_lecture: 3 },
  { code: "MCE061", name: "Engineering Drawing",                      level: 0, has_lecture: true,  has_tutorial: true,  has_lab: false, has_tut_lab: false, groups_per_lecture: 3 },
  // L1
  { code: "SET121", name: "Computer Architecture",                    level: 1, has_lecture: true,  has_tutorial: false, has_lab: false, has_tut_lab: true,  groups_per_lecture: 1 },
  { code: "SET122", name: "Computer Programming 2",                   level: 1, has_lecture: true,  has_tutorial: false, has_lab: true,  has_tut_lab: false, groups_per_lecture: 1 },
  { code: "SET123", name: "Data Structures and Algorithms",           level: 1, has_lecture: true,  has_tutorial: false, has_lab: false, has_tut_lab: true,  groups_per_lecture: 1 },
  { code: "SET124", name: "Software Engineering 1",                   level: 1, has_lecture: true,  has_tutorial: true,  has_lab: false, has_tut_lab: false, groups_per_lecture: 1 },
  { code: "PHM114", name: "Statistics and Probability for Engineering",level:1, has_lecture: true,  has_tutorial: true,  has_lab: false, has_tut_lab: false, groups_per_lecture: 1 },
  // L2
  { code: "SET221", name: "Electronic Design Automation",             level: 2, has_lecture: true,  has_tutorial: false, has_lab: true,  has_tut_lab: false, groups_per_lecture: 1 },
  { code: "SET222", name: "Design and Analysis of Algorithms",        level: 2, has_lecture: true,  has_tutorial: true,  has_lab: false, has_tut_lab: false, groups_per_lecture: 1 },
  { code: "SET223", name: "Software Testing Validation and Verification",level:2,has_lecture: true, has_tutorial: false, has_lab: true,  has_tut_lab: false, groups_per_lecture: 2 },
  { code: "SET224", name: "Design of Compilers",                      level: 2, has_lecture: true,  has_tutorial: false, has_lab: false, has_tut_lab: true,  groups_per_lecture: 1 },
  { code: "SET225", name: "Database Systems 1",                       level: 2, has_lecture: true,  has_tutorial: false, has_lab: false, has_tut_lab: true,  groups_per_lecture: 1 },
  { code: "SET226", name: "Control Engineering",                      level: 2, has_lecture: true,  has_tutorial: true,  has_lab: true,  has_tut_lab: false, groups_per_lecture: 2 },
  // L3
  { code: "SET321", name: "Software Formal Specifications",           level: 3, has_lecture: true,  has_tutorial: true,  has_lab: false, has_tut_lab: false, groups_per_lecture: 1 },
  { code: "SET322", name: "Distributed Computing",                    level: 3, has_lecture: true,  has_tutorial: false, has_lab: false, has_tut_lab: true,  groups_per_lecture: 1 },
  { code: "SET323", name: "Real-Time and Embedded Systems Design",    level: 3, has_lecture: true,  has_tutorial: false, has_lab: false, has_tut_lab: true,  groups_per_lecture: 1 },
  { code: "SET372", name: "Internet Programming",                     level: 3, has_lecture: true,  has_tutorial: true,  has_lab: false, has_tut_lab: false, groups_per_lecture: 1 },
  { code: "SET374", name: "Network Operation and Management",         level: 3, has_lecture: true,  has_tutorial: true,  has_lab: false, has_tut_lab: false, groups_per_lecture: 1 },
  { code: "SET393", name: "Data Mining and Business Intelligence",    level: 3, has_lecture: true,  has_tutorial: true,  has_lab: false, has_tut_lab: false, groups_per_lecture: 1 },
  // L4
  { code: "SET373", name: "Parallel and Distributed Algorithms",      level: 4, has_lecture: true,  has_tutorial: true,  has_lab: false, has_tut_lab: false, groups_per_lecture: 1 },
  { code: "SET374", name: "Network Operation and Management",         level: 4, has_lecture: true,  has_tutorial: true,  has_lab: false, has_tut_lab: false, groups_per_lecture: 1 },
  { code: "SET391", name: "Database System 2",                        level: 4, has_lecture: true,  has_tutorial: true,  has_lab: false, has_tut_lab: false, groups_per_lecture: 1 },
  { code: "SET421", name: "Software Maintenance and Evolution",       level: 4, has_lecture: true,  has_tutorial: true,  has_lab: false, has_tut_lab: false, groups_per_lecture: 1 },
  { code: "SET422", name: "Software Project Management",              level: 4, has_lecture: true,  has_tutorial: true,  has_lab: false, has_tut_lab: false, groups_per_lecture: 1 },
  { code: "SET423", name: "Mobile Computing",                         level: 4, has_lecture: true,  has_tutorial: false, has_lab: false, has_tut_lab: true,  groups_per_lecture: 1 },
  { code: "SET491", name: "Selected Topics in Software Applications", level: 4, has_lecture: true,  has_tutorial: true,  has_lab: false, has_tut_lab: false, groups_per_lecture: 1 },
  { code: "SET498", name: "Graduation Project 2",                     level: 4, has_lecture: false, has_tutorial: false, has_lab: true,  has_tut_lab: false, groups_per_lecture: 1 },
];

// ─── Course → Staff assignments (from schedule PDFs) ─────────────────────────
// format: { code, level, professor, tas: [] }

const ASSIGNMENTS = [
  // L4
  { code: "SET373", level: 4, professor: "doaa.mabrouk@ecu.edu",        tas: ["yara.mahmoud@ecu.edu"] },
  { code: "SET374", level: 4, professor: "eslam.mohammad@ecu.edu",       tas: ["tahia.ahmed@ecu.edu"] },
  { code: "SET391", level: 4, professor: "sherry.ali@ecu.edu",           tas: ["fadi.romani@ecu.edu"] },
  { code: "SET421", level: 4, professor: "mohammad.meiad@ecu.edu",       tas: ["norhan.mamdouh@ecu.edu"] },
  { code: "SET422", level: 4, professor: "fatima.saqr@ecu.edu",          tas: ["asmaa.elbaghdadi@ecu.edu"] },
  { code: "SET423", level: 4, professor: "sherry.ali@ecu.edu",           tas: ["rim.walid@ecu.edu"] },
  { code: "SET491", level: 4, professor: "hisham.reda@ecu.edu",          tas: ["mohammad.tarek@ecu.edu"] },
  // L3
  { code: "SET321", level: 3, professor: "mohammad.meiad@ecu.edu",       tas: ["meyada.alaa@ecu.edu", "abdelrahman.jaber@ecu.edu"] },
  { code: "SET322", level: 3, professor: "doaa.mabrouk@ecu.edu",         tas: ["mohammad.tarek@ecu.edu", "mohammad.khattab@ecu.edu"] },
  { code: "SET323", level: 3, professor: "ahmed.othman@ecu.edu",         tas: ["ahmed.samir@ecu.edu", "hajar.rabie@ecu.edu"] },
  { code: "SET372", level: 3, professor: "fatima.saqr@ecu.edu",          tas: ["fadi.romani@ecu.edu", "doaa.amin@ecu.edu"] },
  { code: "SET374", level: 3, professor: "eslam.mohammad@ecu.edu",       tas: ["tahia.ahmed@ecu.edu"] },
  { code: "SET393", level: 3, professor: "sherry.ali@ecu.edu",           tas: ["hussein.mohammad@ecu.edu"] },
  // L2
  { code: "SET221", level: 2, professor: "meyar.ali@ecu.edu",            tas: ["norhan.mamdouh@ecu.edu", "abdelrahman.jaber@ecu.edu"] },
  { code: "SET222", level: 2, professor: "mohammad.meiad@ecu.edu",       tas: ["yara.mahmoud@ecu.edu", "mohammad.hani@ecu.edu"] },
  { code: "SET223", level: 2, professor: "sabah.saad@ecu.edu",           tas: ["fadi.romani@ecu.edu"] },
  { code: "SET224", level: 2, professor: "hisham.reda@ecu.edu",          tas: ["asmaa.elbaghdadi@ecu.edu", "mohammad.khattab@ecu.edu"] },
  { code: "SET225", level: 2, professor: "doaa.mabrouk@ecu.edu",         tas: ["doaa.amin@ecu.edu", "ahmed.samir@ecu.edu"] },
  { code: "SET226", level: 2, professor: "sulaiman.mabrouk@ecu.edu",     tas: ["kirollos.samy@ecu.edu"] },
  // L1
  { code: "SET121", level: 1, professor: "eslam.mohammad@ecu.edu",       tas: ["tahia.ahmed@ecu.edu"] },
  { code: "SET122", level: 1, professor: "qadry@ecu.edu",                tas: ["yara.mahmoud@ecu.edu", "hajar.rabie@ecu.edu", "meyada.alaa@ecu.edu"] },
  { code: "SET123", level: 1, professor: "fatima.saqr@ecu.edu",          tas: ["hussein.mohammad@ecu.edu", "mohammad.hani@ecu.edu"] },
  { code: "SET124", level: 1, professor: "lamia@ecu.edu",                tas: ["asmaa.elbaghdadi@ecu.edu", "abdelrahman.jaber@ecu.edu", "rim.walid@ecu.edu"] },
  { code: "PHM114", level: 1, professor: "mostafa.abdelslam@ecu.edu",    tas: ["mona.saleh@ecu.edu", "ashraf.mohammad@ecu.edu", "yasmin.magdy@ecu.edu", "nada.ouda@ecu.edu"] },
  // Freshman
  { code: "SET012", level: 0, professor: "mohammad.ismail@ecu.edu",      tas: ["mohammad.khattab@ecu.edu"] },
  { code: "PHM013", level: 0, professor: "emad.abdelhafeez@ecu.edu",     tas: ["janna.medhat@ecu.edu", "hajar.ahmed@ecu.edu", "mona.ahmed@ecu.edu", "fironya.medhat@ecu.edu"] },
  { code: "PHM014", level: 0, professor: "mohammad.elsayed@ecu.edu",     tas: ["noha.khalaf@ecu.edu", "dina.zaki@ecu.edu", "nada.omar@ecu.edu"] },
  { code: "PHM022", level: 0, professor: "mohammad.tayseer@ecu.edu",     tas: ["noha.hussein@ecu.edu", "nada.ayman@ecu.edu", "omar.mohammad@ecu.edu"] },
  { code: "PHM033", level: 0, professor: "hussein.elsayed@ecu.edu",      tas: ["rawan.sultan@ecu.edu", "peter.talaat@ecu.edu", "yomna.basem@ecu.edu", "ahmed.tamer@ecu.edu", "nada.awad@ecu.edu"] },
  { code: "MCE024", level: 0, professor: "ihab.nasir@ecu.edu",           tas: ["majed@ecu.edu", "omar.ashraf@ecu.edu"] },
  { code: "MCE061", level: 0, professor: "mohammad.abdelrahman@ecu.edu", tas: ["bishoy@ecu.edu", "noha.khalaf@ecu.edu"] },
];

// ─── Staff availability (days from schedule) ─────────────────────────────────
// Derived by looking at which days each person appears in the schedules

const AVAILABILITY = [
  // Professors
  { email: "mohammad.ismail@ecu.edu",      days: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"] },
  { email: "mohammad.meiad@ecu.edu",       days: ["Saturday", "Monday", "Tuesday", "Wednesday"] },
  { email: "fatima.saqr@ecu.edu",          days: ["Sunday", "Monday", "Thursday", "Wednesday"] },
  { email: "doaa.mabrouk@ecu.edu",         days: ["Sunday", "Monday", "Tuesday", "Wednesday"] },
  { email: "sherry.ali@ecu.edu",           days: ["Tuesday", "Wednesday"] },
  { email: "hisham.reda@ecu.edu",          days: ["Sunday", "Tuesday"] },
  { email: "eslam.mohammad@ecu.edu",       days: ["Monday", "Tuesday", "Wednesday"] },
  { email: "sabah.saad@ecu.edu",           days: ["Saturday", "Sunday"] },
  { email: "meyar.ali@ecu.edu",            days: ["Sunday", "Wednesday"] },
  { email: "sulaiman.mabrouk@ecu.edu",     days: ["Saturday"] },
  { email: "ahmed.othman@ecu.edu",         days: ["Saturday", "Monday"] },
  { email: "mostafa.abdelslam@ecu.edu",    days: ["Monday", "Thursday"] },
  { email: "qadry@ecu.edu",               days: ["Monday", "Thursday"] },
  { email: "lamia@ecu.edu",               days: ["Monday", "Thursday"] },
  { email: "emad.abdelhafeez@ecu.edu",     days: ["Saturday", "Monday", "Thursday"] },
  { email: "mohammad.elsayed@ecu.edu",     days: ["Saturday", "Tuesday"] },
  { email: "mohammad.tayseer@ecu.edu",     days: ["Saturday"] },
  { email: "hussein.elsayed@ecu.edu",      days: ["Saturday", "Sunday", "Monday", "Thursday"] },
  { email: "ihab.nasir@ecu.edu",           days: ["Sunday", "Monday", "Thursday"] },
  { email: "mohammad.abdelrahman@ecu.edu", days: ["Sunday", "Tuesday", "Monday"] },
  // TAs
  { email: "yara.mahmoud@ecu.edu",         days: ["Sunday", "Thursday"] },
  { email: "asmaa.elbaghdadi@ecu.edu",     days: ["Sunday", "Thursday"] },
  { email: "norhan.mamdouh@ecu.edu",       days: ["Saturday", "Tuesday", "Thursday"] },
  { email: "rim.walid@ecu.edu",            days: ["Tuesday", "Thursday"] },
  { email: "fadi.romani@ecu.edu",          days: ["Saturday", "Thursday", "Wednesday"] },
  { email: "mohammad.tarek@ecu.edu",       days: ["Tuesday"] },
  { email: "tahia.ahmed@ecu.edu",          days: ["Monday", "Wednesday"] },
  { email: "doaa.amin@ecu.edu",            days: ["Saturday", "Wednesday"] },
  { email: "ahmed.samir@ecu.edu",          days: ["Saturday", "Monday"] },
  { email: "hajar.rabie@ecu.edu",          days: ["Saturday", "Monday", "Thursday"] },
  { email: "meyada.alaa@ecu.edu",          days: ["Monday", "Wednesday"] },
  { email: "abdelrahman.jaber@ecu.edu",    days: ["Thursday", "Wednesday"] },
  { email: "mohammad.khattab@ecu.edu",     days: ["Tuesday", "Sunday", "Wednesday"] },
  { email: "hussein.mohammad@ecu.edu",     days: ["Sunday", "Wednesday"] },
  { email: "kirollos.samy@ecu.edu",        days: ["Saturday", "Sunday", "Thursday"] },
  { email: "mohammad.hani@ecu.edu",        days: ["Saturday", "Sunday", "Thursday"] },
  { email: "rawan.sultan@ecu.edu",         days: ["Saturday", "Sunday", "Wednesday"] },
  { email: "peter.talaat@ecu.edu",         days: ["Saturday", "Sunday", "Monday", "Thursday"] },
  { email: "yomna.basem@ecu.edu",          days: ["Saturday", "Sunday", "Monday"] },
  { email: "ahmed.tamer@ecu.edu",          days: ["Saturday", "Monday", "Thursday"] },
  { email: "nada.awad@ecu.edu",            days: ["Monday", "Wednesday"] },
  { email: "noha.khalaf@ecu.edu",          days: ["Saturday", "Sunday", "Monday", "Thursday"] },
  { email: "dina.zaki@ecu.edu",            days: ["Saturday", "Sunday", "Tuesday"] },
  { email: "nada.omar@ecu.edu",            days: ["Saturday", "Wednesday", "Thursday"] },
  { email: "noha.hussein@ecu.edu",         days: ["Saturday", "Sunday", "Thursday"] },
  { email: "nada.ayman@ecu.edu",           days: ["Sunday", "Monday", "Wednesday"] },
  { email: "omar.mohammad@ecu.edu",        days: ["Saturday"] },
  { email: "janna.medhat@ecu.edu",         days: ["Sunday", "Monday", "Thursday"] },
  { email: "hajar.ahmed@ecu.edu",          days: ["Sunday", "Monday", "Thursday"] },
  { email: "mona.ahmed@ecu.edu",           days: ["Sunday", "Monday", "Thursday"] },
  { email: "fironya.medhat@ecu.edu",       days: ["Monday", "Thursday"] },
  { email: "mona.saleh@ecu.edu",           days: ["Sunday", "Monday"] },
  { email: "ashraf.mohammad@ecu.edu",      days: ["Sunday", "Thursday"] },
  { email: "yasmin.magdy@ecu.edu",         days: ["Sunday", "Thursday"] },
  { email: "nada.ouda@ecu.edu",            days: ["Monday"] },
  { email: "majed@ecu.edu",               days: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"] },
  { email: "omar.ashraf@ecu.edu",          days: ["Thursday"] },
  { email: "bishoy@ecu.edu",              days: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"] },
];

// ─── Levels config (ECU real structure) ──────────────────────────────────────

const LEVELS_CONFIG = [
  {
    level: 0,
    label: "Freshman",
    groups: [
      { group_id: "GA", subgroup_count: 12 },
      { group_id: "GB", subgroup_count: 9 },
    ],
  },
  {
    level: 1,
    label: "Level 1",
    groups: [
      { group_id: "G1", subgroup_count: 3 },
      { group_id: "G2", subgroup_count: 3 },
      { group_id: "G3", subgroup_count: 3 },
    ],
  },
  {
    level: 2,
    label: "Level 2",
    groups: [
      { group_id: "G1", subgroup_count: 3 },
      { group_id: "G2", subgroup_count: 3 },
    ],
  },
  {
    level: 3,
    label: "Level 3",
    groups: [
      { group_id: "G1", subgroup_count: 3 },
      { group_id: "G2", subgroup_count: 2 },
    ],
  },
  {
    level: 4,
    label: "Level 4",
    groups: [
      { group_id: "G1", subgroup_count: 0 },
    ],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  await client.connect();
  await client.db("admin").command({ ping: 1 });
  const db = client.db(DB_NAME);
  console.log(`\n📦 Connected to ${DB_NAME}\n`);

  // 1. Upsert institution
  console.log("🏛️  Upserting institution...");
  const instResult = await db.collection("institutions").findOneAndUpdate(
    { slug: INSTITUTION_SLUG },
    {
      $setOnInsert: {
        name: "Egyptian Chinese University - SET Dept",
        slug: INSTITUTION_SLUG,
        active_term: {
          label:        "Spring 2026",
          start_date:   "2026-02-01",
          end_date:     "2026-06-15",
          working_days: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday"],
        },
        settings: {
          slot_duration_minutes: 60,
          num_periods:           10,
          daily_start:           "08:30",
          daily_end:             "18:30",
          max_consecutive_slots: 4,
        },
        created_at: new Date(),
      },
    },
    { upsert: true, returnDocument: "after" }
  );
  const institution = instResult ?? await db.collection("institutions").findOne({ slug: INSTITUTION_SLUG });
  const iOid = institution._id;
  console.log(`   ✅ Institution: ${iOid}\n`);

  // 2. Upsert staff — all auto-verified, password = "Schedula@123"
  console.log("👥 Upserting staff...");
  const passwordHash = await bcrypt.hash("Schedula@123", 10);
  let staffInserted = 0;
  const staffIdMap = {}; // email → ObjectId

  for (const s of STAFF) {
    const existing = await db.collection("users").findOne({ email: s.email });
    if (existing) {
      staffIdMap[s.email] = existing._id;
      continue;
    }
    const res = await db.collection("users").insertOne({
      institution_id:     iOid,
      email:              s.email,
      password_hash:      passwordHash,
      role:               s.role,
      name:               s.name,
      department:         s.dept,
      invite_status:      "joined",
      email_verified_at:  new Date(),
      invite_token_hash:  null,
      email_verify_token: null,
      email_verify_expires_at: null,
      password_reset_token: null,
      password_reset_expires_at: null,
      refresh_token_hash: null,
      created_at:         new Date(),
      deleted_at:         null,
    });
    staffIdMap[s.email] = res.insertedId;
    staffInserted++;
  }
  console.log(`   ✅ ${staffInserted} staff inserted, ${STAFF.length - staffInserted} already existed\n`);

  // 3. Upsert courses with new flat schema
  console.log("📚 Upserting courses...");
  let coursesInserted = 0;
  const courseIdMap = {}; // "code-level" → ObjectId

  for (const c of COURSES) {
    const key = `${c.code}-${c.level}`;
    // Use findOneAndUpdate with upsert — match on code+level (not just code) to support SET374 at L3 and L4
    // Drop the unique index on institution_code if it blocks same code at different levels
    const existing = await db.collection("courses").findOne({
      institution_id: iOid,
      code:           c.code,
      level:          c.level,
    });
    if (existing) {
      courseIdMap[key] = existing._id;
      await db.collection("courses").updateOne({ _id: existing._id }, {
        $set: {
          name:               c.name,
          has_lecture:        c.has_lecture,
          has_tutorial:       c.has_tutorial,
          has_lab:            c.has_lab,
          has_tut_lab:        c.has_tut_lab,
          groups_per_lecture: c.groups_per_lecture,
          deleted_at:         null,
        }
      });
      continue;
    }
    const res = await db.collection("courses").insertOne({
      institution_id:     iOid,
      code:               c.code,
      name:               c.name,
      credit_hours:       3,
      level:              c.level,
      has_lecture:        c.has_lecture,
      has_tutorial:       c.has_tutorial,
      has_lab:            c.has_lab,
      has_tut_lab:        c.has_tut_lab,
      groups_per_lecture: c.groups_per_lecture,
      professor_id:       null,
      ta_ids:             [],
      created_at:         new Date(),
      deleted_at:         null,
    });
    courseIdMap[key] = res.insertedId;
    coursesInserted++;
  }
  console.log(`   ✅ ${coursesInserted} courses inserted, ${COURSES.length - coursesInserted} already existed\n`);

  // 4. Apply staff assignments to courses
  console.log("🔗 Assigning staff to courses...");
  let assigned = 0;
  for (const a of ASSIGNMENTS) {
    const key = `${a.code}-${a.level}`;
    const courseId = courseIdMap[key];
    if (!courseId) { console.warn(`   ⚠️  Course not found: ${a.code} L${a.level}`); continue; }

    const professorId = a.professor ? staffIdMap[a.professor] ?? null : null;
    const taIds = (a.tas ?? []).map(e => staffIdMap[e]).filter(Boolean);

    await db.collection("courses").updateOne(
      { _id: courseId },
      { $set: { professor_id: professorId, ta_ids: taIds } }
    );
    assigned++;
  }
  console.log(`   ✅ ${assigned} courses assigned\n`);

  // 5. Upsert staff availability
  console.log("📅 Setting staff availability...");
  const termLabel = "Spring 2026";
  let availSet = 0;
  for (const a of AVAILABILITY) {
    const userId = staffIdMap[a.email];
    if (!userId) continue;
    await db.collection("availability").updateOne(
      { user_id: userId, institution_id: iOid, term_label: termLabel },
      {
        $set: {
          user_id:        userId,
          institution_id: iOid,
          term_label:     termLabel,
          available_days: a.days,
          submitted_at:   new Date(),
          updated_at:     new Date(),
        },
      },
      { upsert: true }
    );
    availSet++;
  }
  console.log(`   ✅ ${availSet} availability records upserted\n`);

  // 6. Upsert levels_config in settings
  console.log("🎓 Upserting levels config...");
  await db.collection("settings").updateOne(
    { institution_id: iOid, type: "levels_config" },
    {
      $set: {
        institution_id: iOid,
        type:           "levels_config",
        data:           { levels: LEVELS_CONFIG },
        updated_at:     new Date(),
      },
    },
    { upsert: true }
  );
  console.log("   ✅ Levels config upserted\n");

  // Summary
  console.log("─────────────────────────────────────────────");
  console.log(`🎉 ECU seed complete!`);
  console.log(`   Institution ID: ${iOid}`);
  console.log(`   Staff:          ${STAFF.length} total`);
  console.log(`   Courses:        ${COURSES.length} total`);
  console.log(`   Assignments:    ${assigned}`);
  console.log(`   Availability:   ${availSet}`);
  console.log(`\n   🔑 All staff password: Schedula@123`);
  console.log("─────────────────────────────────────────────\n");
}

main()
  .catch(err => { console.error("❌ Seed failed:", err.message); process.exit(1); })
  .finally(() => client.close());
