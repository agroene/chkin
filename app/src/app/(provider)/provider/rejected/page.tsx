"use client";

import Link from "next/link";
import { signOut, useListOrganizations } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function ProviderRejectedPage() {
  const router = useRouter();
  const { data: organizations } = useListOrganizations();
  const [rejectionReason, setRejectionReason] = useState<string | null>(null);

  // Get the first organization (practice) for display
  const practice = organizations?.[0];

  // Fetch rejection reason from the organization metadata
  useEffect(() => {
    async function fetchRejectionReason() {
      if (!practice?.id) return;

      try {
        const response = await fetch(
          `/api/provider/rejection-reason?orgId=${practice.id}`
        );
        const data = await response.json();
        setRejectionReason(data.reason);
      } catch {
        // Silently fail
      }
    }

    fetchRejectionReason();
  }, [practice?.id]);

  async function handleSignOut() {
    await signOut();
    router.push("/login");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Chkin</h1>
        </div>

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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Registration Not Approved
          </h2>

          <p className="text-gray-600 mb-6">
            Unfortunately, your practice registration was not approved.
          </p>

          {practice && (
            <div className="bg-gray-50 rounded-md p-4 mb-4 text-left">
              <p className="text-sm text-gray-500 mb-1">Practice</p>
              <p className="font-medium text-gray-900">{practice.name}</p>
            </div>
          )}

          {rejectionReason && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6 text-left">
              <p className="text-sm font-medium text-red-800 mb-1">Reason</p>
              <p className="text-sm text-red-700">{rejectionReason}</p>
            </div>
          )}

          <p className="text-sm text-gray-500 mb-6">
            If you believe this was a mistake or have additional documentation
            to provide, please contact our support team.
          </p>

          <div className="border-t border-gray-200 pt-6 space-y-3">
            <a
              href="mailto:support@chkin.co.za?subject=Registration%20Appeal"
              className="block w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Contact Support
            </a>

            <button
              onClick={handleSignOut}
              className="w-full py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
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
