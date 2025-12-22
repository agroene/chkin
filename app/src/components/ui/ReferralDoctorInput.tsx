"use client";

/**
 * ReferralDoctorInput Component
 *
 * A composite input for capturing referring doctor information.
 * Supports selecting from previously saved doctors or entering new doctor details.
 *
 * Features:
 * - Select from patient's saved doctors
 * - Add new doctor with full details
 * - Edit existing doctor information
 * - Mark doctor as primary/default
 * - All sub-fields stored as separate values in form data
 */

import { useState, useRef } from "react";
import { PhoneInput } from "./PhoneInput";

// Specialty options - matches seed-fields.ts
const SPECIALTY_OPTIONS = [
  { value: "gp", label: "General Practitioner" },
  { value: "internal", label: "Internal Medicine" },
  { value: "cardiology", label: "Cardiology" },
  { value: "dermatology", label: "Dermatology" },
  { value: "endocrinology", label: "Endocrinology" },
  { value: "gastroenterology", label: "Gastroenterology" },
  { value: "neurology", label: "Neurology" },
  { value: "obstetrics", label: "Obstetrics & Gynaecology" },
  { value: "oncology", label: "Oncology" },
  { value: "ophthalmology", label: "Ophthalmology" },
  { value: "orthopaedics", label: "Orthopaedics" },
  { value: "paediatrics", label: "Paediatrics" },
  { value: "psychiatry", label: "Psychiatry" },
  { value: "pulmonology", label: "Pulmonology" },
  { value: "radiology", label: "Radiology" },
  { value: "rheumatology", label: "Rheumatology" },
  { value: "surgery", label: "General Surgery" },
  { value: "urology", label: "Urology" },
  { value: "ent", label: "ENT (Ear, Nose, Throat)" },
  { value: "physiotherapy", label: "Physiotherapy" },
  { value: "chiropractic", label: "Chiropractic" },
  { value: "dental", label: "Dental" },
  { value: "other", label: "Other" },
];

export interface ReferralDoctorData {
  referralDoctorName: string;
  referralDoctorPractice: string;
  referralDoctorSpecialty: string;
  referralDoctorPhone: string;
  referralDoctorFax: string;
  referralDoctorEmail: string;
  referralDoctorPracticeNumber: string;
  referralDoctorAddress: string;
  referralDoctorIsPrimary: boolean;
}

// A saved doctor from patient profile
export interface SavedDoctor extends ReferralDoctorData {
  id: string;
}

export interface ReferralDoctorInputProps {
  /** Current values for all referral doctor fields */
  value: Partial<ReferralDoctorData>;
  /** Callback when any field value changes */
  onChange: (fieldName: string, value: string | boolean) => void;
  /** Previously saved doctors from patient profile */
  savedDoctors?: SavedDoctor[];
  /** Whether the form is disabled */
  disabled?: boolean;
  /** Which fields to show (optional - shows all by default) */
  visibleFields?: (keyof ReferralDoctorData)[];
  /** Whether each field has an error */
  fieldErrors?: Partial<Record<keyof ReferralDoctorData, boolean>>;
  /** Size variant */
  size?: "default" | "large";
}

export function ReferralDoctorInput({
  value,
  onChange,
  savedDoctors = [],
  disabled = false,
  visibleFields,
  fieldErrors = {},
  size = "large",
}: ReferralDoctorInputProps) {
  // Determine initial showAddNew state: show add form if no saved doctors,
  // or if there's already a doctor name filled in without any saved doctors to select from
  const hasPrefilledDoctor = Boolean(value.referralDoctorName);
  const noSavedDoctors = savedDoctors.length === 0;
  const [showAddNew, setShowAddNew] = useState(noSavedDoctors || hasPrefilledDoctor);
  const [selectedDoctorId, setSelectedDoctorId] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Determine which fields to show
  const fieldsToShow = visibleFields || [
    "referralDoctorName",
    "referralDoctorPractice",
    "referralDoctorSpecialty",
    "referralDoctorPhone",
    "referralDoctorFax",
    "referralDoctorEmail",
    "referralDoctorPracticeNumber",
    "referralDoctorAddress",
    "referralDoctorIsPrimary",
  ];

  // Handle selecting a saved doctor
  const handleSelectDoctor = (doctorId: string) => {
    const doctor = savedDoctors.find((d) => d.id === doctorId);
    if (doctor) {
      setSelectedDoctorId(doctorId);
      setShowAddNew(false);
      setIsEditing(false);
      // Populate all fields from the saved doctor
      Object.entries(doctor).forEach(([key, val]) => {
        if (key !== "id") {
          onChange(key, val);
        }
      });
    }
  };

  // Handle "Add New Doctor" click
  const handleAddNew = () => {
    setSelectedDoctorId(null);
    setShowAddNew(true);
    setIsEditing(false);
    // Clear all fields
    fieldsToShow.forEach((field) => {
      if (field === "referralDoctorIsPrimary") {
        onChange(field, false);
      } else {
        onChange(field, "");
      }
    });
  };

  // Handle "Edit" click for currently selected doctor
  const handleEdit = () => {
    setIsEditing(true);
  };

  const baseInputClasses = `w-full rounded-lg border px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-teal-500`;
  const getInputClasses = (fieldName: keyof ReferralDoctorData) => {
    const hasError = fieldErrors[fieldName];
    return `${baseInputClasses} ${
      hasError ? "border-red-300 bg-red-50" : "border-gray-300 bg-white"
    }`;
  };

  // Render saved doctors selector
  const renderDoctorSelector = () => {
    if (savedDoctors.length === 0) return null;

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select a Doctor
        </label>
        <div className="space-y-2">
          {savedDoctors.map((doctor) => (
            <button
              key={doctor.id}
              type="button"
              onClick={() => handleSelectDoctor(doctor.id)}
              disabled={disabled}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                selectedDoctorId === doctor.id
                  ? "border-teal-500 bg-teal-50"
                  : "border-gray-200 hover:border-teal-300 hover:bg-gray-50"
              } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">
                    {doctor.referralDoctorName}
                    {doctor.referralDoctorIsPrimary && (
                      <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500">
                    {doctor.referralDoctorPractice && (
                      <span>{doctor.referralDoctorPractice}</span>
                    )}
                    {doctor.referralDoctorSpecialty && (
                      <span>
                        {doctor.referralDoctorPractice && " • "}
                        {SPECIALTY_OPTIONS.find((s) => s.value === doctor.referralDoctorSpecialty)?.label ||
                          doctor.referralDoctorSpecialty}
                      </span>
                    )}
                  </div>
                </div>
                {selectedDoctorId === doctor.id && (
                  <svg
                    className="w-5 h-5 text-teal-500"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                )}
              </div>
            </button>
          ))}

          {/* Add New Doctor button */}
          <button
            type="button"
            onClick={handleAddNew}
            disabled={disabled}
            className={`w-full text-left p-3 rounded-lg border border-dashed transition-colors ${
              showAddNew
                ? "border-teal-500 bg-teal-50"
                : "border-gray-300 hover:border-teal-300 hover:bg-gray-50"
            } ${disabled ? "opacity-60 cursor-not-allowed" : ""}`}
          >
            <div className="flex items-center gap-2 text-teal-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
              <span className="font-medium">Add New Doctor</span>
            </div>
          </button>
        </div>
      </div>
    );
  };

  // Render the doctor details form
  const renderDoctorForm = () => {
    // Only show form if adding new or editing
    if (!showAddNew && !isEditing && selectedDoctorId) {
      // Show read-only view with edit button
      return (
        <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">Selected Doctor</h4>
            <button
              type="button"
              onClick={handleEdit}
              disabled={disabled}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium"
            >
              Edit
            </button>
          </div>
          <div className="space-y-2 text-sm">
            {value.referralDoctorName && (
              <p>
                <span className="text-gray-500">Name:</span>{" "}
                <span className="text-gray-900">{value.referralDoctorName}</span>
              </p>
            )}
            {value.referralDoctorPractice && (
              <p>
                <span className="text-gray-500">Practice:</span>{" "}
                <span className="text-gray-900">{value.referralDoctorPractice}</span>
              </p>
            )}
            {value.referralDoctorSpecialty && (
              <p>
                <span className="text-gray-500">Specialty:</span>{" "}
                <span className="text-gray-900">
                  {SPECIALTY_OPTIONS.find((s) => s.value === value.referralDoctorSpecialty)?.label ||
                    value.referralDoctorSpecialty}
                </span>
              </p>
            )}
            {value.referralDoctorPhone && (
              <p>
                <span className="text-gray-500">Phone:</span>{" "}
                <span className="text-gray-900">{value.referralDoctorPhone}</span>
              </p>
            )}
            {value.referralDoctorEmail && (
              <p>
                <span className="text-gray-500">Email:</span>{" "}
                <span className="text-gray-900">{value.referralDoctorEmail}</span>
              </p>
            )}
          </div>
        </div>
      );
    }

    // Show editable form
    return (
      <div className="space-y-4">
        {showAddNew && savedDoctors.length > 0 && (
          <div className="border-b border-gray-200 pb-4 mb-4">
            <h4 className="font-medium text-gray-900">New Doctor Details</h4>
            <p className="text-sm text-gray-500">Enter the referring doctor&apos;s information</p>
          </div>
        )}

        {/* Doctor Name */}
        {fieldsToShow.includes("referralDoctorName") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Doctor Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              placeholder="e.g., Dr. John Smith"
              className={getInputClasses("referralDoctorName")}
              value={value.referralDoctorName || ""}
              onChange={(e) => onChange("referralDoctorName", e.target.value)}
              disabled={disabled}
            />
          </div>
        )}

        {/* Practice Name */}
        {fieldsToShow.includes("referralDoctorPractice") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Practice Name
            </label>
            <input
              type="text"
              placeholder="e.g., Smith Family Practice"
              className={getInputClasses("referralDoctorPractice")}
              value={value.referralDoctorPractice || ""}
              onChange={(e) => onChange("referralDoctorPractice", e.target.value)}
              disabled={disabled}
            />
          </div>
        )}

        {/* Specialty */}
        {fieldsToShow.includes("referralDoctorSpecialty") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Specialty
            </label>
            <select
              className={getInputClasses("referralDoctorSpecialty")}
              value={value.referralDoctorSpecialty || ""}
              onChange={(e) => onChange("referralDoctorSpecialty", e.target.value)}
              disabled={disabled}
            >
              <option value="">Select specialty...</option>
              {SPECIALTY_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Phone and Fax in a row on desktop */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Phone */}
          {fieldsToShow.includes("referralDoctorPhone") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Phone
              </label>
              <PhoneInput
                value={value.referralDoctorPhone || ""}
                onChange={(val) => onChange("referralDoctorPhone", val)}
                defaultCountry="ZA"
                hasError={fieldErrors.referralDoctorPhone}
                disabled={disabled}
                size={size}
              />
            </div>
          )}

          {/* Fax */}
          {fieldsToShow.includes("referralDoctorFax") && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fax
              </label>
              <PhoneInput
                value={value.referralDoctorFax || ""}
                onChange={(val) => onChange("referralDoctorFax", val)}
                defaultCountry="ZA"
                placeholder="Fax number"
                hasError={fieldErrors.referralDoctorFax}
                disabled={disabled}
                size={size}
              />
            </div>
          )}
        </div>

        {/* Email */}
        {fieldsToShow.includes("referralDoctorEmail") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="doctor@practice.co.za"
              className={getInputClasses("referralDoctorEmail")}
              value={value.referralDoctorEmail || ""}
              onChange={(e) => onChange("referralDoctorEmail", e.target.value)}
              disabled={disabled}
            />
          </div>
        )}

        {/* Practice Number */}
        {fieldsToShow.includes("referralDoctorPracticeNumber") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Practice Number (BHF/HPCSA)
            </label>
            <input
              type="text"
              placeholder="e.g., 1234567"
              className={getInputClasses("referralDoctorPracticeNumber")}
              value={value.referralDoctorPracticeNumber || ""}
              onChange={(e) => onChange("referralDoctorPracticeNumber", e.target.value)}
              disabled={disabled}
            />
          </div>
        )}

        {/* Address */}
        {fieldsToShow.includes("referralDoctorAddress") && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Practice Address
            </label>
            <textarea
              placeholder="Full practice address..."
              rows={2}
              className={getInputClasses("referralDoctorAddress")}
              value={value.referralDoctorAddress || ""}
              onChange={(e) => onChange("referralDoctorAddress", e.target.value)}
              disabled={disabled}
            />
          </div>
        )}

        {/* Primary Doctor Checkbox */}
        {fieldsToShow.includes("referralDoctorIsPrimary") && (
          <div className="flex items-center gap-3 pt-2">
            <input
              type="checkbox"
              id="referralDoctorIsPrimary"
              className="h-5 w-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              checked={value.referralDoctorIsPrimary || false}
              onChange={(e) => onChange("referralDoctorIsPrimary", e.target.checked)}
              disabled={disabled}
            />
            <label htmlFor="referralDoctorIsPrimary" className="text-gray-700">
              Save as my primary referring doctor
            </label>
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={containerRef} className="space-y-4">
      {renderDoctorSelector()}
      {(showAddNew || isEditing || selectedDoctorId) && renderDoctorForm()}
    </div>
  );
}
