"use client";

/**
 * Form Builder Page
 *
 * Create new form templates with live preview, field picker, and consent editor.
 * Split view: Build panel on left, Live Preview on right.
 */

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout";
import FieldPicker from "@/components/provider/form-builder/FieldPicker";
import FormPreview from "@/components/provider/form-builder/FormPreview";
import SectionOrganizer from "@/components/provider/form-builder/SectionOrganizer";

interface FormField {
  id: string;
  fieldDefinitionId: string;
  fieldDefinition: {
    id: string;
    canonicalName: string;
    label: string;
    description: string | null;
    fieldType: string;
    config: string | null;
    category: string;
  };
  labelOverride: string | null;
  helpText: string | null;
  isRequired: boolean;
  sortOrder: number;
  section: string | null;
}

export default function NewFormPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [consentClause, setConsentClause] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [sections, setSections] = useState<string[]>(["General"]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"fields" | "consent">("fields");
  const [previewMode, setPreviewMode] = useState(false);

  // Mobile preview toggle
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // Add field to form
  const handleAddField = useCallback((fieldDefinition: FormField["fieldDefinition"]) => {
    const newField: FormField = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      fieldDefinitionId: fieldDefinition.id,
      fieldDefinition,
      labelOverride: null,
      helpText: null,
      isRequired: false,
      sortOrder: fields.length,
      section: sections[0] || "General",
    };
    setFields((prev) => [...prev, newField]);
  }, [fields.length, sections]);

  // Remove field from form
  const handleRemoveField = useCallback((fieldId: string) => {
    setFields((prev) => prev.filter((f) => f.id !== fieldId));
  }, []);

  // Update field
  const handleUpdateField = useCallback((fieldId: string, updates: Partial<FormField>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === fieldId ? { ...f, ...updates } : f))
    );
  }, []);

  // Reorder fields
  const handleReorderFields = useCallback((newFields: FormField[]) => {
    setFields(newFields.map((f, i) => ({ ...f, sortOrder: i })));
  }, []);

  // Add section
  const handleAddSection = useCallback((sectionName: string) => {
    if (!sections.includes(sectionName)) {
      setSections((prev) => [...prev, sectionName]);
    }
  }, [sections]);

  // Remove section
  const handleRemoveSection = useCallback((sectionName: string) => {
    setSections((prev) => prev.filter((s) => s !== sectionName));
    // Move fields from removed section to first section
    setFields((prev) =>
      prev.map((f) =>
        f.section === sectionName ? { ...f, section: sections[0] } : f
      )
    );
  }, [sections]);

  // Save form
  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please enter a form title");
      return;
    }

    if (fields.length === 0) {
      alert("Please add at least one field to your form");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/provider/forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          consentClause: consentClause.trim() || null,
          fields: fields.map((f) => ({
            fieldDefinitionId: f.fieldDefinitionId,
            labelOverride: f.labelOverride,
            helpText: f.helpText,
            isRequired: f.isRequired,
            sortOrder: f.sortOrder,
            section: f.section,
          })),
        }),
      });

      if (response.ok) {
        const data = await response.json();
        router.push(`/provider/forms/${data.form.id}`);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to create form");
      }
    } catch {
      alert("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader
        title="Create Form"
        description="Design a patient check-in form"
      >
        <button
          onClick={() => router.push("/provider/forms")}
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="inline-flex items-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? (
            <>
              <svg
                className="mr-2 h-4 w-4 animate-spin"
                fill="none"
                viewBox="0 0 24 24"
              >
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
              Saving...
            </>
          ) : (
            "Save Form"
          )}
        </button>
      </PageHeader>

      {/* Mobile Preview Toggle */}
      <div className="mt-4 lg:hidden">
        <button
          onClick={() => setShowMobilePreview(!showMobilePreview)}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
            />
          </svg>
          {showMobilePreview ? "Edit Form" : "Preview Form"}
        </button>
      </div>

      {/* Split View Layout */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Build Panel */}
        <div className={`space-y-6 ${showMobilePreview ? "hidden lg:block" : ""}`}>
          {/* Form Details */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h2 className="text-lg font-semibold text-gray-900">Form Details</h2>
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Patient Registration Form"
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Brief description of the form's purpose..."
                  rows={2}
                  className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex gap-4">
              <button
                onClick={() => setActiveTab("fields")}
                className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                  activeTab === "fields"
                    ? "border-teal-600 text-teal-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                Fields ({fields.length})
              </button>
              <button
                onClick={() => setActiveTab("consent")}
                className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                  activeTab === "consent"
                    ? "border-teal-600 text-teal-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                Consent Clause
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === "fields" ? (
            <div className="space-y-6">
              {/* Section Organizer */}
              <SectionOrganizer
                sections={sections}
                fields={fields}
                onAddSection={handleAddSection}
                onRemoveSection={handleRemoveSection}
                onUpdateField={handleUpdateField}
                onRemoveField={handleRemoveField}
                onReorderFields={handleReorderFields}
              />

              {/* Field Picker */}
              <FieldPicker
                onAddField={handleAddField}
                selectedFieldIds={fields.map((f) => f.fieldDefinitionId)}
              />
            </div>
          ) : (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="text-sm font-medium text-gray-900">Consent Clause</h3>
              <p className="mt-1 text-sm text-gray-500">
                This text will be shown to patients before they submit the form.
              </p>
              <textarea
                value={consentClause}
                onChange={(e) => setConsentClause(e.target.value)}
                placeholder="I consent to the collection and processing of my personal information as described above. I understand that my information will be used for the purpose of providing healthcare services and will be handled in accordance with POPIA..."
                rows={8}
                className="mt-4 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
              <div className="mt-4 rounded-lg bg-amber-50 p-4">
                <div className="flex">
                  <svg
                    className="h-5 w-5 flex-shrink-0 text-amber-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <div className="ml-3">
                    <h4 className="text-sm font-medium text-amber-800">
                      POPIA Compliance
                    </h4>
                    <p className="mt-1 text-sm text-amber-700">
                      Ensure your consent clause clearly explains how personal
                      information will be collected, used, and stored.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Preview Panel */}
        <div className={`${!showMobilePreview ? "hidden lg:block" : ""}`}>
          <div className="sticky top-4">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">Live Preview</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPreviewMode(false)}
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    !previewMode
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  Desktop
                </button>
                <button
                  onClick={() => setPreviewMode(true)}
                  className={`rounded px-2 py-1 text-xs font-medium ${
                    previewMode
                      ? "bg-gray-200 text-gray-900"
                      : "text-gray-500 hover:bg-gray-100"
                  }`}
                >
                  Mobile
                </button>
              </div>
            </div>
            <FormPreview
              title={title}
              description={description}
              fields={fields}
              sections={sections}
              consentClause={consentClause}
              mobileView={previewMode}
            />
          </div>
        </div>
      </div>
    </>
  );
}
