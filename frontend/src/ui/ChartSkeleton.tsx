import React from "react";
import { Skeleton } from "./Skeleton";

export function ChartSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
      <Skeleton width="40%" height="1.5rem" className="mb-4" />
      <Skeleton width="100%" height="250px" variant="rectangle" />
    </div>
  );
}

