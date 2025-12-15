"use client";

/**
 * Provider Layout
 *
 * Wraps all provider pages with responsive navigation and authentication guard.
 * Uses AppShell for mobile-first sidebar handling.
 * Public routes (register, pending, rejected) render without the sidebar.
 *
 * @module app/(provider)/layout
 */

import { ReactNode, useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { ProviderGuard, ProviderSidebar } from "@/components/provider";
import { AppShell } from "@/components/layout";
import { useSession } from "@/lib/auth-client";

// Routes that render without the AppShell sidebar
const PUBLIC_ROUTES = [
  "/provider/register",
  "/provider/pending",
  "/provider/rejected",
];

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
  const pathname = usePathname();
  const [orgStatus, setOrgStatus] = useState<OrgStatus | null>(null);

  const isPublicRoute = PUBLIC_ROUTES.some((route) => pathname?.startsWith(route));

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

  // Public routes render without AppShell
  if (isPublicRoute) {
    return <ProviderGuard>{children}</ProviderGuard>;
  }

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
