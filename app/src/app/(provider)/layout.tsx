"use client";

/**
 * Provider Layout
 *
 * Wraps all provider pages with responsive navigation and authentication guard.
 * Uses AppShell for mobile-first sidebar handling.
 *
 * @module app/(provider)/layout
 */

import { ReactNode, useState, useEffect } from "react";
import { ProviderGuard, ProviderSidebar } from "@/components/provider";
import { AppShell } from "@/components/layout";
import { useSession } from "@/lib/auth-client";

interface ProviderLayoutProps {
  children: ReactNode;
}

interface OrgStatus {
  hasOrganization: boolean;
  status: string | null;
  organizationId: string | null;
  organizationName: string | null;
}

export default function ProviderLayout({ children }: ProviderLayoutProps) {
  const { data: session } = useSession();
  const [orgStatus, setOrgStatus] = useState<OrgStatus | null>(null);

  useEffect(() => {
    async function fetchOrgStatus() {
      if (!session?.user) return;

      try {
        const response = await fetch("/api/provider/status");
        if (response.ok) {
          const data = await response.json();
          setOrgStatus(data);
        }
      } catch {
        // Ignore errors - will be handled by guard
      }
    }

    fetchOrgStatus();
  }, [session]);

  return (
    <ProviderGuard>
      <AppShell
        sidebar={<ProviderSidebar organizationName={orgStatus?.organizationName || undefined} />}
        mobileTitle="Provider"
      >
        {children}
      </AppShell>
    </ProviderGuard>
  );
}
