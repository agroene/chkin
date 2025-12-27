"use client";

/**
 * Provider Forms Page
 *
 * Lists all form templates for the organization with search and filtering.
 * Includes preview functionality to see how forms appear to patients.
 */

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout";
import FormPreview from "@/components/provider/form-builder/FormPreview";

interface FormTemplate {
  id: string;
  title: string;
  description: string | null;
  isActive: boolean;
  version: number;
  createdAt: string;
  updatedAt: string;
  _count: {
    fields: number;
    submissions: number;
    qrCodes: number;
  };
}

interface FormField {
  id: string;
  fieldDefinitionId: string;
  fieldDefinition: {
    id: string;
    name: string;
    label: string;
    description: string | null;
    fieldType: string;
    config: string | null;
    category: string;
  };
  labelOverride: string | null;
  helpText: string | null;
  isRequired: boolean;
  sortOrder: number;
  section: string | null;
  columnSpan: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;
  groupId?: string;
}

interface FormDetails {
  id: string;
  title: string;
  description: string | null;
  consentClause: string | null;
  fields: FormField[];
  sections: string[]; // Ordered array of section names
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ProviderFormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "active" | "inactive">("all");

  // Preview modal state
  const [previewForm, setPreviewForm] = useState<FormDetails | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewMobile, setPreviewMobile] = useState(false);

  const fetchForms = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", "20");
      if (search) params.set("search", search);
      if (status !== "all") params.set("status", status);

      const response = await fetch(`/api/provider/forms?${params}`);
      if (response.ok) {
        const data = await response.json();
        setForms(data.forms);
        setPagination(data.pagination);
      }
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }, [pagination.page, search, status]);

  useEffect(() => {
    fetchForms();
  }, [fetchForms]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagination((prev) => ({ ...prev, page: 1 }));
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  async function handleDelete(id: string, title: string) {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;

    try {
      const response = await fetch(`/api/provider/forms/${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchForms();
      }
    } catch {
      // Handle error silently
    }
  }

  // Fetch form details for preview
  async function handlePreview(id: string) {
    setPreviewLoading(true);
    try {
      const response = await fetch(`/api/provider/forms/${id}`);
      if (response.ok) {
        const data = await response.json();
        setPreviewForm(data.form);
      }
    } catch {
      // Handle error silently
    } finally {
      setPreviewLoading(false);
    }
  }

  // Close preview modal
  function closePreview() {
    setPreviewForm(null);
    setPreviewMobile(false);
  }

  // Get sections for preview - use saved order, fallback to extracting from fields
  function getPreviewSections(form: FormDetails): string[] {
    // Use saved section order if available
    if (form.sections && form.sections.length > 0) {
      return form.sections;
    }
    // Fallback: extract unique sections from fields (legacy forms)
    const sections = new Set<string>();
    form.fields.forEach(f => {
      if (f.section) sections.add(f.section);
    });
    return sections.size > 0 ? Array.from(sections) : ["Default"];
  }

  // Prepare fields for preview - ensure section is set
  function prepareFieldsForPreview(form: FormDetails): FormField[] {
    const sections = getPreviewSections(form);
    return form.fields.map(f => ({
      ...f,
      section: f.section || sections[0],
    }));
  }

  return (
    <>
      <PageHeader
        title="Forms"
        description="Create and manage patient check-in forms"
      >
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
          New Form
        </Link>
      </PageHeader>

      {/* Filters */}
      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <input
            type="text"
            placeholder="Search forms..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-4 py-2 pl-10 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
          <svg
            className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>

        <div className="flex gap-2">
          {(["all", "active", "inactive"] as const).map((s) => (
            <button
              key={s}
              onClick={() => {
                setStatus(s);
                setPagination((prev) => ({ ...prev, page: 1 }));
              }}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                status === s
                  ? "bg-teal-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Forms List */}
      <div className="mt-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-24 animate-pulse rounded-lg border border-gray-200 bg-gray-100"
              />
            ))}
          </div>
        ) : forms.length === 0 ? (
          <div className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 p-12 text-center">
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
            <h3 className="mt-4 text-lg font-medium text-gray-900">No forms found</h3>
            <p className="mt-2 text-sm text-gray-500">
              {search ? "Try adjusting your search terms" : "Create your first form to get started"}
            </p>
            {!search && (
              <div className="mt-6">
                <Link
                  href="/provider/forms/new"
                  className="inline-flex items-center rounded-md bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                >
                  Create New Form
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {forms.map((form) => (
              <div
                key={form.id}
                className="rounded-lg border border-gray-200 bg-white p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900">
                        {form.title}
                      </h3>
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          form.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {form.isActive ? "Active" : "Inactive"}
                      </span>
                      <span className="text-xs text-gray-500">v{form.version}</span>
                    </div>
                    {form.description && (
                      <p className="mt-1 text-sm text-gray-600">{form.description}</p>
                    )}
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M4 6h16M4 10h16M4 14h16M4 18h16"
                          />
                        </svg>
                        {form._count.fields} fields
                      </span>
                      <span className="flex items-center gap-1">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                          />
                        </svg>
                        {form._count.submissions} submissions
                      </span>
                      <span className="flex items-center gap-1">
                        <svg
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"
                          />
                        </svg>
                        {form._count.qrCodes} QR codes
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handlePreview(form.id)}
                      className="rounded-lg p-2 text-gray-500 hover:bg-teal-50 hover:text-teal-600"
                      title="Preview form"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => router.push(`/provider/forms/${form.id}`)}
                      className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                      title="Edit form"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleDelete(form.id, form.title)}
                      className="rounded-lg p-2 text-gray-500 hover:bg-red-50 hover:text-red-600"
                      title="Delete form"
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} forms
          </p>
          <div className="flex gap-2">
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
              }
              disabled={pagination.page === 1}
              className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <button
              onClick={() =>
                setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
              }
              disabled={pagination.page === pagination.totalPages}
              className="rounded-lg border border-gray-300 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {(previewForm || previewLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative max-h-[90vh] w-full max-w-4xl overflow-auto rounded-xl bg-gray-100 shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Form Preview
                </h2>
                <p className="text-sm text-gray-500">
                  {previewForm?.title || "Loading..."}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {/* Mobile/Desktop Toggle */}
                {previewForm && (
                  <div className="flex rounded-lg border border-gray-300 p-1">
                    <button
                      onClick={() => setPreviewMobile(false)}
                      className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                        !previewMobile
                          ? "bg-teal-600 text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                    <button
                      onClick={() => setPreviewMobile(true)}
                      className={`rounded-md px-3 py-1 text-sm font-medium transition-colors ${
                        previewMobile
                          ? "bg-teal-600 text-white"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <svg
                        className="h-5 w-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"
                        />
                      </svg>
                    </button>
                  </div>
                )}
                {/* Close Button */}
                <button
                  onClick={closePreview}
                  className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-700"
                >
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {previewLoading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
                </div>
              ) : previewForm ? (
                <FormPreview
                  title={previewForm.title}
                  description={previewForm.description || ""}
                  fields={prepareFieldsForPreview(previewForm)}
                  sections={getPreviewSections(previewForm)}
                  consentClause={previewForm.consentClause || ""}
                  mobileView={previewMobile}
                />
              ) : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
