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
import { UserIcon, BoltIcon, WarningIcon } from "@/components/icons/index";

export default function CoordinatorStaffPage() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [filter,    setFilter]    = useState("all");
  const [search,    setSearch]    = useState("");
  const [toast,     setToast]     = useState({ open:false, variant:"info", title:"", message:"", id:0 });
  const [form,      setForm]      = useState({ name:"", email:"", role:"professor" });

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
      const res  = await fetch("/api/coordinator/staff", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to add");
      showToast("success", "Staff Added", `${form.name} has been invited.`);
      setShowModal(false);
      setForm({ name:"", email:"", role:"professor" });
      load();
    } catch (e) { showToast("danger", "Error", e.message); }
    finally { setSaving(false); }
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
              {/* MemberCard from components/ */}
              {filtered.map(member => (
                <MemberCard key={member.id} member={member} />
              ))}
            </div>
          )}
        </section>

        <section className="quick-actions reveal reveal-4">
          <Button variant="ghost">Export Summary</Button>
          <Button variant="ghost">Manage Constraints</Button>
        </section>

      </main>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add Staff Member"
        description="Invite a professor or TA to join this institution."
        footer={
          <div className="modal-footer-actions">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleAddStaff} disabled={saving}>
              {saving ? "Adding..." : "Send Invitation"}
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

      <Toast key={toast.id} open={toast.open} variant={toast.variant} title={toast.title} message={toast.message} onClose={() => setToast(p => ({ ...p, open:false }))} duration={3200} />
    </div>
  );
}