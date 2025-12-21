"use client";

/**
 * New Field Page
 *
 * Create a new field definition in the field library.
 *
 * @module app/(admin)/admin/fields/new/page
 */

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Card, Button, Input } from "@/components/ui";
import { PageHeader } from "@/components/layout";
import FieldPositionPicker from "@/components/admin/FieldPositionPicker";

// Valid categories
const CATEGORIES = [
  { key: "personal", label: "Personal Information" },
  { key: "identity", label: "Identity Documents" },
  { key: "contact", label: "Contact Details" },
  { key: "address", label: "Address Information" },
  { key: "emergency", label: "Emergency Contacts" },
  { key: "responsible", label: "Responsible Party" },
  { key: "preferences", label: "Preferences" },
  { key: "medical", label: "Medical Information" },
  { key: "insurance", label: "Insurance" },
  { key: "education", label: "Education" },
  { key: "employment", label: "Employment" },
  { key: "events", label: "Events & Hospitality" },
  { key: "membership", label: "Membership" },
  { key: "legal", label: "Legal & Business" },
  { key: "financial", label: "Financial Compliance" },
  { key: "consent", label: "Consent & Signatures" },
];

// Valid field types
const FIELD_TYPES = [
  { key: "text", label: "Text" },
  { key: "email", label: "Email" },
  { key: "phone", label: "Phone" },
  { key: "date", label: "Date" },
  { key: "datetime", label: "Date & Time" },
  { key: "select", label: "Select (Dropdown)" },
  { key: "multiselect", label: "Multi-Select" },
  { key: "checkbox", label: "Checkbox" },
  { key: "radio", label: "Radio Buttons" },
  { key: "textarea", label: "Text Area" },
  { key: "number", label: "Number" },
  { key: "file", label: "File Upload" },
  { key: "signature", label: "Signature" },
  { key: "country", label: "Country" },
  { key: "currency", label: "Currency" },
  { key: "address", label: "Address (Google Places)" },
];

export default function NewFieldPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: "",
    label: "",
    description: "",
    fieldType: "text",
    category: "personal",
    sortOrder: 0,
    insertAfterFieldId: null as string | null,
    specialPersonalInfo: false,
    requiresExplicitConsent: false,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  // Handle position selection from FieldPositionPicker
  function handlePositionSelect(insertAfterFieldId: string | null, sortOrder: number) {
    setForm({
      ...form,
      insertAfterFieldId,
      sortOrder,
    });
  }

  function generateCanonicalName(label: string): string {
    return label
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .split(/\s+/)
      .map((word, index) => {
        if (!word) return "";
        if (index === 0) {
          return word.toLowerCase();
        }
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join("");
  }

  function handleLabelChange(value: string) {
    setForm({
      ...form,
      label: value,
      name: generateCanonicalName(value),
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    // Validate required fields
    if (!form.name || !form.label || !form.description) {
      setError("Please fill in all required fields");
      setSaving(false);
      return;
    }

    try {
      const response = await fetch("/api/admin/fields", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create field");
      }

      // Redirect to the new field's detail page
      router.push(`/admin/fields/${data.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Add New Field"
        description="Create a new canonical field definition"
        breadcrumb={
          <Link
            href="/admin/fields"
            className="text-teal-600 hover:text-teal-700"
          >
            Field Library
          </Link>
        }
      />

      <Card>
        <form onSubmit={handleSubmit}>
          {error && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Label <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.label}
                onChange={(e) => handleLabelChange(e.target.value)}
                placeholder="e.g., Full Name"
                required
              />
              <p className="mt-1 text-xs text-gray-500">
                The label shown to users on forms
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Canonical Name <span className="text-red-500">*</span>
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., fullName"
                required
                className="font-mono"
              />
              <p className="mt-1 text-xs text-gray-500">
                Auto-generated from label. Must be camelCase (e.g., emergencyContactName). Cannot be changed after creation.
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="Clear description of what this field captures"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Type <span className="text-red-500">*</span>
              </label>
              <select
                value={form.fieldType}
                onChange={(e) =>
                  setForm({ ...form, fieldType: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                required
              >
                {FIELD_TYPES.map((type) => (
                  <option key={type.key} value={type.key}>
                    {type.label}
                  </option>
                ))}
              </select>
              {form.fieldType === "address" && (
                <div className="mt-2 rounded-lg border border-teal-200 bg-teal-50 p-3">
                  <div className="flex">
                    <svg className="h-5 w-5 flex-shrink-0 text-teal-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-teal-800">
                        Linked Fields Will Be Auto-Created
                      </h4>
                      <p className="mt-1 text-xs text-teal-700">
                        Creating an address field will automatically create 7 linked sub-fields:
                        Building/Complex, Unit/Suite, Suburb, City, Province, Postal Code, and Country.
                        These will be prefixed with the parent field name for uniqueness.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={form.category}
                onChange={(e) =>
                  setForm({ ...form, category: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                required
              >
                <optgroup label="Core">
                  {CATEGORIES.slice(0, 7).map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Industry Extensions">
                  {CATEGORIES.slice(7).map((cat) => (
                    <option key={cat.key} value={cat.key}>
                      {cat.label}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Position in Category
              </label>
              <FieldPositionPicker
                category={form.category}
                onPositionSelect={handlePositionSelect}
                selectedPosition={form.insertAfterFieldId}
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.specialPersonalInfo}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      specialPersonalInfo: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700">
                  POPIA Special Personal Information
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500 ml-6">
                Check if this field collects race, religion, health, biometric,
                or other sensitive data as defined by POPIA
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.requiresExplicitConsent}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      requiresExplicitConsent: e.target.checked,
                    })
                  }
                  className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700">
                  Requires Explicit Consent
                </span>
              </label>
              <p className="mt-1 text-xs text-gray-500 ml-6">
                Check if collecting this field requires separate explicit
                consent from the user
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2 border-t border-gray-200 pt-4">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/admin/fields")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? "Creating..." : "Create Field"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
