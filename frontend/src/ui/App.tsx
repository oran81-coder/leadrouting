import React, { lazy, Suspense, useEffect, useState } from "react";
import {
  approve,
  approveAllFiltered,
  adminMondayConnect,
  adminMondayStatus,
  adminMondayTest,
  getApiBase,
  getApiKey,
  listProposals,
  overrideAndApply,
  reject,
  getMetricsConfig,
  updateMetricsConfig,
  recomputeMetrics,
  listMondayBoards,
  listMondayBoardColumns,
  listMondayStatusLabels,
  type MetricsConfigDTO,
  type ManagerProposalDTO,
  previewRouting,
} from "./api";
import { ThemeProvider, useTheme } from "./ThemeContext";
import { AuthProvider, useAuth } from "./AuthContext";
import { NavigationProvider } from "./NavigationContext";
import { ToastProvider } from "./hooks/useToast";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { CardSkeleton } from "./CardSkeleton";
import ErrorBoundary from "./ErrorBoundary";

// ✨ Lazy load heavy screen components for better initial load time
const OutcomesScreen = lazy(() => import("./OutcomesScreen").then(m => ({ default: m.OutcomesScreen })));
const ManagerScreen = lazy(() => import("./ManagerScreen").then(m => ({ default: m.ManagerScreen })));
const AdminScreen = lazy(() => import("./AdminScreen").then(m => ({ default: m.AdminScreen })));
const FieldMappingWizard = lazy(() => import("./FieldMappingWizard").then(m => ({ default: m.FieldMappingWizard })));
const PerformanceDashboard = lazy(() => import("./PerformanceDashboard").then(m => ({ default: m.PerformanceDashboard })));
const SuperAdminDashboard = lazy(() => import("./SuperAdminDashboard").then(m => ({ default: m.SuperAdminDashboard })));
const OrgRegistrationPage = lazy(() => import("./OrgRegistrationPage").then(m => ({ default: m.OrgRegistrationPage })));
const LoginScreen = lazy(() => import("./LoginScreen").then(m => ({ default: m.LoginScreen })));
const PreviewScreen = lazy(() => import("./PreviewScreen").then(m => ({ default: m.PreviewScreen })));
const OrganizationSettingsScreen = lazy(() => import("./OrganizationSettingsScreen").then(m => ({ default: m.OrganizationSettingsScreen })));

type MondayStatusDTO = {
  ok: boolean;
  connected: boolean;
  endpoint?: string;
  tokenMasked?: string;
};

function ThemeToggleButton() {
  const { theme, toggleTheme } = useTheme();
  return (
    <button
      onClick={toggleTheme}
      style={{
        padding: "8px 12px",
        borderRadius: "6px",
        border: "1px solid #ddd",
        background: theme === "dark" ? "#374151" : "#fff",
        color: theme === "dark" ? "#fff" : "#000",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
      title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
    >
      {theme === "light" ? "🌙" : "☀️"}
      {theme === "light" ? "Dark" : "Light"}
    </button>
  );
}

function LogoutButton() {
  const { logout, user } = useAuth();
  const { theme } = useTheme();

  if (!user) return null;

  return (
    <button
      onClick={logout}
      style={{
        padding: "8px 12px",
        borderRadius: "6px",
        border: "1px solid #ddd",
        background: theme === "dark" ? "#374151" : "#fff",
        color: theme === "dark" ? "#fff" : "#000",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
      title={`Logged in as ${user.email}`}
    >
      🚪 Logout
    </button>
  );
}


function AdminMetricsSetup() {
  const [metricsCfg, setMetricsCfg] = useState<MetricsConfigDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  // Routing Preview (simulation)
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewLimit, setPreviewLimit] = useState<number>(10);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewErr, setPreviewErr] = useState<string | null>(null);
  const [previewResults, setPreviewResults] = useState<any[] | null>(null);
  const [expandedLeadId, setExpandedLeadId] = useState<string | null>(null);
  const [expandedAgentId, setExpandedAgentId] = useState<string | null>(null);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<
    | "assignedPeopleColumnId"
    | "closedWonStatusColumnId"
    | "contactedStatusColumnId"
    | "nextCallDateColumnId"
    | "dealAmountColumnId"
    | "industryColumnId"
    | null
  >(null);
  const [pickerBoardId, setPickerBoardId] = useState<string>("");
  const [pickerBoards, setPickerBoards] = useState<Array<{ id: string; name: string }>>([]);
  const [pickerColumns, setPickerColumns] = useState<Array<{ id: string; title: string; type: string }>>([]);
  const [pickerStatusLabels, setPickerStatusLabels] = useState<Array<{ key: string; label: string }>>([]);
  const [pickerErr, setPickerErr] = useState<string | null>(null);
  const [pickerSearch, setPickerSearch] = useState<string>("");

  useEffect(() => {
    (async () => {
      try {
        const mc = await getMetricsConfig();
        setMetricsCfg(mc);
      } catch (e: any) {
        setMsg(e?.message ?? String(e));
      }
    })();
  }, []);

  function getMissing(cfg: MetricsConfigDTO | null): string[] {
    if (!cfg) return [];
    const missing: string[] = [];
    if (!cfg.leadBoardIds || cfg.leadBoardIds.trim().length === 0) missing.push("Lead Board IDs (leadBoardIds)");
    if (!cfg.assignedPeopleColumnId || cfg.assignedPeopleColumnId.trim().length === 0)
      missing.push("Assigned People Column ID (assignedPeopleColumnId)");

    const needsClosed = cfg.enableConversion || cfg.enableHotStreak || cfg.enableAvgDealSize || cfg.enableIndustryPerf;
    if (needsClosed) {
      if (!cfg.closedWonStatusColumnId || cfg.closedWonStatusColumnId.trim().length === 0)
        missing.push("Closed-Won Status Column ID");
      if (!cfg.closedWonStatusValue || cfg.closedWonStatusValue.trim().length === 0) missing.push("Closed-Won Value");
    }

    if (cfg.enableAvgDealSize) {
      if (!cfg.dealAmountColumnId || cfg.dealAmountColumnId.trim().length === 0) missing.push("Deal Amount Column ID");
    }

    if (cfg.enableIndustryPerf) {
      if (!cfg.industryColumnId || cfg.industryColumnId.trim().length === 0) missing.push("Industry Column ID");
    }

    if (cfg.enableResponseSpeed) {
      if (!cfg.contactedStatusColumnId || cfg.contactedStatusColumnId.trim().length === 0)
        missing.push("Contacted Status Column ID");
      if (!cfg.contactedStatusValue || cfg.contactedStatusValue.trim().length === 0) missing.push("Contacted Value");
      if (!cfg.nextCallDateColumnId || cfg.nextCallDateColumnId.trim().length === 0)
        missing.push("Next Call Date Column ID");
    }

    return missing;
  }

  const missing = getMissing(metricsCfg);
  const canRun = !!metricsCfg && missing.length === 0;

  function allowedTypes(target: typeof pickerTarget): string[] {
    if (!target) return [];
    switch (target) {
      case "assignedPeopleColumnId":
        return ["people"];
      case "closedWonStatusColumnId":
      case "contactedStatusColumnId":
        return ["status"];
      case "nextCallDateColumnId":
        return ["date"];
      case "dealAmountColumnId":
        return ["numeric", "numbers", "number"];
      case "industryColumnId":
        return ["text", "dropdown", "tags", "color", "long_text"];
      default:
        return [];
    }
  }

  async function openPicker(target: typeof pickerTarget) {
    if (!metricsCfg) return;
    setPickerErr(null);
    setPickerTarget(target);
    setPickerOpen(true);
    setPickerSearch("");
    try {
      const boardsAll = await listMondayBoards();
const leadIds = (metricsCfg.leadBoardIds || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);
const boards = leadIds.length ? boardsAll.filter((b) => leadIds.includes(String(b.id))) : boardsAll;
      setPickerBoards(boards);
      const firstFromCfg = metricsCfg.leadBoardIds?.split(",").map((x) => x.trim()).filter(Boolean)?.[0] ?? "";
      const initial = firstFromCfg || boards?.[0]?.id || "";
      setPickerBoardId(initial);
      if (initial) {
        const cols = await listMondayBoardColumns(initial);
        setPickerColumns(cols.map((c) => ({ id: c.id, title: c.title, type: c.type })));
      } else {
        setPickerColumns([]);
      }
      setPickerStatusLabels([]);
    } catch (e: any) {
      setPickerErr(e?.message ?? String(e));
    }
  }

  async function onPickerBoardChange(boardId: string) {
    setPickerBoardId(boardId);
    setPickerStatusLabels([]);
    try {
      const cols = await listMondayBoardColumns(boardId);
      setPickerColumns(cols.map((c) => ({ id: c.id, title: c.title, type: c.type })));
    } catch (e: any) {
      setPickerErr(e?.message ?? String(e));
    }
  }

  async function pickColumn(colId: string) {
    if (!metricsCfg || !pickerTarget) return;

    setMetricsCfg({ ...metricsCfg, [pickerTarget]: colId } as any);

    if (pickerTarget === "closedWonStatusColumnId" || pickerTarget === "contactedStatusColumnId") {
      try {
        const labels = await listMondayStatusLabels(pickerBoardId, colId);
        setPickerStatusLabels(labels);
      } catch (e: any) {
        setPickerErr(e?.message ?? String(e));
      }
    } else {
      setPickerOpen(false);
      setPickerTarget(null);
      setPickerStatusLabels([]);
    }
  }

  function pickStatusValue(value: string) {
    if (!metricsCfg || !pickerTarget) return;
    if (pickerTarget === "closedWonStatusColumnId") setMetricsCfg({ ...metricsCfg, closedWonStatusValue: value });
    if (pickerTarget === "contactedStatusColumnId") setMetricsCfg({ ...metricsCfg, contactedStatusValue: value });
    setPickerOpen(false);
    setPickerTarget(null);
    setPickerStatusLabels([]);
  }

  if (!metricsCfg) return <div style={{ fontSize: 13, opacity: 0.85 }}>Loading metrics config…</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
      <h3 style={{ marginTop: 0 }}>Metrics Setup (Wizard)</h3>

      {!canRun ? (
        <div style={{ padding: 10, border: "1px solid #f1c40f", borderRadius: 8, background: "rgba(241, 196, 15, 0.08)" }}>
          <div style={{ fontWeight: 700, marginBottom: 6 }}>Missing required mappings</div>
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {missing.map((x) => (
              <li key={x}>{x}</li>
            ))}
          </ul>
          <div style={{ marginTop: 6, opacity: 0.85 }}>
            Save/Recalculate are disabled until these are filled. (When you enable a metric, its required mapping fields become mandatory.)
          </div>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          Lead Board IDs (comma separated)
          <input value={metricsCfg.leadBoardIds || ""} onChange={(e) => setMetricsCfg({ ...metricsCfg, leadBoardIds: e.target.value })} style={{ width: 520 }} />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          Assigned People Column ID
          <input value={metricsCfg.assignedPeopleColumnId || ""} onChange={(e) => setMetricsCfg({ ...metricsCfg, assignedPeopleColumnId: e.target.value })} style={{ width: 320 }} />
          <button type="button" onClick={() => openPicker("assignedPeopleColumnId")} style={{ marginTop: 6, width: 140 }}>
            Pick from Monday
          </button>
        </label>
      </div>

      <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
        {[
          ["enableIndustryPerf", "Industry Perf"],
          ["enableConversion", "Conversion"],
          ["enableAvgDealSize", "Avg Deal"],
          ["enableHotStreak", "Hot Streak"],
          ["enableResponseSpeed", "Response Speed"],
          ["enableBurnout", "Burnout"],
          ["enableAvailabilityCap", "Availability/Cap"],
        ].map(([k, label]) => (
          <label key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <input type="checkbox" checked={(metricsCfg as any)[k]} onChange={(e) => setMetricsCfg({ ...(metricsCfg as any), [k]: e.target.checked })} />
            {label}
          </label>
        ))}
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          Deal Amount Column ID
          <input value={metricsCfg.dealAmountColumnId || ""} onChange={(e) => setMetricsCfg({ ...metricsCfg, dealAmountColumnId: e.target.value })} style={{ width: 260 }} disabled={!metricsCfg.enableAvgDealSize} />
          <button type="button" onClick={() => openPicker("dealAmountColumnId")} style={{ marginTop: 6, width: 140 }} disabled={!metricsCfg.enableAvgDealSize}>
            Pick from Monday
          </button>
          <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>If Deal Amount is on another board, mirror/copy it into the Lead Board and select the mirrored column.</div>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          Industry Column ID
          <input value={metricsCfg.industryColumnId || ""} onChange={(e) => setMetricsCfg({ ...metricsCfg, industryColumnId: e.target.value })} style={{ width: 260 }} disabled={!metricsCfg.enableIndustryPerf} />
          <button type="button" onClick={() => openPicker("industryColumnId")} style={{ marginTop: 6, width: 140 }} disabled={!metricsCfg.enableIndustryPerf}>
            Pick from Monday
          </button>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          Closed-Won Status Column ID
          <input value={metricsCfg.closedWonStatusColumnId || ""} onChange={(e) => setMetricsCfg({ ...metricsCfg, closedWonStatusColumnId: e.target.value })} style={{ width: 260 }} />
          <button type="button" onClick={() => openPicker("closedWonStatusColumnId")} style={{ marginTop: 6, width: 140 }}>
            Pick from Monday
          </button>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          Closed-Won Value
          <input value={metricsCfg.closedWonStatusValue || ""} onChange={(e) => setMetricsCfg({ ...metricsCfg, closedWonStatusValue: e.target.value })} style={{ width: 200 }} />
        </label>
      </div>

      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          Contacted Status Column ID
          <input value={metricsCfg.contactedStatusColumnId || ""} onChange={(e) => setMetricsCfg({ ...metricsCfg, contactedStatusColumnId: e.target.value })} style={{ width: 260 }} disabled={!metricsCfg.enableResponseSpeed} />
          <button type="button" onClick={() => openPicker("contactedStatusColumnId")} style={{ marginTop: 6, width: 140 }} disabled={!metricsCfg.enableResponseSpeed}>
            Pick from Monday
          </button>
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          Contacted Value
          <input value={metricsCfg.contactedStatusValue || ""} onChange={(e) => setMetricsCfg({ ...metricsCfg, contactedStatusValue: e.target.value })} style={{ width: 200 }} disabled={!metricsCfg.enableResponseSpeed} />
        </label>

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          Next Call Date Column ID
          <input value={metricsCfg.nextCallDateColumnId || ""} onChange={(e) => setMetricsCfg({ ...metricsCfg, nextCallDateColumnId: e.target.value })} style={{ width: 220 }} disabled={!metricsCfg.enableResponseSpeed} />
          <button type="button" onClick={() => openPicker("nextCallDateColumnId")} style={{ marginTop: 6, width: 140 }} disabled={!metricsCfg.enableResponseSpeed}>
            Pick from Monday
          </button>
        </label>
      </div>

      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
        <button
          onClick={async () => {
            setSaving(true);
            setMsg(null);
            try {
              await updateMetricsConfig(metricsCfg);
              const fresh = await getMetricsConfig();
              setMetricsCfg(fresh);
              setMsg("Saved ✅");
            } catch (e: any) {
              setMsg(e?.message ?? String(e));
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving || !canRun}
        >
          Save metrics config
        </button>

        <button
          onClick={async () => {
            setSaving(true);
            setMsg(null);
            try {
              const out = await recomputeMetrics();
              setMsg(`Recomputed ✅ agents=${out.agents ?? "?"}`);
            } catch (e: any) {
              setMsg(e?.message ?? String(e));
            } finally {
              setSaving(false);
            }
          }}
          disabled={saving || !canRun}
        >
          Recalculate now
        </button>
<button
  onClick={async () => {
    setPreviewErr(null);
    setPreviewResults(null);
    setPreviewOpen(true);
    setPreviewLoading(true);
    try {
      const out = await previewRouting(previewLimit);
      setPreviewResults(out.results as any[]);
    } catch (e: any) {
      setPreviewErr(e?.message ?? String(e));
    } finally {
      setPreviewLoading(false);
    }
  }}
  disabled={saving || !canRun}
>
  Preview routing
</button>

        {msg ? <span style={{ opacity: 0.9 }}>{msg}</span> : null}
      </div>

      {pickerOpen ? (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => {
            setPickerOpen(false);
            setPickerTarget(null);
            setPickerStatusLabels([]);
          }}
        >
          <div style={{ width: 760, background: "#fff", borderRadius: 10, padding: 14 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 800 }}>Pick from Monday</div>
              <button
                type="button"
                onClick={() => {
                  setPickerOpen(false);
                  setPickerTarget(null);
                  setPickerStatusLabels([]);
                }}
              >
                Close
              </button>
            </div>

            {pickerErr ? (
              <div style={{ marginTop: 10, padding: 10, background: "rgba(231, 76, 60, 0.08)", border: "1px solid #e74c3c", borderRadius: 8 }}>
                {pickerErr}
              </div>
            ) : null}

      {previewOpen ? (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.45)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
          }}
          onClick={() => {
            setPreviewOpen(false);
            setExpandedLeadId(null);
            setExpandedAgentId(null);
          }}
        >
          <div style={{ width: 900, background: "#fff", borderRadius: 10, padding: 14 }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontWeight: 800 }}>Routing Preview (Simulation)</div>
              <button
                type="button"
                onClick={() => {
                  setPreviewOpen(false);
                  setExpandedLeadId(null);
                  setExpandedAgentId(null);
                }}
              >
                Close
              </button>
            </div>

            <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>Simulation only. No leads will be assigned or modified.</div>

            <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                Leads to preview
                <select value={previewLimit} onChange={(e) => setPreviewLimit(Number(e.target.value))} disabled={previewLoading} style={{ width: 120 }}>
                  {[5, 10, 20, 30, 50].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </label>

              <button
                type="button"
                onClick={async () => {
                  setPreviewErr(null);
                  setPreviewResults(null);
                  setPreviewLoading(true);
                  try {
                    const out = await previewRouting(previewLimit);
                    setPreviewResults(out.results as any[]);
                  } catch (e: any) {
                    setPreviewErr(e?.message ?? String(e));
                  } finally {
                    setPreviewLoading(false);
                  }
                }}
                disabled={previewLoading || !canRun}
              >
                Run preview
              </button>

              {previewLoading ? <div style={{ fontSize: 12, opacity: 0.8 }}>Loading…</div> : null}
              {previewErr ? (
                <div style={{ fontSize: 12, color: "#c0392b" }}>
                  {previewErr}
                </div>
              ) : null}
            </div>

            <div style={{ marginTop: 12, maxHeight: 520, overflow: "auto", border: "1px solid #eee", borderRadius: 8 }}>
              {!previewResults ? (
                <div style={{ padding: 12, fontSize: 13, opacity: 0.8 }}>Run preview to see results.</div>
              ) : previewResults.length === 0 ? (
                <div style={{ padding: 12, fontSize: 13, opacity: 0.8 }}>No eligible leads found for preview.</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 10, padding: 12 }}>
                  {(previewResults as any[]).map((r) => (
                    <div key={r.leadId} style={{ border: "1px solid #eee", borderRadius: 10, padding: 10 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                        <div style={{ fontWeight: 800 }}>
                          Lead {r.leadName ? `${r.leadName}` : r.leadId}{" "}
                          <span style={{ fontWeight: 400, opacity: 0.75 }}>({r.leadId})</span>
                        </div>
                        <div style={{ fontSize: 12, opacity: 0.8 }}>
                          Board: {r.boardName || r.boardId} • Industry: {r.industry || "—"} • Winner:{" "}
                          <b>{r.winnerAgentName || r.winnerAgentId || "—"}</b>
                        </div>
                      </div>

                      <div style={{ marginTop: 8, borderTop: "1px solid #eee" }} />

                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13, marginTop: 8 }}>
                        <thead>
                          <tr style={{ background: "rgba(0,0,0,0.03)" }}>
                            <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Rank</th>
                            <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Agent</th>
                            <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Score</th>
                            <th style={{ padding: 8, borderBottom: "1px solid #eee" }} />
                          </tr>
                        </thead>
                        <tbody>
                          {(r.agents || []).slice(0, 8).map((a: any, idx: number) => (
                            <React.Fragment key={a.agentUserId || a.agentId || idx}>
                              <tr>
                                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{idx + 1}</td>
                                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{a.agentName || a.agentUserId}</td>
                                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{typeof a.score === "number" ? a.score.toFixed(2) : a.score}</td>
                                <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const key = String(a.agentUserId || a.agentId || idx);
                                      if (expandedLeadId === r.leadId && expandedAgentId === key) {
                                        setExpandedLeadId(null);
                                        setExpandedAgentId(null);
                                      } else {
                                        setExpandedLeadId(r.leadId);
                                        setExpandedAgentId(key);
                                      }
                                    }}
                                  >
                                    View
                                  </button>
                                </td>
                              </tr>
                              {expandedLeadId === r.leadId && expandedAgentId === String(a.agentUserId || a.agentId || idx) ? (
                                <tr>
                                  <td colSpan={4} style={{ padding: 10, background: "rgba(0,0,0,0.02)", borderBottom: "1px solid #eee" }}>
                                    <div style={{ fontWeight: 700, marginBottom: 6 }}>Score breakdown</div>
                                    <div style={{ overflowX: "auto" }}>
  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
    <thead>
      <tr style={{ background: "rgba(0,0,0,0.03)" }}>
        <th style={{ textAlign: "left", padding: 6, borderBottom: "1px solid #ddd" }}>Variable</th>
        <th style={{ textAlign: "right", padding: 6, borderBottom: "1px solid #ddd" }}>Weight (%)</th>
        <th style={{ textAlign: "right", padding: 6, borderBottom: "1px solid #ddd" }}>Points</th>
      </tr>
    </thead>
    <tbody>
      {(() => {
        const breakdown = a.breakdown || a.explain || {};
        const rows = [
          { key: "industry", label: "Industry fit", weight: metricsCfg.weightIndustryPerf },
          { key: "conversion", label: "Conversion rate", weight: metricsCfg.weightConversion },
          { key: "avgDeal", label: "Avg deal size", weight: metricsCfg.weightAvgDeal },
          { key: "hotStreak", label: "Hot streak", weight: metricsCfg.weightHotStreak },
          { key: "responseSpeed", label: "Response speed", weight: metricsCfg.weightResponseSpeed },
          { key: "burnout", label: "Burnout", weight: metricsCfg.weightBurnout },
          { key: "availabilityCap", label: "Availability / daily cap", weight: metricsCfg.weightAvailabilityCap },
        ];

        // Build a set of used keys, then append any extra keys returned by backend (future-proof)
        const used = new Set(rows.map((r) => r.key));
        const extras = Object.keys(breakdown)
          .filter((k) => !used.has(k))
          .map((k) => ({ key: k, label: k, weight: undefined as any }));

        const finalRows = [...rows, ...extras].filter((r) => breakdown[r.key] !== undefined);

        return finalRows.map((r) => (
          <tr key={r.key}>
            <td style={{ padding: 6, borderBottom: "1px solid #eee" }}>{r.label}</td>
            <td style={{ padding: 6, borderBottom: "1px solid #eee", textAlign: "right" }}>
              {typeof r.weight === "number" ? r.weight : "—"}
            </td>
            <td style={{ padding: 6, borderBottom: "1px solid #eee", textAlign: "right" }}>
              {typeof breakdown[r.key] === "number" ? Number(breakdown[r.key]).toFixed(2) : String(breakdown[r.key])}
            </td>
          </tr>
        ));
      })()}
    </tbody>
  </table>
</div>
                                  </td>
                                </tr>
                              ) : null}
                            </React.Fragment>
                          ))}
                        </tbody>
                      </table>

                      {(r.agents || []).length > 8 ? (
                        <div style={{ marginTop: 6, fontSize: 12, opacity: 0.75 }}>Showing top 8 agents. (Increase later if needed.)</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{ marginTop: 10, fontSize: 12, opacity: 0.75 }}>Simulation only. No changes were applied.</div>
          </div>
        </div>
      ) : null}


            <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                Board
                <select value={pickerBoardId} onChange={(e) => onPickerBoardChange(e.target.value)} style={{ width: 520 }}>
                  {pickerBoards.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.id})
                    </option>
                  ))}
                </select>
              </label>

              <div style={{ opacity: 0.8, fontSize: 12 }}>Allowed types: {allowedTypes(pickerTarget).join(", ") || "—"}</div>
              <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                Search columns
                <input value={pickerSearch} onChange={(e) => setPickerSearch(e.target.value)} placeholder="type to filter..." style={{ width: 240 }} />
              </label>
            </div>

            {pickerStatusLabels.length ? (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 700, marginBottom: 8 }}>Pick status value</div>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  {pickerStatusLabels.slice(0, 80).map((x) => (
                    <button key={x.key} type="button" onClick={() => pickStatusValue(x.label)}>
                      {x.label}
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                  We save the label text as the value. (If you prefer saving the status key, we can switch.)
                </div>
              </div>
            ) : (
              <div style={{ marginTop: 14, maxHeight: 360, overflow: "auto", border: "1px solid #eee", borderRadius: 8 }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: "rgba(0,0,0,0.03)" }}>
                      <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Title</th>
                      <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Type</th>
                      <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>ID</th>
                      <th style={{ padding: 8, borderBottom: "1px solid #eee" }} />
                    </tr>
                  </thead>
                  <tbody>
                    {pickerColumns
                      .filter((c) => {
                        const okType =
                          allowedTypes(pickerTarget).length === 0 || allowedTypes(pickerTarget).includes(c.type);
                        if (!okType) return false;

                        const q = (pickerSearch || "").trim().toLowerCase();
                        if (!q) return true;

                        return (
                          String(c.title).toLowerCase().includes(q) ||
                          String(c.id).toLowerCase().includes(q) ||
                          String(c.type).toLowerCase().includes(q)
                        );
                      })
                      .map((c) => (
                        <tr key={c.id}>
                          <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{c.title}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{c.type}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{c.id}</td>
                          <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                            <button type="button" onClick={() => pickColumn(c.id)}>
                              Select
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : null}

      <div style={{ fontSize: 12, opacity: 0.75 }}>Tip: for Status columns, picker will prompt for the label after selecting the column.</div>
    </div>
  );
}

export default function App() {
  const { user } = useAuth(); // Get current user for role-based features
  const [view, setView] = useState<"manager" | "admin" | "outcomes" | "mapping" | "performance" | "super-admin" | "register" | "preview" | "org-settings">("admin");

  // global connection settings
  const [apiBase, setApiBase] = useState(getApiBase());
  const [apiKey, setApiKey] = useState(getApiKey());
  const [globalMsg, setGlobalMsg] = useState<string | null>(null);
  const [mondayUsers, setMondayUsers] = useState<any[]>([]);
  const [mondayUsersLoading, setMondayUsersLoading] = useState(false);

  // manager
  const [statusFilter, setStatusFilter] = useState<string>("PENDING");
  const [proposals, setProposals] = useState<ManagerProposalDTO[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [loadingProposals, setLoadingProposals] = useState(false);

  // admin - monday connection
  const [mondayStatus, setMondayStatus] = useState<MondayStatusDTO | null>(null);
  const [mondayToken, setMondayToken] = useState("");
  const [mondayEndpoint, setMondayEndpoint] = useState("");
  const [adminMsg, setAdminMsg] = useState<string | null>(null);

  // admin - metrics
  const [metricsCfg, setMetricsCfg] = useState<MetricsConfigDTO | null>(null);
  const [metricsSaving, setMetricsSaving] = useState(false);
  const [metricsMsg, setMetricsMsg] = useState<string | null>(null);

  // picker modal state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<
    | "assignedPeopleColumnId"
    | "closedWonStatusColumnId"
    | "contactedStatusColumnId"
    | "nextCallDateColumnId"
    | "dealAmountColumnId"
    | "industryColumnId"
    | null
  >(null);
  const [pickerBoards, setPickerBoards] = useState<Array<{ id: string; name: string }>>([]);
  const [pickerBoardId, setPickerBoardId] = useState<string>("");
  const [pickerColumns, setPickerColumns] = useState<Array<{ id: string; title: string; type: string }>>([]);
  const [pickerStatusLabels, setPickerStatusLabels] = useState<Array<{ key: string; label: string }>>([]);
  const [pickerErr, setPickerErr] = useState<string | null>(null);

  // Global keyboard shortcuts
  useKeyboardShortcuts({
    "1": () => setView("admin"),
    "2": () => setView("manager"),
    "3": () => setView("outcomes"),
    "4": () => setView("mapping"),
    "5": () => setView("performance"),
    "6": () => setView("super-admin"),
    "7": () => setView("register"),
    "r": () => {
      if (view === "manager") refreshManager(true);
      else if (view === "admin") refreshAdmin();
    },
  });

  function persistConnection() {
    localStorage.setItem("apiBase", apiBase);
    localStorage.setItem("apiKey", apiKey);
    setGlobalMsg("Saved ✅");
    setTimeout(() => setGlobalMsg(null), 1200);
  }

  async function refreshManager(resetCursor = true) {
    setLoadingProposals(true);
    try {
      const data = await listProposals({ status: statusFilter || undefined, limit: 25, cursor: resetCursor ? undefined : cursor || undefined });
      setProposals(resetCursor ? data.items : [...proposals, ...data.items]);
      setCursor(data.nextCursor);
    } finally {
      setLoadingProposals(false);
    }
  }

  async function refreshAdmin() {
    try {
      const s = await adminMondayStatus();
      setMondayStatus(s);
    } catch (e: any) {
      setAdminMsg(e?.message ?? String(e));
    }
    try {
      const mc = await getMetricsConfig();
      setMetricsCfg(mc);
    } catch (e: any) {
      // ignore if not configured yet; still show msg
      setMetricsMsg(e?.message ?? String(e));
    }
  }

  useEffect(() => {
    if (view === "manager") refreshManager(true);
    if (view === "admin") refreshAdmin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, statusFilter]);

  // Load Monday status on mount and periodically
  useEffect(() => {
    async function loadMondayStatus() {
      try {
        const status = await adminMondayStatus();
        setMondayStatus(status);
      } catch (e) {
        console.error("Error loading Monday status:", e);
      }
    }
    
    // Load immediately
    loadMondayStatus();
    
    // Refresh every 30 seconds
    const interval = setInterval(loadMondayStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  function getMissingMetricsFields(cfg: MetricsConfigDTO | null): string[] {
    if (!cfg) return [];
    const missing: string[] = [];

    if (!cfg.leadBoardIds || cfg.leadBoardIds.trim().length === 0) missing.push("Lead Board IDs (leadBoardIds)");
    if (!cfg.assignedPeopleColumnId || cfg.assignedPeopleColumnId.trim().length === 0) missing.push("Assigned People Column ID (assignedPeopleColumnId)");

    const needsClosed = cfg.enableConversion || cfg.enableHotStreak || cfg.enableAvgDealSize || cfg.enableIndustryPerf;
    if (needsClosed) {
      if (!cfg.closedWonStatusColumnId || cfg.closedWonStatusColumnId.trim().length === 0) missing.push("Closed-Won Status Column ID");
      if (!cfg.closedWonStatusValue || cfg.closedWonStatusValue.trim().length === 0) missing.push("Closed-Won Value");
    }

    if (cfg.enableAvgDealSize) {
      if (!cfg.dealAmountColumnId || cfg.dealAmountColumnId.trim().length === 0) missing.push("Deal Amount Column ID");
    }

    if (cfg.enableIndustryPerf) {
      if (!cfg.industryColumnId || cfg.industryColumnId.trim().length === 0) missing.push("Industry Column ID");
    }

    if (cfg.enableResponseSpeed) {
      if (!cfg.contactedStatusColumnId || cfg.contactedStatusColumnId.trim().length === 0) missing.push("Contacted Status Column ID");
      if (!cfg.contactedStatusValue || cfg.contactedStatusValue.trim().length === 0) missing.push("Contacted Value");
      if (!cfg.nextCallDateColumnId || cfg.nextCallDateColumnId.trim().length === 0) missing.push("Next Call Date Column ID");
    }

    return missing;
  }

  const missingMetricsFields = getMissingMetricsFields(metricsCfg);
  const canSaveMetrics = !!metricsCfg && missingMetricsFields.length === 0;

  function allowedTypes(target: typeof pickerTarget): string[] {
    if (!target) return [];
    switch (target) {
      case "assignedPeopleColumnId":
        return ["people"];
      case "closedWonStatusColumnId":
      case "contactedStatusColumnId":
        return ["status"];
      case "nextCallDateColumnId":
        return ["date"];
      case "dealAmountColumnId":
        return ["numeric", "numbers", "number"];
      case "industryColumnId":
        return ["text", "dropdown", "tags", "color", "long_text"];
      default:
        return [];
    }
  }

  async function openPicker(target: typeof pickerTarget) {
    if (!metricsCfg) return;
    setPickerErr(null);
    setPickerTarget(target);
    setPickerOpen(true);
    try {
      const boardsAll = await listMondayBoards();
const leadIds = (metricsCfg.leadBoardIds || "")
  .split(",")
  .map((x) => x.trim())
  .filter(Boolean);
const boards = leadIds.length ? boardsAll.filter((b) => leadIds.includes(String(b.id))) : boardsAll;
      setPickerBoards(boards);
      const firstFromCfg = metricsCfg.leadBoardIds
        ?.split(",")
        .map((x) => x.trim())
        .filter(Boolean)?.[0];
      const initial = firstFromCfg || boards?.[0]?.id || "";
      setPickerBoardId(initial);
      if (initial) {
        const cols = await listMondayBoardColumns(initial);
        setPickerColumns(cols.map((c) => ({ id: c.id, title: c.title, type: c.type })));
      } else {
        setPickerColumns([]);
      }
      setPickerStatusLabels([]);
    } catch (e: any) {
      setPickerErr(e?.message ?? String(e));
    }
  }

  async function onPickerBoardChange(boardId: string) {
    setPickerBoardId(boardId);
    setPickerStatusLabels([]);
    try {
      const cols = await listMondayBoardColumns(boardId);
      setPickerColumns(cols.map((c) => ({ id: c.id, title: c.title, type: c.type })));
    } catch (e: any) {
      setPickerErr(e?.message ?? String(e));
    }
  }

  async function pickColumn(colId: string) {
    if (!metricsCfg || !pickerTarget) return;
    setMetricsCfg({ ...metricsCfg, [pickerTarget]: colId } as any);

    if (pickerTarget === "closedWonStatusColumnId" || pickerTarget === "contactedStatusColumnId") {
      try {
        const labels = await listMondayStatusLabels(pickerBoardId, colId);
        setPickerStatusLabels(labels);
      } catch (e: any) {
        setPickerErr(e?.message ?? String(e));
      }
      return;
    }

    setPickerOpen(false);
    setPickerTarget(null);
  }

  function pickStatusValue(value: string) {
    if (!metricsCfg || !pickerTarget) return;
    if (pickerTarget === "closedWonStatusColumnId") {
      setMetricsCfg({ ...metricsCfg, closedWonStatusValue: value });
    } else if (pickerTarget === "contactedStatusColumnId") {
      setMetricsCfg({ ...metricsCfg, contactedStatusValue: value });
    }
    setPickerOpen(false);
    setPickerTarget(null);
    setPickerStatusLabels([]);
  }

  return (
    <NavigationProvider setView={setView}>
      <div style={{ padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial" }}>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button 
            onClick={() => setView("admin")} 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === "admin" 
                ? "bg-blue-600 text-white" 
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            Admin
          </button>
        <button 
          onClick={() => setView("manager")} 
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            view === "manager" 
              ? "bg-blue-600 text-white" 
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          Manager
        </button>
        <button 
          onClick={() => setView("outcomes")} 
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            view === "outcomes" 
              ? "bg-blue-600 text-white" 
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          Outcomes
        </button>
        <button 
          onClick={() => setView("mapping")} 
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            view === "mapping" 
              ? "bg-blue-600 text-white" 
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          Field Mapping
        </button>
        <button 
          onClick={() => setView("performance")} 
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            view === "performance" 
              ? "bg-blue-600 text-white" 
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          📊 Performance
        </button>
        <button 
          onClick={() => setView("preview")} 
          className={`px-4 py-2 rounded-lg font-medium transition-colors ${
            view === "preview" 
              ? "bg-blue-600 text-white" 
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
          title="ראה מה היה קורה אם המערכת הייתה פעילה בעבר"
        >
          🔮 Preview
        </button>

        {/* Organization Settings - only visible to admin users */}
        {user && user.role === "admin" && (
          <button 
            onClick={() => setView("org-settings")} 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === "org-settings" 
                ? "bg-blue-600 text-white" 
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
            title="Manage your organization settings"
          >
            🏢 Organization
          </button>
        )}
        
        {/* Super Admin button - only visible to super_admin users */}
        {user && user.role === "super_admin" && (
          <button 
            onClick={() => setView("super-admin")} 
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              view === "super-admin" 
                ? "bg-blue-600 text-white" 
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            👑 Super Admin
          </button>
        )}

        <ThemeToggleButton />
        <LogoutButton />

        {/* Monday Connection Status Indicator */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
          <svg className="w-4 h-4 text-gray-600 dark:text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
          </svg>
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            Monday:
          </span>
          {mondayStatus ? (
            mondayStatus.connected ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                ✓ Connected
              </span>
            ) : (
              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                ✗ Not Connected
              </span>
            )
          ) : (
            <span className="text-xs text-gray-500 dark:text-gray-400 animate-pulse">Loading...</span>
          )}
        </div>

        <div style={{ width: 1, height: 18, background: "#ddd", margin: "0 8px" }} />

        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          API Base
          <input value={apiBase} onChange={(e) => setApiBase(e.target.value)} style={{ width: 320 }} />
        </label>
        <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
          API Key
          <input 
            value={apiKey} 
            onChange={(e) => setApiKey(e.target.value)} 
            style={{ width: 220 }} 
            placeholder="dev_key_123 (auto in dev)"
            title="Development default: dev_key_123. Change only if using custom API key."
          />
        </label>
        <button onClick={persistConnection}>Save</button>
        {globalMsg ? <span style={{ opacity: 0.8 }}>{globalMsg}</span> : null}
      </div>

      <hr style={{ margin: "16px 0" }} />

      <Suspense fallback={<div className="p-8"><CardSkeleton count={3} /></div>}>
        {view === "outcomes" && <OutcomesScreen />}
        {view === "manager" && <ManagerScreen />}
        {view === "admin" && <AdminScreen />}
        {view === "mapping" && <FieldMappingWizard />}
        {view === "performance" && <PerformanceDashboard />}
        {view === "preview" && <PreviewScreen />}
        {view === "org-settings" && <OrganizationSettingsScreen />}
        {view === "super-admin" && <SuperAdminDashboard />}
        {view === "register" && <OrgRegistrationPage />}
      </Suspense>

      {/* OLD ADMIN CODE - TO BE REMOVED
      {view === "admin" ? (
        <div>
          <h2 style={{ marginTop: 0 }}>Admin – Monday Connection + Metrics Wizard</h2>

          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <div>
              <div style={{ fontWeight: 700 }}>Monday status</div>
              <div style={{ fontSize: 13, opacity: 0.85 }}>
                {mondayStatus
                  ? mondayStatus.connected
                    ? `Connected ✅ (${mondayStatus.endpoint || "default"})`
                    : "Not connected"
                  : "Loading…"}
              </div>
            </div>

            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              Token
              <input value={mondayToken} onChange={(e) => setMondayToken(e.target.value)} style={{ width: 320 }} />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
              Endpoint (optional)
              <input value={mondayEndpoint} onChange={(e) => setMondayEndpoint(e.target.value)} style={{ width: 320 }} />
            </label>

            <button
              onClick={async () => {
                setAdminMsg(null);
                try {
                  await adminMondayConnect(mondayToken, mondayEndpoint || undefined);
                  await refreshAdmin();
                  setAdminMsg("Connected ✅");
                } catch (e: any) {
                  setAdminMsg(e?.message ?? String(e));
                }
              }}
            >
              Connect
            </button>

            <button
              onClick={async () => {
                setAdminMsg(null);
                try {
                  await adminMondayTest();
                  setAdminMsg("Test OK ✅");
                } catch (e: any) {
                  setAdminMsg(e?.message ?? String(e));
                }
              }}
            >
              Test
            </button>

            <button onClick={() => refreshAdmin()}>Refresh</button>

            {adminMsg ? <span style={{ opacity: 0.85 }}>{adminMsg}</span> : null}
          </div>

          <hr style={{ margin: "16px 0" }} />

          <div style={{ marginTop: 18 }}>
            <AdminMetricsSetup />
          </div>


          <h3 style={{ marginTop: 0 }}>Metrics Setup</h3>

          {!metricsCfg ? (
            <div style={{ fontSize: 13, opacity: 0.85 }}>Loading metrics config…</div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 10, fontSize: 13 }}>
              {!canSaveMetrics ? (
                <div
                  style={{
                    padding: 10,
                    border: "1px solid #f1c40f",
                    borderRadius: 8,
                    background: "rgba(241, 196, 15, 0.08)",
                  }}
                >
                  <div style={{ fontWeight: 700, marginBottom: 6 }}>Missing required mappings</div>
                  <ul style={{ margin: 0, paddingLeft: 18 }}>
                    {missingMetricsFields.map((x) => (
                      <li key={x}>{x}</li>
                    ))}
                  </ul>
                  <div style={{ marginTop: 6, opacity: 0.85 }}>
                    Save/Recalculate are disabled until these are filled. (When you enable a metric, its required mapping fields become mandatory.)
                  </div>
                </div>
              ) : null}

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  Lead Board IDs (comma separated)
                  <input
                    value={metricsCfg.leadBoardIds || ""}
                    onChange={(e) => setMetricsCfg({ ...metricsCfg, leadBoardIds: e.target.value })}
                    style={{ width: 520 }}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  Assigned People Column ID
                  <input
                    value={metricsCfg.assignedPeopleColumnId || ""}
                    onChange={(e) => setMetricsCfg({ ...metricsCfg, assignedPeopleColumnId: e.target.value })}
                    style={{ width: 320 }}
                  />
                  <button type="button" onClick={() => openPicker("assignedPeopleColumnId")} style={{ marginTop: 6, width: 160 }}>
                    Pick from Monday
                  </button>
                </label>
              </div>

              <div style={{ display: "flex", gap: 18, flexWrap: "wrap" }}>
                {[
                  ["enableIndustryPerf", "Industry Perf"],
                  ["enableConversion", "Conversion"],
                  ["enableAvgDealSize", "Avg Deal"],
                  ["enableHotStreak", "Hot Streak"],
                  ["enableResponseSpeed", "Response Speed"],
                  ["enableBurnout", "Burnout"],
                  ["enableAvailabilityCap", "Availability/Cap"],
                ].map(([k, label]) => (
                  <label key={k} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <input
                      type="checkbox"
                      checked={(metricsCfg as any)[k]}
                      onChange={(e) => setMetricsCfg({ ...(metricsCfg as any), [k]: e.target.checked })}
                    />
                    {label}
                  </label>
                ))}
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  Deal Amount Column ID
                  <input
                    value={metricsCfg.dealAmountColumnId || ""}
                    onChange={(e) => setMetricsCfg({ ...metricsCfg, dealAmountColumnId: e.target.value })}
                    style={{ width: 260 }}
                    disabled={!metricsCfg.enableAvgDealSize}
                  />
                  <button type="button" onClick={() => openPicker("dealAmountColumnId")} style={{ marginTop: 6, width: 160 }} disabled={!metricsCfg.enableAvgDealSize}>
                    Pick from Monday
                  </button>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  Industry Column ID
                  <input
                    value={metricsCfg.industryColumnId || ""}
                    onChange={(e) => setMetricsCfg({ ...metricsCfg, industryColumnId: e.target.value })}
                    style={{ width: 260 }}
                    disabled={!metricsCfg.enableIndustryPerf}
                  />
                  <button type="button" onClick={() => openPicker("industryColumnId")} style={{ marginTop: 6, width: 160 }} disabled={!metricsCfg.enableIndustryPerf}>
                    Pick from Monday
                  </button>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  Closed-Won Status Column ID
                  <input
                    value={metricsCfg.closedWonStatusColumnId || ""}
                    onChange={(e) => setMetricsCfg({ ...metricsCfg, closedWonStatusColumnId: e.target.value })}
                    style={{ width: 260 }}
                  />
                  <button type="button" onClick={() => openPicker("closedWonStatusColumnId")} style={{ marginTop: 6, width: 160 }}>
                    Pick from Monday
                  </button>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  Closed-Won Value
                  <input
                    value={metricsCfg.closedWonStatusValue || ""}
                    onChange={(e) => setMetricsCfg({ ...metricsCfg, closedWonStatusValue: e.target.value })}
                    style={{ width: 220 }}
                  />
                </label>
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  Contacted Status Column ID
                  <input
                    value={metricsCfg.contactedStatusColumnId || ""}
                    onChange={(e) => setMetricsCfg({ ...metricsCfg, contactedStatusColumnId: e.target.value })}
                    style={{ width: 260 }}
                    disabled={!metricsCfg.enableResponseSpeed}
                  />
                  <button type="button" onClick={() => openPicker("contactedStatusColumnId")} style={{ marginTop: 6, width: 160 }} disabled={!metricsCfg.enableResponseSpeed}>
                    Pick from Monday
                  </button>
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  Contacted Value
                  <input
                    value={metricsCfg.contactedStatusValue || ""}
                    onChange={(e) => setMetricsCfg({ ...metricsCfg, contactedStatusValue: e.target.value })}
                    style={{ width: 220 }}
                    disabled={!metricsCfg.enableResponseSpeed}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  Next Call Date Column ID
                  <input
                    value={metricsCfg.nextCallDateColumnId || ""}
                    onChange={(e) => setMetricsCfg({ ...metricsCfg, nextCallDateColumnId: e.target.value })}
                    style={{ width: 220 }}
                    disabled={!metricsCfg.enableResponseSpeed}
                  />
                  <button type="button" onClick={() => openPicker("nextCallDateColumnId")} style={{ marginTop: 6, width: 160 }} disabled={!metricsCfg.enableResponseSpeed}>
                    Pick from Monday
                  </button>
                </label>
              </div>

              <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
                <button
                  onClick={async () => {
                    if (!metricsCfg) return;
                    setMetricsSaving(true);
                    setMetricsMsg(null);
                    try {
                      await updateMetricsConfig(metricsCfg);
                      const fresh = await getMetricsConfig();
                      setMetricsCfg(fresh);
                      setMetricsMsg("Saved ✅");
                    } catch (e: any) {
                      const msg = e?.message ?? String(e);
                      setMetricsMsg(msg);
                    } finally {
                      setMetricsSaving(false);
                    }
                  }}
                  disabled={metricsSaving || !canSaveMetrics}
                >
                  Save metrics config
                </button>

                <button
                  onClick={async () => {
                    setMetricsSaving(true);
                    setMetricsMsg(null);
                    try {
                      const out = await recomputeMetrics();
                      setMetricsMsg(`Recomputed ✅ agents=${out.agents ?? "?"}`);
                    } catch (e: any) {
                      const msg = e?.message ?? String(e);
                      setMetricsMsg(msg);
                    } finally {
                      setMetricsSaving(false);
                    }
                  }}
                  disabled={metricsSaving || !canSaveMetrics}
                >
                  Recalculate now
                </button>

                {metricsMsg ? <span style={{ opacity: 0.9 }}>{metricsMsg}</span> : null}
              </div>

              <div style={{ fontSize: 12, opacity: 0.75 }}>
                When re-enabling a metric, click “Recalculate now” to compute from the configured window (B behavior).
              </div>
            </div>
          )}

          {pickerOpen ? (
            <div
              style={{
                position: "fixed",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: "rgba(0,0,0,0.45)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 9999,
              }}
              onClick={() => {
                setPickerOpen(false);
                setPickerTarget(null);
                setPickerStatusLabels([]);
              }}
            >
              <div style={{ width: 760, background: "#fff", borderRadius: 10, padding: 14 }} onClick={(e) => e.stopPropagation()}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div style={{ fontWeight: 800 }}>Pick from Monday</div>
                  <button
                    type="button"
                    onClick={() => {
                      setPickerOpen(false);
                      setPickerTarget(null);
                      setPickerStatusLabels([]);
                    }}
                  >
                    Close
                  </button>
                </div>

                {pickerErr ? (
                  <div
                    style={{
                      marginTop: 10,
                      padding: 10,
                      background: "rgba(231, 76, 60, 0.08)",
                      border: "1px solid #e74c3c",
                      borderRadius: 8,
                    }}
                  >
                    {pickerErr}
                  </div>
                ) : null}

                <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <label style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                    Board
                    <select value={pickerBoardId} onChange={(e) => onPickerBoardChange(e.target.value)} style={{ width: 520 }}>
                      {pickerBoards.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.name} ({b.id})
                        </option>
                      ))}
                    </select>
                  </label>

                  <div style={{ opacity: 0.8, fontSize: 12 }}>Allowed types: {allowedTypes(pickerTarget).join(", ") || "—"}</div>
                </div>

                {pickerStatusLabels.length ? (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontWeight: 700, marginBottom: 8 }}>Pick status value</div>
                    <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                      {pickerStatusLabels.slice(0, 80).map((x) => (
                        <button key={x.key} type="button" onClick={() => pickStatusValue(x.label)}>
                          {x.label}
                        </button>
                      ))}
                    </div>
                    <div style={{ marginTop: 8, fontSize: 12, opacity: 0.75 }}>
                      We save the label text as the value. (If you prefer saving the status key, we can switch.)
                    </div>
                  </div>
                ) : (
                  <div style={{ marginTop: 14, maxHeight: 360, overflow: "auto", border: "1px solid #eee", borderRadius: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: "rgba(0,0,0,0.03)" }}>
                          <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Title</th>
                          <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>Type</th>
                          <th style={{ textAlign: "left", padding: 8, borderBottom: "1px solid #eee" }}>ID</th>
                          <th style={{ padding: 8, borderBottom: "1px solid #eee" }} />
                        </tr>
                      </thead>
                      <tbody>
                        {pickerColumns
                          .filter((c) => {
                            const allowed = allowedTypes(pickerTarget);
                            return allowed.length === 0 ? true : allowed.includes(c.type);
                          })
                          .map((c) => (
                            <tr key={c.id}>
                              <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{c.title}</td>
                              <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{c.type}</td>
                              <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>{c.id}</td>
                              <td style={{ padding: 8, borderBottom: "1px solid #eee" }}>
                                <button type="button" onClick={() => pickColumn(c.id)}>
                                  Select
                                </button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
      END OF OLD ADMIN CODE */}
      </div>
    </NavigationProvider>
  );
}

// Wrap App with ErrorBoundary for production safety
function AppWithErrorBoundary() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

export { AppWithErrorBoundary };