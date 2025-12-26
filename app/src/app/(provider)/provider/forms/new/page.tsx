"use client";

/**
 * Form Builder Page
 *
 * Create new form templates with live preview, field picker, and consent editor.
 * Split view: Build panel on left, Live Preview on right.
 * Includes "Quick Start Template" button to load a pre-configured form.
 */

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/layout";
import FieldPicker from "@/components/provider/form-builder/FieldPicker";
import FormPreview from "@/components/provider/form-builder/FormPreview";
import SectionOrganizer from "@/components/provider/form-builder/SectionOrganizer";
import PdfDocumentTab, { FieldMapping } from "@/components/provider/form-builder/PdfDocumentTab";

interface FormField {
  id: string;
  fieldDefinitionId: string;
  fieldDefinition: {
    id: string;
    name: string;
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
  columnSpan: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8; // Column span out of 8 (8 = full width)
  groupId?: string; // Links fields that belong together (e.g., address + sub-fields)
}

// Default consent configuration values
const DEFAULT_CONSENT_CONFIG = {
  defaultDuration: 12,
  minDuration: 1,
  maxDuration: 60,
  allowAutoRenewal: true,
  gracePeriodDays: 30,
};

export default function NewFormPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [consentClause, setConsentClause] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [sections, setSections] = useState<string[]>(["General"]);
  const [activeSection, setActiveSection] = useState<string>("General");
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<"fields" | "consent" | "settings" | "pdf">("fields");
  const [previewMode, setPreviewMode] = useState(false);
  const [loadingTemplate, setLoadingTemplate] = useState(false);

  // Consent configuration settings
  const [consentConfig, setConsentConfig] = useState(DEFAULT_CONSENT_CONFIG);

  // Mobile preview toggle
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // PDF Document settings
  const [pdfEnabled, setPdfEnabled] = useState(false);
  const [docusealTemplateId, setDocusealTemplateId] = useState<number | null>(null);
  const [pdfFieldMappings, setPdfFieldMappings] = useState<Record<string, string | FieldMapping>>({});

  // Memoize chkin fields for PDF mapping
  const chkinFields = useMemo(() =>
    fields.map(f => ({
      name: f.fieldDefinition.name,
      label: f.labelOverride || f.fieldDefinition.label,
    })),
    [fields]
  );

  // Load Quick Start Template
  const handleLoadTemplate = useCallback(async () => {
    if (fields.length > 0 || title || description || consentClause) {
      const confirmed = window.confirm(
        "Loading a template will replace your current form. Are you sure you want to continue?"
      );
      if (!confirmed) return;
    }

    setLoadingTemplate(true);
    try {
      const response = await fetch("/api/provider/forms/templates/patient-registration");
      if (!response.ok) {
        throw new Error("Failed to load template");
      }
      const data = await response.json();
      const { template } = data;

      // Update all form state with template data
      setTitle(template.title);
      setDescription(template.description || "");
      setConsentClause(template.consentClause || "");
      setSections(template.sections);
      setActiveSection(template.sections[0] || "General");
      setFields(template.fields.map((f: FormField, index: number) => ({
        ...f,
        id: `template-${index}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      })));

      // Show success feedback
      if (data.missingFields?.length > 0) {
        alert(`Template loaded! Note: ${data.missingFields.length} fields were skipped because they're not in the field library.`);
      }
    } catch (error) {
      console.error("Error loading template:", error);
      alert("Failed to load template. Please try again.");
    } finally {
      setLoadingTemplate(false);
    }
  }, [fields.length, title, description, consentClause]);

  // Add field to form - adds to the active section
  const handleAddField = useCallback((fieldDefinition: FormField["fieldDefinition"]) => {
    const targetSection = sections.includes(activeSection) ? activeSection : sections[0] || "General";
    const sectionFields = fields.filter(f => f.section === targetSection);
    const maxSortOrder = sectionFields.length > 0
      ? Math.max(...sectionFields.map(f => f.sortOrder)) + 1
      : fields.length;

    const newField: FormField = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      fieldDefinitionId: fieldDefinition.id,
      fieldDefinition,
      labelOverride: null,
      helpText: null,
      isRequired: false,
      sortOrder: maxSortOrder,
      section: targetSection,
      columnSpan: 8, // Default to full width
    };
    setFields((prev) => [...prev, newField]);
  }, [fields, sections, activeSection]);

  // Add field group (parent + linked fields) - used for address fields
  const handleAddFieldGroup = useCallback((parentField: FormField["fieldDefinition"], linkedFields: FormField["fieldDefinition"][]) => {
    const targetSection = sections.includes(activeSection) ? activeSection : sections[0] || "General";
    const sectionFields = fields.filter(f => f.section === targetSection);
    let sortOrder = sectionFields.length > 0
      ? Math.max(...sectionFields.map(f => f.sortOrder)) + 1
      : fields.length;

    // Create a unique group ID to link all fields together
    const groupId = `group-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Create the parent field (address autocomplete) - full width
    const parentFormField: FormField = {
      id: `temp-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      fieldDefinitionId: parentField.id,
      fieldDefinition: parentField,
      labelOverride: null,
      helpText: "Start typing to search for an address",
      isRequired: false,
      sortOrder: sortOrder++,
      section: targetSection,
      columnSpan: 8, // Full width for address autocomplete
      groupId,
    };

    // Create linked fields with appropriate column spans
    const linkedFormFields: FormField[] = linkedFields.map((field) => {
      // Determine column span based on field type/name
      let columnSpan: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 = 4; // Default half width
      if (field.name === "postalCode") columnSpan = 2;
      if (field.name === "country") columnSpan = 3;
      if (field.name === "stateProvince") columnSpan = 3;

      return {
        id: `temp-${Date.now()}-${Math.random().toString(36).substring(7)}-${field.name}`,
        fieldDefinitionId: field.id,
        fieldDefinition: field,
        labelOverride: null,
        helpText: null,
        isRequired: false,
        sortOrder: sortOrder++,
        section: targetSection,
        columnSpan,
        groupId,
      };
    });

    setFields((prev) => [...prev, parentFormField, ...linkedFormFields]);
  }, [fields, sections, activeSection]);

  // Remove field from form (removes entire group if field is part of one)
  const handleRemoveField = useCallback((fieldId: string) => {
    setFields((prev) => {
      const fieldToRemove = prev.find(f => f.id === fieldId);
      // If field is part of a group, remove all fields in that group
      if (fieldToRemove?.groupId) {
        return prev.filter((f) => f.groupId !== fieldToRemove.groupId);
      }
      // Otherwise just remove the single field
      return prev.filter((f) => f.id !== fieldId);
    });
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

  // Add section - automatically makes it active
  const handleAddSection = useCallback((sectionName: string) => {
    if (!sections.includes(sectionName)) {
      setSections((prev) => [...prev, sectionName]);
      setActiveSection(sectionName);
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
          // Time-bound consent configuration
          defaultConsentDuration: consentConfig.defaultDuration,
          minConsentDuration: consentConfig.minDuration,
          maxConsentDuration: consentConfig.maxDuration,
          allowAutoRenewal: consentConfig.allowAutoRenewal,
          gracePeriodDays: consentConfig.gracePeriodDays,
          // PDF Document settings
          pdfEnabled,
          docusealTemplateId,
          pdfFieldMappings: Object.keys(pdfFieldMappings).length > 0
            ? JSON.stringify(pdfFieldMappings)
            : null,
          fields: fields.map((f) => ({
            fieldDefinitionId: f.fieldDefinitionId,
            labelOverride: f.labelOverride,
            helpText: f.helpText,
            isRequired: f.isRequired,
            sortOrder: f.sortOrder,
            section: f.section,
            columnSpan: f.columnSpan,
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
          onClick={handleLoadTemplate}
          disabled={loadingTemplate}
          className="inline-flex items-center rounded-lg border border-teal-600 px-4 py-2 text-sm font-medium text-teal-600 hover:bg-teal-50 disabled:opacity-50"
          title="Load a pre-configured Patient Registration Form"
        >
          {loadingTemplate ? (
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
              Loading...
            </>
          ) : (
            <>
              <svg
                className="mr-2 h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
              Quick Start Template
            </>
          )}
        </button>
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
              <button
                onClick={() => setActiveTab("settings")}
                className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                  activeTab === "settings"
                    ? "border-teal-600 text-teal-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                Settings
              </button>
              <button
                onClick={() => setActiveTab("pdf")}
                className={`border-b-2 pb-3 text-sm font-medium transition-colors ${
                  activeTab === "pdf"
                    ? "border-teal-600 text-teal-600"
                    : "border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700"
                }`}
              >
                PDF Document
                {pdfEnabled && (
                  <span className="ml-1.5 inline-flex items-center rounded-full bg-green-100 px-1.5 py-0.5 text-xs font-medium text-green-700">
                    On
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          {activeTab === "fields" && (
            <div className="space-y-6">
              {/* Section Organizer */}
              <SectionOrganizer
                sections={sections}
                fields={fields}
                activeSection={activeSection}
                onSetActiveSection={setActiveSection}
                onAddSection={handleAddSection}
                onRemoveSection={handleRemoveSection}
                onUpdateField={handleUpdateField}
                onRemoveField={handleRemoveField}
                onReorderFields={handleReorderFields}
              />

              {/* Field Picker */}
              <FieldPicker
                onAddField={handleAddField}
                onAddFieldGroup={handleAddFieldGroup}
                selectedFieldIds={fields.map((f) => f.fieldDefinitionId)}
              />
            </div>
          )}

          {activeTab === "consent" && (
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

          {activeTab === "settings" && (
            <div className="space-y-6">
              {/* Consent Duration Settings */}
              <div className="rounded-lg border border-gray-200 bg-white p-6">
                <h3 className="text-lg font-medium text-gray-900">Consent Duration</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Configure how long patient consent is valid and renewal options.
                </p>

                <div className="mt-6 space-y-6">
                  {/* Default Duration */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Default Duration (months)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      The pre-selected duration when patients submit the form
                    </p>
                    <select
                      value={consentConfig.defaultDuration}
                      onChange={(e) => setConsentConfig(prev => ({
                        ...prev,
                        defaultDuration: parseInt(e.target.value)
                      }))}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value={1}>1 month</option>
                      <option value={3}>3 months</option>
                      <option value={6}>6 months</option>
                      <option value={12}>12 months (1 year)</option>
                      <option value={24}>24 months (2 years)</option>
                      <option value={36}>36 months (3 years)</option>
                      <option value={60}>60 months (5 years)</option>
                    </select>
                  </div>

                  {/* Min/Max Duration */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Minimum Duration (months)
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={consentConfig.maxDuration}
                        value={consentConfig.minDuration}
                        onChange={(e) => setConsentConfig(prev => ({
                          ...prev,
                          minDuration: Math.max(1, parseInt(e.target.value) || 1)
                        }))}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Maximum Duration (months)
                      </label>
                      <input
                        type="number"
                        min={consentConfig.minDuration}
                        max={120}
                        value={consentConfig.maxDuration}
                        onChange={(e) => setConsentConfig(prev => ({
                          ...prev,
                          maxDuration: Math.min(120, parseInt(e.target.value) || 60)
                        }))}
                        className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>

                  {/* Grace Period */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Grace Period (days)
                    </label>
                    <p className="text-xs text-gray-500 mb-2">
                      Days after expiry before data access is revoked (allows time for renewal)
                    </p>
                    <select
                      value={consentConfig.gracePeriodDays}
                      onChange={(e) => setConsentConfig(prev => ({
                        ...prev,
                        gracePeriodDays: parseInt(e.target.value)
                      }))}
                      className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                    >
                      <option value={7}>7 days</option>
                      <option value={14}>14 days</option>
                      <option value={30}>30 days</option>
                      <option value={60}>60 days</option>
                      <option value={90}>90 days</option>
                    </select>
                  </div>

                  {/* Auto-Renewal Toggle */}
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      id="allowAutoRenewal"
                      checked={consentConfig.allowAutoRenewal}
                      onChange={(e) => setConsentConfig(prev => ({
                        ...prev,
                        allowAutoRenewal: e.target.checked
                      }))}
                      className="mt-1 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <div>
                      <label htmlFor="allowAutoRenewal" className="text-sm font-medium text-gray-700 cursor-pointer">
                        Allow Auto-Renewal
                      </label>
                      <p className="text-xs text-gray-500">
                        Let patients opt-in to automatic consent renewal before expiry
                      </p>
                    </div>
                  </div>
                </div>

                {/* Info Box */}
                <div className="mt-6 rounded-lg bg-blue-50 p-4">
                  <div className="flex">
                    <svg
                      className="h-5 w-5 flex-shrink-0 text-blue-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                    <div className="ml-3">
                      <h4 className="text-sm font-medium text-blue-800">
                        How Consent Duration Works
                      </h4>
                      <ul className="mt-2 text-sm text-blue-700 list-disc list-inside space-y-1">
                        <li>Patients can select their preferred duration within your min/max range</li>
                        <li>Email reminders are sent at 30, 14, 7, and 1 days before expiry</li>
                        <li>The grace period allows time for patients to renew without losing access</li>
                        <li>Auto-renewal (if enabled) processes 7 days before expiry</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "pdf" && (
            <PdfDocumentTab
              pdfEnabled={pdfEnabled}
              onPdfEnabledChange={setPdfEnabled}
              docusealTemplateId={docusealTemplateId}
              onDocusealTemplateIdChange={setDocusealTemplateId}
              fieldMappings={pdfFieldMappings}
              onFieldMappingsChange={setPdfFieldMappings}
              chkinFields={chkinFields}
            />
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
