"use client";

/**
 * Registration Prompt Component
 *
 * Shown after anonymous form submission to encourage registration.
 * Explains benefits and provides registration/app download options.
 */

import Link from "next/link";

interface RegistrationPromptProps {
  organizationName?: string;
  anonymousToken: string | null;
  onComplete?: () => void;
  onSkip: () => void;
}

export default function RegistrationPrompt({
  organizationName,
  anonymousToken,
  onSkip,
}: RegistrationPromptProps) {
  // Store token for later claiming when user registers
  if (anonymousToken && typeof window !== "undefined") {
    localStorage.setItem("chkin_anonymous_token", anonymousToken);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-teal-50 to-white p-4">
      <div className="max-w-md text-center">
        {/* Success Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-10 w-10 text-green-600"
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

        {/* Success Message */}
        <h1 className="text-2xl font-bold text-gray-900">
          Check-in Complete!
        </h1>
        <p className="mt-2 text-gray-600">
          Your information has been submitted to {organizationName || "the practice"}.
        </p>

        {/* Benefits Section */}
        <div className="mt-8 rounded-xl bg-white p-6 shadow-lg">
          <h2 className="text-lg font-semibold text-gray-900">
            Create a chkin account
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Save time on your next visit with these benefits:
          </p>

          <div className="mt-4 space-y-3 text-left">
            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-100">
                <svg
                  className="h-4 w-4 text-teal-600"
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
              <div>
                <p className="font-medium text-gray-900">Pre-filled forms</p>
                <p className="text-sm text-gray-500">
                  Your details are saved and auto-filled next time
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-100">
                <svg
                  className="h-4 w-4 text-teal-600"
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
              <div>
                <p className="font-medium text-gray-900">Check-in history</p>
                <p className="text-sm text-gray-500">
                  Access your previous submissions anytime
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <div className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-teal-100">
                <svg
                  className="h-4 w-4 text-teal-600"
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
              <div>
                <p className="font-medium text-gray-900">Update anytime</p>
                <p className="text-sm text-gray-500">
                  Keep your information up to date from anywhere
                </p>
              </div>
            </div>
          </div>

          {/* CTA Buttons */}
          <div className="mt-6 space-y-3">
            <Link
              href="/auth/register"
              className="block w-full rounded-lg bg-teal-600 py-3 font-semibold text-white hover:bg-teal-700"
            >
              Create Account
            </Link>
            <Link
              href="/auth/login"
              className="block w-full rounded-lg border border-gray-300 bg-white py-3 font-semibold text-gray-700 hover:bg-gray-50"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Skip Option */}
        <button
          onClick={onSkip}
          className="mt-6 text-sm text-gray-500 hover:text-gray-700"
        >
          No thanks, I&apos;m done
        </button>
      </div>
    </div>
  );
}
