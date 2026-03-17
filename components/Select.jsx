"use client";

import React, { useId, useRef, useEffect, useState } from "react";
import "./Select.css";

export default function Select({
  label,
  options = [],
  value,
  onChange,
  placeholder = "Select an option",
  disabled = false,
  error = false,
}) {
  const generatedId = useId();
  const selectId = `select-${generatedId}`;
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  const selectedOption = options.find((opt) => opt.value === value);

  // Close on escape key or outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };

    const handleEscapeKey = (e) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleEscapeKey);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscapeKey);
      };
    }
  }, [isOpen]);

  const handleSelectOption = (optionValue) => {
    onChange?.(optionValue);
    setIsOpen(false);
  };

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      setIsOpen(!isOpen);
    }
  };

  return (
    <div className="select-root" ref={containerRef}>
      {label && (
        <label className="select-label" htmlFor={selectId}>
          {label}
        </label>
      )}

      <button
        id={selectId}
        className={`select-trigger ${isOpen ? "is-open" : ""} ${
          error ? "is-error" : ""
        } ${disabled ? "is-disabled" : ""}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="select-value">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <span className="select-icon" aria-hidden="true">
          ▼
        </span>
      </button>

      {isOpen && (
        <div className="select-dropdown" role="listbox">
          {options.length === 0 ? (
            <div className="select-empty">No options available</div>
          ) : (
            options.map((option) => (
              <button
                key={option.value}
                className={`select-option ${
                  option.disabled ? "is-disabled" : ""
                } ${value === option.value ? "is-selected" : ""}`}
                onClick={() => !option.disabled && handleSelectOption(option.value)}
                disabled={option.disabled}
                role="option"
                aria-selected={value === option.value}
              >
                <span className="select-checkmark" aria-hidden="true">
                  ✓
                </span>
                <span className="select-option-label">{option.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
