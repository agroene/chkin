"use client";

/**
 * Field Position Picker Component
 *
 * Visual component for selecting where to insert a new field
 * within a category. Shows existing fields and allows clicking
 * between them to select the insert position.
 *
 * @module components/admin/FieldPositionPicker
 */

import { useState, useEffect } from "react";

interface FieldDefinition {
  id: string;
  name: string;
  label: string;
  fieldType: string;
  sortOrder: number;
  isActive: boolean;
  config: Record<string, unknown> | null;
}

interface FieldPositionPickerProps {
  category: string;
  onPositionSelect: (insertAfterFieldId: string | null, sortOrder: number) => void;
  selectedPosition: string | null; // null means "at end", otherwise field ID to insert after
}

export default function FieldPositionPicker({
  category,
  onPositionSelect,
  selectedPosition,
}: FieldPositionPickerProps) {
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch fields when category changes
  useEffect(() => {
    if (!category) {
      setFields([]);
      return;
    }

    async function fetchFields() {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams({
          category,
          isActive: "true",
          limit: "100",
        });

        const response = await fetch(`/api/admin/fields?${params}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.error || "Failed to fetch fields");
        }

        // Filter out linked address sub-fields to avoid cluttering the view
        const linkedFieldNames = new Set<string>();
        for (const field of data.data) {
          if (field.fieldType === "address" && field.config?.linkedFields) {
            Object.values(field.config.linkedFields).forEach((name) => {
              if (name) linkedFieldNames.add(name as string);
            });
          }
        }

        const filteredFields = data.data.filter(
          (f: FieldDefinition) => !linkedFieldNames.has(f.name)
        );

        setFields(filteredFields);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    }

    fetchFields();
  }, [category]);

  // Reset selection when category changes
  useEffect(() => {
    onPositionSelect(null, fields.length);
  }, [category]); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle position selection
  function handleSelectPosition(insertAfterFieldId: string | null) {
    if (insertAfterFieldId === null) {
      // Insert at end
      onPositionSelect(null, fields.length);
    } else {
      // Find the field's index and set sortOrder to insert after it
      const fieldIndex = fields.findIndex((f) => f.id === insertAfterFieldId);
      onPositionSelect(insertAfterFieldId, fieldIndex + 1);
    }
  }

  if (!category) {
    return (
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 text-center text-sm text-gray-500">
        Select a category first to choose the field position
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-600">
        {error}
      </div>
    );
  }

  if (fields.length === 0) {
    return (
      <div className="rounded-lg border border-teal-200 bg-teal-50 p-4 text-center">
        <p className="text-sm text-teal-700">
          This will be the first field in the <strong>{category}</strong> category
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      <p className="mb-2 text-xs text-gray-500">
        Click to choose where the new field will be inserted:
      </p>

      {/* Insert at beginning option */}
      <InsertionPoint
        label="Insert at beginning"
        isSelected={selectedPosition === "start"}
        onClick={() => handleSelectPosition(null)}
        isFirst
      />

      {/* Existing fields with insertion points between them */}
      {fields.map((field, index) => (
        <div key={field.id}>
          {/* Field display */}
          <div className="flex items-center gap-2 rounded border border-gray-200 bg-white px-3 py-2">
            <span className="text-xs font-medium text-gray-400">
              {index + 1}.
            </span>
            <span className="flex-1 text-sm text-gray-700">{field.label}</span>
            {getFieldTypeBadge(field.fieldType)}
          </div>

          {/* Insertion point after this field */}
          <InsertionPoint
            label={`Insert after "${field.label}"`}
            isSelected={selectedPosition === field.id}
            onClick={() => handleSelectPosition(field.id)}
          />
        </div>
      ))}

      {/* Summary of selected position */}
      <div className="mt-3 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2">
        <p className="text-sm text-teal-700">
          {selectedPosition === null || selectedPosition === "start" ? (
            <>
              New field will be added at the{" "}
              <strong>
                {selectedPosition === "start" ? "beginning" : "end"}
              </strong>{" "}
              of the <strong>{category}</strong> category
            </>
          ) : (
            <>
              New field will be inserted{" "}
              <strong>
                after &quot;{fields.find((f) => f.id === selectedPosition)?.label}&quot;
              </strong>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

/**
 * Insertion point component - clickable zone between fields
 */
function InsertionPoint({
  label,
  isSelected,
  onClick,
  isFirst = false,
}: {
  label: string;
  isSelected: boolean;
  onClick: () => void;
  isFirst?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group my-1 flex w-full items-center justify-center rounded border-2 border-dashed py-1.5 transition-all ${
        isSelected
          ? "border-teal-500 bg-teal-50"
          : "border-transparent hover:border-teal-300 hover:bg-teal-50/50"
      }`}
      title={label}
    >
      <div
        className={`flex items-center gap-1 text-xs ${
          isSelected ? "text-teal-600" : "text-gray-400 group-hover:text-teal-500"
        }`}
      >
        {isSelected && (
          <>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 4v16m8-8H4"
              />
            </svg>
            <span className="font-medium">
              {isFirst ? "Insert here (beginning)" : "Insert here"}
            </span>
          </>
        )}
        {!isSelected && (
          <span className="opacity-0 transition-opacity group-hover:opacity-100">
            + Click to insert here
          </span>
        )}
      </div>
    </button>
  );
}

/**
 * Get field type badge
 */
function getFieldTypeBadge(fieldType: string) {
  const typeColors: Record<string, string> = {
    text: "bg-gray-100 text-gray-700",
    email: "bg-blue-100 text-blue-700",
    phone: "bg-green-100 text-green-700",
    date: "bg-purple-100 text-purple-700",
    select: "bg-yellow-100 text-yellow-700",
    address: "bg-cyan-100 text-cyan-700",
    checkbox: "bg-pink-100 text-pink-700",
    textarea: "bg-gray-100 text-gray-700",
    number: "bg-indigo-100 text-indigo-700",
    country: "bg-teal-100 text-teal-700",
  };

  return (
    <span
      className={`rounded px-1.5 py-0.5 text-xs ${typeColors[fieldType] || "bg-gray-100 text-gray-700"}`}
    >
      {fieldType}
    </span>
  );
}
