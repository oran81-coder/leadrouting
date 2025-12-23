import React from "react";

type ComparisonBadgeProps = {
  current: number | null;
  previous: number | null;
  format?: "number" | "percentage" | "currency";
  invertColors?: boolean; // For metrics where lower is better (e.g., time to close)
};

export function ComparisonBadge({ current, previous, format = "number", invertColors = false }: ComparisonBadgeProps) {
  if (current === null || previous === null || previous === 0) {
    return null;
  }

  const delta = current - previous;
  const percentChange = (delta / previous) * 100;
  const isPositive = invertColors ? delta < 0 : delta > 0;
  const isNegative = invertColors ? delta > 0 : delta < 0;

  if (Math.abs(percentChange) < 0.1) {
    // No significant change
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300">
        No change
      </span>
    );
  }

  const formatValue = (val: number) => {
    switch (format) {
      case "percentage":
        return `${Math.abs(val).toFixed(1)}%`;
      case "currency":
        return `$${Math.abs(val).toLocaleString()}`;
      default:
        return Math.abs(val).toFixed(1);
    }
  };

  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
        isPositive
          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
          : isNegative
          ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
          : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
      }`}
    >
      {isPositive ? "↑" : isNegative ? "↓" : ""}
      {percentChange > 0 ? "+" : ""}
      {percentChange.toFixed(1)}%
      <span className="text-[10px] opacity-75">vs prev</span>
    </span>
  );
}

