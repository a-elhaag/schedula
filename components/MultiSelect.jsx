"use client";

import React, { useId, useRef, useEffect, useState } from "react";
import "./MultiSelect.css";

export default function MultiSelect({
  label,
  options = [],
  value = [],
  onChange,
  placeholder = "Select options",
  disabled = false,
  error = false,
}) {
  const generatedId = useId();
  const multiSelectId = `multiselect-${generatedId}`;
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

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
      inputRef.current?.focus();
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
        document.removeEventListener("keydown", handleEscapeKey);
      };
    }
  }, [isOpen]);

  const filteredOptions = options.filter((opt) =>
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleToggleOption = (optionValue) => {
    const isSelected = value.includes(optionValue);
    if (isSelected) {
      onChange?.(value.filter((v) => v !== optionValue));
    } else {
      onChange?.([...value, optionValue]);
    }
  };

  const handleRemoveTag = (e, optionValue) => {
    e.stopPropagation();
    onChange?.(value.filter((v) => v !== optionValue));
  };

  const selectedOptions = options.filter((opt) => value.includes(opt.value));

  return (
    <div className="multiselect-root" ref={containerRef}>
      {label && (
        <label className="multiselect-label" htmlFor={multiSelectId}>
          {label}
        </label>
      )}

      <div
        className={`multiselect-trigger ${isOpen ? "is-open" : ""} ${
          error ? "is-error" : ""
        } ${disabled ? "is-disabled" : ""}`}
        onClick={() => !disabled && setIsOpen(true)}
      >
        <div className="multiselect-tags">
          {selectedOptions.length === 0 ? (
            <span className="multiselect-placeholder">{placeholder}</span>
          ) : (
            selectedOptions.map((opt) => (
              <span key={opt.value} className="tag">
                <span className="tag-label">{opt.label}</span>
                <button
                  className="tag-remove"
                  onClick={(e) => handleRemoveTag(e, opt.value)}
                  disabled={disabled}
                  type="button"
                  aria-label={`Remove ${opt.label}`}
                >
                  ×
                </button>
              </span>
            ))
          )}

          {isOpen && (
            <input
              ref={inputRef}
              id={multiSelectId}
              type="text"
              className="multiselect-input"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={disabled}
            />
          )}
        </div>

        <span className="multiselect-icon" aria-hidden="true">
          {isOpen ? "▲" : "▼"}
        </span>
      </div>

      {isOpen && (
        <div className="multiselect-dropdown" role="listbox">
          {filteredOptions.length === 0 ? (
            <div className="multiselect-empty">
              {searchTerm ? "No matching options" : "No options available"}
            </div>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.value}
                className={`multiselect-option ${
                  option.disabled ? "is-disabled" : ""
                } ${value.includes(option.value) ? "is-selected" : ""}`}
                onClick={() =>
                  !option.disabled && handleToggleOption(option.value)
                }
                disabled={option.disabled}
                role="option"
                aria-selected={value.includes(option.value)}
              >
                <span className="multiselect-checkbox" aria-hidden="true">
                  {value.includes(option.value) ? "☑" : "☐"}
                </span>
                <span className="multiselect-option-label">{option.label}</span>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}
