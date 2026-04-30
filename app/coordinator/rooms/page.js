"use client";

import { useState, useEffect, useCallback } from "react";
import "./styles.css";

import Button       from "@/components/Button";
import { StatCard } from "@/components/StatCard";
import Modal        from "@/components/Modal";
import Toast        from "@/components/Toast";
import Spinner      from "@/components/Spinner";
import SkeletonPage from "@/components/SkeletonPage";
import ErrorState   from "@/components/ErrorState";
import { Input }    from "@/components/Input";
import RoomCard     from "@/components/RoomCard";
import { HomeIcon, BoltIcon, GraduationCapIcon } from "@/components/icons/index";

const EMPTY_FORM = { name: "", label: "", building: "", room_type: "lecture_hall", lab_type: "", groups_capacity: "1" };

export default function CoordinatorRoomsPage() {
  const [data,      setData]      = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [search,    setSearch]    = useState("");
  const [building,  setBuilding]  = useState("all");
  const [toast,     setToast]     = useState({ open: false, variant: "info", title: "", message: "", id: 0 });
  const [form,      setForm]      = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);

  const showToast = (variant, title, message) =>
    setToast({ open: true, variant, title, message, id: Date.now() });

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const params = new URLSearchParams();
      if (building !== "all") params.set("building", building);
      const url = `/api/coordinator/rooms?${params}`;
      console.log("📤 GET ROOMS REQUEST:", url);
      const res  = await fetch(url);
      console.log("📥 GET ROOMS RESPONSE STATUS:", res.status);
      const json = await res.json();
      console.log("📥 GET ROOMS RESPONSE DATA:", json);
      if (!res.ok) throw new Error(json.message ?? "Failed to load");
      setData(json.data);
    } catch (e) {
      console.error("❌ GET ROOMS ERROR:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [building]);

  useEffect(() => { load(); }, [load]);

  async function handleCreateOrUpdate() {
    if (!form.name.trim() || !form.label.trim()) {
      showToast("warning", "Validation", "Room name and label are required.");
      return;
    }
    setSaving(true);
    try {
      const url    = editingId ? `/api/coordinator/rooms/${editingId}` : "/api/coordinator/rooms";
      const method = editingId ? "PUT" : "POST";
      const body   = {
        name:            form.name,
        label:           form.label,
        building:        form.building,
        room_type:       form.room_type,
        lab_type:        form.room_type === "lab" ? (form.lab_type || null) : null,
        groups_capacity: parseInt(form.groups_capacity, 10),
      };
      console.log(`📤 ${method} ROOM REQUEST:`, url);
      console.log("📤 REQUEST BODY:", body);
      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      });
      console.log(`📥 ${method} ROOM RESPONSE STATUS:`, res.status);
      const json = await res.json();
      console.log(`📥 ${method} ROOM RESPONSE DATA:`, json);
      if (!res.ok) throw new Error(json.message ?? "Failed to save");

      const srvRoom = json.room || {};
      const roomObj = {
        id:              srvRoom.id,
        label:           srvRoom.label,
        name:            srvRoom.name,
        building:        srvRoom.building || "N/A",
        room_type:       srvRoom.room_type,
        lab_type:        srvRoom.lab_type ?? null,
        groups_capacity: srvRoom.groups_capacity ?? body.groups_capacity,
        createdAt:       srvRoom.created_at
          ? new Date(srvRoom.created_at).toISOString()
          : (srvRoom.createdAt || new Date().toISOString()),
      };

      setData(prev => {
        const prevItems = prev?.items ?? [];
        if (editingId) {
          const items = prevItems.map(r => (r.id === editingId ? roomObj : r));
          return { ...prev, items };
        }
        return { ...prev, items: [...prevItems, roomObj], total: (prev?.total ?? 0) + 1 };
      });

      showToast("success", editingId ? "Room Updated" : "Room Added", `${form.name} has been saved.`);
      setShowModal(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
    } catch (e) {
      console.error("❌ SAVE ROOM ERROR:", e);
      showToast("danger", "Error", e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(roomId) {
    if (!confirm("Are you sure you want to delete this room? This action cannot be undone.")) return;
    try {
      const url = `/api/coordinator/rooms/${roomId}`;
      console.log("📤 DELETE ROOM REQUEST:", url);
      const res = await fetch(url, { method: "DELETE" });
      console.log("📥 DELETE ROOM RESPONSE STATUS:", res.status);
      if (!res.ok) throw new Error("Failed to delete room");
      setData(prev => {
        const prevItems = prev?.items ?? [];
        const items = prevItems.filter(r => r.id !== roomId);
        return { ...prev, items, total: Math.max((prev?.total ?? 1) - 1, 0) };
      });
      showToast("success", "Deleted", "Room has been deleted.");
    } catch (e) {
      console.error("❌ DELETE ROOM ERROR:", e);
      showToast("danger", "Error", e.message);
    }
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowModal(true);
  }

  function openEdit(room) {
    setEditingId(room.id);
    setForm({
      name:            room.name,
      label:           room.label,
      building:        room.building || "",
      room_type:       room.room_type || "lecture_hall",
      lab_type:        room.lab_type  || "",
      groups_capacity: String(room.groups_capacity ?? 1),
    });
    setShowModal(true);
  }

  const rooms     = data?.items ?? [];
  const buildings = ["all", ...new Set(rooms.map(r => r.building).filter(Boolean))];
  const filtered  = rooms.filter(r =>
    r.name.toLowerCase().includes(search.toLowerCase()) ||
    r.label.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <SkeletonPage stats={3} rows={5} />;
  if (error)   return <div className="courses-page"><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div className="courses-page">
      <main className="courses-shell">
        <div className="page-header">
          <h1>Room Management</h1>
          <p>Track all classrooms, labs, and tutorial rooms available for scheduling.</p>
        </div>

        <section className="stats-grid reveal reveal-2">
          <StatCard label="Total Rooms"   value={String(data?.total ?? 0)}                                                  trend="Available"        Icon={HomeIcon}          />
          <StatCard label="Buildings"     value={String(buildings.filter(b => b !== "all").length)}                          trend="On campus"        Icon={BoltIcon}          />
          <StatCard label="Total Groups"  value={String(rooms.reduce((a, r) => a + (r.groups_capacity ?? 0), 0))}            trend="Groups available" Icon={GraduationCapIcon} />
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
              <Button variant="primary" onClick={openCreate}>Add Room</Button>
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
              {filtered.map(room => (
                <RoomCard key={room.id} room={room} onEdit={openEdit} onDelete={handleDelete} />
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
        title={editingId ? "Edit Room" : "Add New Room"}
        description={editingId ? "Update room details." : "Add a classroom, lab, or tutorial room."}
        footer={
          <div className="modal-footer-actions">
            <Button variant="ghost" onClick={() => setShowModal(false)}>Cancel</Button>
            <Button variant="primary" onClick={handleCreateOrUpdate} disabled={saving}>
              {saving ? "Saving..." : (editingId ? "Update Room" : "Add Room")}
            </Button>
          </div>
        }
      >
        <div className="form-grid">
          <Input label="Room Name"  value={form.name}     onChange={e => setForm(p => ({ ...p, name:     e.target.value }))} placeholder="e.g. Room A202" />
          <Input label="Label/Code" value={form.label}    onChange={e => setForm(p => ({ ...p, label:    e.target.value }))} placeholder="e.g. A202"       />
          <Input label="Building"   value={form.building} onChange={e => setForm(p => ({ ...p, building: e.target.value }))} placeholder="e.g. Building A" />

          <div className="input-container">
            <label className="input-label">Room Type</label>
            <select
              className="input-field"
              value={form.room_type}
              onChange={e => setForm(p => ({ ...p, room_type: e.target.value, lab_type: "" }))}
            >
              <option value="lecture_hall">Lecture Hall</option>
              <option value="tutorial_room">Tutorial Room</option>
              <option value="lab">Lab</option>
            </select>
          </div>

          {form.room_type === "lab" && (
            <div className="input-container">
              <label className="input-label">Lab Type</label>
              <select
                className="input-field"
                value={form.lab_type}
                onChange={e => setForm(p => ({ ...p, lab_type: e.target.value }))}
              >
                <option value="">Select lab type...</option>
                <option value="computer_lab">Computer Lab</option>
                <option value="physics_lab">Physics Lab</option>
                <option value="chemistry_lab">Chemistry Lab</option>
                <option value="metal_workshop">Metal Workshop</option>
              </select>
            </div>
          )}

          <div className="input-container">
            <label className="input-label">Groups Capacity</label>
            <select
              className="input-field"
              value={form.groups_capacity}
              onChange={e => setForm(p => ({ ...p, groups_capacity: e.target.value }))}
            >
              {Array.from({ length: 10 }, (_, i) => i + 1).map(n => (
                <option key={n} value={String(n)}>{n}</option>
              ))}
            </select>
          </div>
        </div>
      </Modal>

      <Toast
        key={toast.id}
        open={toast.open}
        variant={toast.variant}
        title={toast.title}
        message={toast.message}
        onClose={() => setToast(p => ({ ...p, open: false }))}
        duration={3200}
      />
    </div>
  );
}