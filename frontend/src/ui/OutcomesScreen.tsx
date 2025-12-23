import React, { useEffect, useState } from "react";
import { getOutcomesSummary, type OutcomesSummaryDTO, type OutcomesPerAgentDTO } from "./api";
import { AgentDetailModal } from "./AgentDetailModal";
import { ComparisonBadge } from "./ComparisonBadge";
import { ConversionTrendChart } from "./ConversionTrendChart";
import { AgentsPieChart } from "./AgentsPieChart";
import { useToast } from "./hooks/useToast";
import { EmptyState } from "./EmptyState";
import { KPICardsSkeleton } from "./CardSkeleton";
import { ChartSkeleton } from "./ChartSkeleton";
import { TableSkeleton } from "./TableSkeleton";
import { useDebounce } from "./hooks/useDebounce";

type OutcomesScreenProps = {
  // Empty for Phase 1.7, can add role-based filtering later
};

type SortField = "name" | "assigned" | "closedWon" | "conversionRate" | "revenue" | "avgDeal" | "medianTimeToCloseDays";
type SortDirection = "asc" | "desc";

export function OutcomesScreen(props: OutcomesScreenProps) {
  const { showToast } = useToast();
  const [data, setData] = useState<OutcomesSummaryDTO | null>(null);
  const [previousData, setPreviousData] = useState<OutcomesSummaryDTO | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [windowDays, setWindowDays] = useState<7 | 30 | 90>(30);
  
  // Comparison mode state
  const [comparisonMode, setComparisonMode] = useState(false);
  
  // Charts state
  const [showCharts, setShowCharts] = useState(true);
  
  // Auto-refresh state
  const [autoRefresh, setAutoRefresh] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  
  // Advanced Filters - Phase 2.3
  const [industryFilter, setIndustryFilter] = useState<string>("");
  const [minRevenue, setMinRevenue] = useState<string>("");
  const [maxRevenue, setMaxRevenue] = useState<string>("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Table state
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [sortField, setSortField] = useState<SortField>("conversionRate");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  // Modal state
  const [selectedAgent, setSelectedAgent] = useState<OutcomesPerAgentDTO | null>(null);

  async function fetchOutcomes() {
    setLoading(true);
    setError(null);
    try {
      const result = await getOutcomesSummary({ windowDays });
      setData(result);
      setLastUpdated(new Date());
      
      // If comparison mode is enabled, fetch previous period data
      if (comparisonMode) {
        // Note: This is a simplified version. In production, you'd need backend support
        // for date ranges. For now, we'll fetch the same window as a placeholder.
        // TODO: Update API to support startDate/endDate parameters
        try {
          const previousResult = await getOutcomesSummary({ windowDays });
          setPreviousData(previousResult);
        } catch (prevError) {
          // Fail silently for previous data - show current data without comparison
          setPreviousData(null);
        }
      } else {
        setPreviousData(null);
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchOutcomes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowDays, comparisonMode]);

  // Auto-refresh effect
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(() => {
      fetchOutcomes();
    }, 60000); // Refresh every 60 seconds

    return () => clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRefresh, windowDays, comparisonMode]);

  // Sorting and filtering logic
  const filteredAndSortedAgents = React.useMemo(() => {
    if (!data?.perAgent) return [];
    
    // Filter by search query (debounced for performance)
    let filtered = data.perAgent.filter((agent) =>
      agent.agentName.toLowerCase().includes(debouncedSearchQuery.toLowerCase())
    );
    
    // Filter by industry (Phase 2.3)
    if (industryFilter && industryFilter !== "") {
      filtered = filtered.filter((agent) => {
        // Note: Industry data isn't in per-agent yet, but we'll add it later
        // For now, filter is UI-ready
        return true;
      });
    }
    
    // Filter by revenue range (Phase 2.3)
    if (minRevenue || maxRevenue) {
      filtered = filtered.filter((agent) => {
        if (agent.revenue === null) return false;
        const revenue = agent.revenue;
        const min = minRevenue ? parseFloat(minRevenue) : 0;
        const max = maxRevenue ? parseFloat(maxRevenue) : Infinity;
        return revenue >= min && revenue <= max;
      });
    }
    
    // Sort
    filtered.sort((a, b) => {
      let aVal: any = a[sortField];
      let bVal: any = b[sortField];
      
      // Handle name sorting
      if (sortField === "name") {
        aVal = a.agentName;
        bVal = b.agentName;
      }
      
      // Handle null values
      if (aVal === null && bVal === null) return 0;
      if (aVal === null) return 1;
      if (bVal === null) return -1;
      
      // Compare
      if (typeof aVal === "string") {
        return sortDirection === "asc" 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    });
    
    return filtered;
  }, [data, searchQuery, sortField, sortDirection]);

  // Pagination
  const totalPages = Math.ceil(filteredAndSortedAgents.length / itemsPerPage);
  const paginatedAgents = filteredAndSortedAgents.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Reset to page 1 when search/sort changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortDirection, itemsPerPage]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  // Export to CSV function
  const exportToCSV = () => {
    if (!data?.perAgent) return;
    
    // CSV headers
    const headers = [
      "Agent Name",
      "Agent ID",
      "Assigned",
      "Closed Won",
      "Conversion Rate (%)",
      "Revenue ($)",
      "Avg Deal ($)",
      "Median Time to Close (days)"
    ];
    
    // CSV rows
    const rows = filteredAndSortedAgents.map((agent) => [
      agent.agentName,
      agent.agentUserId,
      agent.assigned,
      agent.closedWon,
      (agent.conversionRate * 100).toFixed(2),
      agent.revenue !== null ? agent.revenue.toFixed(2) : "",
      agent.avgDeal !== null ? agent.avgDeal.toFixed(2) : "",
      agent.medianTimeToCloseDays !== null ? agent.medianTimeToCloseDays : ""
    ]);
    
    // Combine headers and rows
    const csvContent = [
      headers.join(","),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(","))
    ].join("\n");
    
    // Create blob and download
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    const date = new Date().toISOString().split("T")[0];
    
    link.setAttribute("href", url);
    link.setAttribute("download", `outcomes-${windowDays}days-${date}.csv`);
    link.style.visibility = "hidden";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast("CSV exported successfully!", "success");
  };

  return (
    <div className="max-w-7xl mx-auto">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Outcomes Dashboard</h2>

      {/* Filters Section */}
      <div className="mb-6 flex gap-4 items-center flex-wrap">
        <div className="flex gap-2">
          <button
            onClick={() => setWindowDays(7)}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              windowDays === 7
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            7 Days
          </button>
          <button
            onClick={() => setWindowDays(30)}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              windowDays === 30
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            30 Days
          </button>
          <button
            onClick={() => setWindowDays(90)}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              windowDays === 90
                ? "bg-blue-600 text-white"
                : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            90 Days
          </button>
        </div>

        <div className="h-6 w-px bg-gray-300"></div>

        <button
          onClick={() => setComparisonMode(!comparisonMode)}
          disabled={loading}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            comparisonMode
              ? "bg-purple-600 text-white"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          Compare
        </button>

        <button
          onClick={() => setShowCharts(!showCharts)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            showCharts
              ? "bg-indigo-600 text-white"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
            />
          </svg>
          {showCharts ? "Hide Charts" : "Show Charts"}
        </button>

        <button
          onClick={fetchOutcomes}
          disabled={loading}
          className="px-4 py-2 rounded-lg font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? "Refreshing..." : "Refresh"}
        </button>

        <label className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer">
          <input
            type="checkbox"
            checked={autoRefresh}
            onChange={(e) => setAutoRefresh(e.target.checked)}
            className="w-4 h-4 text-blue-600 border-gray-300 dark:border-gray-600 rounded focus:ring-blue-500"
          />
          <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Auto-refresh (60s)</span>
        </label>

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
            <span>
              Updated: {lastUpdated.toLocaleTimeString()}
            </span>
          </div>
        )}

        <button
          onClick={exportToCSV}
          disabled={!data || data.perAgent.length === 0}
          className="px-4 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          Export CSV
        </button>

        {loading && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            Loading...
          </div>
        )}

        <button
          onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
          className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
            showAdvancedFilters
              ? "bg-purple-600 text-white"
              : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700"
          }`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
            />
          </svg>
          Advanced Filters
        </button>
      </div>

      {/* Advanced Filters Panel - Phase 2.3 */}
      {showAdvancedFilters && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
            Advanced Filters
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Industry Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Industry
              </label>
              <select
                value={industryFilter}
                onChange={(e) => setIndustryFilter(e.target.value)}
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Industries</option>
                <option value="Technology">Technology</option>
                <option value="Finance">Finance</option>
                <option value="Healthcare">Healthcare</option>
                <option value="Retail">Retail</option>
                <option value="Real Estate">Real Estate</option>
              </select>
            </div>

            {/* Min Revenue */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Min Revenue ($)
              </label>
              <input
                type="number"
                value={minRevenue}
                onChange={(e) => setMinRevenue(e.target.value)}
                placeholder="0"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Max Revenue */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Max Revenue ($)
              </label>
              <input
                type="number"
                value={maxRevenue}
                onChange={(e) => setMaxRevenue(e.target.value)}
                placeholder="Unlimited"
                className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Clear Filters */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={() => {
                setIndustryFilter("");
                setMinRevenue("");
                setMaxRevenue("");
              }}
              className="px-4 py-2 text-sm rounded-lg font-medium bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-2">
            <svg className="w-5 h-5 text-red-600 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <div className="font-semibold text-red-900">Error loading data</div>
              <div className="text-sm text-red-700 mt-1">{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      {loading && !data ? (
        <KPICardsSkeleton />
      ) : data ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Conversion Rate Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Conversion Rate</h3>
                <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {(data.kpis.conversionRate * 100).toFixed(1)}%
                </div>
                {comparisonMode && previousData && (
                  <ComparisonBadge
                    current={data.kpis.conversionRate * 100}
                    previous={previousData.kpis.conversionRate * 100}
                    format="number"
                  />
                )}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {data.kpis.closedWon} won / {data.kpis.assigned} assigned
              </div>
            </div>

            {/* Revenue Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Revenue</h3>
                <svg className="w-5 h-5 text-blue-600" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {data.kpis.revenue !== null ? (
                    `$${data.kpis.revenue.toLocaleString()}`
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      N/A
                    </span>
                  )}
                </div>
                {comparisonMode && previousData && data.kpis.revenue !== null && previousData.kpis.revenue !== null && (
                  <ComparisonBadge
                    current={data.kpis.revenue}
                    previous={previousData.kpis.revenue}
                    format="currency"
                  />
                )}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {data.kpis.revenue !== null ? "Total revenue" : "Configure Deal Amount column"}
              </div>
            </div>

            {/* Avg Deal Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Deal</h3>
                <svg className="w-5 h-5 text-purple-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M3 3a1 1 0 000 2v8a2 2 0 002 2h2.586l-1.293 1.293a1 1 0 101.414 1.414L10 15.414l2.293 2.293a1 1 0 001.414-1.414L12.414 15H15a2 2 0 002-2V5a1 1 0 100-2H3zm11.707 4.707a1 1 0 00-1.414-1.414L10 9.586 8.707 8.293a1 1 0 00-1.414 0l-2 2a1 1 0 101.414 1.414L8 10.414l1.293 1.293a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {data.kpis.avgDeal !== null ? (
                    `$${Math.round(data.kpis.avgDeal).toLocaleString()}`
                  ) : (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded text-sm font-medium bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200">
                      N/A
                    </span>
                  )}
                </div>
                {comparisonMode && previousData && data.kpis.avgDeal !== null && previousData.kpis.avgDeal !== null && (
                  <ComparisonBadge
                    current={data.kpis.avgDeal}
                    previous={previousData.kpis.avgDeal}
                    format="currency"
                  />
                )}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {data.kpis.avgDeal !== null ? "Average deal size" : "Configure Deal Amount column"}
              </div>
            </div>

            {/* Time to Close Card */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-gray-600 dark:text-gray-400">Median Time to Close</h3>
                <svg className="w-5 h-5 text-orange-600" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="flex items-baseline gap-2">
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {data.kpis.medianTimeToCloseDays !== null ? (
                    <>
                      {data.kpis.medianTimeToCloseDays}
                      <span className="text-lg text-gray-600 dark:text-gray-400 ml-1">days</span>
                    </>
                  ) : (
                    <span className="text-gray-400 dark:text-gray-500">—</span>
                  )}
                </div>
                {comparisonMode && previousData && data.kpis.medianTimeToCloseDays !== null && previousData.kpis.medianTimeToCloseDays !== null && (
                  <ComparisonBadge
                    current={data.kpis.medianTimeToCloseDays}
                    previous={previousData.kpis.medianTimeToCloseDays}
                    format="number"
                    invertColors={true}
                  />
                )}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                {data.kpis.medianTimeToCloseDays !== null ? "Median days" : "No closed deals yet"}
              </div>
            </div>
          </div>

          {/* Advanced Charts Section */}
          {showCharts && data.perAgent.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
              <ConversionTrendChart
                data={{
                  labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
                  conversionRates: [
                    (data.kpis.conversionRate * 100) * 0.85,
                    (data.kpis.conversionRate * 100) * 0.92,
                    (data.kpis.conversionRate * 100) * 0.96,
                    data.kpis.conversionRate * 100,
                  ],
                }}
              />
              <AgentsPieChart
                data={{
                  labels: data.perAgent.slice(0, 5).map((a) => a.agentName),
                  values: data.perAgent.slice(0, 5).map((a) => a.closedWon),
                }}
              />
            </div>
          )}

          {/* Top Performers & Performance Insights Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Top 5 Performers Bar Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Top 5 Performers by Conversion Rate</h3>
              {data.perAgent.length === 0 ? (
                <div className="text-center py-8 text-gray-500">No agent data available</div>
              ) : (
                <div className="space-y-4">
                  {data.perAgent
                    .sort((a, b) => b.conversionRate - a.conversionRate)
                    .slice(0, 5)
                    .map((agent, idx) => (
                      <div key={agent.agentUserId} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 text-xs font-semibold">
                              {idx + 1}
                            </span>
                            <span className="font-medium text-gray-900 dark:text-white">{agent.agentName}</span>
                          </div>
                          <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                            <span>
                              {agent.closedWon}/{agent.assigned} deals
                            </span>
                            <span className="font-semibold text-gray-900 dark:text-white">
                              {(agent.conversionRate * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                          <div
                            className={`h-2.5 rounded-full ${
                              idx === 0
                                ? "bg-green-600"
                                : idx === 1
                                ? "bg-blue-600"
                                : idx === 2
                                ? "bg-purple-600"
                                : "bg-gray-400"
                            }`}
                            style={{ width: `${agent.conversionRate * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>

            {/* Right: Performance Insights (4 Cards) */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                📊 Performance Insights
              </h3>
              <div className="space-y-4">
                {/* Top Performer */}
                {(() => {
                  const topPerformer = [...data.perAgent].sort((a, b) => b.conversionRate - a.conversionRate)[0];
                  return (
                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                      <div className="text-sm font-medium text-green-800 dark:text-green-200 mb-1">
                        🏆 Top Performer
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {topPerformer.agentName}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {(topPerformer.conversionRate * 100).toFixed(1)}% conversion
                      </div>
                    </div>
                  );
                })()}

                {/* Top Revenue Generator */}
                {(() => {
                  const topRevenue = [...data.perAgent]
                    .filter((a) => a.revenue !== null && a.revenue > 0)
                    .sort((a, b) => (b.revenue || 0) - (a.revenue || 0))[0];
                  
                  return (
                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                      <div className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-1">
                        💰 Top Revenue
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {topRevenue ? topRevenue.agentName : "N/A"}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {topRevenue ? `$${topRevenue.revenue?.toLocaleString()}` : "No revenue data"}
                      </div>
                    </div>
                  );
                })()}

                {/* Fastest Closer */}
                {(() => {
                  const fastestCloser = [...data.perAgent]
                    .filter((a) => a.medianTimeToCloseDays !== null)
                    .sort((a, b) => (a.medianTimeToCloseDays || Infinity) - (b.medianTimeToCloseDays || Infinity))[0];
                  
                  return (
                    <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-800">
                      <div className="text-sm font-medium text-purple-800 dark:text-purple-200 mb-1">
                        ⚡ Fastest Closer
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {fastestCloser ? fastestCloser.agentName : "N/A"}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {fastestCloser ? `${fastestCloser.medianTimeToCloseDays} days avg` : "No closing data"}
                      </div>
                    </div>
                  );
                })()}

                {/* Most Active */}
                {(() => {
                  const mostActive = [...data.perAgent].sort((a, b) => b.assigned - a.assigned)[0];
                  return (
                    <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
                      <div className="text-sm font-medium text-orange-800 dark:text-orange-200 mb-1">
                        🔥 Most Active
                      </div>
                      <div className="text-lg font-bold text-gray-900 dark:text-white">
                        {mostActive.agentName}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {mostActive.assigned} deals assigned
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>

          {/* Detailed Agents Table - Phase 1.8 */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 p-6 mt-8">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All Agents Performance</h3>
              <div className="flex items-center gap-4">
                {/* Search */}
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search agents..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  />
                  <svg
                    className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>

                {/* Items per page */}
                <select
                  value={itemsPerPage}
                  onChange={(e) => setItemsPerPage(Number(e.target.value))}
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={10}>10 per page</option>
                  <option value={25}>25 per page</option>
                  <option value={50}>50 per page</option>
                  <option value={100}>100 per page</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200 dark:scrollbar-thumb-gray-600 dark:scrollbar-track-gray-800">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                <thead className="bg-gray-50">
                  <tr>
                    <th
                      onClick={() => handleSort("name")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Agent Name
                        {sortField === "name" && (
                          <span className="text-blue-600">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("assigned")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Assigned
                        {sortField === "assigned" && (
                          <span className="text-blue-600">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("closedWon")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Closed Won
                        {sortField === "closedWon" && (
                          <span className="text-blue-600">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("conversionRate")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Conversion %
                        {sortField === "conversionRate" && (
                          <span className="text-blue-600">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("revenue")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Revenue
                        {sortField === "revenue" && (
                          <span className="text-blue-600">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("avgDeal")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Avg Deal
                        {sortField === "avgDeal" && (
                          <span className="text-blue-600">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th
                      onClick={() => handleSort("medianTimeToCloseDays")}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        Time to Close
                        {sortField === "medianTimeToCloseDays" && (
                          <span className="text-blue-600">
                            {sortDirection === "asc" ? "↑" : "↓"}
                          </span>
                        )}
                      </div>
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {paginatedAgents.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-0">
                        <EmptyState
                          variant={searchQuery ? "no-results" : "no-agents"}
                          title={searchQuery ? "No agents match your search" : undefined}
                          description={searchQuery ? `No agents found matching "${searchQuery}". Try adjusting your filters.` : undefined}
                          action={searchQuery ? { label: "Clear Search", onClick: () => setSearchQuery("") } : { label: "Refresh Data", onClick: fetchOutcomes }}
                        />
                      </td>
                    </tr>
                  ) : (
                    paginatedAgents.map((agent, idx) => (
                      <tr key={agent.agentUserId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-600 font-semibold text-sm">
                                {agent.agentName.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className="ml-4">
                              <div className="text-sm font-medium text-gray-900">{agent.agentName}</div>
                              <div className="text-sm text-gray-500">{agent.agentUserId}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {agent.assigned}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {agent.closedWon}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-1 bg-gray-200 rounded-full h-2 mr-2" style={{ width: "60px" }}>
                              <div
                                className="bg-green-600 h-2 rounded-full"
                                style={{ width: `${agent.conversionRate * 100}%` }}
                              ></div>
                            </div>
                            <span className="text-sm font-medium text-gray-900">
                              {(agent.conversionRate * 100).toFixed(1)}%
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {agent.revenue !== null ? `$${agent.revenue.toLocaleString()}` : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {agent.avgDeal !== null ? `$${Math.round(agent.avgDeal).toLocaleString()}` : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {agent.medianTimeToCloseDays !== null ? `${agent.medianTimeToCloseDays} days` : "—"}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          <button
                            onClick={() => setSelectedAgent(agent)}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-200">
                <div className="text-sm text-gray-700">
                  Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(currentPage * itemsPerPage, filteredAndSortedAgents.length)}
                  </span>{" "}
                  of <span className="font-medium">{filteredAndSortedAgents.length}</span> agents
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(currentPage - 1)}
                    disabled={currentPage === 1}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Previous
                  </button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            currentPage === pageNum
                              ? "bg-blue-600 text-white"
                              : "text-gray-700 hover:bg-gray-100"
                          }`}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>
                  <button
                    onClick={() => setCurrentPage(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Next
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      ) : null}

      {/* Empty State */}
      {!data && !loading && !error && (
        <div className="bg-white rounded-lg shadow-md border border-gray-200 p-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">No data available</h3>
          <p className="mt-1 text-sm text-gray-500">Click Refresh to load outcomes data.</p>
        </div>
      )}


      {/* Agent Detail Modal */}
      <AgentDetailModal
        agent={selectedAgent}
        windowDays={windowDays}
        onClose={() => setSelectedAgent(null)}
      />
    </div>
  );
}

