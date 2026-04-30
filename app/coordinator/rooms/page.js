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
  const [editingId, setEditingId] = useState(null);

  const showToast = (variant, title, message) =>
    setToast({ open:true, variant, title, message, id:Date.now() });

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
    }
    finally { setLoading(false); }
  }, [building]);

  useEffect(() => { load(); }, [load]);

  async function handleCreateOrUpdate() {
    if (!form.name.trim() || !form.label.trim()) {
      showToast("warning", "Validation", "Room name and label are required.");
      return;
    }
    setSaving(true);
    try {
      const url = editingId ? `/api/coordinator/rooms/${editingId}` : "/api/coordinator/rooms";
      const method = editingId ? "PUT" : "POST";
      console.log(`📤 ${method} ROOM REQUEST:`, url);
      console.log("📤 REQUEST BODY:", form);
      const res  = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(form),
      });
      console.log(`📥 ${method} ROOM RESPONSE STATUS:`, res.status);
      const json = await res.json();
      console.log(`📥 ${method} ROOM RESPONSE DATA:`, json);
      if (!res.ok) throw new Error(json.message ?? "Failed to save");

      // Merge server response into local state so the new/updated room appears immediately
      const srvRoom = json.room || {};
      const roomObj = {
        id: srvRoom.id,
        label: srvRoom.label,
        name: srvRoom.name,
        building: srvRoom.building || "N/A",
        capacity: srvRoom.capacity || 30,
        createdAt: srvRoom.created_at ? (new Date(srvRoom.created_at)).toISOString() : (srvRoom.createdAt || new Date().toISOString()),
      };

      setData(prev => {
        const prevItems = prev?.items ?? [];
        if (editingId) {
          const items = prevItems.map(r => (r.id === editingId ? roomObj : r));
          return { ...prev, items };
        } else {
          return { ...prev, items: [...prevItems, roomObj], total: (prev?.total ?? 0) + 1 };
        }
      });

      showToast("success", editingId ? "Room Updated" : "Room Added", `${form.name} has been saved.`);
      setShowModal(false);
      setForm({ name:"", label:"", building:"", capacity:"30" });
      setEditingId(null);
    } catch (e) {
      console.error("❌ SAVE ROOM ERROR:", e);
      showToast("danger", "Error", e.message);
    }
    finally { setSaving(false); }
  }

  async function handleDelete(roomId) {
    if (!confirm("Are you sure you want to delete this room? This action cannot be undone.")) return;
    try {
      const url = `/api/coordinator/rooms/${roomId}`;
      console.log("📤 DELETE ROOM REQUEST:", url);
      const res = await fetch(url, { method: "DELETE" });
      console.log("📥 DELETE ROOM RESPONSE STATUS:", res.status);
      if (!res.ok) throw new Error("Failed to delete room");
      // Remove from local state so the UI updates immediately
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
    setForm({ name:"", label:"", building:"", capacity:"30" });
    setShowModal(true);
  }

  function openEdit(room) {
    setEditingId(room.id);
    setForm({ name: room.name, label: room.label, building: room.building || "", capacity: room.capacity || 30 });
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