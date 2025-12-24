/**
 * Submission Detail Page
 *
 * Shows full details of a form submission including:
 * - Organization info
 * - Form details
 * - All submitted data
 * - Consent status with withdrawal option
 */

"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";

type ConsentStatus = "ACTIVE" | "EXPIRING" | "GRACE" | "EXPIRED" | "WITHDRAWN" | "NEVER_GIVEN";

interface Field {
  name: string;
  label: string;
  value: unknown;
  fieldType: string;
  section: string | null;
  specialPersonalInfo: boolean;
}

interface SubmissionDetail {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: string;
  consent: {
    given: boolean;
    givenAt: string | null;
    token: string | null;
    clause: string | null;
    withdrawnAt: string | null;
    withdrawalReason: string | null;
    isActive: boolean;
    // Time-bound consent fields
    expiresAt: string | null;
    durationMonths: number | null;
    autoRenew: boolean;
    renewedAt: string | null;
    renewalCount: number;
    status: ConsentStatus;
    statusLabel: string;
    statusColor: string;
    isAccessible: boolean;
    daysRemaining: number | null;
    gracePeriodEndsAt: string | null;
    canRenew: boolean;
    renewalUrgency: string;
    message: string;
  };
  form: {
    id: string;
    title: string;
    description: string | null;
    defaultConsentDuration: number;
    gracePeriodDays: number;
    allowAutoRenewal: boolean;
  };
  organization: {
    id: string;
    name: string;
    logo: string | null;
    industryType: string | null;
    phone: string | null;
    streetAddress: string | null;
    city: string | null;
    province: string | null;
  };
  fields: Field[];
  fieldCount: number;
}

// Industry type to icon mapping
const industryIcons: Record<string, string> = {
  "General Practice": "🏥",
  Specialist: "👨‍⚕️",
  Dental: "🦷",
  Pharmacy: "💊",
  Physiotherapy: "🏃",
  Psychology: "🧠",
  Optometry: "👁️",
  Veterinary: "🐾",
  Other: "🏢",
};

export default function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [submission, setSubmission] = useState<SubmissionDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Withdrawal modal state
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);

  // Renewal modal state
  const [showRenewModal, setShowRenewModal] = useState(false);
  const [renewing, setRenewing] = useState(false);

  useEffect(() => {
    fetchSubmission();
  }, [id]);

  const fetchSubmission = async () => {
    try {
      const response = await fetch(`/api/patient/submissions/${id}`);
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        if (response.status === 404) {
          setError("Check-in not found");
          return;
        }
        throw new Error("Failed to load submission");
      }
      const data = await response.json();
      setSubmission(data);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load check-in details. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleWithdrawConsent = async () => {
    setWithdrawing(true);
    try {
      const response = await fetch(`/api/patient/submissions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "withdraw_consent",
          reason: withdrawReason || null,
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to withdraw consent");
      }

      // Refresh the submission data
      await fetchSubmission();
      setShowWithdrawModal(false);
      setWithdrawReason("");
    } catch (err) {
      console.error("Withdraw error:", err);
      setError(err instanceof Error ? err.message : "Failed to withdraw consent");
    } finally {
      setWithdrawing(false);
    }
  };

  const handleRenewConsent = async () => {
    setRenewing(true);
    try {
      const response = await fetch(`/api/patient/submissions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "renew_consent",
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to renew consent");
      }

      // Refresh the submission data
      await fetchSubmission();
      setShowRenewModal(false);
    } catch (err) {
      console.error("Renew error:", err);
      setError(err instanceof Error ? err.message : "Failed to renew consent");
    } finally {
      setRenewing(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const formatValue = (value: unknown, fieldType: string): string => {
    if (value === null || value === undefined || value === "") {
      return "Not provided";
    }

    if (fieldType === "date" && typeof value === "string") {
      return new Date(value).toLocaleDateString("en-ZA", {
        day: "numeric",
        month: "long",
        year: "numeric",
      });
    }

    if (fieldType === "checkbox") {
      return value ? "Yes" : "No";
    }

    if (Array.isArray(value)) {
      return value.join(", ");
    }

    return String(value);
  };

  // Mask sensitive values
  const maskValue = (value: string, fieldName: string): string => {
    if (!value) return value;

    // Mask ID numbers
    if (fieldName.toLowerCase().includes("id") && value.length > 4) {
      return "****" + value.slice(-4);
    }

    // Mask phone numbers
    if (fieldName.toLowerCase().includes("phone") && value.length > 4) {
      return value.slice(0, -4) + "****";
    }

    return value;
  };

  const getIndustryIcon = (industryType: string | null) => {
    return industryIcons[industryType || "Other"] || "🏢";
  };

  // Group fields by section
  const groupFieldsBySection = (fields: Field[]) => {
    const sections: Record<string, Field[]> = {};
    for (const field of fields) {
      const section = field.section || "Other Information";
      if (!sections[section]) {
        sections[section] = [];
      }
      sections[section].push(field);
    }
    return sections;
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
          <p className="mt-2 text-sm text-gray-500">Loading details...</p>
        </div>
      </div>
    );
  }

  if (error && !submission) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-full p-2 hover:bg-gray-100"
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Check-in Details</h1>
          </div>
        </div>
        <div className="px-4 py-12 text-center">
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => router.back()}
            className="mt-4 text-teal-600 hover:underline"
          >
            Go back
          </button>
        </div>
      </div>
    );
  }

  if (!submission) return null;

  const fieldSections = groupFieldsBySection(submission.fields);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-lg px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.back()}
              className="rounded-full p-2 hover:bg-gray-100"
              aria-label="Go back"
            >
              <svg className="h-5 w-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h1 className="text-lg font-semibold text-gray-900">Check-in Details</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-lg px-4 py-6 space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Organization Card */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-gray-100 text-3xl">
              {getIndustryIcon(submission.organization.industryType)}
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-lg font-semibold text-gray-900">
                {submission.organization.name}
              </h2>
              <p className="text-sm text-gray-500">{submission.form.title}</p>
              {submission.organization.streetAddress && (
                <p className="mt-1 text-xs text-gray-400">
                  {submission.organization.streetAddress}
                  {submission.organization.city && `, ${submission.organization.city}`}
                </p>
              )}
            </div>
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            Submitted on {formatDate(submission.createdAt)}
          </div>
        </div>

        {/* Consent Status Card */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-3 font-semibold text-gray-900 flex items-center gap-2">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Consent Status
          </h3>

          {/* Status display based on consent state */}
          {submission.consent.status === "ACTIVE" && (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <div className="flex items-center gap-2 text-green-700">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Consent Active</span>
              </div>
              <p className="mt-1 text-sm text-green-600">
                Given on {formatDate(submission.consent.givenAt || submission.createdAt)}
              </p>
              {submission.consent.expiresAt && (
                <p className="mt-1 text-xs text-green-500">
                  Expires on {formatDate(submission.consent.expiresAt)}
                  {submission.consent.daysRemaining !== null && ` (${submission.consent.daysRemaining} days)`}
                </p>
              )}
              {submission.consent.autoRenew && (
                <p className="mt-1 text-xs text-green-500">Auto-renewal enabled</p>
              )}
            </div>
          )}

          {submission.consent.status === "EXPIRING" && (
            <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3">
              <div className="flex items-center gap-2 text-yellow-700">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Expiring Soon</span>
              </div>
              <p className="mt-1 text-sm text-yellow-600">
                Expires in {submission.consent.daysRemaining} days ({submission.consent.expiresAt && formatDate(submission.consent.expiresAt)})
              </p>
              <p className="mt-1 text-xs text-yellow-500">
                Renew now to maintain continuous access
              </p>
            </div>
          )}

          {submission.consent.status === "GRACE" && (
            <div className="rounded-lg border border-orange-200 bg-orange-50 p-3">
              <div className="flex items-center gap-2 text-orange-700">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Grace Period</span>
              </div>
              <p className="mt-1 text-sm text-orange-600">
                Consent expired. Grace period ends {submission.consent.gracePeriodEndsAt && formatDate(submission.consent.gracePeriodEndsAt)}
              </p>
              <p className="mt-1 text-xs text-orange-500">
                {submission.organization.name} still has access during grace period
              </p>
            </div>
          )}

          {submission.consent.status === "EXPIRED" && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <div className="flex items-center gap-2 text-red-700">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Consent Expired</span>
              </div>
              <p className="mt-1 text-sm text-red-600">
                Expired on {submission.consent.expiresAt && formatDate(submission.consent.expiresAt)}
              </p>
              <p className="mt-1 text-xs text-red-500">
                {submission.organization.name} no longer has access to your data
              </p>
            </div>
          )}

          {submission.consent.status === "WITHDRAWN" && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
              <div className="flex items-center gap-2 text-gray-600">
                <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">Consent Withdrawn</span>
              </div>
              <p className="mt-1 text-sm text-gray-500">
                Withdrawn on {formatDate(submission.consent.withdrawnAt!)}
              </p>
              {submission.consent.withdrawalReason && (
                <p className="mt-1 text-xs text-gray-400">
                  Reason: {submission.consent.withdrawalReason}
                </p>
              )}
            </div>
          )}

          {/* Renewal info for renewed consents */}
          {submission.consent.renewalCount > 0 && (
            <div className="mt-3 text-xs text-gray-500">
              Renewed {submission.consent.renewalCount} time{submission.consent.renewalCount !== 1 ? "s" : ""}
              {submission.consent.renewedAt && `, last on ${formatDate(submission.consent.renewedAt)}`}
            </div>
          )}

          {/* Consent clause */}
          {submission.consent.clause && (
            <div className="mt-3">
              <button
                className="text-sm text-teal-600 hover:underline"
                onClick={() => {
                  const el = document.getElementById("consent-clause");
                  if (el) el.classList.toggle("hidden");
                }}
              >
                View consent terms
              </button>
              <div id="consent-clause" className="mt-2 hidden rounded-lg bg-gray-50 p-3 text-xs text-gray-600">
                {submission.consent.clause}
              </div>
            </div>
          )}

          {/* Action buttons */}
          <div className="mt-4 flex gap-2">
            {/* Renew button - show for EXPIRING, GRACE, or EXPIRED */}
            {submission.consent.canRenew && (
              <button
                onClick={() => setShowRenewModal(true)}
                className="flex-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
              >
                Renew Consent
              </button>
            )}

            {/* Withdraw button - show only for accessible consents */}
            {submission.consent.isAccessible && submission.consent.status !== "WITHDRAWN" && (
              <button
                onClick={() => setShowWithdrawModal(true)}
                className="flex-1 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100"
              >
                Withdraw
              </button>
            )}
          </div>
        </div>

        {/* Submitted Data */}
        <div className="rounded-xl bg-white p-4 shadow-sm">
          <h3 className="mb-4 font-semibold text-gray-900 flex items-center gap-2">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            What You Submitted
          </h3>

          <div className="space-y-6">
            {Object.entries(fieldSections).map(([section, fields]) => (
              <div key={section}>
                <h4 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                  {section}
                </h4>
                <div className="space-y-3">
                  {fields.map((field) => {
                    const formattedValue = formatValue(field.value, field.fieldType);
                    const displayValue = field.specialPersonalInfo
                      ? maskValue(formattedValue, field.name)
                      : formattedValue;

                    return (
                      <div key={field.name} className="border-b border-gray-100 pb-3 last:border-0">
                        <p className="text-xs text-gray-400">{field.label}</p>
                        <p className={`mt-0.5 text-sm ${formattedValue === "Not provided" ? "text-gray-400 italic" : "text-gray-900"}`}>
                          {displayValue}
                          {field.specialPersonalInfo && formattedValue !== "Not provided" && (
                            <span className="ml-1 text-amber-500" title="Sensitive information">*</span>
                          )}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Export button */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <a
              href={`/api/patient/submissions/${id}/export`}
              download
              className="flex items-center justify-center gap-2 w-full rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download My Data
            </a>
          </div>
        </div>

        {/* Data Rights Notice */}
        <div className="rounded-xl border border-teal-100 bg-teal-50 p-4">
          <div className="flex gap-3">
            <svg className="h-5 w-5 flex-shrink-0 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-sm text-teal-700">
              <p className="font-medium">Your Data Rights (POPIA)</p>
              <p className="mt-1 text-teal-600">
                You have the right to access, correct, or request deletion of your personal information.
                Withdrawing consent does not affect the lawfulness of processing before withdrawal.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Withdraw Consent Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 sm:rounded-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Withdraw Consent?</h3>

            <div className="mt-4 rounded-lg bg-amber-50 p-3">
              <div className="flex gap-2">
                <svg className="h-5 w-5 flex-shrink-0 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div className="text-sm text-amber-700">
                  <p className="font-medium">What this means:</p>
                  <ul className="mt-1 list-disc pl-4 space-y-1 text-amber-600">
                    <li>{submission.organization.name} will no longer be able to access your submitted information</li>
                    <li>Your data will be marked as consent-withdrawn</li>
                    <li>This action is logged for your records</li>
                  </ul>
                </div>
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Note: The practice may retain your data for legal/medical record requirements as permitted by POPIA.
            </p>

            <div className="mt-4">
              <label className="text-sm font-medium text-gray-700">
                Reason for withdrawal (optional)
              </label>
              <textarea
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                rows={2}
                placeholder="e.g., No longer a patient, changed provider..."
              />
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => {
                  setShowWithdrawModal(false);
                  setWithdrawReason("");
                }}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={withdrawing}
              >
                Cancel
              </button>
              <button
                onClick={handleWithdrawConsent}
                disabled={withdrawing}
                className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
              >
                {withdrawing ? "Withdrawing..." : "Withdraw Consent"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Renew Consent Modal */}
      {showRenewModal && submission && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 sm:items-center">
          <div className="w-full max-w-md rounded-t-2xl bg-white p-6 sm:rounded-2xl">
            <h3 className="text-lg font-semibold text-gray-900">Renew Consent?</h3>

            <div className="mt-4 rounded-lg bg-teal-50 p-3">
              <div className="flex gap-2">
                <svg className="h-5 w-5 flex-shrink-0 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <div className="text-sm text-teal-700">
                  <p className="font-medium">What this means:</p>
                  <ul className="mt-1 list-disc pl-4 space-y-1 text-teal-600">
                    <li>{submission.organization.name} will continue to have access to your data</li>
                    <li>Your consent will be extended for {submission.form.defaultConsentDuration} months</li>
                    <li>You can withdraw consent at any time</li>
                  </ul>
                </div>
              </div>
            </div>

            {submission.consent.expiresAt && (
              <p className="mt-3 text-sm text-gray-600">
                Current expiry: {formatDate(submission.consent.expiresAt)}
              </p>
            )}

            <div className="mt-6 flex gap-3">
              <button
                onClick={() => setShowRenewModal(false)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                disabled={renewing}
              >
                Cancel
              </button>
              <button
                onClick={handleRenewConsent}
                disabled={renewing}
                className="flex-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                {renewing ? "Renewing..." : "Renew Consent"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
