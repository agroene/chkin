/**
 * Referral Doctors Helper Functions
 *
 * Manages saved referral doctors in the patient profile.
 * Doctors are stored as a JSON array in the special field `_savedReferralDoctors`.
 *
 * Each doctor object contains:
 * - id: Unique identifier (auto-generated)
 * - referralDoctorName, referralDoctorPractice, etc. (all composite fields)
 * - referralDoctorIsPrimary: Whether this is the default doctor for autopopulation
 */

import { nanoid } from "nanoid";

// The field name used to store saved doctors in patient profile
export const SAVED_DOCTORS_FIELD = "_savedReferralDoctors";

// Fields that make up a referral doctor
export const REFERRAL_DOCTOR_FIELDS = [
  "referralDoctorName",
  "referralDoctorPractice",
  "referralDoctorSpecialty",
  "referralDoctorPhone",
  "referralDoctorFax",
  "referralDoctorEmail",
  "referralDoctorPracticeNumber",
  "referralDoctorAddress",
  "referralDoctorIsPrimary",
] as const;

export interface SavedReferralDoctor {
  id: string;
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

/**
 * Get saved referral doctors from profile data
 */
export function getSavedDoctors(profileData: Record<string, unknown>): SavedReferralDoctor[] {
  const saved = profileData[SAVED_DOCTORS_FIELD];
  if (!saved || !Array.isArray(saved)) {
    return [];
  }
  return saved as SavedReferralDoctor[];
}

/**
 * Extract a referral doctor object from form submission data
 */
export function extractDoctorFromSubmission(
  submissionData: Record<string, unknown>
): Partial<SavedReferralDoctor> | null {
  const doctorName = submissionData.referralDoctorName;

  // Only extract if there's a doctor name
  if (!doctorName || (typeof doctorName === "string" && !doctorName.trim())) {
    return null;
  }

  const doctor: Partial<SavedReferralDoctor> = {};

  for (const field of REFERRAL_DOCTOR_FIELDS) {
    const value = submissionData[field];
    if (value !== undefined && value !== null && value !== "") {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (doctor as any)[field] = value;
    }
  }

  return Object.keys(doctor).length > 0 ? doctor : null;
}

/**
 * Check if two doctor objects are the same (by name and practice number)
 */
export function isSameDoctor(
  a: Partial<SavedReferralDoctor>,
  b: Partial<SavedReferralDoctor>
): boolean {
  // Match by practice number if both have it
  if (a.referralDoctorPracticeNumber && b.referralDoctorPracticeNumber) {
    return a.referralDoctorPracticeNumber === b.referralDoctorPracticeNumber;
  }

  // Otherwise match by name (case-insensitive)
  const nameA = (a.referralDoctorName || "").toLowerCase().trim();
  const nameB = (b.referralDoctorName || "").toLowerCase().trim();

  return nameA === nameB && nameA.length > 0;
}

/**
 * Add or update a doctor in the saved doctors list
 * Returns the updated list
 */
export function upsertDoctor(
  existingDoctors: SavedReferralDoctor[],
  newDoctor: Partial<SavedReferralDoctor>
): SavedReferralDoctor[] {
  // Find existing doctor
  const existingIndex = existingDoctors.findIndex((d) => isSameDoctor(d, newDoctor));

  // Prepare the full doctor object
  const fullDoctor: SavedReferralDoctor = {
    id: existingIndex >= 0 ? existingDoctors[existingIndex].id : nanoid(12),
    referralDoctorName: newDoctor.referralDoctorName || "",
    referralDoctorPractice: newDoctor.referralDoctorPractice || "",
    referralDoctorSpecialty: newDoctor.referralDoctorSpecialty || "",
    referralDoctorPhone: newDoctor.referralDoctorPhone || "",
    referralDoctorFax: newDoctor.referralDoctorFax || "",
    referralDoctorEmail: newDoctor.referralDoctorEmail || "",
    referralDoctorPracticeNumber: newDoctor.referralDoctorPracticeNumber || "",
    referralDoctorAddress: newDoctor.referralDoctorAddress || "",
    referralDoctorIsPrimary: newDoctor.referralDoctorIsPrimary || false,
  };

  const result = [...existingDoctors];

  if (existingIndex >= 0) {
    // Update existing - merge data, preferring newer non-empty values
    const existing = existingDoctors[existingIndex];
    result[existingIndex] = {
      ...existing,
      ...Object.fromEntries(
        Object.entries(fullDoctor).filter(
          ([key, value]) =>
            key === "id" || key === "referralDoctorIsPrimary" || (value !== "" && value !== null)
        )
      ),
    } as SavedReferralDoctor;
  } else {
    // Add new doctor
    result.push(fullDoctor);
  }

  // If this doctor is marked as primary, unmark others
  if (fullDoctor.referralDoctorIsPrimary) {
    return result.map((d) => ({
      ...d,
      referralDoctorIsPrimary: d.id === fullDoctor.id,
    }));
  }

  return result;
}

/**
 * Get the primary doctor from a list of saved doctors
 */
export function getPrimaryDoctor(
  doctors: SavedReferralDoctor[]
): SavedReferralDoctor | null {
  return doctors.find((d) => d.referralDoctorIsPrimary) || null;
}

/**
 * Create autopopulate data from saved doctors
 * Returns the individual composite field values from the primary doctor
 */
export function getAutopopulateData(
  doctors: SavedReferralDoctor[]
): Record<string, unknown> {
  const primary = getPrimaryDoctor(doctors);
  if (!primary) {
    return {};
  }

  const result: Record<string, unknown> = {};
  for (const field of REFERRAL_DOCTOR_FIELDS) {
    const value = primary[field];
    if (value !== undefined && value !== null && value !== "") {
      result[field] = value;
    }
  }

  return result;
}

/**
 * Remove a doctor from the saved list by ID
 */
export function removeDoctor(
  doctors: SavedReferralDoctor[],
  doctorId: string
): SavedReferralDoctor[] {
  return doctors.filter((d) => d.id !== doctorId);
}

/**
 * Get all saved doctors including any from individual profile fields.
 * This creates a unified list that includes:
 * 1. All doctors from _savedReferralDoctors array
 * 2. Doctor from individual profile fields (if not already in the array)
 *
 * The doctor from individual fields is added to ensure backward compatibility
 * with profiles that have individual fields but haven't been migrated.
 */
export function getAllSavedDoctors(
  profileData: Record<string, unknown>
): SavedReferralDoctor[] {
  // Start with doctors from the array
  const savedDoctors = getSavedDoctors(profileData);

  // Extract doctor from individual profile fields
  const individualDoctor = extractDoctorFromSubmission(profileData);

  // If there's a doctor in individual fields and it's not already in savedDoctors, add it
  if (individualDoctor && individualDoctor.referralDoctorName) {
    const alreadyExists = savedDoctors.some((d) => isSameDoctor(d, individualDoctor));

    if (!alreadyExists) {
      // Create a full doctor object with generated ID
      const doctor: SavedReferralDoctor = {
        id: `profile-${nanoid(8)}`,
        referralDoctorName: individualDoctor.referralDoctorName || "",
        referralDoctorPractice: individualDoctor.referralDoctorPractice || "",
        referralDoctorSpecialty: individualDoctor.referralDoctorSpecialty || "",
        referralDoctorPhone: individualDoctor.referralDoctorPhone || "",
        referralDoctorFax: individualDoctor.referralDoctorFax || "",
        referralDoctorEmail: individualDoctor.referralDoctorEmail || "",
        referralDoctorPracticeNumber: individualDoctor.referralDoctorPracticeNumber || "",
        referralDoctorAddress: individualDoctor.referralDoctorAddress || "",
        referralDoctorIsPrimary: individualDoctor.referralDoctorIsPrimary || false,
      };

      // Add to beginning if marked as primary, otherwise to end
      if (doctor.referralDoctorIsPrimary) {
        return [doctor, ...savedDoctors.map(d => ({ ...d, referralDoctorIsPrimary: false }))];
      } else {
        return [...savedDoctors, doctor];
      }
    }
  }

  return savedDoctors;
}
