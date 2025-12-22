"use client";

/**
 * Form Renderer Component
 *
 * Renders dynamic forms for patient data collection.
 * Supports Google Places address autocomplete with linked field auto-population.
 */

import { useState, useCallback } from "react";
import {
  AddressAutocomplete,
  type AddressComponents,
  PhoneInput,
  ReferralDoctorInput,
  type ReferralDoctorData,
} from "@/components/ui";

interface FieldDefinition {
  id: string;
  name: string;
  label: string;
  description: string | null;
  fieldType: string;
  config: string | null;
  category: string;
}

interface FormField {
  id: string;
  fieldDefinitionId: string;
  fieldDefinition: FieldDefinition;
  labelOverride: string | null;
  helpText: string | null;
  isRequired: boolean;
  sortOrder: number;
  section: string | null;
}

interface FormRendererProps {
  title: string;
  description: string;
  fields: FormField[];
  sections: string[];
  consentClause: string;
  onSubmit: (values: Record<string, string>) => void;
  isSubmitting?: boolean;
}

export default function FormRenderer({
  title,
  description,
  fields,
  sections,
  consentClause,
  onSubmit,
  isSubmitting = false,
}: FormRendererProps) {
  // Form values state - keyed by field name
  const [values, setValues] = useState<Record<string, string>>({});
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Group fields by section
  const fieldsBySection = sections.reduce((acc, section) => {
    acc[section] = fields
      .filter((f) => f.section === section)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    return acc;
  }, {} as Record<string, FormField[]>);

  // Build a lookup map of field name -> field for linked field population
  const fieldByName = fields.reduce((acc, f) => {
    acc[f.fieldDefinition.name] = f;
    return acc;
  }, {} as Record<string, FormField>);

  // Update a single field value
  const updateValue = useCallback((fieldName: string, value: string) => {
    setValues((prev) => ({ ...prev, [fieldName]: value }));
    // Clear error when user starts typing
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[fieldName];
      return newErrors;
    });
  }, []);

  // Handle address selection - auto-populate linked fields
  const handleAddressSelect = useCallback(
    (field: FormField, addressComponents: AddressComponents) => {
      const config = field.fieldDefinition.config
        ? JSON.parse(field.fieldDefinition.config)
        : {};
      const linkedFields = config.linkedFields || {};

      setValues((prev) => {
        const newValues = { ...prev };

        // Update the address field itself with street address
        newValues[field.fieldDefinition.name] = addressComponents.streetAddress;

        // Auto-populate linked fields
        if (linkedFields.complexName && addressComponents.complexName) {
          newValues[linkedFields.complexName] = addressComponents.complexName;
        }
        if (linkedFields.unitNumber && addressComponents.unitNumber) {
          newValues[linkedFields.unitNumber] = addressComponents.unitNumber;
        }
        if (linkedFields.suburb && addressComponents.suburb) {
          newValues[linkedFields.suburb] = addressComponents.suburb;
        }
        if (linkedFields.city && addressComponents.city) {
          newValues[linkedFields.city] = addressComponents.city;
        }
        if (linkedFields.province && addressComponents.province) {
          newValues[linkedFields.province] = addressComponents.province;
        }
        if (linkedFields.postalCode && addressComponents.postalCode) {
          newValues[linkedFields.postalCode] = addressComponents.postalCode;
        }
        if (linkedFields.country && addressComponents.country) {
          newValues[linkedFields.country] = addressComponents.country;
        }
        if (linkedFields.lat && addressComponents.lat !== undefined) {
          newValues[linkedFields.lat] = String(addressComponents.lat);
        }
        if (linkedFields.lng && addressComponents.lng !== undefined) {
          newValues[linkedFields.lng] = String(addressComponents.lng);
        }

        return newValues;
      });
    },
    []
  );

  // Validate form before submission
  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // Check required fields
    fields.forEach((field) => {
      if (field.isRequired) {
        const value = values[field.fieldDefinition.name];
        if (!value || value.trim() === "") {
          const label = field.labelOverride || field.fieldDefinition.label;
          newErrors[field.fieldDefinition.name] = `${label} is required`;
        }
      }
    });

    // Check consent
    if (consentClause && !consentAgreed) {
      newErrors["_consent"] = "You must agree to the consent terms";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSubmit(values);
    }
  };

  // Render field input based on type
  const renderFieldInput = (field: FormField) => {
    const fieldName = field.fieldDefinition.name;
    const label = field.labelOverride || field.fieldDefinition.label;
    const config = field.fieldDefinition.config
      ? JSON.parse(field.fieldDefinition.config)
      : {};
    const value = values[fieldName] || "";
    const error = errors[fieldName];

    const baseInputClasses = `mt-1 block w-full rounded-lg border px-3 py-2 text-sm focus:outline-none focus:ring-1 ${
      error
        ? "border-red-300 focus:border-red-500 focus:ring-red-500"
        : "border-gray-300 focus:border-teal-500 focus:ring-teal-500"
    }`;

    switch (field.fieldDefinition.fieldType) {
      case "text":
      case "email":
        return (
          <input
            type={field.fieldDefinition.fieldType === "email" ? "email" : "text"}
            value={value}
            onChange={(e) => updateValue(fieldName, e.target.value)}
            placeholder={config.placeholder || `Enter ${label.toLowerCase()}...`}
            maxLength={config.maxLength}
            className={baseInputClasses}
          />
        );

      case "phone":
        return (
          <PhoneInput
            value={value}
            onChange={(newValue) => updateValue(fieldName, newValue)}
            defaultCountry={config.defaultCountry || "ZA"}
            placeholder={config.placeholder}
            hasError={!!error}
          />
        );

      case "number":
        return (
          <input
            type="number"
            value={value}
            onChange={(e) => updateValue(fieldName, e.target.value)}
            placeholder={config.placeholder || "0"}
            step={config.step}
            min={config.min}
            max={config.max}
            className={baseInputClasses}
          />
        );

      case "date":
        return (
          <input
            type="date"
            value={value}
            onChange={(e) => updateValue(fieldName, e.target.value)}
            className={baseInputClasses}
          />
        );

      case "textarea":
        return (
          <textarea
            value={value}
            onChange={(e) => updateValue(fieldName, e.target.value)}
            placeholder={config.placeholder || `Enter ${label.toLowerCase()}...`}
            rows={3}
            maxLength={config.maxLength}
            className={baseInputClasses}
          />
        );

      case "select":
        return (
          <select
            value={value}
            onChange={(e) => updateValue(fieldName, e.target.value)}
            className={baseInputClasses}
          >
            <option value="">Select {label.toLowerCase()}...</option>
            {config.options?.map(
              (opt: string | { value: string; label: string }, i: number) => {
                const optValue = typeof opt === "string" ? opt : opt.value;
                const optLabel = typeof opt === "string" ? opt : opt.label;
                return (
                  <option key={i} value={optValue}>
                    {optLabel}
                  </option>
                );
              }
            )}
          </select>
        );

      case "checkbox":
        return (
          <div className="mt-2 flex items-center gap-2">
            <input
              type="checkbox"
              checked={value === "true"}
              onChange={(e) => updateValue(fieldName, String(e.target.checked))}
              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-sm text-gray-700">
              {config.checkboxLabel || label}
            </span>
          </div>
        );

      case "radio":
        return (
          <div className="mt-2 space-y-2">
            {(config.options || []).map(
              (opt: string | { value: string; label: string }, i: number) => {
                const optValue = typeof opt === "string" ? opt : opt.value;
                const optLabel = typeof opt === "string" ? opt : opt.label;
                return (
                  <label key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name={fieldName}
                      value={optValue}
                      checked={value === optValue}
                      onChange={(e) => updateValue(fieldName, e.target.value)}
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
          <div className="mt-1">
            <input
              type="file"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  updateValue(fieldName, file.name);
                }
              }}
              className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-lg file:border-0 file:bg-teal-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-teal-700 hover:file:bg-teal-100"
            />
          </div>
        );

      case "address":
        // Google Places address autocomplete with linked field support
        return (
          <AddressAutocomplete
            value={value}
            onChange={(newValue) => updateValue(fieldName, newValue)}
            onSelect={(addressComponents) =>
              handleAddressSelect(field, addressComponents)
            }
            placeholder={config.placeholder || "Start typing an address..."}
            className="mt-1"
          />
        );

      case "country":
        return (
          <select
            value={value || config.defaultCountry || ""}
            onChange={(e) => updateValue(fieldName, e.target.value)}
            className={baseInputClasses}
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

      case "referral-doctor": {
        // Build the current value object from all referral doctor fields
        const referralDoctorValue: Partial<ReferralDoctorData> = {
          referralDoctorName: values["referralDoctorName"] || "",
          referralDoctorPractice: values["referralDoctorPractice"] || "",
          referralDoctorSpecialty: values["referralDoctorSpecialty"] || "",
          referralDoctorPhone: values["referralDoctorPhone"] || "",
          referralDoctorFax: values["referralDoctorFax"] || "",
          referralDoctorEmail: values["referralDoctorEmail"] || "",
          referralDoctorPracticeNumber: values["referralDoctorPracticeNumber"] || "",
          referralDoctorAddress: values["referralDoctorAddress"] || "",
          referralDoctorIsPrimary: values["referralDoctorIsPrimary"] === "true",
        };

        // Build field errors from validation errors
        const fieldErrors: Partial<Record<keyof ReferralDoctorData, boolean>> = {};
        Object.keys(referralDoctorValue).forEach((key) => {
          if (errors[key]) {
            fieldErrors[key as keyof ReferralDoctorData] = true;
          }
        });

        return (
          <ReferralDoctorInput
            value={referralDoctorValue}
            onChange={(subFieldName, subValue) => {
              // Convert boolean to string for consistency with form values
              const stringValue = typeof subValue === "boolean" ? String(subValue) : subValue;
              updateValue(subFieldName, stringValue);
            }}
            savedDoctors={[]} // TODO: Load from patient profile in preview mode
            fieldErrors={fieldErrors}
            size="default"
          />
        );
      }

      default:
        return (
          <input
            type="text"
            value={value}
            onChange={(e) => updateValue(fieldName, e.target.value)}
            placeholder={`Enter ${label.toLowerCase()}...`}
            className={baseInputClasses}
          />
        );
    }
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="mb-6 border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold text-gray-900">
          {title || "Patient Information Form"}
        </h1>
        {description && <p className="mt-1 text-gray-600">{description}</p>}
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit}>
        {fields.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-sm text-gray-400">No fields configured</p>
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
                  <div className="space-y-4">
                    {sectionFields.map((field) => (
                      <div key={field.id}>
                        <label className="block font-medium text-gray-700">
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
                        {errors[field.fieldDefinition.name] && (
                          <p className="mt-1 text-xs text-red-600">
                            {errors[field.fieldDefinition.name]}
                          </p>
                        )}
                      </div>
                    ))}
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
                <label className="mt-4 flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={consentAgreed}
                    onChange={(e) => setConsentAgreed(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-gray-700">
                    I have read and agree to the above terms and consent to the
                    collection of my personal information.
                  </span>
                </label>
                {errors["_consent"] && (
                  <p className="mt-1 text-xs text-red-600">
                    {errors["_consent"]}
                  </p>
                )}
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-teal-600 px-6 py-3 font-medium text-white hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
