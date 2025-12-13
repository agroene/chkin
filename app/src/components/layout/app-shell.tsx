"use client";

/**
 * App Shell Component
 *
 * Main layout wrapper providing responsive sidebar navigation.
 * Mobile-first: drawer navigation on mobile, fixed sidebar on lg+.
 *
 * @module components/layout/app-shell
 *
 * @example
 * <AppShell sidebar={<AdminSidebar />}>
 *   <PageHeader title="Dashboard" />
 *   <Content />
 * </AppShell>
 */

import { ReactNode } from "react";
import { useSidebar } from "@/hooks";
import { MobileNav } from "./mobile-nav";
import { SidebarOverlay } from "./sidebar-overlay";

interface AppShellProps {
  children: ReactNode;
  sidebar: ReactNode;
  mobileTitle?: string;
}

export function AppShell({ children, sidebar, mobileTitle }: AppShellProps) {
  const { isOpen, toggle, close } = useSidebar();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile Navigation Header */}
      <MobileNav onMenuToggle={toggle} title={mobileTitle} />

      {/* Sidebar Overlay (mobile only) */}
      <SidebarOverlay isOpen={isOpen} onClose={close} />

      {/* Sidebar */}
      <aside
        className={`
          fixed inset-y-0 left-0 z-50 w-64 transform bg-gray-900 transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0
        `}
      >
        {/* Close button for mobile */}
        <button
          type="button"
          onClick={close}
          className="absolute right-2 top-2 rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white lg:hidden"
          aria-label="Close menu"
        >
          <svg
            className="h-6 w-6"
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
        </button>

        {sidebar}
      </aside>

      {/* Main Content */}
      <main className="min-h-screen lg:pl-64">
        <div className="p-4 sm:p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
