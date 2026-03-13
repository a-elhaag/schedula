import React from "react";
import "./Button.css";

/**
 * Button Component
 *
 * A versatile button component following the Schedula design specification.
 * Supports 4 variants: primary, secondary, ghost, and destructive.
 *
 * @component
 * @example
 * <Button variant="primary">Click me</Button>
 * <Button variant="secondary">Secondary action</Button>
 * <Button icon={<DownloadIcon />}>Download Syllabus</Button>
 */
export default function Button({
  variant = "primary",
  size = "md",
  disabled = false,
  icon = null,
  children,
  className = "",
  ...props
}) {
  // Base class
  const baseClass = "btn";

  // Size variants
  const sizeClass = `btn-${size}`;

  // Variant styles
  const variantClass = `btn-${variant}`;

  const finalClassName = [baseClass, sizeClass, variantClass, className]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={finalClassName} disabled={disabled} {...props}>
      {icon && <span className="btn-icon">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
}
