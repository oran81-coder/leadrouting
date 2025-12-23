import { useState, useEffect, useMemo } from "react";
import { MondayUser } from "./api";

interface OverrideDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (userId: string) => void;
  users: MondayUser[];
  proposalId: string;
  itemId: string;
  suggestedAssignee?: string; // The suggested assignee from the proposal
}

export function OverrideDialog({
  isOpen,
  onClose,
  onConfirm,
  users,
  proposalId,
  itemId,
  suggestedAssignee,
}: OverrideDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [showPreview, setShowPreview] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (isOpen) {
      setSearchQuery("");
      setSelectedUserId("");
      setShowPreview(false);
    }
  }, [isOpen]);

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery.trim()) return users;
    const q = searchQuery.toLowerCase();
    return users.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.id.includes(q)
    );
  }, [users, searchQuery]);

  // Find suggested user details
  const suggestedUser = useMemo(() => {
    if (!suggestedAssignee) return null;
    return users.find((u) => u.id === suggestedAssignee || u.name === suggestedAssignee);
  }, [users, suggestedAssignee]);

  // Find selected user details
  const selectedUser = useMemo(() => {
    if (!selectedUserId) return null;
    return users.find((u) => u.id === selectedUserId);
  }, [users, selectedUserId]);

  const handleNext = () => {
    if (!selectedUserId) return;
    setShowPreview(true);
  };

  const handleConfirm = () => {
    if (!selectedUserId) return;
    onConfirm(selectedUserId);
    onClose();
  };

  const handleBack = () => {
    setShowPreview(false);
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {showPreview ? "Confirm Override" : "Override Assignment"}
          </h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {showPreview
              ? "Review your changes before applying"
              : `Select a new assignee for ${itemId}`}
          </p>
        </div>

        {/* Content */}
        {!showPreview ? (
          <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
            {/* Current Suggestion */}
            {suggestedUser && (
              <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">
                  📊 Current Suggestion
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex items-center justify-center font-bold">
                    {suggestedUser.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">
                      {suggestedUser.name}
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      {suggestedUser.email}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Search Box */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                🔍 Search Agents
              </label>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, or ID..."
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                autoFocus
              />
            </div>

            {/* User List */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                👥 Select New Assignee ({filteredUsers.length} agents)
              </label>
              <div className="border border-gray-300 dark:border-gray-600 rounded-lg max-h-80 overflow-y-auto">
                {filteredUsers.length === 0 ? (
                  <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No agents found matching "{searchQuery}"
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`w-full px-4 py-3 flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-200 dark:border-gray-700 last:border-b-0 transition-colors ${
                        selectedUserId === user.id
                          ? "bg-blue-50 dark:bg-blue-900/30 border-l-4 border-l-blue-500"
                          : ""
                      }`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${
                          selectedUserId === user.id
                            ? "bg-blue-500"
                            : "bg-gray-400 dark:bg-gray-600"
                        }`}
                      >
                        {user.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 text-left">
                        <div className="font-medium text-gray-900 dark:text-white flex items-center gap-2">
                          {user.name}
                          {user.id === suggestedUser?.id && (
                            <span className="text-xs px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded">
                              Suggested
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {user.email}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-0.5">
                          ID: {user.id}
                        </div>
                      </div>
                      {selectedUserId === user.id && (
                        <div className="text-blue-500">
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
                              d="M5 13l4 4L19 7"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="px-6 py-4 overflow-y-auto max-h-[60vh]">
            {/* Preview Content */}
            <div className="space-y-4">
              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <div className="flex items-start gap-2 mb-2">
                  <svg
                    className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div className="text-sm font-semibold text-yellow-900 dark:text-yellow-300">
                    Warning: This will override the system recommendation
                  </div>
                </div>
                <div className="text-sm text-yellow-800 dark:text-yellow-400 ml-7">
                  The assignment will be immediately applied to Monday.com
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* From */}
                {suggestedUser && (
                  <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                    <div className="text-sm font-semibold text-red-900 dark:text-red-300 mb-3">
                      ❌ Original Suggestion
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-red-500 text-white flex items-center justify-center font-bold text-lg">
                        {suggestedUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {suggestedUser.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {suggestedUser.email}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* To */}
                {selectedUser && (
                  <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                    <div className="text-sm font-semibold text-green-900 dark:text-green-300 mb-3">
                      ✅ New Assignment
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-green-500 text-white flex items-center justify-center font-bold text-lg">
                        {selectedUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-gray-900 dark:text-white">
                          {selectedUser.name}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {selectedUser.email}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                  📋 Details
                </div>
                <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                  <div>
                    <span className="font-medium">Proposal ID:</span> {proposalId}
                  </div>
                  <div>
                    <span className="font-medium">Item ID:</span> {itemId}
                  </div>
                  <div>
                    <span className="font-medium">New Assignee ID:</span> {selectedUserId}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
          {!showPreview ? (
            <>
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                disabled={!selectedUserId}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Next: Preview
              </button>
            </>
          ) : (
            <>
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
              >
                Back
              </button>
              <button
                onClick={handleConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
              >
                Confirm Override
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

