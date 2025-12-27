/**
 * SavedDoctorsList Component
 *
 * Displays a list of saved referral doctors in the patient vault.
 * Supports view mode (read-only list) and edit mode (add/edit/delete).
 */

"use client";

import { useState, useEffect } from "react";
import { ReferralDoctorInput, type SavedDoctor, type ReferralDoctorData } from "@/components/ui/ReferralDoctorInput";

// Specialty options - matches ReferralDoctorInput
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

function getSpecialtyLabel(value: string): string {
  return SPECIALTY_OPTIONS.find((s) => s.value === value)?.label || value;
}

interface SavedDoctorsListProps {
  /** Array of saved doctors */
  doctors: SavedDoctor[];
  /** Whether in edit mode */
  isEditing: boolean;
  /** Callback when doctors list changes */
  onChange: (doctors: SavedDoctor[]) => void;
  /** Callback to notify parent of unsaved changes state */
  onUnsavedChanges?: (hasUnsaved: boolean) => void;
}

export default function SavedDoctorsList({
  doctors,
  isEditing,
  onChange,
  onUnsavedChanges,
}: SavedDoctorsListProps) {
  // Track which doctor is being edited (by id), or "new" for adding
  const [editingDoctorId, setEditingDoctorId] = useState<string | null>(null);
  // Temporary state for the doctor being edited
  const [editFormData, setEditFormData] = useState<Partial<ReferralDoctorData>>({});

  // Notify parent when editing state changes
  useEffect(() => {
    onUnsavedChanges?.(editingDoctorId !== null);
  }, [editingDoctorId, onUnsavedChanges]);

  // Handle starting to edit a doctor
  const handleStartEdit = (doctor: SavedDoctor) => {
    setEditingDoctorId(doctor.id);
    setEditFormData({ ...doctor });
  };

  // Handle starting to add a new doctor
  const handleStartAdd = () => {
    setEditingDoctorId("new");
    setEditFormData({
      referralDoctorName: "",
      referralDoctorPractice: "",
      referralDoctorSpecialty: "",
      referralDoctorPhone: "",
      referralDoctorFax: "",
      referralDoctorEmail: "",
      referralDoctorPracticeNumber: "",
      referralDoctorAddress: "",
      referralDoctorIsPrimary: false,
    });
  };

  // Handle canceling edit/add
  const handleCancelEdit = () => {
    setEditingDoctorId(null);
    setEditFormData({});
  };

  // Handle saving the edited/new doctor
  const handleSaveDoctor = () => {
    if (!editFormData.referralDoctorName?.trim()) {
      return; // Name is required
    }

    const newDoctor: SavedDoctor = {
      id: editingDoctorId === "new" ? `doc-${Date.now()}` : editingDoctorId!,
      referralDoctorName: editFormData.referralDoctorName || "",
      referralDoctorPractice: editFormData.referralDoctorPractice || "",
      referralDoctorSpecialty: editFormData.referralDoctorSpecialty || "",
      referralDoctorPhone: editFormData.referralDoctorPhone || "",
      referralDoctorFax: editFormData.referralDoctorFax || "",
      referralDoctorEmail: editFormData.referralDoctorEmail || "",
      referralDoctorPracticeNumber: editFormData.referralDoctorPracticeNumber || "",
      referralDoctorAddress: editFormData.referralDoctorAddress || "",
      referralDoctorIsPrimary: editFormData.referralDoctorIsPrimary || false,
    };

    let updatedDoctors: SavedDoctor[];

    if (editingDoctorId === "new") {
      // Adding new doctor
      updatedDoctors = [...doctors, newDoctor];
    } else {
      // Updating existing doctor
      updatedDoctors = doctors.map((d) =>
        d.id === editingDoctorId ? newDoctor : d
      );
    }

    // If this doctor is marked as primary, unmark others
    if (newDoctor.referralDoctorIsPrimary) {
      updatedDoctors = updatedDoctors.map((d) => ({
        ...d,
        referralDoctorIsPrimary: d.id === newDoctor.id,
      }));
    }

    onChange(updatedDoctors);
    setEditingDoctorId(null);
    setEditFormData({});
  };

  // Handle deleting a doctor
  const handleDeleteDoctor = (doctorId: string) => {
    onChange(doctors.filter((d) => d.id !== doctorId));
  };

  // Handle form field changes
  const handleFieldChange = (fieldName: string, value: string | boolean) => {
    setEditFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  // View mode - simple list display
  if (!isEditing) {
    if (doctors.length === 0) {
      return (
        <p className="text-gray-400 italic">No saved doctors</p>
      );
    }

    return (
      <div className="space-y-3">
        {doctors.map((doctor) => (
          <div
            key={doctor.id}
            className="border-b border-gray-100 pb-3 last:border-0 last:pb-0"
          >
            <div className="flex items-start justify-between">
              <div>
                <div className="font-medium text-gray-900">
                  {doctor.referralDoctorName}
                </div>
                <div className="text-sm text-gray-500">
                  {doctor.referralDoctorPractice && (
                    <span>{doctor.referralDoctorPractice}</span>
                  )}
                  {doctor.referralDoctorSpecialty && (
                    <span>
                      {doctor.referralDoctorPractice && " · "}
                      {getSpecialtyLabel(doctor.referralDoctorSpecialty)}
                    </span>
                  )}
                </div>
                {doctor.referralDoctorPhone && (
                  <div className="text-sm text-gray-500">
                    {doctor.referralDoctorPhone}
                  </div>
                )}
              </div>
              {doctor.referralDoctorIsPrimary && (
                <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                  <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Primary
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  // Edit mode - list with edit/delete buttons, or inline form
  return (
    <div className="space-y-3">
      {doctors.map((doctor) => (
        <div key={doctor.id}>
          {editingDoctorId === doctor.id ? (
            // Inline edit form
            <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h4 className="font-medium text-gray-900">Edit Doctor</h4>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveDoctor}
                    className="rounded bg-teal-600 px-3 py-1 text-sm font-medium text-white hover:bg-teal-700"
                  >
                    Save
                  </button>
                </div>
              </div>
              <ReferralDoctorInput
                value={editFormData}
                onChange={handleFieldChange}
                savedDoctors={[]}
                size="default"
              />
            </div>
          ) : (
            // Display row with edit/delete
            <div className="flex items-start justify-between rounded-lg border border-gray-200 bg-white p-3">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">
                    {doctor.referralDoctorName}
                  </span>
                  {doctor.referralDoctorIsPrimary && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-700">
                      <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
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
                      {doctor.referralDoctorPractice && " · "}
                      {getSpecialtyLabel(doctor.referralDoctorSpecialty)}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleStartEdit(doctor)}
                  className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  title="Edit doctor"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteDoctor(doctor.id)}
                  className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  title="Delete doctor"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {/* Add new doctor section */}
      {editingDoctorId === "new" ? (
        <div className="rounded-lg border border-teal-200 bg-teal-50/50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h4 className="font-medium text-gray-900">Add New Doctor</h4>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveDoctor}
                disabled={!editFormData.referralDoctorName?.trim()}
                className="rounded bg-teal-600 px-3 py-1 text-sm font-medium text-white hover:bg-teal-700 disabled:opacity-50"
              >
                Save
              </button>
            </div>
          </div>
          <ReferralDoctorInput
            value={editFormData}
            onChange={handleFieldChange}
            savedDoctors={[]}
            size="default"
          />
        </div>
      ) : (
        <button
          type="button"
          onClick={handleStartAdd}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 p-3 text-teal-600 hover:border-teal-300 hover:bg-teal-50/50"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          <span className="font-medium">Add Doctor</span>
        </button>
      )}
    </div>
  );
}
