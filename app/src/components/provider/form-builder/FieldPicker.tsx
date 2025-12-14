"use client";

/**
 * Field Picker Component
 *
 * Browse and search fields from the field library to add to forms.
 */

import { useState, useEffect, useCallback } from "react";

interface FieldDefinition {
  id: string;
  canonicalName: string;
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
  selectedFieldIds: string[];
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
};

export default function FieldPicker({ onAddField, selectedFieldIds }: FieldPickerProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [fields, setFields] = useState<FieldDefinition[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const response = await fetch("/api/admin/fields/categories");
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

      const response = await fetch(`/api/admin/fields?${params}`);
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

          {/* Category Pills */}
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedCategory(null)}
              className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                selectedCategory === null
                  ? "bg-teal-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              All
            </button>
            {categories.slice(0, 8).map((cat) => (
              <button
                key={cat.name}
                onClick={() => setSelectedCategory(cat.name)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  selectedCategory === cat.name
                    ? "bg-teal-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Fields List */}
          <div className="mt-4 max-h-80 space-y-2 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
              </div>
            ) : fields.length === 0 ? (
              <p className="py-4 text-center text-sm text-gray-500">
                No fields found
              </p>
            ) : (
              fields.map((field) => {
                const isSelected = selectedFieldIds.includes(field.id);
                return (
                  <div
                    key={field.id}
                    className={`flex items-center justify-between rounded-lg border p-3 ${
                      isSelected
                        ? "border-teal-200 bg-teal-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
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
                      </div>
                      {field.description && (
                        <p className="mt-0.5 truncate text-xs text-gray-500">
                          {field.description}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => onAddField(field)}
                      disabled={isSelected}
                      className={`ml-3 flex-shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium ${
                        isSelected
                          ? "cursor-not-allowed bg-gray-100 text-gray-400"
                          : "bg-teal-100 text-teal-700 hover:bg-teal-200"
                      }`}
                    >
                      {isSelected ? "Added" : "Add"}
                    </button>
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
