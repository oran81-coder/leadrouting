import React, { useState, useEffect } from "react";
import { useTheme } from "./ThemeContext";
import { useToast } from "./hooks/useToast";
import { 
  getMappingConfig, 
  saveMappingConfig, 
  getMappingBoards,
  listMondayBoardColumns,
  previewMapping,
  listMondayStatusLabels,
  type FieldMappingConfig, 
  type InternalFieldDefinition,
  type BoardColumnRef,
  type ColumnRef,
  type StatusConfig,
  type MondayBoardDTO,
  type MondayColumnDTO,
  type MappingPreviewResult
} from "./api";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";
import { MultiSelectDropdown } from "./components/MultiSelectDropdown";

// Default internal fields (Phase 2 - with computed fields)
const DEFAULT_INTERNAL_FIELDS: InternalFieldDefinition[] = [
  { id: "lead_source", label: "Lead Source", type: "status", required: true, isCore: true, isEnabled: true, group: "Lead", description: "Source/campaign of the lead" },
  { id: "lead_industry", label: "Industry", type: "status", required: false, isCore: true, isEnabled: true, group: "Lead", description: "Industry/vertical of the lead" },
  { id: "lead_deal_size", label: "Deal Size / Amount", type: "number", required: false, isCore: true, isEnabled: true, group: "Lead", description: "Potential deal value" },
  { id: "lead_created_at", label: "Created At (Auto)", type: "date", required: false, isCore: true, isEnabled: true, group: "Lead", description: "Automatically captured from Monday item creation time" },
  { id: "assigned_agent", label: "Assigned Agent", type: "text", required: false, isCore: true, isEnabled: true, group: "Lead", description: "Current agent handling this lead (used for performance tracking and availability calculation)" },
  { id: "next_call_date", label: "Next Call Date (Optional)", type: "date", required: false, isCore: true, isEnabled: true, group: "Lead", description: "Optional: Next scheduled contact date (if column exists)" },
  { id: "first_contact_at", label: "First Contact (Auto-Detected)", type: "computed", required: false, isCore: true, isEnabled: true, group: "Lead", description: "Auto-detected from Updates/Activity Log. Used to calculate Response Time KPI." },
  { id: "agent_domain", label: "Agent Domain (Optional)", type: "computed", required: false, isCore: true, isEnabled: true, group: "Agent", description: "Optional: Map to Monday column OR system learns from Industry Performance metrics" },
  { id: "agent_availability", label: "Availability (Auto-Calculated)", type: "computed", required: false, isCore: true, isEnabled: true, group: "Agent", description: "Calculated automatically from leads in-treatment count and daily quota" },
  { id: "deal_status", label: "Deal Status", type: "status", required: true, isCore: true, isEnabled: true, group: "Deal", description: "Current status of the deal" },
  { id: "deal_won_status_column", label: "Deal Won Status Column", type: "status", required: false, isCore: true, isEnabled: true, group: "Deal", description: "Column containing 'Deal Won' status (can be same as Deal Status or a separate column)" },
  { id: "deal_close_date", label: "Close Date (Optional Column)", type: "date", required: false, isCore: true, isEnabled: true, group: "Deal", description: "Optional: If column exists, use it. Otherwise, use status change timestamp" },
];

export function FieldMappingWizard() {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const isDark = theme === "dark";

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  // Phase 2: Single Board Architecture
  const [primaryBoardId, setPrimaryBoardId] = useState<string>("");
  const [primaryBoardName, setPrimaryBoardName] = useState<string>("");
  const [boards, setBoards] = useState<MondayBoardDTO[]>([]);
  
  const [fields, setFields] = useState<InternalFieldDefinition[]>(DEFAULT_INTERNAL_FIELDS);
  const [mappings, setMappings] = useState<Record<string, ColumnRef | BoardColumnRef>>({});
  const [writebackTargets, setWritebackTargets] = useState<{
    assignedAgent: BoardColumnRef | null;
  }>({ assignedAgent: null });
  
  // Phase 2: Status Configuration
  const [statusConfig, setStatusConfig] = useState<StatusConfig>({
    closedWonStatuses: [],
    closedLostStatuses: [],
    excludedStatuses: []
  });
  
  const [statusLabels, setStatusLabels] = useState<string[]>([]);
  const [dealWonStatusLabels, setDealWonStatusLabels] = useState<string[]>([]);
  const [loadingStatusLabels, setLoadingStatusLabels] = useState(false);
  const [loadingDealWonLabels, setLoadingDealWonLabels] = useState(false);
  
  const [previewResult, setPreviewResult] = useState<MappingPreviewResult | null>(null);

  // Scroll to top when step changes for better UX
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [step]);

  // Load existing configuration and boards
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        
        // Try to fetch boards first - this requires Monday connection in non-mock mode
        try {
          const boardsData = await getMappingBoards();
          setBoards(boardsData || []);
        } catch (boardError: any) {
          console.error("Failed to load boards:", boardError);
          showToast("⚠️ Monday not connected. Connect in Admin → Monday Connection to use real data, or continue with mock mode.", "warning");
          setBoards([]); // Empty boards - will show message to user
        }
        
        // Try to load existing config - may not exist yet
        try {
          const config = await getMappingConfig();
          if (config) {
            setFields(config.fields || DEFAULT_INTERNAL_FIELDS);
            setMappings(config.mappings || {});
            
            // Load primary board from config
            if (config.primaryBoardId) {
              setPrimaryBoardId(config.primaryBoardId);
              setPrimaryBoardName(config.primaryBoardName || "");
            }
            
            // Load status config
            if (config.statusConfig) {
              setStatusConfig(config.statusConfig);
            }
            
            if (config.writebackTargets?.assignedAgent) {
              setWritebackTargets({ assignedAgent: config.writebackTargets.assignedAgent });
            }
          }
        } catch (configError: any) {
          console.error("No existing config:", configError);
          // It's OK if config doesn't exist yet - user is setting it up for first time
        }
      } catch (error: any) {
        console.error("Error in load:", error);
        showToast(`Error initializing: ${error.message}`, "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast]);

  // Load status labels when primaryBoardId and deal_status mapping change
  useEffect(() => {
    async function loadStatusLabels() {
      if (!primaryBoardId || !mappings.deal_status) return;
      
      try {
        setLoadingStatusLabels(true);
        const columnId = (mappings.deal_status as any).columnId;
        const labels = await listMondayStatusLabels(primaryBoardId, columnId);
        setStatusLabels((labels || []).map(l => l.label));
      } catch (error: any) {
        console.error("Failed to load status labels:", error);
        setStatusLabels([]);
      } finally {
        setLoadingStatusLabels(false);
      }
    }
    loadStatusLabels();
  }, [primaryBoardId, mappings.deal_status]);

  // Load Deal Won status labels when deal_won_status_column mapping changes
  useEffect(() => {
    async function loadDealWonLabels() {
      if (!primaryBoardId || !mappings.deal_won_status_column) return;
      
      try {
        setLoadingDealWonLabels(true);
        const columnId = (mappings.deal_won_status_column as any).columnId;
        const labels = await listMondayStatusLabels(primaryBoardId, columnId);
        setDealWonStatusLabels((labels || []).map(l => l.label));
      } catch (error: any) {
        console.error("Failed to load Deal Won labels:", error);
        setDealWonStatusLabels([]);
      } finally {
        setLoadingDealWonLabels(false);
      }
    }
    loadDealWonLabels();
  }, [primaryBoardId, mappings.deal_won_status_column]);

  const selectedBoard = boards.find(b => b.id === primaryBoardId);

  const handleBoardSelect = async (boardId: string) => {
    const board = boards.find(b => b.id === boardId);
    if (board) {
      setPrimaryBoardId(boardId);
      setPrimaryBoardName(board.name);
      // Clear existing mappings when board changes
      setMappings({});
      setWritebackTargets({ assignedAgent: null });
      
      // Load columns for this board
      try {
        const columns = await listMondayBoardColumns(boardId);
        
        // Update the board in the boards array with its columns
        setBoards(prevBoards => 
          prevBoards.map(b => 
            b.id === boardId ? { ...b, columns } : b
          )
        );
      } catch (error) {
        console.error("Failed to load board columns:", error);
        showToast("Failed to load board columns", "error");
      }
    }
  };

  const handleMappingChange = (fieldId: string, columnId: string) => {
    if (!primaryBoardId) return;
    
    const column = selectedBoard?.columns.find(c => c.id === columnId);
    
    setMappings(prev => ({
      ...prev,
      [fieldId]: {
        columnId,
        columnType: column?.type
      }
    }));
  };

  const handleWritebackChange = (columnId: string) => {
    if (!primaryBoardId) return;
    
    const column = selectedBoard?.columns.find(c => c.id === columnId);
    
    setWritebackTargets({
      assignedAgent: {
        boardId: primaryBoardId,
        columnId,
        columnType: column?.type
      }
    });
  };

  const validateMappings = (): string[] => {
    const errors: string[] = [];
    
    if (!primaryBoardId) {
      errors.push("Primary board must be selected");
      return errors;
    }
    
    const enabledFields = (fields || []).filter(f => f?.isEnabled);
    const requiredFields = enabledFields.filter(f => f?.required && f?.type !== "computed");

    for (const field of requiredFields) {
      if (!mappings[field.id]?.columnId) {
        errors.push(`Required field "${field.label}" must be mapped`);
      }
    }

    if (!writebackTargets.assignedAgent) {
      errors.push("Writeback target for 'Assigned Agent' must be configured");
    }
    
    if (step >= 4) {
      if (!statusConfig.closedWonStatuses || statusConfig.closedWonStatuses.length === 0) {
        errors.push("At least one 'Deal Won' status must be selected");
      }
    }

    return errors;
  };

  const handlePreview = async () => {
    try {
      setPreviewing(true);
      console.log("[handlePreview] Starting preview...");
      const result = await previewMapping();
      console.log("[handlePreview] Result received:", result);
      console.log("[handlePreview] result.ok:", result?.ok);
      console.log("[handlePreview] result.rows:", result?.rows);
      console.log("[handlePreview] result.rows type:", typeof result?.rows);
      console.log("[handlePreview] result.rows is array:", Array.isArray(result?.rows));
      
      setPreviewResult(result);
      
      if (result?.ok && !result?.hasErrors) {
        const samplesRead = Array.isArray(result.rows) ? result.rows.length : 0;
        showToast(`Preview successful! ${samplesRead} samples processed`, "success");
      } else if (result?.hasErrors) {
        const errorCount = Array.isArray(result.rows) 
          ? result.rows.filter(r => r.normalizationErrors && r.normalizationErrors.length > 0).length 
          : 0;
        showToast(`Preview completed with ${errorCount} error(s)`, "warning");
      } else if (result?.error) {
        showToast(`Preview failed: ${result.error}`, "error");
      }
    } catch (error: any) {
      console.error("[handlePreview] Error caught:", error);
      showToast(`Preview failed: ${error.message}`, "error");
    } finally {
      setPreviewing(false);
    }
  };

  const handleSave = async () => {
    const errors = validateMappings();
    if (errors.length > 0) {
      showToast(errors[0], "error");
      return;
    }

    try {
      setSaving(true);
      const config: FieldMappingConfig = {
        version: 2,
        updatedAt: new Date().toISOString(),
        primaryBoardId,
        primaryBoardName,
        mappings,
        fields,
        writebackTargets: {
          assignedAgent: writebackTargets.assignedAgent!
        },
        statusConfig
      };

      const result = await saveMappingConfig(config);
      showToast(`Mapping configuration saved successfully (v${result.version})`, "success");
    } catch (error: any) {
      showToast(`Failed to save configuration: ${error.message}`, "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen p-8 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="max-w-6xl mx-auto">
          <Skeleton className="h-12 w-96 mb-8" />
          <Skeleton className="h-64 w-full" />
        </div>
      </div>
    );
  }

  if (boards.length === 0) {
    return (
      <div className={`min-h-screen p-8 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
        <div className="max-w-6xl mx-auto">
          <EmptyState
            icon="📋"
            title="No Monday.com Boards Found"
            message="Please connect to Monday.com first or enable Mock mode"
          />
        </div>
      </div>
    );
  }

  const enabledFields = (fields || []).filter(f => f?.isEnabled);
  const manualFields = enabledFields.filter(f => f?.type !== "computed");
  const computedFields = enabledFields.filter(f => f?.type === "computed");
  const requiredManualFields = manualFields.filter(f => f?.required);
  const optionalManualFields = manualFields.filter(f => !f?.required);

  // Debug logging
  console.log("[FieldMappingWizard] Render state:", {
    fieldsLength: fields?.length,
    boardsLength: boards?.length,
    primaryBoardId,
    selectedBoard: boards?.find(b => b.id === primaryBoardId) !== undefined
  });

  return (
    <div className={`min-h-screen p-8 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            📋 Field Mapping Wizard
          </h1>
          <p className={`text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Map internal fields to Monday.com columns (Single Board Architecture)
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center space-x-2 overflow-x-auto">
          {[
            { num: 1, label: "Select Board" },
            { num: 2, label: "Review Fields" },
            { num: 3, label: "Map Columns" },
            { num: 4, label: "Configure Statuses" },
            { num: 5, label: "Preview & Save" }
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex items-center min-w-fit">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold text-sm ${
                  step >= s.num
                    ? "bg-blue-600 text-white"
                    : isDark
                    ? "bg-gray-700 text-gray-400"
                    : "bg-gray-200 text-gray-600"
                }`}>
                  {s.num}
                </div>
                <span className={`ml-2 font-medium text-sm ${
                  step >= s.num
                    ? isDark ? "text-white" : "text-gray-900"
                    : isDark ? "text-gray-500" : "text-gray-400"
                }`}>
                  {s.label}
                </span>
              </div>
              {idx < 4 && (
                <div className={`w-16 h-1 ${
                  step > s.num
                    ? "bg-blue-600"
                    : isDark ? "bg-gray-700" : "bg-gray-200"
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Select Primary Board */}
        {step === 1 && (
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border ${
            isDark ? "border-gray-700" : "border-gray-200"
          } p-6`}>
            <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Step 1: Select Primary Board
            </h2>
            <p className={`mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Choose the Monday.com board that contains all your leads.
              <br />
              All internal fields will map to columns in this board.
            </p>

            <div className="space-y-4">
              {/* Warning if no boards */}
              {boards.length === 0 && (
                <div className={`p-4 rounded-lg border ${
                  isDark ? "bg-yellow-900/20 border-yellow-800" : "bg-yellow-50 border-yellow-300"
                }`}>
                  <div className="flex items-start">
                    <span className="text-2xl mr-3">⚠️</span>
                    <div className="flex-1">
                      <div className={`font-medium mb-2 ${isDark ? "text-yellow-400" : "text-yellow-700"}`}>
                        Monday.com Not Connected
                      </div>
                      <div className={`text-sm ${isDark ? "text-yellow-300" : "text-yellow-600"}`}>
                        Please connect to Monday.com in <strong>Admin → Monday Connection</strong> to view your boards.
                        <br />
                        <span className="text-xs mt-1 block">
                          The system is configured with MONDAY_USE_MOCK=true for development.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  isDark ? "text-gray-300" : "text-gray-700"
                }`}>
                  Primary Board
                </label>
                <select
                  value={primaryBoardId}
                  onChange={(e) => handleBoardSelect(e.target.value)}
                  className={`w-full px-4 py-3 rounded-lg border ${
                    isDark
                      ? "bg-gray-800 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
                >
                  <option value="">Select Board...</option>
                  {boards.map(board => (
                    <option key={board.id} value={board.id}>{board.name}</option>
                  ))}
                </select>
              </div>

              {primaryBoardId && selectedBoard && (
                <div className={`p-4 rounded-lg border ${
                  isDark ? "bg-gray-700 border-gray-600" : "bg-blue-50 border-blue-200"
                }`}>
                  <div className={`font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                    ✅ Selected Board: {selectedBoard.name}
                  </div>
                  <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                    📊 {selectedBoard.columns?.length || 0} columns available
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setStep(2)}
                disabled={!primaryBoardId}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Review Fields →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Review Internal Fields */}
        {step === 2 && (
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border ${
            isDark ? "border-gray-700" : "border-gray-200"
          } p-6`}>
            <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Step 2: Review Internal Fields
            </h2>
            <p className={`mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              These are the internal fields used by the routing system.
              <br />
              <span className="text-sm">🔵 Manual Mapping Required | 🟢 Auto-Calculated | ⭕ Optional</span>
            </p>

            <div className="space-y-6">
              {/* Manual Fields */}
              {manualFields.length > 0 && (
                <div>
                  <h3 className={`text-lg font-medium mb-3 ${isDark ? "text-blue-400" : "text-blue-600"}`}>
                    🔵 Manual Mapping Required
                  </h3>
                  <div className="space-y-2">
                    {manualFields.map(field => (
                      <div
                        key={field.id}
                        className={`flex items-start p-3 rounded-lg border ${
                          isDark
                            ? "bg-gray-700 border-gray-600"
                            : "bg-gray-50 border-gray-200"
                        }`}
                      >
                        <span className="text-2xl mr-3">
                          {field.required ? "🔵" : "⭕"}
                        </span>
                        <div className="flex-1">
                          <div className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {field.label}
                          </div>
                          <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                            Type: {field.type} {field.required && "• Required"}
                          </div>
                          {field.description && (
                            <div className={`text-sm mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                              {field.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Auto-Calculated Fields */}
              {computedFields.length > 0 && (
                <div>
                  <h3 className={`text-lg font-medium mb-3 ${isDark ? "text-green-400" : "text-green-600"}`}>
                    🟢 Auto-Calculated Fields (No Mapping Needed)
                  </h3>
                  <div className="space-y-2">
                    {computedFields.map(field => (
                      <div
                        key={field.id}
                        className={`flex items-start p-3 rounded-lg border ${
                          isDark
                            ? "bg-green-900/20 border-green-800"
                            : "bg-green-50 border-green-200"
                        }`}
                      >
                        <span className="text-2xl mr-3">🟢</span>
                        <div className="flex-1">
                          <div className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                            {field.label}
                          </div>
                          {field.description && (
                            <div className={`text-sm mt-1 ${isDark ? "text-green-400" : "text-green-700"}`}>
                              ℹ️ {field.description}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(1)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isDark
                    ? "bg-gray-700 text-white hover:bg-gray-600"
                    : "bg-gray-200 text-gray-900 hover:bg-gray-300"
                }`}
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(3)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Next: Map Columns →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Map Columns */}
        {step === 3 && (
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border ${
            isDark ? "border-gray-700" : "border-gray-200"
          } p-6`}>
            <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Step 3: Map to Monday.com Columns
            </h2>
            <p className={`mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Select which column in <strong>{primaryBoardName}</strong> each internal field maps to.
            </p>

            <div className="space-y-6">
              {/* Required Manual Fields */}
              {requiredManualFields.length > 0 && (
                <div>
                  <h3 className={`text-lg font-medium mb-3 flex items-center ${
                    isDark ? "text-red-400" : "text-red-600"
                  }`}>
                    <span className="mr-2">⚠️</span> Required Fields
                  </h3>
                  <div className="space-y-4">
                    {requiredManualFields.map(field => (
                      <ColumnMappingRow
                        key={field.id}
                        field={field}
                        columns={selectedBoard?.columns || []}
                        mapping={mappings[field.id]}
                        onChange={(columnId) => handleMappingChange(field.id, columnId)}
                        isDark={isDark}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Optional Manual Fields */}
              {optionalManualFields.length > 0 && (
                <div>
                  <h3 className={`text-lg font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Optional Fields
                  </h3>
                  <div className="space-y-4">
                    {optionalManualFields.map(field => (
                      <ColumnMappingRow
                        key={field.id}
                        field={field}
                        columns={selectedBoard?.columns || []}
                        mapping={mappings[field.id]}
                        onChange={(columnId) => handleMappingChange(field.id, columnId)}
                        isDark={isDark}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Writeback Target */}
              <div className={`border-t pt-6 ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                <h3 className={`text-lg font-medium mb-3 flex items-center ${
                  isDark ? "text-blue-400" : "text-blue-600"
                }`}>
                  <span className="mr-2">🎯</span> Writeback Configuration (Required)
                </h3>
                <p className={`text-sm mb-4 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Specify where routing results will be written back to Monday.com
                </p>
                <WritebackMappingRow
                  label="Assigned Agent Column"
                  columns={selectedBoard?.columns || []}
                  mapping={writebackTargets.assignedAgent}
                  onChange={handleWritebackChange}
                  isDark={isDark}
                />
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(2)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isDark
                    ? "bg-gray-700 text-white hover:bg-gray-600"
                    : "bg-gray-200 text-gray-900 hover:bg-gray-300"
                }`}
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(4)}
                disabled={validateMappings().length > 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Configure Statuses →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Configure Status Values */}
        {step === 4 && (
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border ${
            isDark ? "border-gray-700" : "border-gray-200"
          } p-6`}>
            <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Step 4: Configure Status Values
            </h2>
            <p className={`mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Configure which status values indicate different lead states.
            </p>

            <div className="space-y-6">
              {/* Excluded Statuses (Optional) */}
              <div className={`p-4 rounded-lg border ${
                isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
              }`}>
                <h3 className={`text-lg font-medium mb-2 flex items-center ${
                  isDark ? "text-gray-400" : "text-gray-700"
                }`}>
                  <span className="mr-2">🗑️</span> Excluded Statuses (Optional)
                </h3>
                <p className={`text-sm mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Select statuses that are <strong>NOT real leads</strong> and should be filtered out.
                </p>
                <div className={`mb-4 p-3 rounded border ${
                  isDark ? "bg-gray-800 border-gray-600" : "bg-gray-100 border-gray-300"
                }`}>
                  <p className={`text-sm ${isDark ? "text-gray-300" : "text-gray-800"}`}>
                    <strong>🚫 Purpose:</strong> Filter out noise/non-leads from ALL calculations
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-700"}`}>
                    These are <strong>not real leads</strong> - just noise (spam, tests, duplicates)
                  </p>
                  <div className={`mt-2 pt-2 border-t ${isDark ? "border-gray-700" : "border-gray-200"}`}>
                    <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-600"}`}>
                      <strong>💡 Tip:</strong> Use "Deal Lost" for real leads that didn't convert. Use "Excluded" for items that were never real leads.
                    </p>
                  </div>
                </div>
                
                {!mappings.deal_won_status_column ? (
                  <div className={`p-4 rounded border ${
                    isDark ? "bg-yellow-900/20 border-yellow-800" : "bg-yellow-50 border-yellow-200"
                  }`}>
                    <p className={`font-medium mb-2 ${isDark ? "text-yellow-400" : "text-yellow-700"}`}>
                      ⚠️ Configuration Required
                    </p>
                    <p className={`text-sm mb-3 ${isDark ? "text-yellow-300" : "text-yellow-600"}`}>
                      Please map <strong>"Deal Won Status Column"</strong> in Step 3 first. 
                      This column contains the statuses for this dropdown.
                    </p>
                    <button
                      onClick={() => setStep(3)}
                      className={`px-4 py-2 rounded font-medium ${
                        isDark 
                          ? "bg-yellow-600 hover:bg-yellow-700 text-white" 
                          : "bg-yellow-600 hover:bg-yellow-700 text-white"
                      }`}
                    >
                      ← Go Back to Step 3
                    </button>
                  </div>
                ) : loadingDealWonLabels ? (
                  <Skeleton className="h-12 w-full" />
                ) : dealWonStatusLabels.length === 0 ? (
                  <div className={`p-3 rounded border ${
                    isDark ? "bg-gray-800 border-gray-700 text-gray-400" : "bg-gray-50 border-gray-300 text-gray-600"
                  }`}>
                    No status options found in the selected column. Please check your Monday.com board configuration.
                  </div>
                ) : (
                  <MultiSelectDropdown
                    options={dealWonStatusLabels}
                    selected={statusConfig.excludedStatuses || []}
                    onChange={(selected) => setStatusConfig(prev => ({ ...prev, excludedStatuses: selected }))}
                    placeholder="Select statuses to exclude (optional)..."
                  />
                )}
                
                <div className={`mt-3 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  💡 Examples: "Spam", "Archived", "Test", "Duplicate", "Wrong Number"
                </div>
              </div>

              {/* In Treatment Auto-Detection Info */}
              <div className={`p-4 rounded-lg border ${
                isDark ? "bg-gray-700 border-gray-600" : "bg-blue-50 border-blue-200"
              }`}>
                <h3 className={`text-lg font-medium mb-2 flex items-center ${
                  isDark ? "text-blue-400" : "text-blue-700"
                }`}>
                  <span className="mr-2">🤖</span> "In Treatment" Detection (Auto)
                </h3>
                <p className={`text-sm mb-3 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  The system automatically detects which leads are "in treatment" using smart logic:
                </p>
                <div className={`p-3 rounded border ${
                  isDark ? "bg-blue-900/20 border-blue-800" : "bg-blue-100 border-blue-300"
                }`}>
                  <div className={`text-sm font-mono ${isDark ? "text-blue-300" : "text-blue-800"}`}>
                    In Treatment = (Assigned to Agent) AND NOT (Won/Lost/Excluded)
                  </div>
                </div>
                <ul className={`mt-3 text-sm space-y-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  <li>✅ Lead must be assigned to an agent</li>
                  <li>❌ Status is NOT "Deal Won"</li>
                  <li>❌ Status is NOT "Deal Lost"</li>
                  <li>🗑️ Status is NOT in Excluded list</li>
                </ul>
                <div className={`mt-3 p-2 rounded ${isDark ? "bg-gray-800" : "bg-white"}`}>
                  <p className={`text-xs ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                    ℹ️ No need to manually select statuses - the system adapts automatically to any workflow!
                  </p>
                </div>
              </div>

              {/* Closed Won Statuses */}
              <div className={`p-4 rounded-lg border ${
                isDark ? "bg-gray-700 border-gray-600" : "bg-green-50 border-green-200"
              }`}>
                <h3 className={`text-lg font-medium mb-2 flex items-center ${
                  isDark ? "text-green-400" : "text-green-700"
                }`}>
                  <span className="mr-2">✅</span> "Deal Won" Statuses (Required)
                </h3>
                <p className={`text-sm mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Select all statuses that indicate a deal was <strong>successfully closed</strong>.
                </p>
                <div className={`mb-4 p-3 rounded border ${
                  isDark ? "bg-green-900/20 border-green-800" : "bg-green-100 border-green-300"
                }`}>
                  <p className={`text-sm ${isDark ? "text-green-300" : "text-green-800"}`}>
                    <strong>🎯 Purpose:</strong> Calculate close date & conversion rate
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? "text-green-400" : "text-green-700"}`}>
                    These are <strong>real leads that were won</strong> by the agent
                  </p>
                </div>
                
                {!mappings.deal_won_status_column ? (
                  <div className={`p-4 rounded border ${
                    isDark ? "bg-yellow-900/20 border-yellow-800" : "bg-yellow-50 border-yellow-200"
                  }`}>
                    <p className={`font-medium mb-2 ${isDark ? "text-yellow-400" : "text-yellow-700"}`}>
                      ⚠️ Configuration Required
                    </p>
                    <p className={`text-sm mb-3 ${isDark ? "text-yellow-300" : "text-yellow-600"}`}>
                      Please map <strong>"Deal Won Status Column"</strong> in Step 3 first. 
                      This column contains the statuses for this dropdown.
                    </p>
                    <button
                      onClick={() => setStep(3)}
                      className={`px-4 py-2 rounded font-medium ${
                        isDark 
                          ? "bg-yellow-600 hover:bg-yellow-700 text-white" 
                          : "bg-yellow-600 hover:bg-yellow-700 text-white"
                      }`}
                    >
                      ← Go Back to Step 3
                    </button>
                  </div>
                ) : loadingDealWonLabels ? (
                  <Skeleton className="h-12 w-full" />
                ) : dealWonStatusLabels.length === 0 ? (
                  <div className={`p-3 rounded border ${
                    isDark ? "bg-gray-800 border-gray-700 text-gray-400" : "bg-gray-50 border-gray-300 text-gray-600"
                  }`}>
                    No status options found in the selected column. Please check your Monday.com board configuration.
                  </div>
                ) : (
                  <MultiSelectDropdown
                    options={dealWonStatusLabels}
                    selected={statusConfig.closedWonStatuses || []}
                    onChange={(selected) => setStatusConfig(prev => ({ ...prev, closedWonStatuses: selected }))}
                    placeholder="Select statuses..."
                  />
                )}
                
                <div className={`mt-3 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  💡 Examples: "Closed Won", "Sale Completed", "Contract Signed", "Done"
                </div>
              </div>

              {/* Closed Lost Statuses (Optional) */}
              <div className={`p-4 rounded-lg border ${
                isDark ? "bg-gray-700 border-gray-600" : "bg-red-50 border-red-200"
              }`}>
                <h3 className={`text-lg font-medium mb-2 flex items-center ${
                  isDark ? "text-red-400" : "text-red-700"
                }`}>
                  <span className="mr-2">❌</span> "Deal Lost" Statuses (Optional)
                </h3>
                <p className={`text-sm mb-2 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  Select all statuses that indicate a deal was <strong>lost or rejected</strong>.
                </p>
                <div className={`mb-4 p-3 rounded border ${
                  isDark ? "bg-red-900/20 border-red-800" : "bg-red-100 border-red-300"
                }`}>
                  <p className={`text-sm ${isDark ? "text-red-300" : "text-red-800"}`}>
                    <strong>📊 Purpose:</strong> Calculate conversion rate (Won / (Won + Lost))
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? "text-red-400" : "text-red-700"}`}>
                    These are <strong>real leads that were worked on</strong> but not converted
                  </p>
                </div>
                
                {!mappings.deal_won_status_column ? (
                  <div className={`p-4 rounded border ${
                    isDark ? "bg-yellow-900/20 border-yellow-800" : "bg-yellow-50 border-yellow-200"
                  }`}>
                    <p className={`font-medium mb-2 ${isDark ? "text-yellow-400" : "text-yellow-700"}`}>
                      ⚠️ Configuration Required
                    </p>
                    <p className={`text-sm mb-3 ${isDark ? "text-yellow-300" : "text-yellow-600"}`}>
                      Please map <strong>"Deal Won Status Column"</strong> in Step 3 first. 
                      This column contains the statuses for this dropdown.
                    </p>
                    <button
                      onClick={() => setStep(3)}
                      className={`px-4 py-2 rounded font-medium ${
                        isDark 
                          ? "bg-yellow-600 hover:bg-yellow-700 text-white" 
                          : "bg-yellow-600 hover:bg-yellow-700 text-white"
                      }`}
                    >
                      ← Go Back to Step 3
                    </button>
                  </div>
                ) : loadingDealWonLabels ? (
                  <Skeleton className="h-12 w-full" />
                ) : dealWonStatusLabels.length === 0 ? (
                  <div className={`p-3 rounded border ${
                    isDark ? "bg-gray-800 border-gray-700 text-gray-400" : "bg-gray-50 border-gray-300 text-gray-600"
                  }`}>
                    No status options found in the selected column. Please check your Monday.com board configuration.
                  </div>
                ) : (
                  <MultiSelectDropdown
                    options={dealWonStatusLabels}
                    selected={statusConfig.closedLostStatuses || []}
                    onChange={(selected) => setStatusConfig(prev => ({ ...prev, closedLostStatuses: selected }))}
                    placeholder="Select statuses (optional)..."
                  />
                )}
                
                <div className={`mt-3 text-sm ${isDark ? "text-gray-500" : "text-gray-500"}`}>
                  💡 Examples: "Closed Lost", "Not Interested", "Rejected", "Not Qualified", "Too Expensive"
                </div>
              </div>

              {/* First Contact - AUTO DETECTED */}
              <div className={`p-4 rounded-lg border ${
                isDark ? "bg-gray-700 border-gray-600" : "bg-purple-50 border-purple-200"
              }`}>
                <h3 className={`text-lg font-medium mb-2 flex items-center ${
                  isDark ? "text-purple-400" : "text-purple-700"
                }`}>
                  <span className="mr-2">🤖</span> First Contact Detection (Auto)
                </h3>
                <p className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  The system automatically detects when an agent first contacts a lead by monitoring:
                </p>
                <ul className={`mt-2 text-sm space-y-1 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                  <li>• 📝 <strong>Updates/Chat Messages</strong> - First message sent by agent</li>
                  <li>• 📊 <strong>Activity Log</strong> - First action performed on the lead</li>
                </ul>
                <div className={`mt-3 p-3 rounded border ${
                  isDark ? "bg-purple-900/20 border-purple-800 text-purple-300" : "bg-purple-100 border-purple-300 text-purple-800"
                }`}>
                  ℹ️ <strong>Response Time</strong> is calculated automatically as the time between lead assignment and first contact.
                </div>
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(3)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isDark
                    ? "bg-gray-700 text-white hover:bg-gray-600"
                    : "bg-gray-200 text-gray-900 hover:bg-gray-300"
                }`}
              >
                ← Back
              </button>
              <button
                onClick={() => setStep(5)}
                disabled={!mappings.deal_won_status_column || !statusConfig.closedWonStatuses || statusConfig.closedWonStatuses.length === 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Preview →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Preview & Save */}
        {step === 5 && (
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border ${
            isDark ? "border-gray-700" : "border-gray-200"
          } p-6`}>
            <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Step 5: Preview & Save Configuration
            </h2>
            <p className={`mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Review your configuration and test with sample data before saving.
            </p>

            {/* Configuration Summary */}
            <div className="space-y-4 mb-6">
              <div className={`p-4 rounded-lg border ${
                isDark ? "bg-gray-700 border-gray-600" : "bg-blue-50 border-blue-200"
              }`}>
                <h3 className={`font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  📋 Primary Board
                </h3>
                <div className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  {primaryBoardName} ({selectedBoard?.columns?.length || 0} columns)
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${
                isDark ? "bg-gray-700 border-gray-600" : "bg-blue-50 border-blue-200"
              }`}>
                <h3 className={`font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  🔗 Mapped Fields
                </h3>
                <div className={`text-sm space-y-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  {Object.entries(mappings).map(([fieldId, mapping]) => {
                    const field = (fields || []).find(f => f.id === fieldId);
                    const column = selectedBoard?.columns?.find(c => c.id === (mapping as any).columnId);
                    return field && column ? (
                      <div key={fieldId}>• {field.label} → {column.title}</div>
                    ) : null;
                  })}
                </div>
              </div>

              <div className={`p-4 rounded-lg border ${
                isDark ? "bg-gray-700 border-gray-600" : "bg-green-50 border-green-200"
              }`}>
                <h3 className={`font-medium mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
                  🎯 Status Configuration
                </h3>
                <div className={`text-sm space-y-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                  <div>• Deal Won: {statusConfig.closedWonStatuses?.join(", ") || "Not configured"}</div>
                  {statusConfig.closedLostStatuses && statusConfig.closedLostStatuses.length > 0 && (
                    <div>• Deal Lost: {statusConfig.closedLostStatuses.join(", ")}</div>
                  )}
                  {statusConfig.excludedStatuses && statusConfig.excludedStatuses.length > 0 && (
                    <div>• Excluded: {statusConfig.excludedStatuses.join(", ")}</div>
                  )}
                  <div className={`mt-2 pt-2 border-t ${isDark ? "border-gray-600" : "border-gray-300"}`}>
                    <span className="font-medium">🤖 In Treatment:</span> Auto-detected (Assigned + Not Won/Lost/Excluded)
                  </div>
                </div>
              </div>
            </div>

            {/* Validation Summary */}
            <div className={`mb-6 p-4 rounded-lg ${
              validateMappings().length === 0
                ? isDark ? "bg-green-900/20 border border-green-800" : "bg-green-50 border border-green-200"
                : isDark ? "bg-red-900/20 border border-red-800" : "bg-red-50 border border-red-200"
            }`}>
              <div className="flex items-start">
                <span className="text-2xl mr-3">
                  {validateMappings().length === 0 ? "✅" : "⚠️"}
                </span>
                <div className="flex-1">
                  <div className={`font-medium mb-2 ${
                    validateMappings().length === 0
                      ? isDark ? "text-green-400" : "text-green-700"
                      : isDark ? "text-red-400" : "text-red-700"
                  }`}>
                    {validateMappings().length === 0
                      ? "Configuration Valid - Ready to Save"
                      : `${validateMappings().length} Issue(s) Found`}
                  </div>
                  {validateMappings().length > 0 && (
                    <ul className={`text-sm space-y-1 ${isDark ? "text-red-300" : "text-red-600"}`}>
                      {validateMappings().map((error, idx) => (
                        <li key={idx}>• {error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </div>

            {/* Preview Button */}
            <div className="mb-6">
              <button
                onClick={handlePreview}
                disabled={previewing || validateMappings().length > 0}
                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {previewing ? "Testing..." : "🔍 Test with Sample Data"}
              </button>
            </div>

            {/* Preview Results */}
            {previewResult && previewResult.rows && (
              <div className={`mb-6 p-4 rounded-lg border ${
                isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
              }`}>
                <h3 className={`font-medium mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                  Preview Results
                </h3>
                <div className="space-y-2 text-sm">
                  <div className={isDark ? "text-gray-300" : "text-gray-700"}>
                    ✓ {Array.isArray(previewResult.rows) ? previewResult.rows.length : 0} samples processed
                  </div>
                  {previewResult.hasErrors && Array.isArray(previewResult.rows) && (
                    <div className={`mt-3 ${isDark ? "text-red-400" : "text-red-600"}`}>
                      <div className="font-medium mb-1">Normalization Errors:</div>
                      <ul className="space-y-1">
                        {previewResult.rows
                          .filter(row => row.normalizationErrors && row.normalizationErrors.length > 0)
                          .map((row, idx) => (
                            <li key={idx}>
                              • {row.entity}: {row.normalizationErrors?.join(", ")}
                            </li>
                          ))}
                      </ul>
                    </div>
                  )}
                  {!previewResult.hasErrors && (
                    <div className={`mt-2 ${isDark ? "text-green-400" : "text-green-600"}`}>
                      ✓ All samples normalized successfully!
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => setStep(4)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  isDark
                    ? "bg-gray-700 text-white hover:bg-gray-600"
                    : "bg-gray-200 text-gray-900 hover:bg-gray-300"
                }`}
              >
                ← Back
              </button>
              <button
                onClick={handleSave}
                disabled={saving || validateMappings().length > 0}
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : "💾 Save Configuration"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Helper component for column mapping rows
interface ColumnMappingRowProps {
  field: InternalFieldDefinition;
  columns: MondayColumnDTO[];
  mapping?: ColumnRef | BoardColumnRef;
  onChange: (columnId: string) => void;
  isDark: boolean;
}

function ColumnMappingRow({ field, columns, mapping, onChange, isDark }: ColumnMappingRowProps) {
  const columnId = (mapping as any)?.columnId || "";

  return (
    <div className={`p-4 rounded-lg border ${
      isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
    }`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div>
          <div className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
            {field.label}
          </div>
          <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Type: {field.type}
          </div>
          {field.description && (
            <div className={`text-xs mt-1 ${isDark ? "text-gray-500" : "text-gray-500"}`}>
              {field.description}
            </div>
          )}
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${
            isDark ? "text-gray-300" : "text-gray-700"
          }`}>
            Column
          </label>
          <select
            value={columnId}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${
              isDark
                ? "bg-gray-800 border-gray-600 text-white"
                : "bg-white border-gray-300 text-gray-900"
            } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
          >
            <option value="">Select Column...</option>
            {columns.map(column => (
              <option key={column.id} value={column.id}>
                {column.title} ({column.type})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

// Helper component for writeback mapping row
interface WritebackMappingRowProps {
  label: string;
  columns: MondayColumnDTO[];
  mapping: BoardColumnRef | null;
  onChange: (columnId: string) => void;
  isDark: boolean;
}

function WritebackMappingRow({ label, columns, mapping, onChange, isDark }: WritebackMappingRowProps) {
  const columnId = mapping?.columnId || "";

  return (
    <div className={`p-4 rounded-lg border ${
      isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
    }`}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
        <div>
          <div className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
            {label}
          </div>
          <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Where routing results will be written
          </div>
        </div>

        <div>
          <label className={`block text-sm font-medium mb-1 ${
            isDark ? "text-gray-300" : "text-gray-700"
          }`}>
            Column
          </label>
          <select
            value={columnId}
            onChange={(e) => onChange(e.target.value)}
            className={`w-full px-3 py-2 rounded-lg border ${
              isDark
                ? "bg-gray-800 border-gray-600 text-white"
                : "bg-white border-gray-300 text-gray-900"
            } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
          >
            <option value="">Select Column...</option>
            {columns.map(column => (
              <option key={column.id} value={column.id}>
                {column.title} ({column.type})
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}

