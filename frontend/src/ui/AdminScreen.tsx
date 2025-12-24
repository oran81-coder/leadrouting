import React, { useEffect, useState } from "react";
import {
  adminMondayConnect,
  adminMondayStatus,
  adminMondayTest,
  getMetricsConfig,
  updateMetricsConfig,
  recomputeMetrics,
  listMondayBoards,
  listMondayBoardColumns,
  listMondayStatusLabels,
  getKPIWeights,
  saveKPIWeights,
  type MetricsConfigDTO,
  type KPIWeights,
  type KPISettings,
} from "./api";
import { useToast } from "./hooks/useToast";
import { useConfirm } from "./hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import { InfoTooltip } from "./components/InfoTooltip";

type MondayStatusDTO = {
  ok: boolean;
  connected: boolean;
  endpoint?: string;
  tokenMasked?: string;
};

export function AdminScreen() {
  const { showToast } = useToast();
  const { confirm, isOpen, options, handleConfirm, handleCancel } = useConfirm();
  // Monday connection state
  const [mondayStatus, setMondayStatus] = useState<MondayStatusDTO | null>(null);
  const [mondayToken, setMondayToken] = useState("");
  const [mondayEndpoint, setMondayEndpoint] = useState("");
  const [connectMsg, setConnectMsg] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Metrics config state
  const [metricsCfg, setMetricsCfg] = useState<MetricsConfigDTO | null>(null);
  const [saving, setSaving] = useState(false);
  const [configMsg, setConfigMsg] = useState<string | null>(null);

  // Column picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerTarget, setPickerTarget] = useState<string | null>(null);
  const [pickerBoards, setPickerBoards] = useState<Array<{ id: string; name: string }>>([]);
  const [pickerBoardId, setPickerBoardId] = useState("");
  const [pickerColumns, setPickerColumns] = useState<Array<{ id: string; title: string; type: string }>>([]);
  const [pickerStatusLabels, setPickerStatusLabels] = useState<Array<{ key: string; label: string }>>([]);
  const [pickerLoading, setPickerLoading] = useState(false);

  // Phase 2: KPI Weights state
  const [kpiWeights, setKpiWeights] = useState<KPIWeights | null>(null);
  const [kpiSettings, setKpiSettings] = useState<KPISettings | null>(null);
  const [kpiSaving, setKpiSaving] = useState(false);
  const [kpiMsg, setKpiMsg] = useState<string | null>(null);

  useEffect(() => {
    loadMondayStatus();
    loadMetricsConfig();
    loadKPIWeights();
  }, []);

  async function loadMondayStatus() {
    try {
      const status = await adminMondayStatus();
      setMondayStatus(status);
    } catch (e: any) {
      console.error("Error loading Monday status:", e);
    }
  }

  async function loadMetricsConfig() {
    try {
      const cfg = await getMetricsConfig();
      setMetricsCfg(cfg);
    } catch (e: any) {
      console.error("Error loading metrics config:", e);
    }
  }

  async function loadKPIWeights() {
    try {
      const data = await getKPIWeights();
      setKpiWeights(data.weights);
      setKpiSettings(data.settings);
    } catch (e: any) {
      console.error("Error loading KPI weights:", e);
      showToast("Error loading KPI weights: " + (e?.message || String(e)), "error");
    }
  }

  async function handleSaveKPIWeights() {
    if (!kpiWeights || !kpiSettings) return;

    // Validate weights sum to 100
    const total = Object.values(kpiWeights).reduce((sum, w) => sum + w, 0);
    if (Math.abs(total - 100) > 0.01) {
      showToast(`Weights must sum to 100%. Current total: ${total.toFixed(1)}%`, "error");
      return;
    }

    setKpiSaving(true);
    setKpiMsg(null);
    try {
      await saveKPIWeights(kpiWeights, kpiSettings);
      setKpiMsg("✅ KPI Weights saved successfully!");
      showToast("KPI Weights saved successfully!", "success");
      setTimeout(() => setKpiMsg(null), 3000);
    } catch (e: any) {
      setKpiMsg("❌ " + (e?.message || String(e)));
      showToast("Failed to save: " + (e?.message || String(e)), "error");
    } finally {
      setKpiSaving(false);
    }
  }

  async function handleConnect() {
    if (!mondayToken.trim()) {
      setConnectMsg("Please enter a Monday.com token");
      return;
    }

    setConnecting(true);
    setConnectMsg(null);
    try {
      await adminMondayConnect(mondayToken, mondayEndpoint || undefined);
      await loadMondayStatus();
      setConnectMsg("✅ Connected successfully!");
      setTimeout(() => setConnectMsg(null), 3000);
    } catch (e: any) {
      setConnectMsg("❌ " + (e?.message || String(e)));
    } finally {
      setConnecting(false);
    }
  }

  async function handleTest() {
    try {
      const result = await adminMondayTest();
      showToast("Monday.com test successful!", "success");
      console.log("Test result:", result);
    } catch (e: any) {
      showToast("Test failed: " + (e?.message || String(e)), "error");
    }
  }

  async function handleSaveConfig() {
    if (!metricsCfg) return;

    setSaving(true);
    setConfigMsg(null);
    try {
      await updateMetricsConfig(metricsCfg);
      setConfigMsg("✅ Configuration saved!");
      showToast("Configuration saved successfully!", "success");
      setTimeout(() => setConfigMsg(null), 3000);
    } catch (e: any) {
      setConfigMsg("❌ " + (e?.message || String(e)));
      showToast("Failed to save: " + (e?.message || String(e)), "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleRecompute() {
    const confirmed = await confirm({
      title: "Recompute All Metrics",
      message: "Recompute all metrics? This may take several minutes and will affect all data.",
      confirmText: "Recompute",
      isDanger: false,
    });
    
    if (!confirmed) return;

    try {
      await recomputeMetrics();
      showToast("Metrics recomputed successfully!", "success");
    } catch (e: any) {
      showToast("Recompute failed: " + (e?.message || String(e)), "error");
    }
  }

  async function openColumnPicker(target: string) {
    setPickerTarget(target);
    setPickerOpen(true);
    setPickerLoading(true);
    setPickerBoardId("");
    setPickerColumns([]);
    setPickerStatusLabels([]);

    try {
      const boards = await listMondayBoards();
      setPickerBoards(boards);
    } catch (e: any) {
      showToast("Error loading boards: " + (e?.message || String(e)), "error");
    } finally {
      setPickerLoading(false);
    }
  }

  async function loadPickerColumns(boardId: string) {
    setPickerBoardId(boardId);
    setPickerLoading(true);
    try {
      const cols = await listMondayBoardColumns(boardId);
      setPickerColumns(cols);
    } catch (e: any) {
      showToast("Error loading columns: " + (e?.message || String(e)), "error");
    } finally {
      setPickerLoading(false);
    }
  }

  async function selectColumn(columnId: string) {
    if (!metricsCfg || !pickerTarget) return;

    // For status columns, load labels
    if (pickerTarget.includes("Status")) {
      setPickerLoading(true);
      try {
        const labels = await listMondayStatusLabels(pickerBoardId, columnId);
        setPickerStatusLabels(labels);
        setMetricsCfg({ ...metricsCfg, [pickerTarget]: columnId });
      } catch (e: any) {
        showToast("Error loading status labels: " + (e?.message || String(e)), "error");
      } finally {
        setPickerLoading(false);
      }
    } else {
      setMetricsCfg({ ...metricsCfg, [pickerTarget]: columnId });
      setPickerOpen(false);
    }
  }

  function selectStatusLabel(label: string) {
    if (!metricsCfg || !pickerTarget) return;

    const valueField = pickerTarget.replace("ColumnId", "Value");
    setMetricsCfg({ ...metricsCfg, [valueField]: label });
    setPickerOpen(false);
  }

  function getMissingFields(): string[] {
    if (!metricsCfg) return [];
    const missing: string[] = [];

    if (!metricsCfg.leadBoardIds?.trim()) missing.push("Lead Board IDs");
    if (!metricsCfg.assignedPeopleColumnId?.trim()) missing.push("Assigned People Column");

    const needsClosed =
      metricsCfg.enableConversion ||
      metricsCfg.enableHotStreak ||
      metricsCfg.enableAvgDealSize ||
      metricsCfg.enableIndustryPerf;

    if (needsClosed) {
      if (!metricsCfg.closedWonStatusColumnId?.trim()) missing.push("Closed Won Status Column");
      if (!metricsCfg.closedWonStatusValue?.trim()) missing.push("Closed Won Status Value");
    }

    if (metricsCfg.enableAvgDealSize && !metricsCfg.dealAmountColumnId?.trim()) {
      missing.push("Deal Amount Column");
    }

    if (metricsCfg.enableIndustryPerf && !metricsCfg.industryColumnId?.trim()) {
      missing.push("Industry Column");
    }

    if (metricsCfg.enableResponseSpeed) {
      if (!metricsCfg.contactedStatusColumnId?.trim()) missing.push("Contacted Status Column");
      if (!metricsCfg.contactedStatusValue?.trim()) missing.push("Contacted Status Value");
      if (!metricsCfg.nextCallDateColumnId?.trim()) missing.push("Next Call Date Column");
    }

    return missing;
  }

  const missingFields = getMissingFields();
  const canSave = metricsCfg && missingFields.length === 0;
  const configProgress = metricsCfg
    ? Math.round(
        ((8 - missingFields.length) / 8) * 100
      )
    : 0;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
        Admin Dashboard
      </h2>

      {/* Monday Connection Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Monday.com Connection
          </h3>
          {mondayStatus && (
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                mondayStatus.connected
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              }`}
            >
              {mondayStatus.connected ? "✓ Connected" : "✗ Not Connected"}
            </span>
          )}
        </div>

        {mondayStatus?.connected && (
          <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-sm text-green-800 dark:text-green-200">
              <strong>Endpoint:</strong> {mondayStatus.endpoint || "default"}
              <br />
              <strong>Token:</strong> {mondayStatus.tokenMasked || "****"}
            </p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Monday.com API Token
            </label>
            <input
              type="password"
              value={mondayToken}
              onChange={(e) => setMondayToken(e.target.value)}
              placeholder="Enter your Monday.com API token"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Endpoint (optional)
            </label>
            <input
              type="text"
              value={mondayEndpoint}
              onChange={(e) => setMondayEndpoint(e.target.value)}
              placeholder="https://api.monday.com/v2"
              className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {connecting ? "Connecting..." : "Connect"}
          </button>
          <button
            onClick={handleTest}
            disabled={!mondayStatus?.connected}
            className="px-4 py-2 rounded-lg font-medium bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Test Connection
          </button>
        </div>

        {connectMsg && (
          <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
            {connectMsg}
          </div>
        )}
      </div>

      {/* Metrics Configuration Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Metrics Configuration
          </h3>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Progress: {configProgress}%
            </div>
            <div className="w-32 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all"
                style={{ width: `${configProgress}%` }}
              />
            </div>
          </div>
        </div>

        {missingFields.length > 0 && (
          <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <h4 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200 mb-2">
              Missing Configuration ({missingFields.length} fields)
            </h4>
            <ul className="text-sm text-yellow-700 dark:text-yellow-300 list-disc list-inside space-y-1">
              {missingFields.map((field) => (
                <li key={field}>{field}</li>
              ))}
            </ul>
          </div>
        )}

        {metricsCfg && (
          <div className="space-y-6">
            {/* Basic Configuration */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                Basic Configuration
              </h4>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Lead Board IDs (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={metricsCfg.leadBoardIds || ""}
                    onChange={(e) =>
                      setMetricsCfg({ ...metricsCfg, leadBoardIds: e.target.value })
                    }
                    placeholder="board_123,board_456"
                    className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Assigned People Column ID
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={metricsCfg.assignedPeopleColumnId || ""}
                      onChange={(e) =>
                        setMetricsCfg({
                          ...metricsCfg,
                          assignedPeopleColumnId: e.target.value,
                        })
                      }
                      className="flex-1 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                    <button
                      onClick={() => openColumnPicker("assignedPeopleColumnId")}
                      disabled={!mondayStatus?.connected}
                      className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      Pick
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Metrics Toggles */}
            <div>
              <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-3">
                Enable Metrics
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {[
                  { key: "enableWorkload", label: "Workload" },
                  { key: "enableConversion", label: "Conversion Rate" },
                  { key: "enableHotStreak", label: "Hot Streak" },
                  { key: "enableResponseSpeed", label: "Response Speed" },
                  { key: "enableAvgDealSize", label: "Avg Deal Size" },
                  { key: "enableIndustryPerf", label: "Industry Performance" },
                ].map((metric) => (
                  <label
                    key={metric.key}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={metricsCfg[metric.key as keyof MetricsConfigDTO] as boolean}
                      onChange={(e) =>
                        setMetricsCfg({
                          ...metricsCfg,
                          [metric.key]: e.target.checked,
                        })
                      }
                      className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {metric.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Save Actions */}
            <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleSaveConfig}
                disabled={saving || !canSave}
                className="px-6 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {saving ? "Saving..." : "Save Configuration"}
              </button>
              <button
                onClick={handleRecompute}
                disabled={!canSave}
                className="px-6 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Recompute Metrics
              </button>
            </div>

            {configMsg && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm text-blue-800 dark:text-blue-200">
                {configMsg}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Routing Settings Card */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Routing Settings
        </h3>

        <div className="space-y-4">
          {/* Daily Lead Threshold */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Daily Lead Threshold per Agent
            </label>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Maximum number of leads an agent can receive per day before being marked as "less available".
              This affects automatic availability calculations.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min="1"
                max="100"
                value={metricsCfg?.dailyLeadThreshold || 20}
                onChange={(e) => {
                  if (metricsCfg) {
                    setMetricsCfg({
                      ...metricsCfg,
                      dailyLeadThreshold: parseInt(e.target.value) || 20
                    });
                  }
                }}
                className="w-32 px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                leads/day
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Current: {metricsCfg?.dailyLeadThreshold || 20} leads per day
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <h4 className="text-sm font-semibold text-blue-800 dark:text-blue-200 mb-2">
            ℹ️ How Availability Works
          </h4>
          <ul className="text-xs text-blue-700 dark:text-blue-300 space-y-1 list-disc list-inside">
            <li>System automatically calculates agent availability</li>
            <li>Based on leads currently "in treatment" (configurable statuses)</li>
            <li>Agents exceeding daily threshold become "less available"</li>
            <li>Availability score affects lead routing decisions</li>
          </ul>
        </div>
      </div>

      {/* Phase 2: KPI Weights Configuration Card */}
      {kpiWeights && kpiSettings && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            KPI Weights Configuration
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
            Configure the importance of each KPI in routing decisions. Total must equal 100%.
          </p>

          {/* Total Display */}
          <div className="mb-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
            <div className="text-2xl font-bold text-center text-gray-900 dark:text-white">
              Total: {Object.values(kpiWeights).reduce((sum, w) => sum + w, 0).toFixed(1)}%
              {Math.abs(Object.values(kpiWeights).reduce((sum, w) => sum + w, 0) - 100) < 0.01 ? (
                <span className="text-green-600 dark:text-green-400 ml-2">✓</span>
              ) : (
                <span className="text-red-600 dark:text-red-400 ml-2 text-base">Must be 100%</span>
              )}
            </div>
          </div>

          {/* Weight Inputs */}
          <div className="space-y-3 mb-6">
            {/* Domain Expertise */}
            <div className="flex items-center gap-3">
              <div className="w-64 flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Domain Expertise
                </label>
                <InfoTooltip text="Agent's proven success rate in the lead's specific industry based on historical conversion rates and deal volume" />
              </div>
              <input
                type="number"
                min="0"
                max="100"
                value={kpiWeights.domainExpertise}
                onChange={(e) => setKpiWeights({ ...kpiWeights, domainExpertise: Number(e.target.value) || 0 })}
                className="w-20 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
            </div>

            {/* Availability */}
            <div className="flex items-center gap-3">
              <div className="w-64 flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Availability
                </label>
                <InfoTooltip text="Agent's current capacity based on active leads count and daily quota threshold" />
              </div>
              <input
                type="number"
                min="0"
                max="100"
                value={kpiWeights.availability}
                onChange={(e) => setKpiWeights({ ...kpiWeights, availability: Number(e.target.value) || 0 })}
                className="w-20 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
            </div>

            {/* Conversion Rate (Historical) */}
            <div className="flex items-center gap-3">
              <div className="w-64 flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Conversion Rate (All-Time)
                </label>
                <InfoTooltip text="Agent's overall conversion rate across all time periods and industries - shows long-term track record" />
              </div>
              <input
                type="number"
                min="0"
                max="100"
                value={kpiWeights.conversionHistorical}
                onChange={(e) => setKpiWeights({ ...kpiWeights, conversionHistorical: Number(e.target.value) || 0 })}
                className="w-20 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
            </div>

            {/* Recent Performance */}
            <div className="flex items-center gap-3">
              <div className="w-64 flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Recent Performance
                </label>
                <InfoTooltip text="Agent's conversion rate in the recent configurable time window - indicates current form and momentum" />
              </div>
              <input
                type="number"
                min="0"
                max="100"
                value={kpiWeights.recentPerformance}
                onChange={(e) => setKpiWeights({ ...kpiWeights, recentPerformance: Number(e.target.value) || 0 })}
                className="w-20 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
              <div className="flex items-center gap-2 ml-4">
                <span className="text-xs text-gray-500 dark:text-gray-400">Last</span>
                <input
                  type="number"
                  min="7"
                  max="90"
                  value={kpiSettings.recentPerfWindowDays}
                  onChange={(e) => setKpiSettings({ ...kpiSettings, recentPerfWindowDays: Number(e.target.value) || 30 })}
                  className="w-16 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">days</span>
              </div>
            </div>

            {/* Average Deal Size */}
            <div className="flex items-center gap-3">
              <div className="w-64 flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Average Deal Size
                </label>
                <InfoTooltip text="Average value of deals closed by the agent - measures ability to close high-value opportunities" />
              </div>
              <input
                type="number"
                min="0"
                max="100"
                value={kpiWeights.avgDealSize}
                onChange={(e) => setKpiWeights({ ...kpiWeights, avgDealSize: Number(e.target.value) || 0 })}
                className="w-20 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
            </div>

            {/* Response Time */}
            <div className="flex items-center gap-3">
              <div className="w-64 flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Response Time
                </label>
                <InfoTooltip text="How quickly the agent responds to new leads (from assignment to first status update) - speed matters" />
              </div>
              <input
                type="number"
                min="0"
                max="100"
                value={kpiWeights.responseTime}
                onChange={(e) => setKpiWeights({ ...kpiWeights, responseTime: Number(e.target.value) || 0 })}
                className="w-20 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
            </div>

            {/* Average Time to Close */}
            <div className="flex items-center gap-3">
              <div className="w-64 flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Avg Time to Close
                </label>
                <InfoTooltip text="Average days from lead assignment to deal closure - measures sales cycle efficiency and closing speed" />
              </div>
              <input
                type="number"
                min="0"
                max="100"
                value={kpiWeights.avgTimeToClose}
                onChange={(e) => setKpiWeights({ ...kpiWeights, avgTimeToClose: Number(e.target.value) || 0 })}
                className="w-20 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
            </div>

            {/* Hot Agent */}
            <div className="flex items-center gap-3">
              <div className="w-64 flex items-center gap-2">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Hot Agent
                </label>
                <InfoTooltip text="Agent is 'on fire' - closed multiple deals in a short time window, indicating peak performance and winning momentum" />
              </div>
              <input
                type="number"
                min="0"
                max="100"
                value={kpiWeights.hotAgent}
                onChange={(e) => setKpiWeights({ ...kpiWeights, hotAgent: Number(e.target.value) || 0 })}
                className="w-20 px-3 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">%</span>
              <div className="flex items-center gap-2 ml-4">
                <input
                  type="number"
                  min="1"
                  max="10"
                  value={kpiSettings.hotAgentMinDeals}
                  onChange={(e) => setKpiSettings({ ...kpiSettings, hotAgentMinDeals: Number(e.target.value) || 3 })}
                  className="w-16 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">deals in</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={kpiSettings.hotAgentWindowDays}
                  onChange={(e) => setKpiSettings({ ...kpiSettings, hotAgentWindowDays: Number(e.target.value) || 7 })}
                  className="w-16 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white text-sm"
                />
                <span className="text-xs text-gray-500 dark:text-gray-400">days</span>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex items-center gap-4 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSaveKPIWeights}
              disabled={kpiSaving || Math.abs(Object.values(kpiWeights).reduce((sum, w) => sum + w, 0) - 100) >= 0.01}
              className="px-6 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {kpiSaving ? "Saving..." : "Save Weights"}
            </button>

            {kpiMsg && (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                {kpiMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Column Picker Modal */}
      {pickerOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                Select Column
              </h3>
            </div>

            <div className="p-6 space-y-4">
              {!pickerBoardId ? (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Select a board to view its columns:
                  </p>
                  {pickerLoading ? (
                    <div className="text-center py-8">Loading boards...</div>
                  ) : (
                    <div className="grid gap-2">
                      {pickerBoards.map((board) => (
                        <button
                          key={board.id}
                          onClick={() => loadPickerColumns(board.id)}
                          className="px-4 py-3 text-left rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors"
                        >
                          <div className="font-medium text-gray-900 dark:text-white">
                            {board.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            ID: {board.id}
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : pickerStatusLabels.length > 0 ? (
                <>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    Select a status label:
                  </p>
                  <div className="grid gap-2">
                    {pickerStatusLabels.map((label) => (
                      <button
                        key={label.key}
                        onClick={() => selectStatusLabel(label.label)}
                        className="px-4 py-2 text-left rounded-lg bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-700 transition-colors text-gray-900 dark:text-white"
                      >
                        {label.label}
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setPickerBoardId("");
                      setPickerColumns([]);
                    }}
                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline mb-3"
                  >
                    ← Back to boards
                  </button>
                  {pickerLoading ? (
                    <div className="text-center py-8">Loading columns...</div>
                  ) : (
                    <div className="overflow-auto max-h-96">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                              Title
                            </th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                              Type
                            </th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700 dark:text-gray-300">
                              ID
                            </th>
                            <th className="px-4 py-2"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {pickerColumns.map((col) => (
                            <tr
                              key={col.id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-900"
                            >
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                {col.title}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400">
                                {col.type}
                              </td>
                              <td className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 font-mono">
                                {col.id}
                              </td>
                              <td className="px-4 py-2">
                                <button
                                  onClick={() => selectColumn(col.id)}
                                  className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                                >
                                  Select
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={isOpen}
        title={options?.title || ""}
        message={options?.message || ""}
        confirmText={options?.confirmText}
        cancelText={options?.cancelText}
        isDanger={options?.isDanger}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    </div>
  );
}

