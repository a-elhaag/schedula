import React from "react";

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
  // Base styles applied to all buttons
  const baseStyles = [
    "font-sans font-bold",
    "transition-all duration-200 ease-out",
    "inline-flex items-center justify-center gap-2",
    "disabled:opacity-50 disabled:cursor-not-allowed",
    "rounded-full",
  ].join(" ");

  // Size variants
  const sizeStyles = {
    sm: "px-3 py-2 text-xs",
    md: "px-6 py-3 text-sm", // 13-14px per spec
    lg: "px-8 py-4 text-base",
  };

  // Variant styles
  const variantStyles = {
    primary: [
      "bg-accent text-white",
      "hover:bg-[#0063c7] hover:scale-105 hover:shadow-[0_8px_28px_rgba(0,113,227,0.4)]",
      "active:scale-100",
      "shadow-[0_4px_20px_rgba(0,113,227,0.267)]",
    ].join(" "),
    secondary: [
      "bg-transparent border-2 border-accent text-accent",
      "hover:bg-accent/8",
      "active:bg-accent/12",
    ].join(" "),
    ghost: [
      "bg-transparent border-0 text-text-primary",
      "hover:bg-background",
      "active:bg-background/80",
    ].join(" "),
  };

  const finalClassName = [
    baseStyles,
    sizeStyles[size],
    variantStyles[variant],
    disabled && "disabled",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button className={finalClassName} disabled={disabled} {...props}>
      {icon && <span className="flex items-center">{icon}</span>}
      {children && <span>{children}</span>}
    </button>
  );
}
