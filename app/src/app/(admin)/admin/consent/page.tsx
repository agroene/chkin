"use client";

/**
 * Consent Compliance Dashboard
 *
 * Admin view of consent status across all organizations.
 */

import { useState, useEffect } from "react";
import Link from "next/link";
import Card from "@/components/ui/Card";

interface ConsentSummary {
  totalSubmissions: number;
  activeConsents: number;
  expiringIn7Days: number;
  expiringIn30Days: number;
  expiredConsents: number;
  withdrawnConsents: number;
  autoRenewalEnabled: number;
  withdrawalRate: string;
  autoRenewalRate: string;
}

interface ConsentActivity {
  recentRenewals: number;
  recentWithdrawals: number;
}

interface OrganizationBreakdown {
  organizationId: string;
  organizationName: string;
  organizationStatus: string;
  total: number;
  active: number;
  expiringSoon: number;
  expired: number;
  withdrawn: number;
}

interface ConsentStats {
  summary: ConsentSummary;
  activity: ConsentActivity;
  organizationBreakdown: OrganizationBreakdown[];
}

export default function ConsentDashboardPage() {
  const [stats, setStats] = useState<ConsentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/admin/consent-stats");
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch stats");
        }

        setStats(data.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error || !stats) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">{error || "Failed to load stats"}</div>
        <button
          onClick={() => window.location.reload()}
          className="text-teal-600 hover:text-teal-500"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Consent Compliance</h1>
        <p className="text-gray-600 mt-1">
          Overview of consent status across all organizations
        </p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Consents"
          value={stats.summary.totalSubmissions}
          color="gray"
        />
        <StatCard
          label="Active"
          value={stats.summary.activeConsents}
          color="green"
        />
        <StatCard
          label="Expiring Soon"
          value={stats.summary.expiringIn30Days}
          color="amber"
          subtext={`${stats.summary.expiringIn7Days} in 7 days`}
        />
        <StatCard
          label="Expired"
          value={stats.summary.expiredConsents}
          color="red"
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Withdrawn"
          value={stats.summary.withdrawnConsents}
          color="gray"
          subtext={`${stats.summary.withdrawalRate} withdrawal rate`}
        />
        <StatCard
          label="Auto-Renewal Enabled"
          value={stats.summary.autoRenewalEnabled}
          color="teal"
          subtext={`${stats.summary.autoRenewalRate} of active`}
        />
        <StatCard
          label="Renewed (30d)"
          value={stats.activity.recentRenewals}
          color="green"
        />
        <StatCard
          label="Withdrawn (30d)"
          value={stats.activity.recentWithdrawals}
          color="red"
        />
      </div>

      {/* Organization Breakdown */}
      <Card title="Organization Breakdown">
        {stats.organizationBreakdown.length === 0 ? (
          <p className="text-sm text-gray-500">No organizations with consent data</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-500 border-b">
                  <th className="pb-3 font-medium">Organization</th>
                  <th className="pb-3 font-medium text-right">Total</th>
                  <th className="pb-3 font-medium text-right">Active</th>
                  <th className="pb-3 font-medium text-right">Expiring</th>
                  <th className="pb-3 font-medium text-right">Expired</th>
                  <th className="pb-3 font-medium text-right">Withdrawn</th>
                  <th className="pb-3 font-medium text-right">Health</th>
                </tr>
              </thead>
              <tbody>
                {stats.organizationBreakdown.map((org) => {
                  // Calculate health score (percentage of active consents)
                  const healthScore =
                    org.total > 0
                      ? Math.round((org.active / org.total) * 100)
                      : 0;
                  const healthColor =
                    healthScore >= 80
                      ? "text-green-600"
                      : healthScore >= 50
                      ? "text-amber-600"
                      : "text-red-600";

                  return (
                    <tr key={org.organizationId} className="border-b last:border-0">
                      <td className="py-3">
                        <Link
                          href={`/admin/providers/${org.organizationId}`}
                          className="font-medium text-gray-900 hover:text-teal-600"
                        >
                          {org.organizationName}
                        </Link>
                        <span
                          className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                            org.organizationStatus === "approved"
                              ? "bg-green-100 text-green-700"
                              : org.organizationStatus === "pending"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {org.organizationStatus}
                        </span>
                      </td>
                      <td className="py-3 text-right text-gray-600">{org.total}</td>
                      <td className="py-3 text-right text-green-600 font-medium">
                        {org.active}
                      </td>
                      <td className="py-3 text-right text-amber-600">
                        {org.expiringSoon}
                      </td>
                      <td className="py-3 text-right text-red-600">{org.expired}</td>
                      <td className="py-3 text-right text-gray-500">{org.withdrawn}</td>
                      <td className={`py-3 text-right font-medium ${healthColor}`}>
                        {healthScore}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Info Box */}
      <div className="mt-6 rounded-lg bg-blue-50 p-4">
        <div className="flex">
          <svg
            className="h-5 w-5 flex-shrink-0 text-blue-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">
              About Consent Health Score
            </h4>
            <p className="mt-1 text-sm text-blue-700">
              The health score represents the percentage of total consents that are
              currently active (not expired or withdrawn). A score of 80%+ is
              considered healthy, 50-79% needs attention, and below 50% requires
              immediate action.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  color,
  subtext,
}: {
  label: string;
  value: number;
  color: "gray" | "green" | "amber" | "red" | "teal";
  subtext?: string;
}) {
  const colorClasses = {
    gray: "bg-gray-50 text-gray-900",
    green: "bg-green-50 text-green-900",
    amber: "bg-amber-50 text-amber-900",
    red: "bg-red-50 text-red-900",
    teal: "bg-teal-50 text-teal-900",
  };

  const valueColorClasses = {
    gray: "text-gray-900",
    green: "text-green-600",
    amber: "text-amber-600",
    red: "text-red-600",
    teal: "text-teal-600",
  };

  return (
    <div className={`rounded-lg p-4 ${colorClasses[color]}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
        {label}
      </p>
      <p className={`text-2xl font-bold mt-1 ${valueColorClasses[color]}`}>
        {value.toLocaleString()}
      </p>
      {subtext && <p className="text-xs text-gray-500 mt-1">{subtext}</p>}
    </div>
  );
}
