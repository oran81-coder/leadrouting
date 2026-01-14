import React, { useState } from "react";
import { type MondayStatusDTO } from "./api";

interface ConnectionStatusStripProps {
    mondayStatus: MondayStatusDTO | null;
    apiBase: string;
    setApiBase: (val: string) => void;
    apiKey: string;
    setApiKey: (val: string) => void;
    onSave: () => void;
    globalMsg: string | null;
}

export function ConnectionStatusStrip({
    mondayStatus,
    apiBase,
    setApiBase,
    apiKey,
    setApiKey,
    onSave,
    globalMsg,
}: ConnectionStatusStripProps) {
    const [isOpen, setIsOpen] = useState(false);

    // Status indicators
    const isConnected = mondayStatus?.connected === true;
    const statusColor = isConnected ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400";
    const statusIcon = isConnected ? "✓" : "✗";

    return (
        <div className="relative z-50 flex flex-col items-center w-full">
            {/* Trigger Button (Always Visible) */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-b-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-xs font-medium text-gray-600 dark:text-gray-300"
                title="Connection Settings"
            >
                <span>Monday:</span>
                <span className={statusColor}>
                    {statusIcon} {isConnected ? "Connected" : "Disconnected"}
                </span>
                <span className="ml-2 opacity-50">|</span>
                <span className="text-gray-500">⚙️ Settings</span>
                <span className={`transform transition-transform ${isOpen ? "rotate-180" : ""}`}>▼</span>
            </button>

            {/* Dropdown Panel */}
            {isOpen && (
                <div className="absolute top-full mt-1 w-full max-w-4xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl p-4 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="flex flex-col gap-4">

                        {/* Header / Info */}
                        <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3">
                            <h4 className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                                System Connection Settings
                            </h4>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none"
                            >
                                &times;
                            </button>
                        </div>

                        {/* Content Grid */}
                        <div className="flex flex-wrap items-end gap-4 mt-2">

                            {/* Monday Status Box */}
                            <div className="flex-1 min-w-[200px] p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border border-gray-100 dark:border-gray-700">
                                <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Monday.com Status</div>
                                <div className="flex items-center gap-2">
                                    <span className={`flex h-2 w-2 rounded-full ${isConnected ? "bg-green-500" : "bg-red-500"}`}></span>
                                    <span className={`text-sm font-medium ${statusColor}`}>
                                        {isConnected ? "Active & Connected" : "Not Connected"}
                                    </span>
                                </div>
                                {mondayStatus?.endpoint && (
                                    <div className="text-[10px] text-gray-400 mt-1 font-mono truncate max-w-[200px]" title={mondayStatus.endpoint}>
                                        {mondayStatus.endpoint}
                                    </div>
                                )}
                            </div>

                            {/* API Settings */}
                            <div className="flex-[2] flex gap-3 flex-wrap">
                                <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">API Base URL</label>
                                    <input
                                        value={apiBase}
                                        onChange={(e) => setApiBase(e.target.value)}
                                        className="px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                                        placeholder="http://localhost:3000"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
                                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">API Key</label>
                                    <div className="relative">
                                        <input
                                            value={apiKey}
                                            onChange={(e) => setApiKey(e.target.value)}
                                            className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono"
                                            placeholder="dev_key_123"
                                            type="password"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Action Button */}
                            <div className="flex flex-col justify-end">
                                <button
                                    onClick={() => {
                                        onSave();
                                        // Optional: auto-close after save if success
                                        // setIsOpen(false); 
                                    }}
                                    className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md shadow-sm transition-colors flex items-center gap-2 h-[34px]"
                                >
                                    <span>Save Settings</span>
                                </button>
                            </div>
                        </div>

                        {/* Global Message Toast inside panel */}
                        {globalMsg && (
                            <div className="mt-2 p-2 bg-green-50 text-green-700 text-xs rounded border border-green-100 flex items-center justify-center">
                                {globalMsg}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
