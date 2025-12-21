"use client";

/**
 * Field Library List Component
 *
 * Displays field definitions with:
 * - Address fields grouped with their linked sub-fields
 * - Drag-and-drop reordering (address + linked fields move as a unit)
 * - Visual indicators for field types, status, and usage
 *
 * @module components/admin/FieldLibraryList
 */

import { useState } from "react";
import { StatusBadge } from "@/components/ui";

interface FieldDefinition {
  id: string;
  name: string;
  label: string;
  description: string;
  fieldType: string;
  category: string;
  config: Record<string, unknown> | null;
  validation: Record<string, unknown> | null;
  sortOrder: number;
  isActive: boolean;
  specialPersonalInfo: boolean;
  requiresExplicitConsent: boolean;
  createdAt: string;
  updatedAt: string;
  usageCount: number;
}

interface FieldGroup {
  type: "single" | "address-group";
  parentField: FieldDefinition;
  linkedFields: FieldDefinition[];
}

interface FieldLibraryListProps {
  fields: FieldDefinition[];
  category: string;
  onFieldClick: (field: FieldDefinition) => void;
  onDeleteField: (field: FieldDefinition, e: React.MouseEvent) => void;
  onReorder: (fieldIds: string[]) => Promise<void>;
  deletingId: string | null;
  loading?: boolean;
}

export default function FieldLibraryList({
  fields,
  category,
  onFieldClick,
  onDeleteField,
  onReorder,
  deletingId,
  loading = false,
}: FieldLibraryListProps) {
  const [draggedGroup, setDraggedGroup] = useState<string | null>(null);
  const [dragOverGroup, setDragOverGroup] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [reordering, setReordering] = useState(false);

  // Group fields by address parent
  const fieldGroups = groupFields(fields);

  // Toggle group expansion
  function toggleGroup(groupId: string) {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  }

  // Handle drag start
  function handleDragStart(groupId: string) {
    setDraggedGroup(groupId);
  }

  // Handle drag over
  function handleDragOver(e: React.DragEvent, groupId: string) {
    e.preventDefault();
    if (draggedGroup && draggedGroup !== groupId) {
      setDragOverGroup(groupId);
    }
  }

  // Handle drag leave
  function handleDragLeave() {
    setDragOverGroup(null);
  }

  // Handle drop
  async function handleDrop(targetGroupId: string) {
    if (!draggedGroup || draggedGroup === targetGroupId || !category) {
      setDraggedGroup(null);
      setDragOverGroup(null);
      return;
    }

    // Find indices
    const draggedIdx = fieldGroups.findIndex(
      (g) => g.parentField.id === draggedGroup
    );
    const targetIdx = fieldGroups.findIndex(
      (g) => g.parentField.id === targetGroupId
    );

    if (draggedIdx === -1 || targetIdx === -1) {
      setDraggedGroup(null);
      setDragOverGroup(null);
      return;
    }

    // Reorder groups
    const newGroups = [...fieldGroups];
    const [removed] = newGroups.splice(draggedIdx, 1);
    newGroups.splice(targetIdx, 0, removed);

    // Build new field order (flatten groups back to field IDs)
    const newFieldIds: string[] = [];
    for (const group of newGroups) {
      newFieldIds.push(group.parentField.id);
      for (const linked of group.linkedFields) {
        newFieldIds.push(linked.id);
      }
    }

    setDraggedGroup(null);
    setDragOverGroup(null);
    setReordering(true);

    try {
      await onReorder(newFieldIds);
    } finally {
      setReordering(false);
    }
  }

  // Handle drag end
  function handleDragEnd() {
    setDraggedGroup(null);
    setDragOverGroup(null);
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  // Empty state
  if (fields.length === 0) {
    return (
      <div className="py-12 text-center">
        <svg
          className="mx-auto h-12 w-12 text-gray-400"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 10h16M4 14h16M4 18h16"
          />
        </svg>
        <p className="mt-2 text-gray-500">No fields found</p>
      </div>
    );
  }

  return (
    <div className={`space-y-2 ${reordering ? "opacity-60" : ""}`}>
      {/* Drag hint when category is selected */}
      {category && fieldGroups.length > 1 && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-teal-200 bg-teal-50 px-3 py-2 text-sm text-teal-700">
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
          </svg>
          Drag fields to reorder within this category
        </div>
      )}

      {fieldGroups.map((group) => {
        const isExpanded = expandedGroups.has(group.parentField.id);
        const isDragging = draggedGroup === group.parentField.id;
        const isDragOver = dragOverGroup === group.parentField.id;

        return (
          <div
            key={group.parentField.id}
            draggable={!!category && fieldGroups.length > 1}
            onDragStart={() => handleDragStart(group.parentField.id)}
            onDragOver={(e) => handleDragOver(e, group.parentField.id)}
            onDragLeave={handleDragLeave}
            onDrop={() => handleDrop(group.parentField.id)}
            onDragEnd={handleDragEnd}
            className={`rounded-lg border transition-all ${
              isDragging
                ? "border-teal-400 bg-teal-50 opacity-50"
                : isDragOver
                  ? "border-teal-500 border-2 bg-teal-50"
                  : group.type === "address-group"
                    ? "border-teal-200 bg-white"
                    : "border-gray-200 bg-white hover:border-gray-300"
            }`}
          >
            {/* Parent Field Row */}
            <div
              onClick={() =>
                group.type === "address-group"
                  ? toggleGroup(group.parentField.id)
                  : onFieldClick(group.parentField)
              }
              className={`flex items-center gap-3 p-4 ${
                group.type === "address-group"
                  ? "cursor-pointer"
                  : "cursor-pointer hover:bg-gray-50"
              }`}
            >
              {/* Drag Handle */}
              {category && fieldGroups.length > 1 && (
                <div className="cursor-grab text-gray-400 hover:text-gray-600">
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 8h16M4 16h16"
                    />
                  </svg>
                </div>
              )}

              {/* Group Indicator for Address Fields */}
              {group.type === "address-group" && (
                <div className="flex items-center gap-1 text-teal-600">
                  <svg
                    className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-90" : ""}`}
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
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                    />
                  </svg>
                </div>
              )}

              {/* Field Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {group.parentField.label}
                  </span>
                  {getFieldTypeBadge(group.parentField.fieldType)}
                  {group.type === "address-group" && (
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                      +{group.linkedFields.length} linked
                    </span>
                  )}
                </div>
                <div className="mt-0.5 font-mono text-sm text-gray-500">
                  {group.parentField.name}
                </div>
              </div>

              {/* Flags */}
              <div className="hidden items-center gap-1 md:flex">
                {group.parentField.specialPersonalInfo && (
                  <span
                    className="inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800"
                    title="POPIA Special Personal Info"
                  >
                    SPI
                  </span>
                )}
                {group.parentField.requiresExplicitConsent && (
                  <span
                    className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800"
                    title="Requires Explicit Consent"
                  >
                    Consent
                  </span>
                )}
              </div>

              {/* Usage */}
              <div className="hidden text-sm md:block">
                {group.parentField.usageCount > 0 ? (
                  <span className="text-gray-700">
                    {group.parentField.usageCount} form(s)
                  </span>
                ) : (
                  <span className="text-gray-400">-</span>
                )}
              </div>

              {/* Status */}
              <StatusBadge
                status={group.parentField.isActive ? "approved" : "rejected"}
                label={group.parentField.isActive ? "Active" : "Inactive"}
              />

              {/* Actions */}
              <div className="flex items-center gap-2">
                {/* View/Edit (for address groups, click the expand button) */}
                {group.type !== "address-group" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onFieldClick(group.parentField);
                    }}
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                    title="View field"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                )}

                {/* Delete */}
                <button
                  onClick={(e) => onDeleteField(group.parentField, e)}
                  disabled={deletingId === group.parentField.id}
                  className={`rounded p-1.5 transition-colors ${
                    deletingId === group.parentField.id
                      ? "cursor-not-allowed text-gray-300"
                      : "text-gray-400 hover:bg-red-50 hover:text-red-600"
                  }`}
                  title={
                    group.parentField.usageCount > 0
                      ? "Deactivate field"
                      : group.type === "address-group"
                        ? "Delete field and linked sub-fields"
                        : "Delete field"
                  }
                >
                  {deletingId === group.parentField.id ? (
                    <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Linked Fields (Expandable) */}
            {group.type === "address-group" && isExpanded && (
              <div className="border-t border-teal-200 bg-teal-50/50">
                {group.linkedFields.map((linkedField, index) => (
                  <div
                    key={linkedField.id}
                    onClick={() => onFieldClick(linkedField)}
                    className={`flex cursor-pointer items-center gap-3 px-4 py-3 hover:bg-teal-100/50 ${
                      index < group.linkedFields.length - 1
                        ? "border-b border-teal-100"
                        : ""
                    }`}
                  >
                    {/* Indent spacer */}
                    <div className="w-5" />
                    {/* Link icon */}
                    <div className="text-teal-400">
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M7 8l4-4m0 0l4 4m-4-4v18"
                        />
                      </svg>
                    </div>

                    {/* Field Info */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-700">
                          {linkedField.label}
                        </span>
                        {getFieldTypeBadge(linkedField.fieldType)}
                      </div>
                      <div className="font-mono text-xs text-gray-500">
                        {linkedField.name}
                      </div>
                    </div>

                    {/* Status */}
                    <StatusBadge
                      status={linkedField.isActive ? "approved" : "rejected"}
                      label={linkedField.isActive ? "Active" : "Inactive"}
                    />

                    {/* View button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onFieldClick(linkedField);
                      }}
                      className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                      title="View field"
                    >
                      <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

/**
 * Group fields by address parent
 * Address fields are grouped with their linked sub-fields
 */
function groupFields(fields: FieldDefinition[]): FieldGroup[] {
  const groups: FieldGroup[] = [];
  const linkedFieldNames = new Set<string>();

  // First pass: identify all linked field names
  for (const field of fields) {
    if (field.fieldType === "address" && field.config) {
      const linkedFields = (field.config as { linkedFields?: Record<string, string> }).linkedFields;
      if (linkedFields) {
        Object.values(linkedFields).forEach((name) => {
          if (name) linkedFieldNames.add(name);
        });
      }
    }
  }

  // Second pass: group fields
  for (const field of fields) {
    // Skip if this field is a linked sub-field (will be included in parent's group)
    if (linkedFieldNames.has(field.name)) {
      continue;
    }

    if (field.fieldType === "address" && field.config) {
      const linkedFieldsConfig = (field.config as { linkedFields?: Record<string, string> }).linkedFields;
      if (linkedFieldsConfig) {
        const linkedFieldObjects = Object.values(linkedFieldsConfig)
          .filter(Boolean)
          .map((name) => fields.find((f) => f.name === name))
          .filter((f): f is FieldDefinition => f !== undefined);

        groups.push({
          type: "address-group",
          parentField: field,
          linkedFields: linkedFieldObjects,
        });
      } else {
        groups.push({
          type: "single",
          parentField: field,
          linkedFields: [],
        });
      }
    } else {
      groups.push({
        type: "single",
        parentField: field,
        linkedFields: [],
      });
    }
  }

  return groups;
}

/**
 * Get field type badge
 */
function getFieldTypeBadge(fieldType: string) {
  const typeColors: Record<string, string> = {
    text: "bg-gray-100 text-gray-800",
    email: "bg-blue-100 text-blue-800",
    phone: "bg-green-100 text-green-800",
    date: "bg-purple-100 text-purple-800",
    datetime: "bg-purple-100 text-purple-800",
    select: "bg-yellow-100 text-yellow-800",
    multiselect: "bg-yellow-100 text-yellow-800",
    checkbox: "bg-pink-100 text-pink-800",
    radio: "bg-pink-100 text-pink-800",
    textarea: "bg-gray-100 text-gray-800",
    number: "bg-indigo-100 text-indigo-800",
    file: "bg-orange-100 text-orange-800",
    signature: "bg-red-100 text-red-800",
    country: "bg-teal-100 text-teal-800",
    currency: "bg-emerald-100 text-emerald-800",
    address: "bg-cyan-100 text-cyan-800",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${typeColors[fieldType] || "bg-gray-100 text-gray-800"}`}
    >
      {fieldType}
    </span>
  );
}
