import React, { useState, useEffect } from "react";
import { useTheme } from "./ThemeContext";
import { useToast } from "./hooks/useToast";
import { 
  getMappingConfig, 
  saveMappingConfig, 
  getMappingBoards,
  previewMapping,
  type FieldMappingConfig, 
  type InternalFieldDefinition,
  type BoardColumnRef,
  type MondayBoardDTO,
  type MappingPreviewResult
} from "./api";
import { Skeleton } from "./Skeleton";
import { EmptyState } from "./EmptyState";

// Default internal fields (Phase 1 - statically defined)
const DEFAULT_INTERNAL_FIELDS: InternalFieldDefinition[] = [
  { id: "lead_source", label: "Lead Source", type: "status", required: true, isCore: true, isEnabled: true, group: "Lead" },
  { id: "lead_industry", label: "Industry", type: "status", required: false, isCore: true, isEnabled: true, group: "Lead" },
  { id: "lead_deal_size", label: "Deal Size / Amount", type: "number", required: false, isCore: true, isEnabled: true, group: "Lead" },
  { id: "lead_created_at", label: "Created At", type: "date", required: true, isCore: true, isEnabled: true, group: "Lead" },
  { id: "agent_domain", label: "Agent Domain", type: "status", required: false, isCore: true, isEnabled: true, group: "Agent" },
  { id: "agent_availability", label: "Availability", type: "status", required: true, isCore: true, isEnabled: true, group: "Agent" },
  { id: "agent_workload", label: "Workload", type: "number", required: false, isCore: true, isEnabled: true, group: "Agent" },
  { id: "deal_status", label: "Deal Status", type: "status", required: true, isCore: true, isEnabled: true, group: "Deal" },
  { id: "deal_close_date", label: "Close Date", type: "date", required: false, isCore: true, isEnabled: true, group: "Deal" },
  { id: "deal_amount", label: "Deal Amount", type: "number", required: false, isCore: true, isEnabled: true, group: "Deal" },
];

export function FieldMappingWizard() {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const isDark = theme === "dark";

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [previewing, setPreviewing] = useState(false);

  const [boards, setBoards] = useState<MondayBoardDTO[]>([]);
  const [fields, setFields] = useState<InternalFieldDefinition[]>(DEFAULT_INTERNAL_FIELDS);
  const [mappings, setMappings] = useState<Record<string, BoardColumnRef>>({});
  const [writebackTargets, setWritebackTargets] = useState<{
    assignedAgent: BoardColumnRef | null;
  }>({ assignedAgent: null });
  
  const [previewResult, setPreviewResult] = useState<MappingPreviewResult | null>(null);

  // Load existing configuration and boards
  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const [config, boardsData] = await Promise.all([
          getMappingConfig(),
          getMappingBoards()
        ]);

        setBoards(boardsData || []);

        if (config) {
          setFields(config.fields || DEFAULT_INTERNAL_FIELDS);
          setMappings(config.mappings || {});
          if (config.writebackTargets?.assignedAgent) {
            setWritebackTargets({ assignedAgent: config.writebackTargets.assignedAgent });
          }
        }
      } catch (error: any) {
        showToast(`Error loading configuration: ${error.message}`, "error");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [showToast]);

  const handleMappingChange = (fieldId: string, boardId: string, columnId: string) => {
    const board = boards.find(b => b.id === boardId);
    const column = board?.columns.find(c => c.id === columnId);
    
    setMappings(prev => ({
      ...prev,
      [fieldId]: {
        boardId,
        columnId,
        columnType: column?.type
      }
    }));
  };

  const handleWritebackChange = (boardId: string, columnId: string) => {
    const board = boards.find(b => b.id === boardId);
    const column = board?.columns.find(c => c.id === columnId);
    
    setWritebackTargets({
      assignedAgent: {
        boardId,
        columnId,
        columnType: column?.type
      }
    });
  };

  const validateMappings = (): string[] => {
    const errors: string[] = [];
    const enabledFields = fields.filter(f => f.isEnabled);
    const requiredFields = enabledFields.filter(f => f.required);

    for (const field of requiredFields) {
      if (!mappings[field.id]?.boardId || !mappings[field.id]?.columnId) {
        errors.push(`Required field "${field.label}" must be mapped`);
      }
    }

    if (!writebackTargets.assignedAgent) {
      errors.push("Writeback target for 'Assigned Agent' must be configured");
    }

    return errors;
  };

  const handlePreview = async () => {
    try {
      setPreviewing(true);
      const result = await previewMapping();
      setPreviewResult(result);
      
      if (result.errors.length === 0) {
        showToast(`Preview successful! ${result.samplesRead} samples read, ${result.normalizedSuccessfully} normalized`, "success");
      } else {
        showToast(`Preview completed with ${result.errors.length} error(s)`, "warning");
      }
    } catch (error: any) {
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
        version: 1,
        updatedAt: new Date().toISOString(),
        mappings,
        fields,
        writebackTargets: {
          assignedAgent: writebackTargets.assignedAgent!
        }
      };

      const result = await saveMappingConfig(config);
      showToast(`Mapping configuration saved successfully (v${result.version})`, "success");
      
      // Go to preview step
      setStep(3);
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

  const enabledFields = fields.filter(f => f.isEnabled);
  const requiredFields = enabledFields.filter(f => f.required);
  const optionalFields = enabledFields.filter(f => !f.required);

  return (
    <div className={`min-h-screen p-8 ${isDark ? "bg-gray-900" : "bg-gray-50"}`}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className={`text-3xl font-bold mb-2 ${isDark ? "text-white" : "text-gray-900"}`}>
            📋 Field Mapping Wizard
          </h1>
          <p className={`text-lg ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Map internal fields to Monday.com columns
          </p>
        </div>

        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-center space-x-4">
          {[
            { num: 1, label: "Select Fields" },
            { num: 2, label: "Map Columns" },
            { num: 3, label: "Preview & Save" }
          ].map((s, idx) => (
            <React.Fragment key={s.num}>
              <div className="flex items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  step >= s.num
                    ? "bg-blue-600 text-white"
                    : isDark
                    ? "bg-gray-700 text-gray-400"
                    : "bg-gray-200 text-gray-600"
                }`}>
                  {s.num}
                </div>
                <span className={`ml-2 font-medium ${
                  step >= s.num
                    ? isDark ? "text-white" : "text-gray-900"
                    : isDark ? "text-gray-500" : "text-gray-400"
                }`}>
                  {s.label}
                </span>
              </div>
              {idx < 2 && (
                <div className={`w-24 h-1 ${
                  step > s.num
                    ? "bg-blue-600"
                    : isDark ? "bg-gray-700" : "bg-gray-200"
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Step 1: Select Fields */}
        {step === 1 && (
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border ${
            isDark ? "border-gray-700" : "border-gray-200"
          } p-6`}>
            <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Step 1: Select Internal Fields
            </h2>
            <p className={`mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              These are the internal fields that will be mapped to Monday.com columns.
              <br />
              <span className="text-sm">✅ = Required field | ⭕ = Optional field</span>
            </p>

            <div className="space-y-6">
              {/* Group by entity */}
              {["Lead", "Agent", "Deal"].map(group => {
                const groupFields = enabledFields.filter(f => f.group === group);
                if (groupFields.length === 0) return null;

                return (
                  <div key={group}>
                    <h3 className={`text-lg font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                      {group} Fields
                    </h3>
                    <div className="space-y-2">
                      {groupFields.map(field => (
                        <div
                          key={field.id}
                          className={`flex items-center p-3 rounded-lg border ${
                            isDark
                              ? "bg-gray-700 border-gray-600"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          <span className="text-2xl mr-3">
                            {field.required ? "✅" : "⭕"}
                          </span>
                          <div className="flex-1">
                            <div className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
                              {field.label}
                            </div>
                            <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
                              Type: {field.type} {field.required && "• Required"}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
              >
                Next: Map Columns →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Map Columns */}
        {step === 2 && (
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border ${
            isDark ? "border-gray-700" : "border-gray-200"
          } p-6`}>
            <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Step 2: Map to Monday.com Columns
            </h2>
            <p className={`mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Select which Monday.com board and column each internal field maps to.
            </p>

            <div className="space-y-6">
              {/* Required Fields First */}
              {requiredFields.length > 0 && (
                <div>
                  <h3 className={`text-lg font-medium mb-3 flex items-center ${
                    isDark ? "text-red-400" : "text-red-600"
                  }`}>
                    <span className="mr-2">⚠️</span> Required Fields
                  </h3>
                  <div className="space-y-4">
                    {requiredFields.map(field => (
                      <FieldMappingRow
                        key={field.id}
                        field={field}
                        boards={boards}
                        mapping={mappings[field.id]}
                        onChange={(boardId, columnId) => handleMappingChange(field.id, boardId, columnId)}
                        isDark={isDark}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Optional Fields */}
              {optionalFields.length > 0 && (
                <div>
                  <h3 className={`text-lg font-medium mb-3 ${isDark ? "text-gray-300" : "text-gray-700"}`}>
                    Optional Fields
                  </h3>
                  <div className="space-y-4">
                    {optionalFields.map(field => (
                      <FieldMappingRow
                        key={field.id}
                        field={field}
                        boards={boards}
                        mapping={mappings[field.id]}
                        onChange={(boardId, columnId) => handleMappingChange(field.id, boardId, columnId)}
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
                <FieldMappingRow
                  field={{
                    id: "writeback_assigned_agent",
                    label: "Assigned Agent Column",
                    type: "people",
                    required: true,
                    isCore: true,
                    isEnabled: true
                  }}
                  boards={boards}
                  mapping={writebackTargets.assignedAgent || undefined}
                  onChange={handleWritebackChange}
                  isDark={isDark}
                />
              </div>
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
                disabled={validateMappings().length > 0}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next: Preview →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Preview & Save */}
        {step === 3 && (
          <div className={`bg-white dark:bg-gray-800 rounded-lg shadow-md border ${
            isDark ? "border-gray-700" : "border-gray-200"
          } p-6`}>
            <h2 className={`text-xl font-semibold mb-4 ${isDark ? "text-white" : "text-gray-900"}`}>
              Step 3: Preview & Save Configuration
            </h2>
            <p className={`mb-6 ${isDark ? "text-gray-400" : "text-gray-600"}`}>
              Review your mappings and test with sample data before saving.
            </p>

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
                      ? "All Required Fields Mapped"
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
            {previewResult && (
              <div className={`mb-6 p-4 rounded-lg border ${
                isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
              }`}>
                <h3 className={`font-medium mb-3 ${isDark ? "text-white" : "text-gray-900"}`}>
                  Preview Results
                </h3>
                <div className="space-y-2 text-sm">
                  <div className={isDark ? "text-gray-300" : "text-gray-700"}>
                    ✓ {previewResult.samplesRead} samples read from Monday.com
                  </div>
                  <div className={isDark ? "text-gray-300" : "text-gray-700"}>
                    ✓ {previewResult.normalizedSuccessfully} records normalized successfully
                  </div>
                  {previewResult.errors.length > 0 && (
                    <div className={`mt-3 ${isDark ? "text-red-400" : "text-red-600"}`}>
                      <div className="font-medium mb-1">Errors:</div>
                      <ul className="space-y-1">
                        {previewResult.errors.map((err, idx) => (
                          <li key={idx}>• {err.field}: {err.error}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

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

// Helper component for mapping rows
interface FieldMappingRowProps {
  field: InternalFieldDefinition;
  boards: MondayBoardDTO[];
  mapping?: BoardColumnRef;
  onChange: (boardId: string, columnId: string) => void;
  isDark: boolean;
}

function FieldMappingRow({ field, boards, mapping, onChange, isDark }: FieldMappingRowProps) {
  const [selectedBoard, setSelectedBoard] = useState(mapping?.boardId || "");
  const [selectedColumn, setSelectedColumn] = useState(mapping?.columnId || "");

  const selectedBoardData = boards.find(b => b.id === selectedBoard);

  useEffect(() => {
    if (selectedBoard && selectedColumn) {
      onChange(selectedBoard, selectedColumn);
    }
  }, [selectedBoard, selectedColumn, onChange]);

  return (
    <div className={`p-4 rounded-lg border ${
      isDark ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
    }`}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        {/* Field Info */}
        <div>
          <div className={`font-medium ${isDark ? "text-white" : "text-gray-900"}`}>
            {field.label}
          </div>
          <div className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}>
            Type: {field.type}
          </div>
        </div>

        {/* Board Selector */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            isDark ? "text-gray-300" : "text-gray-700"
          }`}>
            Board
          </label>
          <select
            value={selectedBoard}
            onChange={(e) => {
              setSelectedBoard(e.target.value);
              setSelectedColumn(""); // Reset column when board changes
            }}
            className={`w-full px-3 py-2 rounded-lg border ${
              isDark
                ? "bg-gray-800 border-gray-600 text-white"
                : "bg-white border-gray-300 text-gray-900"
            } focus:ring-2 focus:ring-blue-500 focus:border-blue-500`}
          >
            <option value="">Select Board...</option>
            {boards.map(board => (
              <option key={board.id} value={board.id}>
                {board.name}
              </option>
            ))}
          </select>
        </div>

        {/* Column Selector */}
        <div>
          <label className={`block text-sm font-medium mb-1 ${
            isDark ? "text-gray-300" : "text-gray-700"
          }`}>
            Column
          </label>
          <select
            value={selectedColumn}
            onChange={(e) => setSelectedColumn(e.target.value)}
            disabled={!selectedBoard}
            className={`w-full px-3 py-2 rounded-lg border ${
              isDark
                ? "bg-gray-800 border-gray-600 text-white"
                : "bg-white border-gray-300 text-gray-900"
            } focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            <option value="">Select Column...</option>
            {selectedBoardData?.columns.map(column => (
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

