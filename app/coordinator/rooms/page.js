"use client";

import { useState, useEffect, useCallback } from "react";
import "./styles.css";

import Button      from "@/components/Button";
import { StatCard } from "@/components/StatCard";
import Modal       from "@/components/Modal";
import Toast       from "@/components/Toast";
import Spinner     from "@/components/Spinner";
import ErrorState  from "@/components/ErrorState";
import { Input }   from "@/components/Input";
import RoomCard    from "@/components/RoomCard";
import { HomeIcon, BoltIcon, GraduationCapIcon } from "@/components/icons/index";

export default function CoordinatorRoomsPage() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [search,    setSearch]    = useState("");
  const [building,  setBuilding]  = useState("all");
  const [toast,     setToast]     = useState({ open:false, variant:"info", title:"", message:"", id:0 });
  const [form,      setForm]      = useState({ name:"", label:"", building:"", capacity:"30" });

  const showToast = (variant, title, message) =>
    setToast({ open:true, variant, title, message, id:Date.now() });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (building !== "all") params.set("building", building);
      const res  = await fetch(`/api/coordinator/rooms?${params}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to load");
      setData(json);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [building]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate() {
    if (!form.name.trim() || !form.label.trim()) {
      showToast("warning", "Validation", "Room name and label are required.");
      return;
    }
    setSaving(true);
    try {
      const res  = await fetch("/api/coordinator/rooms", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to create");
      showToast("success", "Room Added", `${form.name} has been added.`);
      setShowModal(false);
      setForm({ name:"", label:"", building:"", capacity:"30" });
      load();
    } catch (e) { showToast("danger", "Error", e.message); }
    finally { setSaving(false); }
  }

  const rooms     = data?.items ?? [];
  const buildings = ["all", ...new Set(rooms.map(r => r.building).filter(Boolean))];
  const filtered  = rooms.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.label.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="courses-page"><div className="review-loading"><Spinner size="lg" /></div></div>;
  if (error)   return <div className="courses-page"><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div className="courses-page">
      <main className="courses-shell">

        <section className="hero reveal reveal-1">
          <p className="hero-eyebrow">Coordinator Workspace</p>
          <h1>Room Management</h1>
          <p className="hero-subtitle">
            Track all classrooms, labs, and tutorial rooms available for scheduling.
          </p>
        </section>

        <section className="stats-grid reveal reveal-2">
          <StatCard label="Total Rooms"    value={String(data?.total ?? 0)}                                          trend="Available"       Icon={HomeIcon}          />
          <StatCard label="Buildings"      value={String(buildings.filter(b => b !== "all").length)}                 trend="On campus"       Icon={BoltIcon}          />
          <StatCard label="Total Capacity" value={String(rooms.reduce((a, r) => a + (r.capacity ?? 0), 0))}          trend="Seats available" Icon={GraduationCapIcon} />
        </section>

        <section className="panel reveal reveal-3">
          <div className="panel-head">
            <div>
              <h2>All Rooms</h2>
              <p>Manage classroom and facility resources.</p>
            </div>
            <div className="panel-actions">
              <input
                className="search-input"
                placeholder="Search rooms..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              <Button variant="primary" onClick={() => setShowModal(true)}>Add Room</Button>
            </div>
          </div>

          <div className="filter-tabs">
            {buildings.map(b => (
              <button
                key={b}
                className={`filter-tab ${building === b ? "filter-tab--active" : ""}`}
                onClick={() => setBuilding(b)}
              >
                {b === "all" ? "All Buildings" : b}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="empty-msg">No rooms found.</p>
          ) : (
            <div className="courses-grid">
              {/* RoomCard from components/ */}
              {filtered.map(room => (
                <RoomCard key={room.id} room={room} />
              ))}
            </div>
          )}
        </section>

        <section className="quick-actions reveal reveal-4">
          <Button variant="ghost">Export Room List</Button>
          <Button variant="ghost">Import Rooms CSV</Button>
        </section>

      </main>

      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Add New Room"
        description="Add a classroom, lab, or tutorial room."
        footer={
          <div className="modal-footer-actions">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreate} disabled={saving}>
              {saving ? "Adding..." : "Add Room"}
            </Button>
          </div>
        }
      >
        <div className="form-grid">
          <Input label="Room Name"  value={form.name}     onChange={e => setForm(p => ({ ...p, name:     e.target.value }))} placeholder="e.g. Room A202"  />
          <Input label="Label/Code" value={form.label}    onChange={e => setForm(p => ({ ...p, label:    e.target.value }))} placeholder="e.g. A202"        />
          <Input label="Building"   value={form.building} onChange={e => setForm(p => ({ ...p, building: e.target.value }))} placeholder="e.g. Building A"  />
          <Input label="Capacity"   value={form.capacity} onChange={e => setForm(p => ({ ...p, capacity: e.target.value }))} placeholder="30" type="number"  />
        </div>
      </Modal>

      <Toast key={toast.id} open={toast.open} variant={toast.variant} title={toast.title} message={toast.message} onClose={() => setToast(p => ({ ...p, open:false }))} duration={3200} />
    </div>
  );
}