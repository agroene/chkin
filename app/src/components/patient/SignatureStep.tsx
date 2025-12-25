"use client";

/**
 * Signature Step Component
 *
 * Redirects patients to DocuSeal's hosted signing page.
 * After signing, DocuSeal redirects back to our callback which completes the flow.
 *
 * Note: Embedded signing requires DocuSeal Pro subscription.
 * This uses redirect-based signing which works with the free/self-hosted version.
 */

import { useEffect, useState, useCallback } from "react";

interface SignatureStepProps {
  submissionId: string;
  onComplete: () => void;
  onSkip?: () => void;
  /** For anonymous users - use public API endpoint */
  isAnonymous?: boolean;
  /** Token for anonymous users to verify access */
  anonymousToken?: string | null;
}

export default function SignatureStep({
  submissionId,
  onComplete,
  onSkip,
  isAnonymous = false,
  anonymousToken,
}: SignatureStepProps) {
  const [signingUrl, setSigningUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);

  const initializeSignature = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Use public endpoint for anonymous users, patient endpoint for authenticated
      const apiUrl = isAnonymous
        ? `/api/public/submissions/${submissionId}/docuseal`
        : `/api/patient/submissions/${submissionId}/docuseal`;

      // Create or get DocuSeal submission
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(anonymousToken && { anonymousToken }),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Include details if available (dev environment)
        const errorMsg = data.details
          ? `${data.error}: ${data.details}`
          : data.error || "Failed to initialize signing";
        throw new Error(errorMsg);
      }

      setSigningUrl(data.signingUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [submissionId, isAnonymous, anonymousToken]);

  useEffect(() => {
    initializeSignature();
  }, [initializeSignature]);

  // Check URL params for completion callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("signed") === "true") {
      onComplete();
    }
  }, [onComplete]);

  const handleSignNow = () => {
    if (signingUrl) {
      setRedirecting(true);
      // Store the current page URL to return to
      sessionStorage.setItem("chkin_signing_return", window.location.href);
      window.location.href = signingUrl;
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16">
        <div className="w-10 h-10 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-gray-600">Preparing your document for signing...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-red-100 mb-4">
          <svg
            className="w-8 h-8 text-red-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          Unable to Load Document
        </h3>
        <p className="text-gray-500 mb-6">{error}</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={initializeSignature}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-500 transition-colors"
          >
            Try Again
          </button>
          {onSkip && (
            <button
              onClick={onSkip}
              className="px-4 py-2 text-gray-600 hover:text-gray-900"
            >
              Skip for Now
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!signingUrl) {
    return (
      <div className="text-center py-16">
        <p className="text-gray-500">Unable to load document for signing</p>
        {onSkip && (
          <button
            onClick={onSkip}
            className="mt-4 text-teal-600 hover:text-teal-500"
          >
            Skip for Now
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-teal-100 mb-4">
          <svg
            className="w-8 h-8 text-teal-600"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
            />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-gray-900">
          Sign Your Document
        </h2>
        <p className="text-gray-500 mt-2 max-w-md mx-auto">
          Your form has been submitted. Please sign the document to complete
          your submission. You&apos;ll be redirected to our secure signing page.
        </p>
      </div>

      {/* Sign Button */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={handleSignNow}
          disabled={redirecting}
          className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {redirecting ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Redirecting...
            </>
          ) : (
            <>
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                />
              </svg>
              Sign Document Now
            </>
          )}
        </button>
      </div>

      {/* Info Box */}
      <div className="rounded-lg bg-blue-50 p-4 mt-6">
        <div className="flex">
          <svg
            className="h-5 w-5 flex-shrink-0 text-blue-400"
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
          <div className="ml-3">
            <h4 className="text-sm font-medium text-blue-800">
              About Your Signature
            </h4>
            <p className="mt-1 text-sm text-blue-700">
              Your electronic signature is legally binding. By signing, you
              confirm that the information you provided is accurate and that you
              consent to the terms outlined in the document.
            </p>
          </div>
        </div>
      </div>

      {/* Security Note */}
      <div className="rounded-lg bg-gray-50 p-4">
        <div className="flex items-start">
          <svg
            className="h-5 w-5 flex-shrink-0 text-gray-400 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
          <p className="ml-3 text-sm text-gray-600">
            You will be securely redirected to sign your document. After
            signing, you&apos;ll automatically return to complete your
            submission.
          </p>
        </div>
      </div>

      {/* Skip Option */}
      {onSkip && (
        <div className="text-center pt-4 border-t">
          <button
            onClick={onSkip}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip signing for now (you can sign later from your submissions)
          </button>
        </div>
      )}
    </div>
  );
}
