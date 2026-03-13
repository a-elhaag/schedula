import institutions     from './institutions.mjs';
import faculties        from './faculties.mjs';
import departments      from './departments.mjs';
import users            from './users.mjs';
import rooms            from './rooms.mjs';
import courses          from './courses.mjs';
import availability     from './availability.mjs';
import constraints      from './constraints.mjs';
import schedule_jobs    from './schedule_jobs.mjs';
import schedule_snapshots from './schedule_snapshots.mjs';
import schedules        from './schedules.mjs';

// Ordered array — collections are created in this sequence
export default [
  institutions,
  faculties,
  departments,
  users,
  rooms,
  courses,
  availability,
  constraints,
  schedule_jobs,
  schedule_snapshots,
  schedules,
];
