import React, { useState } from "react";
import type { ManagerProposalDTO } from "./api";
import { ScoreBreakdownSkeleton } from "./LoadingComponents";

type ProposalDetailModalProps = {
  proposal: ManagerProposalDTO;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
};

export function ProposalDetailModal({ proposal, onClose, onApprove, onReject }: ProposalDetailModalProps) {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [breakdownLoading, setBreakdownLoading] = useState(false);

  // Extract explanation from explainability
  const explainability = proposal.explains as any;

  const assigneeName = proposal.suggestedAssigneeName || proposal.suggestedAssigneeRaw || "Unknown";

  // Support both old format (string) and new format (RoutingExplanation object)
  let explanation = "No explanation available";
  if (typeof explainability === 'string') {
    // Old format: simple string
    explanation = explainability || "No explanation available";
  } else if (explainability && typeof explainability === 'object') {
    // New format: RoutingExplanation object
    explanation = explainability.summary || explainability.explanation || "No explanation available";
  }

  // Dynamic fix for existing proposals: Replace numeric ID with agent name if present in text
  if (proposal.suggestedAssigneeRaw && assigneeName && assigneeName !== proposal.suggestedAssigneeRaw) {
    // Try to replace both absolute matches and word-boundary matches
    const escapedRaw = proposal.suggestedAssigneeRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const idRegexGlobal = new RegExp(escapedRaw, 'g');
    if (idRegexGlobal.test(explanation)) {
      explanation = explanation.replace(idRegexGlobal, assigneeName);
    }
  }

  // Fallback for old proposals: If summary looks like a formulaic old summary, try to beautify it
  if (explanation.includes('is the best match') || (explanation.includes('Primary reason:') || explanation.includes('Primary driver:'))) {
    // Attempt to convert "Name is the best match (score: 100/100). Primary reason: X" 
    // to "... was identified as the optimal candidate..."
    explanation = explanation
      .replace(/is the best match/i, 'was identified as the optimal candidate')
      .replace(/\. Primary reason:/i, '. This recommendation is primarily driven by')
      .replace(/\. Primary driver:/i, '. This recommendation is primarily driven by');
  }

  // Extract match score from multiple possible sources
  const matchScore = (proposal as any).matchScore
    ?? explainability?.recommendedAgent?.score
    ?? explainability?.score
    ?? null;

  // Extract breakdown from explainability (supports both old and new formats)
  // Old format: { industryMatch: 85, availability: 90, ... }
  // New format: { primaryReasons: [...], secondaryFactors: [...] }
  let breakdown = explainability?.breakdown || explainability?.recommendedAgent?.breakdown || null;

  // If new format detected (with primaryReasons), extract KPI scores from it
  if (breakdown && breakdown.primaryReasons) {
    // Convert new format to old format for backwards compatibility
    const kpiScores: Record<string, number> = {};

    // Extract from primary reasons
    for (const reason of breakdown.primaryReasons || []) {
      // Prioritize ruleId mapping (more specific) over category mapping
      if (reason.ruleId) {
        const scoreValue = reason.matchScore !== undefined ? Math.round(reason.matchScore * 100) : Math.round(reason.contribution);
        kpiScores[reason.ruleId] = scoreValue;
      } else if (reason.category) {
        // Fallback to category if ruleId is missing
        const scoreValue = reason.matchScore !== undefined ? Math.round(reason.matchScore * 100) : Math.round(reason.contribution);
        if (kpiScores[reason.category] === undefined) {
          kpiScores[reason.category] = scoreValue;
        }
      }
    }

    // Extract from secondary factors
    for (const factor of breakdown.secondaryFactors || []) {
      if (factor.ruleId) {
        const scoreValue = factor.matchScore !== undefined ? Math.round(factor.matchScore * 100) : Math.round(factor.contribution);
        kpiScores[factor.ruleId] = scoreValue;
      } else if (factor.category) {
        const scoreValue = factor.matchScore !== undefined ? Math.round(factor.matchScore * 100) : Math.round(factor.contribution);
        if (kpiScores[factor.category] === undefined) {
          kpiScores[factor.category] = scoreValue;
        }
      }
    }

    // Use extracted KPI scores if available, otherwise keep original breakdown
    if (Object.keys(kpiScores).length > 0) {
      breakdown = kpiScores;
    }
  }

  // Determine if we are showing raw metric scores (0-100) or contribution points (weighted)
  // New proposals store raw matchScore in the breakdown reasons.
  const isRawScore = (explainability?.breakdown?.primaryReasons || [])
    .some((r: any) => r.matchScore !== undefined);

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
            Routing Proposal Details
          </h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-6">
          {/* Hero Section - Recommendation */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl p-6 border-2 border-blue-200 dark:border-blue-800">
            <div className="mb-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                Recommended Assignee
              </h4>
              <div className="flex items-center justify-between">
                <div className="flex flex-col gap-1">
                  <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">
                    {assigneeName}
                  </div>
                  {proposal.suggestedRuleName && (
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      via rule: <span className="font-medium">{proposal.suggestedRuleName}</span>
                    </div>
                  )}
                </div>
                {matchScore != null && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 dark:bg-blue-500 rounded-lg shadow-md">
                    <span className="text-4xl font-bold text-white">
                      {Math.round(matchScore)}
                    </span>
                    <span className="text-sm text-blue-100 font-medium">
                      /100
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Explanation */}
            <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
              <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                Reason for Decision
              </h5>
              <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                {explanation}
              </p>
            </div>

            {/* Score Breakdown - Collapsible */}
            {breakdown && (
              <div className="mt-4 pt-4 border-t border-blue-200 dark:border-blue-800">
                <button
                  onClick={async () => {
                    if (!showBreakdown) {
                      setBreakdownLoading(true);
                      // Simulate loading (in real app, this might fetch detailed data)
                      await new Promise(resolve => setTimeout(resolve, 300));
                      setBreakdownLoading(false);
                    }
                    setShowBreakdown(!showBreakdown);
                  }}
                  className="w-full flex items-center justify-between text-left hover:bg-blue-100/50 dark:hover:bg-blue-900/30 rounded-lg p-2 transition-colors"
                >
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Score Breakdown
                  </span>
                  <svg
                    className={`w-5 h-5 text-gray-600 dark:text-gray-400 transition-transform ${showBreakdown ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {breakdownLoading ? (
                  <ScoreBreakdownSkeleton />
                ) : showBreakdown && (
                  <div className="mt-3 space-y-2 bg-white/50 dark:bg-gray-900/30 rounded-lg p-4">
                    {/* Score Breakdown List */}
                    <div className="space-y-4">
                      {/* Score Breakdown List */}
                      <div className="space-y-4">
                        {(() => {
                          // Map technical keys to friendly labels and icons
                          const metricMap: Record<string, { label: string; icon: string; color: string }> = {
                            kpi_workload: { label: "Current Capacity", icon: "⚖️", color: "bg-amber-600" },
                            kpi_industry_match: { label: "Domain Expertise", icon: "🎯", color: "bg-blue-600" },
                            kpi_conversion_historical: { label: "Historical Success", icon: "🏆", color: "bg-green-600" },
                            kpi_recent_performance: { label: "Recent Performance", icon: "📊", color: "bg-cyan-600" },
                            kpi_response_time: { label: "Response Speed", icon: "⏱️", color: "bg-indigo-600" },
                            kpi_avg_time_to_close: { label: "Closing Speed", icon: "🏁", color: "bg-purple-600" },
                            kpi_avg_deal_size: { label: "Avg Deal Size", icon: "💰", color: "bg-emerald-600" },
                            kpi_hot_streak: { label: "Momentum", icon: "🔥", color: "bg-orange-600" }
                          };

                          // Mapping for legacy/alternative keys
                          const legacyMap: Record<string, string> = {
                            capacity: 'kpi_workload',
                            workload: 'kpi_workload',
                            industryMatch: 'kpi_industry_match',
                            expertise: 'kpi_industry_match',
                            conversionRate: 'kpi_conversion_historical',
                            performance: 'kpi_recent_performance', // Fallback for generic performance
                            momentum: 'kpi_hot_streak',
                            hotStreak: 'kpi_hot_streak',
                            responseSpeed: 'kpi_response_time',
                            // Ensure direct ruleId mapping works too (identity)
                            kpi_workload: 'kpi_workload',
                            kpi_conversion_historical: 'kpi_conversion_historical',
                            kpi_recent_performance: 'kpi_recent_performance',
                            kpi_response_time: 'kpi_response_time',
                            kpi_avg_time_to_close: 'kpi_avg_time_to_close',
                            kpi_avg_deal_size: 'kpi_avg_deal_size',
                            kpi_industry_match: 'kpi_industry_match',
                            kpi_hot_streak: 'kpi_hot_streak',
                          };

                          // Build a unified score map
                          const finalScores: Record<string, number> = {};
                          // Initialize all with 0
                          Object.keys(metricMap).forEach(k => finalScores[k] = 0);

                          // Fill with actual data
                          Object.entries(breakdown || {}).forEach(([key, value]) => {
                            const normalizedKey = legacyMap[key] || key;
                            if (finalScores[normalizedKey] !== undefined && typeof value === 'number') {
                              finalScores[normalizedKey] = value;
                            }
                          });

                          // Render all 8 in fixed order
                          return Object.entries(metricMap).map(([key, meta]) => {
                            const value = finalScores[key];
                            return (
                              <div key={key} className="space-y-1.5">
                                <div className="flex justify-between items-center text-sm">
                                  <span className="text-gray-700 dark:text-gray-300 font-medium flex items-center gap-2">
                                    <span className="text-base">{meta.icon}</span>
                                    {meta.label}
                                  </span>
                                  <span className="font-bold text-blue-900 dark:text-blue-100">
                                    {Math.round(value)}{isRawScore ? "/100" : " pts"}
                                  </span>
                                </div>
                                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden shadow-inner">
                                  <div
                                    className={`h-full ${meta.color} transition-all duration-1000 ease-out`}
                                    style={{ width: `${isRawScore ? Math.min(100, Math.max(0, value)) : Math.min(100, (value / 25) * 100)}%` }}
                                  />
                                </div>
                              </div>
                            );
                          });
                        })()}
                      </div>
                    </div>

                    {matchScore != null && (
                      <div className="mt-6 pt-4 border-t border-blue-200 dark:border-blue-700 flex justify-between items-center">
                        <span className="text-base font-bold text-gray-800 dark:text-gray-200 flex items-center gap-2">
                          <span className="animate-pulse">💡</span> Weighted Average
                        </span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-blue-600 dark:text-blue-400">
                            {Math.round(matchScore)}
                          </span>
                          <span className="text-sm font-bold text-blue-400">/100</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Alternative Agents Section */}
          {explainability?.alternatives && explainability.alternatives.length > 0 && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                Alternative Agents
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Other agents who could handle this lead, ranked by match score
              </p>
              <div className="space-y-3">
                {explainability.alternatives.map((alt: any, index: number) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {/* Rank Badge */}
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
                          <span className="text-sm font-bold text-gray-700 dark:text-gray-300">
                            #{alt.rank}
                          </span>
                        </div>

                        {/* Agent Info */}
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 dark:text-white">
                            {alt.agentName || alt.agentUserId}
                          </div>
                          {alt.summary && (
                            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                              {alt.summary}
                            </p>
                          )}
                          {alt.agentUserId && alt.agentName && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1 font-mono">
                              ID: {alt.agentUserId}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Score */}
                      <div className="flex-shrink-0 text-right ml-4">
                        <div className="text-2xl font-bold text-gray-900 dark:text-white">
                          {alt.score}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Match Score
                        </div>
                        {alt.scoreDifference !== undefined && (
                          <div className="text-xs text-red-600 dark:text-red-400 mt-1">
                            -{alt.scoreDifference} pts
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Info Message */}
              <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg flex items-start gap-2">
                <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  These agents are ranked by their match score based on {explainability.totalAgentsEvaluated || 'multiple'} factors including availability, expertise, and performance metrics.
                </p>
              </div>
            </div>
          )}

          {/* Status Badge */}
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${proposal.status === "PENDING"
                ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                : proposal.status === "APPROVED"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                }`}
            >
              {proposal.status}
            </span>
            {proposal.wasRescored && (
              <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200">
                📊 Data Updated
              </span>
            )}
          </div>

          {/* Data Update Details */}
          {proposal.wasRescored && proposal.dataChanges && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-600 dark:text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Data Update Information
              </h4>
              <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4 space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Updated At
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {new Date(proposal.dataUpdatedAt!).toLocaleString()}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Changed Fields
                  </dt>
                  <dd className="mt-2 space-y-2">
                    {(proposal.dataChanges as any[]).map((change: any, index: number) => (
                      <div key={index} className="text-sm bg-white dark:bg-gray-800 rounded p-2 border border-orange-200 dark:border-orange-800">
                        <div className="font-medium text-gray-900 dark:text-white">
                          {change.fieldName}
                        </div>
                        <div className="text-gray-600 dark:text-gray-400 mt-1">
                          <span className="line-through">{change.oldValue || 'null'}</span>
                          {' → '}
                          <span className="font-medium text-orange-600 dark:text-orange-400">{change.newValue || 'null'}</span>
                        </div>
                      </div>
                    ))}
                  </dd>
                </div>
                <div className="pt-3 border-t border-orange-200 dark:border-orange-700">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    ℹ️ This proposal was automatically re-scored when the lead data changed in Monday.com. The recommendation and match score have been updated to reflect the latest information.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Proposal ID
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                {proposal.id}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                Created At
              </dt>
              <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                {new Date(proposal.createdAt).toLocaleString()}
              </dd>
            </div>
          </div>

          {/* Monday.com Info */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Monday.com Details
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Board
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {proposal.boardName || proposal.boardId}
                </dd>
                {proposal.boardName && (
                  <dd className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 font-mono">
                    ID: {proposal.boardId}
                  </dd>
                )}
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Item
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {proposal.itemName || proposal.itemId}
                </dd>
                {proposal.itemName && (
                  <dd className="mt-0.5 text-xs text-gray-500 dark:text-gray-400 font-mono">
                    ID: {proposal.itemId}
                  </dd>
                )}
              </div>
            </div>
          </div>

          {/* Routing Suggestion - Additional Details */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <h4 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              Additional Routing Details
            </h4>
            <div className="space-y-3">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Agent Identifier (Raw)
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                  {proposal.suggestedAssigneeRaw || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Rule Applied
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {proposal.suggestedRuleName || "—"}
                </dd>
              </div>
            </div>
          </div>

          {/* Applied Details (if approved) */}
          {proposal.appliedAt && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Applied Details
              </h4>
              <div className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Applied At
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                    {new Date(proposal.appliedAt).toLocaleString()}
                  </dd>
                </div>
                {proposal.appliedAssigneeRaw && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                      Applied Assignee Value
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono bg-gray-50 dark:bg-gray-900 p-2 rounded">
                      {proposal.appliedAssigneeRaw}
                    </dd>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Full JSON Data (Expandable) */}
          <details className="border-t border-gray-200 dark:border-gray-700 pt-4">
            <summary className="text-sm font-medium text-gray-700 dark:text-gray-300 cursor-pointer hover:text-gray-900 dark:hover:text-white">
              View Raw JSON Data
            </summary>
            <pre className="mt-3 text-xs text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 p-3 rounded overflow-auto max-h-60">
              {JSON.stringify(proposal, null, 2)}
            </pre>
          </details>
        </div>

        {/* Footer Actions */}
        {proposal.status === "PENDING" && (
          <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={onReject}
              className="px-4 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
            >
              Reject
            </button>
            <button
              onClick={onApprove}
              className="px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
            >
              Approve
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

