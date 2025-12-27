import React, { useEffect, useState } from "react";
import {
  listProposals,
  approve,
  reject,
  overrideAndApply,
  approveAllFiltered,
  getMondayUsers,
  type ManagerProposalDTO,
  type MondayUser,
} from "./api";
import { ProposalDetailModal } from "./ProposalDetailModal";
import { useToast } from "./hooks/useToast";
import { useConfirm } from "./hooks/useConfirm";
import { ConfirmDialog } from "./ConfirmDialog";
import { EmptyState } from "./EmptyState";
import { TableSkeleton } from "./TableSkeleton";
import { Tooltip } from "./Tooltip";
import { useDebounce } from "./hooks/useDebounce";
import { OverrideDialog } from "./OverrideDialog";

type StatusFilter = "PENDING" | "PROPOSED" | "APPROVED" | "REJECTED" | "";

export function ManagerScreen() {
  const { showToast } = useToast();
  const { confirm, isOpen, options, handleConfirm, handleCancel } = useConfirm();
  const [proposals, setProposals] = useState<ManagerProposalDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("");
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [selectedProposal, setSelectedProposal] = useState<ManagerProposalDTO | null>(null);
  const [bulkSelected, setBulkSelected] = useState<Set<string>>(new Set());
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [mondayUsers, setMondayUsers] = useState<MondayUser[]>([]);
  const [overrideDialogOpen, setOverrideDialogOpen] = useState(false);
  const [overrideProposal, setOverrideProposal] = useState<ManagerProposalDTO | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(30); // seconds
  const [countdown, setCountdown] = useState(30);

  async function fetchProposals() {
    setLoading(true);
    setError(null);
    try {
      // Always fetch all proposals for accurate KPI counts
      const result = await listProposals({
        status: undefined, // Don't filter on server - filter client-side instead
        limit: 100,
      });
      setProposals(result.items);
      setLastUpdated(new Date());
      setBulkSelected(new Set()); // Clear selection on refresh
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  async function fetchUsers() {
    try {
      const users = await getMondayUsers();
      setMondayUsers(users);
    } catch (e: any) {
      console.error("Error fetching users:", e);
      showToast("Error loading users: " + (e?.message || String(e)), "error");
    }
  }

  useEffect(() => {
    fetchProposals();
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Auto-refresh logic
  useEffect(() => {
    if (!autoRefresh) {
      setCountdown(refreshInterval);
      return;
    }

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          fetchProposals();
          return refreshInterval;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [autoRefresh, refreshInterval, statusFilter]);

  async function handleApprove(id: string) {
    // Optimistic update - update UI immediately
    const previousProposals = [...proposals];
    setProposals(prev => prev.map(p => 
      p.id === id ? { ...p, status: "APPROVED" as const } : p
    ));
    
    try {
      await approve(id);
      showToast("Proposal approved successfully", "success");
      // Re-fetch to ensure sync
      await fetchProposals();
    } catch (e: any) {
      // Rollback on error
      setProposals(previousProposals);
      showToast("Error approving: " + (e?.message || String(e)), "error");
    }
  }

  async function handleReject(id: string) {
    // Optimistic update - update UI immediately
    const previousProposals = [...proposals];
    setProposals(prev => prev.map(p => 
      p.id === id ? { ...p, status: "REJECTED" as const } : p
    ));
    
    try {
      await reject(id);
      showToast("Proposal rejected", "success");
      // Re-fetch to ensure sync
      await fetchProposals();
    } catch (e: any) {
      // Rollback on error
      setProposals(previousProposals);
      showToast("Error rejecting: " + (e?.message || String(e)), "error");
    }
  }

  function handleOverride(id: string) {
    const proposal = proposals.find(p => p.id === id);
    if (!proposal) return;
    setOverrideProposal(proposal);
    setOverrideDialogOpen(true);
  }

  async function handleOverrideConfirm(userId: string) {
    if (!overrideProposal) return;
    try {
      await overrideAndApply(overrideProposal.id, userId);
      await fetchProposals();
      showToast("Override applied successfully", "success");
    } catch (e: any) {
      showToast("Error overriding: " + (e?.message || String(e)), "error");
    }
  }

  async function handleApproveAllFiltered() {
    const confirmed = await confirm({
      title: "Approve All Proposals",
      message: `Approve all ${statusFilter || "ALL"} proposals? This action cannot be undone.`,
      confirmText: "Approve All",
    });
    
    if (!confirmed) return;
    
    try {
      setLoading(true);
      await approveAllFiltered({ status: statusFilter || undefined });
      await fetchProposals();
      showToast("All proposals approved successfully", "success");
    } catch (e: any) {
      showToast("Error bulk approving: " + (e?.message || String(e)), "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkApprove() {
    if (bulkSelected.size === 0) return;
    
    const confirmed = await confirm({
      title: "Approve Selected Proposals",
      message: `Approve ${bulkSelected.size} selected proposals? This action cannot be undone.`,
      confirmText: "Approve Selected",
    });
    
    if (!confirmed) return;
    
    setLoading(true);
    try {
      const count = bulkSelected.size;
      for (const id of Array.from(bulkSelected)) {
        await approve(id);
      }
      await fetchProposals();
      setBulkSelected(new Set());
      showToast(`${count} proposals approved successfully`, "success");
    } catch (e: any) {
      showToast("Error in bulk approve: " + (e?.message || String(e)), "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleBulkReject() {
    if (bulkSelected.size === 0) return;
    
    const confirmed = await confirm({
      title: "Reject Selected Proposals",
      message: `Reject ${bulkSelected.size} selected proposals? This action cannot be undone.`,
      confirmText: "Reject Selected",
      isDanger: true,
    });
    
    if (!confirmed) return;
    
    setLoading(true);
    try {
      const count = bulkSelected.size;
      for (const id of Array.from(bulkSelected)) {
        await reject(id);
      }
      await fetchProposals();
      setBulkSelected(new Set());
      showToast(`${count} proposals rejected`, "success");
    } catch (e: any) {
      showToast("Error in bulk reject: " + (e?.message || String(e)), "error");
    } finally {
      setLoading(false);
    }
  }

  function toggleBulkSelect(id: string) {
    const newSet = new Set(bulkSelected);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setBulkSelected(newSet);
  }

  function toggleSelectAll() {
    if (bulkSelected.size === filteredProposals.length && filteredProposals.length > 0) {
      setBulkSelected(new Set());
    } else {
      setBulkSelected(new Set(filteredProposals.map((p) => p.id)));
    }
  }

  // Filter proposals based on status and search (debounced for performance)
  const filteredProposals = proposals.filter((p) => {
    // Status filter
    if (statusFilter && p.status !== statusFilter) return false;
    
    // Search filter
    if (!debouncedSearchQuery) return true;
    const search = debouncedSearchQuery.toLowerCase();
    return (
      p.itemId.toLowerCase().includes(search) ||
      p.boardId.toLowerCase().includes(search) ||
      (p.itemName && p.itemName.toLowerCase().includes(search)) ||
      (p.suggestedAssigneeRaw && p.suggestedAssigneeRaw.toLowerCase().includes(search)) ||
      (p.suggestedAssigneeName && p.suggestedAssigneeName.toLowerCase().includes(search)) ||
      (p.suggestedRuleName && p.suggestedRuleName.toLowerCase().includes(search))
    );
  });

  // Calculate KPIs
  const pendingCount = proposals.filter((p) => p.status === "PENDING" || p.status === "PROPOSED").length;
  const approvedCount = proposals.filter((p) => p.status === "APPROVED" || p.status === "APPLIED").length;
  const rejectedCount = proposals.filter((p) => p.status === "REJECTED").length;
  const totalCount = proposals.length;

  if (error) {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <h3 className="text-red-800 dark:text-red-200 font-semibold">Error loading proposals</h3>
          <p className="text-red-600 dark:text-red-300 mt-2">{error}</p>
          <button
            onClick={fetchProposals}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        Manager Dashboard
      </h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        {/* Total Proposals */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Proposals</h3>
            <svg
              className="w-5 h-5 text-blue-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path
                fillRule="evenodd"
                d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{totalCount}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">All routing proposals</div>
        </div>

        {/* Pending */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</h3>
            <svg
              className="w-5 h-5 text-yellow-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{pendingCount}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Awaiting approval</div>
        </div>

        {/* Approved */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Approved</h3>
            <svg
              className="w-5 h-5 text-green-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{approvedCount}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Successfully approved</div>
        </div>

        {/* Rejected */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Rejected</h3>
            <svg
              className="w-5 h-5 text-red-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">{rejectedCount}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">Declined proposals</div>
        </div>
      </div>

      {/* Filters and Actions */}
      <div className="mb-6 flex gap-4 items-center flex-wrap">
        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          className="px-4 py-2 rounded-lg font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="PROPOSED">Proposed</option>
          <option value="APPROVED">Approved</option>
          <option value="REJECTED">Rejected</option>
        </select>

        {/* Search */}
        <div className="flex-1 min-w-[200px] max-w-md">
          <input
            type="text"
            placeholder="Search by item, board, assignee, or rule..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Refresh */}
        <Tooltip content="Reload proposals from server">
          <button
            onClick={fetchProposals}
            disabled={loading}
            aria-label="Refresh proposals"
            className="px-4 py-2 rounded-lg font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? "Loading..." : "Refresh"}
          </button>
        </Tooltip>

        {/* Auto-Refresh Toggle */}
        <Tooltip content={autoRefresh ? `Auto-refreshing every ${refreshInterval}s (${countdown}s remaining)` : "Enable auto-refresh"}>
          <button
            onClick={() => setAutoRefresh(!autoRefresh)}
            aria-label="Toggle auto-refresh"
            className={`px-4 py-2 rounded-lg font-medium border transition-colors ${
              autoRefresh
                ? "bg-green-600 text-white border-green-600 hover:bg-green-700"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            }`}
          >
            {autoRefresh ? (
              <span className="flex items-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Auto ({countdown}s)
              </span>
            ) : (
              "Auto-Refresh"
            )}
          </button>
        </Tooltip>

        {/* Refresh Interval Selector */}
        {autoRefresh && (
          <select
            value={refreshInterval}
            onChange={(e) => {
              const newInterval = parseInt(e.target.value);
              setRefreshInterval(newInterval);
              setCountdown(newInterval);
            }}
            className="px-3 py-2 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <option value="10">10s</option>
            <option value="30">30s</option>
            <option value="60">60s</option>
            <option value="120">2m</option>
            <option value="300">5m</option>
          </select>
        )}

        {/* Bulk Actions */}
        {bulkSelected.size > 0 && (
          <>
            <button
              onClick={handleBulkApprove}
              aria-label={`Approve ${bulkSelected.size} selected proposals`}
              className="px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              Approve Selected ({bulkSelected.size})
            </button>
            <button
              onClick={handleBulkReject}
              aria-label={`Reject ${bulkSelected.size} selected proposals`}
              className="px-4 py-2 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={loading}
            >
              Reject Selected ({bulkSelected.size})
            </button>
          </>
        )}

        {/* Approve All Filtered */}
        {(statusFilter === "PENDING" || statusFilter === "PROPOSED") && pendingCount > 0 && (
          <button
            onClick={handleApproveAllFiltered}
            disabled={loading}
            className="px-4 py-2 rounded-lg font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Approve All Pending
          </button>
        )}

        {/* Last Updated */}
        {lastUpdated && (
          <div className="flex items-center gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 rounded-lg text-sm text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <span>Updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      {/* Proposals Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
          <table className="w-full min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={
                      filteredProposals.length > 0 &&
                      bulkSelected.size === filteredProposals.length
                    }
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Item
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Suggested Assignee
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Rule
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredProposals.length === 0 && !loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-0">
                    <EmptyState
                      variant={searchQuery ? "no-results" : "no-proposals"}
                      title={searchQuery ? "No proposals match your search" : undefined}
                      description={searchQuery ? `No proposals found matching "${searchQuery}". Try adjusting your search.` : undefined}
                      action={searchQuery ? { label: "Clear Search", onClick: () => setSearchQuery("") } : undefined}
                    />
                  </td>
                </tr>
              ) : loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-4">
                    <TableSkeleton rows={5} columns={7} />
                  </td>
                </tr>
              ) : (
                filteredProposals.map((proposal) => (
                  <tr
                    key={proposal.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={bulkSelected.has(proposal.id)}
                        onChange={() => toggleBulkSelect(proposal.id)}
                        className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500 cursor-pointer"
                        aria-label={`Select proposal ${proposal.itemId}`}
                      />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {new Date(proposal.createdAt).toLocaleDateString()}<br />
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {new Date(proposal.createdAt).toLocaleTimeString()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedProposal(proposal)}
                        className="text-sm text-blue-600 dark:text-blue-400 hover:underline text-left"
                      >
                        <div className="font-medium">
                          {proposal.itemName || `Item ${proposal.itemId}`}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {proposal.boardId}:{proposal.itemId}
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {proposal.suggestedAssigneeName || proposal.suggestedAssigneeRaw || "—"}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-gray-100">
                      {proposal.suggestedRuleName || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          proposal.status === "PENDING" || proposal.status === "PROPOSED"
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
                            : proposal.status === "APPROVED"
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                            : proposal.status === "REJECTED"
                            ? "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
                        }`}
                      >
                        {proposal.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(proposal.id)}
                          disabled={proposal.status !== "PENDING" && proposal.status !== "PROPOSED"}
                          className="px-3 py-1 text-sm rounded bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          aria-label={`Approve proposal ${proposal.itemId}`}
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleReject(proposal.id)}
                          disabled={proposal.status !== "PENDING" && proposal.status !== "PROPOSED"}
                          className="px-3 py-1 text-sm rounded bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          aria-label={`Reject proposal ${proposal.itemId}`}
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => handleOverride(proposal.id)}
                          disabled={proposal.status !== "PENDING" && proposal.status !== "PROPOSED"}
                          className="px-3 py-1 text-sm rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          aria-label={`Override proposal ${proposal.itemId}`}
                        >
                          Override
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Proposal Detail Modal */}
      {selectedProposal && (
        <ProposalDetailModal
          proposal={selectedProposal}
          onClose={() => setSelectedProposal(null)}
          onApprove={() => {
            handleApprove(selectedProposal.id);
            setSelectedProposal(null);
          }}
          onReject={() => {
            handleReject(selectedProposal.id);
            setSelectedProposal(null);
          }}
        />
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

      <OverrideDialog
        isOpen={overrideDialogOpen}
        onClose={() => {
          setOverrideDialogOpen(false);
          setOverrideProposal(null);
        }}
        onConfirm={handleOverrideConfirm}
        users={mondayUsers}
        proposalId={overrideProposal?.id || ""}
        itemId={overrideProposal?.itemId || ""}
        suggestedAssignee={overrideProposal?.suggestedAssignee || undefined}
      />
    </div>
  );
}

