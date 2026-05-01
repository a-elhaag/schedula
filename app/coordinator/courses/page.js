"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import "./styles.css";

import Button from "@/components/Button";
import { StatCard } from "@/components/StatCard";
import Modal from "@/components/Modal";
import Toast from "@/components/Toast";
import Spinner from "@/components/Spinner";
import SkeletonPage from "@/components/SkeletonPage";
import ErrorState from "@/components/ErrorState";
import { Input } from "@/components/Input";
import CourseCard from "@/components/CourseCard";
import {
  BookOpenIcon,
  BoltIcon,
  GraduationCapIcon,
} from "@/components/icons/index";

export default function CoordinatorCoursesPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [toast, setToast] = useState({
    open: false,
    variant: "info",
    title: "",
    message: "",
    id: 0,
  });
  const [form, setForm] = useState({
    code:               "",
    name:               "",
    credit_hours:       "3",
    level:              "1",
    has_lecture:        true,
    has_tutorial:       false,
    has_lab:            false,
    has_tut_lab:        false,
    groups_per_lecture: "1",
    professor_id:       "",
    ta_ids:             [],
  });
  const [editingId, setEditingId] = useState(null);
  const [staff, setStaff] = useState([]);

  const showToast = (variant, title, message) =>
    setToast({ open: true, variant, title, message, id: Date.now() });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/coordinator/courses");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to load");
      setData(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadStaff = useCallback(async () => {
    try {
      const res  = await fetch("/api/coordinator/staff?limit=200");
      const json = await res.json();
      if (res.ok) setStaff(json.items ?? []);
    } catch {}
  }, []);

  useEffect(() => { load(); loadStaff(); }, [load, loadStaff]);

  const professors = staff.filter(s => s.role === "professor");
  const tas        = staff.filter(s => s.role === "ta");

  async function handleCreateOrUpdate() {
    if (!form.code.trim() || !form.name.trim()) {
      showToast("warning", "Validation", "Course code and name are required.");
      return;
    }
    if (!form.has_lecture && !form.has_tutorial && !form.has_lab && !form.has_tut_lab) {
      showToast("warning", "Validation", "At least one session type must be selected.");
      return;
    }

    setSaving(true);
    try {
      const payload = {
        code:               form.code.trim().toUpperCase(),
        name:               form.name.trim(),
        credit_hours:       parseInt(form.credit_hours) || 3,
        level:              parseInt(form.level),
        has_lecture:        form.has_lecture,
        has_tutorial:       form.has_tutorial,
        has_lab:            form.has_lab,
        has_tut_lab:        form.has_tut_lab,
        groups_per_lecture: parseInt(form.groups_per_lecture) || 1,
        professor_id:       form.professor_id || null,
        ta_ids:             form.ta_ids,
      };

      const url = editingId
        ? `/api/coordinator/courses/${editingId}`
        : "/api/coordinator/courses";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to save");
      showToast(
        "success",
        editingId ? "Course Updated" : "Course Created",
        `${form.code} has been saved.`,
      );
      setShowModal(false);
      setForm({
        code:               "",
        name:               "",
        credit_hours:       "3",
        level:              "1",
        has_lecture:        true,
        has_tutorial:       false,
        has_lab:            false,
        has_tut_lab:        false,
        groups_per_lecture: "1",
        professor_id:       "",
        ta_ids:             [],
      });
      setEditingId(null);
      load();
    } catch (e) {
      showToast("danger", "Error", e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(courseId) {
    if (
      !confirm(
        "Are you sure you want to delete this course? This action cannot be undone.",
      )
    )
      return;
    try {
      const res = await fetch(`/api/coordinator/courses/${courseId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete course");
      showToast("success", "Deleted", "Course has been deleted.");
      load();
    } catch (e) {
      showToast("danger", "Error", e.message);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm({
      code:               "",
      name:               "",
      credit_hours:       "3",
      level:              "1",
      has_lecture:        true,
      has_tutorial:       false,
      has_lab:            false,
      has_tut_lab:        false,
      groups_per_lecture: "1",
      professor_id:       "",
      ta_ids:             [],
    });
    setShowModal(true);
  }

  function openEdit(course) {
    setEditingId(course.id);
    setForm({
      code:               course.code ?? "",
      name:               course.name ?? "",
      credit_hours:       String(course.credit_hours ?? 3),
      level:              String(course.level ?? 1),
      has_lecture:        course.has_lecture  ?? false,
      has_tutorial:       course.has_tutorial ?? false,
      has_lab:            course.has_lab      ?? false,
      has_tut_lab:        course.has_tut_lab  ?? false,
      groups_per_lecture: String(course.groups_per_lecture ?? 1),
      professor_id:       course.professor_id ?? "",
      ta_ids:             course.ta_ids       ?? [],
    });
    setShowModal(true);
  }

  const courses = data?.items ?? [];
  const filtered = courses.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.code.toLowerCase().includes(search.toLowerCase()),
  );
  const avgFill = courses.length
    ? Math.round(
        courses.reduce((a, c) => a + (c.fillRate ?? 0), 0) / courses.length,
      )
    : 0;

  const router = useRouter();

  function handleGoToImport() {
    router.push("/coordinator/import");
  }

  async function handleExportCatalog() {
    try {
      if (!courses || courses.length === 0) {
        showToast("info", "No Data", "There are no courses to export.");
        return;
      }

      const headers = [
        "id",
        "code",
        "name",
        "credits",
        "sections",
        "year_levels",
        "section_types",
        "fillRate",
      ];

      const rows = courses.map((c) => {
        const yearLevels = (c.year_levels || []).join("|");
        const sectionTypes = (c.section_types || [])
          .map((st) => `${st.type}:${st.duration_minutes}`)
          .join("|");

        return [
          c.id ?? "",
          c.code ?? "",
          c.name ?? "",
          String(c.credits ?? c.credit_hours ?? ""),
          String(c.sectionCount ?? c.sections ?? ""),
          yearLevels,
          sectionTypes,
          String(c.fillRate ?? ""),
        ];
      });

      const csv = [
        headers.join(","),
        ...rows.map((r) =>
          r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","),
        ),
      ].join("\n");

      const blob = new Blob([csv], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `courses_catalog_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      showToast(
        "success",
        "Export Started",
        "CSV download should begin shortly.",
      );
    } catch (e) {
      showToast("danger", "Export Failed", e.message || String(e));
    }
  }

  if (loading) return <SkeletonPage stats={3} rows={5} />;
  if (error)
    return (
      <div className="courses-page">
        <ErrorState message={error} onRetry={load} />
      </div>
    );

  return (
    <div className="courses-page">
      <main className="courses-shell">
        <div className="page-header">
          <h1>Course Offerings</h1>
          <p>
            Build sections, monitor enrollment pressure, and keep every course
            aligned with available rooms and teaching capacity.
          </p>
        </div>

        <section className="stats-grid reveal reveal-2">
          <StatCard
            label="Total Courses"
            value={String(data?.total ?? 0)}
            trend="This term"
            Icon={BookOpenIcon}
          />
          <StatCard
            label="Open Sections"
            value={String(
              courses.reduce((a, c) => a + (c.sectionCount ?? 0), 0),
            )}
            trend="Across all courses"
            Icon={BoltIcon}
          />
          <StatCard
            label="Avg Enrollment"
            value={`${avgFill}%`}
            trend="Fill rate"
            Icon={GraduationCapIcon}
          />
        </section>

        <section className="panel reveal reveal-3">
          <div className="panel-head">
            <div>
              <h2>Published Courses</h2>
              <p>Track section health and assignment readiness.</p>
            </div>
            <div className="panel-actions">
              <input
                className="search-input"
                placeholder="Search courses..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              <Button variant="primary" onClick={openCreate}>
                Create New Course
              </Button>
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="empty-msg">No courses found.</p>
          ) : (
            <div className="courses-grid">
              {/* CourseCard from components/ */}
              {filtered.map((course) => (
                <CourseCard
                  key={course.id}
                  course={course}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </section>

        <section className="quick-actions reveal reveal-4">
          <Button variant="ghost" onClick={handleGoToImport}>
            Import Course Data
          </Button>
          <Button variant="ghost" onClick={handleExportCatalog}>
            Export Catalog
          </Button>
        </section>
      </main>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={editingId ? "Edit Course" : "Create New Course"}
        description={
          editingId
            ? "Update course details."
            : "Add a new course to the current term."
        }
        footer={
          <div className="modal-footer-actions">
            <Button variant="ghost" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateOrUpdate}
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : editingId
                  ? "Update Course"
                  : "Create Course"}
            </Button>
          </div>
        }
      >
        <div className="form-grid">
          <Input
            label="Course Code"
            value={form.code}
            onChange={e => setForm(p => ({ ...p, code: e.target.value }))}
            placeholder="e.g. SET221"
          />
          <Input
            label="Course Name"
            value={form.name}
            onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Electronic Design Automation"
          />
          <Input
            label="Credit Hours"
            type="number"
            value={form.credit_hours}
            onChange={e => setForm(p => ({ ...p, credit_hours: e.target.value }))}
          />

          <div className="form-field">
            <label className="form-label">Level</label>
            <select
              className="form-select"
              value={form.level}
              onChange={e => setForm(p => ({ ...p, level: e.target.value }))}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: 14 }}
            >
              <option value="0">Freshman (Level 0)</option>
              <option value="1">Level 1</option>
              <option value="2">Level 2</option>
              <option value="3">Level 3</option>
              <option value="4">Level 4</option>
            </select>
          </div>

          <div className="form-field" style={{ gridColumn: "1 / -1", marginTop: "1rem" }}>
            <label className="form-label">Session Types</label>
            <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 8 }}>
              {[
                { key: "has_lecture",  label: "Lecture (2h)" },
                { key: "has_tutorial", label: "Tutorial (2h)" },
                { key: "has_lab",      label: "Lab (1h)" },
                { key: "has_tut_lab",  label: "Tutorial + Lab" },
              ].map(({ key, label }) => (
                <label key={key} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={form[key]}
                    onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))}
                  />
                  {label}
                </label>
              ))}
            </div>
          </div>

          {form.has_lecture && (
            <Input
              label="Groups per Lecture"
              type="number"
              value={form.groups_per_lecture}
              onChange={e => setForm(p => ({ ...p, groups_per_lecture: e.target.value }))}
              placeholder="1 = each group gets its own lecture"
            />
          )}

          <div className="form-field">
            <label className="form-label">Professor</label>
            <select
              className="form-select"
              value={form.professor_id}
              onChange={e => setForm(p => ({ ...p, professor_id: e.target.value }))}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: 14 }}
            >
              <option value="">— Unassigned —</option>
              {professors.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>

          <div className="form-field">
            <label className="form-label">Teaching Assistants</label>
            <select
              multiple
              value={form.ta_ids}
              onChange={e => setForm(p => ({
                ...p,
                ta_ids: Array.from(e.target.selectedOptions, o => o.value),
              }))}
              style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-border)", background: "var(--color-surface)", fontSize: 14, minHeight: 80 }}
            >
              {tas.map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <p style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 4 }}>
              Hold Ctrl/Cmd to select multiple TAs
            </p>
          </div>
        </div>
      </Modal>

      <Toast
        key={toast.id}
        open={toast.open}
        variant={toast.variant}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast((p) => ({ ...p, open: false }))}
        duration={3200}
      />
    </div>
  );
}
