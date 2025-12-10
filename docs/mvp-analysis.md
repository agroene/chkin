# Chkin MVP Analysis Document

This document captures all findings from reverse-engineering the existing MVP at www.chkin.co.za, compiled from screenshots, specification documents, and testing transcripts.

---

## 1. System Architecture Overview

### 1.1 Three-Portal Structure

| Portal | Theme | Primary Users | Purpose |
|--------|-------|---------------|---------|
| Patient Portal | Dark theme, teal accents | Patients/Users | Profile management, QR scanning, consent management, document storage |
| Provider Portal | Dark blue theme | Practice staff | Form creation, QR management, submission viewing, consent tracking |
| Admin Console | Purple accents | Platform administrators | User/provider management, field library, system analytics, audit logs |

### 1.2 Core System Components

| Component | Description |
|-----------|-------------|
| User App | Mobile/web interface for profiles, data storage, QR scanning |
| Provider Portal | Web app for form design, QR management, submissions |
| Consent Engine | Records every consent event with timestamp, context, revocation status |
| Dynamic Form Engine | Template-driven builder with field types, conditional logic, validations |
| Data Vault | Encrypted repository for personal/medical info and documents |
| Administration Console | Access rights, templates, analytics, audit trails |

---

## 2. Data Model

### 2.1 Primary Entities

#### Profile
| Field | Type | Description |
|-------|------|-------------|
| profile_id | UUID | Unique identifier |
| user_id | UUID | Link to user account |
| name | String | First name |
| surname | String | Last name |
| dob | Date | Date of birth |
| gender | Enum | Male/Female/Other |
| contact_number | String | Primary phone |
| email | String | Primary email |
| language_pref | String | Preferred language |
| medical_aid_details | Object | Medical aid information |
| next_of_kin | Object | Emergency contact |
| documents | Array | Uploaded documents |

#### Provider
| Field | Type | Description |
|-------|------|-------------|
| provider_id | UUID | Unique identifier |
| name | String | Practice name |
| practice_no | String | Practice number (optional) |
| contact_info | Object | Phone, email, address |
| industry_type | Enum | General Practice, Specialist, Dentistry, etc. |
| verified_status | Boolean | Admin approval status |
| logo_url | String | Practice logo |
| address | Object | Street, city, postal code |

#### Form Template
| Field | Type | Description |
|-------|------|-------------|
| form_id | UUID | Unique identifier |
| provider_id | UUID | Owning provider |
| title | String | Form display name |
| version | Integer | Version number |
| fields_schema | JSON | Field definitions |
| consent_clause_text | Text | Consent wording |
| active_status | Boolean | Whether form is active |

#### Submission
| Field | Type | Description |
|-------|------|-------------|
| submission_id | UUID | Unique identifier |
| form_id | UUID | Source form |
| provider_id | UUID | Receiving provider |
| user_id | UUID | Submitting user (nullable for anonymous) |
| data_payload | JSON | Form field values |
| consent_token | String | Link to consent record |
| status | Enum | pending/completed/expired |
| submitted_at | Timestamp | Submission time |
| source | Enum | app/web |

#### Consent Record
| Field | Type | Description |
|-------|------|-------------|
| consent_id | UUID | Unique identifier |
| user_id | UUID | Consenting user |
| provider_id | UUID | Provider granted access |
| form_id | UUID | Associated form |
| fields_shared | Array | Which fields were consented |
| purpose | String | Why data is collected |
| timestamp | Timestamp | When consent given |
| expiry_date | Date | When consent expires |
| revoked | Boolean | Whether revoked |
| revoked_at | Timestamp | When revoked (nullable) |
| method | Enum | app/web/paper |

#### Temporary Onboarding Record
| Field | Type | Description |
|-------|------|-------------|
| temp_id | UUID | Unique identifier |
| form_id | UUID | Source form |
| provider_id | UUID | Receiving provider |
| data_payload | JSON | Form field values |
| device_fingerprint | String | Browser/device ID |
| submitted_at | Timestamp | Submission time |
| expiry_date | Date | Auto-delete date (30 days) |

#### Audit Log
| Field | Type | Description |
|-------|------|-------------|
| log_id | UUID | Unique identifier |
| entity_type | Enum | user/provider/form/submission/consent |
| entity_id | UUID | Affected entity |
| action | String | What happened |
| actor_id | UUID | Who did it |
| timestamp | Timestamp | When it happened |
| ip_address | String | Client IP |
| device_info | String | User agent |

### 2.2 Data Retention Policies

| Data Type | Retention Period |
|-----------|------------------|
| User Data | Until deletion request or 24 months inactivity |
| Temporary Records | Auto-delete after 30 days if no registration |
| Consent Logs | Minimum 5 years post-revocation |
| Audit Logs | Minimum 24 months |
| Provider Submissions | Deleted when consent expires/revoked |

---

## 3. User Roles and Permissions

### 3.1 Role Definitions

| Role | Description | Key Permissions |
|------|-------------|-----------------|
| Patient/User | End users completing check-in forms | Manage own profile, grant/revoke consent, view own submissions |
| Provider Staff | Practice employees | Create forms, generate QR codes, view submissions for their practice |
| Provider Admin | Practice managers | All provider staff permissions + manage practice settings |
| Platform Admin | Chkin system administrators | Approve providers, manage field library, view audit logs, system analytics |

### 3.2 Permission Matrix

| Action | Patient | Provider Staff | Provider Admin | Platform Admin |
|--------|---------|----------------|----------------|----------------|
| Create profile | ✓ | - | - | - |
| Submit forms | ✓ | - | - | - |
| Manage own consent | ✓ | - | - | - |
| Create forms | - | ✓ | ✓ | - |
| Generate QR codes | - | ✓ | ✓ | - |
| View submissions | - | Own practice | Own practice | All |
| Manage practice settings | - | - | ✓ | - |
| Approve providers | - | - | - | ✓ |
| Manage field library | - | - | - | ✓ |
| View audit logs | - | - | - | ✓ |
| View system analytics | - | - | - | ✓ |

---

## 4. User Flows

### 4.1 Flow A: New User Web Onboarding (via QR)

```
1. Patient scans QR code with native phone camera
2. Browser opens web form with practice branding
3. Patient fills required fields (personal, medical aid, next of kin)
4. Patient reviews consent clause
5. Patient explicitly accepts consent (checkbox + submit)
6. System creates Temporary Onboarding Record
7. Confirmation shown with prompt to download Chkin app
8. If user registers within 30 days, data migrates to permanent profile
9. If no registration, temporary record auto-deletes
```

### 4.2 Flow B: Existing User In-App Check-In

```
1. User opens Chkin app
2. User taps "Scan QR"
3. App camera scans provider QR code
4. Form loads with auto-populated fields from profile
5. User reviews pre-filled data, makes any updates
6. User reviews consent clause
7. User submits form
8. Submission linked to permanent profile
9. Consent record created with token
10. Provider sees submission in dashboard immediately
```

### 4.3 Flow C: Provider Registration

```
1. Provider navigates to registration page
2. Provider enters practice details:
   - Practice Name (required)
   - Practice Number (optional)
   - Email Address
   - Contact Number
   - Industry Type (dropdown)
   - Street Address, City, Postal Code
   - Website (optional)
   - Password
3. Provider submits registration
4. Registration enters "Pending Approval" status
5. Platform admin reviews in Admin Console
6. Admin approves or rejects
7. Provider receives notification of approval
8. Provider can now log in and create forms
```

### 4.4 Flow D: Form Creation (Provider)

```
1. Provider logs into Provider Portal
2. Navigates to Forms section
3. Clicks "Create New Form"
4. Form Builder opens with:
   - Form title input
   - Purpose/description
   - Field selector (drag-and-drop from Standard Field Library)
   - Consent clause editor
5. Provider drags fields from library to form
6. Provider configures field properties (required, validation)
7. Provider writes consent clause text
8. Provider saves form
9. Form appears in Forms list with "Active" status
10. Provider can now generate QR codes for this form
```

### 4.5 Flow E: QR Code Generation

```
1. Provider navigates to QR Codes section
2. Clicks "Generate New QR Code"
3. Selects form to link to QR code
4. System generates unique QR code with:
   - Code ID
   - Short URL
   - QR image
5. Provider can download QR image (PNG)
6. Provider can view/regenerate QR code
7. QR code linked to form version
```

### 4.6 Flow F: Submission Viewing (Provider)

```
1. Provider logs into Provider Portal
2. Navigates to Submissions section
3. Sees list of all submissions with:
   - Patient name
   - Form name
   - Submission date/time
   - Status
4. Provider can filter by status (All/Pending/Completed)
5. Provider clicks submission to view details
6. Full form data displayed
7. Consent status shown
8. Provider can export to PDF/CSV
```

---

## 5. Standard Field Library

### 5.1 Personal Category Fields

| Field Name | Internal Type | Display Label Options |
|------------|---------------|----------------------|
| First Name | personal/firstname | "First Name", "Name" |
| Surname | personal/surname | "Surname", "Last Name" |
| Date of Birth | date/dateofbirth | "Date of Birth", "DOB" |
| ID Number | idnumber | "ID Number", "Identity Number" |
| Sex | gender | "Sex", "Gender" |
| Title | title | "Title" |
| Home Language | homelanguage | "Home Language", "Preferred Language" |
| Primary Contact Number | primarycontactnumber | "Contact Number", "Phone" |
| Primary Email | primary/email | "Email", "Email Address" |

### 5.2 Field Types Available

| Type | Description | Notes |
|------|-------------|-------|
| text | Single-line text input | Standard text field |
| email | Email input with validation | Validates email format |
| phone | Phone number input | **BROKEN** - causes save errors |
| date | Date picker | Calendar widget |
| select | Dropdown with options | Requires options array |
| checkbox | Boolean checkbox | For consent, toggles |
| textarea | Multi-line text | For longer inputs |

### 5.3 Field Categories

- Personal
- Contact
- Medical
- Emergency
- Other

---

## 6. Patient Check-In Form Structure

### 6.1 Form Header

| Element | Description |
|---------|-------------|
| Form Title | "New Patient Registration" (customizable) |
| Practice Welcome | "Welcomed by [Practice Name]" |
| Practice Logo | Provider's uploaded logo |
| Purpose Tag | "Patient Intake", "Follow-up", etc. |

### 6.2 Standard Form Sections

#### Section 1: Patient Details
| Field | Type | Required | Example |
|-------|------|----------|---------|
| Title | Select | No | Mr, Mrs, Ms, Dr |
| First Name | Text | Yes | Anton |
| Surname | Text | Yes | Groenwald |
| Date of Birth | Date | Yes | 06/20/1999 |
| ID Number | Text | Yes | 9902065252063 |
| Sex | Select | Yes | Male/Female |
| Home Language | Select | No | English, Afrikaans |
| Primary Contact Number | Text | Yes | 0840000000 |
| Primary Email | Email | Yes | anton@groenwald.name |

#### Section 2: Medical Aid Details
| Field | Type | Required | Example |
|-------|------|----------|---------|
| Medical Aid Name | Text | Conditional | Discovery Health |
| Plan Name | Text | Conditional | Classic Saver |
| Member Number | Text | Conditional | 12345678 |
| Dependent Code | Text | Conditional | 01 |
| Gap Cover | Checkbox | No | Yes/No |

#### Section 3: Account Holder / Responsible Party
| Field | Type | Required | Example |
|-------|------|----------|---------|
| Full Name | Text | Conditional | A Groenewald |
| Postal Address | Textarea | No | PO Box 1234 Paarl 7646 |
| Work Address | Textarea | No | HomeChoice HQ |
| Work Phone | Text | No | 021 871 0000 |
| Email | Email | Conditional | billing@email.com |

#### Section 4: Next of Kin / Emergency Contact
| Field | Type | Required | Example |
|-------|------|----------|---------|
| Full Name | Text | Yes | Cayden Groenewald |
| Relationship | Select | Yes | Son, Daughter, Spouse, Parent |
| Contact Number | Text | Yes | 082 444 2222 |

### 6.3 Form Actions

| Button | Style | Action |
|--------|-------|--------|
| Save Draft | Secondary/Outline | Saves progress, allows return later |
| Submit Form | Primary (Teal) | Validates and submits form |

---

## 7. Consent Management

### 7.1 Consent Token Lifecycle

```
1. ISSUE: User grants consent (app/web) → Consent Engine generates unique token
2. RECORD: Token written immutably to consent ledger
3. ACCESS: Provider views data, validated by active token
4. REVOCATION: User revokes in app → token marked revoked, provider access invalidated
5. AUDIT: All actions logged in audit_log
```

### 7.2 Granular Consent Model

The system implements per-field consent, not all-or-nothing:
- Each field can be individually consented or withheld
- `fields_shared` array tracks which specific fields were consented
- Patient can revoke access to specific fields later
- Provider only sees fields they have active consent for

### 7.3 Consent Record Requirements

| Requirement | Implementation |
|-------------|----------------|
| Explicit acknowledgment | Checkbox must be checked before submit |
| Timestamp | UTC timestamp recorded |
| Version tracking | consent_text_version links to exact wording |
| Audit trail | All consent actions logged |
| Revocability | User can revoke any time via app |
| POPIA compliance | Data minimization, purpose limitation enforced |

---

## 8. Dashboard Metrics

### 8.1 Provider Dashboard

| Metric | Description |
|--------|-------------|
| Active Forms | Number of published forms |
| QR Codes | Number of generated QR codes |
| Total Submissions | All-time submission count |
| Active Consents | Currently valid consents |

### 8.2 Admin Dashboard

| Metric | Description |
|--------|-------------|
| Total Users | Registered patient accounts |
| Total Providers | Registered practices |
| Active Consents | Currently valid consents |
| Total Submissions | All-time submission count |
| User Growth Rate | Percentage growth |
| Provider Approval Rate | Approved vs rejected |
| Form Completion Rate | Started vs completed forms |
| System Uptime | Platform availability |

---

## 9. Known Bugs and Issues

### 9.1 Critical Bugs

| Bug | Description | Impact |
|-----|-------------|--------|
| QR Code Generation Failure | "QR code not available", "Original QR code not found", "Failed to load QR image" errors | **BLOCKS CORE FUNCTIONALITY** - providers cannot generate QR codes |

### 9.2 High Severity Bugs

| Bug | Description | Impact |
|-----|-------------|--------|
| Duplicate Provider Emails | System allows registering multiple providers with same email | Security/integrity issue |
| Phone Field Type Invalid | "phone" type allowed in admin field library but rejected when saving form | Broken field type |

### 9.3 Medium Severity Bugs

| Bug | Description | Impact |
|-----|-------------|--------|
| Consent Clause Limit | 1000 character limit too restrictive for multi-clause consent | Limits legal compliance text |
| Consent Line Breaks | Line breaks not preserved in preview (shows as single paragraph) | Poor readability |
| Mobile Logo Distortion | Hard-coded heights cause image distortion on mobile | Visual bug |
| No Provider Deactivation | Cannot deactivate/delete approved providers | Admin limitation |

### 9.4 Low Severity Bugs

| Bug | Description | Impact |
|-----|-------------|--------|
| Settings Button | Settings button in admin console does nothing | Non-functional UI element |

---

## 10. Test Data (from Test Runner)

### 10.1 Sample Provider

| Field | Value |
|-------|-------|
| Practice Name | Winelands Knee Clinic |
| Email | info@winelandskneeclinic.co.za |
| Contact | 021 000 0000 |
| Industry Type | Specialist |
| Address | 123 Main Road, Paarl, 7646 |

### 10.2 Sample Patient

| Field | Value |
|-------|-------|
| First Name | John |
| Surname | Smith |
| Date of Birth | 01/15/1980 |
| ID Number | 8001155555088 |
| Sex | Male |
| Contact Number | 082 123 4567 |
| Email | john.smith@email.com |

### 10.3 Sample Form

| Field | Value |
|-------|-------|
| Title | New Patient Intake Form |
| Purpose | Patient Registration |

---

## 11. Sample JSON Structures

### 11.1 Submission Record

```json
{
  "submission_id": "subm_908af3d2",
  "provider_id": "prov_dr_d_m_north",
  "form_id": "form_orthonorth_001",
  "user_id": "user_anton_g",
  "data_payload": {
    "name": "Anton Groenewald",
    "dob": "1978-04-14",
    "gender": "Male",
    "medical_aid": "Discovery Health",
    "gap_cover": true
  },
  "consent_token": "consent_abcd1234",
  "submitted_at": "2025-10-28T09:21:00Z",
  "source": "web",
  "status": "completed"
}
```

### 11.2 Consent Record

```json
{
  "consent_id": "consent_abcd1234",
  "user_id": "user_anton_g",
  "provider_id": "prov_dr_d_m_north",
  "form_id": "form_orthonorth_001",
  "fields_shared": ["name", "dob", "gender", "medical_aid", "gap_cover"],
  "purpose": "Patient registration and medical records",
  "timestamp": "2025-10-28T09:21:00Z",
  "expiry_date": "2026-10-28",
  "revoked": false,
  "revoked_at": null,
  "method": "web"
}
```

---

## 12. Compliance Requirements

### 12.1 POPIA Requirements

| Requirement | Implementation |
|-------------|----------------|
| Lawfulness | Consent explicitly obtained before processing |
| Purpose limitation | Purpose stated in form, recorded in consent |
| Minimisation | Only collect fields needed for stated purpose |
| Quality | Validation on input fields |
| Transparency | Consent text clearly explains data use |
| Security | Encrypted data vault, audit logging |
| Data subject rights | Users can view, export, revoke consent, delete data |

### 12.2 Audit Requirements

- All data access logged with actor, timestamp, IP, action
- Consent logs retained minimum 5 years
- Audit logs retained minimum 24 months
- Export capability for compliance audits

---

## 13. Technical Observations

### 13.1 UI/UX Patterns

- Dark themes across all portals (professional medical aesthetic)
- Teal accent color for patient-facing elements
- Purple accent for admin elements
- Drag-and-drop form builder
- Status badges (Active/Inactive, Approved/Pending)
- Metric cards with icons on dashboards
- Responsive design (mobile-first for patient forms)

### 13.2 Key Features for Rebuild

1. **Dynamic Form Builder** - Drag fields from library, configure properties
2. **QR Code Generation** - Unique codes linked to specific forms
3. **Granular Consent** - Per-field consent with revocation
4. **Save Draft** - Patients can save and return later
5. **Auto-populate** - In-app users get pre-filled forms
6. **Multi-tenant** - Each provider isolated, sees only their data
7. **Audit Trail** - All actions logged for compliance
8. **Role-based Access** - Different permissions per user type

---

## 14. Recommended Improvements for Rebuild

### 14.1 Bug Fixes (Must Have)

1. Fix QR code generation - critical blocker
2. Prevent duplicate provider emails
3. Fix or remove "phone" field type
4. Increase consent clause character limit
5. Preserve line breaks in consent preview

### 14.2 Feature Enhancements (Should Have)

1. Provider deactivation/deletion capability
2. Working settings page
3. Mobile-responsive logo handling
4. Confirmation SMS/email after submission
5. Provider annotations on submissions (notes, tags)

### 14.3 Future Considerations (Could Have)

1. Multi-practice access for practitioners
2. Patient profile updates (per-visit vs permanent)
3. PDF/CSV export improvements
4. Integration APIs for practice management systems
5. Offline form submission with sync

---

*Document generated from MVP analysis - December 2025*
