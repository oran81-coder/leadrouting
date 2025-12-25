/**
 * Performance Dashboard
 * 
 * Real-time monitoring dashboard showing system metrics from Prometheus
 * - HTTP request statistics
 * - Routing proposal metrics
 * - Monday.com API performance
 * - Database and cache performance
 * - Error tracking
 */

import { useState, useEffect } from "react";
import { useTheme } from "./ThemeContext";
import { getPerformanceMetrics, type MetricsResponse } from "./api";

export function PerformanceDashboard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [metrics, setMetrics] = useState<MetricsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);

  const fetchMetrics = async () => {
    try {
      setError(null);
      const data = await getPerformanceMetrics();
      setMetrics(data);
      setLoading(false);
    } catch (err: any) {
      console.error("Failed to fetch metrics:", err);
      setError(err.message || "Failed to fetch metrics");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    
    if (autoRefresh) {
      const interval = setInterval(fetchMetrics, 5000); // Refresh every 5 seconds
      return () => clearInterval(interval);
    }
  }, [autoRefresh]);

  const getMetricValue = (key: string): number => {
    return metrics?.metrics[key]?.value ?? 0;
  };

  if (loading) {
    return (
      <div className={`min-h-screen p-6 ${isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className={`h-8 ${isDark ? "bg-gray-700" : "bg-gray-300"} rounded w-1/3 mb-6`}></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`h-32 ${isDark ? "bg-gray-800" : "bg-white"} rounded-lg`}></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen p-6 ${isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
        <div className="max-w-7xl mx-auto">
          <div className={`p-6 rounded-lg border ${isDark ? "bg-red-900/20 border-red-700" : "bg-red-50 border-red-200"}`}>
            <h3 className={`text-lg font-semibold mb-2 ${isDark ? "text-red-400" : "text-red-700"}`}>
              ⚠️ Failed to load metrics
            </h3>
            <p className={isDark ? "text-red-300" : "text-red-600"}>{error}</p>
            <button
              onClick={fetchMetrics}
              className={`mt-4 px-4 py-2 rounded-lg ${
                isDark
                  ? "bg-red-700 hover:bg-red-600 text-white"
                  : "bg-red-600 hover:bg-red-700 text-white"
              }`}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const httpRequests = getMetricValue("leadrouting_http_requests_total");
  const proposalsCreated = getMetricValue("leadrouting_proposals_created_total");
  const proposalsApproved = getMetricValue("leadrouting_proposals_approved_total");
  const proposalsRejected = getMetricValue("leadrouting_proposals_rejected_total");
  const proposalsPending = getMetricValue("leadrouting_proposals_pending_current");
  const mondayApiRequests = getMetricValue("leadrouting_monday_api_requests_total");
  const errorsTotal = getMetricValue("leadrouting_errors_total");
  const leadsProcessed = getMetricValue("leadrouting_leads_processed_total");
  const activeAgents = getMetricValue("leadrouting_agents_active_count");

  return (
    <div className={`min-h-screen p-6 ${isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">📊 Performance Dashboard</h1>
            <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Real-time system metrics and monitoring
            </p>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4"
              />
              <span className="text-sm">Auto-refresh (5s)</span>
            </label>
            <button
              onClick={fetchMetrics}
              className={`px-4 py-2 rounded-lg ${
                isDark
                  ? "bg-blue-600 hover:bg-blue-700 text-white"
                  : "bg-blue-500 hover:bg-blue-600 text-white"
              }`}
            >
              🔄 Refresh
            </button>
          </div>
        </div>

        {/* Last updated timestamp */}
        <div className={`mb-6 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
          Last updated: {metrics?.timestamp ? new Date(metrics.timestamp).toLocaleString() : "N/A"}
        </div>

        {/* Metrics Grid */}
        <div className="space-y-8">
          {/* HTTP Requests Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4">🌐 HTTP Requests</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Total Requests"
                value={httpRequests.toLocaleString()}
                icon="📈"
                isDark={isDark}
              />
              <MetricCard
                title="Total Errors"
                value={errorsTotal.toLocaleString()}
                icon="⚠️"
                isDark={isDark}
                color="red"
              />
            </div>
          </section>

          {/* Routing Proposals Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4">🎯 Routing Proposals</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <MetricCard
                title="Created"
                value={proposalsCreated.toLocaleString()}
                icon="📝"
                isDark={isDark}
                color="blue"
              />
              <MetricCard
                title="Approved"
                value={proposalsApproved.toLocaleString()}
                icon="✅"
                isDark={isDark}
                color="green"
              />
              <MetricCard
                title="Rejected"
                value={proposalsRejected.toLocaleString()}
                icon="❌"
                isDark={isDark}
                color="red"
              />
              <MetricCard
                title="Pending"
                value={proposalsPending.toLocaleString()}
                icon="⏳"
                isDark={isDark}
                color="yellow"
              />
            </div>
          </section>

          {/* Business Metrics Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4">💼 Business Metrics</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <MetricCard
                title="Leads Processed"
                value={leadsProcessed.toLocaleString()}
                icon="📊"
                isDark={isDark}
                color="purple"
              />
              <MetricCard
                title="Active Agents"
                value={activeAgents.toLocaleString()}
                icon="👥"
                isDark={isDark}
                color="indigo"
              />
              <MetricCard
                title="Monday.com API Calls"
                value={mondayApiRequests.toLocaleString()}
                icon="📞"
                isDark={isDark}
                color="teal"
              />
            </div>
          </section>

          {/* System Health Section */}
          <section>
            <h2 className="text-xl font-semibold mb-4">🏥 System Health</h2>
            <div className={`p-6 rounded-lg border ${
              isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"
            }`}>
              <div className="space-y-4">
                <HealthIndicator
                  label="API Status"
                  status={httpRequests > 0 ? "healthy" : "unknown"}
                  isDark={isDark}
                />
                <HealthIndicator
                  label="Error Rate"
                  status={httpRequests > 0 && (errorsTotal / httpRequests) < 0.05 ? "healthy" : (errorsTotal > 0 ? "warning" : "unknown")}
                  isDark={isDark}
                  detail={httpRequests > 0 ? `${((errorsTotal / httpRequests) * 100).toFixed(2)}%` : "N/A"}
                />
                <HealthIndicator
                  label="Routing Engine"
                  status={proposalsCreated > 0 ? "healthy" : "unknown"}
                  isDark={isDark}
                />
              </div>
            </div>
          </section>

          {/* Raw Metrics (Debug) */}
          <section>
            <details className={`rounded-lg border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-200"}`}>
              <summary className={`p-4 cursor-pointer font-medium ${isDark ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                🔍 Raw Metrics (Debug)
              </summary>
              <div className="p-4 pt-0">
                <pre className={`text-xs overflow-auto p-4 rounded ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
                  {JSON.stringify(metrics?.metrics, null, 2)}
                </pre>
              </div>
            </details>
          </section>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// Helper Components
// ============================================================================

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: string;
  isDark: boolean;
  color?: "blue" | "green" | "red" | "yellow" | "purple" | "indigo" | "teal";
}

function MetricCard({ title, value, icon, isDark, color = "blue" }: MetricCardProps) {
  const colorClasses = {
    blue: isDark ? "border-blue-700 bg-blue-900/20" : "border-blue-200 bg-blue-50",
    green: isDark ? "border-green-700 bg-green-900/20" : "border-green-200 bg-green-50",
    red: isDark ? "border-red-700 bg-red-900/20" : "border-red-200 bg-red-50",
    yellow: isDark ? "border-yellow-700 bg-yellow-900/20" : "border-yellow-200 bg-yellow-50",
    purple: isDark ? "border-purple-700 bg-purple-900/20" : "border-purple-200 bg-purple-50",
    indigo: isDark ? "border-indigo-700 bg-indigo-900/20" : "border-indigo-200 bg-indigo-50",
    teal: isDark ? "border-teal-700 bg-teal-900/20" : "border-teal-200 bg-teal-50",
  };

  return (
    <div className={`p-6 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xl">{icon}</span>
      </div>
      <div className={`text-3xl font-bold mb-1 ${isDark ? "text-white" : "text-gray-900"}`}>
        {value}
      </div>
      <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
        {title}
      </div>
    </div>
  );
}

interface HealthIndicatorProps {
  label: string;
  status: "healthy" | "warning" | "error" | "unknown";
  isDark: boolean;
  detail?: string;
}

function HealthIndicator({ label, status, isDark, detail }: HealthIndicatorProps) {
  const statusConfig = {
    healthy: { icon: "✅", color: "text-green-500", label: "Healthy" },
    warning: { icon: "⚠️", color: "text-yellow-500", label: "Warning" },
    error: { icon: "❌", color: "text-red-500", label: "Error" },
    unknown: { icon: "❓", color: isDark ? "text-gray-500" : "text-gray-400", label: "Unknown" },
  };

  const config = statusConfig[status];

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-xl">{config.icon}</span>
        <span className={isDark ? "text-gray-300" : "text-gray-700"}>{label}</span>
      </div>
      <div className="flex items-center gap-2">
        {detail && (
          <span className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            {detail}
          </span>
        )}
        <span className={`font-medium ${config.color}`}>{config.label}</span>
      </div>
    </div>
  );
}

