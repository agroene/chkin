"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Logo from "@/components/Logo";
import { signOut, useSession, useListOrganizations } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

type ErrorType = "expired" | "not_found" | "generic" | null;

export default function ProviderPendingPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const { data: organizations } = useListOrganizations();
  const [loading, setLoading] = useState(true);
  const [errorType, setErrorType] = useState<ErrorType>(null);
  const [errorMessage, setErrorMessage] = useState("");

  // Get the first organization (practice) for display
  const practice = organizations?.[0];

  // Check if we need to complete registration (organization doesn't exist yet)
  useEffect(() => {
    async function completeRegistration() {
      // Only proceed if user is authenticated and no organizations exist
      if (!session || organizations === undefined) {
        return; // Still loading
      }

      if (organizations && organizations.length > 0) {
        setLoading(false);
        return; // Organization already exists
      }

      // Fetch pending registration from database
      try {
        const registrationResponse = await fetch("/api/provider/get-pending-registration");
        const registrationJson = await registrationResponse.json();

        if (registrationResponse.status === 410) {
          // Registration expired
          setErrorType("expired");
          setErrorMessage("Your registration link has expired. Please register again.");
          setLoading(false);
          return;
        }

        if (registrationResponse.status === 404 || !registrationJson.success) {
          // No pending registration found
          setErrorType("not_found");
          setErrorMessage(
            "We couldn't find your registration details. This can happen if your registration session expired or was already completed."
          );
          setLoading(false);
          return;
        }

        if (!registrationResponse.ok) {
          setErrorType("generic");
          setErrorMessage(registrationJson.error || "An error occurred");
          setLoading(false);
          return;
        }

        // Call API to complete registration
        const response = await fetch("/api/provider/complete-registration", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(registrationJson.data),
        });

        const result = await response.json();

        if (!response.ok) {
          setErrorType("generic");
          setErrorMessage(result.error || "Failed to complete registration");
          setLoading(false);
          return;
        }

        // Refresh to show organization data
        router.refresh();
      } catch (err) {
        console.error("Complete registration error:", err);
        setErrorType("generic");
        setErrorMessage("An unexpected error occurred. Please try again.");
      } finally {
        setLoading(false);
      }
    }

    completeRegistration();
  }, [session, organizations, router]);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Completing registration...</p>
        </div>
      </div>
    );
  }

  // Error state - show helpful message with actions
  if (errorType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8 text-center">
          <Logo size="md" linkToHome className="mx-auto" />

          <div className="bg-white border border-gray-200 rounded-lg p-8">
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
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

            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {errorType === "expired"
                ? "Registration Expired"
                : errorType === "not_found"
                ? "Registration Not Found"
                : "Registration Error"}
            </h2>

            <p className="text-gray-600 mb-6">{errorMessage}</p>

            <div className="space-y-3">
              {(errorType === "expired" || errorType === "not_found") && (
                <Link
                  href="/provider/register"
                  className="block w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-teal-600 hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
                >
                  Register Again
                </Link>
              )}

              <button
                onClick={handleSignOut}
                className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
              >
                Sign Out
              </button>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <p className="text-sm text-gray-500">
                Need help? Contact{" "}
                <a
                  href="mailto:support@chkin.co.za"
                  className="text-teal-600 hover:text-teal-500"
                >
                  support@chkin.co.za
                </a>
              </p>
            </div>
          </div>

          <div className="text-center">
            <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
              Back to home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state - show pending approval
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <Logo size="md" linkToHome className="mx-auto" />

        <div className="bg-white border border-gray-200 rounded-lg p-8">
          <div className="w-16 h-16 mx-auto mb-4 bg-yellow-100 rounded-full flex items-center justify-center">
            <svg
              className="w-8 h-8 text-yellow-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Approval Pending
          </h2>

          <p className="text-gray-600 mb-6">
            Your practice registration is under review.
          </p>

          {practice && (
            <div className="bg-gray-50 rounded-md p-4 mb-6 text-left">
              <p className="text-sm text-gray-500 mb-1">Practice</p>
              <p className="font-medium text-gray-900">{practice.name}</p>
            </div>
          )}

          <p className="text-sm text-gray-500 mb-6">
            Our team is reviewing your registration. You&apos;ll receive an
            email once your practice has been approved.
          </p>

          <div className="border-t border-gray-200 pt-6">
            <p className="text-sm text-gray-500 mb-4">
              Need help? Contact{" "}
              <a
                href="mailto:support@chkin.co.za"
                className="text-teal-600 hover:text-teal-500"
              >
                support@chkin.co.za
              </a>
            </p>

            <button
              onClick={handleSignOut}
              className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-teal-500"
            >
              Sign Out
            </button>
          </div>
        </div>

        <div className="text-center">
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-700">
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
