# Chkin Field Library Specification

## Overview

This document defines the canonical field library for the Chkin platform. All providers select from this standard library and can customize labels and categories while maintaining semantic consistency.

## Design Principles

1. **Canonical Definitions**: Each field has one authoritative definition
2. **Provider Customization**: Labels and categories can be customized per provider
3. **Semantic Consistency**: All data maps back to canonical field names
4. **Industry Agnostic**: Core fields work across healthcare, legal, events, education, etc.
5. **Extensible**: Industry-specific extensions built on core foundation

## Field Types

| Type | Description | Validation |
|------|-------------|------------|
| `text` | Single-line text input | min/max length, pattern |
| `textarea` | Multi-line text input | min/max length |
| `email` | Email address | Email format validation |
| `phone` | Phone number | Phone format (with country code support) |
| `date` | Date picker | min/max date |
| `datetime` | Date and time picker | min/max datetime |
| `number` | Numeric input | min/max value, decimal places |
| `select` | Single selection dropdown | options list |
| `multiselect` | Multiple selection | options list |
| `checkbox` | Boolean yes/no | - |
| `radio` | Single selection radio buttons | options list |
| `file` | File upload | allowed types, max size |
| `signature` | Digital signature capture | - |
| `country` | Country selector | ISO 3166-1 codes |
| `currency` | Currency amount | currency code, decimal places |

---

## Core Categories

These categories are universal and applicable across all industries.

### 1. Personal Information

| Field Name | Label | Type | Description |
|------------|-------|------|-------------|
| `title` | Title | select | Personal title (Mr, Mrs, Ms, Dr, Prof, etc.) |
| `firstName` | First Name | text | Person's given/first name |
| `middleName` | Middle Name | text | Person's middle name(s) |
| `lastName` | Last Name | text | Person's family/surname |
| `preferredName` | Preferred Name | text | Name the person prefers to be called |
| `dateOfBirth` | Date of Birth | date | Date of birth |
| `gender` | Gender | select | Gender identity (Male, Female, Non-binary, Prefer not to say, Other) |
| `biologicalSex` | Biological Sex | select | Biological sex at birth (Male, Female, Intersex) |
| `maritalStatus` | Marital Status | select | Current marital status (Single, Married, Divorced, Widowed, Separated, Civil Partnership) |
| `nationality` | Nationality | country | Country of citizenship |
| `countryOfBirth` | Country of Birth | country | Country where person was born |
| `placeOfBirth` | Place of Birth | text | City/town of birth |
| `ethnicity` | Ethnicity | select | Ethnic background (jurisdiction-specific options) |
| `race` | Race | select | Racial classification (jurisdiction-specific options) |
| `homeLanguage` | Home Language | select | Primary language spoken at home |
| `preferredLanguage` | Preferred Language | select | Preferred language for communication |
| `religion` | Religion | select | Religious affiliation |
| `occupation` | Occupation | text | Current occupation/job title |
| `employer` | Employer | text | Current employer name |

### 2. Identity Documents

| Field Name | Label | Type | Description |
|------------|-------|------|-------------|
| `idNumber` | ID Number | text | National identity number (SA ID, SSN, etc.) |
| `idType` | ID Type | select | Type of primary identification document |
| `passportNumber` | Passport Number | text | Passport number |
| `passportCountry` | Passport Country | country | Country that issued the passport |
| `passportExpiry` | Passport Expiry Date | date | Passport expiration date |
| `driversLicenseNumber` | Driver's License Number | text | Driver's license number |
| `driversLicenseExpiry` | Driver's License Expiry | date | Driver's license expiration date |
| `taxNumber` | Tax Number | text | Tax identification number |
| `workPermitNumber` | Work Permit Number | text | Work/employment permit number |
| `visaNumber` | Visa Number | text | Visa number |
| `visaType` | Visa Type | select | Type of visa |
| `visaExpiry` | Visa Expiry Date | date | Visa expiration date |

### 3. Contact Information

| Field Name | Label | Type | Description |
|------------|-------|------|-------------|
| `phoneHome` | Home Phone | phone | Primary home telephone number |
| `phoneMobile` | Mobile Phone | phone | Mobile/cell phone number |
| `phoneWork` | Work Phone | phone | Work/office telephone number |
| `phoneFax` | Fax Number | phone | Fax number |
| `emailPersonal` | Personal Email | email | Personal email address |
| `emailWork` | Work Email | email | Work/business email address |
| `preferredContactMethod` | Preferred Contact Method | select | How the person prefers to be contacted (Phone, Email, SMS, WhatsApp) |
| `bestTimeToContact` | Best Time to Contact | select | Preferred time for contact (Morning, Afternoon, Evening) |

### 4. Address Information

| Field Name | Label | Type | Description |
|------------|-------|------|-------------|
| `addressLine1` | Address Line 1 | text | Street address line 1 |
| `addressLine2` | Address Line 2 | text | Street address line 2 (apartment, suite, etc.) |
| `suburb` | Suburb | text | Suburb or neighborhood |
| `city` | City | text | City or town |
| `stateProvince` | State/Province | text | State, province, or region |
| `postalCode` | Postal Code | text | Postal/ZIP code |
| `country` | Country | country | Country |
| `addressType` | Address Type | select | Type of address (Residential, Postal, Business) |
| `postalAddressLine1` | Postal Address Line 1 | text | Postal address line 1 (if different from residential) |
| `postalAddressLine2` | Postal Address Line 2 | text | Postal address line 2 |
| `postalCity` | Postal City | text | Postal address city |
| `postalPostalCode` | Postal Code (Postal) | text | Postal address postal code |
| `postalCountry` | Postal Country | country | Postal address country |

### 5. Emergency Contact

| Field Name | Label | Type | Description |
|------------|-------|------|-------------|
| `emergencyContactName` | Emergency Contact Name | text | Full name of emergency contact person |
| `emergencyContactRelationship` | Relationship | select | Relationship to the person (Spouse, Parent, Sibling, Child, Friend, Other) |
| `emergencyContactPhone` | Emergency Contact Phone | phone | Phone number of emergency contact |
| `emergencyContactEmail` | Emergency Contact Email | email | Email address of emergency contact |
| `emergencyContactAddress` | Emergency Contact Address | textarea | Full address of emergency contact |
| `emergencyContact2Name` | Second Emergency Contact | text | Alternative emergency contact name |
| `emergencyContact2Relationship` | Second Contact Relationship | select | Relationship of second contact |
| `emergencyContact2Phone` | Second Contact Phone | phone | Phone number of second emergency contact |

### 6. Responsible Party / Account Holder

| Field Name | Label | Type | Description |
|------------|-------|------|-------------|
| `responsiblePartyName` | Responsible Party Name | text | Name of person responsible for account/payment |
| `responsiblePartyRelationship` | Responsible Party Relationship | select | Relationship to the subject (Self, Parent, Guardian, Employer, Other) |
| `responsiblePartyIdNumber` | Responsible Party ID | text | ID number of responsible party |
| `responsiblePartyPhone` | Responsible Party Phone | phone | Phone number of responsible party |
| `responsiblePartyEmail` | Responsible Party Email | email | Email address of responsible party |
| `responsiblePartyAddress` | Responsible Party Address | textarea | Address of responsible party |

### 7. Preferences & Accessibility

| Field Name | Label | Type | Description |
|------------|-------|------|-------------|
| `dietaryRequirements` | Dietary Requirements | multiselect | Dietary restrictions/preferences (Vegetarian, Vegan, Halal, Kosher, Gluten-free, Dairy-free, Nut allergy, None) |
| `dietaryNotes` | Dietary Notes | textarea | Additional dietary information |
| `accessibilityNeeds` | Accessibility Needs | multiselect | Accessibility requirements (Wheelchair access, Hearing assistance, Visual assistance, Mobility assistance, None) |
| `accessibilityNotes` | Accessibility Notes | textarea | Additional accessibility information |
| `specialRequirements` | Special Requirements | textarea | Any other special requirements or accommodations |
| `communicationPreference` | Communication Preference | multiselect | Preferred communication channels (Email, SMS, Phone, WhatsApp, Post) |
| `marketingConsent` | Marketing Consent | checkbox | Consent to receive marketing communications |

---

## Industry Extension Categories

### 8. Medical / Healthcare

| Field Name | Label | Type | Description |
|------------|-------|------|-------------|
| `medicalAidName` | Medical Aid Name | text | Name of medical aid/health insurance provider |
| `medicalAidPlan` | Medical Aid Plan | text | Medical aid plan name |
| `medicalAidNumber` | Medical Aid Number | text | Medical aid membership number |
| `medicalAidMainMember` | Main Member Name | text | Name of main member on medical aid |
| `dependentCode` | Dependent Code | text | Dependent code on medical aid |
| `gapCover` | Gap Cover | checkbox | Whether person has gap cover insurance |
| `gapCoverProvider` | Gap Cover Provider | text | Gap cover provider name |
| `bloodType` | Blood Type | select | Blood type (A+, A-, B+, B-, AB+, AB-, O+, O-, Unknown) |
| `allergies` | Allergies | textarea | Known allergies (medications, foods, environmental) |
| `chronicConditions` | Chronic Conditions | textarea | Chronic medical conditions |
| `currentMedications` | Current Medications | textarea | Current medications being taken |
| `previousSurgeries` | Previous Surgeries | textarea | Previous surgical procedures |
| `familyMedicalHistory` | Family Medical History | textarea | Relevant family medical history |
| `primaryPhysician` | Primary Physician | text | Name of primary care physician |
| `primaryPhysicianPhone` | Primary Physician Phone | phone | Phone number of primary physician |
| `pharmacy` | Preferred Pharmacy | text | Preferred pharmacy name |
| `pharmacyPhone` | Pharmacy Phone | phone | Pharmacy phone number |
| `hospitalPreference` | Hospital Preference | text | Preferred hospital for treatment |
| `organDonor` | Organ Donor | checkbox | Registered organ donor status |
| `advanceDirective` | Advance Directive | checkbox | Has advance directive/living will |
| `pregnancyStatus` | Pregnancy Status | select | Current pregnancy status (Not pregnant, Pregnant, Possibly pregnant, Not applicable) |
| `pregnancyDueDate` | Due Date | date | Expected due date if pregnant |

### 9. Insurance (General)

| Field Name | Label | Type | Description |
|------------|-------|------|-------------|
| `insuranceProvider` | Insurance Provider | text | Name of insurance company |
| `insurancePolicyNumber` | Policy Number | text | Insurance policy number |
| `insurancePolicyType` | Policy Type | select | Type of insurance policy |
| `insurancePolicyHolder` | Policy Holder Name | text | Name of policy holder |
| `insuranceExpiryDate` | Policy Expiry Date | date | Insurance policy expiration date |
| `insuranceContactNumber` | Insurance Contact | phone | Insurance company contact number |

### 10. Education

| Field Name | Label | Type | Description |
|------------|-------|------|-------------|
| `studentNumber` | Student Number | text | Student/learner identification number |
| `gradeLevel` | Grade/Level | select | Current grade or educational level |
| `enrollmentDate` | Enrollment Date | date | Date of enrollment |
| `previousSchool` | Previous School | text | Name of previous school/institution |
| `previousSchoolCity` | Previous School City | text | City of previous school |
| `graduationDate` | Graduation Date | date | Expected or actual graduation date |
| `majorField` | Major/Field of Study | text | Primary field of study |
| `guardianName` | Guardian Name | text | Name of parent/guardian |
| `guardianRelationship` | Guardian Relationship | select | Relationship (Mother, Father, Legal Guardian, Other) |
| `guardianPhone` | Guardian Phone | phone | Guardian's phone number |
| `guardianEmail` | Guardian Email | email | Guardian's email address |
| `guardianWorkPhone` | Guardian Work Phone | phone | Guardian's work phone |
| `guardianEmployer` | Guardian Employer | text | Guardian's employer |
| `pickupAuthorization` | Authorized Pickup Persons | textarea | Names of persons authorized to pick up student |
| `transportMethod` | Transport Method | select | How student travels to/from (Bus, Car, Walk, Cycle, Public Transport) |
| `busRoute` | Bus Route | text | School bus route if applicable |
| `immunizationStatus` | Immunization Status | select | Immunization records status (Complete, Incomplete, Exempt) |
| `learningAccommodations` | Learning Accommodations | textarea | Special learning needs or accommodations |

### 11. Employment / HR

| Field Name | Label | Type | Description |
|------------|-------|------|-------------|
| `employeeNumber` | Employee Number | text | Employee identification number |
| `department` | Department | text | Department or division |
| `jobTitle` | Job Title | text | Official job title |
| `employmentType` | Employment Type | select | Type (Full-time, Part-time, Contract, Temporary, Intern) |
| `startDate` | Start Date | date | Employment start date |
| `endDate` | End Date | date | Employment end date (if applicable) |
| `managerName` | Manager Name | text | Direct manager/supervisor name |
| `managerEmail` | Manager Email | email | Manager's email address |
| `workLocation` | Work Location | text | Primary work location/office |
| `workSchedule` | Work Schedule | text | Regular work schedule |
| `bankName` | Bank Name | text | Bank name for salary payment |
| `bankAccountNumber` | Bank Account Number | text | Bank account number |
| `bankBranchCode` | Branch Code | text | Bank branch/routing code |
| `bankAccountType` | Account Type | select | Type (Cheque, Savings, Transmission) |
| `taxStatus` | Tax Status | select | Tax status for payroll |
| `pensionFund` | Pension Fund | text | Pension/retirement fund name |
| `pensionNumber` | Pension Number | text | Pension fund member number |
| `previousEmployer` | Previous Employer | text | Previous employer name |
| `previousEmployerContact` | Previous Employer Contact | phone | Previous employer reference contact |
| `reasonForLeaving` | Reason for Leaving | text | Reason for leaving previous job |
| `criminalRecord` | Criminal Record Declaration | checkbox | Declaration of criminal record |
| `criminalRecordDetails` | Criminal Record Details | textarea | Details if criminal record declared |

### 12. Events & Hospitality

| Field Name | Label | Type | Description |
|------------|-------|------|-------------|
| `ticketNumber` | Ticket/Booking Number | text | Ticket or booking reference number |
| `eventName` | Event Name | text | Name of event |
| `eventDate` | Event Date | date | Date of event |
| `sessionPreference` | Session Preference | multiselect | Preferred sessions/tracks |
| `mealPreference` | Meal Preference | select | Meal choice for event |
| `tablePreference` | Table Preference | text | Seating/table preference |
| `arrivalDate` | Arrival Date | date | Date of arrival |
| `departureDate` | Departure Date | date | Date of departure |
| `arrivalTime` | Arrival Time | text | Expected arrival time |
| `departureTime` | Departure Time | text | Expected departure time |
| `roomType` | Room Type | select | Room type preference |
| `roomNumber` | Room Number | text | Assigned room number |
| `numberOfGuests` | Number of Guests | number | Number of guests in party |
| `guestNames` | Guest Names | textarea | Names of additional guests |
| `vehicleRegistration` | Vehicle Registration | text | Vehicle registration/license plate |
| `parkingRequired` | Parking Required | checkbox | Whether parking is needed |
| `loyaltyNumber` | Loyalty/Membership Number | text | Loyalty program membership number |
| `specialOccasion` | Special Occasion | text | Special occasion (birthday, anniversary, etc.) |
| `roomPreferences` | Room Preferences | multiselect | Room preferences (High floor, Quiet, Near elevator, etc.) |
| `checkInTime` | Check-in Time | text | Preferred check-in time |
| `checkOutTime` | Check-out Time | text | Preferred check-out time |
| `wakeUpCall` | Wake-up Call Time | text | Requested wake-up call time |

### 13. Membership & Fitness

| Field Name | Label | Type | Description |
|------------|-------|------|-------------|
| `membershipNumber` | Membership Number | text | Membership identification number |
| `membershipType` | Membership Type | select | Type of membership (Basic, Premium, VIP, etc.) |
| `membershipStartDate` | Membership Start Date | date | Membership start date |
| `membershipExpiryDate` | Membership Expiry Date | date | Membership expiry date |
| `fitnessGoals` | Fitness Goals | multiselect | Fitness goals (Weight loss, Muscle gain, Endurance, Flexibility, General fitness) |
| `fitnessLevel` | Current Fitness Level | select | Current fitness level (Beginner, Intermediate, Advanced) |
| `preferredActivities` | Preferred Activities | multiselect | Preferred activities (Gym, Yoga, Swimming, Classes, Personal training) |
| `healthConditions` | Health Conditions | textarea | Health conditions affecting exercise |
| `injuryHistory` | Injury History | textarea | Previous injuries relevant to fitness |
| `personalTrainer` | Personal Trainer | text | Assigned personal trainer name |
| `lockerNumber` | Locker Number | text | Assigned locker number |
| `accessCardNumber` | Access Card Number | text | Access card/key fob number |
| `referredBy` | Referred By | text | Name of person who referred them |
| `photoConsent` | Photo/Video Consent | checkbox | Consent for promotional photos/videos |

### 14. Legal / Professional Services

| Field Name | Label | Type | Description |
|------------|-------|------|-------------|
| `clientNumber` | Client Number | text | Client reference number |
| `matterReference` | Matter/Case Reference | text | Legal matter or case reference |
| `clientType` | Client Type | select | Type (Individual, Corporate, Trust, Estate) |
| `companyName` | Company Name | text | Company or organization name |
| `companyRegistration` | Company Registration Number | text | Company registration number |
| `vatNumber` | VAT Number | text | VAT registration number |
| `tradingName` | Trading As | text | Trading/business name |
| `industryType` | Industry | select | Industry classification |
| `website` | Website | text | Company website URL |
| `referralSource` | Referral Source | select | How client found the service |
| `conflictCheck` | Conflict Check Completed | checkbox | Conflict of interest check completed |
| `engagementDate` | Engagement Date | date | Date of formal engagement |
| `authorizedSignatory` | Authorized Signatory | text | Name of authorized signatory |
| `signatoryPosition` | Signatory Position | text | Position of authorized signatory |
| `billingContact` | Billing Contact Name | text | Name of billing contact |
| `billingEmail` | Billing Email | email | Email for invoices |
| `billingAddress` | Billing Address | textarea | Address for invoices |
| `paymentTerms` | Payment Terms | select | Payment terms (30 days, 60 days, COD, etc.) |
| `creditLimit` | Credit Limit | currency | Approved credit limit |

### 15. Financial / KYC

| Field Name | Label | Type | Description |
|------------|-------|------|-------------|
| `sourceOfFunds` | Source of Funds | select | Primary source of funds/income |
| `annualIncome` | Annual Income | select | Annual income bracket |
| `employmentStatus` | Employment Status | select | Current employment status |
| `sourceOfWealth` | Source of Wealth | textarea | Description of source of wealth |
| `pep` | Politically Exposed Person | checkbox | Is a politically exposed person |
| `pepDetails` | PEP Details | textarea | Details if politically exposed |
| `ultimateBeneficialOwner` | Ultimate Beneficial Owner | text | UBO name for corporate clients |
| `uboIdNumber` | UBO ID Number | text | UBO identification number |
| `uboOwnershipPercent` | UBO Ownership Percentage | number | Percentage ownership of UBO |
| `riskRating` | Risk Rating | select | Customer risk rating (Low, Medium, High) |
| `sanctionsCheck` | Sanctions Check | checkbox | Sanctions screening completed |
| `proofOfAddress` | Proof of Address | file | Upload proof of address document |
| `proofOfIdentity` | Proof of Identity | file | Upload proof of identity document |
| `proofOfIncome` | Proof of Income | file | Upload proof of income document |

### 16. Consent & Legal

| Field Name | Label | Type | Description |
|------------|-------|------|-------------|
| `termsAccepted` | Terms and Conditions | checkbox | Acceptance of terms and conditions |
| `privacyPolicyAccepted` | Privacy Policy | checkbox | Acceptance of privacy policy |
| `dataProcessingConsent` | Data Processing Consent | checkbox | Consent to process personal data |
| `thirdPartyShareConsent` | Third Party Sharing | checkbox | Consent to share data with third parties |
| `electronicSignature` | Electronic Signature | signature | Digital signature capture |
| `signatureDate` | Signature Date | date | Date of signature |
| `witnessName` | Witness Name | text | Name of witness (if required) |
| `witnessSignature` | Witness Signature | signature | Witness signature |
| `photoMediaConsent` | Photo/Media Consent | checkbox | Consent for photos/media use |
| `liabilityWaiver` | Liability Waiver | checkbox | Acceptance of liability waiver |
| `consentExpiryDate` | Consent Expiry Date | date | Date consent expires |
| `parentalConsent` | Parental Consent | checkbox | Parent/guardian consent (for minors) |
| `parentalConsentName` | Parent/Guardian Name | text | Name of consenting parent/guardian |
| `parentalConsentSignature` | Parent/Guardian Signature | signature | Parent/guardian signature |

---

## Field Definition Schema

Each field in the library has the following structure:

```json
{
  "name": "firstName",
  "label": "First Name",
  "description": "Person's given/first name as it appears on official documents",
  "fieldType": "text",
  "category": "personal",
  "config": {
    "minLength": 1,
    "maxLength": 100
  },
  "validation": {
    "pattern": "^[a-zA-Z\\s'-]+$",
    "customMessage": "Please enter a valid name"
  },
  "isActive": true,
  "sortOrder": 1,
  "specialPersonalInfo": false,
  "ppiaSensitive": false
}
```

### Special Flags

| Flag | Description |
|------|-------------|
| `specialPersonalInfo` | POPIA special personal information (race, religion, health, etc.) - requires explicit consent |
| `ppiaSensitive` | Sensitive under privacy laws - extra handling required |
| `isRequired` | Default required status (can be overridden by provider) |

---

## Provider Customization Model

When a provider uses a field, they can customize:

```json
{
  "fieldDefinitionId": "firstName",
  "labelOverride": "Given Name",
  "sectionOverride": "Patient Information",
  "helpText": "Please enter your first name exactly as it appears on your ID",
  "isRequired": true,
  "sortOrder": 1,
  "visibilityRules": {
    "showWhen": null
  }
}
```

---

## Field Count Summary

| Category | Field Count |
|----------|-------------|
| Personal Information | 18 |
| Identity Documents | 12 |
| Contact Information | 8 |
| Address Information | 14 |
| Emergency Contact | 8 |
| Responsible Party | 6 |
| Preferences & Accessibility | 7 |
| Medical / Healthcare | 22 |
| Insurance | 6 |
| Education | 18 |
| Employment / HR | 22 |
| Events & Hospitality | 22 |
| Membership & Fitness | 14 |
| Legal / Professional | 18 |
| Financial / KYC | 15 |
| Consent & Legal | 13 |
| **TOTAL** | **223** |

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-12-14 | Initial specification |

---

## References

- [HL7 FHIR Patient Resource](https://www.hl7.org/fhir/patient.html)
- [ISO/IEC 27701 Privacy Information Management](https://www.iso.org/standard/27701)
- [POPIA - Protection of Personal Information Act](https://popia.co.za/)
- [International Patient Summary (IPS)](https://www.hl7.org/fhir/uv/ips/)
- [openEHR Demographics Model](https://specifications.openehr.org/releases/RM/latest/demographic.html)
