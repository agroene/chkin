/**
 * UI Components Barrel File
 *
 * Re-exports all UI components for clean imports.
 *
 * @example
 * import { Button, Card, Input, Modal } from "@/components/ui";
 */

export { default as AddressAutocomplete, type AddressComponents } from "./AddressAutocomplete";
export { default as Button } from "./Button";
export { default as Card } from "./Card";
export { default as DataTable, type Column } from "./DataTable";
export { default as EmptyState } from "./EmptyState";
export { default as Input } from "./Input";
export { default as Modal } from "./Modal";
export { PhoneInput, type PhoneInputProps } from "./PhoneInput";
export {
  ReferralDoctorInput,
  type ReferralDoctorInputProps,
  type ReferralDoctorData,
  type SavedDoctor,
} from "./ReferralDoctorInput";
export { default as StatusBadge } from "./StatusBadge";

// Keep legacy Table export for backwards compatibility
export { default as Table } from "./Table";
