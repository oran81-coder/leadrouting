import React from "react";

/**
 * Loading Spinner Component
 * Simple animated spinner for loading states
 */
export function LoadingSpinner({ size = "md", message }: { size?: "sm" | "md" | "lg"; message?: string }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
  };

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className={`animate-spin rounded-full border-b-2 border-blue-600 ${sizeClasses[size]}`} />
      {message && <span className="mt-3 text-sm text-gray-600 dark:text-gray-400">{message}</span>}
    </div>
  );
}

/**
 * Proposal Card Skeleton Loader
 * Displays while proposal cards are loading
 */
export function ProposalCardSkeleton() {
  return (
    <div className="animate-pulse bg-white dark:bg-gray-800 rounded-lg shadow p-4 space-y-3">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div className="space-y-2 flex-1">
          <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        </div>
        <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>

      {/* Content */}
      <div className="space-y-2">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-2">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
      </div>
    </div>
  );
}

/**
 * Proposal Detail Skeleton Loader
 * Displays while proposal details are loading
 */
export function ProposalDetailSkeleton() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Hero Section Skeleton */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-800">
        <div className="space-y-4">
          <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="flex justify-between items-center">
            <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-12 w-24 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        </div>

        {/* Explanation Skeleton */}
        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800 space-y-2">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6"></div>
        </div>

        {/* Score Breakdown Button Skeleton */}
        <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
          <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>

      {/* Alternative Agents Skeleton */}
      <div className="space-y-3">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-20 bg-gray-100 dark:bg-gray-900 rounded"></div>
        <div className="h-20 bg-gray-100 dark:bg-gray-900 rounded"></div>
      </div>

      {/* Monday.com Details Skeleton */}
      <div className="space-y-3">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/4"></div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
          <div className="space-y-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded"></div>
          </div>
        </div>
      </div>

      {/* Actions Skeleton */}
      <div className="flex gap-3 pt-4">
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded flex-1"></div>
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-24"></div>
      </div>
    </div>
  );
}

/**
 * Score Breakdown Skeleton
 * Displays while score breakdown is loading
 */
export function ScoreBreakdownSkeleton() {
  return (
    <div className="animate-pulse space-y-2 bg-white/50 dark:bg-gray-900/30 rounded-lg p-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex justify-between items-center">
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-16"></div>
        </div>
      ))}
      <div className="mt-4 pt-3 border-t border-blue-200 dark:border-blue-700 flex justify-between">
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
        <div className="h-5 bg-gray-200 dark:bg-gray-700 rounded w-20"></div>
      </div>
    </div>
  );
}

