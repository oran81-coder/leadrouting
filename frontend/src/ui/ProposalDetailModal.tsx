import React from "react";
import type { ManagerProposalDTO } from "./api";

type ProposalDetailModalProps = {
  proposal: ManagerProposalDTO;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
};

export function ProposalDetailModal({ proposal, onClose, onApprove, onReject }: ProposalDetailModalProps) {
  // Extract explanation from explainability
  const explainability = proposal.explains as any;
  const explanation = explainability?.explanation || "No explanation available";
  const matchScore = proposal.matchScore;
  const assigneeName = proposal.suggestedAssigneeName || proposal.suggestedAssigneeRaw || "Unknown";

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
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <svg className="w-6 h-6 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  Recommended Assignee
                </h4>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100 mb-1">
                  {assigneeName}
                </div>
                {proposal.suggestedRuleName && (
                  <div className="text-sm text-gray-600 dark:text-gray-400">
                    via rule: <span className="font-medium">{proposal.suggestedRuleName}</span>
                  </div>
                )}
              </div>
              {matchScore !== null && (
                <div className="text-center ml-4">
                  <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                    {Math.round(matchScore)}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 font-medium">
                    Match Score
                  </div>
                </div>
              )}
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
          </div>

          {/* Status Badge */}
          <div>
            <span
              className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                proposal.status === "PENDING"
                  ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                  : proposal.status === "APPROVED"
                  ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                  : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
              }`}
            >
              {proposal.status}
            </span>
          </div>

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
                  Board ID
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                  {proposal.boardId}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Item ID
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white font-mono">
                  {proposal.itemId}
                </dd>
              </div>
            </div>
            {proposal.itemName && (
              <div className="mt-3">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  Item Name
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-white">
                  {proposal.itemName}
                </dd>
              </div>
            )}
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

