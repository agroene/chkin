"use client";

/**
 * Form Preview Component
 *
 * Live preview of the form as patients will see it.
 * Supports Google Places address autocomplete for address fields.
 */

import { AddressAutocomplete } from "@/components/ui";

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
}

interface FormPreviewProps {
  title: string;
  description: string;
  fields: FormField[];
  sections: string[];
  consentClause: string;
  mobileView?: boolean;
}

export default function FormPreview({
  title,
  description,
  fields,
  sections,
  consentClause,
  mobileView = false,
}: FormPreviewProps) {
  // Group fields by section
  const fieldsBySection = sections.reduce((acc, section) => {
    acc[section] = fields
      .filter((f) => f.section === section)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return acc;
  }, {} as Record<string, FormField[]>);

  // Render field input based on type
  const renderFieldInput = (field: FormField) => {
    const label = field.labelOverride || field.fieldDefinition.label;
    const config = field.fieldDefinition.config
      ? JSON.parse(field.fieldDefinition.config)
      : {};

    const baseInputClasses =
      "mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500";

    switch (field.fieldDefinition.fieldType) {
      case "text":
      case "email":
      case "phone":
        return (
          <input
            type={field.fieldDefinition.fieldType === "email" ? "email" : "text"}
            placeholder={config.placeholder || `Enter ${label.toLowerCase()}...`}
            className={baseInputClasses}
            disabled
          />
        );

      case "number":
        return (
          <input
            type="number"
            placeholder={config.placeholder || "0"}
            className={baseInputClasses}
            disabled
          />
        );

      case "date":
        return (
          <input type="date" className={baseInputClasses} disabled />
        );

      case "textarea":
        return (
          <textarea
            placeholder={config.placeholder || `Enter ${label.toLowerCase()}...`}
            rows={3}
            className={baseInputClasses}
            disabled
          />
        );

      case "select":
        return (
          <select className={baseInputClasses} disabled>
            <option value="">Select {label.toLowerCase()}...</option>
            {config.options?.map((opt: string | { value: string; label: string }, i: number) => {
              const optValue = typeof opt === "string" ? opt : opt.value;
              const optLabel = typeof opt === "string" ? opt : opt.label;
              return (
                <option key={i} value={optValue}>
                  {optLabel}
                </option>
              );
            })}
          </select>
        );

      case "checkbox":
        return (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              disabled
            />
            <span className="text-sm text-gray-700">
              {config.checkboxLabel || label}
            </span>
          </div>
        );

      case "radio":
        return (
          <div className="mt-2 space-y-2">
            {(config.options || ["Option 1", "Option 2"]).map(
              (opt: string | { value: string; label: string }, i: number) => {
                const optLabel = typeof opt === "string" ? opt : opt.label;
                return (
                  <label key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={field.id}
                      className="h-4 w-4 border-gray-300 text-teal-600 focus:ring-teal-500"
                      disabled
                    />
                    <span className="text-sm text-gray-700">{optLabel}</span>
                  </label>
                );
              }
            )}
          </div>
        );

      case "file":
        return (
          <div className="mt-1 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-4">
            <div className="text-center">
              <svg
                className="mx-auto h-8 w-8 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                />
              </svg>
              <p className="mt-1 text-xs text-gray-500">
                Click to upload or drag and drop
              </p>
            </div>
          </div>
        );

      case "address":
        // Render Google Places address autocomplete (disabled for preview)
        return (
          <AddressAutocomplete
            value=""
            onChange={() => {}}
            onSelect={() => {}}
            placeholder={config.placeholder || "Start typing an address..."}
            disabled
            className="mt-1"
          />
        );

      case "country":
        // Country selector with South Africa as default
        return (
          <select className={baseInputClasses} disabled>
            <option value="">Select country...</option>
            <option value="ZA" selected={config.defaultCountry === "ZA"}>South Africa</option>
            <option value="BW">Botswana</option>
            <option value="LS">Lesotho</option>
            <option value="MZ">Mozambique</option>
            <option value="NA">Namibia</option>
            <option value="SZ">Eswatini</option>
            <option value="ZW">Zimbabwe</option>
            <option value="OTHER">Other</option>
          </select>
        );

      default:
        return (
          <input
            type="text"
            placeholder={`Enter ${label.toLowerCase()}...`}
            className={baseInputClasses}
            disabled
          />
        );
    }
  };

  const containerClasses = mobileView
    ? "mx-auto max-w-[375px] rounded-3xl border-8 border-gray-800 bg-white p-4 shadow-xl"
    : "rounded-lg border border-gray-200 bg-white p-6 shadow-sm";

  return (
    <div className={containerClasses}>
      {/* Header */}
      <div className="mb-6 border-b border-gray-200 pb-4">
        <h1 className={`font-bold text-gray-900 ${mobileView ? "text-xl" : "text-2xl"}`}>
          {title || "Untitled Form"}
        </h1>
        {description && (
          <p className={`mt-1 text-gray-600 ${mobileView ? "text-sm" : ""}`}>
            {description}
          </p>
        )}
      </div>

      {/* Form Content */}
      {fields.length === 0 ? (
        <div className="py-12 text-center">
          <svg
            className="mx-auto h-12 w-12 text-gray-300"
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
          <p className="mt-2 text-sm text-gray-400">
            Add fields to see the preview
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {sections.map((section) => {
            const sectionFields = fieldsBySection[section];
            if (!sectionFields?.length) return null;

            return (
              <div key={section}>
                {sections.length > 1 && (
                  <h2 className={`mb-4 font-semibold text-gray-800 ${mobileView ? "text-base" : "text-lg"}`}>
                    {section}
                  </h2>
                )}
                <div className="space-y-4">
                  {sectionFields.map((field) => (
                    <div key={field.id}>
                      <label className={`block font-medium text-gray-700 ${mobileView ? "text-sm" : ""}`}>
                        {field.labelOverride || field.fieldDefinition.label}
                        {field.isRequired && (
                          <span className="ml-1 text-red-500">*</span>
                        )}
                      </label>
                      {field.helpText && (
                        <p className="mt-0.5 text-xs text-gray-500">
                          {field.helpText}
                        </p>
                      )}
                      {renderFieldInput(field)}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Consent Clause */}
          {consentClause && (
            <div className="border-t border-gray-200 pt-6">
              <h2 className={`mb-3 font-semibold text-gray-800 ${mobileView ? "text-base" : "text-lg"}`}>
                Consent
              </h2>
              <div className={`rounded-lg bg-gray-50 p-4 ${mobileView ? "text-xs" : "text-sm"}`}>
                <p className="whitespace-pre-wrap text-gray-700">
                  {consentClause}
                </p>
              </div>
              <label className="mt-4 flex items-start gap-3">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  disabled
                />
                <span className={`text-gray-700 ${mobileView ? "text-sm" : ""}`}>
                  I have read and agree to the above terms and consent to the
                  collection of my personal information.
                </span>
              </label>
            </div>
          )}

          {/* Submit Button */}
          <div className="pt-4">
            <button
              disabled
              className={`w-full rounded-lg bg-teal-600 font-medium text-white ${
                mobileView ? "px-4 py-3 text-sm" : "px-6 py-3"
              }`}
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
