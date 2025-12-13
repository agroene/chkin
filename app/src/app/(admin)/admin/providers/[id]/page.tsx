"use client";

/**
 * Provider Detail Page
 *
 * View provider details and approve/reject registrations.
 */

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Card from "@/components/ui/Card";
import StatusBadge from "@/components/ui/StatusBadge";

interface ProviderMember {
  id: string;
  role: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    createdAt: string;
  };
}

interface Provider {
  id: string;
  name: string;
  slug: string;
  status: "pending" | "approved" | "rejected";
  practiceNumber: string | null;
  phone: string | null;
  industryType: string | null;
  address: string | null;
  city: string | null;
  postalCode: string | null;
  website: string | null;
  rejectionReason: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  createdAt: string;
  updatedAt: string;
  memberCount: number;
  members: ProviderMember[];
}

export default function ProviderDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [provider, setProvider] = useState<Provider | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");

  useEffect(() => {
    async function fetchProvider() {
      try {
        const response = await fetch(`/api/admin/providers/${id}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch provider");
        }

        setProvider(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchProvider();
  }, [id]);

  async function handleApprove() {
    if (!confirm("Are you sure you want to approve this provider?")) return;

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/providers/${id}/approve`, {
        method: "POST",
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to approve provider");
      }

      setProvider((prev) =>
        prev
          ? {
              ...prev,
              status: "approved",
              approvedAt: new Date().toISOString(),
              rejectionReason: null,
            }
          : null
      );
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to approve provider");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject() {
    if (!rejectionReason.trim()) {
      alert("Please provide a rejection reason");
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/providers/${id}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectionReason }),
      });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reject provider");
      }

      setProvider((prev) =>
        prev
          ? {
              ...prev,
              status: "rejected",
              rejectionReason: rejectionReason,
              approvedAt: null,
            }
          : null
      );
      setShowRejectModal(false);
      setRejectionReason("");
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to reject provider");
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !provider) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error || "Provider not found"}</div>
        <Link href="/admin/providers" className="text-teal-600 hover:text-teal-500">
          Back to providers
        </Link>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/admin/providers" className="hover:text-gray-700">
              Providers
            </Link>
            <span>/</span>
            <span>{provider.name}</span>
          </div>
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold text-gray-900">{provider.name}</h1>
            <StatusBadge status={provider.status} />
          </div>
        </div>

        {/* Action Buttons */}
        {provider.status === "pending" && (
          <div className="flex gap-3">
            <button
              onClick={() => setShowRejectModal(true)}
              disabled={actionLoading}
              className="px-4 py-2 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              Reject
            </button>
            <button
              onClick={handleApprove}
              disabled={actionLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              {actionLoading ? "Processing..." : "Approve"}
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Practice Details */}
          <Card title="Practice Details">
            <dl className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Practice Name</dt>
                <dd className="mt-1 text-sm text-gray-900">{provider.name}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Practice Number</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {provider.practiceNumber || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Industry Type</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {provider.industryType || "—"}
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Phone</dt>
                <dd className="mt-1 text-sm text-gray-900">{provider.phone || "—"}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Website</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {provider.website ? (
                    <a
                      href={provider.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-teal-600 hover:text-teal-500"
                    >
                      {provider.website}
                    </a>
                  ) : (
                    "—"
                  )}
                </dd>
              </div>
              <div className="md:col-span-2">
                <dt className="text-sm font-medium text-gray-500">Address</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {[provider.address, provider.city, provider.postalCode]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </dd>
              </div>
            </dl>
          </Card>

          {/* Members */}
          <Card title="Team Members" description={`${provider.memberCount} member(s)`}>
            {provider.members.length === 0 ? (
              <p className="text-sm text-gray-500">No members</p>
            ) : (
              <div className="space-y-3">
                {provider.members.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {member.user.name}
                      </div>
                      <div className="text-sm text-gray-500">{member.user.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-gray-500 uppercase">
                        {member.role}
                      </span>
                      {member.user.emailVerified && (
                        <span className="w-2 h-2 bg-green-500 rounded-full" title="Email verified"></span>
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
          {/* Status Card */}
          <Card title="Registration Status">
            <div className="space-y-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Status</dt>
                <dd className="mt-1">
                  <StatusBadge status={provider.status} />
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Registered</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {formatDate(provider.createdAt)}
                </dd>
              </div>
              {provider.approvedAt && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Approved</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(provider.approvedAt)}
                  </dd>
                </div>
              )}
              {provider.rejectionReason && (
                <div>
                  <dt className="text-sm font-medium text-gray-500">Rejection Reason</dt>
                  <dd className="mt-1 text-sm text-red-600 bg-red-50 p-2 rounded">
                    {provider.rejectionReason}
                  </dd>
                </div>
              )}
            </div>
          </Card>

          {/* Quick Actions */}
          <Card title="Actions">
            <div className="space-y-2">
              <Link
                href="/admin/providers"
                className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <span className="text-sm font-medium text-gray-900">
                  Back to Providers
                </span>
                <svg
                  className="w-5 h-5 text-gray-400"
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

      {/* Rejection Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              Reject Provider Registration
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Please provide a reason for rejecting this provider registration. This
              will be visible to the provider.
            </p>
            <textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Enter rejection reason..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectionReason("");
                }}
                disabled={actionLoading}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading || !rejectionReason.trim()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {actionLoading ? "Rejecting..." : "Reject Provider"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
