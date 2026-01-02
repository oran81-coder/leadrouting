import React from "react";
import type { OutcomesPerAgentDTO } from "./api";

type AgentDetailModalProps = {
  agent: OutcomesPerAgentDTO | null;
  windowDays: number;
  onClose: () => void;
};

// Helper function to get color and label based on score
const getScoreLevel = (score: number, metric: 'conversion' | 'burnout' | 'availability' | 'response') => {
  if (metric === 'burnout') {
    // For burnout, lower is better
    if (score <= 30) return { label: 'Excellent', color: 'green', bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-600' };
    if (score <= 60) return { label: 'Good', color: 'yellow', bg: 'bg-yellow-50', text: 'text-yellow-700', bar: 'bg-yellow-500' };
    return { label: 'Needs Attention', color: 'red', bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-600' };
  }

  // For other metrics, higher is better
  if (score >= 70) return { label: 'Excellent', color: 'green', bg: 'bg-green-50', text: 'text-green-700', bar: 'bg-green-600' };
  if (score >= 40) return { label: 'Good', color: 'yellow', bg: 'bg-yellow-50', text: 'text-yellow-700', bar: 'bg-yellow-500' };
  return { label: 'Needs Improvement', color: 'red', bg: 'bg-red-50', text: 'text-red-700', bar: 'bg-red-600' };
};

const formatResponseTime = (seconds: number | null): string => {
  if (seconds === null) return "N/A";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
  return `${(seconds / 3600).toFixed(1)}h`;
};

export function AgentDetailModal({ agent, windowDays, onClose }: AgentDetailModalProps) {
  if (!agent) return null;

  const conversionPercent = agent.conversionRate * 100;
  const availabilityPercent = (agent.availability ?? 0) * 100;
  const burnoutScore = agent.burnoutScore ?? 0;

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-gray-800 dark:to-gray-900">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-2xl">
                {agent.agentName.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{agent.agentName}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">{agent.agentUserId}</p>
              {agent.hotStreakActive && (
                <div className="flex items-center gap-1 mt-1">
                  <span className="text-xs font-semibold text-orange-600 dark:text-orange-400">🔥 HOT STREAK</span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">({agent.hotStreakCount} recent wins)</span>
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Key Performance Indicators (8 KPIs) */}
          <section>
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
              Key Performance Indicators
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* 1. Conversion Rate (Historical) */}
              <div className={`${getScoreLevel(conversionPercent, 'conversion').bg} dark:bg-gray-700 rounded-lg p-4 border-l-4 ${getScoreLevel(conversionPercent, 'conversion').bar.replace('bg-', 'border-')}`}>
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Conversion Rate</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {conversionPercent.toFixed(1)}%
                </div>
                <div className={`text-xs ${getScoreLevel(conversionPercent, 'conversion').text}`}>
                  {getScoreLevel(conversionPercent, 'conversion').label}
                </div>
              </div>

              {/* 2. Availability */}
              <div className={`${getScoreLevel(availabilityPercent, 'availability').bg} dark:bg-gray-700 rounded-lg p-4 border-l-4 ${getScoreLevel(availabilityPercent, 'availability').bar.replace('bg-', 'border-')}`}>
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Availability</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {agent.availability !== null ? `${availabilityPercent.toFixed(0)}%` : "N/A"}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {agent.currentActiveLeads ?? 0} active leads
                </div>
              </div>

              {/* 3. Average Deal Size */}
              <div className="bg-purple-50 dark:bg-gray-700 rounded-lg p-4 border-l-4 border-purple-600">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Avg Deal Size</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {agent.avgDeal !== null ? `$${Math.round(agent.avgDeal).toLocaleString()}` : "N/A"}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  ${(agent.revenue ?? 0).toLocaleString()} total
                </div>
              </div>

              {/* 4. Response Time */}
              <div className="bg-orange-50 dark:bg-gray-700 rounded-lg p-4 border-l-4 border-orange-600">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Response Time</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {formatResponseTime(agent.avgResponseTime)}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  First contact speed
                </div>
              </div>

              {/* 5. Time to Close */}
              <div className="bg-teal-50 dark:bg-gray-700 rounded-lg p-4 border-l-4 border-teal-600">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Time to Close</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {agent.medianTimeToCloseDays !== null ? `${agent.medianTimeToCloseDays.toFixed(1)}d` : "N/A"}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Median cycle time
                </div>
              </div>

              {/* 6. Hot Streak / Recent Performance */}
              <div className="bg-orange-50 dark:bg-gray-700 rounded-lg p-4 border-l-4 border-orange-600">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Hot Streak</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {agent.hotStreakActive ? "🔥" : "❄️"} {agent.hotStreakCount ?? 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {agent.hotStreakActive ? "Active" : "Inactive"}
                </div>
              </div>

              {/* 7. Burnout Score */}
              <div className={`${getScoreLevel(burnoutScore, 'burnout').bg} dark:bg-gray-700 rounded-lg p-4 border-l-4 ${getScoreLevel(burnoutScore, 'burnout').bar.replace('bg-', 'border-')}`}>
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Burnout Level</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {burnoutScore.toFixed(0)}
                </div>
                <div className={`text-xs ${getScoreLevel(burnoutScore, 'burnout').text}`}>
                  {getScoreLevel(burnoutScore, 'burnout').label}
                </div>
              </div>

              {/* 8. Industry Expertise */}
              <div className="bg-indigo-50 dark:bg-gray-700 rounded-lg p-4 border-l-4 border-indigo-600">
                <div className="text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1">Industry Expertise</div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white mb-1">
                  {agent.industryExpertise?.length ?? 0}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Specialized areas
                </div>
              </div>
            </div>
          </section>

          {/* Performance Breakdown with Progress Bars */}
          <section className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-gray-50 dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              Performance Breakdown
            </h3>
            <div className="space-y-4">
              {/* Conversion Rate Progress */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Conversion Rate</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">({agent.closedWon} / {agent.assigned} leads)</span>
                  </div>
                  <span className={`font-bold ${getScoreLevel(conversionPercent, 'conversion').text}`}>
                    {conversionPercent.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className={`${getScoreLevel(conversionPercent, 'conversion').bar} h-3 rounded-full transition-all duration-300`}
                    style={{ width: `${Math.min(conversionPercent, 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  💡 Target: 50%+ is excellent for most industries
                </p>
              </div>

              {/* Availability Progress */}
              {agent.availability !== null && (
                <div>
                  <div className="flex items-center justify-between text-sm mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-700 dark:text-gray-300">Availability Capacity</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">(Current workload)</span>
                    </div>
                    <span className={`font-bold ${getScoreLevel(availabilityPercent, 'availability').text}`}>
                      {availabilityPercent.toFixed(0)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                    <div
                      className={`${getScoreLevel(availabilityPercent, 'availability').bar} h-3 rounded-full transition-all duration-300`}
                      style={{ width: `${availabilityPercent}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    💡 {agent.currentActiveLeads} active leads • Daily capacity: {agent.dailyLeadsToday ?? 0} leads today
                  </p>
                </div>
              )}

              {/* Burnout Level Progress */}
              <div>
                <div className="flex items-center justify-between text-sm mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Burnout Level</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">(Lower is better)</span>
                  </div>
                  <span className={`font-bold ${getScoreLevel(burnoutScore, 'burnout').text}`}>
                    {burnoutScore.toFixed(0)}/100
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
                  <div
                    className={`${getScoreLevel(burnoutScore, 'burnout').bar} h-3 rounded-full transition-all duration-300`}
                    style={{ width: `${burnoutScore}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  💡 {burnoutScore < 30 ? "Great energy!" : burnoutScore < 60 ? "Monitor workload" : "⚠️ Consider reducing load"}
                </p>
              </div>
            </div>
          </section>

          {/* Activity & Volume Stats */}
          <section>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              Activity & Volume
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Assigned</span>
                  <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">{agent.assigned}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  In last {windowDays} days
                </p>
              </div>

              <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Closed Won</span>
                  <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-green-900 dark:text-green-400">{agent.closedWon}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Successful conversions
                </p>
              </div>

              <div className="bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Today's Volume</span>
                  <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="text-3xl font-bold text-purple-900 dark:text-purple-400">{agent.dailyLeadsToday ?? 0}</div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Leads assigned today
                </p>
              </div>
            </div>
          </section>

          {/* Industry Expertise */}
          {agent.industryExpertise && agent.industryExpertise.length > 0 && (
            <section className="border border-gray-200 dark:border-gray-700 rounded-lg p-5 bg-indigo-50 dark:bg-gray-800">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-indigo-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
                </svg>
                Industry Expertise
              </h3>
              <div className="flex flex-wrap gap-2">
                {agent.industryExpertise.map((industry, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 bg-white dark:bg-gray-700 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded-full text-sm font-medium"
                  >
                    {industry}
                  </span>
                ))}
              </div>
            </section>
          )}

          {/* Areas for Improvement */}
          <section className="border border-orange-200 dark:border-orange-800 rounded-lg p-5 bg-orange-50 dark:bg-gray-800">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              Focus Areas for Improvement
            </h3>
            <div className="space-y-2">
              {conversionPercent < 40 && (
                <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-orange-600 font-bold">→</span>
                  <span><strong>Conversion Rate:</strong> Consider improving qualification process or follow-up cadence</span>
                </div>
              )}
              {burnoutScore > 60 && (
                <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-orange-600 font-bold">→</span>
                  <span><strong>Burnout Level:</strong> High workload detected - consider load balancing or time off</span>
                </div>
              )}
              {agent.avgResponseTime !== null && agent.avgResponseTime > 3600 && (
                <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-orange-600 font-bold">→</span>
                  <span><strong>Response Time:</strong> Aim to respond within 1 hour for better engagement</span>
                </div>
              )}
              {agent.medianTimeToCloseDays !== null && agent.medianTimeToCloseDays > 90 && (
                <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-orange-600 font-bold">→</span>
                  <span><strong>Time to Close:</strong> Sales cycle is long - explore ways to accelerate decision-making</span>
                </div>
              )}
              {!agent.hotStreakActive && agent.closedWon > 0 && (
                <div className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                  <span className="text-orange-600 font-bold">→</span>
                  <span><strong>Momentum:</strong> No recent wins - focus on closing active deals to build momentum</span>
                </div>
              )}
              {conversionPercent >= 40 && burnoutScore <= 60 && (agent.avgResponseTime === null || agent.avgResponseTime <= 3600) && (
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span><strong>Great performance!</strong> Keep up the excellent work across all key metrics.</span>
                </div>
              )}
            </div>
          </section>

          {/* Time Period Note */}
          <div className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-sm text-gray-600 dark:text-gray-300">
                <p className="font-medium mb-1">Data Period: Last {windowDays} Days</p>
                <p>
                  This data reflects performance for leads assigned in the last {windowDays} days.
                  Change the window filter in the Outcomes screen to see different time periods.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg font-medium bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
