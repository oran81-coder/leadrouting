/**
 * Performance Monitor Component
 * 
 * Wraps components with React Profiler to measure render performance
 * Only active in development mode
 */

import React, { Profiler, ProfilerOnRenderCallback } from "react";

interface PerformanceMonitorProps {
  id: string;
  children: React.ReactNode;
  enabled?: boolean;
}

/**
 * Performance metrics logger
 * Logs component render times in development
 */
const onRenderCallback: ProfilerOnRenderCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime
) => {
  // Only log in development
  if (import.meta.env.DEV && actualDuration > 16) {
    // Only log if render took more than 16ms (1 frame at 60fps)
    console.log(`⚡ [Performance] ${id}`, {
      phase,
      actualDuration: `${actualDuration.toFixed(2)}ms`,
      baseDuration: `${baseDuration.toFixed(2)}ms`,
      startTime: `${startTime.toFixed(2)}ms`,
      commitTime: `${commitTime.toFixed(2)}ms`,
    });
  }
};

/**
 * PerformanceMonitor - Wraps components with React Profiler
 * 
 * Usage:
 * ```tsx
 * <PerformanceMonitor id="MyComponent">
 *   <MyComponent />
 * </PerformanceMonitor>
 * ```
 */
export function PerformanceMonitor({ id, children, enabled = true }: PerformanceMonitorProps) {
  if (!enabled || !import.meta.env.DEV) {
    // In production or if disabled, just return children
    return <>{children}</>;
  }

  return (
    <Profiler id={id} onRender={onRenderCallback}>
      {children}
    </Profiler>
  );
}

/**
 * Hook to measure async operations performance
 * 
 * Usage:
 * ```tsx
 * const measure = usePerformanceMeasure();
 * 
 * const fetchData = async () => {
 *   const end = measure.start("fetchData");
 *   const data = await api.getData();
 *   end();
 *   return data;
 * };
 * ```
 */
export function usePerformanceMeasure() {
  const start = (label: string) => {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      if (import.meta.env.DEV && duration > 100) {
        // Log slow operations (>100ms)
        console.log(`⏱️ [Performance] ${label}: ${duration.toFixed(2)}ms`);
      }
    };
  };

  return { start };
}

/**
 * Performance metrics collector
 * Collects and aggregates performance metrics
 */
class PerformanceMetricsCollector {
  private metrics: Map<string, number[]> = new Map();

  record(id: string, duration: number) {
    if (!this.metrics.has(id)) {
      this.metrics.set(id, []);
    }
    this.metrics.get(id)!.push(duration);
  }

  getStats(id: string) {
    const durations = this.metrics.get(id) || [];
    if (durations.length === 0) return null;

    const sorted = [...durations].sort((a, b) => a - b);
    const sum = durations.reduce((a, b) => a + b, 0);

    return {
      count: durations.length,
      avg: sum / durations.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
    };
  }

  getAllStats() {
    const stats: Record<string, ReturnType<typeof this.getStats>> = {};
    for (const [id] of this.metrics) {
      stats[id] = this.getStats(id);
    }
    return stats;
  }

  clear() {
    this.metrics.clear();
  }
}

export const performanceCollector = new PerformanceMetricsCollector();

// Expose to window for debugging in development
if (import.meta.env.DEV) {
  (window as any).__performanceCollector = performanceCollector;
  console.log("💡 Performance collector available at: window.__performanceCollector.getAllStats()");
}

