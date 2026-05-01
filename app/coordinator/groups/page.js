"use client";
import { useState, useEffect, useCallback } from "react";
import "./styles.css";
import Button from "@/components/Button";
import Toast from "@/components/Toast";
import SkeletonPage from "@/components/SkeletonPage";
import ErrorState from "@/components/ErrorState";
import { Input } from "@/components/Input";
import { GraduationCapIcon } from "@/components/icons/index";

export default function CoordinatorGroupsPage() {
  const [levels, setLevels]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [saving, setSaving]   = useState(false);
  const [toast, setToast]     = useState({ open: false, variant: "info", title: "", message: "", id: 0 });

  const showToast = (v, t, m) => setToast({ open: true, variant: v, title: t, message: m, id: Date.now() });

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res  = await fetch("/api/coordinator/groups");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to load");
      setLevels(json.levels ?? []);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  function updateSubgroupCount(lvIdx, gIdx, value) {
    setLevels(prev => prev.map((lv, li) =>
      li !== lvIdx ? lv : {
        ...lv,
        groups: lv.groups.map((g, gi) =>
          gi !== gIdx ? g : { ...g, subgroup_count: Math.max(0, parseInt(value) || 0) }
        ),
      }
    ));
  }

  function addGroup(lvIdx) {
    setLevels(prev => prev.map((lv, li) => {
      if (li !== lvIdx) return lv;
      const next   = lv.groups.length + 1;
      const prefix = lv.level === 0
        ? String.fromCharCode(65 + lv.groups.length)
        : `G${next}`;
      return { ...lv, groups: [...lv.groups, { group_id: prefix, subgroup_count: 3 }] };
    }));
  }

  function removeGroup(lvIdx, gIdx) {
    setLevels(prev => prev.map((lv, li) =>
      li !== lvIdx ? lv : { ...lv, groups: lv.groups.filter((_, gi) => gi !== gIdx) }
    ));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/coordinator/groups", {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ levels }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to save");
      showToast("success", "Saved", "Level configuration saved successfully.");
    } catch (e) {
      showToast("danger", "Error", e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <SkeletonPage stats={4} rows={3} />;
  if (error)   return <div className="groups-page"><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div className="groups-page">
      <main className="groups-shell">
        <div className="page-header">
          <h1>Level Groups</h1>
          <p>Configure groups and subgroups per academic level. The solver uses this to expand courses into individual sessions.</p>
        </div>

        {levels.length === 0 && (
          <div className="panel reveal" style={{ padding: "32px 24px", textAlign: "center", color: "var(--color-text-muted)" }}>
            <p style={{ marginBottom: 16 }}>No levels configured yet. Run <code>pnpm db:seed:ecu</code> to load ECU defaults, or add levels manually below.</p>
            <Button variant="ghost" onClick={() => setLevels([{ level: 1, label: "Level 1", groups: [{ group_id: "G1", subgroup_count: 3 }] }])}>
              + Add First Level
            </Button>
          </div>
        )}

        {levels.map((lv, lvIdx) => (
          <section key={lv.level} className="panel reveal" style={{ marginBottom: 20 }}>
            <div className="panel-head">
              <div>
                <h2>
                  {lv.label}
                  <span style={{ fontSize: 12, color: "var(--color-text-muted)", marginLeft: 8 }}>
                    (Level {lv.level})
                  </span>
                </h2>
                <p>{lv.groups.length} group{lv.groups.length !== 1 ? "s" : ""}</p>
              </div>
              <Button variant="ghost" onClick={() => addGroup(lvIdx)}>+ Add Group</Button>
            </div>

            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 12 }}>
              {lv.groups.map((g, gIdx) => (
                <div
                  key={gIdx}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "10px 14px",
                    background: "var(--color-surface)",
                    borderRadius: 12,
                    border: "1px solid var(--color-border)",
                  }}
                >
                  <GraduationCapIcon size={14} />
                  <span style={{ fontWeight: 600, fontSize: 13 }}>{g.group_id}</span>
                  <Input
                    type="number"
                    value={g.subgroup_count}
                    onChange={e => updateSubgroupCount(lvIdx, gIdx, e.target.value)}
                    style={{ width: 70, textAlign: "center" }}
                    title="Subgroup count (0 = no subgroups)"
                  />
                  <span style={{ fontSize: 11, color: "var(--color-text-muted)" }}>subgroups</span>
                  <button
                    onClick={() => removeGroup(lvIdx, gIdx)}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#FF3B30", fontSize: 16, lineHeight: 1 }}
                    title="Remove group"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </section>
        ))}

        <div style={{ marginTop: 24 }}>
          <Button variant="primary" onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Save Configuration"}
          </Button>
        </div>
      </main>

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
