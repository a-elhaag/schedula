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
    code: "",
    name: "",
    credit_hours: "3",
    sections: "1",
  });
  const [editingId, setEditingId] = useState(null);

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

  useEffect(() => {
    load();
  }, [load]);

  async function handleCreateOrUpdate() {
    if (!form.code.trim() || !form.name.trim()) {
      showToast("warning", "Validation", "Course code and name are required.");
      return;
    }
    setSaving(true);
    try {
      const url = editingId
        ? `/api/coordinator/courses/${editingId}`
        : "/api/coordinator/courses";
      const method = editingId ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to save");
      showToast(
        "success",
        editingId ? "Course Updated" : "Course Created",
        `${form.code} has been saved.`,
      );
      setShowModal(false);
      setForm({ code: "", name: "", credit_hours: "3", sections: "1" });
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
    setForm({ code: "", name: "", credit_hours: "3", sections: "1" });
    setShowModal(true);
  }

  function openEdit(course) {
    setEditingId(course.id);
    setForm({
      code: course.code,
      name: course.name,
      credit_hours: course.credits || 3,
      sections: course.sectionCount || 1,
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

      const headers = ["id", "code", "name", "credits", "sections", "fillRate"];
      const rows = courses.map((c) => [
        c.id ?? "",
        c.code ?? "",
        c.name ?? "",
        String(c.credits ?? c.credit_hours ?? ""),
        String(c.sectionCount ?? c.sections ?? ""),
        String(c.fillRate ?? ""),
      ]);

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
            onChange={(e) => setForm((p) => ({ ...p, code: e.target.value }))}
            placeholder="e.g. CS301"
          />
          <Input
            label="Course Name"
            value={form.name}
            onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            placeholder="e.g. Operating Systems"
          />
          <Input
            label="Credit Hours"
            value={form.credit_hours}
            onChange={(e) =>
              setForm((p) => ({ ...p, credit_hours: e.target.value }))
            }
            placeholder="3"
            type="number"
          />
          <Input
            label="Number of Sections"
            value={form.sections}
            onChange={(e) =>
              setForm((p) => ({ ...p, sections: e.target.value }))
            }
            placeholder="1"
            type="number"
          />
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
