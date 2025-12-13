/**
 * Empty State Component
 *
 * Placeholder shown when no data is available.
 * Mobile-first: responsive padding and icon sizing.
 *
 * @module components/ui/empty-state
 */

import { ReactNode } from "react";

interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}

export default function EmptyState({
  icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-12 text-center sm:py-16">
      {icon && (
        <div className="mb-4 text-gray-300">{icon}</div>
      )}

      <h3 className="text-base font-medium text-gray-900 sm:text-lg">
        {title}
      </h3>

      {description && (
        <p className="mt-1 max-w-sm text-sm text-gray-500 sm:text-base">
          {description}
        </p>
      )}

      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
