/**
 * Card Component
 *
 * A flexible card container for content sections.
 * Mobile-first: smaller padding on mobile, larger on desktop.
 *
 * @module components/ui/card
 */

import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
  title?: string;
  description?: string;
  actions?: ReactNode;
  /** Remove padding from card body */
  noPadding?: boolean;
}

export default function Card({
  children,
  className = "",
  title,
  description,
  actions,
  noPadding = false,
}: CardProps) {
  return (
    <div
      className={`rounded-lg border border-gray-200 bg-white shadow-sm ${className}`}
    >
      {/* Header */}
      {(title || description || actions) && (
        <div className="flex flex-col gap-2 border-b border-gray-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-4">
          <div className="min-w-0 flex-1">
            {title && (
              <h3 className="text-base font-semibold text-gray-900 sm:text-lg">
                {title}
              </h3>
            )}
            {description && (
              <p className="mt-0.5 text-sm text-gray-500">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
              {actions}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div className={noPadding ? "" : "p-4 sm:p-6"}>{children}</div>
    </div>
  );
}
