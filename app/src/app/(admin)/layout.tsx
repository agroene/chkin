"use client";

/**
 * Admin Layout
 *
 * Wraps all admin pages with responsive navigation and authentication guard.
 * Uses AppShell for mobile-first sidebar handling.
 *
 * @module app/(admin)/layout
 */

import { ReactNode } from "react";
import AdminGuard from "@/components/admin/AdminGuard";
import AdminSidebar from "@/components/admin/Sidebar";
import { AppShell } from "@/components/layout";

interface AdminLayoutProps {
  children: ReactNode;
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return (
    <AdminGuard>
      <AppShell sidebar={<AdminSidebar />} mobileTitle="Admin">
        {children}
      </AppShell>
    </AdminGuard>
  );
}
