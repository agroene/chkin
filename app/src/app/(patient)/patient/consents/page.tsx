/**
 * My Consents Page
 *
 * Dedicated consent management hub showing:
 * - Organizations with active/withdrawn consent
 * - Data categories shared with each organization
 * - Quick actions to view details or withdraw
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

interface OrganizationConsent {
  organizationId: string;
  organizationName: string;
  organizationLogo: string | null;
  industryType: string | null;
  hasActiveConsent: boolean;
  hasWithdrawnConsent: boolean;
  firstConsentAt: string | null;
  lastConsentAt: string | null;
  withdrawnAt: string | null;
  totalSubmissions: number;
  activeSubmissions: number;
  withdrawnSubmissions: number;
  dataCategories: string[];
}

interface ConsentsSummary {
  totalOrganizations: number;
  activeConsents: number;
  withdrawnConsents: number;
}

// Industry icons
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

// Category labels
const categoryLabels: Record<string, string> = {
  personal: "Personal Details",
  identity: "Identity Documents",
  contact: "Contact Information",
  address: "Address",
  emergency: "Emergency Contacts",
  medical: "Medical History",
  insurance: "Medical Aid/Insurance",
  responsible: "Responsible Party",
  preferences: "Preferences",
  consent: "Consent Records",
};

export default function ConsentsPage() {
  const router = useRouter();
  const [consents, setConsents] = useState<OrganizationConsent[]>([]);
  const [summary, setSummary] = useState<ConsentsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchConsents();
  }, []);

  const fetchConsents = async () => {
    try {
      const response = await fetch("/api/patient/consents");
      if (!response.ok) {
        if (response.status === 401) {
          router.push("/login");
          return;
        }
        throw new Error("Failed to load consents");
      }
      const data = await response.json();
      setConsents(data.consents);
      setSummary(data.summary);
    } catch (err) {
      console.error("Fetch error:", err);
      setError("Failed to load your consents. Please try again.");
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
    });
  };

  const getIndustryIcon = (industryType: string | null) => {
    return industryIcons[industryType || "Other"] || "🏢";
  };

  const getCategoryLabel = (category: string) => {
    return categoryLabels[category] || category;
  };

  // Separate active and withdrawn
  const activeConsents = consents.filter((c) => c.hasActiveConsent);
  const withdrawnConsents = consents.filter(
    (c) => !c.hasActiveConsent && c.hasWithdrawnConsent
  );

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent"></div>
          <p className="mt-2 text-sm text-gray-500">Loading consents...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
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
          <h1 className="text-lg font-semibold text-gray-900">My Consents</h1>
        </div>
      </div>

      {/* Content */}
      <div className="px-4 py-6 space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Hero Card */}
        <div className="rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 p-5 text-white shadow-lg">
          <div className="flex items-start gap-3">
            <div className="rounded-full bg-white/20 p-2">
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold">You&apos;re in Control</h2>
              <p className="mt-1 text-sm text-teal-100">
                Manage who can access your personal information. View and withdraw
                consent at any time.
              </p>
            </div>
          </div>

          {summary && (
            <div className="mt-4 flex gap-4">
              <div className="rounded-lg bg-white/10 px-3 py-2">
                <p className="text-2xl font-bold">{summary.activeConsents}</p>
                <p className="text-xs text-teal-100">Active</p>
              </div>
              <div className="rounded-lg bg-white/10 px-3 py-2">
                <p className="text-2xl font-bold">{summary.withdrawnConsents}</p>
                <p className="text-xs text-teal-100">Withdrawn</p>
              </div>
              <div className="rounded-lg bg-white/10 px-3 py-2">
                <p className="text-2xl font-bold">{summary.totalOrganizations}</p>
                <p className="text-xs text-teal-100">Providers</p>
              </div>
            </div>
          )}
        </div>

        {consents.length === 0 ? (
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
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-900">No consents yet</h3>
            <p className="mt-1 text-sm text-gray-500">
              When you check in at a healthcare provider, your consent will appear
              here.
            </p>
            <Link
              href="/patient/scan"
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
            >
              Scan QR Code
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Active Consents */}
            {activeConsents.length > 0 && (
              <div>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-gray-500">
                  <span className="h-2 w-2 rounded-full bg-green-500"></span>
                  Active Consents ({activeConsents.length})
                </h2>
                <div className="space-y-3">
                  {activeConsents.map((consent) => (
                    <ConsentCard
                      key={consent.organizationId}
                      consent={consent}
                      formatDate={formatDate}
                      getIndustryIcon={getIndustryIcon}
                      getCategoryLabel={getCategoryLabel}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Withdrawn Consents */}
            {withdrawnConsents.length > 0 && (
              <div>
                <h2 className="mb-3 flex items-center gap-2 text-sm font-medium uppercase tracking-wide text-gray-500">
                  <span className="h-2 w-2 rounded-full bg-gray-400"></span>
                  Withdrawn Consents ({withdrawnConsents.length})
                </h2>
                <div className="space-y-3">
                  {withdrawnConsents.map((consent) => (
                    <ConsentCard
                      key={consent.organizationId}
                      consent={consent}
                      formatDate={formatDate}
                      getIndustryIcon={getIndustryIcon}
                      getCategoryLabel={getCategoryLabel}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* POPIA Info */}
        <div className="rounded-xl border border-gray-200 bg-white p-4">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
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
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            Your Rights Under POPIA
          </h3>
          <ul className="mt-3 space-y-2 text-sm text-gray-600">
            <li className="flex items-start gap-2">
              <svg
                className="h-4 w-4 mt-0.5 text-teal-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Right to access your personal information</span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="h-4 w-4 mt-0.5 text-teal-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Right to correct inaccurate information</span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="h-4 w-4 mt-0.5 text-teal-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Right to withdraw consent at any time</span>
            </li>
            <li className="flex items-start gap-2">
              <svg
                className="h-4 w-4 mt-0.5 text-teal-500"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                  clipRule="evenodd"
                />
              </svg>
              <span>Right to object to processing of your data</span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}

// Consent card component
function ConsentCard({
  consent,
  formatDate,
  getIndustryIcon,
  getCategoryLabel,
}: {
  consent: OrganizationConsent;
  formatDate: (date: string) => string;
  getIndustryIcon: (type: string | null) => string;
  getCategoryLabel: (category: string) => string;
}) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full p-4 text-left"
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 text-2xl">
            {getIndustryIcon(consent.industryType)}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold text-gray-900">
                {consent.organizationName}
              </h3>
              {consent.hasActiveConsent ? (
                <span className="flex-shrink-0 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                  Active
                </span>
              ) : (
                <span className="flex-shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-500">
                  Withdrawn
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-gray-500">
              {consent.hasActiveConsent
                ? `Since ${formatDate(consent.firstConsentAt!)}`
                : `Withdrawn ${formatDate(consent.withdrawnAt!)}`}
            </p>
            <p className="mt-1 text-xs text-gray-400">
              {consent.totalSubmissions} check-in{consent.totalSubmissions !== 1 ? "s" : ""}
            </p>
          </div>

          {/* Expand icon */}
          <svg
            className={`h-5 w-5 text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </div>
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
          {/* Data categories */}
          <div className="mb-3">
            <p className="text-xs font-medium text-gray-500 mb-2">
              Data categories shared:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {consent.dataCategories.map((category) => (
                <span
                  key={category}
                  className="rounded-full bg-white border border-gray-200 px-2 py-0.5 text-xs text-gray-600"
                >
                  {getCategoryLabel(category)}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <button
              onClick={() => router.push(`/patient/submissions?org=${consent.organizationId}`)}
              className="flex-1 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              View Check-ins
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
