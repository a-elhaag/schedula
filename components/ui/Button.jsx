"use client";
import React from "react";

export default function Button({
  children,
  variant = "primary",
  size = "md",
  icon,
  className = "",
  ...props
}) {
  const baseStyles =
    "rounded-full font-semibold transition-all duration-200 ease-out flex items-center justify-center gap-2 outline-none";

  const variants = {
    primary: "bg-accent text-white hover:shadow-lg hover:scale-105",
    secondary: "border-2 border-accent text-accent hover:bg-accent/8",
    ghost: "text-text-primary hover:bg-background",
  };

  const sizes = {
    sm: "px-6 py-2 text-xs tracking-wide",
    md: "px-8 py-3 text-sm tracking-wide",
    lg: "px-10 py-4 text-base tracking-wide",
  };

  const variantStyles = variants[variant] || variants.primary;
  const sizeStyles = sizes[size] || sizes.md;

  return (
    <button
      className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
      {...props}
    >
      {icon && <span className="flex items-center">{icon}</span>}
      {children}
    </button>
  );
}
