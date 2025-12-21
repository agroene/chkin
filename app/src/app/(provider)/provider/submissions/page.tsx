"use client";

/**
 * Provider Submissions Page
 *
 * Lists all form submissions for the organization with filtering,
 * search, and detail view functionality.
 */

import { useEffect, useState, useCallback } from "react";
import { PageHeader } from "@/components/layout";

interface FormTemplate {
  id: string;
  title: string;
}

interface Submission {
  id: string;
  formTemplate: FormTemplate;
  patientName: string | null;
  patientEmail: string | null;
  isAnonymous: boolean;
  status: string;
  consentGiven: boolean;
  source: string;
  createdAt: string;
}

interface SubmissionDetail {
  id: string;
  formTemplate: FormTemplate;
  user: { id: string; name: string; email: string } | null;
  isAnonymous: boolean;
  status: string;
  consentGiven: boolean;
  consentAt: string | null;
  source: string;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
  updatedAt: string;
}

interface SubmissionField {
  id: string;
  name: string;
  label: string;
  type: string;
  section: string | null;
  value: unknown;
  isRequired: boolean;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function ProviderSubmissionsPage() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [forms, setForms] = useState<FormTemplate[]>([]);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  });
  const [loading, setLoading] = useState(true);

  // Filters
  const [selectedForm, setSelectedForm] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");

  // Detail modal state
  const [selectedSubmission, setSelectedSubmission] = useState<{
    submission: SubmissionDetail;
    fields: SubmissionField[];
    sections: Record<string, SubmissionField[]>;
  } | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [updating, setUpdating] = useState(false);

  const fetchSubmissions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("page", pagination.page.toString());
      params.set("limit", "20");
      if (selectedForm !== "all") params.set("formId", selectedForm);
      if (selectedStatus !== "all") params.set("status", selectedStatus);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const response = await fetch(`/api/provider/submissions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions);
        setForms(data.forms);
        setPagination(data.pagination);
      }
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }, [pagination.page, selectedForm, selectedStatus, dateFrom, dateTo]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [selectedForm, selectedStatus, dateFrom, dateTo]);

  // Fetch submission detail
  async function handleViewSubmission(id: string) {
    setDetailLoading(true);
    try {
      const response = await fetch(`/api/provider/submissions/${id}`);
      if (response.ok) {
        const data = await response.json();
        setSelectedSubmission(data);
      }
    } catch {
      // Handle error silently
    } finally {
      setDetailLoading(false);
    }
  }

  // Mark submission as reviewed
  async function handleMarkReviewed() {
    if (!selectedSubmission) return;

    setUpdating(true);
    try {
      const response = await fetch(
        `/api/provider/submissions/${selectedSubmission.submission.id}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "reviewed" }),
        }
      );

      if (response.ok) {
        // Update local state
        setSelectedSubmission((prev) =>
          prev
            ? {
                ...prev,
                submission: { ...prev.submission, status: "reviewed" },
              }
            : null
        );
        // Update list
        setSubmissions((prev) =>
          prev.map((s) =>
            s.id === selectedSubmission.submission.id
              ? { ...s, status: "reviewed" }
              : s
          )
        );
      }
    } catch {
      // Handle error silently
    } finally {
      setUpdating(false);
    }
  }

  // Format date
  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  // Format field value for display
  function formatFieldValue(value: unknown, type: string): string {
    if (value === null || value === undefined || value === "") {
      return "-";
    }

    if (type === "checkbox") {
      return value ? "Yes" : "No";
    }

    if (type === "date" && typeof value === "string") {
      return new Date(value).toLocaleDateString("en-ZA");
    }

    if (type === "datetime" && typeof value === "string") {
      return formatDate(value);
    }

    if (Array.isArray(value)) {
      return value.join(", ");
    }

    return String(value);
  }

  // Get status badge color
  function getStatusBadge(status: string) {
    switch (status) {
      case "completed":
        return "bg-green-100 text-green-700";
      case "reviewed":
        return "bg-blue-100 text-blue-700";
      case "pending":
        return "bg-yellow-100 text-yellow-700";
      default:
        return "bg-gray-100 text-gray-700";
    }
  }

  return (
    <>
      <PageHeader
        title="Submissions"
        description="View and manage patient form submissions"
      />

      {/* Filters */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Form Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Form
          </label>
          <select
            value={selectedForm}
            onChange={(e) => setSelectedForm(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Forms</option>
            {forms.map((form) => (
              <option key={form.id} value={form.id}>
                {form.title}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Status
          </label>
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="completed">Completed</option>
            <option value="reviewed">Reviewed</option>
          </select>
        </div>

        {/* Date From */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            From Date
          </label>
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>

        {/* Date To */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            To Date
          </label>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          />
        </div>
      </div>

      {/* Clear Filters */}
      {(selectedForm !== "all" ||
        selectedStatus !== "all" ||
        dateFrom ||
        dateTo) && (
        <div className="mt-3">
          <button
            onClick={() => {
              setSelectedForm("all");
              setSelectedStatus("all");
              setDateFrom("");
              setDateTo("");
            }}
            className="text-sm text-teal-600 hover:text-teal-700"
          >
            Clear all filters
          </button>
        </div>
      )}

      {/* Submissions Table */}
      <div className="mt-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-16 animate-pulse rounded-lg border border-gray-200 bg-gray-100"
              />
            ))}
          </div>
        ) : submissions.length === 0 ? (
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
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              No submissions found
            </h3>
            <p className="mt-2 text-sm text-gray-500">
              {selectedForm !== "all" || selectedStatus !== "all" || dateFrom || dateTo
                ? "Try adjusting your filters"
                : "Submissions will appear here when patients complete your forms"}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Patient
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Form
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {submissions.map((submission) => (
                  <tr key={submission.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4">
                      <div className="flex items-center">
                        {submission.isAnonymous ? (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200">
                            <svg
                              className="h-4 w-4 text-gray-500"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                              />
                            </svg>
                          </div>
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-teal-100">
                            <span className="text-sm font-medium text-teal-700">
                              {(submission.patientName || "U")[0].toUpperCase()}
                            </span>
                          </div>
                        )}
                        <div className="ml-3">
                          <p className="text-sm font-medium text-gray-900">
                            {submission.patientName || "Anonymous"}
                          </p>
                          {submission.patientEmail && (
                            <p className="text-xs text-gray-500">
                              {submission.patientEmail}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-700">
                      {submission.formTemplate.title}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
                      {formatDate(submission.createdAt)}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span
                        className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(
                          submission.status
                        )}`}
                      >
                        {submission.status.charAt(0).toUpperCase() +
                          submission.status.slice(1)}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-right">
                      <button
                        onClick={() => handleViewSubmission(submission.id)}
                        className="text-sm font-medium text-teal-600 hover:text-teal-700"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && pagination.totalPages > 1 && (
        <div className="mt-6 flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
            {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
            {pagination.total} submissions
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

      {/* Detail Modal */}
      {(selectedSubmission || detailLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative max-h-[90vh] w-full max-w-3xl overflow-auto rounded-xl bg-white shadow-2xl">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-6 py-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  Submission Details
                </h2>
                {selectedSubmission && (
                  <p className="text-sm text-gray-500">
                    {selectedSubmission.submission.formTemplate.title}
                  </p>
                )}
              </div>
              <button
                onClick={() => setSelectedSubmission(null)}
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

            {/* Modal Content */}
            <div className="p-6">
              {detailLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
                </div>
              ) : selectedSubmission ? (
                <div className="space-y-6">
                  {/* Summary Info */}
                  <div className="grid gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <p className="text-xs font-medium uppercase text-gray-500">
                        Patient
                      </p>
                      <p className="mt-1 text-sm font-medium text-gray-900">
                        {selectedSubmission.submission.user?.name || "Anonymous"}
                      </p>
                      {selectedSubmission.submission.user?.email && (
                        <p className="text-xs text-gray-500">
                          {selectedSubmission.submission.user.email}
                        </p>
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-gray-500">
                        Submitted
                      </p>
                      <p className="mt-1 text-sm text-gray-900">
                        {formatDate(selectedSubmission.submission.createdAt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-gray-500">
                        Status
                      </p>
                      <span
                        className={`mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${getStatusBadge(
                          selectedSubmission.submission.status
                        )}`}
                      >
                        {selectedSubmission.submission.status
                          .charAt(0)
                          .toUpperCase() +
                          selectedSubmission.submission.status.slice(1)}
                      </span>
                    </div>
                    <div>
                      <p className="text-xs font-medium uppercase text-gray-500">
                        Consent
                      </p>
                      <p className="mt-1 text-sm text-gray-900">
                        {selectedSubmission.submission.consentGiven ? (
                          <span className="flex items-center gap-1 text-green-600">
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
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                            Given
                          </span>
                        ) : (
                          <span className="text-gray-500">Not given</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Form Data by Section */}
                  {Object.entries(selectedSubmission.sections).map(
                    ([sectionName, fields]) => (
                      <div key={sectionName}>
                        <h3 className="mb-3 text-sm font-semibold text-gray-900">
                          {sectionName}
                        </h3>
                        <div className="overflow-hidden rounded-lg border border-gray-200">
                          <table className="min-w-full divide-y divide-gray-200">
                            <tbody className="divide-y divide-gray-200 bg-white">
                              {fields.map((field) => (
                                <tr key={field.id}>
                                  <td className="w-1/3 whitespace-nowrap px-4 py-3 text-sm font-medium text-gray-500">
                                    {field.label}
                                    {field.isRequired && (
                                      <span className="ml-1 text-red-500">*</span>
                                    )}
                                  </td>
                                  <td className="px-4 py-3 text-sm text-gray-900">
                                    {formatFieldValue(field.value, field.type)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )
                  )}

                  {/* Technical Details (collapsible) */}
                  <details className="rounded-lg border border-gray-200">
                    <summary className="cursor-pointer px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50">
                      Technical Details
                    </summary>
                    <div className="border-t border-gray-200 px-4 py-3 text-sm text-gray-500">
                      <p>
                        <span className="font-medium">Source:</span>{" "}
                        {selectedSubmission.submission.source}
                      </p>
                      {selectedSubmission.submission.ipAddress && (
                        <p>
                          <span className="font-medium">IP Address:</span>{" "}
                          {selectedSubmission.submission.ipAddress}
                        </p>
                      )}
                      {selectedSubmission.submission.userAgent && (
                        <p className="mt-1 break-all">
                          <span className="font-medium">User Agent:</span>{" "}
                          {selectedSubmission.submission.userAgent}
                        </p>
                      )}
                    </div>
                  </details>
                </div>
              ) : null}
            </div>

            {/* Modal Footer */}
            {selectedSubmission &&
              selectedSubmission.submission.status !== "reviewed" && (
                <div className="sticky bottom-0 border-t border-gray-200 bg-gray-50 px-6 py-4">
                  <button
                    onClick={handleMarkReviewed}
                    disabled={updating}
                    className="inline-flex items-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                  >
                    {updating ? (
                      <>
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Updating...
                      </>
                    ) : (
                      <>
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
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        Mark as Reviewed
                      </>
                    )}
                  </button>
                </div>
              )}
          </div>
        </div>
      )}
    </>
  );
}
