"use client";

/**
 * DocuSeal Builder Component
 *
 * Wrapper around @docuseal/react DocusealBuilder for provider PDF template configuration.
 * Allows providers to upload PDF forms and configure signature fields.
 */

import { useEffect, useState } from "react";
import { DocusealBuilder } from "@docuseal/react";

interface DocuSealBuilderProps {
  onSave: (templateId: number) => void;
  onLoad?: () => void;
}

export default function DocuSealBuilderComponent({
  onSave,
  onLoad,
}: DocuSealBuilderProps) {
  const [token, setToken] = useState<string | null>(null);
  const [docusealUrl, setDocusealUrl] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchToken() {
      try {
        setLoading(true);
        setError(null);

        const response = await fetch("/api/provider/docuseal/builder-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to get builder token");
        }

        setToken(data.token);
        setDocusealUrl(data.docusealUrl);
        onLoad?.();
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchToken();
  }, [onLoad]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border border-gray-200">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          <p className="text-sm text-gray-500">Loading PDF builder...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-96 bg-red-50 rounded-lg border border-red-200">
        <div className="text-center">
          <svg
            className="w-12 h-12 text-red-400 mx-auto mb-3"
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
          <p className="text-sm text-red-600 font-medium">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 text-sm text-red-600 hover:text-red-500 underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg border border-gray-200">
        <p className="text-sm text-gray-500">Unable to load PDF builder</p>
      </div>
    );
  }

  return (
    <div className="docuseal-builder-container">
      <DocusealBuilder
        token={token}
        host={docusealUrl}
        withTitle={false}
        withSendButton={false}
        withSignYourselfButton={false}
        onSave={(data: { id: number }) => onSave(data.id)}
        className="w-full min-h-[600px]"
      />
    </div>
  );
}
