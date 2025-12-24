/**
 * My Check-ins Page
 *
 * Lists all form submissions for the patient.
 * Shows organization, form name, date, and consent status.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface Submission {
  id: string;
  createdAt: string;
  status: string;
  consent: {
    given: boolean;
    givenAt: string | null;
    isActive: boolean;
    withdrawnAt: string | null;
  };
  form: {
    id: string;
    title: string;
    description: string | null;
  };
  organization: {
    id: string;
    name: string;
    logo: string | null;
    industryType: string | null;
  };
  preview: Record<string, string>;
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

export default function SubmissionsPage() {
  const router = useRouter();
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      const response = await fetch("/api/patient/submissions");
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to load submissions");
      }
      const data = await response.json();
      setSubmissions(data.submissions);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load your check-ins. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-ZA", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getIndustryIcon = (industryType: string | null) => {
    return industryIcons[industryType || "Other"] || "🏢";
  };

  // Group submissions by active/withdrawn consent
  const activeSubmissions = submissions.filter((s) => s.consent.isActive);
  const withdrawnSubmissions = submissions.filter(
    (s) => s.consent.given && !s.consent.isActive
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
          <p className="mt-2 text-sm text-gray-500">Loading check-ins...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="rounded-full p-2 hover:bg-gray-100"
            aria-label="Go back"
          >
            <svg
              className="h-5 w-5 text-gray-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
          <h1 className="text-lg font-semibold text-gray-900">My Check-ins</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6">
        {error && (
          <div className="mb-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {submissions.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gray-100">
              <svg
                className="h-8 w-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">
              No check-ins yet
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              Scan a QR code at a healthcare provider to check in.
            </p>
            <Link
              href="/patient/scan"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
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
              Scan QR Code
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary */}
            <div className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-teal-100">
                  <svg
                    className="h-5 w-5 text-teal-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">
                    {submissions.length}
                  </p>
                  <p className="text-sm text-gray-500">
                    Total check-in{submissions.length !== 1 ? "s" : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Active consents */}
            {activeSubmissions.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
                  Active Check-ins ({activeSubmissions.length})
                </h2>
                <div className="space-y-3">
                  {activeSubmissions.map((submission) => (
                    <SubmissionCard
                      key={submission.id}
                      submission={submission}
                      formatDate={formatDate}
                      getIndustryIcon={getIndustryIcon}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Withdrawn consents */}
            {withdrawnSubmissions.length > 0 && (
              <div>
                <h2 className="mb-3 text-sm font-medium uppercase tracking-wide text-gray-500">
                  Withdrawn Consent ({withdrawnSubmissions.length})
                </h2>
                <div className="space-y-3">
                  {withdrawnSubmissions.map((submission) => (
                    <SubmissionCard
                      key={submission.id}
                      submission={submission}
                      formatDate={formatDate}
                      getIndustryIcon={getIndustryIcon}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Submission card component
function SubmissionCard({
  submission,
  formatDate,
  getIndustryIcon,
}: {
  submission: Submission;
  formatDate: (date: string) => string;
  getIndustryIcon: (type: string | null) => string;
}) {
  const router = useRouter();

  return (
    <button
      onClick={() => router.push(`/patient/submissions/${submission.id}`)}
      className="w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
    >
      <div className="flex items-start gap-3">
        {/* Organization icon */}
        <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-2xl">
          {getIndustryIcon(submission.organization.industryType)}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900">
            {submission.organization.name}
          </h3>
          <p className="text-sm text-gray-500">{submission.form.title}</p>
          <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1">
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              {formatDate(submission.createdAt)}
            </span>
          </div>
        </div>

        {/* Status and chevron */}
        <div className="flex items-center gap-2">
          {submission.consent.isActive ? (
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              Active
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-1 text-xs font-medium text-gray-500">
              <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
              Withdrawn
            </span>
          )}
          <svg
            className="h-5 w-5 text-gray-400"
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
        </div>
      </div>
    </button>
  );
}
