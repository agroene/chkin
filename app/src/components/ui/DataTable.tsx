"use client";

/**
 * Data Table Component
 *
 * Responsive data display that shows as stacked cards on mobile
 * and a traditional table on larger screens.
 *
 * @module components/ui/data-table
 */

import { ReactNode } from "react";

export interface Column<T> {
  /** Unique key for the column */
  key: string;
  /** Header text */
  header: string;
  /** Custom render function */
  render?: (item: T) => ReactNode;
  /** Additional CSS classes */
  className?: string;
  /** Hide this column on mobile card view */
  hideOnMobile?: boolean;
  /** Show this column as the primary title in mobile card view */
  mobileTitle?: boolean;
  /** Show this column as secondary info in mobile card view */
  mobileSubtitle?: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  onRowClick?: (item: T) => void;
  emptyMessage?: string;
  emptyIcon?: ReactNode;
  loading?: boolean;
  className?: string;
}

export default function DataTable<T>({
  columns,
  data,
  keyExtractor,
  onRowClick,
  emptyMessage = "No data available",
  emptyIcon,
  loading = false,
  className = "",
}: DataTableProps<T>) {
  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  // Empty state
  if (data.length === 0) {
    return (
      <div className="py-12 text-center">
        {emptyIcon && <div className="mb-3">{emptyIcon}</div>}
        <p className="text-gray-500">{emptyMessage}</p>
      </div>
    );
  }

  // Find title and subtitle columns for mobile view
  const titleColumn = columns.find((c) => c.mobileTitle);
  const subtitleColumn = columns.find((c) => c.mobileSubtitle);
  const mobileColumns = columns.filter(
    (c) => !c.hideOnMobile && !c.mobileTitle && !c.mobileSubtitle
  );

  const getValue = (item: T, column: Column<T>): ReactNode => {
    if (column.render) {
      return column.render(item);
    }
    return (item as Record<string, unknown>)[column.key] as ReactNode;
  };

  return (
    <div className={className}>
      {/* Mobile Card View */}
      <div className="space-y-3 md:hidden">
        {data.map((item) => (
          <div
            key={keyExtractor(item)}
            onClick={() => onRowClick?.(item)}
            className={`rounded-lg border border-gray-200 bg-white p-4 ${
              onRowClick
                ? "cursor-pointer active:bg-gray-50"
                : ""
            }`}
          >
            {/* Title Row */}
            {(titleColumn || subtitleColumn) && (
              <div className="mb-3 flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  {titleColumn && (
                    <div className="font-medium text-gray-900">
                      {getValue(item, titleColumn)}
                    </div>
                  )}
                  {subtitleColumn && (
                    <div className="mt-0.5 text-sm text-gray-500">
                      {getValue(item, subtitleColumn)}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Other Fields */}
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              {mobileColumns.map((column) => (
                <div key={column.key}>
                  <dt className="text-gray-500">{column.header}</dt>
                  <dd className="mt-0.5 font-medium text-gray-900">
                    {getValue(item, column)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>

      {/* Desktop Table View */}
      <div className="hidden overflow-x-auto md:block">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  scope="col"
                  className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 lg:px-6 ${column.className || ""}`}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {data.map((item) => (
              <tr
                key={keyExtractor(item)}
                onClick={() => onRowClick?.(item)}
                className={
                  onRowClick ? "cursor-pointer hover:bg-gray-50" : ""
                }
              >
                {columns.map((column) => (
                  <td
                    key={`${keyExtractor(item)}-${column.key}`}
                    className={`whitespace-nowrap px-4 py-4 text-sm text-gray-900 lg:px-6 ${column.className || ""}`}
                  >
                    {getValue(item, column)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
