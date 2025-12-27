/**
 * Agent Availability Management Component
 * 
 * Allows admin to:
 * 1. Exclude/include agents from routing rotation
 * 2. Set global capacity limits (daily/weekly/monthly)
 * 3. View current capacity status for each agent
 */

import React, { useEffect, useState } from "react";
import {
  getAgentAvailability,
  setAgentAvailability,
  getCapacitySettings,
  setCapacitySettings,
  getCapacityStatus,
  listMondayUsers,
  type AgentAvailabilityDTO,
  type CapacitySettingsDTO,
  type AgentCapacityStatus,
  type MondayUser,
} from "./api";
import { useToast } from "./hooks/useToast";

export function AgentAvailabilityManager() {
  const { showToast } = useToast();
  
  // State
  const [mondayUsers, setMondayUsers] = useState<MondayUser[]>([]);
  const [availability, setAvailability] = useState<Map<string, AgentAvailabilityDTO>>(new Map());
  const [capacitySettings, setCapacitySettingsState] = useState<CapacitySettingsDTO | null>(null);
  const [capacityStatus, setCapacityStatusState] = useState<Map<string, AgentCapacityStatus>>(new Map());
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default
  
  // Capacity form state
  const [dailyLimit, setDailyLimit] = useState<string>("");
  const [weeklyLimit, setWeeklyLimit] = useState<string>("");
  const [monthlyLimit, setMonthlyLimit] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      // Load each endpoint separately to handle failures gracefully
      const usersResp = await listMondayUsers().catch(err => {
        console.error("Error loading Monday users:", err);
        return { ok: false, users: [] };
      });

      const availResp = await getAgentAvailability().catch(err => {
        console.error("Error loading availability:", err);
        return { ok: false, data: [] };
      });

      const capacityResp = await getCapacitySettings().catch(err => {
        console.error("Error loading capacity settings:", err);
        return { ok: false, data: { dailyLimit: null, weeklyLimit: null, monthlyLimit: null } };
      });

      const statusResp = await getCapacityStatus().catch(err => {
        console.error("Error loading capacity status:", err);
        return { ok: false, data: { settings: { dailyLimit: null, weeklyLimit: null, monthlyLimit: null }, agents: [] } };
      });

      setMondayUsers(usersResp.users || []);
      
      const availMap = new Map((availResp.data || []).map(a => [a.agentUserId, a]));
      setAvailability(availMap);
      
      if (capacityResp.data) {
        setCapacitySettingsState(capacityResp.data);
        setDailyLimit(capacityResp.data.dailyLimit?.toString() || "");
        setWeeklyLimit(capacityResp.data.weeklyLimit?.toString() || "");
        setMonthlyLimit(capacityResp.data.monthlyLimit?.toString() || "");
      }
      
      const statusMap = new Map((statusResp.data?.agents || []).map(s => [s.agentUserId, s]));
      setCapacityStatusState(statusMap);
    } catch (e: any) {
      console.error("Error loading agent availability data:", e);
      showToast("Failed to load data: " + (e?.message || String(e)), "error");
    } finally {
      setLoading(false);
    }
  }

  async function toggleAgentAvailability(agentUserId: string, currentStatus: boolean) {
    const newStatus = !currentStatus;
    try {
      await setAgentAvailability(agentUserId, newStatus);
      showToast(
        newStatus ? "Agent enabled for routing" : "Agent excluded from routing",
        "success"
      );
      await loadData(); // Refresh
    } catch (e: any) {
      showToast("Failed to update: " + (e?.message || String(e)), "error");
    }
  }

  async function handleSaveCapacitySettings() {
    setSaving(true);
    try {
      const settings = {
        dailyLimit: dailyLimit === "" ? null : parseInt(dailyLimit) || null,
        weeklyLimit: weeklyLimit === "" ? null : parseInt(weeklyLimit) || null,
        monthlyLimit: monthlyLimit === "" ? null : parseInt(monthlyLimit) || null,
      };
      
      await setCapacitySettings(settings);
      showToast("Capacity settings saved successfully!", "success");
      await loadData(); // Refresh to show new status
    } catch (e: any) {
      showToast("Failed to save: " + (e?.message || String(e)), "error");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-3 text-gray-600 dark:text-gray-400">Loading...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Capacity Settings Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/20 rounded-lg flex items-center justify-center">
            <svg className="w-6 h-6 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Global Capacity Limits</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Set maximum leads per agent (leave empty for unlimited)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Daily Limit
            </label>
            <input
              type="number"
              min="0"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              placeholder="Unlimited"
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Weekly Limit
            </label>
            <input
              type="number"
              min="0"
              value={weeklyLimit}
              onChange={(e) => setWeeklyLimit(e.target.value)}
              placeholder="Unlimited"
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-white"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Monthly Limit
            </label>
            <input
              type="number"
              min="0"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              placeholder="Unlimited"
              className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400 focus:border-transparent text-gray-900 dark:text-white"
            />
          </div>
        </div>

        <button
          onClick={handleSaveCapacitySettings}
          disabled={saving}
          className="px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors"
        >
          {saving ? "Saving..." : "💾 Save Capacity Settings"}
        </button>
      </div>

      {/* Agent Availability List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
              <svg className="w-6 h-6 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Agent Availability Management</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {mondayUsers.length} agent{mondayUsers.length !== 1 ? 's' : ''} • Click to {isExpanded ? 'collapse' : 'expand'}
              </p>
            </div>
          </div>
          
          {/* Expand/Collapse Icon */}
          <button className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors">
            <svg 
              className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        {isExpanded && (
          <div className="mt-6 space-y-3">
            {mondayUsers.map((user) => {
              const isAvailable = availability.get(user.id)?.isAvailable ?? true;
              const status = capacityStatus.get(user.id);
              const hasCapacityIssue = status?.hasCapacityIssue || false;

              return (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-4 rounded-lg border ${
                    isAvailable
                      ? "bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700"
                      : "bg-gray-100 dark:bg-gray-900 border-gray-300 dark:border-gray-600 opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm ${
                      isAvailable
                        ? "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400"
                        : "bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                    }`}>
                      {user.name.charAt(0).toUpperCase()}
                    </div>
                    
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`font-medium ${
                          isAvailable ? "text-gray-900 dark:text-white" : "text-gray-500 dark:text-gray-400"
                        }`}>
                          {user.name}
                        </span>
                        {!isAvailable && (
                          <span className="px-2 py-0.5 bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-xs font-medium rounded">
                            Excluded
                          </span>
                        )}
                        {hasCapacityIssue && isAvailable && (
                          <span className="px-2 py-0.5 bg-yellow-100 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 text-xs font-medium rounded">
                            ⚠️ At Capacity
                          </span>
                        )}
                      </div>
                      
                      {status && (
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex gap-4">
                          <span>Day: {status.dailyCount}{dailyLimit && `/${dailyLimit}`}</span>
                          <span>Week: {status.weeklyCount}{weeklyLimit && `/${weeklyLimit}`}</span>
                          <span>Month: {status.monthlyCount}{monthlyLimit && `/${monthlyLimit}`}</span>
                        </div>
                      )}
                      
                      {status?.warning && isAvailable && (
                        <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-1">
                          {status.warning}
                        </div>
                      )}
                    </div>
                  </div>

                  <button
                    onClick={() => toggleAgentAvailability(user.id, isAvailable)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      isAvailable
                        ? "bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/30"
                        : "bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-900/30"
                    }`}
                  >
                    {isAvailable ? "🚫 Exclude" : "✅ Include"}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {isExpanded && mondayUsers.length === 0 && (
          <div className="mt-6 text-center py-8 text-gray-500 dark:text-gray-400">
            No agents found. Make sure Monday.com is connected.
          </div>
        )}
      </div>
    </div>
  );
}

