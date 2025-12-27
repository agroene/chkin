/**
 * Vault Sheet Component
 *
 * Slide-up bottom sheet for viewing/editing category details.
 * Mobile-optimized with backdrop dismiss and close button.
 */

"use client";

import { useEffect, useState, useCallback } from "react";
import { CategoryIcon } from "./CategoryIcon";
import CategoryFieldRenderer from "./CategoryFieldRenderer";

interface Field {
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
}

interface Category {
  name: string;
  label: string;
  description?: string | null;
  icon: string;
  color?: string | null;
  isProtected: boolean;
  fields: Field[];
}

interface VaultSheetProps {
  category: Category | null;
  isOpen: boolean;
  onClose: () => void;
  profileData: Record<string, unknown>;
  onSave: (updates: Record<string, unknown>) => Promise<void>;
  incompleteOnly?: boolean; // Only show incomplete fields and start in edit mode
}

// Check if a field value is considered "filled"
// A field is filled if it has a value, OR if it's marked as N/A
const isFieldFilled = (value: unknown, naFields: Record<string, boolean>, fieldName: string): boolean => {
  // If marked as N/A, it's considered filled
  if (naFields[fieldName]) return true;

  // Check if value exists and is not empty
  if (value === null || value === undefined || value === "") return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
};

export default function VaultSheet({
  category,
  isOpen,
  onClose,
  profileData,
  onSave,
  incompleteOnly = false,
}: VaultSheetProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Track N/A fields - stored as _na_fieldName in profile data
  const [naFields, setNaFields] = useState<Record<string, boolean>>({});

  // Reset state when category changes or sheet opens
  useEffect(() => {
    if (category && isOpen) {
      // If incompleteOnly mode, start in editing mode
      setIsEditing(incompleteOnly);
      setEditData({});
      setError(null);

      // Load existing N/A markers from profile data
      const existingNa: Record<string, boolean> = {};
      category.fields.forEach(field => {
        const naKey = `_na_${field.name}`;
        if (profileData[naKey] === true) {
          existingNa[field.name] = true;
        }
      });
      setNaFields(existingNa);
    }
  }, [category, isOpen, incompleteOnly, profileData]);

  // Close on escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen, onClose]);

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // Handle field value changes
  const handleFieldChange = useCallback((fieldName: string, value: unknown) => {
    setEditData((prev) => ({ ...prev, [fieldName]: value }));
  }, []);

  // Handle multiple field changes at once (for composite fields)
  const handleMultiFieldChange = useCallback((updates: Record<string, unknown>) => {
    setEditData((prev) => ({ ...prev, ...updates }));
  }, []);

  // Handle N/A toggle for a field
  const handleNaToggle = useCallback((fieldName: string, isNa: boolean) => {
    setNaFields(prev => ({ ...prev, [fieldName]: isNa }));
    // If marking as N/A, clear any value being edited
    if (isNa) {
      setEditData(prev => {
        const updated = { ...prev };
        delete updated[fieldName];
        return updated;
      });
    }
  }, []);

  // Handle save
  const handleSave = async () => {
    if (!category) return;

    setSaving(true);
    setError(null);

    try {
      // Merge edit data with N/A markers
      const updates: Record<string, unknown> = { ...editData };

      // Add N/A markers for fields
      category.fields.forEach(field => {
        const naKey = `_na_${field.name}`;
        const wasNa = profileData[naKey] === true;
        const isNa = naFields[field.name] || false;

        // Only update if changed
        if (wasNa !== isNa) {
          updates[naKey] = isNa;
          // If marking as N/A, clear the actual field value
          if (isNa && profileData[field.name]) {
            updates[field.name] = null;
          }
        }
      });

      await onSave(updates);
      setIsEditing(false);
      setEditData({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  };

  // Handle cancel editing
  const handleCancel = () => {
    setIsEditing(false);
    setEditData({});
    setError(null);
  };

  // Get field value (editing takes precedence)
  const getFieldValue = (fieldName: string): unknown => {
    if (isEditing && fieldName in editData) {
      return editData[fieldName];
    }
    return profileData[fieldName];
  };

  if (!category) return null;

  // Color classes for icon background
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

  const iconColorClass = colorClasses[category.color || "teal"] || colorClasses.teal;

  return (
    <div
      className={`fixed inset-0 z-50 transition-opacity duration-300 ${
        isOpen ? "opacity-100" : "pointer-events-none opacity-0"
      }`}
    >
      {/* Backdrop - tap to close */}
      <div
        className="absolute inset-0 bg-black/50"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sheet container - centers on desktop */}
      <div className="absolute inset-x-0 bottom-0 flex justify-center">
        {/* Sheet - constrained to max-w-lg on desktop to match main content */}
        <div
          className={`w-full max-w-lg max-h-[90vh] transform overflow-hidden rounded-t-2xl bg-white shadow-xl transition-transform duration-300 ease-out ${
            isOpen ? "translate-y-0" : "translate-y-full"
          }`}
        >
          {/* Header */}
          <div className="sticky top-0 z-10 border-b border-gray-200 bg-white px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`rounded-lg p-2 ${iconColorClass}`}>
                  <CategoryIcon name={category.icon} className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-gray-900">
                    {category.label}
                  </h2>
                  {category.description && (
                    <p className="text-sm text-gray-500">{category.description}</p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Edit/Save button */}
                {isEditing ? (
                  <>
                    <button
                      onClick={handleCancel}
                      disabled={saving}
                      className="rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-100"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
                    >
                      {saving ? "Saving..." : "Save"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="rounded-lg px-3 py-1.5 text-sm font-medium text-teal-600 hover:bg-teal-50"
                  >
                    Edit
                  </button>
                )}

                {/* Close button */}
                <button
                  onClick={onClose}
                  className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  aria-label="Close"
                >
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
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Protected category warning */}
            {category.isProtected && (
              <div className="mt-3 flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                    clipRule="evenodd"
                  />
                </svg>
                This category contains sensitive information
              </div>
            )}

            {/* Error message */}
            {error && (
              <div className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
          </div>

          {/* Content - scrollable */}
          <div className="overflow-y-auto px-4 py-4" style={{ maxHeight: "calc(90vh - 120px)" }}>
            {(() => {
              // Filter fields if incompleteOnly mode
              const fieldsToShow = incompleteOnly
                ? category.fields.filter(field => !isFieldFilled(profileData[field.name], naFields, field.name))
                : category.fields;

              if (category.fields.length === 0) {
                return (
                  <div className="py-8 text-center text-gray-500">
                    <p>No fields in this category yet.</p>
                  </div>
                );
              }

              if (incompleteOnly && fieldsToShow.length === 0) {
                return (
                  <div className="py-8 text-center">
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                      <svg className="h-8 w-8 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                    <p className="text-gray-500">All fields complete!</p>
                  </div>
                );
              }

              return (
                <div className="space-y-4">
                  {/* Show header for incomplete-only mode */}
                  {incompleteOnly && (
                    <div className="mb-2 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700">
                      Complete these {fieldsToShow.length} remaining field{fieldsToShow.length !== 1 ? "s" : ""}
                    </div>
                  )}
                  {fieldsToShow.map((field) => (
                    <CategoryFieldRenderer
                      key={field.id}
                      field={field}
                      value={getFieldValue(field.name)}
                      isEditing={isEditing}
                      onChange={(value) => handleFieldChange(field.name, value)}
                      isNa={naFields[field.name] || false}
                      onNaToggle={(isNa) => handleNaToggle(field.name, isNa)}
                      profileData={{ ...profileData, ...editData }}
                      onMultiFieldChange={handleMultiFieldChange}
                    />
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}
