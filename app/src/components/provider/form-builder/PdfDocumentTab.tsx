"use client";

/**
 * PDF Document Tab Component
 *
 * Tab content for configuring DocuSeal PDF templates in the form builder.
 * Allows providers to:
 * - Enable/disable PDF signing for a form
 * - Link to DocuSeal admin to configure PDF templates
 * - Enter template ID and map Chkin form fields to PDF placeholders
 *
 * Note: Embedded builder requires DocuSeal Pro. This version uses
 * redirect-based configuration via the DocuSeal admin panel.
 */

import { useState, useEffect, useCallback } from "react";

interface ChkinField {
  name: string;
  label: string;
}

interface DocuSealField {
  name: string;
  type: string;
  required: boolean;
}

interface PdfDocumentTabProps {
  pdfEnabled: boolean;
  onPdfEnabledChange: (enabled: boolean) => void;
  docusealTemplateId: number | null;
  onDocusealTemplateIdChange: (templateId: number | null) => void;
  fieldMappings: Record<string, string>;
  onFieldMappingsChange: (mappings: Record<string, string>) => void;
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

  const handleMappingChange = (chkinField: string, docusealField: string) => {
    const newMappings = { ...fieldMappings };
    if (docusealField) {
      newMappings[chkinField] = docusealField;
    } else {
      delete newMappings[chkinField];
    }
    onFieldMappingsChange(newMappings);
  };

  const openDocuSealAdmin = () => {
    if (docusealUrl) {
      window.open(docusealUrl, "_blank", "noopener,noreferrer");
    }
  };

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
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Step 3: Field Mapping (Optional)
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Map your form fields to the PDF template fields for auto-fill.
                This allows patient responses to pre-populate the PDF before
                signing.
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
                <div className="space-y-3">
                  {chkinFields.map((chkinField) => (
                    <div
                      key={chkinField.name}
                      className="flex items-center gap-4"
                    >
                      <div className="w-1/2">
                        <span className="text-sm text-gray-700">
                          {chkinField.label}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">
                          ({chkinField.name})
                        </span>
                      </div>
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
                      <select
                        value={fieldMappings[chkinField.name] || ""}
                        onChange={(e) =>
                          handleMappingChange(chkinField.name, e.target.value)
                        }
                        className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500"
                      >
                        <option value="">-- Not mapped --</option>
                        {docusealFields.map((dsField) => (
                          <option key={dsField.name} value={dsField.name}>
                            {dsField.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
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
                    <p className="mt-1 text-sm text-blue-700">
                      When a patient submits your form, their answers will
                      automatically populate the corresponding fields in the PDF
                      before they sign it.
                    </p>
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
