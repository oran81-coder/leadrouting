import React, { useEffect, useState } from "react";
import { useTheme } from "./ThemeContext";
import { getSuperAdminStats, SystemStats } from "./api";
import { OrganizationManager } from "./OrganizationManager";

/**
 * Super Admin Dashboard
 * System-wide management interface for super_admin users only
 */
export function SuperAdminDashboard() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [stats, setStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  async function loadStats() {
    try {
      setLoading(true);
      const response = await getSuperAdminStats();
      setStats(response.data);
      setError(null);
    } catch (err) {
      console.error("Failed to load system stats:", err);
      setError(err instanceof Error ? err.message : "Failed to load stats");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className={`min-h-screen p-6 ${
        isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      }`}
    >
      {/* Header */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <span className="text-4xl">👑</span>
              Super Admin Dashboard
            </h1>
            <p className={`mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              System-wide management and statistics
            </p>
          </div>
          <button
            onClick={loadStats}
            className={`px-4 py-2 rounded-lg font-medium transition ${
              isDark
                ? "bg-gray-800 hover:bg-gray-700 text-gray-200"
                : "bg-white hover:bg-gray-50 text-gray-700 border border-gray-300"
            }`}
          >
            🔄 Refresh Stats
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto space-y-8">
        {/* System Statistics */}
        <section>
          <h2 className="text-xl font-bold mb-4">📊 System Statistics</h2>

          {loading && !stats && (
            <div
              className={`p-8 rounded-lg text-center ${
                isDark ? "bg-gray-800" : "bg-white border border-gray-200"
              }`}
            >
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <p className={`mt-2 text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                Loading statistics...
              </p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Organizations Card */}
              <div
                className={`p-6 rounded-lg ${
                  isDark ? "bg-gray-800" : "bg-white border border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">🏢 Organizations</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={isDark ? "text-gray-400" : "text-gray-600"}>Total:</span>
                    <span className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                      {stats.organizations.total}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className={isDark ? "text-gray-400" : "text-gray-600"}>Active:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {stats.organizations.active}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className={isDark ? "text-gray-400" : "text-gray-600"}>Inactive:</span>
                    <span className="font-semibold text-gray-500">
                      {stats.organizations.inactive}
                    </span>
                  </div>
                </div>
              </div>

              {/* Users Card */}
              <div
                className={`p-6 rounded-lg ${
                  isDark ? "bg-gray-800" : "bg-white border border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">👥 Users</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={isDark ? "text-gray-400" : "text-gray-600"}>Total:</span>
                    <span className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {stats.users.total}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className={isDark ? "text-gray-400" : "text-gray-600"}>Active:</span>
                    <span className="font-semibold text-green-600 dark:text-green-400">
                      {stats.users.active}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className={isDark ? "text-gray-400" : "text-gray-600"}>Inactive:</span>
                    <span className="font-semibold text-gray-500">
                      {stats.users.inactive}
                    </span>
                  </div>
                </div>
              </div>

              {/* Activity Card */}
              <div
                className={`p-6 rounded-lg ${
                  isDark ? "bg-gray-800" : "bg-white border border-gray-200"
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">📈 Activity</h3>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className={isDark ? "text-gray-400" : "text-gray-600"}>Proposals:</span>
                    <span className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
                      {stats.proposals}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={isDark ? "text-gray-400" : "text-gray-600"}>Leads:</span>
                    <span className="text-lg font-bold text-green-600 dark:text-green-400">
                      {stats.leads}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className={isDark ? "text-gray-400" : "text-gray-600"}>Agents:</span>
                    <span className="text-lg font-bold text-yellow-600 dark:text-yellow-400">
                      {stats.agents}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Organization Management */}
        <section>
          <OrganizationManager isSuperAdmin={true} />
        </section>
      </div>
    </div>
  );
}

