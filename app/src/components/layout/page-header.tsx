"use client";

/**
 * Page Header Component
 *
 * Consistent header for content pages with title, description, and optional actions.
 * Mobile-first: stacks vertically on mobile, horizontal on larger screens.
 *
 * @module components/layout/page-header
 */

import { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  children?: ReactNode; // Action buttons
  breadcrumb?: ReactNode;
}

export function PageHeader({
  title,
  description,
  children,
  breadcrumb,
}: PageHeaderProps) {
  return (
    <div className="mb-6 space-y-4 md:mb-8">
      {/* Breadcrumb */}
      {breadcrumb && (
        <nav className="text-sm text-gray-500">{breadcrumb}</nav>
      )}

      {/* Title and Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-bold text-gray-900 sm:text-2xl">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-gray-600 sm:text-base">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        {children && (
          <div className="flex flex-shrink-0 flex-wrap gap-2 sm:gap-3">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}
