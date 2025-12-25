"use client";

/**
 * Signature Step Component
 *
 * Embeds the DocuSeal Form component for patients to review and sign
 * their pre-filled PDF documents.
 */

import { useEffect, useState, useCallback } from "react";
import { DocusealForm } from "@docuseal/react";

interface SignatureStepProps {
  submissionId: string;
  onComplete: () => void;
  onSkip?: () => void;
}

export default function SignatureStep({
  submissionId,
  onComplete,
  onSkip,
}: SignatureStepProps) {
  const [token, setToken] = useState<string | null>(null);
  const [docusealSubmissionId, setDocusealSubmissionId] = useState<number | null>(null);
  const [docusealUrl, setDocusealUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const initializeSignature = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Create or get DocuSeal submission
      const response = await fetch(
        `/api/patient/submissions/${submissionId}/docuseal`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize signing");
      }

      setToken(data.token);
      setDocusealSubmissionId(data.submissionId);
      setDocusealUrl(data.docusealUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [submissionId]);

  useEffect(() => {
    initializeSignature();
  }, [initializeSignature]);

  const handleComplete = () => {
    onComplete();
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

  if (!token || !docusealSubmissionId) {
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
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-teal-100 mb-4">
          <svg
            className="w-6 h-6 text-teal-600"
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
        <h2 className="text-xl font-semibold text-gray-900">Sign Document</h2>
        <p className="text-gray-500 mt-1">
          Please review and sign the document below to complete your submission.
        </p>
      </div>

      {/* DocuSeal Form Embed */}
      <div className="border rounded-lg overflow-hidden bg-white shadow-sm">
        <DocusealForm
          src={`${docusealUrl}/s/${docusealSubmissionId}`}
          host={docusealUrl}
          token={token}
          withTitle={false}
          withDownloadButton={true}
          onComplete={handleComplete}
          className="w-full min-h-[600px]"
        />
      </div>

      {/* Info Box */}
      <div className="rounded-lg bg-blue-50 p-4">
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

      {/* Skip Option */}
      {onSkip && (
        <div className="text-center">
          <button
            onClick={onSkip}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Skip signing for now (you can sign later)
          </button>
        </div>
      )}
    </div>
  );
}
