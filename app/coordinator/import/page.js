"use client";

import { useState, useEffect, useCallback } from "react";
import CSVImportDropzone from "@/components/CSVImportDropzone";
import Toast             from "@/components/Toast";
import { StatCard }      from "@/components/StatCard";
import Button            from "@/components/Button";
import Spinner           from "@/components/Spinner";
import SkeletonPage      from "@/components/SkeletonPage";
import ErrorState        from "@/components/ErrorState";
import Badge             from "@/components/Badge";
import { DownloadIcon, BoltIcon, WarningIcon } from "@/components/icons/index";
import "./styles.css";

// ── DatasetCard ───────────────────────────────────────────────────────────────
function DatasetCard({ dataset }) {
  const statusVariant = {
    Ready:   "success",
    Mapping: "warning",
    Review:  "info",
    Error:   "danger",
  }[dataset.status] ?? "default";

  return (
    <article className="dataset-card">
      <div className="dataset-head">
        <p className="dataset-name">{dataset.name}</p>
        <Badge variant={statusVariant} size="sm">{dataset.status}</Badge>
      </div>
      <p className="dataset-file">{dataset.file}</p>
      <div className="dataset-meta">
        <p>{dataset.rows} rows</p>
        <p>{dataset.progress}% complete</p>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ "--import-progress": `${dataset.progress}%` }} />
      </div>
    </article>
  );
}

// ── ValidationCard ────────────────────────────────────────────────────────────
function ValidationCard({ result }) {
  if (!result) return null;
  const hasErrors   = result.errors?.length   > 0;
  const hasWarnings = result.warnings?.length > 0;

  return (
    <article className={`validation-card ${hasErrors ? "validation-card--error" : ""}`}>
      <h3>Validation Result</h3>
      <p className="validation-summary">
        {result.valid} valid rows &nbsp;|&nbsp;
        {result.errors?.length ?? 0} errors &nbsp;|&nbsp;
        {result.warnings?.length ?? 0} warnings
      </p>
      {hasErrors && (
        <ul className="validation-list validation-list--error">
          {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e}</li>)}
          {result.errors.length > 5 && <li>...and {result.errors.length - 5} more</li>}
        </ul>
      )}
      {hasWarnings && !hasErrors && (
        <ul className="validation-list validation-list--warning">
          {result.warnings.slice(0, 5).map((w, i) => <li key={i}>{w}</li>)}
        </ul>
      )}
    </article>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function CoordinatorImportPage() {
  const [csvFile,      setCsvFile]      = useState(null);
  const [datasetType,  setDatasetType]  = useState("courses");
  const [validating,   setValidating]   = useState(false);
  const [importing,    setImporting]    = useState(false);
  const [validation,   setValidation]   = useState(null);
  const [stats,        setStats]        = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(null);
  const [toast,        setToast]        = useState({ open: false, variant: "info", title: "", message: "", id: 0 });

  const showToast = (variant, title, message) =>
    setToast({ open: true, variant, title, message, id: Date.now() });

  // Load import stats on mount
  const loadStats = useCallback(async () => {
    setLoading(true);
    try {
      const res  = await fetch("/api/coordinator/import");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message);
      setStats(json);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStats(); }, [loadStats]);

  // Validate CSV client-side (basic) then send to server
  async function handleValidate() {
    if (!csvFile) return;
    setValidating(true);
    setValidation(null);
    try {
      const text = await csvFile.text();
      const lines = text.trim().split("\n");
      const headers = lines[0]?.split(",").map(h => h.trim().toLowerCase()) ?? [];

      // Basic client-side header check
      const requiredHeaders = {
        courses: ["code", "name", "credit_hours"],
        staff:   ["name", "email", "role"],
        rooms:   ["name", "label", "building"],
      }[datasetType] ?? [];

      const missing = requiredHeaders.filter(h => !headers.includes(h));
      if (missing.length > 0) {
        setValidation({
          valid:    0,
          errors:   [`Missing required columns: ${missing.join(", ")}`],
          warnings: [],
        });
        showToast("warning", "Validation Failed", "Fix missing columns and re-upload.");
        return;
      }

      // Send to server for deep validation
      const formData = new FormData();
      formData.append("file", csvFile);
      formData.append("type", datasetType);

      const res  = await fetch("/api/coordinator/import/validate", {
        method: "POST",
        body:   formData,
      });
      const json = await res.json();
      setValidation(json);

      if (json.errors?.length > 0) {
        showToast("warning", "Validation Issues", `${json.errors.length} errors found.`);
      } else {
        showToast("success", "Validation Passed", `${json.valid} rows ready to import.`);
      }
    } catch (e) {
      showToast("danger", "Error", e.message);
    } finally {
      setValidating(false);
    }
  }

  // Import to DB
  async function handleImport() {
    if (!csvFile || !validation || validation.errors?.length > 0) return;
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append("file", csvFile);
      formData.append("type", datasetType);

      const res  = await fetch("/api/coordinator/import", {
        method: "POST",
        body:   formData,
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message ?? "Import failed");

      showToast("success", "Import Complete", `${json.imported} records imported successfully.`);
      setCsvFile(null);
      setValidation(null);
      loadStats();
    } catch (e) {
      showToast("danger", "Import Failed", e.message);
    } finally {
      setImporting(false);
    }
  }

  const datasets = stats?.recentImports ?? [];

  if (loading) return <SkeletonPage stats={3} rows={4} />;
  if (error)   return <div className="import-page"><ErrorState message={error} onRetry={loadStats} /></div>;

  return (
    <div className="import-page">
      <main className="import-shell">

        {/* Hero */}
        <section className="hero reveal reveal-1">
          <p className="hero-eyebrow">Coordinator Workspace</p>
          <h1>Import Data</h1>
          <p className="hero-subtitle">
            Bring in course, staff, and room datasets with validation checks
            before publishing the scheduling baseline.
          </p>
        </section>

        {/* Stats */}
        <section className="stats-grid reveal reveal-2">
          <StatCard label="Total Courses" value={String(stats?.coursesCount ?? 0)} trend="In database"      Icon={BoltIcon}    />
          <StatCard label="Staff Members" value={String(stats?.staffCount   ?? 0)} trend="Professors + TAs" Icon={DownloadIcon} />
          <StatCard label="Rooms"         value={String(stats?.roomsCount   ?? 0)} trend="Available"        Icon={WarningIcon}  />
        </section>

        {/* Upload panel */}
        <section className="panel reveal reveal-3">
          <div className="panel-head">
            <div>
              <h2>{csvFile ? "File Loaded" : "Import New CSV"}</h2>
              <p>{csvFile ? `${csvFile.name} ready for validation.` : "Select a CSV file to begin."}</p>
            </div>
          </div>

          {/* Dataset type selector */}
          <div className="dataset-type-tabs">
            {["courses","staff","rooms"].map(t => (
              <button
                key={t}
                className={`filter-tab ${datasetType === t ? "filter-tab--active" : ""}`}
                onClick={() => { setDatasetType(t); setValidation(null); }}
              >
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          <div className="dropzone-container">
            <CSVImportDropzone
              onFileSelect={file => {
                setCsvFile(file);
                setValidation(null);
                showToast("success", "CSV Loaded", `${file.name} is ready for validation.`);
              }}
            />
          </div>

          {csvFile && (
            <div className="upload-queue-actions">
              <Button variant="ghost" onClick={() => { setCsvFile(null); setValidation(null); }}>
                Clear File
              </Button>
              <Button variant="ghost" onClick={handleValidate} disabled={validating}>
                {validating ? "Validating..." : "Validate CSV"}
              </Button>
              <Button
                variant="primary"
                onClick={handleImport}
                disabled={importing || !validation || validation.errors?.length > 0}
              >
                {importing ? "Importing..." : "Import to Database"}
              </Button>
            </div>
          )}

          {/* Validation result */}
          {validation && <ValidationCard result={validation} />}
        </section>

        {/* Recent imports */}
        {datasets.length > 0 && (
          <section className="panel reveal reveal-3">
            <div className="panel-head">
              <div>
                <h2>Recent Imports</h2>
                <p>Track each file from upload to completion.</p>
              </div>
            </div>
            <div className="dataset-grid">
              {datasets.map((d, i) => <DatasetCard key={i} dataset={d} />)}
            </div>
          </section>
        )}

      </main>

      <Toast key={toast.id} open={toast.open} variant={toast.variant} title={toast.title} message={toast.message} onClose={() => setToast(p => ({ ...p, open: false }))} duration={3200} />
    </div>
  );
}