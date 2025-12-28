import React, { useState, useEffect } from "react";
import { useTheme } from "./ThemeContext";
import {
  fetchHistoricalPreview,
  HistoricalPreviewResponse,
  HistoricalPreviewLead,
} from "./api";

export function PreviewScreen() {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [windowDays, setWindowDays] = useState<30 | 60 | 90>(30);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<HistoricalPreviewResponse | null>(null);

  // Filter states
  const [filterIndustry, setFilterIndustry] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Load preview on mount and when window changes
  useEffect(() => {
    loadPreview();
  }, [windowDays]);

  async function loadPreview() {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchHistoricalPreview(windowDays);
      setData(result);
    } catch (err: any) {
      setError(err.message || "Failed to load preview");
    } finally {
      setLoading(false);
    }
  }

  // Get unique industries for filter
  const industries = data
    ? Array.from(new Set(data.leads.map((l) => l.industry).filter(Boolean)))
    : [];

  // Apply filters
  const filteredLeads = data
    ? data.leads.filter((lead) => {
        if (filterIndustry !== "all" && lead.industry !== filterIndustry) return false;
        if (filterStatus === "closed_won" && !lead.wasClosedWon) return false;
        if (filterStatus === "open" && lead.wasClosedWon) return false;
        return true;
      })
    : [];

  const cardStyle: React.CSSProperties = {
    background: isDark ? "#1e293b" : "#ffffff",
    border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
    borderRadius: 8,
    padding: 24,
    boxShadow: isDark
      ? "0 1px 3px rgba(0,0,0,0.3)"
      : "0 1px 3px rgba(0,0,0,0.1)",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 13,
    fontWeight: 500,
    color: isDark ? "#94a3b8" : "#64748b",
    marginBottom: 8,
  };

  const valueStyle: React.CSSProperties = {
    fontSize: 32,
    fontWeight: 700,
    color: isDark ? "#f1f5f9" : "#0f172a",
  };

  const smallValueStyle: React.CSSProperties = {
    fontSize: 18,
    fontWeight: 600,
    color: isDark ? "#e2e8f0" : "#1e293b",
  };

  return (
    <div
      style={{
        padding: "40px 32px",
        maxWidth: 1400,
        margin: "0 auto",
        color: isDark ? "#f1f5f9" : "#0f172a",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 40 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              background: isDark
                ? "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
                : "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
            }}
          >
            🔮
          </div>
          <h1
            style={{
              fontSize: 36,
              fontWeight: 800,
              margin: 0,
              background: isDark
                ? "linear-gradient(135deg, #f1f5f9 0%, #cbd5e1 100%)"
                : "linear-gradient(135deg, #0f172a 0%, #334155 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Historical Preview
          </h1>
        </div>
        <p style={{ fontSize: 16, color: isDark ? "#94a3b8" : "#64748b", marginBottom: 20, marginLeft: 60 }}>
          Discover what would have happened if the routing system was active in the past
        </p>
        <div
          style={{
            padding: "14px 18px",
            background: isDark ? "#1e3a8a15" : "#eff6ff",
            border: `1px solid ${isDark ? "#3b82f680" : "#bfdbfe"}`,
            borderRadius: 10,
            fontSize: 14,
            color: isDark ? "#93c5fd" : "#1e40af",
            display: "flex",
            alignItems: "center",
            gap: 10,
            marginLeft: 60,
          }}
        >
          <span style={{ fontSize: 18 }}>💡</span>
          <span>
            <strong>Note:</strong> This is a simulation only. No changes are made to your Monday.com data.
          </span>
        </div>
      </div>

      {/* Window Selector */}
      <div
        style={{
          marginBottom: 32,
          padding: 20,
          background: isDark ? "#1e293b" : "#f8fafc",
          border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
          borderRadius: 12,
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label style={{ fontSize: 15, fontWeight: 700, color: isDark ? "#f1f5f9" : "#0f172a" }}>
          Time Window:
        </label>
        <div style={{ display: "flex", gap: 8 }}>
          {([30, 60, 90] as const).map((days) => (
            <button
              key={days}
              onClick={() => setWindowDays(days)}
              disabled={loading}
              style={{
                padding: "10px 24px",
                background:
                  windowDays === days
                    ? isDark
                      ? "linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)"
                      : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
                    : isDark
                    ? "#334155"
                    : "#ffffff",
                color: windowDays === days ? "#ffffff" : isDark ? "#cbd5e1" : "#475569",
                border: windowDays === days ? "none" : `1px solid ${isDark ? "#475569" : "#cbd5e1"}`,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "all 0.2s",
                boxShadow: windowDays === days ? "0 4px 12px rgba(59, 130, 246, 0.3)" : "none",
              }}
            >
              Last {days} Days
            </button>
          ))}
        </div>
        <button
          onClick={loadPreview}
          disabled={loading}
          style={{
            padding: "10px 24px",
            background: isDark
              ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
              : "linear-gradient(135deg, #34d399 0%, #10b981 100%)",
            color: "#ffffff",
            border: "none",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: 8,
            boxShadow: "0 4px 12px rgba(16, 185, 129, 0.3)",
          }}
        >
          <span style={{ fontSize: 16 }}>🔄</span>
          Refresh
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: 80,
            background: isDark ? "#1e293b" : "#ffffff",
            borderRadius: 16,
            border: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
          }}
        >
          <div
            style={{
              fontSize: 64,
              marginBottom: 20,
              animation: "spin 1s linear infinite",
            }}
          >
            ⏳
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: isDark ? "#f1f5f9" : "#0f172a", marginBottom: 8 }}>
            Loading Historical Data...
          </div>
          <div style={{ fontSize: 14, color: isDark ? "#94a3b8" : "#64748b" }}>
            This may take a few moments
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div
          style={{
            padding: 24,
            background: isDark ? "#7f1d1d" : "#fee2e2",
            border: `2px solid ${isDark ? "#991b1b" : "#fca5a5"}`,
            borderRadius: 12,
            color: isDark ? "#fca5a5" : "#991b1b",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: 24 }}>❌</span>
          <div>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>Error Loading Preview</div>
            <div style={{ fontSize: 14 }}>{error}</div>
          </div>
        </div>
      )}

      {/* Data Display */}
      {data && !loading && (
        <>
          {/* Warning if no Closed Won mapping */}
          {!data.hasClosedWonMapping && (
            <div
              style={{
                padding: 18,
                background: isDark ? "#92400e" : "#fef3c7",
                border: `2px solid ${isDark ? "#b45309" : "#fbbf24"}`,
                borderRadius: 12,
                marginBottom: 24,
                fontSize: 14,
                color: isDark ? "#fde68a" : "#92400e",
                display: "flex",
                alignItems: "center",
                gap: 12,
              }}
            >
              <span style={{ fontSize: 24 }}>⚠️</span>
              <div>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Missing Configuration</div>
                <div>
                  Closed Won Status is not configured in Field Mapping. Success rate calculations may be
                  inaccurate.
                </div>
              </div>
            </div>
          )}

          {/* Summary Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              gap: 20,
              marginBottom: 32,
            }}
          >
            {/* Total Leads */}
            <div style={{ ...cardStyle, borderLeft: `4px solid ${isDark ? "#3b82f6" : "#2563eb"}` }}>
              <div style={labelStyle}>Total Leads</div>
              <div style={valueStyle}>{data.summary.totalLeads}</div>
              <div style={{ fontSize: 13, color: isDark ? "#64748b" : "#94a3b8", marginTop: 8 }}>
                In last {windowDays} days
              </div>
            </div>

            {/* Routed Leads */}
            <div style={{ ...cardStyle, borderLeft: `4px solid ${isDark ? "#10b981" : "#059669"}` }}>
              <div style={labelStyle}>Routable Leads</div>
              <div style={valueStyle}>{data.summary.routedLeads}</div>
              <div style={{ fontSize: 13, color: isDark ? "#64748b" : "#94a3b8", marginTop: 8 }}>
                {data.summary.totalLeads > 0
                  ? Math.round((data.summary.routedLeads / data.summary.totalLeads) * 100)
                  : 0}
                % of total
              </div>
            </div>

            {/* System Success Rate */}
            <div
              style={{
                ...cardStyle,
                borderLeft: `4px solid ${isDark ? "#8b5cf6" : "#7c3aed"}`,
                background: isDark
                  ? "linear-gradient(135deg, #1e293b 0%, #312e81 100%)"
                  : "linear-gradient(135deg, #ffffff 0%, #f5f3ff 100%)",
              }}
            >
              <div style={labelStyle}>System Success Rate</div>
              <div style={{ ...valueStyle, color: isDark ? "#a78bfa" : "#7c3aed" }}>
                {data.summary.systemSuccessRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: 13, color: isDark ? "#64748b" : "#94a3b8", marginTop: 8 }}>
                If recommendations followed
              </div>
            </div>

            {/* Current Success Rate */}
            <div style={{ ...cardStyle, borderLeft: `4px solid ${isDark ? "#64748b" : "#94a3b8"}` }}>
              <div style={labelStyle}>Current Success Rate</div>
              <div style={smallValueStyle}>{data.summary.currentSuccessRate.toFixed(1)}%</div>
              <div style={{ fontSize: 13, color: isDark ? "#64748b" : "#94a3b8", marginTop: 8 }}>
                Manual assignments
              </div>
            </div>

            {/* Improvement */}
            <div
              style={{
                ...cardStyle,
                borderLeft: `4px solid ${
                  data.summary.improvement > 0
                    ? isDark
                      ? "#10b981"
                      : "#059669"
                    : isDark
                    ? "#ef4444"
                    : "#dc2626"
                }`,
                background:
                  data.summary.improvement > 0
                    ? isDark
                      ? "linear-gradient(135deg, #1e293b 0%, #064e3b 100%)"
                      : "linear-gradient(135deg, #ffffff 0%, #ecfdf5 100%)"
                    : isDark
                    ? "linear-gradient(135deg, #1e293b 0%, #7f1d1d 100%)"
                    : "linear-gradient(135deg, #ffffff 0%, #fef2f2 100%)",
              }}
            >
              <div style={labelStyle}>Potential Improvement</div>
              <div
                style={{
                  ...smallValueStyle,
                  fontSize: 28,
                  color:
                    data.summary.improvement > 0
                      ? isDark
                        ? "#10b981"
                        : "#059669"
                      : isDark
                      ? "#ef4444"
                      : "#dc2626",
                }}
              >
                {data.summary.improvement > 0 ? "+" : ""}
                {data.summary.improvement.toFixed(1)}%
              </div>
              <div style={{ fontSize: 13, color: isDark ? "#64748b" : "#94a3b8", marginTop: 8 }}>
                Percentage points
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(450px, 1fr))",
              gap: 24,
              marginBottom: 32,
            }}
          >
            {/* Success Rate Comparison Chart */}
            <div style={cardStyle}>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 20,
                  color: isDark ? "#f1f5f9" : "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 24 }}>📊</span>
                Success Rate Comparison
              </h3>
              <div style={{ display: "flex", gap: 40, alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: 140,
                      height: 140,
                      borderRadius: "50%",
                      background: `conic-gradient(${isDark ? "#8b5cf6" : "#7c3aed"} 0% ${data.summary.systemSuccessRate}%, ${isDark ? "#334155" : "#e2e8f0"} ${data.summary.systemSuccessRate}% 100%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 12px",
                      boxShadow: isDark
                        ? "0 8px 20px rgba(139, 92, 246, 0.3)"
                        : "0 8px 20px rgba(124, 58, 237, 0.2)",
                    }}
                  >
                    <div
                      style={{
                        width: 105,
                        height: 105,
                        borderRadius: "50%",
                        background: isDark ? "#1e293b" : "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 24,
                        fontWeight: 800,
                        color: isDark ? "#a78bfa" : "#7c3aed",
                      }}
                    >
                      {data.summary.systemSuccessRate.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: isDark ? "#a78bfa" : "#7c3aed" }}>
                    With System
                  </div>
                  <div style={{ fontSize: 12, color: isDark ? "#64748b" : "#94a3b8", marginTop: 4 }}>
                    AI-Powered Routing
                  </div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: 140,
                      height: 140,
                      borderRadius: "50%",
                      background: `conic-gradient(${isDark ? "#64748b" : "#94a3b8"} 0% ${data.summary.currentSuccessRate}%, ${isDark ? "#334155" : "#e2e8f0"} ${data.summary.currentSuccessRate}% 100%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 12px",
                      boxShadow: "0 8px 20px rgba(0,0,0,0.1)",
                    }}
                  >
                    <div
                      style={{
                        width: 105,
                        height: 105,
                        borderRadius: "50%",
                        background: isDark ? "#1e293b" : "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 24,
                        fontWeight: 800,
                        color: isDark ? "#94a3b8" : "#64748b",
                      }}
                    >
                      {data.summary.currentSuccessRate.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ fontSize: 15, fontWeight: 700, color: isDark ? "#94a3b8" : "#64748b" }}>
                    Current State
                  </div>
                  <div style={{ fontSize: 12, color: isDark ? "#64748b" : "#94a3b8", marginTop: 4 }}>
                    Manual Assignment
                  </div>
                </div>
              </div>
            </div>

            {/* Lead Distribution Chart */}
            <div style={cardStyle}>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 20,
                  color: isDark ? "#f1f5f9" : "#0f172a",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                }}
              >
                <span style={{ fontSize: 24 }}>📈</span>
                Lead Distribution
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
                {/* Total Leads Bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Total Leads</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>{data.summary.totalLeads}</span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 10,
                      background: isDark ? "#334155" : "#e2e8f0",
                      borderRadius: 6,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background: isDark
                          ? "linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)"
                          : "linear-gradient(90deg, #60a5fa 0%, #3b82f6 100%)",
                      }}
                    />
                  </div>
                </div>

                {/* Routed Leads Bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Routable</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>
                      {data.summary.routedLeads} (
                      {data.summary.totalLeads > 0
                        ? Math.round((data.summary.routedLeads / data.summary.totalLeads) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 10,
                      background: isDark ? "#334155" : "#e2e8f0",
                      borderRadius: 6,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${data.summary.totalLeads > 0 ? (data.summary.routedLeads / data.summary.totalLeads) * 100 : 0}%`,
                        height: "100%",
                        background: isDark
                          ? "linear-gradient(90deg, #10b981 0%, #059669 100%)"
                          : "linear-gradient(90deg, #34d399 0%, #10b981 100%)",
                      }}
                    />
                  </div>
                </div>

                {/* Closed Won Bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>Closed Won</span>
                    <span style={{ fontSize: 14, fontWeight: 700 }}>
                      {data.summary.closedWonLeads} (
                      {data.summary.totalLeads > 0
                        ? Math.round((data.summary.closedWonLeads / data.summary.totalLeads) * 100)
                        : 0}
                      %)
                    </span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 10,
                      background: isDark ? "#334155" : "#e2e8f0",
                      borderRadius: 6,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${data.summary.totalLeads > 0 ? (data.summary.closedWonLeads / data.summary.totalLeads) * 100 : 0}%`,
                        height: "100%",
                        background: isDark
                          ? "linear-gradient(90deg, #f59e0b 0%, #d97706 100%)"
                          : "linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)",
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div
            style={{
              ...cardStyle,
              marginBottom: 24,
              display: "flex",
              gap: 16,
              alignItems: "center",
              padding: 18,
              flexWrap: "wrap",
            }}
          >
            <span style={{ fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 20 }}>🔍</span>
              Filters:
            </span>
            <select
              value={filterIndustry}
              onChange={(e) => setFilterIndustry(e.target.value)}
              style={{
                padding: "8px 14px",
                background: isDark ? "#334155" : "#f8fafc",
                color: isDark ? "#f1f5f9" : "#0f172a",
                border: `1px solid ${isDark ? "#475569" : "#cbd5e1"}`,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <option value="all">All Industries</option>
              {industries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              style={{
                padding: "8px 14px",
                background: isDark ? "#334155" : "#f8fafc",
                color: isDark ? "#f1f5f9" : "#0f172a",
                border: `1px solid ${isDark ? "#475569" : "#cbd5e1"}`,
                borderRadius: 8,
                fontSize: 14,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              <option value="all">All Statuses</option>
              <option value="closed_won">Closed Won Only</option>
              <option value="open">Open Only</option>
            </select>
            <span style={{ fontSize: 14, color: isDark ? "#94a3b8" : "#64748b", marginLeft: "auto", fontWeight: 500 }}>
              Showing {filteredLeads.length} of {data.leads.length} leads
            </span>
          </div>

          {/* Leads Table */}
          <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            <div
              style={{
                overflowX: "auto",
                maxHeight: 650,
                overflowY: "auto",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 14,
                }}
              >
                <thead
                  style={{
                    position: "sticky",
                    top: 0,
                    background: isDark
                      ? "linear-gradient(180deg, #0f172a 0%, #1e293b 100%)"
                      : "linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%)",
                    borderBottom: `2px solid ${isDark ? "#475569" : "#cbd5e1"}`,
                    zIndex: 1,
                  }}
                >
                  <tr>
                    <th
                      style={{
                        padding: "14px 18px",
                        textAlign: "left",
                        fontWeight: 700,
                        fontSize: 13,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: isDark ? "#94a3b8" : "#64748b",
                      }}
                    >
                      Lead Name
                    </th>
                    <th
                      style={{
                        padding: "14px 18px",
                        textAlign: "left",
                        fontWeight: 700,
                        fontSize: 13,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: isDark ? "#94a3b8" : "#64748b",
                      }}
                    >
                      Industry
                    </th>
                    <th
                      style={{
                        padding: "14px 18px",
                        textAlign: "left",
                        fontWeight: 700,
                        fontSize: 13,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: isDark ? "#94a3b8" : "#64748b",
                      }}
                    >
                      Status
                    </th>
                    <th
                      style={{
                        padding: "14px 18px",
                        textAlign: "left",
                        fontWeight: 700,
                        fontSize: 13,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: isDark ? "#94a3b8" : "#64748b",
                      }}
                    >
                      Assigned To
                    </th>
                    <th
                      style={{
                        padding: "14px 18px",
                        textAlign: "left",
                        fontWeight: 700,
                        fontSize: 13,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: isDark ? "#94a3b8" : "#64748b",
                      }}
                    >
                      System Recommendation
                    </th>
                    <th
                      style={{
                        padding: "14px 18px",
                        textAlign: "center",
                        fontWeight: 700,
                        fontSize: 13,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: isDark ? "#94a3b8" : "#64748b",
                      }}
                    >
                      Score
                    </th>
                    <th
                      style={{
                        padding: "14px 18px",
                        textAlign: "center",
                        fontWeight: 700,
                        fontSize: 13,
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        color: isDark ? "#94a3b8" : "#64748b",
                      }}
                    >
                      Result
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLeads.map((lead, idx) => (
                    <tr
                      key={`${lead.boardId}_${lead.itemId}`}
                      style={{
                        borderBottom: `1px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                        background:
                          idx % 2 === 0
                            ? isDark
                              ? "#1e293b"
                              : "#ffffff"
                            : isDark
                            ? "#0f172a"
                            : "#f8fafc",
                        transition: "background 0.2s",
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = isDark ? "#334155" : "#f1f5f9";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background =
                          idx % 2 === 0
                            ? isDark
                              ? "#1e293b"
                              : "#ffffff"
                            : isDark
                            ? "#0f172a"
                            : "#f8fafc";
                      }}
                    >
                      <td style={{ padding: "14px 18px", fontWeight: 600 }}>{lead.name}</td>
                      <td style={{ padding: "14px 18px" }}>
                        {lead.industry ? (
                          <span
                            style={{
                              padding: "4px 10px",
                              borderRadius: 6,
                              fontSize: 12,
                              fontWeight: 600,
                              background: isDark ? "#3b82f620" : "#eff6ff",
                              color: isDark ? "#60a5fa" : "#3b82f6",
                            }}
                          >
                            {lead.industry}
                          </span>
                        ) : (
                          <span style={{ color: isDark ? "#64748b" : "#94a3b8" }}>-</span>
                        )}
                      </td>
                      <td style={{ padding: "14px 18px" }}>
                        <span
                          style={{
                            padding: "5px 12px",
                            borderRadius: 6,
                            fontSize: 13,
                            fontWeight: 600,
                            background: lead.wasClosedWon
                              ? isDark
                                ? "#10b98120"
                                : "#d1fae5"
                              : isDark
                              ? "#64748b20"
                              : "#f1f5f9",
                            color: lead.wasClosedWon
                              ? isDark
                                ? "#34d399"
                                : "#059669"
                              : isDark
                              ? "#94a3b8"
                              : "#64748b",
                          }}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px", fontWeight: 500 }}>
                        {lead.assignedTo ? lead.assignedTo.name : <span style={{ color: isDark ? "#64748b" : "#94a3b8" }}>Unassigned</span>}
                      </td>
                      <td style={{ padding: "14px 18px", fontWeight: 700, color: isDark ? "#a78bfa" : "#7c3aed" }}>
                        {lead.recommendedTo ? lead.recommendedTo.name : <span style={{ color: isDark ? "#64748b" : "#94a3b8" }}>-</span>}
                      </td>
                      <td style={{ padding: "14px 18px", textAlign: "center" }}>
                        <span
                          style={{
                            padding: "4px 10px",
                            borderRadius: 6,
                            fontSize: 14,
                            fontWeight: 700,
                            background: isDark ? "#8b5cf620" : "#f5f3ff",
                            color: isDark ? "#a78bfa" : "#7c3aed",
                          }}
                        >
                          {lead.score.toFixed(1)}
                        </span>
                      </td>
                      <td style={{ padding: "14px 18px", textAlign: "center" }}>
                        {lead.wasClosedWon ? (
                          <span style={{ fontSize: 22 }}>✅</span>
                        ) : (
                          <span style={{ fontSize: 22, opacity: 0.3 }}>⏳</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Empty State */}
          {filteredLeads.length === 0 && (
            <div
              style={{
                textAlign: "center",
                padding: 60,
                color: isDark ? "#64748b" : "#94a3b8",
              }}
            >
              <div style={{ fontSize: 48, marginBottom: 16 }}>🔍</div>
              <div style={{ fontSize: 16, fontWeight: 600 }}>No leads match the selected filters</div>
              <div style={{ fontSize: 14, marginTop: 8 }}>Try adjusting your filter criteria</div>
            </div>
          )}
        </>
      )}

      {/* CSS Animation for spinner */}
      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}

