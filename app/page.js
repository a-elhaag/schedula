import Link from "next/link";
import "./landing.css";

export const metadata = {
  title: "Schedula — Smart University Scheduling",
  description:
    "AI-powered timetabling for universities. Automatically generate conflict-free schedules for courses, rooms, and staff.",
};

const FEATURES = [
  {
    icon: "⚡",
    title: "Automated Timetabling",
    desc: "OR-Tools constraint solver generates optimal conflict-free schedules in seconds, respecting room capacities, staff availability, and institutional constraints.",
  },
  {
    icon: "🏛",
    title: "Institution Management",
    desc: "Manage departments, courses, rooms, and staff from a single dashboard. Import bulk data via CSV and keep everything in sync.",
  },
  {
    icon: "📅",
    title: "Availability Tracking",
    desc: "Staff submit their weekly availability. The scheduler respects preferences while maximising coverage and minimising conflicts.",
  },
  {
    icon: "🔒",
    title: "Role-based Access",
    desc: "Coordinators, professors, TAs, and students each see exactly what they need — nothing more, nothing less.",
  },
  {
    icon: "📊",
    title: "Analytics & Review",
    desc: "Review generated schedules before publishing. Inspect workload distribution, room utilisation, and soft-constraint satisfaction.",
  },
  {
    icon: "📧",
    title: "Automated Invites",
    desc: "Onboard staff and students with a single invite link. Role assignment, verification, and access control handled automatically.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Set up your institution",
    desc: "Create your institution profile, add departments, rooms, and configure scheduling constraints to match your policies.",
  },
  {
    n: "2",
    title: "Import courses & staff",
    desc: "Upload your course catalogue and invite staff. Staff submit their availability — the system handles the rest.",
  },
  {
    n: "3",
    title: "Generate & publish",
    desc: "Hit generate. Review the conflict-free timetable, make any manual tweaks, then publish to all roles instantly.",
  },
];

const ROLES = [
  {
    badge: "Coordinator",
    title: "Full control",
    desc: "Manage the entire institution — courses, rooms, staff, constraints, and schedule generation.",
  },
  {
    badge: "Professor",
    title: "Your schedule, your way",
    desc: "View your assigned sessions, set availability windows, and stay updated in real time.",
  },
  {
    badge: "TA",
    title: "Focused view",
    desc: "See your teaching sessions and submit availability — no noise, no clutter.",
  },
  {
    badge: "Student",
    title: "Always up to date",
    desc: "Access your personal timetable the moment the coordinator publishes it.",
  },
];

export default function LandingPage() {
  return (
    <>
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="nav">
        <span className="nav-brand">Schedula</span>
        <div className="nav-actions">
          <Link href="/signin" className="btn-ghost">Sign in</Link>
          <Link href="/signup" className="btn-primary">Get started</Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="hero">
        <span className="hero-eyebrow">University Scheduling Platform</span>
        <h1 className="hero-title">
          Scheduling that <em>actually</em> works
        </h1>
        <p className="hero-subtitle">
          Schedula uses constraint-based optimisation to generate conflict-free
          timetables for your institution — automatically.
        </p>
        <div className="hero-cta">
          <Link href="/signup" className="btn-hero-primary">Get started free</Link>
          <Link href="/signin" className="btn-hero-ghost">Sign in</Link>
        </div>
      </section>

      {/* ── Stats ───────────────────────────────────────────────────────────── */}
      <div className="stats-strip">
        <div className="stat-item">
          <div className="stat-value">60s</div>
          <div className="stat-label">Average generation time</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">0</div>
          <div className="stat-label">Scheduling conflicts</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">4</div>
          <div className="stat-label">Role types supported</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">100%</div>
          <div className="stat-label">Constraint satisfaction</div>
        </div>
      </div>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section className="section">
        <span className="section-label">Features</span>
        <h2 className="section-title">Everything you need to run scheduling</h2>
        <p className="section-subtitle">
          From course management to automated timetabling, Schedula covers the
          full scheduling lifecycle.
        </p>
        <div className="features-grid">
          {FEATURES.map((f) => (
            <div className="feature-card" key={f.title}>
              <div className="feature-icon">{f.icon}</div>
              <div className="feature-title">{f.title}</div>
              <p className="feature-desc">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <div className="how-section">
        <div className="how-inner">
          <span className="section-label">How it works</span>
          <h2
            className="section-title"
            style={{ textAlign: "center", margin: "0 auto 1rem" }}
          >
            Up and running in three steps
          </h2>
          <p className="section-subtitle">
            No complex configuration. No spreadsheets. Just a clean, guided
            setup that gets your institution scheduled fast.
          </p>
          <div className="steps-grid">
            {STEPS.map((s) => (
              <div className="step" key={s.n}>
                <div className="step-number">{s.n}</div>
                <div className="step-title">{s.title}</div>
                <p className="step-desc">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Roles ───────────────────────────────────────────────────────────── */}
      <section className="section">
        <span className="section-label">Roles</span>
        <h2 className="section-title">
          Built for every member of your institution
        </h2>
        <p className="section-subtitle">
          Each role gets a tailored experience — the right information, the right
          controls, nothing extraneous.
        </p>
        <div className="roles-grid">
          {ROLES.map((r) => (
            <div className="role-card" key={r.badge}>
              <span className="role-badge">{r.badge}</span>
              <div className="role-title">{r.title}</div>
              <p className="role-desc">{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <div className="cta-banner">
        <h2 className="section-title">Ready to eliminate scheduling chaos?</h2>
        <p className="section-subtitle">
          Join institutions already using Schedula to save hours every semester.
        </p>
        <div className="hero-cta">
          <Link href="/signup" className="btn-hero-primary">
            Create your institution
          </Link>
          <Link href="/signin" className="btn-hero-ghost">Sign in</Link>
        </div>
      </div>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="footer">
        <span className="footer-brand">Schedula</span>
        <div className="footer-links">
          <Link href="/signin">Sign in</Link>
          <Link href="/signup">Sign up</Link>
        </div>
        <span className="footer-copy">© 2025 Schedula</span>
      </footer>
    </>
  );
}
