/**
 * Stat Card Component
 *
 * Display a single statistic with icon, label, and value.
 */

import { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  className?: string;
}

export default function StatCard({
  title,
  value,
  icon,
  trend,
  className = "",
}: StatCardProps) {
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 p-6 ${className}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          <p className="mt-2 text-3xl font-semibold text-gray-900">{value}</p>
          {trend && (
            <p
              className={`mt-2 text-sm ${trend.isPositive ? "text-green-600" : "text-red-600"}`}
            >
              <span>{trend.isPositive ? "+" : ""}{trend.value}%</span>
              <span className="text-gray-500 ml-1">from last month</span>
            </p>
          )}
        </div>
        <div className="p-3 bg-teal-50 rounded-lg text-teal-600">{icon}</div>
      </div>
    </div>
  );
}
