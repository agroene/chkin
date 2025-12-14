"use client";

/**
 * Provider Dashboard
 *
 * Main dashboard for the provider portal showing key metrics and quick actions.
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/auth-client";
import { PageHeader } from "@/components/layout";

interface DashboardStats {
  totalForms: number;
  activeForms: number;
  totalSubmissions: number;
  pendingSubmissions: number;
  todaySubmissions: number;
}

export default function ProviderDashboard() {
  const { data: session } = useSession();
  const [stats, setStats] = useState<DashboardStats>({
    totalForms: 0,
    activeForms: 0,
    totalSubmissions: 0,
    pendingSubmissions: 0,
    todaySubmissions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const response = await fetch("/api/provider/stats");
        if (response.ok) {
          const data = await response.json();
          setStats(data);
        }
      } catch {
        // Keep default stats
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  return (
    <>
      <PageHeader
        title="Dashboard"
        description={`Welcome back${session?.user?.name ? `, ${session.user.name}` : ""}`}
      />

      {/* Stats Grid */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Active Forms"
          value={stats.activeForms}
          total={stats.totalForms}
          loading={loading}
          href="/provider/forms"
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />
        <StatCard
          title="Submissions Today"
          value={stats.todaySubmissions}
          loading={loading}
          href="/provider/submissions"
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
          }
        />
        <StatCard
          title="Pending Review"
          value={stats.pendingSubmissions}
          loading={loading}
          href="/provider/submissions?status=pending"
          highlight={stats.pendingSubmissions > 0}
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
        <StatCard
          title="Total Submissions"
          value={stats.totalSubmissions}
          loading={loading}
          href="/provider/submissions"
          icon={
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          }
        />
      </div>

      {/* Quick Actions */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-gray-900">Quick Actions</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <QuickActionCard
            title="Create New Form"
            description="Design a patient check-in form with custom fields"
            href="/provider/forms/new"
            icon={
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
            }
            color="teal"
          />
          <QuickActionCard
            title="Generate QR Code"
            description="Create a QR code for patients to scan"
            href="/provider/qr-codes"
            icon={
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                />
              </svg>
            }
            color="blue"
          />
          <QuickActionCard
            title="View Submissions"
            description="Review and manage patient submissions"
            href="/provider/submissions"
            icon={
              <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            }
            color="purple"
          />
        </div>
      </div>

      {/* Getting Started (shown when no forms exist) */}
      {!loading && stats.totalForms === 0 && (
        <div className="mt-8 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-8 text-center">
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
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-4 text-lg font-medium text-gray-900">
            Get started with your first form
          </h3>
          <p className="mt-2 text-sm text-gray-500">
            Create a patient check-in form to start collecting information digitally.
          </p>
          <div className="mt-6">
            <Link
              href="/provider/forms/new"
              className="inline-flex items-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              <svg
                className="mr-2 h-5 w-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                />
              </svg>
              Create Your First Form
            </Link>
          </div>
        </div>
      )}
    </>
  );
}

// Stat Card Component
interface StatCardProps {
  title: string;
  value: number;
  total?: number;
  loading?: boolean;
  href: string;
  icon: React.ReactNode;
  highlight?: boolean;
}

function StatCard({ title, value, total, loading, href, icon, highlight }: StatCardProps) {
  return (
    <Link
      href={href}
      className={`rounded-lg border bg-white p-6 transition-shadow hover:shadow-md ${
        highlight ? "border-amber-300 bg-amber-50" : "border-gray-200"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className={`rounded-lg p-2 ${highlight ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-600"}`}>
          {icon}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <p className="mt-1 text-3xl font-semibold text-gray-900">
          {loading ? (
            <span className="inline-block h-8 w-16 animate-pulse rounded bg-gray-200" />
          ) : (
            <>
              {value}
              {total !== undefined && (
                <span className="ml-1 text-lg font-normal text-gray-400">/ {total}</span>
              )}
            </>
          )}
        </p>
      </div>
    </Link>
  );
}

// Quick Action Card Component
interface QuickActionCardProps {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: "teal" | "blue" | "purple";
}

function QuickActionCard({ title, description, href, icon, color }: QuickActionCardProps) {
  const colorClasses = {
    teal: "bg-teal-50 text-teal-600 group-hover:bg-teal-100",
    blue: "bg-blue-50 text-blue-600 group-hover:bg-blue-100",
    purple: "bg-purple-50 text-purple-600 group-hover:bg-purple-100",
  };

  return (
    <Link
      href={href}
      className="group rounded-lg border border-gray-200 bg-white p-6 transition-all hover:border-gray-300 hover:shadow-md"
    >
      <div className={`inline-flex rounded-lg p-3 ${colorClasses[color]}`}>
        {icon}
      </div>
      <h3 className="mt-4 text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 text-sm text-gray-500">{description}</p>
    </Link>
  );
}
