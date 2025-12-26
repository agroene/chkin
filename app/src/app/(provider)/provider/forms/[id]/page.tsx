"use client";

/**
 * Form Detail/Edit Page
 *
 * View and edit an existing form template.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
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

interface FormTemplate {
  id: string;
  title: string;
  description: string | null;
  consentClause: string | null;
  isActive: boolean;
  version: number;
  fields: FormField[];
  // Time-bound consent configuration
  defaultConsentDuration: number;
  minConsentDuration: number;
  maxConsentDuration: number;
  allowAutoRenewal: boolean;
  gracePeriodDays: number;
  // PDF Document settings
  pdfEnabled: boolean;
  docusealTemplateId: number | null;
  pdfFieldMappings: string | null;
  _count: {
    submissions: number;
  };
}

export default function FormDetailPage() {
  const params = useParams();
  const formId = params.id as string;

  const [form, setForm] = useState<FormTemplate | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editable state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [consentClause, setConsentClause] = useState("");
  const [fields, setFields] = useState<FormField[]>([]);
  const [sections, setSections] = useState<string[]>(["General"]);
  const [isActive, setIsActive] = useState(true);

  const [activeTab, setActiveTab] = useState<"fields" | "consent" | "settings" | "pdf">("fields");
  const [previewMode, setPreviewMode] = useState(false);
  const [showMobilePreview, setShowMobilePreview] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [activeSection, setActiveSection] = useState<string>("General");

  // Consent configuration settings
  const [consentConfig, setConsentConfig] = useState({
    defaultDuration: 12,
    minDuration: 1,
    maxDuration: 60,
    allowAutoRenewal: true,
    gracePeriodDays: 30,
  });

  // PDF Document settings
  const [pdfEnabled, setPdfEnabled] = useState(false);
  const [docusealTemplateId, setDocusealTemplateId] = useState<number | null>(null);
  const [pdfFieldMappings, setPdfFieldMappings] = useState<Record<string, string | FieldMapping>>({});

  // Fetch form data
  useEffect(() => {
    async function fetchForm() {
      try {
        const response = await fetch(`/api/provider/forms/${formId}`);
        if (!response.ok) {
          if (response.status === 404) {
            setError("Form not found");
          } else {
            setError("Failed to load form");
          }
          return;
        }

        const data = await response.json();
        const formData = data.form as FormTemplate;
        setForm(formData);

        // Populate editable state
        setTitle(formData.title);
        setDescription(formData.description || "");
        setConsentClause(formData.consentClause || "");
        setIsActive(formData.isActive);

        // Populate consent configuration
        setConsentConfig({
          defaultDuration: formData.defaultConsentDuration ?? 12,
          minDuration: formData.minConsentDuration ?? 1,
          maxDuration: formData.maxConsentDuration ?? 60,
          allowAutoRenewal: formData.allowAutoRenewal ?? true,
          gracePeriodDays: formData.gracePeriodDays ?? 30,
        });

        // Populate PDF settings
        setPdfEnabled(formData.pdfEnabled ?? false);
        setDocusealTemplateId(formData.docusealTemplateId ?? null);
        if (formData.pdfFieldMappings) {
          try {
            setPdfFieldMappings(JSON.parse(formData.pdfFieldMappings));
          } catch {
            setPdfFieldMappings({});
          }
        }

        // Process fields (add default columnSpan if not present)
        const loadedFields = formData.fields.map((f) => ({
          ...f,
          id: f.id,
          columnSpan: (f.columnSpan || 8) as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8,
        }));
        setFields(loadedFields);

        // Extract unique sections
        const uniqueSections = Array.from(
          new Set(loadedFields.map((f) => f.section || "General"))
        );
        if (uniqueSections.length === 0) {
          uniqueSections.push("General");
        }
        setSections(uniqueSections);
      } catch {
        setError("An error occurred while loading the form");
      } finally {
        setLoading(false);
      }
    }

    fetchForm();
  }, [formId]);

  // Track changes
  useEffect(() => {
    if (!form) return;

    const hasFieldChanges =
      JSON.stringify(fields.map((f) => ({
        fieldDefinitionId: f.fieldDefinitionId,
        labelOverride: f.labelOverride,
        helpText: f.helpText,
        isRequired: f.isRequired,
        sortOrder: f.sortOrder,
        section: f.section,
      }))) !==
      JSON.stringify(form.fields.map((f) => ({
        fieldDefinitionId: f.fieldDefinitionId,
        labelOverride: f.labelOverride,
        helpText: f.helpText,
        isRequired: f.isRequired,
        sortOrder: f.sortOrder,
        section: f.section,
      })));

    // Check if PDF settings have changed
    const hasPdfChanges =
      pdfEnabled !== (form.pdfEnabled ?? false) ||
      docusealTemplateId !== (form.docusealTemplateId ?? null) ||
      JSON.stringify(pdfFieldMappings) !== (form.pdfFieldMappings ?? "{}");

    // Check if consent config has changed
    const hasConsentConfigChanges =
      consentConfig.defaultDuration !== (form.defaultConsentDuration ?? 12) ||
      consentConfig.minDuration !== (form.minConsentDuration ?? 1) ||
      consentConfig.maxDuration !== (form.maxConsentDuration ?? 60) ||
      consentConfig.allowAutoRenewal !== (form.allowAutoRenewal ?? true) ||
      consentConfig.gracePeriodDays !== (form.gracePeriodDays ?? 30);

    setHasChanges(
      title !== form.title ||
      description !== (form.description || "") ||
      consentClause !== (form.consentClause || "") ||
      isActive !== form.isActive ||
      hasFieldChanges ||
      hasPdfChanges ||
      hasConsentConfigChanges
    );
  }, [form, title, description, consentClause, isActive, fields, pdfEnabled, docusealTemplateId, pdfFieldMappings, consentConfig]);

  // Add field to form - adds to the active section
  const handleAddField = useCallback((fieldDefinition: FormField["fieldDefinition"]) => {
    // Determine target section - use activeSection if it exists in sections
    const targetSection = sections.includes(activeSection) ? activeSection : sections[0] || "General";

    // Calculate sort order for this section (add to end of section)
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
      setActiveSection(sectionName); // Auto-select new section
    }
  }, [sections]);

  // Remove section
  const handleRemoveSection = useCallback((sectionName: string) => {
    setSections((prev) => prev.filter((s) => s !== sectionName));
    setFields((prev) =>
      prev.map((f) =>
        f.section === sectionName ? { ...f, section: sections[0] } : f
      )
    );
  }, [sections]);

  // Reorder sections
  const handleReorderSections = useCallback((newSections: string[]) => {
    setSections(newSections);
  }, []);

  // Memoize chkin fields for PDF mapping (including category for grouping)
  // Expands composite fields (like referral-doctor, address) into their sub-fields
  const chkinFields = useMemo(() => {
    const result: Array<{
      name: string;
      label: string;
      fieldType: string;
      category: string;
    }> = [];

    for (const f of fields) {
      const fieldType = f.fieldDefinition.fieldType;
      const category = f.fieldDefinition.category;

      // Check for composite field types that should be expanded
      if (fieldType === "referral-doctor") {
        // Referral doctor stores data in individual sub-fields
        result.push(
          { name: "referralDoctorName", label: "Referral Doctor - Name", fieldType: "text", category },
          { name: "referralDoctorPractice", label: "Referral Doctor - Practice", fieldType: "text", category },
          { name: "referralDoctorSpecialty", label: "Referral Doctor - Specialty", fieldType: "select", category },
          { name: "referralDoctorPhone", label: "Referral Doctor - Phone", fieldType: "phone", category },
          { name: "referralDoctorFax", label: "Referral Doctor - Fax", fieldType: "phone", category },
          { name: "referralDoctorEmail", label: "Referral Doctor - Email", fieldType: "email", category },
          { name: "referralDoctorPracticeNumber", label: "Referral Doctor - Practice Number", fieldType: "text", category },
          { name: "referralDoctorAddress", label: "Referral Doctor - Address", fieldType: "textarea", category },
        );
      } else if (fieldType === "address") {
        // Address component stores data in individual sub-fields
        const baseName = f.fieldDefinition.name;
        const baseLabel = f.labelOverride || f.fieldDefinition.label;
        result.push(
          { name: `${baseName}Line1`, label: `${baseLabel} - Line 1`, fieldType: "text", category },
          { name: `${baseName}Line2`, label: `${baseLabel} - Line 2`, fieldType: "text", category },
          { name: `${baseName}Suburb`, label: `${baseLabel} - Suburb`, fieldType: "text", category },
          { name: `${baseName}City`, label: `${baseLabel} - City`, fieldType: "text", category },
          { name: `${baseName}Province`, label: `${baseLabel} - Province`, fieldType: "text", category },
          { name: `${baseName}PostalCode`, label: `${baseLabel} - Postal Code`, fieldType: "text", category },
          { name: `${baseName}Country`, label: `${baseLabel} - Country`, fieldType: "text", category },
        );
      } else {
        // Regular field - add as-is
        result.push({
          name: f.fieldDefinition.name,
          label: f.labelOverride || f.fieldDefinition.label,
          fieldType: f.fieldDefinition.fieldType,
          category: f.fieldDefinition.category,
        });
      }
    }

    return result;
  }, [fields]);

  // Save form
  const handleSave = async () => {
    if (!title.trim()) {
      alert("Please enter a form title");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`/api/provider/forms/${formId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim() || null,
          consentClause: consentClause.trim() || null,
          isActive,
          // Consent duration settings
          defaultConsentDuration: consentConfig.defaultDuration,
          minConsentDuration: consentConfig.minDuration,
          maxConsentDuration: consentConfig.maxDuration,
          allowAutoRenewal: consentConfig.allowAutoRenewal,
          gracePeriodDays: consentConfig.gracePeriodDays,
          // PDF settings
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
        setForm(data.form);
        setHasChanges(false);
        // Update fields with server response (includes real IDs)
        setFields(data.form.fields);
      } else {
        const error = await response.json();
        alert(error.error || "Failed to save form");
      }
    } catch {
      alert("An error occurred while saving");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center">
        <h1 className="text-xl font-semibold text-gray-900">{error}</h1>
        <p className="mt-2 text-gray-600">The form you are looking for could not be found.</p>
        <Link
          href="/provider/forms"
          className="mt-4 inline-block text-teal-600 hover:text-teal-700"
        >
          Back to Forms
        </Link>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        title={title || "Untitled Form"}
        description={`Version ${form?.version || 1} • ${form?._count.submissions || 0} submissions`}
      >
        <Link
          href="/provider/forms"
          className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Back
        </Link>
        <button
          onClick={handleSave}
          disabled={saving || !hasChanges}
          className="inline-flex items-center rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : hasChanges ? "Save Changes" : "Saved"}
        </button>
      </PageHeader>

      {/* Status Toggle */}
      <div className="mt-4 flex items-center gap-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
          />
          <span className="text-sm text-gray-700">Form is active</span>
        </label>
        {!isActive && (
          <span className="text-sm text-amber-600">
            Inactive forms cannot accept new submissions
          </span>
        )}
      </div>

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
              <SectionOrganizer
                sections={sections}
                fields={fields}
                activeSection={activeSection}
                onSetActiveSection={setActiveSection}
                onAddSection={handleAddSection}
                onRemoveSection={handleRemoveSection}
                onReorderSections={handleReorderSections}
                onUpdateField={handleUpdateField}
                onRemoveField={handleRemoveField}
                onReorderFields={handleReorderFields}
              />
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
                placeholder="I consent to the collection and processing of my personal information..."
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
