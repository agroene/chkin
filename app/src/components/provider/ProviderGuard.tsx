"use client";

/**
 * Provider Guard Component
 *
 * Protects provider routes by checking if the user has an approved organization.
 * Redirects users based on their organization status.
 */

import { useSession } from "@/lib/auth-client";
import { useRouter } from "next/navigation";
import { useEffect, useState, ReactNode } from "react";

interface ProviderGuardProps {
  children: ReactNode;
}

interface OrgStatus {
  hasOrganization: boolean;
  status: string | null;
  organizationId: string | null;
  organizationName: string | null;
}

export default function ProviderGuard({ children }: ProviderGuardProps) {
  const { data: session, isPending: sessionPending } = useSession();
  const router = useRouter();
  const [orgStatus, setOrgStatus] = useState<OrgStatus | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch organization status
  useEffect(() => {
    async function fetchOrgStatus() {
      if (!session?.user) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch("/api/provider/status");
        if (response.ok) {
          const data = await response.json();
          setOrgStatus(data);
        } else {
          setOrgStatus({
            hasOrganization: false,
            status: null,
            organizationId: null,
            organizationName: null,
          });
        }
      } catch {
        setOrgStatus({
          hasOrganization: false,
          status: null,
          organizationId: null,
          organizationName: null,
        });
      } finally {
        setLoading(false);
      }
    }

    if (!sessionPending) {
      fetchOrgStatus();
    }
  }, [session, sessionPending]);

  const isPending = sessionPending || loading;

  useEffect(() => {
    if (!isPending && orgStatus) {
      if (!session?.user) {
        router.push("/login?redirect=/provider");
      } else if (!orgStatus.hasOrganization) {
        router.push("/provider/pending");
      } else if (orgStatus.status === "pending") {
        router.push("/provider/pending");
      } else if (orgStatus.status === "rejected") {
        router.push("/provider/rejected");
      }
    }
  }, [session, isPending, router, orgStatus]);

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

  // Not authorized - show redirecting state
  if (!session?.user || !orgStatus?.hasOrganization || orgStatus.status !== "approved") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
