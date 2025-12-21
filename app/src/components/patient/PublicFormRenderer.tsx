"use client";

/**
 * Public Form Renderer Component
 *
 * Renders a patient check-in form with all field types supported.
 * Handles form validation, submission, and consent.
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
    specialPersonalInfo: boolean;
    requiresExplicitConsent: boolean;
  };
  labelOverride: string | null;
  helpText: string | null;
  isRequired: boolean;
  sortOrder: number;
  section: string | null;
  columnSpan: number;
  groupId?: string;
}

interface AddressGroupInfo {
  groupId: string;
  parentField: FormField;
  linkedFields: FormField[];
  label: string;
}

/**
 * Get a human-readable label for an address group
 */
function getAddressGroupLabel(_fieldName: string, fieldLabel: string): string {
  const label = fieldLabel
    .replace(/Street\s*/i, "")
    .replace(/Address\s*$/i, "")
    .trim();
  return label ? `${label} Address` : "Address";
}

interface FormData {
  id: string;
  title: string;
  description: string | null;
  consentClause: string | null;
  fields: FormField[];
  sections: string[];
  organization: {
    id: string;
    name: string;
    logo: string | null;
  };
}

interface PublicFormRendererProps {
  form: FormData;
  prefillData: Record<string, unknown> | null;
  isAuthenticated: boolean;
  onSubmit: (data: Record<string, unknown>, consentGiven: boolean) => Promise<void>;
}

type FieldValue = string | boolean | string[];

export default function PublicFormRenderer({
  form,
  prefillData,
  isAuthenticated,
  onSubmit,
}: PublicFormRendererProps) {
  // Initialize form values with prefill data
  const [fieldValues, setFieldValues] = useState<Record<string, FieldValue>>(() => {
    const initial: Record<string, FieldValue> = {};
    if (prefillData) {
      for (const field of form.fields) {
        const value = prefillData[field.fieldDefinition.name];
        if (value !== undefined) {
          initial[field.fieldDefinition.name] = value as FieldValue;
        }
      }
    }
    return initial;
  });
  const [consentChecked, setConsentChecked] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Update a field value
  const updateFieldValue = useCallback((fieldName: string, value: FieldValue) => {
    setFieldValues((prev) => ({ ...prev, [fieldName]: value }));
    // Clear validation error for this field
    setValidationErrors((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  }, []);

  // Handle address field auto-populate
  const populateAddressFields = useCallback((field: FormField, address: AddressComponents) => {
    const config = field.fieldDefinition.config
      ? JSON.parse(field.fieldDefinition.config)
      : {};

    // Debug logging for address field auto-population
    console.log("populateAddressFields called:", {
      fieldName: field.fieldDefinition.name,
      config,
      linkedFields: config.linkedFields,
      addressComponents: {
        unitNumber: address.unitNumber,
        complexName: address.complexName,
        streetAddress: address.streetAddress,
        suburb: address.suburb,
        city: address.city,
        province: address.province,
        postalCode: address.postalCode,
        country: address.country,
      },
    });

    if (!config.linkedFields) {
      console.log("No linkedFields config found, skipping auto-populate");
      return;
    }

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

    // Map address components to linked fields
    const linkedFields = config.linkedFields as Record<string, string>;

    // Building/Complex details
    if (linkedFields.unitNumber && address.unitNumber) {
      updates[linkedFields.unitNumber] = address.unitNumber;
    }
    if (linkedFields.complexName && address.complexName) {
      updates[linkedFields.complexName] = address.complexName;
    }
    if (linkedFields.floor && address.floor) {
      updates[linkedFields.floor] = address.floor;
    }

    // Street address
    if (linkedFields.streetAddress && address.streetAddress) {
      updates[linkedFields.streetAddress] = address.streetAddress;
    }

    // Area/Region
    if (linkedFields.suburb && address.suburb) {
      updates[linkedFields.suburb] = address.suburb;
    }
    if (linkedFields.city && address.city) {
      updates[linkedFields.city] = address.city;
    }
    if (linkedFields.province && address.province) {
      updates[linkedFields.province] = address.province;
    }
    if (linkedFields.postalCode && address.postalCode) {
      updates[linkedFields.postalCode] = address.postalCode;
    }
    if (linkedFields.country && address.country) {
      updates[linkedFields.country] = countryMap[address.country] || address.country;
    }

    console.log("Applying field updates:", updates);
    setFieldValues((prev) => ({ ...prev, ...updates }));
  }, []);

  // Validate form
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    for (const field of form.fields) {
      if (field.isRequired) {
        const value = fieldValues[field.fieldDefinition.name];
        if (value === undefined || value === null || value === "") {
          errors[field.fieldDefinition.name] =
            `${field.labelOverride || field.fieldDefinition.label} is required`;
        }
      }
    }

    // Check consent
    if (form.consentClause && !consentChecked) {
      errors["_consent"] = "You must agree to the terms to submit";
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit(fieldValues, consentChecked);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  // Group fields by section
  const fieldsBySection = form.sections.reduce((acc, section) => {
    acc[section] = form.fields
      .filter((f) => (f.section || "Default") === section)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return acc;
  }, {} as Record<string, FormField[]>);

  // Identify address groups for visual organization
  const getAddressGroups = useCallback((sectionFields: FormField[]): Map<string, AddressGroupInfo> => {
    const groups = new Map<string, AddressGroupInfo>();

    for (const field of sectionFields) {
      if (field.fieldDefinition.fieldType === "address") {
        let linkedFields: FormField[] = [];

        if (field.groupId) {
          linkedFields = sectionFields.filter(
            f => f.groupId === field.groupId && f.id !== field.id
          );
        } else if (field.fieldDefinition.config) {
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

  // Render a single field with label
  const renderField = (field: FormField, inGroup = false) => (
    <div key={field.id}>
      {field.fieldDefinition.fieldType !== "checkbox" && (
        <label className={`block ${inGroup ? "text-sm" : ""} font-medium text-gray-700 mb-2`}>
          {field.labelOverride || field.fieldDefinition.label}
          {field.isRequired && <span className="ml-1 text-red-500">*</span>}
        </label>
      )}
      {field.helpText && (
        <p className="mb-2 text-sm text-gray-500">{field.helpText}</p>
      )}
      {renderFieldInput(field)}
      {validationErrors[field.fieldDefinition.name] && (
        <p className="mt-1 text-sm text-red-600">
          {validationErrors[field.fieldDefinition.name]}
        </p>
      )}
    </div>
  );

  // Helper to get responsive column span class
  // On mobile (default): full width. On md+ screens: use column span
  const getResponsiveColSpanClass = (span: number) => {
    switch (span) {
      case 1: return "md:col-span-1";
      case 2: return "md:col-span-2";
      case 3: return "md:col-span-3";
      case 4: return "md:col-span-4";
      case 5: return "md:col-span-5";
      case 6: return "md:col-span-6";
      case 7: return "md:col-span-7";
      case 8: return "md:col-span-8";
      default: return "md:col-span-8";
    }
  };

  // Render fields for a section with proper grid layout and grouping
  const renderSectionFields = (sectionFields: FormField[]) => {
    const addressGroups = getAddressGroups(sectionFields);
    const renderedGroupIds = new Set<string>();
    const fieldsInGroups = new Set<string>();

    addressGroups.forEach(group => {
      fieldsInGroups.add(group.parentField.id);
      group.linkedFields.forEach(f => fieldsInGroups.add(f.id));
    });

    const elements: React.ReactNode[] = [];

    for (const field of sectionFields) {
      const isAddressField = field.fieldDefinition.fieldType === "address";
      const groupKey = field.groupId || (isAddressField ? `address-${field.id}` : null);

      if (groupKey && addressGroups.has(groupKey)) {
        if (renderedGroupIds.has(groupKey)) continue;
        renderedGroupIds.add(groupKey);

        const group = addressGroups.get(groupKey)!;

        // Render the entire address group in a bordered section
        elements.push(
          <div
            key={`group-${group.groupId}`}
            className="rounded-lg border border-gray-300 bg-white p-4 md:col-span-8"
          >
            {/* Group header with location icon */}
            <div className="mb-4 flex items-center gap-2 border-b border-gray-200 pb-3">
              <svg className="h-5 w-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="font-semibold text-gray-800">{group.label}</span>
            </div>

            {/* Address fields - stacked on mobile, grid on md+ */}
            <div className="space-y-4 md:space-y-0 md:grid md:grid-cols-8 md:gap-3">
              {/* Parent address field */}
              <div className={getResponsiveColSpanClass(group.parentField.columnSpan || 8)}>
                {renderField(group.parentField, true)}
              </div>

              {/* Linked sub-fields */}
              {group.linkedFields.map((linkedField) => (
                <div
                  key={linkedField.id}
                  className={getResponsiveColSpanClass(linkedField.columnSpan || 4)}
                >
                  {renderField(linkedField, true)}
                </div>
              ))}
            </div>
          </div>
        );
      } else if (!fieldsInGroups.has(field.id)) {
        // Regular field (not part of any address group)
        elements.push(
          <div key={field.id} className={getResponsiveColSpanClass(field.columnSpan || 8)}>
            {renderField(field)}
          </div>
        );
      }
    }

    return elements;
  };

  // Render field input based on type
  const renderFieldInput = (field: FormField) => {
    const label = field.labelOverride || field.fieldDefinition.label;
    const config = field.fieldDefinition.config
      ? JSON.parse(field.fieldDefinition.config)
      : {};
    const fieldName = field.fieldDefinition.name;
    const fieldValue = fieldValues[fieldName] ?? "";
    const hasError = !!validationErrors[fieldName];

    const baseInputClasses = `w-full rounded-lg border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-500 ${
      hasError
        ? "border-red-300 bg-red-50"
        : "border-gray-300 bg-white"
    }`;

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
            onChange={(e) => updateFieldValue(fieldName, e.target.value)}
          />
        );

      case "number":
        return (
          <input
            type="number"
            placeholder={config.placeholder || "0"}
            className={baseInputClasses}
            value={fieldValue as string}
            onChange={(e) => updateFieldValue(fieldName, e.target.value)}
          />
        );

      case "date":
        return (
          <input
            type="date"
            className={baseInputClasses}
            value={fieldValue as string}
            onChange={(e) => updateFieldValue(fieldName, e.target.value)}
          />
        );

      case "textarea":
        return (
          <textarea
            placeholder={config.placeholder || `Enter ${label.toLowerCase()}...`}
            rows={4}
            className={baseInputClasses}
            value={fieldValue as string}
            onChange={(e) => updateFieldValue(fieldName, e.target.value)}
          />
        );

      case "select":
        return (
          <select
            className={baseInputClasses}
            value={fieldValue as string}
            onChange={(e) => updateFieldValue(fieldName, e.target.value)}
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
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              checked={fieldValue as boolean}
              onChange={(e) => updateFieldValue(fieldName, e.target.checked)}
            />
            <span className="text-gray-700">{config.checkboxLabel || label}</span>
          </div>
        );

      case "radio":
        return (
          <div className="space-y-2">
            {(config.options || ["Option 1", "Option 2"]).map(
              (opt: string | { value: string; label: string }, i: number) => {
                const optValue = typeof opt === "string" ? opt : opt.value;
                const optLabel = typeof opt === "string" ? opt : opt.label;
                return (
                  <label key={i} className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name={`form-${field.id}`}
                      value={optValue}
                      checked={fieldValue === optValue}
                      onChange={(e) => updateFieldValue(fieldName, e.target.value)}
                      className="h-5 w-5 border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-gray-700">{optLabel}</span>
                  </label>
                );
              }
            )}
          </div>
        );

      case "address":
        return (
          <AddressAutocomplete
            value={fieldValue as string}
            onChange={(value) => updateFieldValue(fieldName, value)}
            onSelect={(address) => {
              updateFieldValue(fieldName, address.streetAddress || address.formattedAddress);
              populateAddressFields(field, address);
            }}
            placeholder={config.placeholder || "Start typing an address..."}
          />
        );

      case "country":
        return (
          <select
            className={baseInputClasses}
            value={(fieldValue as string) || (config.defaultCountry === "ZA" ? "ZA" : "")}
            onChange={(e) => updateFieldValue(fieldName, e.target.value)}
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
            onChange={(e) => updateFieldValue(fieldName, e.target.value)}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="mx-auto max-w-lg md:max-w-4xl">
        {/* Header */}
        <div className="mb-8 text-center">
          {form.organization.logo && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={form.organization.logo}
              alt={form.organization.name}
              className="mx-auto mb-4 h-16 w-auto"
            />
          )}
          <h1 className="text-2xl font-bold text-gray-900">{form.title}</h1>
          {form.description && (
            <p className="mt-2 text-gray-600">{form.description}</p>
          )}
          <p className="mt-1 text-sm text-gray-500">{form.organization.name}</p>
          {isAuthenticated && prefillData && (
            <div className="mt-4 inline-flex items-center gap-2 rounded-full bg-teal-50 px-4 py-2 text-sm text-teal-700">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Pre-filled with your saved information
            </div>
          )}
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-8">
            {form.sections.map((section) => {
              const sectionFields = fieldsBySection[section];
              if (!sectionFields?.length) return null;

              return (
                <div
                  key={section}
                  className="rounded-xl bg-white p-6 shadow-sm"
                >
                  {form.sections.length > 1 && section !== "Default" && (
                    <h2 className="mb-6 text-lg font-semibold text-gray-800">
                      {section}
                    </h2>
                  )}
                  {/* Stacked on mobile, grid on md+ */}
                  <div className="space-y-5 md:space-y-0 md:grid md:grid-cols-8 md:gap-4">
                    {renderSectionFields(sectionFields)}
                  </div>
                </div>
              );
            })}

            {/* Consent Section */}
            {form.consentClause && (
              <div className="rounded-xl bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-gray-800">
                  Consent
                </h2>
                <div className="rounded-lg bg-gray-50 p-4">
                  <p className="whitespace-pre-wrap text-sm text-gray-700">
                    {form.consentClause}
                  </p>
                </div>
                <label className="mt-4 flex items-start gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    className={`mt-1 h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500 ${
                      validationErrors["_consent"] ? "border-red-300" : ""
                    }`}
                    checked={consentChecked}
                    onChange={(e) => {
                      setConsentChecked(e.target.checked);
                      if (e.target.checked) {
                        setValidationErrors((prev) => {
                          const next = { ...prev };
                          delete next["_consent"];
                          return next;
                        });
                      }
                    }}
                  />
                  <span className="text-gray-700">
                    I have read and agree to the above terms and consent to the
                    collection and processing of my personal information.
                  </span>
                </label>
                {validationErrors["_consent"] && (
                  <p className="mt-2 text-sm text-red-600">
                    {validationErrors["_consent"]}
                  </p>
                )}
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="rounded-lg bg-red-50 p-4 text-red-700">
                <div className="flex items-center gap-2">
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <span>{error}</span>
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-xl bg-teal-600 py-4 text-lg font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <div className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Submitting...
                </span>
              ) : (
                "Submit Check-in"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
