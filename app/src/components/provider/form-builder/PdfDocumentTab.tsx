"use client";

/**
 * PDF Document Tab Component
 *
 * Tab content for configuring DocuSeal PDF templates in the form builder.
 * Allows providers to:
 * - Enable/disable PDF signing for a form
 * - Upload and configure PDF templates via DocuSeal Builder
 * - Map Chkin form fields to PDF placeholders
 */

import { useState, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";

// Dynamic import to avoid SSR issues with DocuSeal
const DocuSealBuilder = dynamic(
  () => import("./DocuSealBuilder"),
  {
    ssr: false,
    loading: () => (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <div className="w-8 h-8 border-4 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    ),
  }
);

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
  formId?: string;
  pdfEnabled: boolean;
  onPdfEnabledChange: (enabled: boolean) => void;
  docusealTemplateId: number | null;
  onDocusealTemplateIdChange: (templateId: number | null) => void;
  fieldMappings: Record<string, string>;
  onFieldMappingsChange: (mappings: Record<string, string>) => void;
  chkinFields: ChkinField[];
}

export default function PdfDocumentTab({
  formId,
  pdfEnabled,
  onPdfEnabledChange,
  docusealTemplateId,
  onDocusealTemplateIdChange,
  fieldMappings,
  onFieldMappingsChange,
  chkinFields,
}: PdfDocumentTabProps) {
  const [showBuilder, setShowBuilder] = useState(false);
  const [docusealFields, setDocusealFields] = useState<DocuSealField[]>([]);
  const [loadingFields, setLoadingFields] = useState(false);

  // Fetch DocuSeal template fields when template ID changes
  const fetchDocuSealFields = useCallback(async (_templateId: number) => {
    if (!formId) return;

    setLoadingFields(true);
    try {
      const response = await fetch(`/api/provider/forms/${formId}/docuseal`);
      const data = await response.json();

      if (response.ok && data.docusealFields) {
        setDocusealFields(data.docusealFields);
      }
    } catch (error) {
      console.error("Failed to fetch DocuSeal fields:", error);
    } finally {
      setLoadingFields(false);
    }
  }, [formId]);

  useEffect(() => {
    if (docusealTemplateId && formId) {
      fetchDocuSealFields(docusealTemplateId);
    }
  }, [docusealTemplateId, formId, fetchDocuSealFields]);

  const handleTemplateSaved = (templateId: number) => {
    onDocusealTemplateIdChange(templateId);
    setShowBuilder(false);
    fetchDocuSealFields(templateId);
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
              form fields. The document will be pre-filled with their information.
            </p>
          </div>
        </div>
      </div>

      {pdfEnabled && (
        <>
          {/* PDF Template Section */}
          <div className="rounded-lg border border-gray-200 bg-white p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              PDF Template
            </h3>

            {!showBuilder ? (
              <div className="space-y-4">
                {docusealTemplateId ? (
                  <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center gap-3">
                      <svg
                        className="w-8 h-8 text-green-600"
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
                      <div>
                        <p className="text-sm font-medium text-green-800">
                          PDF Template Configured
                        </p>
                        <p className="text-xs text-green-600">
                          Template ID: {docusealTemplateId}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowBuilder(true)}
                      className="text-sm text-green-600 hover:text-green-500 font-medium"
                    >
                      Edit Template
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <svg
                      className="w-12 h-12 text-gray-400 mx-auto mb-4"
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
                    <p className="text-sm text-gray-500 mb-4">
                      No PDF template configured yet
                    </p>
                    <button
                      onClick={() => setShowBuilder(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-500 transition-colors"
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
                          d="M12 4v16m8-8H4"
                        />
                      </svg>
                      Create PDF Template
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium text-gray-700">
                    PDF Builder
                  </h4>
                  <button
                    onClick={() => setShowBuilder(false)}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                </div>
                <div className="border rounded-lg overflow-hidden">
                  <DocuSealBuilder
                    onSave={handleTemplateSaved}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Field Mapping Section */}
          {docusealTemplateId && !showBuilder && (
            <div className="rounded-lg border border-gray-200 bg-white p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Field Mapping
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Map your form fields to the PDF template fields for auto-fill.
              </p>

              {loadingFields ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 border-2 border-teal-600 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : docusealFields.length === 0 ? (
                <div className="text-center py-8 text-sm text-gray-500">
                  <p>No fillable fields found in the PDF template.</p>
                  <p className="mt-1">
                    Add text fields in the PDF builder to enable auto-fill.
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
        </>
      )}
    </div>
  );
}
