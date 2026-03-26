"use client";

import { useState, useEffect, useCallback } from "react";
import "./styles.css";

import Button     from "@/components/Button";
import Toast      from "@/components/Toast";
import Spinner    from "@/components/Spinner";
import ErrorState from "@/components/ErrorState";
import { Input }  from "@/components/Input";
import Switch from "@/components/Switch";
import { GearIcon, UserIcon, BoltIcon } from "@/components/icons/index";

// ── SettingsSection ────────────────────────────────────────────────────────────
function SettingsSection({ title, description, children }) {
  return (
    <div className="panel reveal reveal-3" style={{ marginBottom:20 }}>
      <div style={{ marginBottom:20 }}>
        <h2>{title}</h2>
        <p style={{ color:"var(--color-text-muted)", fontSize:14, marginTop:4 }}>{description}</p>
      </div>
      {children}
    </div>
  );
}

// ── SettingsRow ────────────────────────────────────────────────────────────────
function SettingsRow({ label, description, children }) {
  return (
    <div className="settings-row">
      <div className="settings-row__info">
        <p className="settings-row__label">{label}</p>
        {description && <p className="settings-row__desc">{description}</p>}
      </div>
      <div className="settings-row__control">{children}</div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CoordinatorSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState(null);
  const [toast,   setToast]   = useState({ open:false, variant:"info", title:"", message:"", id:0 });

  const [profile, setProfile] = useState({ name:"", email:"" });
  const [notifs,  setNotifs]  = useState({
    email_on_publish:      true,
    email_on_conflict:     true,
    email_on_availability: false,
  });
  const [prefs, setPrefs] = useState({
    default_view:        "weekly",
    show_room_labels:    true,
    compact_schedule:    false,
    auto_detect_conflicts: true,
  });

  const showToast = (variant, title, message) =>
    setToast({ open:true, variant, title, message, id:Date.now() });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/coordinator/settings");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to load");
      if (json.profile) setProfile(json.profile);
      if (json.notifs)  setNotifs(json.notifs);
      if (json.prefs)   setPrefs(json.prefs);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave(section) {
    setSaving(true);
    try {
      const res  = await fetch("/api/coordinator/settings", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ section, profile, notifs, prefs }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to save");
      showToast("success", "Settings Saved", "Your preferences have been updated.");
    } catch (e) { showToast("danger", "Error", e.message); }
    finally { setSaving(false); }
  }

  if (loading) return <div className="courses-page"><div className="review-loading"><Spinner size="lg" /></div></div>;
  if (error)   return <div className="courses-page"><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div className="courses-page">
      <main className="courses-shell">

        <section className="hero reveal reveal-1">
          <p className="hero-eyebrow">Coordinator Workspace</p>
          <h1>Settings</h1>
          <p className="hero-subtitle">
            Manage your profile, notification preferences, and scheduling display options.
          </p>
        </section>

        {/* Profile */}
        <SettingsSection title="Profile" description="Update your account information.">
          <div className="form-grid" style={{ marginBottom:20 }}>
            <Input label="Full Name"    value={profile.name}  onChange={e => setProfile(p => ({ ...p, name:  e.target.value }))} placeholder="Your name"  />
            <Input label="Email Address" value={profile.email} onChange={e => setProfile(p => ({ ...p, email: e.target.value }))} placeholder="Your email" type="email" />
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end" }}>
            <Button variant="primary" onClick={() => handleSave("profile")} disabled={saving}>
              {saving ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </SettingsSection>

        {/* Notifications */}
        <SettingsSection title="Notifications" description="Choose which events trigger email notifications.">
          <div className="settings-list">
            <SettingsRow label="Schedule Published" description="Notify when a schedule is approved and published.">
              <Switch checked={notifs.email_on_publish} onChange={v => setNotifs(p => ({ ...p, email_on_publish: v }))} />
            </SettingsRow>
            <SettingsRow label="Conflicts Detected" description="Notify when the solver detects scheduling conflicts.">
              <Switch checked={notifs.email_on_conflict} onChange={v => setNotifs(p => ({ ...p, email_on_conflict: v }))} />
            </SettingsRow>
            <SettingsRow label="Availability Submitted" description="Notify when staff submit their availability.">
              <Switch checked={notifs.email_on_availability} onChange={v => setNotifs(p => ({ ...p, email_on_availability: v }))} />
            </SettingsRow>
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginTop:20 }}>
            <Button variant="primary" onClick={() => handleSave("notifs")} disabled={saving}>
              {saving ? "Saving..." : "Save Notifications"}
            </Button>
          </div>
        </SettingsSection>

        {/* Display preferences */}
        <SettingsSection title="Display Preferences" description="Customize how the schedule is shown.">
          <div className="settings-list">
            <SettingsRow label="Show Room Labels" description="Display room codes next to session names.">
              <Switch checked={prefs.show_room_labels} onChange={v => setPrefs(p => ({ ...p, show_room_labels: v }))} />
            </SettingsRow>
            <SettingsRow label="Compact Schedule View" description="Show a more condensed version of the timetable.">
              <Switch checked={prefs.compact_schedule} onChange={v => setPrefs(p => ({ ...p, compact_schedule: v }))} />
            </SettingsRow>
            <SettingsRow label="Auto-Detect Conflicts" description="Automatically check for conflicts after loading.">
              <Switch checked={prefs.auto_detect_conflicts} onChange={v => setPrefs(p => ({ ...p, auto_detect_conflicts: v }))} />
            </SettingsRow>
          </div>
          <div style={{ display:"flex", justifyContent:"flex-end", marginTop:20 }}>
            <Button variant="primary" onClick={() => handleSave("prefs")} disabled={saving}>
              {saving ? "Saving..." : "Save Preferences"}
            </Button>
          </div>
        </SettingsSection>

      </main>

      <Toast key={toast.id} open={toast.open} variant={toast.variant} title={toast.title} message={toast.message} onClose={() => setToast(p => ({ ...p, open:false }))} duration={3200} />
    </div>
  );
}