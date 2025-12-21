"use client";

/**
 * Field Picker Component
 *
 * Browse and search fields from the field library to add to forms.
 * Groups address fields with their linked sub-fields for visual organization.
 * When adding address-type fields, automatically adds linked sub-fields as a group.
 */

import { useState, useEffect, useCallback } from "react";

interface FieldDefinition {
  id: string;
  name: string;
  label: string;
  description: string | null;
  fieldType: string;
  config: string | null;
  category: string;
}

interface Category {
  name: string;
  label: string;
  count: number;
}

interface FieldPickerProps {
  onAddField: (field: FieldDefinition) => void;
  onAddFieldGroup?: (parentField: FieldDefinition, linkedFields: FieldDefinition[]) => void;
  selectedFieldIds: string[];
}

// Field group structure for organizing display
interface FieldGroup {
  type: "single" | "address-group";
  parentField: FieldDefinition;
  linkedFields: FieldDefinition[];
}

const FIELD_TYPE_COLORS: Record<string, string> = {
  text: "bg-blue-100 text-blue-800",
  email: "bg-purple-100 text-purple-800",
  phone: "bg-green-100 text-green-800",
  number: "bg-yellow-100 text-yellow-800",
  date: "bg-orange-100 text-orange-800",
  select: "bg-pink-100 text-pink-800",
  checkbox: "bg-indigo-100 text-indigo-800",
  textarea: "bg-gray-100 text-gray-800",
  file: "bg-red-100 text-red-800",
  address: "bg-teal-100 text-teal-800",
  country: "bg-emerald-100 text-emerald-800",
  radio: "bg-violet-100 text-violet-800",
};

/**
 * Group fields by address parent
 * Address fields are grouped with their linked sub-fields
 */
function groupFields(fields: FieldDefinition[]): FieldGroup[] {
  const groups: FieldGroup[] = [];
  const linkedFieldNames = new Set<string>();

  // First pass: identify all linked field names from address field configs
  for (const field of fields) {
    if (field.fieldType === "address" && field.config) {
      try {
        const config = typeof field.config === "string" ? JSON.parse(field.config) : field.config;
        if (config.linkedFields) {
          Object.values(config.linkedFields).forEach((name) => {
            if (name) linkedFieldNames.add(name as string);
          });
        }
      } catch {
        // Config parsing failed, skip
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
      try {
        const config = typeof field.config === "string" ? JSON.parse(field.config) : field.config;
        if (config.linkedFields) {
          const linkedFieldObjects = Object.values(config.linkedFields)
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
      } catch {
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

export default function FieldPicker({ onAddField, onAddFieldGroup, selectedFieldIds }: FieldPickerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [addingField, setAddingField] = useState<string | null>(null); // Track field being added (for async operations)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set()); // Track expanded address groups

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

  // Group fields for display
  const fieldGroups = groupFields(fields);

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch("/api/provider/fields/categories");
        if (response.ok) {
          const data = await response.json();
          setCategories(data.categories || []);
        }
      } catch {
        // Handle error silently
      }
    }
    fetchCategories();
  }, []);

  // Fetch fields
  const fetchFields = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("status", "active");
      params.set("limit", "100");
      if (selectedCategory) params.set("category", selectedCategory);
      if (search) params.set("search", search);

      const response = await fetch(`/api/provider/fields?${params}`);
      if (response.ok) {
        const data = await response.json();
        setFields(data.fields || []);
      }
    } catch {
      // Handle error silently
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, search]);

  useEffect(() => {
    fetchFields();
  }, [fetchFields]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchFields();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, fetchFields]);

  // Handle adding a field - checks for address type to add linked fields as group
  const handleAddField = useCallback(async (field: FieldDefinition) => {
    // If it's an address field and we have the group callback, fetch linked fields
    if (field.fieldType === "address" && onAddFieldGroup) {
      setAddingField(field.id);
      try {
        const response = await fetch(`/api/provider/fields/linked?parentFieldId=${field.id}`, {
          credentials: "include", // Include cookies for auth
        });
        if (response.ok) {
          const data = await response.json();
          console.log("Linked fields API response:", data);
          if (data.linkedFields && data.linkedFields.length > 0) {
            // Add as a group (parent + linked fields)
            onAddFieldGroup(field, data.linkedFields);
          } else {
            // No linked fields found, add just the parent
            console.log("No linked fields found, adding just parent");
            onAddField(field);
          }
        } else {
          // API call failed, add just the parent
          console.error("Linked fields API failed:", response.status, response.statusText);
          onAddField(field);
        }
      } catch (error) {
        // Error fetching linked fields, add just the parent
        console.error("Error fetching linked fields:", error);
        onAddField(field);
      } finally {
        setAddingField(null);
      }
    } else {
      // Not an address field, add normally
      onAddField(field);
    }
  }, [onAddField, onAddFieldGroup]);

  return (
    <div className="rounded-lg border border-gray-200 bg-white">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center justify-between p-4 hover:bg-gray-50"
      >
        <div className="flex items-center gap-2">
          <svg
            className="h-5 w-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 6v6m0 0v6m0-6h6m-6 0H6"
            />
          </svg>
          <span className="font-medium text-gray-900">Add Fields</span>
        </div>
        <svg
          className={`h-5 w-5 text-gray-400 transition-transform ${
            expanded ? "rotate-180" : ""
          }`}
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
      </button>

      {expanded && (
        <div className="border-t border-gray-200 p-4">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search fields..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-4 py-2 pl-10 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
            />
            <svg
              className="absolute left-3 top-2.5 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          {/* Category Pills - Scrollable to show all */}
          <div className="mt-4 max-h-24 overflow-y-auto">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setSelectedCategory(null)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedCategory === null
                    ? "bg-teal-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                All ({categories.reduce((sum, c) => sum + c.count, 0)})
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.name}
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    selectedCategory === cat.name
                      ? "bg-teal-600 text-white"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                  }`}
                >
                  {cat.label} ({cat.count})
                </button>
              ))}
            </div>
          </div>

          {/* Fields List - Grouped */}
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
              </div>
            ) : fieldGroups.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">
                No fields found
              </p>
            ) : (
              fieldGroups.map((group) => {
                const field = group.parentField;
                const isSelected = selectedFieldIds.includes(field.id);
                const isAdding = addingField === field.id;
                const isAddressGroup = group.type === "address-group";
                const isGroupExpanded = expandedGroups.has(field.id);

                // Check if all linked fields are also selected (for address groups)
                const allLinkedSelected = isAddressGroup &&
                  group.linkedFields.every(lf => selectedFieldIds.includes(lf.id));

                return (
                  <div
                    key={field.id}
                    className={`rounded-lg border transition-all ${
                      isSelected || allLinkedSelected
                        ? "border-teal-200 bg-teal-50/50"
                        : isAddressGroup
                          ? "border-teal-200"
                          : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    {/* Parent Field Row */}
                    <div className="flex items-center justify-between p-3">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        {/* Expand/Collapse for address groups */}
                        {isAddressGroup && (
                          <button
                            onClick={() => toggleGroup(field.id)}
                            className="flex-shrink-0 rounded p-0.5 text-teal-600 hover:bg-teal-100"
                          >
                            <svg
                              className={`h-4 w-4 transition-transform ${isGroupExpanded ? "rotate-90" : ""}`}
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
                          </button>
                        )}

                        {/* Link icon for address groups */}
                        {isAddressGroup && (
                          <svg className="h-4 w-4 flex-shrink-0 text-teal-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"
                            />
                          </svg>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900">
                              {field.label}
                            </span>
                            <span
                              className={`rounded px-1.5 py-0.5 text-xs ${
                                FIELD_TYPE_COLORS[field.fieldType] ||
                                "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {field.fieldType}
                            </span>
                            {isAddressGroup && (
                              <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                                +{group.linkedFields.length} linked
                              </span>
                            )}
                          </div>
                          {field.description && (
                            <p className="mt-0.5 truncate text-xs text-gray-500">
                              {field.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => handleAddField(field)}
                        disabled={isSelected || isAdding}
                        className={`ml-3 flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
                          isSelected
                            ? "cursor-not-allowed bg-gray-100 text-gray-400"
                            : isAdding
                            ? "cursor-wait bg-teal-50 text-teal-400"
                            : "bg-teal-100 text-teal-700 hover:bg-teal-200"
                        }`}
                      >
                        {isSelected ? "Added" : isAdding ? "Adding..." : isAddressGroup ? "Add Group" : "Add"}
                      </button>
                    </div>

                    {/* Linked Fields (Expandable) */}
                    {isAddressGroup && isGroupExpanded && (
                      <div className="border-t border-teal-200 bg-teal-50/30">
                        {group.linkedFields.map((linkedField, index) => {
                          const linkedIsSelected = selectedFieldIds.includes(linkedField.id);
                          return (
                            <div
                              key={linkedField.id}
                              className={`flex items-center gap-2 px-3 py-2 ${
                                index < group.linkedFields.length - 1
                                  ? "border-b border-teal-100"
                                  : ""
                              }`}
                            >
                              {/* Indent spacer */}
                              <div className="w-4" />
                              {/* Sub-field indicator */}
                              <svg className="h-3 w-3 flex-shrink-0 text-teal-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M9 5l7 7-7 7"
                                />
                              </svg>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  <span className="text-sm text-gray-700">
                                    {linkedField.label}
                                  </span>
                                  <span
                                    className={`rounded px-1.5 py-0.5 text-xs ${
                                      FIELD_TYPE_COLORS[linkedField.fieldType] ||
                                      "bg-gray-100 text-gray-800"
                                    }`}
                                  >
                                    {linkedField.fieldType}
                                  </span>
                                  {linkedIsSelected && (
                                    <span className="text-xs text-teal-600">added</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div className="px-3 py-2 text-xs text-teal-600">
                          These fields are automatically added with the address field
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
