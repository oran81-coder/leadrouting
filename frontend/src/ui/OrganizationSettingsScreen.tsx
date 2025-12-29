/**
 * Organization Settings Screen
 * 
 * Allows organization admins to manage:
 * - Company information (name, email, phone)
 * - Subscription plan details
 * - Monday.com integration
 * - Account suspension/closure
 */

import React, { useEffect, useState } from "react";
import { useTheme } from "./ThemeContext";
import { useToast } from "./hooks/useToast";
import {
  getOrganizationSettings,
  updateOrganizationSettings,
  disconnectMonday,
  suspendOrganization,
  closeOrganization,
  reactivateOrganization,
  type OrganizationSettings,
  type UpdateOrganizationSettingsInput,
} from "./api";

export function OrganizationSettingsScreen() {
  const { theme } = useTheme();
  const { showToast } = useToast();
  const isDark = theme === "dark";

  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<OrganizationSettings | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);

  // Action states
  const [disconnecting, setDisconnecting] = useState(false);
  const [suspending, setSuspending] = useState(false);
  const [closing, setClosing] = useState(false);
  const [reactivating, setReactivating] = useState(false);

  // Confirmation modals
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showSuspendConfirm, setShowSuspendConfirm] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getOrganizationSettings();
      setSettings(response.data);
      
      // Populate form
      setDisplayName(response.data.displayName || "");
      setEmail(response.data.email || "");
      setPhone(response.data.phone || "");
    } catch (err: any) {
      console.error("Failed to load organization settings:", err);
      setError(err.message || "Failed to load settings");
      showToast("Failed to load settings: " + (err.message || "Unknown error"), "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!displayName.trim()) {
      showToast("Display name is required", "error");
      return;
    }

    try {
      setSaving(true);
      const input: UpdateOrganizationSettingsInput = {
        displayName: displayName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
      };

      const response = await updateOrganizationSettings(input);
      showToast(response.message || "Settings updated successfully", "success");
      
      // Reload settings to reflect changes
      await loadSettings();
    } catch (err: any) {
      console.error("Failed to update settings:", err);
      showToast("Failed to update: " + (err.message || "Unknown error"), "error");
    } finally {
      setSaving(false);
    }
  };

  const handleDisconnectMonday = async () => {
    try {
      setDisconnecting(true);
      const response = await disconnectMonday();
      showToast(response.message || "Monday.com disconnected", "success");
      setShowDisconnectConfirm(false);
      await loadSettings();
    } catch (err: any) {
      console.error("Failed to disconnect Monday:", err);
      showToast("Failed to disconnect: " + (err.message || "Unknown error"), "error");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSuspend = async () => {
    try {
      setSuspending(true);
      const response = await suspendOrganization();
      showToast(response.message || "Organization suspended", "warning");
      setShowSuspendConfirm(false);
      await loadSettings();
    } catch (err: any) {
      console.error("Failed to suspend organization:", err);
      showToast("Failed to suspend: " + (err.message || "Unknown error"), "error");
    } finally {
      setSuspending(false);
    }
  };

  const handleClose = async () => {
    try {
      setClosing(true);
      const response = await closeOrganization();
      showToast(response.message || "Organization closed", "error");
      setShowCloseConfirm(false);
      await loadSettings();
    } catch (err: any) {
      console.error("Failed to close organization:", err);
      showToast("Failed to close: " + (err.message || "Unknown error"), "error");
    } finally {
      setClosing(false);
    }
  };

  const handleReactivate = async () => {
    try {
      setReactivating(true);
      const response = await reactivateOrganization();
      showToast(response.message || "Organization reactivated", "success");
      await loadSettings();
    } catch (err: any) {
      console.error("Failed to reactivate organization:", err);
      showToast("Failed to reactivate: " + (err.message || "Unknown error"), "error");
    } finally {
      setReactivating(false);
    }
  };

  if (loading) {
    return (
      <div
        className="min-h-screen p-8"
        style={{
          background: isDark
            ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)"
            : "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
          color: isDark ? "#ffffff" : "#1a202c",
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className={`h-8 ${isDark ? "bg-gray-700" : "bg-gray-300"} rounded w-1/4`}></div>
            <div className={`h-64 ${isDark ? "bg-gray-800" : "bg-white"} rounded`}></div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !settings) {
    return (
      <div
        className="min-h-screen p-8"
        style={{
          background: isDark
            ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)"
            : "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
          color: isDark ? "#ffffff" : "#1a202c",
        }}
      >
        <div className="max-w-4xl mx-auto">
          <div
            className="p-6 rounded-lg"
            style={{
              background: isDark ? "#2d2d44" : "#fff",
              border: `1px solid ${isDark ? "#e53e3e" : "#fc8181"}`,
            }}
          >
            <h3 className="text-xl font-bold mb-2" style={{ color: "#e53e3e" }}>
              ❌ Error
            </h3>
            <p>{error}</p>
            <button
              onClick={loadSettings}
              className="mt-4 px-4 py-2 rounded"
              style={{
                background: "#3182ce",
                color: "#fff",
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const getTierBadge = (tier: string) => {
    const tiers: Record<string, { icon: string; color: string }> = {
      free: { icon: "🆓", color: "#718096" },
      standard: { icon: "⭐", color: "#3182ce" },
      enterprise: { icon: "💎", color: "#805ad5" },
    };
    return tiers[tier.toLowerCase()] || tiers.free;
  };

  const tierBadge = getTierBadge(settings?.tier || "free");

  return (
    <div
      className="min-h-screen p-8"
      style={{
        background: isDark
          ? "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)"
          : "linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)",
        color: isDark ? "#ffffff" : "#1a202c",
      }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">🏢 Organization Settings</h1>
          {!settings?.isActive && (
            <button
              onClick={handleReactivate}
              disabled={reactivating}
              className="px-4 py-2 rounded-lg font-medium"
              style={{
                background: "#48bb78",
                color: "#fff",
                opacity: reactivating ? 0.6 : 1,
              }}
            >
              {reactivating ? "Reactivating..." : "✅ Reactivate Account"}
            </button>
          )}
        </div>

        {/* Status Banner */}
        {!settings?.isActive && (
          <div
            className="p-4 rounded-lg"
            style={{
              background: isDark ? "#742a2a" : "#fff5f5",
              border: `2px solid ${isDark ? "#fc8181" : "#feb2b2"}`,
            }}
          >
            <p className="font-bold" style={{ color: "#e53e3e" }}>
              ⚠️ Organization is currently inactive
            </p>
            <p className="text-sm mt-1" style={{ color: isDark ? "#feb2b2" : "#c53030" }}>
              Users cannot log in and API access is disabled. Click "Reactivate Account" to restore
              access.
            </p>
          </div>
        )}

        {/* Company Information */}
        <div
          className="p-6 rounded-lg shadow-lg"
          style={{
            background: isDark
              ? "linear-gradient(135deg, #2d2d44 0%, #1f1f38 100%)"
              : "#ffffff",
            border: `1px solid ${isDark ? "#4a5568" : "#e2e8f0"}`,
          }}
        >
          <h2 className="text-xl font-bold mb-4">📋 Company Information</h2>
          <form onSubmit={handleSaveInfo} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Organization Name (ID)</label>
              <input
                type="text"
                value={settings?.name || ""}
                disabled
                className="w-full px-4 py-2 rounded border"
                style={{
                  background: isDark ? "#374151" : "#f7fafc",
                  border: `1px solid ${isDark ? "#4a5568" : "#cbd5e0"}`,
                  color: isDark ? "#9ca3af" : "#718096",
                  cursor: "not-allowed",
                }}
              />
              <p className="text-xs mt-1" style={{ color: "#718096" }}>
                This is your unique organization identifier and cannot be changed.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">
                Display Name <span style={{ color: "#e53e3e" }}>*</span>
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="w-full px-4 py-2 rounded border"
                style={{
                  background: isDark ? "#374151" : "#ffffff",
                  border: `1px solid ${isDark ? "#4a5568" : "#cbd5e0"}`,
                  color: isDark ? "#ffffff" : "#1a202c",
                }}
                placeholder="Tech Solutions Inc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Contact Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 rounded border"
                style={{
                  background: isDark ? "#374151" : "#ffffff",
                  border: `1px solid ${isDark ? "#4a5568" : "#cbd5e0"}`,
                  color: isDark ? "#ffffff" : "#1a202c",
                }}
                placeholder="info@company.com"
              />
              <p className="text-xs mt-1" style={{ color: "#718096" }}>
                This is your company's public contact email, not your personal login email.
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Phone Number</label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-2 rounded border"
                style={{
                  background: isDark ? "#374151" : "#ffffff",
                  border: `1px solid ${isDark ? "#4a5568" : "#cbd5e0"}`,
                  color: isDark ? "#ffffff" : "#1a202c",
                }}
                placeholder="+972-50-1234567"
              />
            </div>

            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2 rounded-lg font-medium"
              style={{
                background: saving ? "#718096" : "#3182ce",
                color: "#fff",
                cursor: saving ? "not-allowed" : "pointer",
              }}
            >
              {saving ? "Saving..." : "💾 Save Information"}
            </button>
          </form>
        </div>

        {/* Subscription Plan */}
        <div
          className="p-6 rounded-lg shadow-lg"
          style={{
            background: isDark
              ? "linear-gradient(135deg, #2d2d44 0%, #1f1f38 100%)"
              : "#ffffff",
            border: `1px solid ${isDark ? "#4a5568" : "#e2e8f0"}`,
          }}
        >
          <h2 className="text-xl font-bold mb-4">📦 Subscription Plan</h2>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="font-medium">Current Plan:</span>
              <span
                className="px-3 py-1 rounded-full font-bold"
                style={{
                  background: tierBadge.color,
                  color: "#fff",
                }}
              >
                {tierBadge.icon} {settings?.tier?.toUpperCase()}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Status:</span>
              <span
                className="px-3 py-1 rounded-full font-bold"
                style={{
                  background: settings?.isActive ? "#48bb78" : "#e53e3e",
                  color: "#fff",
                }}
              >
                {settings?.isActive ? "✅ Active" : "❌ Inactive"}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Active Users:</span>
              <span className="font-bold">{settings?.stats.userCount || 0}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="font-medium">Monthly Leads:</span>
              <span className="font-bold">Unlimited</span>
            </div>

            <hr style={{ borderColor: isDark ? "#4a5568" : "#e2e8f0", margin: "12px 0" }} />

            <div>
              <p className="font-medium mb-2">Available Features:</p>
              <ul className="space-y-1 ml-4">
                <li style={{ color: "#48bb78" }}>☑️ Manual Lead Routing</li>
                <li style={{ color: "#48bb78" }}>☑️ Basic Analytics</li>
                <li style={{ color: "#48bb78" }}>☑️ Field Mapping</li>
                <li style={{ color: "#718096" }}>☐ Auto Routing (Premium)</li>
                <li style={{ color: "#718096" }}>☐ AI Predictions (Premium)</li>
                <li style={{ color: "#718096" }}>☐ Priority Support (Enterprise)</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Integrations */}
        <div
          className="p-6 rounded-lg shadow-lg"
          style={{
            background: isDark
              ? "linear-gradient(135deg, #2d2d44 0%, #1f1f38 100%)"
              : "#ffffff",
            border: `1px solid ${isDark ? "#4a5568" : "#e2e8f0"}`,
          }}
        >
          <h2 className="text-xl font-bold mb-4">🔌 Integrations</h2>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Monday.com:</p>
                <p className="text-sm" style={{ color: "#718096" }}>
                  {settings?.mondayConnected
                    ? `Connected to workspace: ${settings.mondayWorkspaceId || "Unknown"}`
                    : "Not connected"}
                </p>
              </div>
              <span
                className="px-3 py-1 rounded-full font-bold"
                style={{
                  background: settings?.mondayConnected ? "#48bb78" : "#718096",
                  color: "#fff",
                }}
              >
                {settings?.mondayConnected ? "✅ Connected" : "❌ Disconnected"}
              </span>
            </div>

            {settings?.mondayConnected && (
              <div>
                <button
                  onClick={() => setShowDisconnectConfirm(true)}
                  className="px-4 py-2 rounded-lg font-medium"
                  style={{
                    background: "#e53e3e",
                    color: "#fff",
                  }}
                >
                  🔌 Disconnect Monday API
                </button>
                <p className="text-xs mt-2" style={{ color: "#f56565" }}>
                  ⚠️ Warning: This will stop all lead syncing and routing operations.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Danger Zone */}
        {settings?.isActive && (
          <div
            className="p-6 rounded-lg shadow-lg"
            style={{
              background: isDark ? "#2d1f1f" : "#fff5f5",
              border: `2px solid ${isDark ? "#fc8181" : "#feb2b2"}`,
            }}
          >
            <h2 className="text-xl font-bold mb-4" style={{ color: "#e53e3e" }}>
              ⚠️ Danger Zone
            </h2>

            <div className="space-y-4">
              {/* Suspend */}
              <div
                className="p-4 rounded border"
                style={{
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${isDark ? "#4a5568" : "#e2e8f0"}`,
                }}
              >
                <h3 className="font-bold mb-1">Suspend Account</h3>
                <p className="text-sm mb-3" style={{ color: "#718096" }}>
                  Temporarily disable access to your organization. Users won't be able to log in, but
                  your data will remain intact. You can reactivate at any time.
                </p>
                <button
                  onClick={() => setShowSuspendConfirm(true)}
                  className="px-4 py-2 rounded-lg font-medium"
                  style={{
                    background: "#ed8936",
                    color: "#fff",
                  }}
                >
                  ⏸️ Suspend Account
                </button>
              </div>

              {/* Close */}
              <div
                className="p-4 rounded border"
                style={{
                  background: isDark ? "#1a1a1a" : "#ffffff",
                  border: `1px solid ${isDark ? "#4a5568" : "#e2e8f0"}`,
                }}
              >
                <h3 className="font-bold mb-1">Close Account</h3>
                <p className="text-sm mb-3" style={{ color: "#718096" }}>
                  Permanently close your organization account. This will deactivate your organization
                  and all users. Contact support within 30 days to restore your data.
                </p>
                <button
                  onClick={() => setShowCloseConfirm(true)}
                  className="px-4 py-2 rounded-lg font-medium"
                  style={{
                    background: "#e53e3e",
                    color: "#fff",
                  }}
                >
                  🗑️ Close Account
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Disconnect Monday Confirmation Modal */}
      {showDisconnectConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => !disconnecting && setShowDisconnectConfirm(false)}
        >
          <div
            className="p-6 rounded-lg shadow-xl max-w-md"
            style={{
              background: isDark ? "#2d2d44" : "#ffffff",
              border: `1px solid ${isDark ? "#4a5568" : "#e2e8f0"}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-3" style={{ color: "#e53e3e" }}>
              🔌 Disconnect Monday.com?
            </h3>
            <p className="mb-4">
              Are you sure you want to disconnect Monday.com? This will:
            </p>
            <ul className="list-disc ml-5 mb-4 space-y-1">
              <li>Stop all lead syncing</li>
              <li>Disable automatic routing</li>
              <li>Remove all webhooks</li>
            </ul>
            <p className="mb-6" style={{ color: "#718096" }}>
              You can reconnect anytime from Admin settings.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDisconnectMonday}
                disabled={disconnecting}
                className="flex-1 px-4 py-2 rounded-lg font-medium"
                style={{
                  background: disconnecting ? "#718096" : "#e53e3e",
                  color: "#fff",
                  cursor: disconnecting ? "not-allowed" : "pointer",
                }}
              >
                {disconnecting ? "Disconnecting..." : "Yes, Disconnect"}
              </button>
              <button
                onClick={() => setShowDisconnectConfirm(false)}
                disabled={disconnecting}
                className="flex-1 px-4 py-2 rounded-lg font-medium"
                style={{
                  background: "#718096",
                  color: "#fff",
                  cursor: disconnecting ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Confirmation Modal */}
      {showSuspendConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => !suspending && setShowSuspendConfirm(false)}
        >
          <div
            className="p-6 rounded-lg shadow-xl max-w-md"
            style={{
              background: isDark ? "#2d2d44" : "#ffffff",
              border: `1px solid ${isDark ? "#4a5568" : "#e2e8f0"}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-3" style={{ color: "#ed8936" }}>
              ⏸️ Suspend Organization?
            </h3>
            <p className="mb-4">
              Are you sure you want to suspend your organization? This will:
            </p>
            <ul className="list-disc ml-5 mb-4 space-y-1">
              <li>Disable all user logins</li>
              <li>Block API access</li>
              <li>Preserve all your data</li>
            </ul>
            <p className="mb-6" style={{ color: "#718096" }}>
              You can reactivate your account at any time.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleSuspend}
                disabled={suspending}
                className="flex-1 px-4 py-2 rounded-lg font-medium"
                style={{
                  background: suspending ? "#718096" : "#ed8936",
                  color: "#fff",
                  cursor: suspending ? "not-allowed" : "pointer",
                }}
              >
                {suspending ? "Suspending..." : "Yes, Suspend"}
              </button>
              <button
                onClick={() => setShowSuspendConfirm(false)}
                disabled={suspending}
                className="flex-1 px-4 py-2 rounded-lg font-medium"
                style={{
                  background: "#718096",
                  color: "#fff",
                  cursor: suspending ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Close Confirmation Modal */}
      {showCloseConfirm && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.7)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => !closing && setShowCloseConfirm(false)}
        >
          <div
            className="p-6 rounded-lg shadow-xl max-w-md"
            style={{
              background: isDark ? "#2d2d44" : "#ffffff",
              border: `1px solid ${isDark ? "#4a5568" : "#e2e8f0"}`,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-xl font-bold mb-3" style={{ color: "#e53e3e" }}>
              🗑️ Close Organization Account?
            </h3>
            <p className="mb-4 font-bold" style={{ color: "#e53e3e" }}>
              ⚠️ This is a serious action!
            </p>
            <p className="mb-4">Closing your organization will:</p>
            <ul className="list-disc ml-5 mb-4 space-y-1">
              <li>Deactivate your organization permanently</li>
              <li>Disable all user access</li>
              <li>Stop all integrations and webhooks</li>
            </ul>
            <p className="mb-6" style={{ color: "#718096" }}>
              Contact support within 30 days if you want to restore your data.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleClose}
                disabled={closing}
                className="flex-1 px-4 py-2 rounded-lg font-medium"
                style={{
                  background: closing ? "#718096" : "#e53e3e",
                  color: "#fff",
                  cursor: closing ? "not-allowed" : "pointer",
                }}
              >
                {closing ? "Closing..." : "Yes, Close Account"}
              </button>
              <button
                onClick={() => setShowCloseConfirm(false)}
                disabled={closing}
                className="flex-1 px-4 py-2 rounded-lg font-medium"
                style={{
                  background: "#718096",
                  color: "#fff",
                  cursor: closing ? "not-allowed" : "pointer",
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

