"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import "./styles.css";

import Button      from "@/components/Button";
import Toast       from "@/components/Toast";
import ErrorState  from "@/components/ErrorState";
import SkeletonPage from "@/components/SkeletonPage";
import { UserIcon, BoltIcon } from "@/components/icons/index";

// ── StaffChip (draggable) ──────────────────────────────────────────────────────
function StaffChip({ member, draggingId, onDragStart, onDragEnd }) {
  const initials = member.name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
  const isTA = member.role === "ta";
  return (
    <div
      className={`staff-chip${draggingId === member.id ? " staff-chip--dragging" : ""}`}
      draggable
      onDragStart={() => onDragStart(member.id)}
      onDragEnd={onDragEnd}
    >
      <div className={`staff-chip__avatar${isTA ? " staff-chip__avatar--ta" : ""}`}>{initials}</div>
      <div className="staff-chip__info">
        <p className="staff-chip__name">{member.name}</p>
        <p className="staff-chip__meta">{isTA ? "Teaching Assistant" : "Professor"}</p>
      </div>
      <span className="staff-chip__count">{member.assignments}</span>
    </div>
  );
}

// ── CourseCard (drop target) ───────────────────────────────────────────────────
function CourseCard({ course, staffMap, overCourseId, onDrop, onDragOver, onDragLeave, onUnassign }) {
  const isOver = overCourseId === course.id;

  return (
    <div
      className={`assign-course-card${isOver ? " assign-course-card--over" : ""}`}
      onDragOver={e => { e.preventDefault(); onDragOver(course.id); }}
      onDragLeave={onDragLeave}
      onDrop={e => { e.preventDefault(); onDrop(course.id); }}
    >
      <div className="assign-course__header">
        <span className="assign-course__code">{course.code}</span>
        <span className="assign-course__credits">{course.creditHours} cr · {course.sections} sec</span>
      </div>
      <p className="assign-course__name">{course.name}</p>
      <div className="assign-course__staff">
        {course.assignedStaff.length === 0 ? (
          <span className="assign-drop-hint">Drop staff here to assign</span>
        ) : (
          course.assignedStaff.map(sid => {
            const member = staffMap[sid];
            if (!member) return null;
            const isTA = member.role === "ta";
            return (
              <div key={sid} className={`assigned-chip${isTA ? " assigned-chip--ta" : ""}`}>
                {member.name.split(" ")[0]}
                <button
                  className="assigned-chip__remove"
                  title="Remove assignment"
                  onClick={() => onUnassign(course.id, sid)}
                >
                  ×
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CoordinatorAssignPage() {
  const [courses,     setCourses]     = useState([]);
  const [staff,       setStaff]       = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [saving,      setSaving]      = useState(false);
  const [error,       setError]       = useState(null);
  const [search,      setSearch]      = useState("");
  const [draggingId,  setDraggingId]  = useState(null);
  const [overCourse,  setOverCourse]  = useState(null);
  const [toast,       setToast]       = useState({ open:false, variant:"info", title:"", message:"", id:0 });

  const showToast = (variant, title, message) =>
    setToast({ open:true, variant, title, message, id:Date.now() });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/coordinator/assign");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to load");
      setCourses(json.courses);
      setStaff(json.staff);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Build a fast lookup map: staffId → member
  const staffMap = Object.fromEntries(staff.map(s => [s.id, s]));

  function handleDragStart(staffId) {
    setDraggingId(staffId);
  }

  function handleDragEnd() {
    setDraggingId(null);
    setOverCourse(null);
  }

  async function handleDrop(courseId) {
    setDraggingId(null);
    setOverCourse(null);
    if (!draggingId) return;

    // Optimistic update
    const prevCourses = courses;
    setCourses(prev => prev.map(c =>
      c.id === courseId && !c.assignedStaff.includes(draggingId)
        ? { ...c, assignedStaff: [...c.assignedStaff, draggingId] }
        : c
    ));
    // Increment staff assignment count
    setStaff(prev => prev.map(s =>
      s.id === draggingId ? { ...s, assignments: s.assignments + 1 } : s
    ));

    setSaving(true);
    try {
      const res = await fetch("/api/coordinator/assign", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ courseId, staffId: draggingId, action: "assign" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to assign");
      showToast("success", "Assigned", `${staffMap[draggingId]?.name ?? "Staff"} assigned.`);
    } catch (e) {
      setCourses(prevCourses); // revert
      setStaff(prev => prev.map(s =>
        s.id === draggingId ? { ...s, assignments: s.assignments - 1 } : s
      ));
      showToast("danger", "Error", e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleUnassign(courseId, staffId) {
    const prevCourses = courses;
    setCourses(prev => prev.map(c =>
      c.id === courseId
        ? { ...c, assignedStaff: c.assignedStaff.filter(id => id !== staffId) }
        : c
    ));
    setStaff(prev => prev.map(s =>
      s.id === staffId ? { ...s, assignments: Math.max(0, s.assignments - 1) } : s
    ));

    setSaving(true);
    try {
      const res = await fetch("/api/coordinator/assign", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ courseId, staffId, action: "unassign" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to remove");
      showToast("info", "Removed", "Assignment removed.");
    } catch (e) {
      setCourses(prevCourses);
      setStaff(prev => prev.map(s =>
        s.id === staffId ? { ...s, assignments: s.assignments + 1 } : s
      ));
      showToast("danger", "Error", e.message);
    } finally {
      setSaving(false);
    }
  }

  const filteredStaff = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );

  const totalAssigned = courses.filter(c => c.assignedStaff.length > 0).length;
  const unassigned    = courses.filter(c => c.assignedStaff.length === 0).length;

  async function handleAutoAssign() {
    setSaving(true);
    try {
      const res = await fetch("/api/coordinator/assign", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "auto-assign" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to auto-assign");
      showToast("success", "Auto-Assigned", `${json.assigned || 0} courses assigned automatically.`);
      await load(); // Refresh data
    } catch (e) {
      showToast("danger", "Error", e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <SkeletonPage stats={3} rows={4} />;
  if (error)   return <div className="assign-page"><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div className="assign-page">
      <main className="assign-shell">

        {saving && (
          <div className="assign-save-bar">
            <p>Saving assignment…</p>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 24, marginBottom: 28 }}>
          <div className="page-header">
            <h1>Assign Staff to Courses</h1>
            <p>Drag a professor or TA from the left panel and drop them onto a course card to assign. Click × to remove an assignment.</p>
          </div>
          <Button
            onClick={handleAutoAssign}
            disabled={saving}
            style={{ whiteSpace: "nowrap", marginTop: 4, flexShrink: 0 }}
          >
            {saving ? "Auto-assigning…" : "Auto Assign"}
          </Button>
        </div>

        {/* Stats row */}
        <div className="assign-reveal assign-reveal-2" style={{ display:"flex", gap:16, marginBottom:28, flexWrap:"wrap" }}>
          <div className="panel" style={{ flex:1, minWidth:120, padding:"18px 22px", borderRadius:24 }}>
            <p style={{ fontFamily:"DM Sans",fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--color-text-muted)",margin:"0 0 6px" }}>Staff</p>
            <p style={{ fontFamily:"DM Serif Display",fontSize:28,color:"var(--color-accent)",margin:0 }}>{staff.length}</p>
          </div>
          <div className="panel" style={{ flex:1, minWidth:120, padding:"18px 22px", borderRadius:24 }}>
            <p style={{ fontFamily:"DM Sans",fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--color-text-muted)",margin:"0 0 6px" }}>Courses Assigned</p>
            <p style={{ fontFamily:"DM Serif Display",fontSize:28,color:"#34C759",margin:0 }}>{totalAssigned}</p>
          </div>
          <div className="panel" style={{ flex:1, minWidth:120, padding:"18px 22px", borderRadius:24 }}>
            <p style={{ fontFamily:"DM Sans",fontSize:11,fontWeight:700,letterSpacing:"0.08em",textTransform:"uppercase",color:"var(--color-text-muted)",margin:"0 0 6px" }}>Unassigned</p>
            <p style={{ fontFamily:"DM Serif Display",fontSize:28,color:unassigned > 0 ? "#FF9500" : "#34C759",margin:0 }}>{unassigned}</p>
          </div>
        </div>

        {/* Main layout */}
        <div className="assign-layout assign-reveal assign-reveal-3">

          {/* Staff panel */}
          <aside className="staff-panel">
            <p className="staff-panel__title">
              <UserIcon size={11} style={{ marginRight:5 }} />
              Staff ({staff.length})
            </p>
            <input
              className="staff-search"
              type="text"
              placeholder="Search staff…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            <div className="staff-list">
              {filteredStaff.length === 0 ? (
                <p style={{ fontFamily:"DM Sans",fontSize:13,color:"var(--color-text-muted)",padding:"12px 0" }}>
                  No staff found.
                </p>
              ) : (
                filteredStaff.map(member => (
                  <StaffChip
                    key={member.id}
                    member={member}
                    draggingId={draggingId}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))
              )}
            </div>
          </aside>

          {/* Course grid */}
          <div>
            <p className="courses-panel__title">
              <BoltIcon size={11} style={{ marginRight:5 }} />
              Courses ({courses.length})
            </p>
            <div className="assign-courses-grid">
              {courses.map(course => (
                <CourseCard
                  key={course.id}
                  course={course}
                  staffMap={staffMap}
                  overCourseId={overCourse}
                  onDrop={handleDrop}
                  onDragOver={setOverCourse}
                  onDragLeave={() => setOverCourse(null)}
                  onUnassign={handleUnassign}
                />
              ))}
              {courses.length === 0 && (
                <p style={{ fontFamily:"DM Sans",fontSize:14,color:"var(--color-text-muted)",padding:"40px 0" }}>
                  No courses found. Add courses first.
                </p>
              )}
            </div>
          </div>
        </div>

      </main>

      <Toast
        key={toast.id}
        open={toast.open}
        variant={toast.variant}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast(p => ({ ...p, open:false }))}
        duration={3000}
      />
    </div>
  );
}
