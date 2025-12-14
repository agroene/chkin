"use client";

/**
 * Field Detail Page
 *
 * View and edit a single field definition.
 *
 * @module app/(admin)/admin/fields/[id]/page
 */

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { Card, Button, Input, StatusBadge } from "@/components/ui";
import { PageHeader } from "@/components/layout";

interface FormUsage {
  formFieldId: string;
  formTemplateId: string;
  formTitle: string;
  organizationId: string;
  organizationName: string;
  labelOverride: string | null;
  isRequired: boolean;
}

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
  createdBy: string | null;
  usageCount: number;
  usedInForms: FormUsage[];
}

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
];

export default function FieldDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [field, setField] = useState<FieldDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    label: "",
    description: "",
    fieldType: "",
    category: "",
    sortOrder: 0,
    isActive: true,
    specialPersonalInfo: false,
    requiresExplicitConsent: false,
  });
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const fetchField = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/fields/${id}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to fetch field");
      }

      setField(data.data);
      setEditForm({
        label: data.data.label,
        description: data.data.description,
        fieldType: data.data.fieldType,
        category: data.data.category,
        sortOrder: data.data.sortOrder,
        isActive: data.data.isActive,
        specialPersonalInfo: data.data.specialPersonalInfo,
        requiresExplicitConsent: data.data.requiresExplicitConsent,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchField();
  }, [fetchField]);

  async function handleSave() {
    setSaving(true);
    setSaveError("");

    try {
      const response = await fetch(`/api/admin/fields/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update field");
      }

      setField(data.data);
      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSaving(false);
    }
  }

  async function handleDeactivate() {
    if (
      !confirm(
        `Are you sure you want to deactivate "${field?.label}"? It will no longer be available for use in new forms.`
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/fields/${id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to deactivate field");
      }

      // Refresh field data
      fetchField();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  async function handleReactivate() {
    try {
      const response = await fetch(`/api/admin/fields/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to reactivate field");
      }

      setField(data.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString("en-ZA", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  if (loading) {
    return (
      <div className="flex min-h-[200px] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !field) {
    return (
      <div>
        <PageHeader title="Field Not Found" />
        <Card>
          <div className="text-center py-8">
            <p className="text-red-600 mb-4">{error || "Field not found"}</p>
            <Button onClick={() => router.push("/admin/fields")}>
              Back to Field Library
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const categoryLabel =
    CATEGORIES.find((c) => c.key === field.category)?.label || field.category;
  const fieldTypeLabel =
    FIELD_TYPES.find((t) => t.key === field.fieldType)?.label ||
    field.fieldType;

  return (
    <div>
      <PageHeader
        title={field.label}
        description={`Canonical name: ${field.name}`}
        breadcrumb={
          <Link
            href="/admin/fields"
            className="text-teal-600 hover:text-teal-700"
          >
            Field Library
          </Link>
        }
      />

      {/* Status and Actions */}
      <div className="mb-4 flex flex-col gap-3 sm:mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <StatusBadge
            status={field.isActive ? "approved" : "rejected"}
            label={field.isActive ? "Active" : "Inactive"}
          />
          {field.specialPersonalInfo && (
            <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
              POPIA Special Personal Info
            </span>
          )}
          {field.requiresExplicitConsent && (
            <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
              Requires Explicit Consent
            </span>
          )}
        </div>

        <div className="flex gap-2">
          {!isEditing && (
            <>
              <Button variant="secondary" onClick={() => setIsEditing(true)}>
                Edit Field
              </Button>
              {field.isActive ? (
                <Button variant="danger" onClick={handleDeactivate}>
                  Deactivate
                </Button>
              ) : (
                <Button variant="primary" onClick={handleReactivate}>
                  Reactivate
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* Edit Form */}
      {isEditing && (
        <Card className="mb-4 sm:mb-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Edit Field Definition
          </h3>

          {saveError && (
            <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {saveError}
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Label <span className="text-red-500">*</span>
              </label>
              <Input
                value={editForm.label}
                onChange={(e) =>
                  setEditForm({ ...editForm, label: e.target.value })
                }
                placeholder="Display label"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Field Type <span className="text-red-500">*</span>
              </label>
              <select
                value={editForm.fieldType}
                onChange={(e) =>
                  setEditForm({ ...editForm, fieldType: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              >
                {FIELD_TYPES.map((type) => (
                  <option key={type.key} value={type.key}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={editForm.description}
                onChange={(e) =>
                  setEditForm({ ...editForm, description: e.target.value })
                }
                rows={2}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                placeholder="Clear description of what this field means"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={editForm.category}
                onChange={(e) =>
                  setEditForm({ ...editForm, category: e.target.value })
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort Order
              </label>
              <Input
                type="number"
                min="0"
                value={editForm.sortOrder}
                onChange={(e) =>
                  setEditForm({
                    ...editForm,
                    sortOrder: parseInt(e.target.value) || 0,
                  })
                }
              />
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editForm.specialPersonalInfo}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
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
                or other sensitive data
              </p>
            </div>

            <div className="sm:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={editForm.requiresExplicitConsent}
                  onChange={(e) =>
                    setEditForm({
                      ...editForm,
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

          <div className="mt-6 flex justify-end gap-2">
            <Button
              variant="secondary"
              onClick={() => {
                setIsEditing(false);
                setEditForm({
                  label: field.label,
                  description: field.description,
                  fieldType: field.fieldType,
                  category: field.category,
                  sortOrder: field.sortOrder,
                  isActive: field.isActive,
                  specialPersonalInfo: field.specialPersonalInfo,
                  requiresExplicitConsent: field.requiresExplicitConsent,
                });
                setSaveError("");
              }}
            >
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </Card>
      )}

      {/* Field Details */}
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Basic Info */}
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Field Details
          </h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Canonical Name
              </dt>
              <dd className="mt-1 font-mono text-gray-900">{field.name}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Display Label
              </dt>
              <dd className="mt-1 text-gray-900">{field.label}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Description</dt>
              <dd className="mt-1 text-gray-900">{field.description}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Field Type</dt>
              <dd className="mt-1 text-gray-900">{fieldTypeLabel}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Category</dt>
              <dd className="mt-1 text-gray-900">{categoryLabel}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Sort Order</dt>
              <dd className="mt-1 text-gray-900">{field.sortOrder}</dd>
            </div>
          </dl>
        </Card>

        {/* Configuration */}
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">
            Configuration
          </h3>
          {field.config ? (
            <pre className="overflow-auto rounded bg-gray-50 p-3 text-sm text-gray-800">
              {JSON.stringify(field.config, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-500 text-sm">No configuration defined</p>
          )}

          <h4 className="text-md font-medium text-gray-900 mt-6 mb-3">
            Validation Rules
          </h4>
          {field.validation ? (
            <pre className="overflow-auto rounded bg-gray-50 p-3 text-sm text-gray-800">
              {JSON.stringify(field.validation, null, 2)}
            </pre>
          ) : (
            <p className="text-gray-500 text-sm">No validation rules defined</p>
          )}
        </Card>

        {/* Metadata */}
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Metadata</h3>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-gray-900">
                {formatDate(field.createdAt)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Last Updated
              </dt>
              <dd className="mt-1 text-gray-900">
                {formatDate(field.updatedAt)}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">
                Used in Forms
              </dt>
              <dd className="mt-1 text-gray-900">{field.usageCount} form(s)</dd>
            </div>
          </dl>
        </Card>

        {/* Form Usage */}
        <Card>
          <h3 className="text-lg font-medium text-gray-900 mb-4">Form Usage</h3>
          {field.usedInForms.length > 0 ? (
            <div className="space-y-3">
              {field.usedInForms.map((usage) => (
                <div
                  key={usage.formFieldId}
                  className="rounded-lg border border-gray-200 p-3"
                >
                  <div className="font-medium text-gray-900">
                    {usage.formTitle}
                  </div>
                  <div className="text-sm text-gray-500">
                    {usage.organizationName}
                  </div>
                  <div className="mt-2 flex gap-2 text-xs">
                    {usage.labelOverride && (
                      <span className="rounded bg-blue-100 px-2 py-0.5 text-blue-800">
                        Label: {usage.labelOverride}
                      </span>
                    )}
                    {usage.isRequired && (
                      <span className="rounded bg-red-100 px-2 py-0.5 text-red-800">
                        Required
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-sm">
              This field is not used in any forms yet.
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
