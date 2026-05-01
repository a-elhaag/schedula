"use client";

import { useState, useEffect, useCallback } from "react";
import "./styles.css";

import Button      from "@/components/Button";
import { StatCard } from "@/components/StatCard";
import Modal       from "@/components/Modal";
import Toast       from "@/components/Toast";
import Spinner     from "@/components/Spinner";
import SkeletonPage from "@/components/SkeletonPage";
import ErrorState  from "@/components/ErrorState";
import { Input }   from "@/components/Input";
import MemberCard  from "@/components/MemberCard";
import ConfirmDialog from "@/components/ConfirmDialog";
import { UserIcon, BoltIcon, WarningIcon, TrashIcon, EditIcon, DownloadIcon } from "@/components/icons/index";

export default function CoordinatorStaffPage() {
  const [data,          setData]          = useState(null);
  const [loading,       setLoading]       = useState(true);
  const [error,         setError]         = useState(null);
  const [showModal,     setShowModal]     = useState(false);
  const [saving,        setSaving]        = useState(false);
  const [filter,        setFilter]        = useState("all");
  const [search,        setSearch]        = useState("");
  const [toast,         setToast]         = useState({ open:false, variant:"info", title:"", message:"", id:0 });
  const [form,          setForm]          = useState({ name:"", email:"", role:"professor" });
  const [editingId,     setEditingId]     = useState(null);
  const [deleteId,      setDeleteId]      = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const showToast = (variant, title, message) =>
    setToast({ open:true, variant, title, message, id:Date.now() });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("role", filter);
      const res  = await fetch(`/api/coordinator/staff?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to load");
      setData(json);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function handleAddStaff() {
    if (!form.name.trim() || !form.email.trim()) {
      showToast("warning", "Validation", "Name and email are required.");
      return;
    }
    setSaving(true);
    try {
      const method = editingId ? "PUT" : "POST";
      const url    = editingId ? `/api/coordinator/staff/${editingId}` : "/api/coordinator/staff";
      const res    = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? `Failed to ${editingId ? "update" : "add"}`);
      showToast("success", editingId ? "Staff Updated" : "Staff Added", `${form.name} has been ${editingId ? "updated" : "invited"}.`);
      setShowModal(false);
      setEditingId(null);
      setForm({ name:"", email:"", role:"professor" });
      load();
    } catch (e) { showToast("danger", "Error", e.message); }
    finally { setSaving(false); }
  }

  async function handleDeleteStaff() {
    if (!deleteId) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/coordinator/staff/${deleteId}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to delete");
      showToast("success", "Staff Deleted", "Staff member has been removed.");
      setShowDeleteConfirm(false);
      setDeleteId(null);
      load();
    } catch (e) { showToast("danger", "Error", e.message); }
    finally { setSaving(false); }
  }

  function openEditModal(member) {
    setForm({ name: member.name, email: member.email, role: member.role });
    setEditingId(member.id);
    setShowModal(true);
  }

  function openDeleteConfirm(memberId) {
    setDeleteId(memberId);
    setShowDeleteConfirm(true);
  }

  async function handleExportSummary() {
    try {
      const params = new URLSearchParams();
      if (filter !== "all") params.set("role", filter);
      const res = await fetch(`/api/coordinator/staff/export?${params}`);
      if (!res.ok) throw new Error("Failed to export");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `staff-summary-${Date.now()}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      showToast("success", "Export Complete", "Staff summary exported successfully.");
    } catch (e) { showToast("danger", "Error", e.message); }
  }

  const staff      = data?.items ?? [];
  const filtered   = staff.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase())
  );
  const professors = staff.filter(s => s.role === "professor").length;
  const tas        = staff.filter(s => s.role === "ta").length;
  const highLoad   = staff.filter(s => (s.workload ?? 0) >= 85).length;

  if (loading) return <SkeletonPage stats={3} rows={5} />;
  if (error)   return <div className="staff-page"><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div className="staff-page">
      <main className="staff-shell">
        <div className="page-header">
          <h1>Staff Management</h1>
          <p>Coordinate faculty and teaching assistants, balance workload, and fill scheduling gaps before timetable generation.</p>
        </div>

        <section className="overview-grid reveal reveal-2">
          <StatCard label="Academic Staff"      value={String(professors)} trend="Professors"         trendUp Icon={UserIcon}    />
          <StatCard label="Teaching Assistants" value={String(tas)}        trend="TAs"                trendUp Icon={BoltIcon}   />
          <StatCard label="High Workload"       value={String(highLoad)}   trend="Over 85% capacity"  trendUp={false} Icon={WarningIcon} />
        </section>

        <section className="panel reveal reveal-3">
          <div className="panel-head">
            <div>
              <h2>Assigned Staff</h2>
              <p>Overview of availability and current teaching load.</p>
            </div>
            <div className="panel-actions">
              <input
                className="search-input"
                placeholder="Search staff..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <Button variant="primary" onClick={() => setShowModal(true)}>
                Add Staff Member
              </Button>
            </div>
          </div>

          <div className="filter-tabs">
            {["all","professor","ta"].map(f => (
              <button
                key={f}
                className={`filter-tab ${filter === f ? "filter-tab--active" : ""}`}
                onClick={() => setFilter(f)}
              >
                {f === "all" ? "All" : f === "professor" ? "Professors" : "Teaching Assistants"}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="empty-msg">No staff members found.</p>
          ) : (
            <div className="staff-grid">
              {filtered.map(member => (
                <div key={member.id} className="member-card-wrapper">
                  <MemberCard member={member} />
                  <div className="member-actions">
                    <button
                      className="action-btn edit-btn"
                      title="Edit"
                      onClick={() => openEditModal(member)}
                    >
                      <EditIcon />
                    </button>
                    <button
                      className="action-btn delete-btn"
                      title="Delete"
                      onClick={() => openDeleteConfirm(member.id)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="quick-actions reveal reveal-4">
          <Button variant="ghost" onClick={handleExportSummary}>
            <DownloadIcon /> Export Summary
          </Button>
          <Button variant="ghost" onClick={() => window.location.href = "/coordinator/constraints"}>
            Manage Constraints
          </Button>
        </section>

      </main>

      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingId(null);
          setForm({ name:"", email:"", role:"professor" });
        }}
        title={editingId ? "Edit Staff Member" : "Add Staff Member"}
        description={editingId ? "Update staff member details." : "Invite a professor or TA to join this institution."}
        footer={
          <div className="modal-footer-actions">
            <Button variant="ghost" onClick={() => {
              setShowModal(false);
              setEditingId(null);
              setForm({ name:"", email:"", role:"professor" });
            }}>Cancel</Button>
            <Button variant="primary" onClick={handleAddStaff} disabled={saving}>
              {saving ? (editingId ? "Updating..." : "Adding...") : (editingId ? "Update Staff" : "Send Invitation")}
            </Button>
          </div>
        }
      >
        <div className="form-grid">
          <Input label="Full Name"      value={form.name}  onChange={e => setForm(p => ({ ...p, name:  e.target.value }))} placeholder="Dr. Full Name"       />
          <Input label="Email Address"  value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="name@university.edu" type="email" />
          <div className="form-field">
            <label className="form-label">Role</label>
            <div className="role-options">
              {["professor","ta"].map(r => (
                <label key={r} className={`role-option ${form.role === r ? "role-option--active" : ""}`}>
                  <input type="radio" name="role" value={r} checked={form.role === r} onChange={() => setForm(p => ({ ...p, role: r }))} />
                  {r === "professor" ? "Professor" : "Teaching Assistant"}
                </label>
              ))}
            </div>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        isOpen={showDeleteConfirm}
        title="Delete Staff Member"
        message="Are you sure you want to delete this staff member? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        variant="danger"
        onConfirm={handleDeleteStaff}
        onCancel={() => {
          setShowDeleteConfirm(false);
          setDeleteId(null);
        }}
        isLoading={saving}
      />

      <Toast key={toast.id} open={toast.open} variant={toast.variant} title={toast.title} message={toast.message} onClose={() => setToast(p => ({ ...p, open:false }))} duration={3200} />
    </div>
  );
}