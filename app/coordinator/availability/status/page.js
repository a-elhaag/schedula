"use client";

import { useState, useEffect, useCallback } from "react";
import "./styles.css";

import { StatCard }          from "@/components/StatCard";
import Spinner               from "@/components/Spinner";
import SkeletonPage          from "@/components/SkeletonPage";
import ErrorState            from "@/components/ErrorState";
import Button                from "@/components/Button";
import StaffAvailabilityRow  from "@/components/StaffAvailabilityRow";
import { CalendarIcon, WarningIcon, BoltIcon } from "@/components/icons/index";

export default function CoordinatorAvailabilityStatusPage() {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);
  const [filter,  setFilter]  = useState("all");

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const res  = await fetch("/api/coordinator/availability/status");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Failed to load");
      setData(json);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const staff    = data?.staff ?? [];
  const filtered = staff.filter(m =>
    filter === "all"       ? true :
    filter === "submitted" ? m.status === "submitted" :
    filter === "missing"   ? m.status !== "submitted" :
    m.role === filter
  );

  const submitted = staff.filter(m => m.status === "submitted").length;
  const missing   = staff.filter(m => m.status !== "submitted").length;
  const coverage  = staff.length ? Math.round((submitted / staff.length) * 100) : 0;

  if (loading) return <SkeletonPage stats={3} rows={6} />;
  if (error)   return <div className="courses-page"><ErrorState message={error} onRetry={load} /></div>;

  return (
    <div className="courses-page">
      <main className="courses-shell">

        <div className="page-header">
          <h1>Availability Status</h1>
          <p>Track which staff members have submitted their availability for the current term.</p>
        </div>

        <section className="stats-grid reveal reveal-2">
          <StatCard label="Submitted" value={String(submitted)} trend={`of ${staff.length} staff`}   trendUp Icon={CalendarIcon} />
          <StatCard label="Missing"   value={String(missing)}   trend="Not yet submitted" trendUp={false} Icon={WarningIcon}  />
          <StatCard label="Coverage"  value={`${coverage}%`}    trend="Availability filled" trendUp Icon={BoltIcon}     />
        </section>

        <section className="panel reveal reveal-3">
          <div className="panel-head">
            <div>
              <h2>Staff Availability</h2>
              <p>Click a row to see submitted time slots.</p>
            </div>
            <Button variant="ghost" onClick={load}>Refresh</Button>
          </div>

          <div className="filter-tabs">
            {[
              { key:"all",       label:"All"        },
              { key:"submitted", label:"Submitted"  },
              { key:"missing",   label:"Missing"    },
              { key:"professor", label:"Professors" },
              { key:"ta",        label:"TAs"        },
            ].map(f => (
              <button
                key={f.key}
                className={`filter-tab ${filter === f.key ? "filter-tab--active" : ""}`}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <p className="empty-msg">No staff found.</p>
          ) : (
            <div className="avail-list">
              {/* StaffAvailabilityRow from components/ */}
              {filtered.map(m => (
                <StaffAvailabilityRow key={m.id} member={m} />
              ))}
            </div>
          )}
        </section>

      </main>
    </div>
  );
}