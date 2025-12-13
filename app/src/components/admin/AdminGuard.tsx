"use client";

/**
 * Admin Guard Component
 *
 * Protects admin routes by checking if the user is a system administrator.
 * Redirects unauthorized users to the home page.
 */

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, ReactNode } from "react";

interface AdminGuardProps {
  children: ReactNode;
}

export default function AdminGuard({ children }: AdminGuardProps) {
  const { data: session, isPending } = useSession();
  const router = useRouter();

  const isSystemAdmin = session?.user?.isSystemAdmin === true;

  useEffect(() => {
    if (!isPending) {
      if (!session?.user) {
        // Not logged in - redirect to login
        router.push("/login?redirect=/admin");
      } else if (!isSystemAdmin) {
        // Logged in but not admin - redirect to home
        router.push("/");
      }
    }
  }, [session, isPending, router, isSystemAdmin]);

  // Loading state
  if (isPending) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authorized
  if (!session?.user || !isSystemAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
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
            Access Denied
          </h2>
          <p className="text-gray-600">
            You do not have permission to access this area.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
