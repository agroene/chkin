"use client";

/**
 * Field Library Page
 *
 * Lists all field definitions with filtering by category, type, and status.
 * Mobile-first: card view on mobile, table on desktop.
 *
 * @module app/(admin)/admin/fields/page
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, Button, Input } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import FieldLibraryList from "@/components/admin/FieldLibraryList";

interface FieldDefinition {
  id: string;
  name: string;
  label: string;
  description: string;
  fieldType: string;
  category: string;
  config: Record<string, unknown> | null;
  validation: Record<string, unknown> | null;
  sortOrder: number;
  isActive: boolean;
  specialPersonalInfo: boolean;
  requiresExplicitConsent: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

interface CategoryInfo {
  key: string;
  displayName: string;
  description: string;
  tier: "core" | "industry";
  fieldCount: number;
  activeFieldCount: number;
  specialInfoCount: number;
}

interface PaginationInfo {
  page: number;
  limit: number;
  totalCount: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export default function FieldsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [categoryFilter, setCategoryFilter] = useState(
    searchParams.get("category") || ""
  );
  const [isActiveFilter, setIsActiveFilter] = useState(
    searchParams.get("isActive") || "all"
  );
  const [searchQuery, setSearchQuery] = useState(
    searchParams.get("search") || ""
  );
  const [currentPage, setCurrentPage] = useState(
    parseInt(searchParams.get("page") || "1")
  );
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [reorderError, setReorderError] = useState("");

  // Handle reorder from drag-and-drop
  async function handleReorder(fieldIds: string[]) {
    if (!categoryFilter) {
      setReorderError("Please select a category to reorder fields");
      return;
    }

    setReorderError("");

    try {
      const response = await fetch("/api/admin/fields/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: categoryFilter,
          fieldIds,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reorder fields");
      }

      // Refresh the field list to show new order
      fetchFields();
    } catch (err) {
      setReorderError(err instanceof Error ? err.message : "Failed to reorder fields");
    }
  }

  // Fetch categories on mount
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch("/api/admin/fields/categories");
        const data = await response.json();
        if (response.ok) {
          setCategories(data.data.categories);
        }
      } catch (err) {
        console.error("Failed to fetch categories:", err);
      }
    }
    fetchCategories();
  }, []);

  const fetchFields = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.set("category", categoryFilter);
      if (isActiveFilter !== "all") params.set("isActive", isActiveFilter);
      if (searchQuery) params.set("search", searchQuery);
      params.set("page", currentPage.toString());
      params.set("limit", "50");

      const response = await fetch(`/api/admin/fields?${params}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch fields");
      }

      setFields(data.data);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, isActiveFilter, searchQuery, currentPage]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();
    if (categoryFilter) params.set("category", categoryFilter);
    if (isActiveFilter !== "all") params.set("isActive", isActiveFilter);
    if (searchQuery) params.set("search", searchQuery);
    if (currentPage > 1) params.set("page", currentPage.toString());

    const newUrl = params.toString()
      ? `/admin/fields?${params}`
      : "/admin/fields";
    router.replace(newUrl, { scroll: false });
  }, [categoryFilter, isActiveFilter, searchQuery, currentPage, router]);

  function handleCategoryChange(category: string) {
    setCategoryFilter(category);
    setCurrentPage(1);
  }

  function handleSearch(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCurrentPage(1);
    fetchFields();
  }

  // Handle delete field
  async function handleDeleteField(field: FieldDefinition, e: React.MouseEvent) {
    e.stopPropagation(); // Prevent row click navigation

    // Build confirmation message
    const isAddressField = field.fieldType === "address";
    const hasUsage = field.usageCount > 0;

    let message = `Are you sure you want to delete "${field.label}"?`;
    if (hasUsage) {
      message = `"${field.label}" is used in ${field.usageCount} form(s) and will only be deactivated (soft delete).`;
    } else if (isAddressField) {
      message = `Delete "${field.label}" and all its linked address sub-fields? This cannot be undone.`;
    } else {
      message = `Permanently delete "${field.label}"? This cannot be undone.`;
    }

    if (!confirm(message)) {
      return;
    }

    setDeletingId(field.id);
    setError("");

    try {
      // Build query params for hard delete with linked fields
      const params = new URLSearchParams();
      if (!hasUsage) {
        params.set("hard", "true");
        if (isAddressField) {
          params.set("deleteLinked", "true");
        }
      }

      const response = await fetch(
        `/api/admin/fields/${field.id}${params.toString() ? `?${params}` : ""}`,
        { method: "DELETE" }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to delete field");
      }

      // Show success message if linked fields were deleted
      if (data.linkedFieldsDeleted?.length > 0) {
        alert(`Deleted ${data.linkedFieldsDeleted.length + 1} fields (including linked address fields)`);
      }

      // Refresh the field list
      fetchFields();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete field");
    } finally {
      setDeletingId(null);
    }
  }

  // Get category counts from the fetched categories
  const coreCategories = categories.filter((c) => c.tier === "core");
  const industryCategories = categories.filter((c) => c.tier === "industry");

  return (
    <div>
      <PageHeader
        title="Field Library"
        description="Manage canonical field definitions for all forms"
      >
        <Button onClick={() => router.push("/admin/fields/new")}>
          Add Field
        </Button>
      </PageHeader>

      {/* Category Tiles */}
      <div className="mb-4 sm:mb-6 space-y-4">
        {/* Core Categories */}
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Core Categories
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8 sm:gap-3">
            {/* All Fields tile */}
            <button
              onClick={() => handleCategoryChange("")}
              className={`rounded-lg border p-3 text-left transition-colors ${
                categoryFilter === ""
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-200 bg-white hover:border-gray-300"
              }`}
            >
              <div className="text-lg font-semibold text-gray-900">
                {pagination?.totalCount || "..."}
              </div>
              <div className="text-sm text-gray-600">All Fields</div>
            </button>

            {/* Core category tiles */}
            {coreCategories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => handleCategoryChange(cat.key)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  categoryFilter === cat.key
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="text-lg font-semibold text-gray-900">
                  {cat.activeFieldCount}
                </div>
                <div className="truncate text-sm text-gray-600">
                  {cat.displayName}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Industry Categories */}
        <div>
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
            Industry Extensions
          </h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8 sm:gap-3">
            {industryCategories.map((cat) => (
              <button
                key={cat.key}
                onClick={() => handleCategoryChange(cat.key)}
                className={`rounded-lg border p-3 text-left transition-colors ${
                  categoryFilter === cat.key
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="text-lg font-semibold text-gray-900">
                  {cat.activeFieldCount}
                </div>
                <div className="truncate text-sm text-gray-600">
                  {cat.displayName}
                </div>
                {cat.specialInfoCount > 0 && (
                  <div className="mt-1">
                    <span className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-xs text-red-800">
                      {cat.specialInfoCount} SPI
                    </span>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <Card className="mb-4 sm:mb-6">
        <div className="flex flex-col gap-2 sm:flex-row">
          <form
            onSubmit={handleSearch}
            className="flex flex-1 flex-col gap-2 sm:flex-row"
          >
            <div className="flex-1">
              <Input
                type="text"
                placeholder="Search by name, label, or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Button type="submit" className="sm:w-auto">
              Search
            </Button>
          </form>

          <select
            value={isActiveFilter}
            onChange={(e) => {
              setIsActiveFilter(e.target.value);
              setCurrentPage(1);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Status</option>
            <option value="true">Active</option>
            <option value="false">Inactive</option>
          </select>
        </div>
      </Card>

      {/* Error State */}
      {(error || reorderError) && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-4 text-red-700 sm:mb-6">
          {error || reorderError}
        </div>
      )}

      {/* Field List */}
      <Card className="p-4">
        <FieldLibraryList
          fields={fields}
          category={categoryFilter}
          onFieldClick={(f) => router.push(`/admin/fields/${f.id}`)}
          onDeleteField={handleDeleteField}
          onReorder={handleReorder}
          deletingId={deletingId}
          loading={loading}
        />

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="mt-4 flex flex-col gap-3 border-t border-gray-200 pt-4 sm:flex-row sm:items-center sm:justify-between">
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
