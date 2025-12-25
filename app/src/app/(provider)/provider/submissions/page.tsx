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

type ConsentStatus = "ACTIVE" | "EXPIRING" | "GRACE" | "EXPIRED" | "WITHDRAWN" | "NEVER_GIVEN";

interface ConsentInfo {
  given: boolean;
  givenAt: string | null;
  expiresAt: string | null;
  withdrawnAt: string | null;
  status: ConsentStatus;
  statusLabel: string;
  statusColor: "green" | "yellow" | "orange" | "red" | "gray";
  isAccessible: boolean;
  daysRemaining: number | null;
  renewalUrgency: "none" | "low" | "medium" | "high" | "critical";
  message: string;
}

interface PdfSigningInfo {
  hasPdf: boolean;
  isSigned: boolean;
  signedAt: string | null;
  signedDocumentUrl: string | null;
}

interface Submission {
  id: string;
  formTemplate: FormTemplate;
  patientName: string | null;
  patientEmail: string | null;
  isAnonymous: boolean;
  claimedAt: string | null; // When anonymous user registered and claimed this submission
  status: string;
  consentGiven: boolean;
  consent: ConsentInfo;
  pdfSigning: PdfSigningInfo;
  source: string;
  createdAt: string;
}

interface ConsentSummary {
  active: number;
  expiring: number;
  grace: number;
  expired: number;
  withdrawn: number;
  neverGiven: number;
}

interface SubmissionDetailConsentInfo extends ConsentInfo {
  durationMonths: number | null;
  autoRenew: boolean;
  renewedAt: string | null;
  renewalCount: number;
  gracePeriodEndsAt: string | null;
}

interface PdfSigningDetailInfo extends PdfSigningInfo {
  docusealSubmissionId: number | null;
}

interface SubmissionDetail {
  id: string;
  formTemplate: FormTemplate & {
    defaultConsentDuration?: number;
    gracePeriodDays?: number;
  };
  user: { id: string; name: string; email: string } | null;
  isAnonymous: boolean;
  claimedAt: string | null; // When anonymous user registered and claimed this submission
  status: string;
  consentGiven: boolean;
  consentAt: string | null;
  consent: SubmissionDetailConsentInfo;
  pdfSigning: PdfSigningDetailInfo;
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
  const [consentSummary, setConsentSummary] = useState<ConsentSummary | null>(null);
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
  const [selectedConsentStatus, setSelectedConsentStatus] = useState<string>("all");
  const [selectedPatientType, setSelectedPatientType] = useState<string>("all");
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
      if (selectedConsentStatus !== "all") params.set("consentStatus", selectedConsentStatus);
      if (selectedPatientType !== "all") params.set("patientType", selectedPatientType);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      const response = await fetch(`/api/provider/submissions?${params}`);
      if (response.ok) {
        const data = await response.json();
        setSubmissions(data.submissions);
        setForms(data.forms);
        setConsentSummary(data.consentSummary);
        setPagination(data.pagination);
      }
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }, [pagination.page, selectedForm, selectedStatus, selectedConsentStatus, selectedPatientType, dateFrom, dateTo]);

  useEffect(() => {
    fetchSubmissions();
  }, [fetchSubmissions]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPagination((prev) => ({ ...prev, page: 1 }));
  }, [selectedForm, selectedStatus, selectedConsentStatus, selectedPatientType, dateFrom, dateTo]);

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

      {/* Consent Summary Badges */}
      {consentSummary && (consentSummary.expiring > 0 || consentSummary.grace > 0 || consentSummary.expired > 0) && (
        <div className="mt-6 flex flex-wrap gap-2">
          {consentSummary.expiring > 0 && (
            <button
              onClick={() => setSelectedConsentStatus("expiring")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedConsentStatus === "expiring"
                  ? "bg-yellow-500 text-white"
                  : "bg-yellow-100 text-yellow-700 hover:bg-yellow-200"
              }`}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              {consentSummary.expiring} expiring soon
            </button>
          )}
          {(consentSummary.grace > 0 || consentSummary.expired > 0) && (
            <button
              onClick={() => setSelectedConsentStatus("expired")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedConsentStatus === "expired"
                  ? "bg-orange-500 text-white"
                  : "bg-orange-100 text-orange-700 hover:bg-orange-200"
              }`}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              {consentSummary.grace + consentSummary.expired} expired/grace period
            </button>
          )}
          {consentSummary.withdrawn > 0 && (
            <button
              onClick={() => setSelectedConsentStatus("withdrawn")}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
                selectedConsentStatus === "withdrawn"
                  ? "bg-gray-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
              {consentSummary.withdrawn} withdrawn
            </button>
          )}
        </div>
      )}

      {/* Filters */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
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

        {/* Patient Type Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Patient Type
          </label>
          <select
            value={selectedPatientType}
            onChange={(e) => setSelectedPatientType(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Patients</option>
            <option value="registered">Registered</option>
            <option value="anonymous">Anonymous</option>
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

        {/* Consent Status Filter */}
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Consent
          </label>
          <select
            value={selectedConsentStatus}
            onChange={(e) => setSelectedConsentStatus(e.target.value)}
            className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
          >
            <option value="all">All Consent</option>
            <option value="active">Active</option>
            <option value="expiring">Expiring Soon</option>
            <option value="expired">Expired/Grace</option>
            <option value="withdrawn">Withdrawn</option>
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
        selectedPatientType !== "all" ||
        selectedStatus !== "all" ||
        selectedConsentStatus !== "all" ||
        dateFrom ||
        dateTo) && (
        <div className="mt-3">
          <button
            onClick={() => {
              setSelectedForm("all");
              setSelectedPatientType("all");
              setSelectedStatus("all");
              setSelectedConsentStatus("all");
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
                    Type
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
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Consent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    PDF
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
                    <td className="whitespace-nowrap px-6 py-4">
                      <PatientTypeBadge
                        isAnonymous={submission.isAnonymous}
                        claimedAt={submission.claimedAt}
                      />
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
                    <td className="whitespace-nowrap px-6 py-4">
                      <ConsentStatusCell consent={submission.consent} />
                    </td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <PdfStatusCell pdfSigning={submission.pdfSigning} />
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
                  <div className="grid gap-4 rounded-lg bg-gray-50 p-4 sm:grid-cols-2 lg:grid-cols-5">
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
                        Type
                      </p>
                      <div className="mt-1">
                        <PatientTypeBadge
                          isAnonymous={selectedSubmission.submission.isAnonymous}
                          claimedAt={selectedSubmission.submission.claimedAt}
                        />
                      </div>
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
                      <div className="mt-1">
                        <ConsentStatusCell consent={selectedSubmission.submission.consent} />
                      </div>
                    </div>
                  </div>

                  {/* Consent Details Card */}
                  {selectedSubmission.submission.consent.given && (
                    <div className="rounded-lg border border-gray-200 p-4">
                      <h3 className="mb-3 text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                        </svg>
                        Consent Details
                      </h3>
                      <div className="grid gap-3 sm:grid-cols-2 text-sm">
                        <div>
                          <span className="text-gray-500">Given:</span>{" "}
                          <span className="text-gray-900">
                            {selectedSubmission.submission.consent.givenAt
                              ? formatDate(selectedSubmission.submission.consent.givenAt)
                              : "—"}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-500">Expires:</span>{" "}
                          <span className="text-gray-900">
                            {selectedSubmission.submission.consent.expiresAt
                              ? formatDate(selectedSubmission.submission.consent.expiresAt)
                              : "No expiry"}
                          </span>
                        </div>
                        {selectedSubmission.submission.consent.daysRemaining !== null && (
                          <div>
                            <span className="text-gray-500">Days remaining:</span>{" "}
                            <span className={`font-medium ${
                              selectedSubmission.submission.consent.daysRemaining <= 0
                                ? "text-red-600"
                                : selectedSubmission.submission.consent.daysRemaining <= 30
                                ? "text-yellow-600"
                                : "text-gray-900"
                            }`}>
                              {selectedSubmission.submission.consent.daysRemaining}
                            </span>
                          </div>
                        )}
                        <div>
                          <span className="text-gray-500">Auto-renew:</span>{" "}
                          <span className="text-gray-900">
                            {selectedSubmission.submission.consent.autoRenew ? "Yes" : "No"}
                          </span>
                        </div>
                        {selectedSubmission.submission.consent.renewalCount > 0 && (
                          <div>
                            <span className="text-gray-500">Renewals:</span>{" "}
                            <span className="text-gray-900">
                              {selectedSubmission.submission.consent.renewalCount}
                            </span>
                          </div>
                        )}
                        {selectedSubmission.submission.consent.withdrawnAt && (
                          <div className="col-span-2">
                            <span className="text-gray-500">Withdrawn:</span>{" "}
                            <span className="text-red-600">
                              {formatDate(selectedSubmission.submission.consent.withdrawnAt)}
                            </span>
                          </div>
                        )}
                      </div>
                      {!selectedSubmission.submission.consent.isAccessible && (
                        <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                          <strong>Access Restricted:</strong> {selectedSubmission.submission.consent.message}
                        </div>
                      )}
                    </div>
                  )}

                  {/* PDF Signing Details Card */}
                  {selectedSubmission.submission.pdfSigning?.hasPdf && (
                    <div className="rounded-lg border border-gray-200 p-4">
                      <h3 className="mb-3 text-sm font-semibold text-gray-900 flex items-center gap-2">
                        <svg className="h-4 w-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        PDF Document
                      </h3>
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          {selectedSubmission.submission.pdfSigning.isSigned ? (
                            <>
                              <span className="inline-flex items-center gap-1.5 text-green-700">
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Signed
                              </span>
                              {selectedSubmission.submission.pdfSigning.signedAt && (
                                <span className="ml-2 text-gray-500">
                                  on {formatDate(selectedSubmission.submission.pdfSigning.signedAt)}
                                </span>
                              )}
                            </>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-yellow-600">
                              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                              Awaiting signature
                            </span>
                          )}
                        </div>
                        {selectedSubmission.submission.pdfSigning.isSigned &&
                          selectedSubmission.submission.pdfSigning.signedDocumentUrl && (
                            <a
                              href={selectedSubmission.submission.pdfSigning.signedDocumentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 rounded-lg bg-teal-50 px-3 py-1.5 text-sm font-medium text-teal-700 hover:bg-teal-100"
                            >
                              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                              </svg>
                              Download Signed PDF
                            </a>
                          )}
                      </div>
                    </div>
                  )}

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

// Consent status cell component for the table
function ConsentStatusCell({ consent }: { consent: ConsentInfo }) {
  const { status, daysRemaining, statusLabel, isAccessible, renewalUrgency } = consent;

  // Color classes based on status
  const colorClasses: Record<ConsentStatus, string> = {
    ACTIVE: "bg-green-100 text-green-700",
    EXPIRING: "bg-yellow-100 text-yellow-700",
    GRACE: "bg-orange-100 text-orange-700",
    EXPIRED: "bg-red-100 text-red-700",
    WITHDRAWN: "bg-gray-100 text-gray-500",
    NEVER_GIVEN: "bg-gray-100 text-gray-500",
  };

  // Icon based on status
  const getIcon = () => {
    switch (status) {
      case "ACTIVE":
        return (
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "EXPIRING":
        return (
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
              clipRule="evenodd"
            />
          </svg>
        );
      case "GRACE":
      case "EXPIRED":
        return (
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        );
      default:
        return (
          <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        );
    }
  };

  // Build label
  const getLabel = () => {
    if (status === "ACTIVE") {
      return "Active";
    }
    if (status === "EXPIRING" && daysRemaining !== null) {
      return `${daysRemaining}d left`;
    }
    if (status === "GRACE") {
      return "Grace";
    }
    if (status === "EXPIRED") {
      return "Expired";
    }
    if (status === "WITHDRAWN") {
      return "Withdrawn";
    }
    return statusLabel || "None";
  };

  // Animate urgently if needed
  const urgentClass = renewalUrgency === "critical" ? "animate-pulse" : "";

  // Access indicator (whether provider can still access data)
  const accessIndicator = isAccessible ? null : (
    <span className="ml-1 text-xs text-red-500" title="Data access restricted">
      🔒
    </span>
  );

  return (
    <div className="flex items-center gap-1">
      <span
        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colorClasses[status]} ${urgentClass}`}
      >
        {getIcon()}
        {getLabel()}
      </span>
      {accessIndicator}
    </div>
  );
}

// PDF status cell component for the table
function PdfStatusCell({ pdfSigning }: { pdfSigning: PdfSigningInfo }) {
  if (!pdfSigning?.hasPdf) {
    return (
      <span className="text-xs text-gray-400">—</span>
    );
  }

  if (pdfSigning.isSigned) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
        Signed
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-700">
      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
        <path
          fillRule="evenodd"
          d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z"
          clipRule="evenodd"
        />
      </svg>
      Pending
    </span>
  );
}

// Patient type badge component showing Anonymous/Registered/Converted status
function PatientTypeBadge({
  isAnonymous,
  claimedAt,
}: {
  isAnonymous: boolean;
  claimedAt: string | null;
}) {
  // Registered user (logged in when submitting)
  if (!isAnonymous) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
            clipRule="evenodd"
          />
        </svg>
        Registered
      </span>
    );
  }

  // Anonymous but converted (registered after submission)
  if (claimedAt) {
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700"
        title={`User registered on ${new Date(claimedAt).toLocaleDateString()}`}
      >
        <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
        Converted
      </span>
    );
  }

  // Anonymous (not yet converted)
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-600">
      <svg
        className="h-3 w-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      Anonymous
    </span>
  );
}
