"use client";

/**
 * Form Preview Component
 *
 * Interactive live preview of the form as patients will see it.
 * Supports Google Places address autocomplete for address fields.
 * All fields are interactive so providers can test the user experience.
 */

import { useState, useCallback } from "react";
import { AddressAutocomplete, type AddressComponents } from "@/components/ui";

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

interface FormPreviewProps {
  title: string;
  description: string;
  fields: FormField[];
  sections: string[];
  consentClause: string;
  mobileView?: boolean;
}

// Type for field values - supports various input types
type FieldValue = string | boolean | string[];

/**
 * Get a human-readable label for an address group
 */
function getAddressGroupLabel(_fieldName: string, fieldLabel: string): string {
  // Try to extract a meaningful prefix from the field label
  // e.g., "Home Street Address" -> "Home Address"
  // e.g., "Postal Street Address" -> "Postal Address"
  // e.g., "Responsible Party Street Address" -> "Responsible Party Address"

  const label = fieldLabel
    .replace(/Street\s*/i, "")
    .replace(/Address\s*$/i, "")
    .trim();

  return label ? `${label} Address` : "Address";
}

interface AddressGroupInfo {
  groupId: string;
  parentField: FormField;
  linkedFields: FormField[];
  label: string;
}

export default function FormPreview({
  title,
  description,
  fields,
  sections,
  consentClause,
  mobileView = false,
}: FormPreviewProps) {
  // State for all field values
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>({});
  const [consentChecked, setConsentChecked] = useState(false);

  // Update a field value
  const updateFieldValue = useCallback((fieldId: string, value: FieldValue) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
  }, []);

  // Auto-populate linked fields when an address is selected
  const populateLinkedFields = useCallback((addressField: FormField, address: AddressComponents) => {
    // Find all fields in the same group as the address field
    if (!addressField.groupId) return;

    const linkedFields = fields.filter(f => f.groupId === addressField.groupId && f.id !== addressField.id);

    const updates: Record<string, FieldValue> = {};

    // Country code mapping
    const countryMap: Record<string, string> = {
      "South Africa": "ZA",
      "Botswana": "BW",
      "Lesotho": "LS",
      "Mozambique": "MZ",
      "Namibia": "NA",
      "Eswatini": "SZ",
      "Swaziland": "SZ",
      "Zimbabwe": "ZW",
    };

    // Helper to check if field name matches a pattern (case-insensitive, handles prefixes)
    const matchesField = (fieldName: string, ...patterns: string[]) => {
      const lowerName = fieldName.toLowerCase();
      return patterns.some(pattern => lowerName.endsWith(pattern.toLowerCase()));
    };

    // Map address components to field names
    // Handles both base names (suburb, city) and prefixed names (responsiblePartyAddressSuburb, etc.)
    linkedFields.forEach(field => {
      const fieldName = field.fieldDefinition.name;

      // ComplexName field (complexName, postalComplexName, responsiblePartyAddressComplexName, etc.)
      // Note: Google Places doesn't return complex/building name, so this stays empty for manual entry
      if (matchesField(fieldName, "complexName", "ComplexName")) {
        // Complex name is not returned by Google Places - leave for manual entry
      }
      // UnitNumber field (unitNumber, postalUnitNumber, responsiblePartyAddressUnitNumber, etc.)
      // Note: Google Places may return subpremise which could be unit number
      else if (matchesField(fieldName, "unitNumber", "UnitNumber")) {
        // Unit number is not reliably returned by Google Places - leave for manual entry
      }
      // Suburb field (suburb, postalSuburb, responsiblePartyAddressSuburb, etc.)
      else if (matchesField(fieldName, "suburb", "Suburb")) {
        if (address.suburb) updates[field.id] = address.suburb;
      }
      // City field (city, postalCity, responsiblePartyAddressCity, etc.)
      else if (matchesField(fieldName, "city", "City")) {
        if (address.city) updates[field.id] = address.city;
      }
      // Province/State field (stateProvince, postalProvince, responsiblePartyAddressProvince, etc.)
      else if (matchesField(fieldName, "province", "Province", "stateProvince", "StateProvince")) {
        if (address.province) updates[field.id] = address.province;
      }
      // Postal code field (postalCode, postalPostalCode, responsiblePartyAddressPostalCode, etc.)
      else if (matchesField(fieldName, "postalCode", "PostalCode")) {
        if (address.postalCode) updates[field.id] = address.postalCode;
      }
      // Country field (country, postalCountry, responsiblePartyAddressCountry, etc.)
      else if (matchesField(fieldName, "country", "Country")) {
        if (address.country) {
          updates[field.id] = countryMap[address.country] || address.country;
        }
      }
    });

    // Batch update all linked fields
    setFieldValues(prev => ({ ...prev, ...updates }));
  }, [fields]);

  // Reset all field values
  const resetPreview = useCallback(() => {
    setFieldValues({});
    setConsentChecked(false);
  }, []);

  // Check if any fields have values
  const hasValues = Object.keys(fieldValues).length > 0 || consentChecked;

  // Group fields by section
  const fieldsBySection = sections.reduce((acc, section) => {
    acc[section] = fields
      .filter((f) => f.section === section)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return acc;
  }, {} as Record<string, FormField[]>);

  // Identify address groups for visual organization
  // Returns a map of groupId -> AddressGroupInfo
  // Works with both explicit groupId (from form builder) and implicit grouping via linkedFields config
  const getAddressGroups = useCallback((sectionFields: FormField[]): Map<string, AddressGroupInfo> => {
    const groups = new Map<string, AddressGroupInfo>();

    for (const field of sectionFields) {
      if (field.fieldDefinition.fieldType === "address") {
        // Check if this address field has linked fields via config
        let linkedFields: FormField[] = [];

        if (field.groupId) {
          // Explicit groupId - find all fields with same groupId
          linkedFields = sectionFields.filter(
            f => f.groupId === field.groupId && f.id !== field.id
          );
        } else if (field.fieldDefinition.config) {
          // No explicit groupId - try to find linked fields via config
          try {
            const config = JSON.parse(field.fieldDefinition.config);
            if (config.linkedFields) {
              const linkedFieldNames = Object.values(config.linkedFields).filter(Boolean) as string[];
              linkedFields = sectionFields.filter(
                f => linkedFieldNames.includes(f.fieldDefinition.name)
              );
            }
          } catch {
            // Config parsing failed, no linked fields
          }
        }

        const groupKey = field.groupId || `address-${field.id}`;
        groups.set(groupKey, {
          groupId: groupKey,
          parentField: field,
          linkedFields,
          label: getAddressGroupLabel(field.fieldDefinition.name, field.fieldDefinition.label),
        });
      }
    }

    return groups;
  }, []);

  // Render a single field with its label
  const renderField = (field: FormField, inGroup = false) => (
    <div key={field.id}>
      <label className={`block ${inGroup ? "text-sm" : ""} font-medium text-gray-700`}>
        {field.labelOverride || field.fieldDefinition.label}
        {field.isRequired && <span className="ml-1 text-red-500">*</span>}
      </label>
      {field.helpText && (
        <p className="mt-0.5 text-xs text-gray-500">{field.helpText}</p>
      )}
      {renderFieldInput(field)}
    </div>
  );

  // Helper to get column span class (Tailwind requires static class names)
  const getColSpanClass = (span: number) => {
    switch (span) {
      case 1: return "col-span-1";
      case 2: return "col-span-2";
      case 3: return "col-span-3";
      case 4: return "col-span-4";
      case 5: return "col-span-5";
      case 6: return "col-span-6";
      case 7: return "col-span-7";
      case 8: return "col-span-8";
      default: return "col-span-8";
    }
  };

  // Render fields for a section, grouping address fields visually
  const renderSectionFields = (sectionFields: FormField[], isMobile = false) => {
    const addressGroups = getAddressGroups(sectionFields);
    const renderedGroupIds = new Set<string>();
    // Track which fields are part of address groups (to skip rendering them individually)
    const fieldsInGroups = new Set<string>();
    addressGroups.forEach(group => {
      fieldsInGroups.add(group.parentField.id);
      group.linkedFields.forEach(f => fieldsInGroups.add(f.id));
    });

    const elements: React.ReactNode[] = [];

    for (const field of sectionFields) {
      // Check if this field is an address field (parent of a group)
      const isAddressField = field.fieldDefinition.fieldType === "address";
      const groupKey = field.groupId || (isAddressField ? `address-${field.id}` : null);

      if (groupKey && addressGroups.has(groupKey)) {
        // Skip if we've already rendered this group
        if (renderedGroupIds.has(groupKey)) continue;
        renderedGroupIds.add(groupKey);

        const group = addressGroups.get(groupKey)!;

        // Render the entire address group in a bordered section with header
        elements.push(
          <div
            key={`group-${group.groupId}`}
            className={`rounded-lg border border-gray-300 bg-white p-4 ${isMobile ? "" : "col-span-8"}`}
          >
            {/* Group header with location icon */}
            <div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-3">
              <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-semibold text-gray-800">{group.label}</span>
            </div>

            {/* Address fields */}
            <div className={isMobile ? "space-y-3" : "grid grid-cols-8 gap-3"}>
              {/* Parent address field (Google Places autocomplete) */}
              <div className={isMobile ? "" : getColSpanClass(group.parentField.columnSpan || 8)}>
                {renderField(group.parentField, true)}
              </div>

              {/* Linked sub-fields */}
              {group.linkedFields.map((linkedField) => (
                <div
                  key={linkedField.id}
                  className={isMobile ? "" : getColSpanClass(linkedField.columnSpan || 4)}
                >
                  {renderField(linkedField, true)}
                </div>
              ))}
            </div>
          </div>
        );
      } else if (!fieldsInGroups.has(field.id)) {
        // Regular field (not part of any address group)
        if (isMobile) {
          elements.push(renderField(field));
        } else {
          elements.push(
            <div key={field.id} className={getColSpanClass(field.columnSpan || 8)}>
              {renderField(field)}
            </div>
          );
        }
      }
      // Skip fields that are linked to an address group (they're rendered with the parent)
    }

    return elements;
  };

  // Render field input based on type - all fields are interactive
  const renderFieldInput = (field: FormField) => {
    const label = field.labelOverride || field.fieldDefinition.label;
    const config = field.fieldDefinition.config
      ? JSON.parse(field.fieldDefinition.config)
      : {};

    const fieldValue = fieldValues[field.id] ?? "";

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
            value={fieldValue as string}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
          />
        );

      case "number":
        return (
          <input
            type="number"
            placeholder={config.placeholder || "0"}
            className={baseInputClasses}
            value={fieldValue as string}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
          />
        );

      case "date":
        return (
          <input
            type="date"
            className={baseInputClasses}
            value={fieldValue as string}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
          />
        );

      case "textarea":
        return (
          <textarea
            placeholder={config.placeholder || `Enter ${label.toLowerCase()}...`}
            rows={3}
            className={baseInputClasses}
            value={fieldValue as string}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
          />
        );

      case "select":
        return (
          <select
            className={baseInputClasses}
            value={fieldValue as string}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
          >
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
              checked={fieldValue as boolean}
              onChange={(e) => updateFieldValue(field.id, e.target.checked)}
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
                const optValue = typeof opt === "string" ? opt : opt.value;
                const optLabel = typeof opt === "string" ? opt : opt.label;
                return (
                  <label key={i} className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name={`preview-${field.id}`}
                      value={optValue}
                      checked={fieldValue === optValue}
                      onChange={(e) => updateFieldValue(field.id, e.target.value)}
                      className="h-4 w-4 border-gray-300 text-teal-600 focus:ring-teal-500"
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
          <div className="mt-1 flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 px-6 py-4 cursor-pointer hover:border-teal-400 hover:bg-teal-50/50 transition-colors">
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
              <p className="text-xs text-gray-400">(Preview only)</p>
            </div>
          </div>
        );

      case "address":
        // Render interactive Google Places address autocomplete
        return (
          <AddressAutocomplete
            value={fieldValue as string}
            onChange={(value) => updateFieldValue(field.id, value)}
            onSelect={(address) => {
              // Store the formatted address in state
              updateFieldValue(field.id, address.streetAddress || address.formattedAddress);
              // Auto-populate linked fields (suburb, city, province, postal code, country)
              populateLinkedFields(field, address);
            }}
            placeholder={config.placeholder || "Start typing an address..."}
            className="mt-1"
          />
        );

      case "country":
        // Country selector with South Africa as default
        return (
          <select
            className={baseInputClasses}
            value={fieldValue as string || (config.defaultCountry === "ZA" ? "ZA" : "")}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
          >
            <option value="">Select country...</option>
            <option value="ZA">South Africa</option>
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
            value={fieldValue as string}
            onChange={(e) => updateFieldValue(field.id, e.target.value)}
          />
        );
    }
  };

  // Mobile view simulates an iPhone-sized screen with fixed height and scrolling
  if (mobileView) {
    return (
      <div className="mx-auto max-w-[375px]">
        {/* Reset Button - outside phone frame */}
        {hasValues && (
          <div className="mb-2 flex justify-end">
            <button
              onClick={resetPreview}
              className="flex items-center gap-1 rounded-md bg-gray-100 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset Preview
            </button>
          </div>
        )}
        {/* Phone Frame */}
        <div className="rounded-[2.5rem] border-[14px] border-gray-800 bg-gray-800 p-1 shadow-xl">
          {/* Notch */}
          <div className="relative">
            <div className="absolute left-1/2 top-0 z-10 h-6 w-32 -translate-x-1/2 rounded-b-2xl bg-gray-800" />
          </div>
          {/* Screen */}
          <div className="h-[600px] overflow-y-auto rounded-[2rem] bg-white">
            <div className="p-4 pt-8">
              {/* Header */}
              <div className="mb-6 border-b border-gray-200 pb-4">
                <h1 className="text-xl font-bold text-gray-900">
                  {title || "Untitled Form"}
                </h1>
                {description && (
                  <p className="mt-1 text-sm text-gray-600">{description}</p>
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
                          <h2 className="mb-4 text-base font-semibold text-gray-800">
                            {section}
                          </h2>
                        )}
                        <div className="space-y-4">
                          {renderSectionFields(sectionFields, true)}
                        </div>
                      </div>
                    );
                  })}

                  {/* Consent Clause */}
                  {consentClause && (
                    <div className="border-t border-gray-200 pt-6">
                      <h2 className="mb-3 text-base font-semibold text-gray-800">
                        Consent
                      </h2>
                      <div className="rounded-lg bg-gray-50 p-4 text-xs">
                        <p className="whitespace-pre-wrap text-gray-700">
                          {consentClause}
                        </p>
                      </div>
                      <label className="mt-4 flex items-start gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                          checked={consentChecked}
                          onChange={(e) => setConsentChecked(e.target.checked)}
                        />
                        <span className="text-sm text-gray-700">
                          I have read and agree to the above terms and consent to the
                          collection of my personal information.
                        </span>
                      </label>
                    </div>
                  )}

                  {/* Submit Button */}
                  <div className="pt-4 pb-8">
                    <button
                      disabled
                      className="w-full rounded-lg bg-teal-600 px-4 py-3 text-sm font-medium text-white opacity-75 cursor-not-allowed"
                      title="Preview only - button disabled"
                    >
                      Submit
                    </button>
                    <p className="mt-2 text-center text-xs text-gray-400">
                      Preview only - submit is disabled
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        {/* Home Indicator */}
        <div className="mx-auto mt-2 h-1 w-32 rounded-full bg-gray-300" />
      </div>
    );
  }

  // Desktop view
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      {/* Header with Reset Button */}
      <div className="mb-6 border-b border-gray-200 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {title || "Untitled Form"}
            </h1>
            {description && (
              <p className="mt-1 text-gray-600">{description}</p>
            )}
          </div>
          {hasValues && (
            <button
              onClick={resetPreview}
              className="flex items-center gap-1.5 rounded-md bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </button>
          )}
        </div>
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
                  <h2 className="mb-4 text-lg font-semibold text-gray-800">
                    {section}
                  </h2>
                )}
                <div className="grid grid-cols-8 gap-4">
                  {renderSectionFields(sectionFields, false)}
                </div>
              </div>
            );
          })}

          {/* Consent Clause */}
          {consentClause && (
            <div className="border-t border-gray-200 pt-6">
              <h2 className="mb-3 text-lg font-semibold text-gray-800">
                Consent
              </h2>
              <div className="rounded-lg bg-gray-50 p-4 text-sm">
                <p className="whitespace-pre-wrap text-gray-700">
                  {consentClause}
                </p>
              </div>
              <label className="mt-4 flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  checked={consentChecked}
                  onChange={(e) => setConsentChecked(e.target.checked)}
                />
                <span className="text-gray-700">
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
              className="w-full rounded-lg bg-teal-600 px-6 py-3 font-medium text-white opacity-75 cursor-not-allowed"
              title="Preview only - button disabled"
            >
              Submit
            </button>
            <p className="mt-2 text-center text-sm text-gray-400">
              Preview only - submit is disabled
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
