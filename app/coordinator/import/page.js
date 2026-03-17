"use client";

import { useState } from "react";
import CSVImportDropzone from "@/components/CSVImportDropzone";
import Toast from "@/components/Toast";
import "./styles.css";

export default function CoordinatorImportPage() {
  const [csvFile, setCsvFile] = useState(null);
  const [toast, setToast] = useState({
    open: false,
    variant: "info",
    title: "",
    message: "",
    id: 0,
  });

  const showToast = (variant, title, message) => {
    setToast({
      open: true,
      variant,
      title,
      message,
      id: Date.now(),
    });
  };
  const importStats = [
    { label: "Datasets Ready", value: "6", note: "2 need mapping" },
    { label: "Rows Validated", value: "4,382", note: "97% clean" },
    { label: "Last Sync", value: "14:25", note: "Today" },
  ];

  const datasets = [
    {
      name: "Courses Catalog",
      file: "courses_spring_2026.csv",
      rows: 214,
      status: "Ready",
      progress: 100,
    },
    {
      name: "Staff Assignments",
      file: "staff_assignments.xlsx",
      rows: 96,
      status: "Mapping",
      progress: 72,
    },
    {
      name: "Room Inventory",
      file: "rooms_capacity.csv",
      rows: 138,
      status: "Ready",
      progress: 100,
    },
    {
      name: "Student Groups",
      file: "student_groups.csv",
      rows: 512,
      status: "Review",
      progress: 58,
    },
  ];

  return (
    <div className="import-page">
      <main className="import-shell">
        <section className="hero reveal reveal-1">
          <p className="hero-eyebrow">Coordinator Workspace</p>
          <h1>Import Data</h1>
          <p className="hero-subtitle">
            Bring in course, staff, and room datasets with validation checks
            before publishing the scheduling baseline.
          </p>
        </section>

        <section className="stats-grid reveal reveal-2">
          {importStats.map((stat) => (
            <article className="stat-card" key={stat.label}>
              <p className="stat-label">{stat.label}</p>
              <p className="stat-value">{stat.value}</p>
              <p className="stat-note">{stat.note}</p>
            </article>
          ))}
        </section>

        <section className="panel reveal reveal-3">
          <div className="panel-head">
            <div>
              <h2>{csvFile ? "File Loaded" : "Import New CSV"}</h2>
              <p>{csvFile ? "Ready to proceed with validation." : "Select a CSV file to begin."}</p>
            </div>
          </div>

          <div className="dropzone-container">
            <CSVImportDropzone
              onFileSelect={(file) => {
                setCsvFile(file);
                showToast(
                  "success",
                  "CSV Loaded",
                  `${file.name} is ready for validation.`
                );
              }}
            />
          </div>

          {csvFile && (
            <div className="upload-queue-actions">
              <button
                type="button"
                className="ghost-btn"
                onClick={() => {
                  setCsvFile(null);
                  showToast("info", "Cleared", "CSV selection has been cleared.");
                }}
              >
                Clear File
              </button>
              <button
                type="button"
                className="primary-btn"
                onClick={() => {
                  showToast(
                    "success",
                    "Validating",
                    `Processing ${csvFile.name}. Please wait...`
                  );
                }}
              >
                Validate & Next
              </button>
            </div>
          )}
        </section>

        <section className="panel reveal reveal-3">
          <div className="panel-head">
            <div>
              <h2>Import Queue</h2>
              <p>Track each file from upload to mapping and validation.</p>
            </div>
          </div>

          <div className="dataset-grid">
            {datasets.map((dataset) => (
              <article className="dataset-card" key={dataset.name}>
                <div className="dataset-head">
                  <p className="dataset-name">{dataset.name}</p>
                  <span className={`status-badge status-${dataset.status.toLowerCase()}`}>
                    {dataset.status}
                  </span>
                </div>

                <p className="dataset-file">{dataset.file}</p>

                <div className="dataset-meta">
                  <p>{dataset.rows} rows</p>
                  <p>{dataset.progress}% complete</p>
                </div>

                <div className="progress-track">
                  <div
                    className="progress-fill"
                    style={{ "--import-progress": `${dataset.progress}%` }}
                  />
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="validation reveal reveal-4">
          <article className="validation-card">
            <h3>Validation Summary</h3>
            <p>17 warnings detected in Staff Assignments dataset.</p>
            <ul>
              <li>9 missing instructor IDs</li>
              <li>5 invalid room codes</li>
              <li>3 duplicate section keys</li>
            </ul>
            <button type="button" className="ghost-btn">
              Resolve Warnings
            </button>
          </article>

          <article className="validation-card">
            <h3>Next Step</h3>
            <p>
              After resolving warnings, publish the clean dataset as the source
              for schedule generation.
            </p>
            <button type="button" className="ghost-btn">
              Publish Dataset Snapshot
            </button>
          </article>
        </section>

        <Toast
          key={toast.id}
          open={toast.open}
          variant={toast.variant}
          title={toast.title}
          message={toast.message}
          onClose={() => setToast((prev) => ({ ...prev, open: false }))}
          duration={3200}
        />
      </main>
    </div>
  );
}
