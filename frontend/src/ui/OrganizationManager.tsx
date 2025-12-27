/**
 * Organization Management Component
 * Phase 7.3: Multi-Tenant Support
 * 
 * Displays list of organizations with create/edit/delete capabilities
 */

import React, { useEffect, useState } from "react";
import {
  listOrganizations,
  getOrganizationWithStats,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  activateOrganization,
  type Organization,
  type OrganizationWithStats,
  type CreateOrganizationInput,
  type UpdateOrganizationInput,
} from "./api";
import { useToast } from "./hooks/useToast";
import { useConfirm } from "./hooks/useConfirm";

type OrganizationModalMode = "create" | "edit" | "view" | null;

export function OrganizationManager() {
  const { showToast } = useToast();
  const { confirm } = useConfirm();

  // State
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);

  // Modal state
  const [modalMode, setModalMode] = useState<OrganizationModalMode>(null);
  const [selectedOrg, setSelectedOrg] = useState<Organization | null>(null);
  const [orgWithStats, setOrgWithStats] = useState<OrganizationWithStats | null>(null);

  // Form state
  const [formData, setFormData] = useState<CreateOrganizationInput>({
    name: "",
    displayName: "",
    email: "",
    phone: "",
    tier: "standard",
    mondayWorkspaceId: "",
  });
  const [formLoading, setFormLoading] = useState(false);

  // Load organizations
  useEffect(() => {
    loadOrganizations();
  }, []);

  async function loadOrganizations() {
    try {
      setLoading(true);
      const result = await listOrganizations({ limit: 100 });
      setOrganizations(result.data);
      setTotalCount(result.pagination.total);
    } catch (error: any) {
      showToast(error.message || "Failed to load organizations", "error");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate() {
    setModalMode("create");
    setFormData({
      name: "",
      displayName: "",
      email: "",
      phone: "",
      tier: "standard",
      mondayWorkspaceId: "",
    });
  }

  async function handleView(org: Organization) {
    setSelectedOrg(org);
    setModalMode("view");
    
    // Load stats
    try {
      const result = await getOrganizationWithStats(org.id);
      setOrgWithStats(result.data);
    } catch (error: any) {
      showToast(error.message || "Failed to load organization stats", "error");
    }
  }

  async function handleEdit(org: Organization) {
    setSelectedOrg(org);
    setModalMode("edit");
    setFormData({
      name: org.name,
      displayName: org.displayName || "",
      email: org.email || "",
      phone: org.phone || "",
      tier: org.tier,
      mondayWorkspaceId: org.mondayWorkspaceId || "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormLoading(true);

    try {
      if (modalMode === "create") {
        await createOrganization(formData);
        showToast("Organization created successfully", "success");
      } else if (modalMode === "edit" && selectedOrg) {
        const updateData: UpdateOrganizationInput = {
          displayName: formData.displayName || null,
          email: formData.email || null,
          phone: formData.phone || null,
          tier: formData.tier,
          mondayWorkspaceId: formData.mondayWorkspaceId || null,
        };
        await updateOrganization(selectedOrg.id, updateData);
        showToast("Organization updated successfully", "success");
      }

      setModalMode(null);
      setSelectedOrg(null);
      loadOrganizations();
    } catch (error: any) {
      showToast(error.message || "Failed to save organization", "error");
    } finally {
      setFormLoading(false);
    }
  }

  async function handleToggleActive(org: Organization) {
    const action = org.isActive ? "deactivate" : "activate";
    const confirmed = await confirm(
      `Are you sure you want to ${action} "${org.displayName || org.name}"?`,
      org.isActive ? "warning" : "info"
    );

    if (!confirmed) return;

    try {
      if (org.isActive) {
        await deleteOrganization(org.id, false); // soft delete
        showToast("Organization deactivated", "success");
      } else {
        await activateOrganization(org.id);
        showToast("Organization activated", "success");
      }
      loadOrganizations();
    } catch (error: any) {
      showToast(error.message || `Failed to ${action} organization`, "error");
    }
  }

  async function handleDelete(org: Organization) {
    const confirmed = await confirm(
      `⚠️ DANGER: Permanently delete "${org.displayName || org.name}"? This will delete ALL data for this organization (users, proposals, leads, etc.). This action CANNOT be undone!`,
      "danger"
    );

    if (!confirmed) return;

    try {
      await deleteOrganization(org.id, true); // hard delete
      showToast("Organization permanently deleted", "success");
      loadOrganizations();
    } catch (error: any) {
      showToast(error.message || "Failed to delete organization", "error");
    }
  }

  const closeModal = () => {
    setModalMode(null);
    setSelectedOrg(null);
    setOrgWithStats(null);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Organizations
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage multi-tenant organizations ({totalCount} total)
          </p>
        </div>
        <button
          onClick={handleCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
        >
          <span>➕</span>
          New Organization
        </button>
      </div>

      {/* Organizations Table */}
      {loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-gray-600 dark:text-gray-400 mt-4">Loading organizations...</p>
        </div>
      ) : organizations.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg p-8 text-center">
          <p className="text-gray-600 dark:text-gray-400">No organizations found</p>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Organization
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Tier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {organizations.map((org) => (
                <tr key={org.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {org.displayName || org.name}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono">
                        {org.name}
                      </div>
                      {org.mondayWorkspaceId && (
                        <div className="text-xs text-gray-400 dark:text-gray-500">
                          Monday: {org.mondayWorkspaceId}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-gray-300">
                      {org.email || "-"}
                    </div>
                    {org.phone && (
                      <div className="text-xs text-gray-500 dark:text-gray-400">
                        {org.phone}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        org.tier === "enterprise"
                          ? "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
                          : org.tier === "standard"
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                      }`}
                    >
                      {org.tier}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        org.isActive
                          ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                          : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
                      }`}
                    >
                      {org.isActive ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(org.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                    <button
                      onClick={() => handleView(org)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300"
                      title="View details"
                    >
                      👁️
                    </button>
                    <button
                      onClick={() => handleEdit(org)}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleToggleActive(org)}
                      className={`${
                        org.isActive
                          ? "text-orange-600 hover:text-orange-900 dark:text-orange-400"
                          : "text-green-600 hover:text-green-900 dark:text-green-400"
                      }`}
                      title={org.isActive ? "Deactivate" : "Activate"}
                    >
                      {org.isActive ? "⏸️" : "▶️"}
                    </button>
                    <button
                      onClick={() => handleDelete(org)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete permanently"
                    >
                      🗑️
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal for Create/Edit/View */}
      {modalMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {modalMode === "create" && "Create New Organization"}
                {modalMode === "edit" && "Edit Organization"}
                {modalMode === "view" && "Organization Details"}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="px-6 py-4">
              {modalMode === "view" && orgWithStats ? (
                // View Mode - Display Stats
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Name
                      </label>
                      <p className="text-gray-900 dark:text-white font-mono">
                        {orgWithStats.organization.name}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Display Name
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {orgWithStats.organization.displayName || "-"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Email
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {orgWithStats.organization.email || "-"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Phone
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {orgWithStats.organization.phone || "-"}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Tier
                      </label>
                      <p className="text-gray-900 dark:text-white capitalize">
                        {orgWithStats.organization.tier}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                        Status
                      </label>
                      <p className="text-gray-900 dark:text-white">
                        {orgWithStats.organization.isActive ? "Active" : "Inactive"}
                      </p>
                    </div>
                  </div>

                  {/* Statistics */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                    <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                      📊 Usage Statistics
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                        <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                          {orgWithStats.stats.totalUsers}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Users</div>
                      </div>
                      <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                          {orgWithStats.stats.totalAgents}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Agents</div>
                      </div>
                      <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                          {orgWithStats.stats.totalProposals}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Proposals</div>
                      </div>
                      <div className="bg-orange-50 dark:bg-orange-900/20 rounded-lg p-4">
                        <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">
                          {orgWithStats.stats.totalLeads}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">Leads</div>
                      </div>
                    </div>
                  </div>

                  {/* Metadata */}
                  <div className="border-t border-gray-200 dark:border-gray-700 pt-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
                    <div>
                      <strong>ID:</strong> {orgWithStats.organization.id}
                    </div>
                    <div>
                      <strong>Created:</strong>{" "}
                      {new Date(orgWithStats.organization.createdAt).toLocaleString()}
                    </div>
                    <div>
                      <strong>Updated:</strong>{" "}
                      {new Date(orgWithStats.organization.updatedAt).toLocaleString()}
                    </div>
                  </div>
                </div>
              ) : (
                // Create/Edit Mode - Form
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Name (Unique Identifier) *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      disabled={modalMode === "edit"}
                      required
                      placeholder="acme-corp"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white disabled:opacity-50 disabled:cursor-not-allowed font-mono"
                    />
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Lowercase, alphanumeric, and hyphens only. Cannot be changed after creation.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Display Name
                    </label>
                    <input
                      type="text"
                      value={formData.displayName}
                      onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                      placeholder="ACME Corporation"
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Email
                      </label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="admin@acme.com"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Phone
                      </label>
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="+1-555-0123"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Tier
                      </label>
                      <select
                        value={formData.tier}
                        onChange={(e) => setFormData({ ...formData, tier: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="free">Free</option>
                        <option value="standard">Standard</option>
                        <option value="enterprise">Enterprise</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Monday Workspace ID
                      </label>
                      <input
                        type="text"
                        value={formData.mondayWorkspaceId}
                        onChange={(e) =>
                          setFormData({ ...formData, mondayWorkspaceId: e.target.value })
                        }
                        placeholder="12345678"
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Form Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={closeModal}
                      disabled={formLoading}
                      className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {formLoading ? "Saving..." : modalMode === "create" ? "Create" : "Update"}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

