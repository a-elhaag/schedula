"use client";

import React from "react";
import "./Breadcrumb.css";

export default function Breadcrumb({ items = [], onNavigate }) {
  if (!items || items.length === 0) {
    return null;
  }

  return (
    <nav className="breadcrumb" aria-label="Breadcrumb Navigation">
      <ol className="breadcrumb-list">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          const isClickable = item.href && !isLast;

          return (
            <li key={index} className="breadcrumb-item">
              {isClickable ? (
                <button
                  className="breadcrumb-link"
                  onClick={() => onNavigate?.(item.href)}
                  aria-label={`Navigate to ${item.label}`}
                >
                  {item.icon && <span className="breadcrumb-icon">{item.icon}</span>}
                  <span className="breadcrumb-label">{item.label}</span>
                </button>
              ) : (
                <span className="breadcrumb-current">
                  {item.icon && <span className="breadcrumb-icon">{item.icon}</span>}
                  <span className="breadcrumb-label">{item.label}</span>
                </span>
              )}

              {!isLast && (
                <span className="breadcrumb-separator" aria-hidden="true">
                  /
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
