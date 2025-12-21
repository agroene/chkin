"use client";

/**
 * Profile Sync Modal Component
 *
 * Shown after authenticated form submission when submitted data
 * differs from the user's stored profile.
 * Allows user to selectively update their profile with new values.
 */

import { useState } from "react";

interface ProfileDiff {
  fieldName: string;
  fieldLabel: string;
  currentValue: unknown;
  submittedValue: unknown;
}

interface ProfileSyncModalProps {
  differences: ProfileDiff[];
  submissionId: string;
  onComplete: () => void;
  onSkip: () => void;
}

export default function ProfileSyncModal({
  differences,
  submissionId,
  onComplete,
  onSkip,
}: ProfileSyncModalProps) {
  const [selectedFields, setSelectedFields] = useState<Set<string>>(
    new Set(differences.map((d) => d.fieldName))
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleField = (fieldName: string) => {
    const next = new Set(selectedFields);
    if (next.has(fieldName)) {
      next.delete(fieldName);
    } else {
      next.add(fieldName);
    }
    setSelectedFields(next);
  };

  const handleSync = async () => {
    if (selectedFields.size === 0) {
      onComplete();
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const response = await fetch("/api/patient/profile/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          submissionId,
          fields: Array.from(selectedFields),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update profile");
      }

      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  };

  const formatValue = (value: unknown): string => {
    if (value === null || value === undefined) return "Not set";
    if (typeof value === "boolean") return value ? "Yes" : "No";
    if (Array.isArray(value)) return value.join(", ");
    return String(value);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-900/50 p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-200 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-100">
              <svg
                className="h-6 w-6 text-amber-600"
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
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Update Your Profile?
              </h2>
              <p className="text-sm text-gray-500">
                Some information you entered differs from your saved profile
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto px-6 py-4">
          <p className="mb-4 text-sm text-gray-600">
            Select which fields you&apos;d like to update in your profile:
          </p>

          <div className="space-y-3">
            {differences.map((diff) => (
              <label
                key={diff.fieldName}
                className={`block cursor-pointer rounded-lg border-2 p-4 transition-colors ${
                  selectedFields.has(diff.fieldName)
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={selectedFields.has(diff.fieldName)}
                    onChange={() => toggleField(diff.fieldName)}
                    className="mt-1 h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <div className="flex-1">
                    <p className="font-medium text-gray-900">{diff.fieldLabel}</p>
                    <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500">Current</p>
                        <p className="text-gray-700">
                          {formatValue(diff.currentValue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500">New</p>
                        <p className="font-medium text-teal-700">
                          {formatValue(diff.submittedValue)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </label>
            ))}
          </div>

          {error && (
            <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 px-6 py-4">
          <div className="flex gap-3">
            <button
              onClick={onSkip}
              disabled={saving}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            >
              Keep Existing
            </button>
            <button
              onClick={handleSync}
              disabled={saving}
              className="flex-1 rounded-lg bg-teal-600 px-4 py-2.5 font-medium text-white hover:bg-teal-700 disabled:opacity-50"
            >
              {saving ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </span>
              ) : selectedFields.size === 0 ? (
                "Continue"
              ) : (
                `Update ${selectedFields.size} Field${selectedFields.size > 1 ? "s" : ""}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
