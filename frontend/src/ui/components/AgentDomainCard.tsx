/**
 * Agent Domain Expertise Card Component
 * Displays top 3 domain expertise for an agent
 */

import React from "react";

interface DomainExpertise {
  industry: string;
  expertiseScore: number;
  confidence: "low" | "medium" | "high";
  leadsHandled: number;
  conversionRate: number;
}

interface AgentDomainCardProps {
  agentUserId: string;
  agentName: string;
  topDomains: DomainExpertise[];
  totalScore?: number;
  availabilityScore?: number;
  conversionRate?: number;
  isHot?: boolean;
  hotDealsCount?: number;
  onViewDetails: () => void;
}

export function AgentDomainCard({
  agentUserId,
  agentName,
  topDomains,
  totalScore,
  availabilityScore,
  conversionRate,
  isHot,
  hotDealsCount,
  onViewDetails,
}: AgentDomainCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-4 hover:shadow-lg transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-gray-900 dark:text-white">{agentName}</h3>
        {totalScore !== undefined && (
          <span className="text-sm font-medium text-blue-600 dark:text-blue-400">
            {totalScore}/100
          </span>
        )}
      </div>

      {/* Top 3 Domain Expertise */}
      {topDomains.length > 0 ? (
        <div className="mb-3">
          <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
            Top Domains
          </h4>
          <div className="flex flex-wrap gap-2">
            {topDomains.slice(0, 3).map((domain) => (
              <div
                key={domain.industry}
                className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 dark:bg-blue-900 text-xs"
              >
                <span className="font-medium text-gray-900 dark:text-white">
                  {domain.industry}
                </span>
                <span className="text-blue-600 dark:text-blue-400">
                  {domain.expertiseScore}/100
                </span>
                {domain.confidence === "high" && <span title="High confidence">🟢</span>}
                {domain.confidence === "medium" && <span title="Medium confidence">🟡</span>}
                {domain.confidence === "low" && <span title="Low confidence">🔴</span>}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="mb-3 p-3 bg-gray-50 dark:bg-gray-900 rounded text-xs text-gray-500 dark:text-gray-400">
          No domain expertise data yet (needs more deals)
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 gap-2 text-xs mb-3">
        {conversionRate !== undefined && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Conversion:</span>
            <span className="ml-1 font-medium text-gray-900 dark:text-white">
              {(conversionRate * 100).toFixed(1)}%
            </span>
          </div>
        )}
        {availabilityScore !== undefined && (
          <div>
            <span className="text-gray-500 dark:text-gray-400">Availability:</span>
            <span className="ml-1 font-medium text-gray-900 dark:text-white">
              {availabilityScore}/100
            </span>
          </div>
        )}
      </div>

      {/* Hot Agent Badge */}
      {isHot && (
        <div className="flex items-center gap-1 text-orange-600 dark:text-orange-400 text-xs mb-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded">
          <span className="text-base">🔥</span>
          <span className="font-medium">Hot Agent</span>
          {hotDealsCount !== undefined && (
            <span className="text-gray-600 dark:text-gray-400">
              ({hotDealsCount} deals recently)
            </span>
          )}
        </div>
      )}

      {/* View Details Button */}
      <button
        onClick={onViewDetails}
        className="w-full text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium transition-colors"
      >
        View Full Details →
      </button>
    </div>
  );
}

