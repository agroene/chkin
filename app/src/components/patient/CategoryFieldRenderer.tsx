/**
 * Category Field Renderer Component
 *
 * Renders appropriate input/display for each field type.
 * Supports view mode (read-only) and edit mode.
 */

"use client";

import { PhoneInput, AddressAutocomplete, type AddressComponents } from "@/components/ui";

interface Field {
  id: string;
  name: string;
  label: string;
  description?: string;
  fieldType: string;
  config?: Record<string, unknown> | null;
  validation?: Record<string, unknown> | null;
  specialPersonalInfo?: boolean;
}

interface CategoryFieldRendererProps {
  field: Field;
  value: unknown;
  isEditing: boolean;
  onChange: (value: unknown) => void;
  isNa?: boolean; // Field is marked as N/A (Not Applicable)
  onNaToggle?: (isNa: boolean) => void; // Callback when N/A is toggled
}

export default function CategoryFieldRenderer({
  field,
  value,
  isEditing,
  onChange,
  isNa = false,
  onNaToggle,
}: CategoryFieldRendererProps) {
  const stringValue = typeof value === "string" ? value : "";
  const boolValue = typeof value === "boolean" ? value : false;

  // View mode - display value
  if (!isEditing) {
    return (
      <div className="border-b border-gray-100 pb-4 last:border-0">
        <label className="text-xs font-medium uppercase tracking-wide text-gray-500">
          {field.label}
        </label>
        <div className="mt-1">
          {isNa ? (
            <p className="text-gray-400 italic">N/A</p>
          ) : (
            renderViewValue()
          )}
        </div>
      </div>
    );
  }

  // Edit mode - render appropriate input with N/A option
  return (
    <div className="border-b border-gray-100 pb-4 last:border-0">
      <div className="flex items-center justify-between">
        <label
          htmlFor={field.id}
          className="text-xs font-medium uppercase tracking-wide text-gray-500"
        >
          {field.label}
          {field.specialPersonalInfo && (
            <span className="ml-1 text-amber-500" title="Sensitive information">
              *
            </span>
          )}
        </label>
        {/* N/A toggle - available for all optional fields */}
        {onNaToggle && (
          <label className="flex items-center gap-1.5 cursor-pointer">
            <input
              type="checkbox"
              checked={isNa}
              onChange={(e) => onNaToggle(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-gray-300 text-gray-500 focus:ring-gray-400"
            />
            <span className="text-xs text-gray-400">N/A</span>
          </label>
        )}
      </div>
      <div className="mt-1">
        {isNa ? (
          <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-400 italic">
            Marked as not applicable
          </div>
        ) : (
          renderEditInput()
        )}
      </div>
      {field.description && !isNa && (
        <p className="mt-1 text-xs text-gray-400">{field.description}</p>
      )}
    </div>
  );

  // Render view value based on field type
  function renderViewValue() {
    if (value === null || value === undefined || value === "") {
      return <p className="text-gray-400 italic">Not set</p>;
    }

    switch (field.fieldType) {
      case "checkbox":
        return (
          <p className="text-gray-900">
            {boolValue ? "Yes" : "No"}
          </p>
        );

      case "select":
      case "radio": {
        // Try to find label from options
        const options = (field.config?.options as Array<{ value: string; label: string }>) || [];
        const option = options.find((o) => o.value === stringValue);
        return <p className="text-gray-900">{option?.label || stringValue}</p>;
      }

      case "multiselect": {
        const selectedValues = Array.isArray(value) ? value : [];
        const options = (field.config?.options as Array<{ value: string; label: string }>) || [];
        const labels = selectedValues
          .map((v) => options.find((o) => o.value === v)?.label || v)
          .join(", ");
        return <p className="text-gray-900">{labels || "None selected"}</p>;
      }

      case "date":
        return (
          <p className="text-gray-900">
            {stringValue ? new Date(stringValue).toLocaleDateString() : "Not set"}
          </p>
        );

      case "phone":
        return <p className="text-gray-900">{stringValue}</p>;

      case "textarea":
        return (
          <p className="whitespace-pre-wrap text-gray-900">{stringValue}</p>
        );

      default:
        return <p className="text-gray-900">{String(value)}</p>;
    }
  }

  // Render edit input based on field type
  function renderEditInput() {
    const baseInputClass =
      "w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900 placeholder-gray-400 focus:border-teal-500 focus:outline-none focus:ring-1 focus:ring-teal-500";

    switch (field.fieldType) {
      case "text":
        return (
          <input
            type="text"
            id={field.id}
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
            placeholder={field.config?.placeholder as string}
            maxLength={field.config?.maxLength as number}
          />
        );

      case "email":
        return (
          <input
            type="email"
            id={field.id}
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
            placeholder="email@example.com"
          />
        );

      case "phone":
        return (
          <PhoneInput
            value={stringValue}
            onChange={(val) => onChange(val)}
            placeholder="Enter phone number"
          />
        );

      case "date":
        return (
          <input
            type="date"
            id={field.id}
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
          />
        );

      case "number":
        return (
          <input
            type="number"
            id={field.id}
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
            min={field.config?.min as number}
            max={field.config?.max as number}
            step={field.config?.step as number}
          />
        );

      case "textarea":
        return (
          <textarea
            id={field.id}
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            className={`${baseInputClass} min-h-[100px]`}
            placeholder={field.config?.placeholder as string}
            maxLength={field.config?.maxLength as number}
          />
        );

      case "select":
        return (
          <select
            id={field.id}
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
          >
            <option value="">Select...</option>
            {((field.config?.options as Array<{ value: string; label: string }>) || []).map(
              (option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              )
            )}
          </select>
        );

      case "radio": {
        const options = (field.config?.options as Array<{ value: string; label: string }>) || [];
        return (
          <div className="space-y-2">
            {options.map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="radio"
                  name={field.id}
                  value={option.value}
                  checked={stringValue === option.value}
                  onChange={(e) => onChange(e.target.value)}
                  className="h-4 w-4 border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        );
      }

      case "multiselect": {
        const selectedValues = Array.isArray(value) ? value : [];
        const options = (field.config?.options as Array<{ value: string; label: string }>) || [];
        return (
          <div className="space-y-2">
            {options.map((option) => (
              <label key={option.value} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={selectedValues.includes(option.value)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      onChange([...selectedValues, option.value]);
                    } else {
                      onChange(selectedValues.filter((v) => v !== option.value));
                    }
                  }}
                  className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-gray-900">{option.label}</span>
              </label>
            ))}
          </div>
        );
      }

      case "checkbox":
        return (
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              id={field.id}
              checked={boolValue}
              onChange={(e) => onChange(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            <span className="text-gray-900">Yes</span>
          </label>
        );

      case "address":
        return (
          <AddressAutocomplete
            value={stringValue}
            onChange={(val) => onChange(val)}
            onSelect={(components: AddressComponents) => {
              // For address fields, we store the full formatted address
              // The linked fields handling would be done at a higher level
              onChange(components.streetAddress || stringValue);
            }}
            placeholder="Start typing an address..."
          />
        );

      case "country":
        return (
          <select
            id={field.id}
            value={stringValue || "ZA"}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
          >
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
        // Fallback to text input
        return (
          <input
            type="text"
            id={field.id}
            value={stringValue}
            onChange={(e) => onChange(e.target.value)}
            className={baseInputClass}
          />
        );
    }
  }
}
