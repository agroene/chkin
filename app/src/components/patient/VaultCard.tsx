/**
 * Vault Card Component
 *
 * Individual category card in the wallet-style UI.
 * Shows icon, label, status indicator, and preview text.
 * Includes stacked shadow effect for depth.
 */

import { CategoryIcon } from "./CategoryIcon";

export type CardStatus = "complete" | "incomplete" | "protected" | "empty";

interface VaultCardProps {
  name: string;
  label: string;
  icon: string;
  color?: string | null;
  status: CardStatus;
  preview?: string;
  isProtected?: boolean;
  onClick: () => void;
}

// Status indicator component - moved outside to avoid recreating on each render
function StatusIndicator({ status }: { status: CardStatus }) {
  switch (status) {
    case "complete":
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100">
          <svg
            className="h-4 w-4 text-green-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );
    case "incomplete":
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100">
          <svg
            className="h-4 w-4 text-amber-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );
    case "protected":
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
          <svg
            className="h-4 w-4 text-gray-600"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );
    default:
      return (
        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100">
          <svg
            className="h-4 w-4 text-gray-400"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z"
              clipRule="evenodd"
            />
          </svg>
        </div>
      );
  }
}

// Color classes for icon background - static, doesn't change
const colorClasses: Record<string, string> = {
  teal: "bg-teal-100 text-teal-600",
  blue: "bg-blue-100 text-blue-600",
  green: "bg-green-100 text-green-600",
  purple: "bg-purple-100 text-purple-600",
  red: "bg-red-100 text-red-600",
  rose: "bg-rose-100 text-rose-600",
  cyan: "bg-cyan-100 text-cyan-600",
  indigo: "bg-indigo-100 text-indigo-600",
  amber: "bg-amber-100 text-amber-600",
  emerald: "bg-emerald-100 text-emerald-600",
  slate: "bg-slate-100 text-slate-600",
  violet: "bg-violet-100 text-violet-600",
  yellow: "bg-yellow-100 text-yellow-600",
  gray: "bg-gray-100 text-gray-600",
  orange: "bg-orange-100 text-orange-600",
  sky: "bg-sky-100 text-sky-600",
};

export default function VaultCard({
  label,
  icon,
  color = "teal",
  status,
  preview,
  isProtected,
  onClick,
}: VaultCardProps) {
  const iconColorClass = colorClasses[color || "teal"] || colorClasses.teal;

  return (
    <button
      onClick={onClick}
      className="group relative w-full rounded-xl border border-gray-200 bg-white p-4 text-left shadow-sm transition-all hover:shadow-md active:scale-[0.98]"
      style={{
        // Stacked card shadow effect
        boxShadow: `
          0 1px 3px rgba(0,0,0,0.1),
          0 4px 0 -2px #f9fafb,
          0 4px 0 -1px #e5e7eb,
          0 8px 0 -4px #f9fafb,
          0 8px 0 -3px #e5e7eb
        `,
      }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {/* Category icon */}
          <div className={`rounded-lg p-2 ${iconColorClass}`}>
            <CategoryIcon name={icon} className="h-6 w-6" />
          </div>

          {/* Label and preview */}
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-gray-900">{label}</h3>
            {preview && (
              <p className="truncate text-sm text-gray-500">{preview}</p>
            )}
            {!preview && status === "empty" && (
              <p className="text-sm text-gray-400">Tap to add</p>
            )}
            {isProtected && !preview && (
              <p className="text-sm text-gray-400">Protected information</p>
            )}
          </div>
        </div>

        {/* Status and chevron */}
        <div className="flex items-center gap-2">
          <StatusIndicator status={status} />
          <svg
            className="h-5 w-5 text-gray-400 transition-transform group-hover:translate-x-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 5l7 7-7 7"
            />
          </svg>
        </div>
      </div>
    </button>
  );
}
