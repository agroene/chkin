"use client";

/**
 * Public Form Page
 *
 * Renders a patient check-in form accessed via QR code.
 * Supports both anonymous and authenticated submissions.
 * Pre-fills form data for authenticated users with existing profiles.
 */

import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import PublicFormRenderer from "@/components/patient/PublicFormRenderer";
import RegistrationPrompt from "@/components/patient/RegistrationPrompt";
import ProfileSyncModal from "@/components/patient/ProfileSyncModal";
import SignatureStep from "@/components/patient/SignatureStep";

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
    specialPersonalInfo: boolean;
    requiresExplicitConsent: boolean;
  };
  labelOverride: string | null;
  helpText: string | null;
  isRequired: boolean;
  sortOrder: number;
  section: string | null;
  columnSpan: number;
}

interface ConsentConfig {
  defaultDuration: number;
  minDuration: number;
  maxDuration: number;
  allowAutoRenewal: boolean;
  gracePeriodDays: number;
}

interface FormData {
  id: string;
  title: string;
  description: string | null;
  consentClause: string | null;
  consentConfig?: ConsentConfig;
  pdfEnabled?: boolean;
  fields: FormField[];
  sections: string[];
  organization: {
    id: string;
    name: string;
    logo: string | null;
  };
}

interface ConsentOptions {
  durationMonths: number;
  autoRenew: boolean;
}

interface ProfileDiff {
  fieldName: string;
  fieldLabel: string;
  currentValue: unknown;
  submittedValue: unknown;
}

type PageState =
  | "loading"
  | "form"
  | "error"
  | "signing"
  | "submitted"
  | "registration-prompt"
  | "profile-sync";

interface ErrorState {
  code: string;
  message: string;
}

export default function PublicFormPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const shortCode = params.shortCode as string;

  const [pageState, setPageState] = useState<PageState>("loading");
  const [form, setForm] = useState<FormData | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [prefillData, setPrefillData] = useState<Record<string, unknown> | null>(null);
  const [error, setError] = useState<ErrorState | null>(null);
  const [submissionId, setSubmissionId] = useState<string | null>(null);
  const [anonymousToken, setAnonymousToken] = useState<string | null>(null);
  const [profileDiff, setProfileDiff] = useState<ProfileDiff[] | null>(null);
  const [submittedFormData, setSubmittedFormData] = useState<Record<string, unknown> | null>(null);

  // Fetch form data
  const fetchForm = useCallback(async () => {
    try {
      const response = await fetch(`/api/public/forms/${shortCode}`);
      const data = await response.json();

      if (!response.ok) {
        setError({
          code: data.code || "UNKNOWN_ERROR",
          message: data.message || "Failed to load form",
        });
        setPageState("error");
        return;
      }

      setForm(data.form);
      setIsAuthenticated(data.isAuthenticated);
      setPrefillData(data.prefillData);
      setPageState("form");
    } catch {
      setError({
        code: "NETWORK_ERROR",
        message: "Unable to connect. Please check your internet connection and try again.",
      });
      setPageState("error");
    }
  }, [shortCode]);

  useEffect(() => {
    fetchForm();
  }, [fetchForm]);

  // Check for signed=true query param (return from DocuSeal)
  useEffect(() => {
    const signed = searchParams.get("signed");
    const returnedSubmissionId = searchParams.get("submission");

    if (signed === "true") {
      if (returnedSubmissionId) {
        setSubmissionId(returnedSubmissionId);
      }
      setPageState("submitted");

      // Clean up the URL
      const url = new URL(window.location.href);
      url.searchParams.delete("signed");
      url.searchParams.delete("submission");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [searchParams]);

  // Handle form submission
  const handleSubmit = async (
    formData: Record<string, unknown>,
    consentGiven: boolean,
    consentOptions?: ConsentOptions
  ) => {
    try {
      const response = await fetch(`/api/public/forms/${shortCode}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: formData,
          consentGiven,
          // Include consent options if provided
          ...(consentOptions && {
            consentDurationMonths: consentOptions.durationMonths,
            autoRenew: consentOptions.autoRenew,
          }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Submission failed");
      }

      setSubmissionId(data.submission.id);
      setSubmittedFormData(formData);

      // Store anonymous token if provided
      if (data.anonymousToken) {
        setAnonymousToken(data.anonymousToken);
        localStorage.setItem("chkin_anonymous_token", data.anonymousToken);
      }

      // Store profile diff if provided
      if (data.profileDiff) {
        setProfileDiff(data.profileDiff);
      }

      // Check if PDF signing is required
      // Only authenticated users can sign (need user email for DocuSeal)
      if (form?.pdfEnabled && isAuthenticated) {
        setPageState("signing");
        return;
      }

      // Handle response based on authentication
      if (data.promptRegistration) {
        // Anonymous user - show registration prompt
        setPageState("registration-prompt");
      } else if (data.promptProfileUpdate && data.profileDiff) {
        // Authenticated user with profile differences
        setPageState("profile-sync");
      } else {
        // Authenticated user, no differences
        setPageState("submitted");
      }
    } catch (err) {
      throw err; // Let the form renderer handle the error display
    }
  };

  // Handle signature completion
  const handleSignatureComplete = () => {
    // After signing, continue with the normal flow
    if (profileDiff && profileDiff.length > 0 && isAuthenticated) {
      setPageState("profile-sync");
    } else if (!isAuthenticated) {
      setPageState("registration-prompt");
    } else {
      setPageState("submitted");
    }
  };

  // Handle skipping signature
  const handleSignatureSkip = () => {
    handleSignatureComplete();
  };

  // Handle profile sync completion
  const handleProfileSyncComplete = () => {
    setPageState("submitted");
  };

  // Handle registration prompt completion
  const handleRegistrationComplete = () => {
    setPageState("submitted");
  };

  // Render loading state
  if (pageState === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
          <p className="mt-4 text-gray-600">Loading form...</p>
        </div>
      </div>
    );
  }

  // Render error state
  if (pageState === "error" && error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
            <svg
              className="h-8 w-8 text-red-600"
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
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            {error.code === "QR_NOT_FOUND"
              ? "Invalid QR Code"
              : error.code === "QR_INACTIVE" || error.code === "FORM_INACTIVE"
              ? "Form Unavailable"
              : "Something Went Wrong"}
          </h1>
          <p className="mt-3 text-gray-600">{error.message}</p>
          <div className="mt-8">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg bg-teal-600 px-6 py-3 text-white hover:bg-teal-700"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Render signature step (for PDF-enabled forms)
  if (pageState === "signing" && submissionId) {
    return (
      <div className="min-h-screen bg-gray-50 py-8 px-4">
        <div className="mx-auto max-w-2xl">
          {/* Back to form header */}
          <div className="mb-6">
            {form?.organization.logo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.organization.logo}
                alt={form.organization.name}
                className="mx-auto mb-4 h-12 w-auto"
              />
            )}
            <p className="text-center text-sm text-gray-500">
              {form?.organization.name}
            </p>
          </div>

          {/* Signature component */}
          <div className="rounded-xl bg-white p-6 shadow-sm">
            <SignatureStep
              submissionId={submissionId}
              onComplete={handleSignatureComplete}
              onSkip={handleSignatureSkip}
            />
          </div>
        </div>
      </div>
    );
  }

  // Render submitted state (success)
  if (pageState === "submitted") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
            <svg
              className="h-8 w-8 text-green-600"
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
          </div>
          <h1 className="text-2xl font-bold text-gray-900">
            Thank You!
          </h1>
          <p className="mt-3 text-gray-600">
            Your check-in has been submitted successfully. The reception staff will be notified.
          </p>
          {form?.organization && (
            <p className="mt-2 text-sm text-gray-500">
              Submitted to {form.organization.name}
            </p>
          )}
          <div className="mt-8 space-y-3">
            {isAuthenticated ? (
              <Link
                href="/patient"
                className="inline-flex items-center rounded-lg bg-teal-600 px-6 py-3 text-white hover:bg-teal-700"
              >
                Go to My Dashboard
              </Link>
            ) : (
              <button
                onClick={() => setPageState("registration-prompt")}
                className="inline-flex items-center rounded-lg bg-teal-600 px-6 py-3 text-white hover:bg-teal-700"
              >
                Create an Account
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Render registration prompt
  if (pageState === "registration-prompt") {
    // Extract name and email from submitted form data for registration pre-fill
    const firstName = submittedFormData?.firstName as string || "";
    const lastName = submittedFormData?.lastName as string || "";
    const fullName = [firstName, lastName].filter(Boolean).join(" ");
    const email = (submittedFormData?.emailPersonal as string) ||
                  (submittedFormData?.email as string) || "";

    return (
      <RegistrationPrompt
        organizationName={form?.organization.name}
        anonymousToken={anonymousToken}
        prefillName={fullName}
        prefillEmail={email}
        onComplete={handleRegistrationComplete}
        onSkip={() => setPageState("submitted")}
      />
    );
  }

  // Render profile sync modal
  if (pageState === "profile-sync" && profileDiff) {
    return (
      <ProfileSyncModal
        differences={profileDiff}
        submissionId={submissionId!}
        onComplete={handleProfileSyncComplete}
        onSkip={() => setPageState("submitted")}
      />
    );
  }

  // Render form
  if (pageState === "form" && form) {
    return (
      <PublicFormRenderer
        form={form}
        prefillData={prefillData}
        isAuthenticated={isAuthenticated}
        onSubmit={handleSubmit}
      />
    );
  }

  return null;
}
