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
        padding: 32,
        maxWidth: 1400,
        margin: "0 auto",
        color: isDark ? "#f1f5f9" : "#0f172a",
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 32,
            fontWeight: 800,
            marginBottom: 8,
            color: isDark ? "#f1f5f9" : "#0f172a",
          }}
        >
          🔮 ראה את הפוטנציאל של המערכת
        </h1>
        <p style={{ fontSize: 15, color: isDark ? "#94a3b8" : "#64748b", marginBottom: 16 }}>
          ניתוח רטרוספקטיבי - מה היה קורה אם מערכת הניתוב הייתה פעילה בעבר?
        </p>
        <div
          style={{
            padding: 12,
            background: isDark ? "#1e3a8a20" : "#dbeafe",
            border: `1px solid ${isDark ? "#3b82f6" : "#93c5fd"}`,
            borderRadius: 6,
            fontSize: 13,
            color: isDark ? "#93c5fd" : "#1e40af",
          }}
        >
          💡 <strong>הערה:</strong> זהו סימולציה בלבד, ללא השפעה על נתונים קיימים ב-Monday.com
        </div>
      </div>

      {/* Window Selector */}
      <div style={{ marginBottom: 32, display: "flex", gap: 16, alignItems: "center" }}>
        <label style={{ fontSize: 15, fontWeight: 600 }}>בחר חלון זמן:</label>
        <div style={{ display: "flex", gap: 8 }}>
          {([30, 60, 90] as const).map((days) => (
            <button
              key={days}
              onClick={() => setWindowDays(days)}
              disabled={loading}
              style={{
                padding: "8px 20px",
                background:
                  windowDays === days
                    ? isDark
                      ? "#3b82f6"
                      : "#2563eb"
                    : isDark
                    ? "#334155"
                    : "#e2e8f0",
                color: windowDays === days ? "#ffffff" : isDark ? "#cbd5e1" : "#475569",
                border: "none",
                borderRadius: 6,
                fontSize: 14,
                fontWeight: 600,
                cursor: loading ? "not-allowed" : "pointer",
                opacity: loading ? 0.6 : 1,
                transition: "all 0.2s",
              }}
            >
              {days} ימים אחורה
            </button>
          ))}
        </div>
        <button
          onClick={loadPreview}
          disabled={loading}
          style={{
            padding: "8px 20px",
            background: isDark ? "#10b981" : "#059669",
            color: "#ffffff",
            border: "none",
            borderRadius: 6,
            fontSize: 14,
            fontWeight: 600,
            cursor: loading ? "not-allowed" : "pointer",
            opacity: loading ? 0.6 : 1,
            marginLeft: "auto",
          }}
        >
          🔄 רענן
        </button>
      </div>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: "center", padding: 64 }}>
          <div
            style={{
              fontSize: 48,
              marginBottom: 16,
              animation: "spin 1s linear infinite",
            }}
          >
            ⏳
          </div>
          <div style={{ fontSize: 16, color: isDark ? "#94a3b8" : "#64748b" }}>
            טוען נתונים היסטוריים...
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div
          style={{
            padding: 24,
            background: isDark ? "#7f1d1d" : "#fee2e2",
            border: `1px solid ${isDark ? "#991b1b" : "#fca5a5"}`,
            borderRadius: 8,
            color: isDark ? "#fca5a5" : "#991b1b",
          }}
        >
          <strong>❌ שגיאה:</strong> {error}
        </div>
      )}

      {/* Data Display */}
      {data && !loading && (
        <>
          {/* Warning if no Closed Won mapping */}
          {!data.hasClosedWonMapping && (
            <div
              style={{
                padding: 16,
                background: isDark ? "#92400e" : "#fef3c7",
                border: `1px solid ${isDark ? "#b45309" : "#fbbf24"}`,
                borderRadius: 6,
                marginBottom: 24,
                fontSize: 14,
                color: isDark ? "#fde68a" : "#92400e",
              }}
            >
              ⚠️ <strong>שים לב:</strong> לא הוגדר Closed Won Status ב-Field Mapping. לא ניתן
              לחשב אחוז הצלחה מדויק.
            </div>
          )}

          {/* Summary Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
              gap: 24,
              marginBottom: 32,
            }}
          >
            {/* Total Leads */}
            <div style={cardStyle}>
              <div style={labelStyle}>סה"כ Leads</div>
              <div style={valueStyle}>{data.summary.totalLeads}</div>
              <div style={{ fontSize: 12, color: isDark ? "#64748b" : "#94a3b8", marginTop: 8 }}>
                ב-{windowDays} ימים אחרונים
              </div>
            </div>

            {/* Routed Leads */}
            <div style={cardStyle}>
              <div style={labelStyle}>Leads שניתן לנתב</div>
              <div style={valueStyle}>{data.summary.routedLeads}</div>
              <div style={{ fontSize: 12, color: isDark ? "#64748b" : "#94a3b8", marginTop: 8 }}>
                {data.summary.totalLeads > 0
                  ? Math.round((data.summary.routedLeads / data.summary.totalLeads) * 100)
                  : 0}
                % מסך הכל
              </div>
            </div>

            {/* System Success Rate */}
            <div style={{ ...cardStyle, borderColor: isDark ? "#10b981" : "#059669" }}>
              <div style={labelStyle}>Success Rate (מערכת)</div>
              <div style={{ ...valueStyle, color: isDark ? "#10b981" : "#059669" }}>
                {data.summary.systemSuccessRate.toFixed(1)}%
              </div>
              <div style={{ fontSize: 12, color: isDark ? "#64748b" : "#94a3b8", marginTop: 8 }}>
                אם היו עוקבים אחרי המערכת
              </div>
            </div>

            {/* Current Success Rate */}
            <div style={cardStyle}>
              <div style={labelStyle}>Success Rate (נוכחי)</div>
              <div style={smallValueStyle}>{data.summary.currentSuccessRate.toFixed(1)}%</div>
              <div style={{ fontSize: 12, color: isDark ? "#64748b" : "#94a3b8", marginTop: 8 }}>
                שיוכים ידניים
              </div>
            </div>

            {/* Improvement */}
            <div
              style={{
                ...cardStyle,
                borderColor:
                  data.summary.improvement > 0
                    ? isDark
                      ? "#10b981"
                      : "#059669"
                    : isDark
                    ? "#94a3b8"
                    : "#cbd5e1",
              }}
            >
              <div style={labelStyle}>שיפור פוטנציאלי</div>
              <div
                style={{
                  ...smallValueStyle,
                  color:
                    data.summary.improvement > 0
                      ? isDark
                        ? "#10b981"
                        : "#059669"
                      : isDark
                      ? "#94a3b8"
                      : "#64748b",
                }}
              >
                {data.summary.improvement > 0 ? "+" : ""}
                {data.summary.improvement.toFixed(1)}%
              </div>
              <div style={{ fontSize: 12, color: isDark ? "#64748b" : "#94a3b8", marginTop: 8 }}>
                נקודות אחוז
              </div>
            </div>
          </div>

          {/* Charts Section */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))",
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
                  marginBottom: 16,
                  color: isDark ? "#f1f5f9" : "#0f172a",
                }}
              >
                📊 השוואת Success Rate
              </h3>
              <div style={{ display: "flex", gap: 32, alignItems: "center", justifyContent: "center" }}>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: "50%",
                      background: `conic-gradient(${isDark ? "#3b82f6" : "#2563eb"} 0% ${data.summary.systemSuccessRate}%, ${isDark ? "#334155" : "#e2e8f0"} ${data.summary.systemSuccessRate}% 100%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 12px",
                      boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                    }}
                  >
                    <div
                      style={{
                        width: 90,
                        height: 90,
                        borderRadius: "50%",
                        background: isDark ? "#1e293b" : "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        fontWeight: 700,
                        color: isDark ? "#3b82f6" : "#2563eb",
                      }}
                    >
                      {data.summary.systemSuccessRate.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>עם מערכת</div>
                </div>
                <div style={{ textAlign: "center" }}>
                  <div
                    style={{
                      width: 120,
                      height: 120,
                      borderRadius: "50%",
                      background: `conic-gradient(${isDark ? "#64748b" : "#94a3b8"} 0% ${data.summary.currentSuccessRate}%, ${isDark ? "#334155" : "#e2e8f0"} ${data.summary.currentSuccessRate}% 100%)`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      margin: "0 auto 12px",
                      boxShadow: "0 4px 8px rgba(0,0,0,0.1)",
                    }}
                  >
                    <div
                      style={{
                        width: 90,
                        height: 90,
                        borderRadius: "50%",
                        background: isDark ? "#1e293b" : "#ffffff",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        fontWeight: 700,
                        color: isDark ? "#64748b" : "#94a3b8",
                      }}
                    >
                      {data.summary.currentSuccessRate.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>מצב נוכחי</div>
                </div>
              </div>
            </div>

            {/* Lead Distribution Chart */}
            <div style={cardStyle}>
              <h3
                style={{
                  fontSize: 18,
                  fontWeight: 700,
                  marginBottom: 16,
                  color: isDark ? "#f1f5f9" : "#0f172a",
                }}
              >
                📈 התפלגות Leads
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {/* Total Leads Bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>סה"כ Leads</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{data.summary.totalLeads}</span>
                  </div>
                  <div
                    style={{
                      width: "100%",
                      height: 8,
                      background: isDark ? "#334155" : "#e2e8f0",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        background: isDark ? "#3b82f6" : "#2563eb",
                      }}
                    />
                  </div>
                </div>

                {/* Routed Leads Bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>ניתנים לניתוב</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
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
                      height: 8,
                      background: isDark ? "#334155" : "#e2e8f0",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${data.summary.totalLeads > 0 ? (data.summary.routedLeads / data.summary.totalLeads) * 100 : 0}%`,
                        height: "100%",
                        background: isDark ? "#10b981" : "#059669",
                      }}
                    />
                  </div>
                </div>

                {/* Closed Won Bar */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Closed Won</span>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>
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
                      height: 8,
                      background: isDark ? "#334155" : "#e2e8f0",
                      borderRadius: 4,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${data.summary.totalLeads > 0 ? (data.summary.closedWonLeads / data.summary.totalLeads) * 100 : 0}%`,
                        height: "100%",
                        background: isDark ? "#f59e0b" : "#d97706",
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
              padding: 16,
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600 }}>סינון:</span>
            <select
              value={filterIndustry}
              onChange={(e) => setFilterIndustry(e.target.value)}
              style={{
                padding: "6px 12px",
                background: isDark ? "#334155" : "#f1f5f9",
                color: isDark ? "#f1f5f9" : "#0f172a",
                border: `1px solid ${isDark ? "#475569" : "#cbd5e1"}`,
                borderRadius: 6,
                fontSize: 14,
              }}
            >
              <option value="all">כל התעשיות</option>
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
                padding: "6px 12px",
                background: isDark ? "#334155" : "#f1f5f9",
                color: isDark ? "#f1f5f9" : "#0f172a",
                border: `1px solid ${isDark ? "#475569" : "#cbd5e1"}`,
                borderRadius: 6,
                fontSize: 14,
              }}
            >
              <option value="all">כל הסטטוסים</option>
              <option value="closed_won">Closed Won בלבד</option>
              <option value="open">פתוחים בלבד</option>
            </select>
            <span style={{ fontSize: 13, color: isDark ? "#94a3b8" : "#64748b", marginLeft: "auto" }}>
              מציג {filteredLeads.length} מתוך {data.leads.length} leads
            </span>
          </div>

          {/* Leads Table */}
          <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
            <div
              style={{
                overflowX: "auto",
                maxHeight: 600,
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
                    background: isDark ? "#0f172a" : "#f8fafc",
                    borderBottom: `2px solid ${isDark ? "#334155" : "#e2e8f0"}`,
                    zIndex: 1,
                  }}
                >
                  <tr>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>
                      Lead
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>
                      תעשייה
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>
                      סטטוס
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>
                      משוייך ל (בפועל)
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "right", fontWeight: 600 }}>
                      המלצת המערכת
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600 }}>
                      ציון
                    </th>
                    <th style={{ padding: "12px 16px", textAlign: "center", fontWeight: 600 }}>
                      תוצאה
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
                      }}
                    >
                      <td style={{ padding: "12px 16px", fontWeight: 500 }}>{lead.name}</td>
                      <td style={{ padding: "12px 16px" }}>{lead.industry || "-"}</td>
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            padding: "4px 8px",
                            borderRadius: 4,
                            fontSize: 12,
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
                                ? "#10b981"
                                : "#059669"
                              : isDark
                              ? "#94a3b8"
                              : "#64748b",
                          }}
                        >
                          {lead.status}
                        </span>
                      </td>
                      <td style={{ padding: "12px 16px" }}>
                        {lead.assignedTo ? lead.assignedTo.name : "-"}
                      </td>
                      <td style={{ padding: "12px 16px", fontWeight: 600 }}>
                        {lead.recommendedTo ? lead.recommendedTo.name : "-"}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center", fontWeight: 700 }}>
                        {lead.score.toFixed(1)}
                      </td>
                      <td style={{ padding: "12px 16px", textAlign: "center" }}>
                        {lead.wasClosedWon ? (
                          <span style={{ fontSize: 20 }}>✅</span>
                        ) : (
                          <span style={{ fontSize: 20, opacity: 0.3 }}>⏳</span>
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
                padding: 48,
                color: isDark ? "#64748b" : "#94a3b8",
              }}
            >
              לא נמצאו leads התואמים לסינון שנבחר
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

