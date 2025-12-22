"use client";

import Link from "next/link";
import Logo from "@/components/Logo";
import { signOut, useListOrganizations } from "@/lib/auth-client";
import { useRouter } from "next/navigation";

export default function ProviderPendingPage() {
  const router = useRouter();
  const { data: organizations, isPending } = useListOrganizations();

  // Get the first organization (practice) for display
  const practice = organizations?.[0];

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading...</p>
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
