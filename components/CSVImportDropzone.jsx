"use client";

import React, { useState } from "react";
import "./CSVImportDropzone.css";

export default function CSVImportDropzone({
  onFileSelect,
  maxSize = 5 * 1024 * 1024,
}) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [file, setFile] = useState(null);
  const [error, setError] = useState("");

  const validateFile = (selectedFile) => {
    setError("");

    if (!selectedFile) return false;

    const isCsv = selectedFile.type === "text/csv" || selectedFile.name.endsWith(".csv");
    if (!isCsv) {
      setError("Only CSV files are supported.");
      return false;
    }

    if (selectedFile.size > maxSize) {
      setError(`File size exceeds ${(maxSize / 1024 / 1024).toFixed(1)}MB limit.`);
      return false;
    }

    return true;
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    const droppedFile = e.dataTransfer.files?.[0];
    if (validateFile(droppedFile)) {
      setFile(droppedFile);
      onFileSelect?.(droppedFile);
    }
  };

  const handleFileInputChange = (e) => {
    const selectedFile = e.target.files?.[0];
    if (validateFile(selectedFile)) {
      setFile(selectedFile);
      onFileSelect?.(selectedFile);
    }
  };

  return (
    <div className="csv-dropzone-root">
      <div
        className={`csv-dropzone ${isDragActive ? "is-drag-active" : ""} ${file ? "has-file" : ""}`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={handleFileInputChange}
          className="csv-dropzone-input"
          id="csv-input"
        />

        <label htmlFor="csv-input" className="csv-dropzone-label">
          <div className="csv-dropzone-icon">
            {file ? "✓" : "📄"}
          </div>
          <h3 className="csv-dropzone-title">
            {file ? "File Selected" : "Drop CSV Here"}
          </h3>
          <p className="csv-dropzone-text">
            {file
              ? `${file.name}`
              : "or click to select a CSV file"}
          </p>
          {file && (
            <p className="csv-dropzone-size">
              {(file.size / 1024).toFixed(1)} KB
            </p>
          )}
        </label>
      </div>

      {error && (
        <div className="csv-dropzone-error" role="alert">
          {error}
        </div>
      )}

      {file && (
        <button
          type="button"
          className="csv-dropzone-clear"
          onClick={() => {
            setFile(null);
            setError("");
          }}
        >
          Clear Selection
        </button>
      )}
    </div>
  );
}
