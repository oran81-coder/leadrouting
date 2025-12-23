import React from "react";
import { Skeleton } from "./Skeleton";

export function CardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
      <Skeleton width="40%" height="1.25rem" className="mb-3" />
      <Skeleton width="60%" height="2rem" />
    </div>
  );
}

export function KPICardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, idx) => (
        <CardSkeleton key={idx} />
      ))}
    </div>
  );
}

