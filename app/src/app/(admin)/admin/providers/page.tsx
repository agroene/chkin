"use client";

/**
 * Provider Management Page
 *
 * Lists all providers with filtering by status and search.
 * Mobile-first: card view on mobile, table on desktop.
 *
 * @module app/(admin)/admin/providers/page
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, DataTable, StatusBadge, Button, Input } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import type { Column } from "@/components/ui/DataTable";

interface Provider {
  id: string;
  name: string;
  slug: string;
  status: "pending" | "approved" | "rejected";
  practiceNumber: string | null;
  phone: string | null;
  industryType: string | null;
  city: string | null;
  createdAt: string;
  memberCount: number;
  primaryContact: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

type StatusFilter = "all" | "pending" | "approved" | "rejected";

export default function ProvidersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [providers, setProviders] = useState<Provider[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (searchParams.get("status") as StatusFilter) || "all"
  );
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || ""
  );
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page") || "1")
  );

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("page", currentPage.toString());
      params.set("limit", "20");

      const response = await fetch(`/api/admin/providers?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch providers");
      }

      setProviders(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [statusFilter, searchQuery, currentPage]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (searchQuery) params.set("search", searchQuery);
    if (currentPage > 1) params.set("page", currentPage.toString());

    const newUrl = params.toString()
      ? `/admin/providers?${params}`
      : "/admin/providers";
    router.replace(newUrl, { scroll: false });
  }, [statusFilter, searchQuery, currentPage, router]);

  function handleStatusChange(status: StatusFilter) {
    setStatusFilter(status);
    setCurrentPage(1);
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCurrentPage(1);
    fetchProviders();
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  }

  const statusCounts = {
    all: pagination?.totalCount || 0,
    pending: providers.filter((p) => p.status === "pending").length,
    approved: providers.filter((p) => p.status === "approved").length,
    rejected: providers.filter((p) => p.status === "rejected").length,
  };

  // Column definitions for DataTable
  const columns: Column<Provider>[] = [
    {
      key: "name",
      header: "Provider",
      mobileTitle: true,
      render: (provider) => (
        <div>
          <div className="font-medium text-gray-900">{provider.name}</div>
          <div className="text-sm text-gray-500">{provider.city || "—"}</div>
        </div>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      mobileSubtitle: true,
      render: (provider) =>
        provider.primaryContact ? (
          <div>
            <div className="text-gray-900">{provider.primaryContact.name}</div>
            <div className="text-sm text-gray-500">
              {provider.primaryContact.email}
            </div>
          </div>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: "industryType",
      header: "Industry",
      hideOnMobile: true,
      render: (provider) => provider.industryType || "—",
    },
    {
      key: "status",
      header: "Status",
      render: (provider) => <StatusBadge status={provider.status} />,
    },
    {
      key: "createdAt",
      header: "Registered",
      hideOnMobile: true,
      render: (provider) => formatDate(provider.createdAt),
    },
  ];

  const emptyIcon = (
    <svg
      className="mx-auto h-12 w-12"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    </svg>
  );

  return (
    <div>
      <PageHeader
        title="Provider Management"
        description="Review and manage healthcare provider registrations"
      />

      {/* Filters */}
      <Card className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-4">
          {/* Status Tabs - Scrollable on mobile */}
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="inline-flex min-w-full space-x-1 rounded-lg bg-gray-100 p-1 sm:min-w-0">
              {(["all", "pending", "approved", "rejected"] as StatusFilter[]).map(
                (status) => (
                  <button
                    key={status}
                    onClick={() => handleStatusChange(status)}
                    className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
                      statusFilter === status
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                    {status === "pending" && statusFilter === "all" && (
                      <span className="ml-1.5 rounded-full bg-yellow-100 px-2 py-0.5 text-xs text-yellow-800 sm:ml-2">
                        {statusCounts.pending}
                      </span>
                    )}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Search */}
          <form
            onSubmit={handleSearch}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search providers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" className="sm:w-auto">
              Search
            </Button>
          </form>
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 sm:mb-6">
          {error}
        </div>
      )}

      {/* Provider List */}
      <Card noPadding>
        <DataTable
          columns={columns}
          data={providers}
          keyExtractor={(p) => p.id}
          onRowClick={(p) => router.push(`/admin/providers/${p.id}`)}
          loading={loading}
          emptyMessage="No providers found"
          emptyIcon={emptyIcon}
        />

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <div className="text-center text-sm text-gray-500 sm:text-left">
              Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
              {Math.min(
                pagination.page * pagination.limit,
                pagination.totalCount
              )}{" "}
              of {pagination.totalCount}
            </div>
            <div className="flex justify-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage}
              >
                Previous
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setCurrentPage((p) => p + 1)}
                disabled={!pagination.hasNextPage}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
