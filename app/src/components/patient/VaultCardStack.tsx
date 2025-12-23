/**
 * Vault Card Stack Component
 *
 * Container for VaultCards with "Show more" expansion.
 * Shows top 6 categories by default, expands to show all.
 */

"use client";

import { useState } from "react";
import VaultCard, { type CardStatus } from "./VaultCard";

interface Category {
  id: string;
  name: string;
  label: string;
  description?: string | null;
  icon: string;
  sortOrder: number;
  color?: string | null;
  isProtected: boolean;
  previewFields: string[];
  fields: Array<{
    id: string;
    name: string;
    label: string;
    description?: string;
    fieldType: string;
    config?: Record<string, unknown> | null;
    validation?: Record<string, unknown> | null;
    sortOrder: number;
    specialPersonalInfo?: boolean;
    requiresExplicitConsent?: boolean;
  }>;
}

interface CategoryCompletion {
  name: string;
  filledFields: number;
  totalFields: number;
  isComplete: boolean;
}

interface VaultCardStackProps {
  categories: Category[];
  completions: CategoryCompletion[];
  profileData: Record<string, unknown>;
  onCardClick: (category: Category) => void;
  initialVisibleCount?: number;
}

export default function VaultCardStack({
  categories,
  completions,
  profileData,
  onCardClick,
  initialVisibleCount = 6,
}: VaultCardStackProps) {
  const [expanded, setExpanded] = useState(false);

  // Determine which categories to show
  const visibleCategories = expanded
    ? categories
    : categories.slice(0, initialVisibleCount);

  const hiddenCount = categories.length - initialVisibleCount;

  // Generate preview text for a category based on profile data
  const generatePreview = (category: Category): string => {
    const previewValues: string[] = [];

    for (const fieldName of category.previewFields) {
      const value = profileData[fieldName];
      if (value && typeof value === "string" && value.trim()) {
        // Mask sensitive data
        if (
          category.isProtected &&
          (fieldName.toLowerCase().includes("id") ||
            fieldName.toLowerCase().includes("number"))
        ) {
          const masked = "****" + value.slice(-4);
          previewValues.push(masked);
        } else {
          previewValues.push(value);
        }
      }
    }

    return previewValues.join(", ");
  };

  // Determine card status for a category
  const getCardStatus = (category: Category): CardStatus => {
    const completion = completions.find((c) => c.name === category.name);

    if (!completion || completion.totalFields === 0) {
      return "empty";
    }

    if (category.isProtected && completion.filledFields > 0) {
      return "protected";
    }

    if (completion.isComplete) {
      return "complete";
    }

    if (completion.filledFields > 0) {
      return "incomplete";
    }

    return "empty";
  };

  return (
    <div className="space-y-3">
      {/* Category cards */}
      {visibleCategories.map((category) => (
        <VaultCard
          key={category.name}
          name={category.name}
          label={category.label}
          icon={category.icon}
          color={category.color}
          status={getCardStatus(category)}
          preview={generatePreview(category)}
          isProtected={category.isProtected}
          onClick={() => onCardClick(category)}
        />
      ))}

      {/* Show more / Show less button */}
      {hiddenCount > 0 && (
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 bg-gray-50 py-3 text-sm font-medium text-gray-600 transition-colors hover:border-gray-400 hover:bg-gray-100"
        >
          {expanded ? (
            <>
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 15l7-7 7 7"
                />
              </svg>
              Show less
            </>
          ) : (
            <>
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
              Show {hiddenCount} more categories
            </>
          )}
        </button>
      )}
    </div>
  );
}
