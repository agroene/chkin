"use client";

/**
 * User Detail Page
 *
 * View and manage individual user details, including:
 * - Edit name
 * - Toggle admin status
 * - View organizations
 * - Revoke all sessions
 */

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";
import { Button, Input, Modal } from "@/components/ui";

interface UserOrganization {
  id: string;
  name: string;
  slug: string;
  status: string;
  industryType: string | null;
  role: string;
  memberSince: string;
}

interface UserSession {
  id: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  expiresAt: string;
  isActive: boolean;
}

interface User {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  isSystemAdmin: boolean;
  createdAt: string;
  updatedAt: string;
  organizationCount: number;
  sessionCount: number;
  organizations: UserOrganization[];
  recentSessions: UserSession[];
  userType: "admin" | "provider" | "patient";
}

export default function UserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);

  // Edit state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState("");
  const [editIsAdmin, setEditIsAdmin] = useState(false);

  // Revoke sessions state
  const [showRevokeModal, setShowRevokeModal] = useState(false);

  useEffect(() => {
    async function fetchUser() {
      try {
        const response = await fetch(`/api/admin/users/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch user");
        }

        setUser(data.data);
        setEditName(data.data.name);
        setEditIsAdmin(data.data.isSystemAdmin);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchUser();
  }, [id]);

  async function handleSaveChanges() {
    if (!editName.trim()) {
      alert("Name is required");
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim(),
          isSystemAdmin: editIsAdmin,
        }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update user");
      }

      setUser((prev) =>
        prev
          ? {
              ...prev,
              name: data.data.name,
              isSystemAdmin: data.data.isSystemAdmin,
              updatedAt: data.data.updatedAt,
            }
          : null
      );
      setShowEditModal(false);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update user");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleRevokeSessions() {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/users/${id}/sessions`, {
        method: "DELETE",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to revoke sessions");
      }

      setUser((prev) =>
        prev
          ? {
              ...prev,
              sessionCount: 0,
              recentSessions: [],
            }
          : null
      );
      setShowRevokeModal(false);
      alert(`Successfully revoked ${data.data.sessionsRevoked} session(s)`);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to revoke sessions");
    } finally {
      setActionLoading(false);
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function formatShortDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  function getUserTypeBadge(userType: string, isSystemAdmin: boolean) {
    if (isSystemAdmin) {
      return (
        <span className="inline-flex items-center rounded-full bg-purple-100 px-2.5 py-0.5 text-xs font-medium text-purple-800">
          System Admin
        </span>
      );
    }
    if (userType === "provider") {
      return (
        <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800">
          Provider
        </span>
      );
    }
    return (
      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
        Patient
      </span>
    );
  }

  function parseUserAgent(userAgent: string | null): string {
    if (!userAgent) return "Unknown device";
    // Simple parsing - just show first part
    if (userAgent.includes("Chrome")) return "Chrome Browser";
    if (userAgent.includes("Firefox")) return "Firefox Browser";
    if (userAgent.includes("Safari")) return "Safari Browser";
    if (userAgent.includes("Edge")) return "Edge Browser";
    return "Web Browser";
  }

  if (loading) {
    return (
      <div className="flex min-h-96 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent"></div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="py-12 text-center">
        <div className="mb-4 text-red-600">{error || "User not found"}</div>
        <Link href="/admin/users" className="text-teal-600 hover:text-teal-500">
          Back to users
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
          <Link href="/admin/users" className="hover:text-gray-700">
            Users
          </Link>
          <span>/</span>
          <span>{user.name}</span>
        </div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            {user.image ? (
              <img
                src={user.image}
                alt={user.name}
                className="h-12 w-12 rounded-full sm:h-16 sm:w-16"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-gray-200 text-xl font-medium text-gray-600 sm:h-16 sm:w-16 sm:text-2xl">
                {user.name.charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
                {user.name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-500">
                <span>{user.email}</span>
                {getUserTypeBadge(user.userType, user.isSystemAdmin)}
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 sm:gap-3">
            <Button
              variant="secondary"
              onClick={() => {
                setEditName(user.name);
                setEditIsAdmin(user.isSystemAdmin);
                setShowEditModal(true);
              }}
            >
              Edit User
            </Button>
            {user.sessionCount > 0 && (
              <Button
                variant="secondary"
                onClick={() => setShowRevokeModal(true)}
                className="text-red-600 hover:bg-red-50"
              >
                Revoke Sessions
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Info */}
        <div className="space-y-6 lg:col-span-2">
          {/* Account Details */}
          <Card title="Account Details">
            <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <dt className="text-sm font-medium text-gray-500">Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Email Verified
                </dt>
                <dd className="mt-1">
                  <StatusBadge
                    status={user.emailVerified ? "approved" : "pending"}
                    label={user.emailVerified ? "Verified" : "Unverified"}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  System Admin
                </dt>
                <dd className="mt-1">
                  <StatusBadge
                    status={user.isSystemAdmin ? "approved" : "rejected"}
                    label={user.isSystemAdmin ? "Yes" : "No"}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Joined</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(user.createdAt)}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Last Updated
                </dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(user.updatedAt)}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Organizations */}
          <Card
            title="Organizations"
            description={`${user.organizationCount} organization(s)`}
          >
            {user.organizations.length === 0 ? (
              <p className="text-sm text-gray-500">
                This user is not a member of any organizations.
              </p>
            ) : (
              <div className="space-y-3">
                {user.organizations.map((org) => (
                  <Link
                    key={org.id}
                    href={`/admin/providers/${org.id}`}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {org.name}
                      </div>
                      <div className="text-sm text-gray-500">
                        {org.industryType || "Healthcare Provider"}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium uppercase text-gray-500">
                        {org.role}
                      </span>
                      <StatusBadge status={org.status as "pending" | "approved" | "rejected"} />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>

          {/* Recent Sessions */}
          <Card
            title="Recent Sessions"
            description={`${user.sessionCount} active session(s)`}
          >
            {user.recentSessions.length === 0 ? (
              <p className="text-sm text-gray-500">No active sessions.</p>
            ) : (
              <div className="space-y-3">
                {user.recentSessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg bg-gray-50 p-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {parseUserAgent(session.userAgent)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {session.ipAddress || "Unknown IP"} &middot; Started{" "}
                        {formatShortDate(session.createdAt)}
                      </div>
                    </div>
                    <div>
                      {session.isActive ? (
                        <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
                          Expired
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Stats */}
          <Card title="Quick Stats">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Organizations</span>
                <span className="text-sm font-medium text-gray-900">
                  {user.organizationCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Active Sessions</span>
                <span className="text-sm font-medium text-gray-900">
                  {user.sessionCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">User Type</span>
                <span className="text-sm font-medium capitalize text-gray-900">
                  {user.userType}
                </span>
              </div>
            </div>
          </Card>

          {/* Actions */}
          <Card title="Actions">
            <div className="space-y-2">
              <Link
                href="/admin/users"
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3 transition-colors hover:bg-gray-100"
              >
                <span className="text-sm font-medium text-gray-900">
                  Back to Users
                </span>
                <svg
                  className="h-5 w-5 text-gray-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            </div>
          </Card>
        </div>
      </div>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit User"
      >
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700">
              Name
            </label>
            <Input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Enter name"
            />
          </div>
          <div>
            <label className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={editIsAdmin}
                onChange={(e) => setEditIsAdmin(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm font-medium text-gray-700">
                System Administrator
              </span>
            </label>
            <p className="mt-1 text-xs text-gray-500">
              System administrators have full access to all platform features.
            </p>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowEditModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveChanges} disabled={actionLoading}>
              {actionLoading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Revoke Sessions Modal */}
      <Modal
        isOpen={showRevokeModal}
        onClose={() => setShowRevokeModal(false)}
        title="Revoke All Sessions"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            This will log out <strong>{user.name}</strong> from all devices.
            They will need to log in again to access the platform.
          </p>
          <p className="text-sm text-gray-600">
            <strong>{user.sessionCount}</strong> active session(s) will be
            revoked.
          </p>
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="secondary"
              onClick={() => setShowRevokeModal(false)}
              disabled={actionLoading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRevokeSessions}
              disabled={actionLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {actionLoading ? "Revoking..." : "Revoke All Sessions"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
