"use client";

import React, { useEffect } from "react";
import "./Toast.css";

export default function Toast({
  open,
  onClose,
  variant = "info",
  title,
  message,
  duration = 3000,
}) {
  useEffect(() => {
    if (!open || duration <= 0) return;

    const timer = window.setTimeout(() => {
      onClose?.();
    }, duration);

    return () => window.clearTimeout(timer);
  }, [open, duration, onClose]);

  if (!open) return null;

  return (
    <div className="toast-wrap" role="status" aria-live="polite">
      <div className={`toast toast-${variant}`}>
        <div className="toast-content">
          {title && <p className="toast-title">{title}</p>}
          {message && <p className="toast-message">{message}</p>}
        </div>
        <button type="button" className="toast-close" onClick={onClose} aria-label="Close toast">
          ×
        </button>
      </div>
    </div>
  );
}