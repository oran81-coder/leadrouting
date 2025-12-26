import React, { useEffect, useState } from "react";
import {
  adminMondayConnect,
  adminMondayStatus,
  adminMondayTest,
  getKPIWeights,
  saveKPIWeights,
  type KPIWeights,
  type KPISettings,
} from "./api";
import { useToast } from "./hooks/useToast";
import { InfoTooltip } from "./components/InfoTooltip";

type MondayStatusDTO = {
  ok: boolean;
  connected: boolean;
  endpoint?: string;
  tokenMasked?: string;
};

export function AdminScreen() {
  const { showToast } = useToast();
  // Monday connection state
  const [mondayStatus, setMondayStatus] = useState<MondayStatusDTO | null>(null);
  const [mondayToken, setMondayToken] = useState("");
  const [mondayEndpoint, setMondayEndpoint] = useState("");
  const [connectMsg, setConnectMsg] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);

  // Phase 2: KPI Weights state
  const [kpiWeights, setKpiWeights] = useState<KPIWeights | null>(null);
  const [kpiSettings, setKpiSettings] = useState<KPISettings | null>(null);
  const [kpiSaving, setKpiSaving] = useState(false);
  const [kpiMsg, setKpiMsg] = useState<string | null>(null);

  useEffect(() => {
    loadMondayStatus();
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

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-6 mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-lg">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
          </div>
          <div>
            <h2 className="text-3xl font-bold text-white">
              Admin Dashboard
            </h2>
            <p className="text-blue-100 text-sm mt-1">
              Monday.com integration and KPI weights configuration
            </p>
          </div>
        </div>
      </div>

      {/* Monday Connection Card */}
      <div className="bg-gradient-to-br from-white to-blue-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            </div>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white">
              Monday.com Connection
            </h3>
          </div>
          {mondayStatus && (
            <span
              className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-bold shadow-sm ${
                mondayStatus.connected
                  ? "bg-gradient-to-r from-green-400 to-emerald-500 text-white"
                  : "bg-gradient-to-r from-red-400 to-rose-500 text-white"
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

      {/* Phase 2: KPI Weights Configuration Card */}
      {kpiWeights && kpiSettings && (
        <div className="bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8">
          {/* Header with Icon */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                  KPI Weights Configuration
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Fine-tune routing intelligence
                </p>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex gap-2">
              <button
                onClick={() => setKpiWeights({
                  domainExpertise: 30,
                  availability: 20,
                  conversionHistorical: 15,
                  recentPerformance: 15,
                  avgDealSize: 10,
                  responseTime: 5,
                  avgTimeToClose: 3,
                  hotAgent: 2
                })}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                ⚖️ Balanced
              </button>
              <button
                onClick={() => setKpiWeights({
                  domainExpertise: 40,
                  availability: 10,
                  conversionHistorical: 25,
                  recentPerformance: 10,
                  avgDealSize: 10,
                  responseTime: 2,
                  avgTimeToClose: 2,
                  hotAgent: 1
                })}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                🎯 Quality
              </button>
              <button
                onClick={() => setKpiWeights({
                  domainExpertise: 10,
                  availability: 40,
                  conversionHistorical: 10,
                  recentPerformance: 10,
                  avgDealSize: 5,
                  responseTime: 15,
                  avgTimeToClose: 5,
                  hotAgent: 5
                })}
                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                ⚡ Speed
              </button>
            </div>
          </div>

          {/* Enhanced Total Display with Visual Progress */}
          <div className="mb-8 relative">
            <div className="p-6 rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border-2 border-blue-200 dark:border-blue-800">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Total Weight
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-gray-900 dark:text-white">
                      {Object.values(kpiWeights).reduce((sum, w) => sum + w, 0).toFixed(1)}
                    </span>
                    <span className="text-2xl font-semibold text-gray-600 dark:text-gray-400">%</span>
                  </div>
                </div>
                
                {/* Status Indicator */}
                <div className="flex flex-col items-center">
                  {Math.abs(Object.values(kpiWeights).reduce((sum, w) => sum + w, 0) - 100) < 0.01 ? (
                    <>
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-400 to-emerald-500 flex items-center justify-center mb-2 animate-pulse">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold text-green-600 dark:text-green-400">Perfect!</span>
                    </>
                  ) : (
                    <>
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-2">
                        <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                      </div>
                      <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">Adjust to 100%</span>
                    </>
                  )}
                </div>
              </div>
              
              {/* Progress Bar */}
              <div className="mt-4 h-3 bg-white dark:bg-gray-700 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    Math.abs(Object.values(kpiWeights).reduce((sum, w) => sum + w, 0) - 100) < 0.01
                      ? 'bg-gradient-to-r from-green-400 to-emerald-500'
                      : 'bg-gradient-to-r from-amber-400 to-orange-500'
                  }`}
                  style={{ width: `${Math.min(Object.values(kpiWeights).reduce((sum, w) => sum + w, 0), 100)}%` }}
                />
              </div>
            </div>
          </div>

          {/* KPI Categories */}
          <div className="space-y-6">
            {/* Performance KPIs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h4 className="text-md font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">🎯</span>
                Performance & Expertise
              </h4>
              <div className="space-y-4">
                {/* Domain Expertise */}
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Domain Expertise
                      </label>
                      <InfoTooltip text="Agent's proven success rate in the lead's specific industry based on historical conversion rates and deal volume" />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={kpiWeights.domainExpertise}
                        onChange={(e) => setKpiWeights({ ...kpiWeights, domainExpertise: Number(e.target.value) })}
                        className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={kpiWeights.domainExpertise}
                        onChange={(e) => setKpiWeights({ ...kpiWeights, domainExpertise: Number(e.target.value) || 0 })}
                        className="w-20 px-3 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-semibold text-center focus:border-blue-500 focus:ring-2 focus:ring-blue-200 transition-all"
                      />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-6">%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 transition-all duration-300"
                      style={{ width: `${kpiWeights.domainExpertise}%` }}
                    />
                  </div>
                </div>

                {/* Conversion Rate (Historical) */}
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Conversion Rate (All-Time)
                      </label>
                      <InfoTooltip text="Agent's overall conversion rate across all time periods and industries - shows long-term track record" />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={kpiWeights.conversionHistorical}
                        onChange={(e) => setKpiWeights({ ...kpiWeights, conversionHistorical: Number(e.target.value) })}
                        className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-purple-600"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={kpiWeights.conversionHistorical}
                        onChange={(e) => setKpiWeights({ ...kpiWeights, conversionHistorical: Number(e.target.value) || 0 })}
                        className="w-20 px-3 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-semibold text-center focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all"
                      />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-6">%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-purple-400 to-purple-600 transition-all duration-300"
                      style={{ width: `${kpiWeights.conversionHistorical}%` }}
                    />
                  </div>
                </div>

                {/* Recent Performance */}
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Recent Performance
                      </label>
                      <InfoTooltip text="Agent's conversion rate in the recent configurable time window - indicates current form and momentum" />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={kpiWeights.recentPerformance}
                        onChange={(e) => setKpiWeights({ ...kpiWeights, recentPerformance: Number(e.target.value) })}
                        className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={kpiWeights.recentPerformance}
                        onChange={(e) => setKpiWeights({ ...kpiWeights, recentPerformance: Number(e.target.value) || 0 })}
                        className="w-20 px-3 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-semibold text-center focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 transition-all"
                      />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-6">%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 transition-all duration-300"
                      style={{ width: `${kpiWeights.recentPerformance}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>Time window:</span>
                    <input
                      type="number"
                      min="7"
                      max="90"
                      value={kpiSettings.recentPerfWindowDays}
                      onChange={(e) => setKpiSettings({ ...kpiSettings, recentPerfWindowDays: Number(e.target.value) || 30 })}
                      className="w-16 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                    <span>days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Capacity KPIs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h4 className="text-md font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">⚡</span>
                Capacity & Momentum
              </h4>
              <div className="space-y-4">
                {/* Availability */}
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Availability
                      </label>
                      <InfoTooltip text="Agent's current capacity based on active leads count and daily quota threshold" />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={kpiWeights.availability}
                        onChange={(e) => setKpiWeights({ ...kpiWeights, availability: Number(e.target.value) })}
                        className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-600"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={kpiWeights.availability}
                        onChange={(e) => setKpiWeights({ ...kpiWeights, availability: Number(e.target.value) || 0 })}
                        className="w-20 px-3 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-semibold text-center focus:border-green-500 focus:ring-2 focus:ring-green-200 transition-all"
                      />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-6">%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-green-400 to-green-600 transition-all duration-300"
                      style={{ width: `${kpiWeights.availability}%` }}
                    />
                  </div>
                </div>

                {/* Hot Agent */}
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Hot Agent 🔥
                      </label>
                      <InfoTooltip text="Agent is 'on fire' - closed multiple deals in a short time window, indicating peak performance and winning momentum" />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={kpiWeights.hotAgent}
                        onChange={(e) => setKpiWeights({ ...kpiWeights, hotAgent: Number(e.target.value) })}
                        className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-600"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={kpiWeights.hotAgent}
                        onChange={(e) => setKpiWeights({ ...kpiWeights, hotAgent: Number(e.target.value) || 0 })}
                        className="w-20 px-3 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-semibold text-center focus:border-red-500 focus:ring-2 focus:ring-red-200 transition-all"
                      />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-6">%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-red-400 to-red-600 transition-all duration-300"
                      style={{ width: `${kpiWeights.hotAgent}%` }}
                    />
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <span>Trigger:</span>
                    <input
                      type="number"
                      min="1"
                      max="10"
                      value={kpiSettings.hotAgentMinDeals}
                      onChange={(e) => setKpiSettings({ ...kpiSettings, hotAgentMinDeals: Number(e.target.value) || 3 })}
                      className="w-12 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                    <span>deals in</span>
                    <input
                      type="number"
                      min="1"
                      max="30"
                      value={kpiSettings.hotAgentWindowDays}
                      onChange={(e) => setKpiSettings({ ...kpiSettings, hotAgentWindowDays: Number(e.target.value) || 7 })}
                      className="w-12 px-2 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                    <span>days</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Efficiency KPIs */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700">
              <h4 className="text-md font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-2xl">⏱️</span>
                Efficiency & Value
              </h4>
              <div className="space-y-4">
                {/* Response Time */}
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Response Time
                      </label>
                      <InfoTooltip text="How quickly the agent responds to new leads (from assignment to first status update) - speed matters" />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={kpiWeights.responseTime}
                        onChange={(e) => setKpiWeights({ ...kpiWeights, responseTime: Number(e.target.value) })}
                        className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-cyan-600"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={kpiWeights.responseTime}
                        onChange={(e) => setKpiWeights({ ...kpiWeights, responseTime: Number(e.target.value) || 0 })}
                        className="w-20 px-3 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-semibold text-center focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 transition-all"
                      />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-6">%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-400 to-cyan-600 transition-all duration-300"
                      style={{ width: `${kpiWeights.responseTime}%` }}
                    />
                  </div>
                </div>

                {/* Average Time to Close */}
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Avg Time to Close
                      </label>
                      <InfoTooltip text="Average days from lead assignment to deal closure - measures sales cycle efficiency and closing speed" />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={kpiWeights.avgTimeToClose}
                        onChange={(e) => setKpiWeights({ ...kpiWeights, avgTimeToClose: Number(e.target.value) })}
                        className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-teal-600"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={kpiWeights.avgTimeToClose}
                        onChange={(e) => setKpiWeights({ ...kpiWeights, avgTimeToClose: Number(e.target.value) || 0 })}
                        className="w-20 px-3 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-semibold text-center focus:border-teal-500 focus:ring-2 focus:ring-teal-200 transition-all"
                      />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-6">%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-teal-400 to-teal-600 transition-all duration-300"
                      style={{ width: `${kpiWeights.avgTimeToClose}%` }}
                    />
                  </div>
                </div>

                {/* Average Deal Size */}
                <div className="group">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                        Average Deal Size
                      </label>
                      <InfoTooltip text="Average value of deals closed by the agent - measures ability to close high-value opportunities" />
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={kpiWeights.avgDealSize}
                        onChange={(e) => setKpiWeights({ ...kpiWeights, avgDealSize: Number(e.target.value) })}
                        className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-amber-600"
                      />
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={kpiWeights.avgDealSize}
                        onChange={(e) => setKpiWeights({ ...kpiWeights, avgDealSize: Number(e.target.value) || 0 })}
                        className="w-20 px-3 py-2 rounded-lg border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white font-semibold text-center focus:border-amber-500 focus:ring-2 focus:ring-amber-200 transition-all"
                      />
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-6">%</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-400 to-amber-600 transition-all duration-300"
                      style={{ width: `${kpiWeights.avgDealSize}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Save Actions */}
          <div className="mt-8 flex items-center gap-4 pt-6 border-t-2 border-gray-200 dark:border-gray-700">
            <button
              onClick={handleSaveKPIWeights}
              disabled={kpiSaving || Math.abs(Object.values(kpiWeights).reduce((sum, w) => sum + w, 0) - 100) > 0.01}
              className="flex-1 px-8 py-4 rounded-xl font-bold text-lg bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              {kpiSaving ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Saving Configuration...
                </span>
              ) : (
                "💾 Save KPI Weights"
              )}
            </button>
            
            <button
              onClick={() => {
                if (confirm('Reset to default weights?')) {
                  setKpiWeights({
                    domainExpertise: 25,
                    availability: 20,
                    conversionHistorical: 20,
                    recentPerformance: 15,
                    avgDealSize: 10,
                    responseTime: 5,
                    avgTimeToClose: 3,
                    hotAgent: 2
                  });
                }
              }}
              className="px-6 py-4 rounded-xl font-medium bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 border-2 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
            >
              🔄 Reset
            </button>
          </div>

          {kpiMsg && (
            <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-xl border border-green-200 dark:border-green-800 text-sm text-green-800 dark:text-green-200 flex items-start gap-3">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{kpiMsg}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

