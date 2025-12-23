import React from "react";

export interface SkeletonProps {
  width?: string;
  height?: string;
  variant?: "line" | "circle" | "rectangle" | "card";
  className?: string;
}

export function Skeleton({ width = "100%", height = "1rem", variant = "line", className = "" }: SkeletonProps) {
  const getVariantClasses = () => {
    switch (variant) {
      case "circle":
        return "rounded-full";
      case "rectangle":
        return "rounded-lg";
      case "card":
        return "rounded-lg";
      case "line":
      default:
        return "rounded";
    }
  };

  return (
    <div
      className={`animate-pulse bg-gray-200 dark:bg-gray-700 ${getVariantClasses()} ${className}`}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}

