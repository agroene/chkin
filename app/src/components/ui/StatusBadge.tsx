/**
 * Status Badge Component
 *
 * Visual indicator for status values with color coding.
 * Mobile-first: touch-friendly sizing with optional size variants.
 *
 * @module components/ui/status-badge
 */

type StatusType =
  | "pending"
  | "approved"
  | "rejected"
  | "active"
  | "inactive"
  | "info";

type BadgeSize = "sm" | "md";

interface StatusBadgeProps {
  status: StatusType;
  label?: string;
  className?: string;
  size?: BadgeSize;
}

const statusStyles: Record<StatusType, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-200",
  approved: "bg-green-100 text-green-800 border-green-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  active: "bg-green-100 text-green-800 border-green-200",
  inactive: "bg-gray-100 text-gray-800 border-gray-200",
  info: "bg-blue-100 text-blue-800 border-blue-200",
};

const sizeStyles: Record<BadgeSize, string> = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

const defaultLabels: Record<StatusType, string> = {
  pending: "Pending",
  approved: "Approved",
  rejected: "Rejected",
  active: "Active",
  inactive: "Inactive",
  info: "Info",
};

export default function StatusBadge({
  status,
  label,
  className = "",
  size = "sm",
}: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full border font-medium ${statusStyles[status]} ${sizeStyles[size]} ${className}`}
    >
      {label || defaultLabels[status]}
    </span>
  );
}
