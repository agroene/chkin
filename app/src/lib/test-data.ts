/**
 * Test Data Generator
 *
 * Generates realistic test data for form fields.
 * Used only in development for testing form submissions.
 */

// Test data values mapped by field name patterns
// Note: Select field values must match the exact option values (usually lowercase)
const TEST_DATA: Record<string, string | boolean> = {
  // Patient Details
  title: "mr",  // lowercase to match select option value
  firstName: "John",
  lastName: "Smith",
  dateOfBirth: "1985-06-15",
  gender: "male",
  maritalStatus: "married",
  homeLanguage: "english",
  idNumber: "8506155123456",
  passportNumber: "A12345678",
  nationality: "ZA",
  occupation: "Software Developer",

  // Contact Information
  phoneHome: "+27217891234",
  phoneWork: "+27214567890",
  phoneMobile: "+27821234567",
  emailPersonal: "john.smith@example.com",
  emailWork: "j.smith@company.co.za",

  // Patient Address
  streetAddress: "123 Main Road",
  complexName: "The Gardens",
  unitNumber: "Unit 4B",
  suburb: "Claremont",
  city: "Cape Town",
  stateProvince: "Western Cape",
  postalCode: "7708",
  country: "ZA",

  // Responsible Party
  responsiblePartyRelationship: "self",  // lowercase to match select option value
  responsiblePartyName: "John Smith",
  responsiblePartyIdNumber: "8506155123456",
  responsiblePartyPhone: "+27821234567",
  responsiblePartyEmail: "john.smith@example.com",
  responsiblePartyStreetAddress: "123 Main Road",
  responsiblePartyComplexName: "The Gardens",
  responsiblePartyUnitNumber: "Unit 4B",
  responsiblePartyAddressSuburb: "Claremont",
  responsiblePartyAddressCity: "Cape Town",
  responsiblePartyAddressProvince: "Western Cape",
  responsiblePartyAddressPostalCode: "7708",
  responsiblePartyAddressCountry: "ZA",

  // Responsible Party Postal Address
  responsiblePartyPostalAddress: "PO Box 1234",
  responsiblePartyPostalAddressComplexName: "",
  responsiblePartyPostalAddressUnitNumber: "",
  responsiblePartyPostalAddressSuburb: "Claremont",
  responsiblePartyPostalAddressCity: "Cape Town",
  responsiblePartyPostalAddressProvince: "Western Cape",
  responsiblePartyPostalAddressPostalCode: "7708",
  responsiblePartyPostalAddressCountry: "ZA",

  // Responsible Party Work Address
  responsiblePartyWorkAddress: "456 Business Park Drive",
  responsiblePartyWorkAddressComplexName: "Tech Hub",
  responsiblePartyWorkAddressUnitNumber: "Suite 201",
  responsiblePartyWorkAddressSuburb: "Century City",
  responsiblePartyWorkAddressCity: "Cape Town",
  responsiblePartyWorkAddressProvince: "Western Cape",
  responsiblePartyWorkAddressPostalCode: "7441",
  responsiblePartyWorkAddressCountry: "ZA",

  // Referral Doctor
  referralDoctor: "Dr. Sarah Johnson",
  referralDoctorName: "Dr. Sarah Johnson",
  referralDoctorPractice: "Cape Medical Centre",
  referralDoctorSpecialty: "gp",
  referralDoctorPhone: "+27213456789",
  referralDoctorFax: "+27213456780",
  referralDoctorEmail: "s.johnson@capemedical.co.za",
  referralDoctorPracticeNumber: "PR12345",
  referralDoctorAddress: "789 Doctor Street, Gardens, Cape Town",
  referralDoctorIsPrimary: true,

  // Emergency Contact / Next of Kin
  emergencyContactRelationship: "spouse",  // lowercase to match select option value
  emergencyContactName: "Jane Smith",
  emergencyContactPhone: "+27829876543",
  emergencyContactEmail: "jane.smith@example.com",
  emergencyContactStreetAddress: "123 Main Road",
  emergencyContactComplexName: "The Gardens",
  emergencyContactUnitNumber: "Unit 4B",
  emergencyContactAddressSuburb: "Claremont",
  emergencyContactAddressCity: "Cape Town",
  emergencyContactAddressProvince: "Western Cape",
  emergencyContactAddressPostalCode: "7708",
  emergencyContactAddressCountry: "ZA",

  // Medical Aid
  medicalAidName: "Discovery Health",
  medicalAidPlan: "Classic Comprehensive",
  medicalAidNumber: "12345678901",
  medicalAidMainMember: "John Smith",
  mainMemberId: "8506155123456",
  dependentCode: "00",
  gapCover: "yes",

  // Medical History
  allergies: "Penicillin",
  currentMedications: "None",
  chronicConditions: "None",
  previousSurgeries: "None",
  bloodType: "O+",
  smoker: "no",
  alcoholUse: "occasional",

  // Employment
  employer: "ABC Tech Company",
  employerPhone: "+27214567890",
  employerAddress: "456 Business Park, Century City",
};

// Fallback patterns for fields not explicitly defined
const FIELD_TYPE_DEFAULTS: Record<string, string | boolean> = {
  text: "Test Value",
  email: "test@example.com",
  phone: "+27821234567",
  number: "100",
  date: "1990-01-15",
  textarea: "This is test content for the textarea field.",
  checkbox: true,
  select: "", // Will need to pick from options
  radio: "", // Will need to pick from options
  address: "123 Test Street",
  country: "ZA",
};

/**
 * Generate test data for a form field
 */
export function getTestDataForField(
  fieldName: string,
  fieldType: string,
  config?: Record<string, unknown>
): string | boolean {
  // First check for exact match in TEST_DATA
  if (TEST_DATA[fieldName] !== undefined) {
    return TEST_DATA[fieldName];
  }

  // For select/radio fields, try to pick the first option
  if ((fieldType === "select" || fieldType === "radio") && config?.options) {
    const options = config.options as Array<string | { value: string; label: string }>;
    if (options.length > 0) {
      const firstOption = options[0];
      return typeof firstOption === "string" ? firstOption : firstOption.value;
    }
  }

  // Try partial matches for common patterns
  const lowerFieldName = fieldName.toLowerCase();

  // Address-related patterns
  if (lowerFieldName.includes("street") || lowerFieldName.includes("address")) {
    if (lowerFieldName.includes("postal")) return "PO Box 1234";
    if (lowerFieldName.includes("work")) return "456 Business Park Drive";
    return "123 Main Road";
  }
  if (lowerFieldName.includes("suburb")) return "Claremont";
  if (lowerFieldName.includes("city")) return "Cape Town";
  if (lowerFieldName.includes("province")) return "Western Cape";
  if (lowerFieldName.includes("postalcode") || lowerFieldName.includes("postal_code")) return "7708";
  if (lowerFieldName.includes("country")) return "ZA";
  if (lowerFieldName.includes("complex") || lowerFieldName.includes("building")) return "The Gardens";
  if (lowerFieldName.includes("unit") || lowerFieldName.includes("suite")) return "Unit 4B";

  // Contact patterns
  if (lowerFieldName.includes("phone") || lowerFieldName.includes("mobile") || lowerFieldName.includes("cell")) {
    return "+27821234567";
  }
  if (lowerFieldName.includes("fax")) return "+27213456780";
  if (lowerFieldName.includes("email")) return "test@example.com";

  // Name patterns
  if (lowerFieldName.includes("firstname") || lowerFieldName.includes("first_name")) return "John";
  if (lowerFieldName.includes("lastname") || lowerFieldName.includes("last_name") || lowerFieldName.includes("surname")) return "Smith";
  if (lowerFieldName.includes("name") && !lowerFieldName.includes("user")) return "John Smith";

  // ID patterns
  if (lowerFieldName.includes("id") && lowerFieldName.includes("number")) return "8506155123456";
  if (lowerFieldName.includes("passport")) return "A12345678";

  // Fall back to field type defaults
  return FIELD_TYPE_DEFAULTS[fieldType] ?? "";
}

/**
 * Generate test data for all fields in a form
 */
export function generateTestData(
  fields: Array<{
    fieldDefinition: {
      name: string;
      fieldType: string;
      config: string | null;
    };
  }>
): Record<string, string | boolean> {
  const data: Record<string, string | boolean> = {};

  for (const field of fields) {
    const { name, fieldType, config } = field.fieldDefinition;
    const parsedConfig = config ? JSON.parse(config) : {};

    // For referral-doctor field type, populate all sub-fields
    if (fieldType === "referral-doctor") {
      // The ReferralDoctorInput component manages these sub-fields
      data["referralDoctorName"] = TEST_DATA["referralDoctorName"] || "Dr. Sarah Johnson";
      data["referralDoctorPractice"] = TEST_DATA["referralDoctorPractice"] || "Cape Medical Centre";
      data["referralDoctorSpecialty"] = TEST_DATA["referralDoctorSpecialty"] || "gp";
      data["referralDoctorPhone"] = TEST_DATA["referralDoctorPhone"] || "+27213456789";
      data["referralDoctorFax"] = TEST_DATA["referralDoctorFax"] || "+27213456780";
      data["referralDoctorEmail"] = TEST_DATA["referralDoctorEmail"] || "s.johnson@capemedical.co.za";
      data["referralDoctorPracticeNumber"] = TEST_DATA["referralDoctorPracticeNumber"] || "PR12345";
      data["referralDoctorAddress"] = TEST_DATA["referralDoctorAddress"] || "789 Doctor Street, Gardens, Cape Town";
      data["referralDoctorIsPrimary"] = TEST_DATA["referralDoctorIsPrimary"] ?? false;
      continue;
    }

    data[name] = getTestDataForField(name, fieldType, parsedConfig);
  }

  return data;
}

/**
 * Check if we're in development mode
 */
export function isDevelopment(): boolean {
  return process.env.NODE_ENV === "development";
}
