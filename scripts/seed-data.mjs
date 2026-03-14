/**
 * scripts/seed-data.mjs
 *
 * Seed script to populate Schedula database with test data.
 * Run via: node --env-file=.env scripts/seed-data.mjs
 */

import { client, DB_NAME } from "./db/client.mjs";
import { ObjectId } from "mongodb";

const COURSES_DATA = [
  { level: 1, code: "SET121", name: "Computer Architecture", credits: 3 },
  { level: 1, code: "SET122", name: "Computer Programming (2)", credits: 3 },
  {
    level: 1,
    code: "SET123",
    name: "Data Structures and Algorithms",
    credits: 3,
  },
  { level: 1, code: "SET124", name: "Software Engineering (1)", credits: 3 },
  {
    level: 1,
    code: "PHM114",
    name: "Statistics and Probability for Engineering",
    credits: 3,
  },
  {
    level: 2,
    code: "SET221",
    name: "Electronic Design Automation",
    credits: 3,
  },
  {
    level: 2,
    code: "SET222",
    name: "Design and Analysis of Algorithms",
    credits: 3,
  },
  {
    level: 2,
    code: "SET223",
    name: "Software Testing, Validation, and Verification",
    credits: 3,
  },
  { level: 2, code: "SET224", name: "Design of Compilers", credits: 3 },
  { level: 2, code: "SET225", name: "Database Systems", credits: 3 },
  { level: 2, code: "SET226", name: "Control Engineering", credits: 3 },
  {
    level: 3,
    code: "SET321",
    name: "Software Formal Specifications",
    credits: 3,
  },
  { level: 3, code: "SET322", name: "Distributed Computing", credits: 3 },
  {
    level: 3,
    code: "SET323",
    name: "Real-Time and Embedded Systems Design",
    credits: 3,
  },
  { level: 3, code: "SET372", name: "Internet Programming", credits: 3 },
  {
    level: 3,
    code: "SET373",
    name: "Parallel and Distributed Algorithms",
    credits: 3,
  },
  {
    level: 3,
    code: "SET374",
    name: "Network Operation and Management",
    credits: 3,
  },
  {
    level: 3,
    code: "SET393",
    name: "Data Mining and Business Intelligence",
    credits: 3,
  },
  { level: 4, code: "SET391", name: "Database System -2", credits: 3 },
  {
    level: 4,
    code: "SET421",
    name: "Software Maintenance and Evolution",
    credits: 3,
  },
  { level: 4, code: "SET422", name: "Software Project Management", credits: 3 },
  { level: 4, code: "SET423", name: "Mobile Computing", credits: 3 },
  {
    level: 4,
    code: "SET491",
    name: "Selected Topics in Software Applications",
    credits: 3,
  },
  { level: 4, code: "SET498", name: "Graduation Project (2)", credits: 6 },
];

const SCHEDULE_DATA = [
  {
    level: 1,
    course_code: "SET121",
    session_type: "Lecture",
    instructor: "Mohammad Islam",
    room: "A202",
    day: "Sunday",
    start_time: "10:30",
    end_time: "11:30",
    group: "G1",
  },
  {
    level: 1,
    course_code: "SET121",
    session_type: "TUT/Lab",
    instructor: "Tahia Ahmed",
    room: "A313",
    day: "Sunday",
    start_time: "12:30",
    end_time: "13:30",
    group: "G1-1",
  },
  {
    level: 1,
    course_code: "SET122",
    session_type: "Lecture",
    instructor: "Qadri",
    room: "A207",
    day: "Monday",
    start_time: "08:30",
    end_time: "09:30",
    group: "G1",
  },
  {
    level: 1,
    course_code: "SET123",
    session_type: "Lecture",
    instructor: "Fatima Saqr",
    room: "A308",
    day: "Sunday",
    start_time: "08:30",
    end_time: "09:30",
    group: "G1",
  },
  {
    level: 1,
    course_code: "SET124",
    session_type: "Lecture",
    instructor: "Lamia",
    room: "A308",
    day: "Thursday",
    start_time: "08:30",
    end_time: "09:30",
    group: "G1",
  },
  {
    level: 1,
    course_code: "PHM114",
    session_type: "Lecture",
    instructor: "Mustafa Abdul-Salam",
    room: "A312",
    day: "Monday",
    start_time: "10:30",
    end_time: "11:30",
    group: "G1",
  },
  {
    level: 2,
    course_code: "SET221",
    session_type: "Lecture",
    instructor: "Myar Ali",
    room: "A207",
    day: "Sunday",
    start_time: "08:30",
    end_time: "09:30",
    group: "G1",
  },
  {
    level: 2,
    course_code: "SET222",
    session_type: "Lecture",
    instructor: "Mohammad Meiad",
    room: "A307",
    day: "Saturday",
    start_time: "08:30",
    end_time: "09:30",
    group: "G1",
  },
  {
    level: 2,
    course_code: "SET223",
    session_type: "Lecture",
    instructor: "Sabah Saad",
    room: "A302",
    day: "Sunday",
    start_time: "09:30",
    end_time: "10:30",
    group: "G1",
  },
  {
    level: 2,
    course_code: "SET224",
    session_type: "Lecture",
    instructor: "Hisham Reda",
    room: "A207",
    day: "Monday",
    start_time: "08:30",
    end_time: "09:30",
    group: "G1",
  },
  {
    level: 2,
    course_code: "SET225",
    session_type: "Lecture",
    instructor: "Doaa Mabrouk",
    room: "A308",
    day: "Tuesday",
    start_time: "09:30",
    end_time: "10:30",
    group: "G1",
  },
  {
    level: 2,
    course_code: "SET226",
    session_type: "Lecture",
    instructor: "Sulaiman Mabrouk",
    room: "A202",
    day: "Saturday",
    start_time: "08:30",
    end_time: "09:30",
    group: "G1",
  },
  {
    level: 3,
    course_code: "SET321",
    session_type: "Lecture",
    instructor: "محمد ميعاد",
    room: "A307",
    day: "Monday",
    start_time: "09:30",
    end_time: "10:30",
    group: "G1-1",
  },
  {
    level: 3,
    course_code: "SET322",
    session_type: "Lecture",
    instructor: "دعاء مبروك",
    room: "A312",
    day: "Tuesday",
    start_time: "10:30",
    end_time: "11:30",
    group: "G1-1",
  },
  {
    level: 3,
    course_code: "SET323",
    session_type: "Lecture",
    instructor: "Ahmed Othman",
    room: "A312",
    day: "Saturday",
    start_time: "09:30",
    end_time: "10:30",
    group: "G1-1",
  },
  {
    level: 3,
    course_code: "SET372",
    session_type: "Lecture",
    instructor: "فاطمة صقر",
    room: "A202",
    day: "Wednesday",
    start_time: "08:30",
    end_time: "09:30",
    group: "G1-1",
  },
  {
    level: 3,
    course_code: "SET393",
    session_type: "Lecture",
    instructor: "شيرى على",
    room: "A312",
    day: "Tuesday",
    start_time: "12:30",
    end_time: "13:30",
    group: "G1-1",
  },
  {
    level: 4,
    course_code: "SET391",
    session_type: "Lecture",
    instructor: "شيرى على",
    room: "D107",
    day: "Wednesday",
    start_time: "08:30",
    end_time: "09:30",
    group: "SA",
  },
  {
    level: 4,
    course_code: "SET421",
    session_type: "Lecture",
    instructor: "محمد ميعاد",
    room: "D101",
    day: "Monday",
    start_time: "12:30",
    end_time: "13:30",
    group: "SA",
  },
  {
    level: 4,
    course_code: "SET422",
    session_type: "Lecture",
    instructor: "فاطمة صقر",
    room: "D109",
    day: "Sunday",
    start_time: "07:30",
    end_time: "08:30",
    group: "SA",
  },
  {
    level: 4,
    course_code: "SET423",
    session_type: "Lecture",
    instructor: "شيرى على",
    room: "D106",
    day: "Tuesday",
    start_time: "10:30",
    end_time: "11:30",
    group: "SA",
  },
];

async function seedDatabase() {
  try {
    console.log("\n🔌  Connecting to MongoDB…");
    await client.connect();
    await client.db("admin").command({ ping: 1 });
    console.log("✅  Connected.\n");

    const db = client.db(DB_NAME);

    // 1. Create Institution
    console.log("📚  Creating institution…");
    const institutionRes = await db.collection("institutions").insertOne({
      name: "Software Engineering Department",
      slug: "se-dept",
      active_term: {
        label: "Spring 2026",
        start_date: "2026-02-01",
        end_date: "2026-06-15",
        working_days: ["Saturday", "Sunday", "Monday", "Tuesday", "Wednesday"],
      },
      settings: {
        slot_duration_minutes: 60,
        daily_start: "07:30",
        daily_end: "17:30",
        max_consecutive_slots: 4,
      },
      created_at: new Date(),
    });
    const institutionId = institutionRes.insertedId;
    console.log(`✅  Institution created: ${institutionId}\n`);

    // 2. Create Faculty
    console.log("🎓  Creating faculty…");
    const facultyRes = await db.collection("faculties").insertOne({
      institution_id: institutionId,
      name: "Faculty of Engineering",
      slug: "engineering",
      created_at: new Date(),
    });
    const facultyId = facultyRes.insertedId;
    console.log(`✅  Faculty created: ${facultyId}\n`);

    // 3. Create Department
    console.log("🏢  Creating department…");
    const departmentRes = await db.collection("departments").insertOne({
      institution_id: institutionId,
      faculty_id: facultyId,
      name: "Software Engineering",
      slug: "software-engineering",
      created_at: new Date(),
    });
    const departmentId = departmentRes.insertedId;
    console.log(`✅  Department created: ${departmentId}\n`);

    // 4. Create Rooms
    console.log("🏛️  Creating rooms…");
    const rooms = [
      "A202",
      "A207",
      "A308",
      "A313",
      "A302",
      "A307",
      "A312",
      "D101",
      "D106",
      "D107",
      "D109",
    ];
    const roomDocs = rooms.map((label) => ({
      institution_id: institutionId,
      name: `Room ${label}`,
      label,
      building: label.startsWith("A") ? "Building A" : "Building D",
      created_at: new Date(),
    }));
    const roomRes = await db.collection("rooms").insertMany(roomDocs);
    const roomIds = Object.values(roomRes.insertedIds);
    console.log(`✅  ${roomIds.length} rooms created\n`);

    // 5. Create Staff/Instructors
    console.log("👨‍🏫  Creating instructors…");
    const instructorNames = [
      "Mohammad Islam",
      "Tahia Ahmed",
      "Qadri",
      "Fatima Saqr",
      "Lamia",
      "Mustafa Abdul-Salam",
      "Myar Ali",
      "Mohammad Meiad",
      "Sabah Saad",
      "Hisham Reda",
      "Doaa Mabrouk",
      "Sulaiman Mabrouk",
      "Ahmed Othman",
      
    ];

    const staffDocs = instructorNames.map((name) => ({
      institution_id: institutionId,
      faculty_id: facultyId,
      department_id: departmentId,
      email: `${name.toLowerCase().replace(/\s+/g, ".")}@university.edu`,
      password_hash: "hashed_password_placeholder",
      role: "professor",
      name,
      invite_status: "joined",
      created_at: new Date(),
    }));

    const staffRes = await db.collection("users").insertMany(staffDocs);
    const staffIds = Object.values(staffRes.insertedIds);
    console.log(`✅  ${staffIds.length} instructors created\n`);

    // 6. Create Courses with Sections
    console.log("📖  Creating courses…");
    const courseMap = new Map(); // code -> { _id, staffIds }

    const courseDocs = COURSES_DATA.map((course) => {
      const sections = SCHEDULE_DATA.filter(
        (s) => s.course_code === course.code,
      );
      const sectionTypes = [
        ...new Set(sections.map((s) => s.session_type.toLowerCase())),
      ];

      return {
        institution_id: institutionId,
        faculty_id: facultyId,
        department_id: departmentId,
        code: course.code,
        name: course.name,
        credit_hours: course.credits,
        sections: sectionTypes.map((type, idx) => ({
          section_id: `${course.code}-${type}-1`,
          type:
            type === "lecture" ? "lecture" : type === "tut/lab" ? "lab" : type,
          year_levels: [course.level],
          slots_per_week: 1,
          slot_duration_minutes: 60,
          capacity: 40,
          required_room_label: sections[0]?.room || "TBD",
          assigned_staff: [],
          shared_with: [],
        })),
        created_at: new Date(),
      };
    });

    const courseRes = await db.collection("courses").insertMany(courseDocs);
    const courseIds = Object.values(courseRes.insertedIds);
    COURSES_DATA.forEach((course, idx) => {
      courseMap.set(course.code, courseIds[idx]);
    });
    console.log(`✅  ${courseIds.length} courses created\n`);

    // 7. Create Schedule Entries
    console.log("📅  Creating schedule entries…");

    // Map instructor names to user IDs
    const instructorMap = new Map();
    staffDocs.forEach((staff, idx) => {
      instructorMap.set(staff.name, staffIds[idx]);
    });

    // Map room labels to room IDs
    const roomLabelMap = new Map();
    roomDocs.forEach((room, idx) => {
      roomLabelMap.set(room.label, roomIds[idx]);
    });

    const scheduleEntries = [];
    for (const schedule of SCHEDULE_DATA) {
      const courseId = courseMap.get(schedule.course_code);
      const staffId = instructorMap.get(schedule.instructor);
      const roomId = roomLabelMap.get(schedule.room);

      if (courseId && staffId && roomId) {
        scheduleEntries.push({
          course_id: courseId,
          section_id: `${schedule.course_code}-${schedule.session_type.toLowerCase()}-1`,
          room_id: roomId,
          staff_id: staffId,
          day: schedule.day,
          start: schedule.start_time,
          end: schedule.end_time,
        });
      }
    }

    // Create a schedule document
    const coordinatorRes = await db.collection("users").findOne({
      institution_id: institutionId,
      role: "professor",
    });

    if (scheduleEntries.length > 0) {
      await db.collection("schedules").insertOne({
        institution_id: institutionId,
        term_label: "Spring 2026",
        approved_by: coordinatorRes?._id || staffIds[0],
        approved_at: new Date(),
        snapshot_id: new ObjectId(),
        entries: scheduleEntries,
        is_published: false,
        created_at: new Date(),
      });
      console.log(
        `✅  Schedule created with ${scheduleEntries.length} entries\n`,
      );
    }

    // Summary
    console.log("─────────────────────────────────────────");
    console.log("🎉  Seed data inserted successfully!\n");
    console.log("📊  Summary:");
    console.log(`   • Institution: ${institutionId}`);
    console.log(`   • Faculty: ${facultyId}`);
    console.log(`   • Department: ${departmentId}`);
    console.log(`   • Rooms: ${roomIds.length}`);
    console.log(`   • Instructors: ${staffIds.length}`);
    console.log(`   • Courses: ${courseIds.length}`);
    console.log(`   • Schedule Entries: ${scheduleEntries.length}\n`);
  } catch (err) {
    console.error("\n❌  Seed failed:", err.message);
    console.error(err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

seedDatabase();