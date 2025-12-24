/**
 * Agent KPI Details Modal - Phase 2
 * Displays comprehensive KPI breakdown with scores and weights
 */

import React from "react";

interface KPIScore {
  rawScore: number;
  weight: number;
  points: number;
  rawValue?: any;
}

interface KPIBreakdown {
  domainExpertise: KPIScore;
  availability: KPIScore;
  conversionHistorical: KPIScore;
  recentPerformance: KPIScore;
  avgDealSize: KPIScore;
  responseTime: KPIScore;
  avgTimeToClose: KPIScore;
  hotAgent: KPIScore;
}

interface DomainExpertise {
  industry: string;
  expertiseScore: number;
  leadsHandled: number;
  leadsConverted: number;
  conversionRate: number;
  avgDealSize: number;
  totalRevenue: number;
  confidence: "low" | "medium" | "high";
}

interface AgentKPIDetailsModalProps {
  agentName: string;
  totalScore: number;
  breakdown: KPIBreakdown;
  domains: DomainExpertise[];
  onClose: () => void;
}

export function AgentKPIDetailsModal({
  agentName,
  totalScore,
  breakdown,
  domains,
  onClose,
}: AgentKPIDetailsModalProps) {
  const isDark = document.documentElement.classList.contains("dark");

  const formatKPIName = (key: string): string => {
    const names: Record<string, string> = {
      domainExpertise: "Domain Expertise",
      availability: "Availability",
      conversionHistorical: "Conversion Rate (All-Time)",
      recentPerformance: "Recent Performance",
      avgDealSize: "Average Deal Size",
      responseTime: "Response Time",
      avgTimeToClose: "Avg Time to Close",
      hotAgent: "Hot Agent",
    };
    return names[key] || key;
  };

  const getScoreColor = (score: number): string => {
    if (score >= 80) return "text-green-600 dark:text-green-400";
    if (score >= 60) return "text-blue-600 dark:text-blue-400";
    if (score >= 40) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{agentName}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Complete KPI Breakdown
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors text-2xl"
          >
            ×
          </button>
        </div>

        <div className="p-6">
          {/* Overall Score */}
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="text-center">
              <div className="text-5xl font-bold text-blue-600 dark:text-blue-400 mb-2">
                {totalScore.toFixed(1)}<span className="text-3xl">/100</span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Overall Routing Score
              </div>
            </div>
          </div>

          {/* KPI Breakdown Table */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              KPI Breakdown
            </h3>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 text-gray-700 dark:text-gray-300 font-medium">
                      KPI
                    </th>
                    <th className="text-right py-3 text-gray-700 dark:text-gray-300 font-medium">
                      Score (0-100)
                    </th>
                    <th className="text-center py-3 text-gray-700 dark:text-gray-300 font-medium">
                      Visual
                    </th>
                    <th className="text-right py-3 text-gray-700 dark:text-gray-300 font-medium">
                      Weight (%)
                    </th>
                    <th className="text-right py-3 text-gray-700 dark:text-gray-300 font-medium">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(breakdown).map(([key, data]) => (
                    <tr key={key} className="border-b border-gray-100 dark:border-gray-800">
                      <td className="py-3 text-gray-900 dark:text-white font-medium">
                        {formatKPIName(key)}
                      </td>
                      <td className={`text-right ${getScoreColor(data.rawScore)} font-semibold`}>
                        {data.rawScore.toFixed(1)}
                      </td>
                      <td className="text-center">
                        <div className="flex items-center justify-center">
                          <div className="w-32 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                data.rawScore >= 80
                                  ? "bg-green-600"
                                  : data.rawScore >= 60
                                  ? "bg-blue-600"
                                  : data.rawScore >= 40
                                  ? "bg-yellow-600"
                                  : "bg-red-600"
                              }`}
                              style={{ width: `${data.rawScore}%` }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="text-right text-gray-600 dark:text-gray-400">
                        {data.weight}%
                      </td>
                      <td className="text-right font-semibold text-gray-900 dark:text-white">
                        {data.points.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-gray-50 dark:bg-gray-900 font-bold">
                    <td className="py-3 text-gray-900 dark:text-white">TOTAL</td>
                    <td className="text-right"></td>
                    <td className="text-center"></td>
                    <td className="text-right text-gray-600 dark:text-gray-400">100%</td>
                    <td className="text-right text-blue-600 dark:text-blue-400">
                      {totalScore.toFixed(2)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Domain Expertise Table */}
          {domains.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Domain Expertise (Historical Performance)
              </h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-3 text-gray-700 dark:text-gray-300 font-medium">
                        Industry
                      </th>
                      <th className="text-right py-3 text-gray-700 dark:text-gray-300 font-medium">
                        Leads
                      </th>
                      <th className="text-right py-3 text-gray-700 dark:text-gray-300 font-medium">
                        Converted
                      </th>
                      <th className="text-right py-3 text-gray-700 dark:text-gray-300 font-medium">
                        Conv. Rate
                      </th>
                      <th className="text-right py-3 text-gray-700 dark:text-gray-300 font-medium">
                        Avg Deal
                      </th>
                      <th className="text-right py-3 text-gray-700 dark:text-gray-300 font-medium">
                        Total Revenue
                      </th>
                      <th className="text-right py-3 text-gray-700 dark:text-gray-300 font-medium">
                        Expertise
                      </th>
                      <th className="text-center py-3 text-gray-700 dark:text-gray-300 font-medium">
                        Confidence
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {domains
                      .sort((a, b) => b.expertiseScore - a.expertiseScore)
                      .map((domain) => (
                        <tr
                          key={domain.industry}
                          className="border-b border-gray-100 dark:border-gray-800"
                        >
                          <td className="py-3 text-gray-900 dark:text-white font-medium">
                            {domain.industry}
                          </td>
                          <td className="text-right text-gray-700 dark:text-gray-300">
                            {domain.leadsHandled}
                          </td>
                          <td className="text-right text-gray-700 dark:text-gray-300">
                            {domain.leadsConverted}
                          </td>
                          <td className="text-right text-gray-700 dark:text-gray-300">
                            {(domain.conversionRate * 100).toFixed(1)}%
                          </td>
                          <td className="text-right text-gray-700 dark:text-gray-300">
                            ${domain.avgDealSize.toLocaleString()}
                          </td>
                          <td className="text-right text-gray-700 dark:text-gray-300">
                            ${domain.totalRevenue.toLocaleString()}
                          </td>
                          <td className={`text-right font-semibold ${getScoreColor(domain.expertiseScore)}`}>
                            {domain.expertiseScore}/100
                          </td>
                          <td className="text-center">
                            {domain.confidence === "high" && (
                              <span title="High confidence (30+ leads)">🟢</span>
                            )}
                            {domain.confidence === "medium" && (
                              <span title="Medium confidence (10-30 leads)">🟡</span>
                            )}
                            {domain.confidence === "low" && (
                              <span title="Low confidence (<10 leads)">🔴</span>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 px-6 py-4">
          <button
            onClick={onClose}
            className="w-full px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

