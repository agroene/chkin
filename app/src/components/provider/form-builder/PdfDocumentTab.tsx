"use client";

/**
 * PDF Document Tab Component
 *
 * Tab content for configuring DocuSeal PDF templates in the form builder.
 * Allows providers to:
 * - Enable/disable PDF signing for a form
 * - Link to DocuSeal admin to configure PDF templates
 * - Enter template ID and map DocuSeal PDF fields TO Chkin form fields
 *
 * Field mapping direction: DocuSeal field → Chkin field(s)
 * This ensures every PDF field has a mapping defined.
 *
 * Supports complex mappings:
 * - Simple: one-to-one field mapping
 * - Concatenate: combine multiple Chkin fields (e.g., address components)
 * - Conditional: for checkboxes, map based on field value
 *
 * Note: Embedded builder requires DocuSeal Pro. This version uses
 * redirect-based configuration via the DocuSeal admin panel.
 */

import { useState, useEffect, useCallback } from "react";

interface ChkinField {
  name: string;
  label: string;
  fieldType?: string;
}

interface DocuSealField {
  name: string;
  type: string;
  required: boolean;
}

// Mapping types for complex field mappings
export type MappingType = "simple" | "concatenate" | "conditional";

export interface FieldMapping {
  type: MappingType;
  // For simple: single field name
  // For concatenate: array of field names
  // For conditional: field name to check
  sourceFields: string[];
  // For concatenate: separator between values
  separator?: string;
  // For conditional: value conditions
  conditions?: {
    value: string;      // Value to check for
    result: string;     // What to put in PDF field
  }[];
}

// Legacy format support: Record<string, string> where key is chkinField, value is docusealField
// New format: Record<string, FieldMapping> where key is docusealField

interface PdfDocumentTabProps {
  pdfEnabled: boolean;
  onPdfEnabledChange: (enabled: boolean) => void;
  docusealTemplateId: number | null;
  onDocusealTemplateIdChange: (templateId: number | null) => void;
  fieldMappings: Record<string, string | FieldMapping>;
  onFieldMappingsChange: (mappings: Record<string, string | FieldMapping>) => void;
  chkinFields: ChkinField[];
}

export default function PdfDocumentTab({
  pdfEnabled,
  onPdfEnabledChange,
  docusealTemplateId,
  onDocusealTemplateIdChange,
  fieldMappings,
  onFieldMappingsChange,
  chkinFields,
}: PdfDocumentTabProps) {
  const [docusealFields, setDocusealFields] = useState<DocuSealField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [templateIdInput, setTemplateIdInput] = useState(
    docusealTemplateId?.toString() || ""
  );
  const [docusealUrl, setDocusealUrl] = useState<string>("");
  const [expandedFields, setExpandedFields] = useState<Set<string>>(new Set());

  // Fetch DocuSeal URL on mount
  useEffect(() => {
    async function fetchDocuSealUrl() {
      try {
        const response = await fetch("/api/provider/docuseal/builder-token", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({}),
        });
        const data = await response.json();
        if (data.docusealUrl) {
          setDocusealUrl(data.docusealUrl);
        }
      } catch (error) {
        console.error("Failed to fetch DocuSeal URL:", error);
      }
    }
    fetchDocuSealUrl();
  }, []);

  // Fetch DocuSeal template fields when template ID changes
  const fetchDocuSealFields = useCallback(async (templateId: number) => {
    setLoadingFields(true);
    setDocusealFields([]);

    try {
      // Use the direct template fields API (works without a saved form)
      const response = await fetch(
        `/api/provider/docuseal/template-fields?templateId=${templateId}`
      );
      const data = await response.json();

      if (response.ok && data.fields) {
        setDocusealFields(data.fields);
      } else {
        console.error("Failed to fetch DocuSeal fields:", data.error);
      }
    } catch (error) {
      console.error("Failed to fetch DocuSeal fields:", error);
    } finally {
      setLoadingFields(false);
    }
  }, []);

  // Fetch fields when template ID changes
  useEffect(() => {
    if (docusealTemplateId) {
      fetchDocuSealFields(docusealTemplateId);
    } else {
      setDocusealFields([]);
    }
  }, [docusealTemplateId, fetchDocuSealFields]);

  // Sync input with prop
  useEffect(() => {
    setTemplateIdInput(docusealTemplateId?.toString() || "");
  }, [docusealTemplateId]);

  const handleTemplateIdSave = () => {
    const templateId = templateIdInput ? parseInt(templateIdInput, 10) : null;
    if (templateId && !isNaN(templateId)) {
      onDocusealTemplateIdChange(templateId);
    } else {
      onDocusealTemplateIdChange(null);
    }
  };

  // Get current mapping for a DocuSeal field
  const getMapping = (docusealField: string): FieldMapping | null => {
    const mapping = fieldMappings[docusealField];
    if (!mapping) return null;

    // Handle legacy format (string value means it was stored in old format)
    if (typeof mapping === "string") {
      return {
        type: "simple",
        sourceFields: [mapping],
      };
    }

    return mapping;
  };

  // Update mapping for a DocuSeal field
  const handleMappingChange = (
    docusealField: string,
    mapping: FieldMapping | null
  ) => {
    const newMappings = { ...fieldMappings };
    if (mapping && mapping.sourceFields.length > 0) {
      newMappings[docusealField] = mapping;
    } else {
      delete newMappings[docusealField];
    }
    onFieldMappingsChange(newMappings);
  };

  // Simple mapping change (single field selection)
  const handleSimpleMappingChange = (
    docusealField: string,
    chkinFieldName: string
  ) => {
    if (chkinFieldName) {
      handleMappingChange(docusealField, {
        type: "simple",
        sourceFields: [chkinFieldName],
      });
    } else {
      handleMappingChange(docusealField, null);
    }
  };

  // Toggle expanded state for a field
  const toggleExpanded = (fieldName: string) => {
    setExpandedFields((prev) => {
      const next = new Set(prev);
      if (next.has(fieldName)) {
        next.delete(fieldName);
      } else {
        next.add(fieldName);
      }
      return next;
    });
  };

  // Change mapping type
  const handleMappingTypeChange = (
    docusealField: string,
    newType: MappingType
  ) => {
    const currentMapping = getMapping(docusealField);

    if (newType === "simple") {
      handleMappingChange(docusealField, {
        type: "simple",
        sourceFields: currentMapping?.sourceFields.slice(0, 1) || [],
      });
    } else if (newType === "concatenate") {
      handleMappingChange(docusealField, {
        type: "concatenate",
        sourceFields: currentMapping?.sourceFields || [],
        separator: currentMapping?.separator || " ",
      });
    } else if (newType === "conditional") {
      handleMappingChange(docusealField, {
        type: "conditional",
        sourceFields: currentMapping?.sourceFields.slice(0, 1) || [],
        conditions: currentMapping?.conditions || [
          { value: "true", result: "X" },
          { value: "false", result: "" },
        ],
      });
    }
  };

  // Add field to concatenate list
  const handleAddConcatField = (docusealField: string, chkinFieldName: string) => {
    const currentMapping = getMapping(docusealField);
    if (currentMapping && chkinFieldName) {
      handleMappingChange(docusealField, {
        ...currentMapping,
        type: "concatenate",
        sourceFields: [...currentMapping.sourceFields, chkinFieldName],
      });
    }
  };

  // Remove field from concatenate list
  const handleRemoveConcatField = (docusealField: string, index: number) => {
    const currentMapping = getMapping(docusealField);
    if (currentMapping) {
      const newFields = [...currentMapping.sourceFields];
      newFields.splice(index, 1);
      handleMappingChange(docusealField, {
        ...currentMapping,
        sourceFields: newFields,
      });
    }
  };

  // Update separator for concatenate
  const handleSeparatorChange = (docusealField: string, separator: string) => {
    const currentMapping = getMapping(docusealField);
    if (currentMapping) {
      handleMappingChange(docusealField, {
        ...currentMapping,
        separator,
      });
    }
  };

  // Update conditions for conditional mapping
  const handleConditionChange = (
    docusealField: string,
    conditionIndex: number,
    field: "value" | "result",
    newValue: string
  ) => {
    const currentMapping = getMapping(docusealField);
    if (currentMapping && currentMapping.conditions) {
      const newConditions = [...currentMapping.conditions];
      newConditions[conditionIndex] = {
        ...newConditions[conditionIndex],
        [field]: newValue,
      };
      handleMappingChange(docusealField, {
        ...currentMapping,
        conditions: newConditions,
      });
    }
  };

  const openDocuSealAdmin = () => {
    if (docusealUrl) {
      window.open(docusealUrl, "_blank", "noopener,noreferrer");
    }
  };

  // Get display text for current mapping
  const getMappingDisplayText = (docusealField: string): string => {
    const mapping = getMapping(docusealField);
    if (!mapping) return "Not mapped";

    if (mapping.type === "simple" && mapping.sourceFields.length === 1) {
      const field = chkinFields.find((f) => f.name === mapping.sourceFields[0]);
      return field?.label || mapping.sourceFields[0];
    }

    if (mapping.type === "concatenate") {
      const labels = mapping.sourceFields.map((name) => {
        const field = chkinFields.find((f) => f.name === name);
        return field?.label || name;
      });
      return labels.join(` ${mapping.separator || "+"} `);
    }

    if (mapping.type === "conditional") {
      const field = chkinFields.find((f) => f.name === mapping.sourceFields[0]);
      return `Conditional: ${field?.label || mapping.sourceFields[0]}`;
    }

    return "Configured";
  };

  // Count mapped vs unmapped fields
  const mappedCount = docusealFields.filter((f) => getMapping(f.name)).length;
  const unmappedCount = docusealFields.length - mappedCount;

  return (
    <div className="space-y-6">
      {/* Enable/Disable Toggle */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-6 items-center">
            <input
              type="checkbox"
              id="pdfEnabled"
              checked={pdfEnabled}
              onChange={(e) => onPdfEnabledChange(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
          </div>
          <div className="flex-1">
            <label
              htmlFor="pdfEnabled"
              className="text-sm font-medium text-gray-900 cursor-pointer"
            >
              Enable PDF Document Signing
            </label>
            <p className="mt-1 text-sm text-gray-500">
              Patients will be asked to sign a PDF document after completing the
              form fields. The document will be pre-filled with their
              information.
            </p>
          </div>
        </div>
      </div>

      {pdfEnabled && (
        <>
          {/* PDF Template Section */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              PDF Template Configuration
            </h3>

            {/* DocuSeal Admin Link */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0">
                  <svg
                    className="w-8 h-8 text-teal-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-gray-900 mb-1">
                    Step 1: Create Template in DocuSeal
                  </h4>
                  <p className="text-sm text-gray-500 mb-3">
                    Open the DocuSeal admin panel to upload a PDF and configure
                    signature fields. After saving, copy the Template ID.
                  </p>
                  <button
                    onClick={openDocuSealAdmin}
                    disabled={!docusealUrl}
                    className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                      />
                    </svg>
                    Open DocuSeal Admin
                  </button>
                  {!docusealUrl && (
                    <p className="mt-2 text-xs text-amber-600">
                      DocuSeal is not configured. Please ensure DOCUSEAL_URL is
                      set in your environment.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Template ID Input */}
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="templateId"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Step 2: Enter Template ID
                </label>
                <p className="text-sm text-gray-500 mb-2">
                  After creating a template in DocuSeal, enter its ID here. You
                  can find the ID in the DocuSeal template URL or settings.
                </p>
                <div className="flex gap-2">
                  <input
                    type="number"
                    id="templateId"
                    value={templateIdInput}
                    onChange={(e) => setTemplateIdInput(e.target.value)}
                    placeholder="e.g., 1"
                    className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                  <button
                    onClick={handleTemplateIdSave}
                    className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>

              {docusealTemplateId && (
                <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                  <svg
                    className="w-5 h-5 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-sm text-green-800">
                    Template ID {docusealTemplateId} configured
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Field Mapping Section */}
          {docusealTemplateId && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <div className="flex items-start justify-between mb-2">
                <h3 className="text-lg font-medium text-gray-900">
                  Step 3: Field Mapping
                </h3>
                {docusealFields.length > 0 && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-green-600">{mappedCount} mapped</span>
                    {unmappedCount > 0 && (
                      <>
                        <span className="text-gray-300">|</span>
                        <span className="text-amber-600">{unmappedCount} unmapped</span>
                      </>
                    )}
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 mb-4">
                Map each PDF field to the corresponding Chkin form field(s).
                This ensures all PDF fields are populated with patient data.
              </p>

              {loadingFields ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : docusealFields.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500 bg-gray-50 rounded-lg">
                  <svg
                    className="w-8 h-8 text-gray-400 mx-auto mb-2"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <p>No fillable fields detected in the PDF template.</p>
                  <p className="mt-1 text-xs">
                    Add text fields in DocuSeal to enable field mapping.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {docusealFields.map((dsField) => {
                    const mapping = getMapping(dsField.name);
                    const isExpanded = expandedFields.has(dsField.name);
                    const isMapped = mapping !== null;

                    return (
                      <div
                        key={dsField.name}
                        className={`rounded-lg border ${
                          isMapped
                            ? "border-green-200 bg-green-50/50"
                            : "border-gray-200 bg-white"
                        }`}
                      >
                        {/* Collapsed Row */}
                        <div
                          className="flex items-center gap-3 p-3 cursor-pointer hover:bg-gray-50/50"
                          onClick={() => toggleExpanded(dsField.name)}
                        >
                          {/* Expand/Collapse Icon */}
                          <svg
                            className={`w-4 h-4 text-gray-400 transition-transform ${
                              isExpanded ? "rotate-90" : ""
                            }`}
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

                          {/* PDF Field Name */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-gray-900 truncate">
                                {dsField.name}
                              </span>
                              <span className="text-xs text-gray-400 shrink-0">
                                ({dsField.type})
                              </span>
                              {dsField.required && (
                                <span className="text-xs text-red-500 shrink-0">*</span>
                              )}
                            </div>
                          </div>

                          {/* Arrow */}
                          <svg
                            className="w-4 h-4 text-gray-400 shrink-0"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14 5l7 7m0 0l-7 7m7-7H3"
                            />
                          </svg>

                          {/* Mapping Summary */}
                          <div className="flex-1 min-w-0">
                            <span
                              className={`text-sm truncate ${
                                isMapped ? "text-gray-700" : "text-gray-400 italic"
                              }`}
                            >
                              {getMappingDisplayText(dsField.name)}
                            </span>
                          </div>

                          {/* Status Badge */}
                          {isMapped ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Mapped
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-600">
                              Not mapped
                            </span>
                          )}
                        </div>

                        {/* Expanded Configuration */}
                        {isExpanded && (
                          <div
                            className="border-t border-gray-200 p-4 space-y-4"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {/* Mapping Type Selection */}
                            <div>
                              <label className="block text-xs font-medium text-gray-500 mb-2">
                                Mapping Type
                              </label>
                              <div className="flex gap-2">
                                {(["simple", "concatenate", "conditional"] as MappingType[]).map(
                                  (type) => (
                                    <button
                                      key={type}
                                      onClick={() =>
                                        handleMappingTypeChange(dsField.name, type)
                                      }
                                      className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                                        (mapping?.type || "simple") === type
                                          ? "bg-teal-600 text-white"
                                          : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                                      }`}
                                    >
                                      {type === "simple" && "Simple"}
                                      {type === "concatenate" && "Concatenate"}
                                      {type === "conditional" && "Conditional"}
                                    </button>
                                  )
                                )}
                              </div>
                            </div>

                            {/* Simple Mapping */}
                            {(!mapping || mapping.type === "simple") && (
                              <div>
                                <label className="block text-xs font-medium text-gray-500 mb-2">
                                  Select Chkin Field
                                </label>
                                <select
                                  value={mapping?.sourceFields[0] || ""}
                                  onChange={(e) =>
                                    handleSimpleMappingChange(
                                      dsField.name,
                                      e.target.value
                                    )
                                  }
                                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                >
                                  <option value="">-- Select field --</option>
                                  {chkinFields.map((field) => (
                                    <option key={field.name} value={field.name}>
                                      {field.label}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Concatenate Mapping */}
                            {mapping?.type === "concatenate" && (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-2">
                                    Fields to Combine (in order)
                                  </label>
                                  <div className="space-y-2">
                                    {mapping.sourceFields.map((fieldName, index) => {
                                      const field = chkinFields.find(
                                        (f) => f.name === fieldName
                                      );
                                      return (
                                        <div
                                          key={index}
                                          className="flex items-center gap-2"
                                        >
                                          <span className="text-xs text-gray-400 w-5">
                                            {index + 1}.
                                          </span>
                                          <span className="flex-1 text-sm text-gray-700">
                                            {field?.label || fieldName}
                                          </span>
                                          <button
                                            onClick={() =>
                                              handleRemoveConcatField(
                                                dsField.name,
                                                index
                                              )
                                            }
                                            className="p-1 text-gray-400 hover:text-red-500"
                                          >
                                            <svg
                                              className="w-4 h-4"
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
                                      );
                                    })}
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-2">
                                    Add Field
                                  </label>
                                  <select
                                    onChange={(e) => {
                                      if (e.target.value) {
                                        handleAddConcatField(
                                          dsField.name,
                                          e.target.value
                                        );
                                        e.target.value = "";
                                      }
                                    }}
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                  >
                                    <option value="">-- Add field --</option>
                                    {chkinFields
                                      .filter(
                                        (f) =>
                                          !mapping.sourceFields.includes(f.name)
                                      )
                                      .map((field) => (
                                        <option key={field.name} value={field.name}>
                                          {field.label}
                                        </option>
                                      ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-2">
                                    Separator
                                  </label>
                                  <select
                                    value={mapping.separator || " "}
                                    onChange={(e) =>
                                      handleSeparatorChange(
                                        dsField.name,
                                        e.target.value
                                      )
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                  >
                                    <option value=" ">Space</option>
                                    <option value=", ">Comma + Space</option>
                                    <option value="\n">New Line</option>
                                    <option value=" - ">Dash</option>
                                    <option value="">No separator</option>
                                  </select>
                                </div>

                                {mapping.sourceFields.length > 0 && (
                                  <div className="p-2 bg-gray-100 rounded text-xs text-gray-600">
                                    <span className="font-medium">Preview: </span>
                                    {mapping.sourceFields
                                      .map((name) => {
                                        const f = chkinFields.find(
                                          (cf) => cf.name === name
                                        );
                                        return `[${f?.label || name}]`;
                                      })
                                      .join(mapping.separator || "")}
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Conditional Mapping */}
                            {mapping?.type === "conditional" && (
                              <div className="space-y-3">
                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-2">
                                    Check Field Value
                                  </label>
                                  <select
                                    value={mapping.sourceFields[0] || ""}
                                    onChange={(e) =>
                                      handleMappingChange(dsField.name, {
                                        ...mapping,
                                        sourceFields: [e.target.value],
                                      })
                                    }
                                    className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                  >
                                    <option value="">-- Select field --</option>
                                    {chkinFields.map((field) => (
                                      <option key={field.name} value={field.name}>
                                        {field.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-gray-500 mb-2">
                                    Conditions
                                  </label>
                                  <div className="space-y-2">
                                    {mapping.conditions?.map((condition, index) => (
                                      <div
                                        key={index}
                                        className="flex items-center gap-2"
                                      >
                                        <span className="text-xs text-gray-500">
                                          If value is
                                        </span>
                                        <input
                                          type="text"
                                          value={condition.value}
                                          onChange={(e) =>
                                            handleConditionChange(
                                              dsField.name,
                                              index,
                                              "value",
                                              e.target.value
                                            )
                                          }
                                          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                                          placeholder="true"
                                        />
                                        <span className="text-xs text-gray-500">
                                          then output
                                        </span>
                                        <input
                                          type="text"
                                          value={condition.result}
                                          onChange={(e) =>
                                            handleConditionChange(
                                              dsField.name,
                                              index,
                                              "result",
                                              e.target.value
                                            )
                                          }
                                          className="w-24 rounded border border-gray-300 px-2 py-1 text-sm"
                                          placeholder="X"
                                        />
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                <div className="p-2 bg-blue-50 rounded text-xs text-blue-700">
                                  <span className="font-medium">Tip: </span>
                                  Use &quot;true&quot;/&quot;false&quot; for checkbox fields, or specific
                                  values for select fields.
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

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
                      How Field Mapping Works
                    </h4>
                    <ul className="mt-1 text-sm text-blue-700 list-disc list-inside space-y-1">
                      <li>
                        <strong>Simple:</strong> One Chkin field maps to one PDF field
                      </li>
                      <li>
                        <strong>Concatenate:</strong> Combine multiple fields (e.g., address lines)
                      </li>
                      <li>
                        <strong>Conditional:</strong> Output different values based on field value (for checkboxes)
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Note about Pro features */}
          <div className="rounded-lg bg-amber-50 border border-amber-200 p-4">
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
                  Signing Experience
                </h4>
                <p className="mt-1 text-sm text-amber-700">
                  Patients will be redirected to DocuSeal&apos;s secure signing
                  page to complete their signature, then returned to Chkin.
                  Embedded signing is available with DocuSeal Pro.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
