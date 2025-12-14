"use client";

/**
 * User Management Page
 *
 * Lists all users with filtering by role/status and search.
 * Mobile-first: card view on mobile, table on desktop.
 *
 * @module app/(admin)/admin/users/page
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, DataTable, StatusBadge, Button, Input } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import type { Column } from "@/components/ui/DataTable";

interface UserOrganization {
  id: string;
  name: string;
  status: string;
  role: string;
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
  userType: "admin" | "provider" | "patient";
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

type RoleFilter = "all" | "admin" | "provider" | "patient";
type StatusFilter = "all" | "active" | "inactive";

export default function UsersPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [users, setUsers] = useState<User[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [roleFilter, setRoleFilter] = useState<RoleFilter>(
    (searchParams.get("role") as RoleFilter) || "all"
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(
    (searchParams.get("status") as StatusFilter) || "all"
  );
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || ""
  );
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page") || "1")
  );

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (roleFilter !== "all") params.set("role", roleFilter);
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("page", currentPage.toString());
      params.set("limit", "20");

      const response = await fetch(`/api/admin/users?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch users");
      }

      setUsers(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [roleFilter, statusFilter, searchQuery, currentPage]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (roleFilter !== "all") params.set("role", roleFilter);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (searchQuery) params.set("search", searchQuery);
    if (currentPage > 1) params.set("page", currentPage.toString());

    const newUrl = params.toString()
      ? `/admin/users?${params}`
      : "/admin/users";
    router.replace(newUrl, { scroll: false });
  }, [roleFilter, statusFilter, searchQuery, currentPage, router]);

  function handleRoleChange(role: RoleFilter) {
    setRoleFilter(role);
    setCurrentPage(1);
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCurrentPage(1);
    fetchUsers();
  }

  function formatDate(dateString: string) {
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
          Admin
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

  // Column definitions for DataTable
  const columns: Column<User>[] = [
    {
      key: "name",
      header: "User",
      mobileTitle: true,
      render: (user) => (
        <div className="flex items-center gap-3">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name}
              className="h-8 w-8 rounded-full"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 text-sm font-medium text-gray-600">
              {user.name.charAt(0).toUpperCase()}
            </div>
          )}
          <div>
            <div className="font-medium text-gray-900">{user.name}</div>
            <div className="text-sm text-gray-500">{user.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "type",
      header: "Type",
      render: (user) => getUserTypeBadge(user.userType, user.isSystemAdmin),
    },
    {
      key: "organizations",
      header: "Organizations",
      hideOnMobile: true,
      render: (user) =>
        user.organizationCount > 0 ? (
          <span className="text-gray-900">{user.organizationCount}</span>
        ) : (
          <span className="text-gray-400">—</span>
        ),
    },
    {
      key: "status",
      header: "Status",
      render: (user) => (
        <StatusBadge
          status={user.emailVerified ? "approved" : "pending"}
          label={user.emailVerified ? "Verified" : "Unverified"}
        />
      ),
    },
    {
      key: "createdAt",
      header: "Joined",
      hideOnMobile: true,
      render: (user) => formatDate(user.createdAt),
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
        d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
      />
    </svg>
  );

  return (
    <div>
      <PageHeader
        title="User Management"
        description="View and manage platform users"
      />

      {/* Filters */}
      <Card className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-4">
          {/* Role Tabs - Scrollable on mobile */}
          <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
            <div className="inline-flex min-w-full space-x-1 rounded-lg bg-gray-100 p-1 sm:min-w-0">
              {(["all", "admin", "provider", "patient"] as RoleFilter[]).map(
                (role) => (
                  <button
                    key={role}
                    onClick={() => handleRoleChange(role)}
                    className={`whitespace-nowrap rounded-md px-3 py-2 text-sm font-medium transition-colors sm:px-4 ${
                      roleFilter === role
                        ? "bg-white text-gray-900 shadow-sm"
                        : "text-gray-600 hover:text-gray-900"
                    }`}
                  >
                    {role.charAt(0).toUpperCase() + role.slice(1)}
                    {role === "all" && pagination && (
                      <span className="ml-1.5 rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-700 sm:ml-2">
                        {pagination.totalCount}
                      </span>
                    )}
                  </button>
                )
              )}
            </div>
          </div>

          {/* Search and Status Filter */}
          <div className="flex flex-col gap-2 sm:flex-row">
            <form
              onSubmit={handleSearch}
              className="flex flex-1 flex-col gap-2 sm:flex-row"
            >
              <div className="flex-1">
                <Input
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <Button type="submit" className="sm:w-auto">
                Search
              </Button>
            </form>

            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setCurrentPage(1);
              }}
              className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            >
              <option value="all">All Status</option>
              <option value="active">Verified</option>
              <option value="inactive">Unverified</option>
            </select>
          </div>
        </div>
      </Card>

      {/* Error State */}
      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 sm:mb-6">
          {error}
        </div>
      )}

      {/* User List */}
      <Card noPadding>
        <DataTable
          columns={columns}
          data={users}
          keyExtractor={(u) => u.id}
          onRowClick={(u) => router.push(`/admin/users/${u.id}`)}
          loading={loading}
          emptyMessage="No users found"
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
