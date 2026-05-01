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
  const successRate = result.total ? Math.round((result.valid / result.total) * 100) : 0;

  return (
    <article className={`validation-card ${hasErrors ? "validation-card--error" : ""}`}>
      <div className="validation-header">
        <h3>Validation Result</h3>
        <div className="validation-stats-summary">
          <Badge variant={successRate === 100 ? "success" : hasErrors ? "danger" : "warning"} size="sm">
            {successRate}% Valid
          </Badge>
        </div>
      </div>

      {/* Results Table */}
      <div className="validation-table-wrapper">
        <table className="validation-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Count</th>
              <th>Percentage</th>
            </tr>
          </thead>
          <tbody>
            <tr className="validation-row validation-row--success">
              <td><span className="status-badge status-badge--success">✓</span> Valid Rows</td>
              <td className="count-cell">{result.valid}</td>
              <td className="percent-cell">{successRate}%</td>
            </tr>
            {result.total && result.total > result.valid && !hasErrors && (
              <tr className="validation-row validation-row--warning">
                <td><span className="status-badge status-badge--warning">⚠</span> Warnings</td>
                <td className="count-cell">{result.total - result.valid}</td>
                <td className="percent-cell">{Math.round(((result.total - result.valid) / result.total) * 100)}%</td>
              </tr>
            )}
            {hasErrors && (
              <tr className="validation-row validation-row--error">
                <td><span className="status-badge status-badge--error">✕</span> Errors</td>
                <td className="count-cell">{result.errors?.length ?? 0}</td>
                <td className="percent-cell">{Math.round(((result.errors?.length ?? 0) / result.total) * 100)}%</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Details List */}
      {hasErrors && (
        <div className="validation-details">
          <h4 className="details-title">Errors ({result.errors?.length ?? 0})</h4>
          <ul className="validation-list validation-list--error">
            {result.errors.slice(0, 10).map((e, i) => <li key={i}>{e}</li>)}
            {(result.errors?.length ?? 0) > 10 && <li className="more-indicator">...and {result.errors.length - 10} more errors</li>}
          </ul>
        </div>
      )}

      {hasWarnings && !hasErrors && (
        <div className="validation-details">
          <h4 className="details-title">Warnings ({result.warnings?.length ?? 0})</h4>
          <ul className="validation-list validation-list--warning">
            {result.warnings.slice(0, 10).map((w, i) => <li key={i}>{w}</li>)}
            {(result.warnings?.length ?? 0) > 10 && <li className="more-indicator">...and {result.warnings.length - 10} more warnings</li>}
          </ul>
        </div>
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
        enrollments: ["term_label", "capacity"]
      }[datasetType] ?? [];

      // Enrollment exception
      if (datasetType === "enrollments" && !headers.includes("course_code") && !headers.includes("course_id") && !headers.includes("code")) {
        setValidation({
          valid:    0,
          errors:   [`Missing required column: course_code or course_id`],
          warnings: [],
        });
        showToast("warning", "Validation Failed", "Fix missing columns and re-upload.");
        return;
      }

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

        <div className="page-header">
          <h1>Import Data</h1>
          <p>Bring in course, staff, and room datasets with validation checks before publishing the scheduling baseline.</p>
        </div>

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
            {["courses","staff","rooms","enrollments"].map((t) => (
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