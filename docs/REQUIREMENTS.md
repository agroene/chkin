# Chkin — Requirements Specification

This document defines WHAT the system must do, without deciding HOW it will be built.

---

# 1. Functional Requirements

## 1.1 Patient Check-In
- System must allow a patient to onboard via QR code.  
- Patient form must include at least:
  - Personal details (name, surname, date of birth, ID/passport, sex)  
  - Contact information (cell number, email, address)  
  - Medical aid details (scheme, plan, member number, main member ID, dependent code, gap cover yes/no)  
  - Next of kin details (name, relationship, contact number)  
  - Person responsible for account (if different from patient)  
- Form must validate required fields and show clear error messages.  
- Form submission must be stored securely.  
- Patient must not require login to complete the form.  

## 1.2 Consent Collection
- POPIA-compliant consent text must be displayed before or at submission.  
- Patient must explicitly accept consent (e.g., checkbox or digital acknowledgement).  
- Consent must be stored with:
  - Timestamp  
  - Practice identifier  
  - Patient identifier (or submission identifier)  
- Consent record must be retrievable for audit/legal purposes.  

## 1.3 Practice Dashboard
- Practice staff must authenticate to access the dashboard.  
- Authenticated staff can:
  - View list of recent submissions (e.g., per day, per date range).  
  - Filter/search by patient name, date, or ID number.  
  - Open a submission to view full details.  
  - Export or download submission data (e.g., CSV, PDF).  
- Staff must NOT see submissions belonging to another practice.  
- Dashboard should provide a high-level overview of daily/weekly check-ins.  

## 1.4 Multi-device Access
- All patient-facing components must work on modern mobile browsers (iOS and Android).  
- Dashboard must work on modern desktop browsers (Chrome, Edge, Safari, Firefox).  

## 1.5 Multi-language Support
- System must support English and Afrikaans initially.  
- Language switching or detection must be clear and intuitive.  
- Additional languages must be easy to add without redesigning the system.  

---

# 2. Non-Functional Requirements

## 2.1 Security
- POPIA compliance is required.  
- Access to PHI must be strictly controlled and logged.  
- Patient submissions must be stored securely (encryption or other controls to be decided in architecture).  
- Staff access must be restricted to their own practice’s data only.  
- Mechanisms must exist to revoke access for staff who leave the practice.  

## 2.2 Performance
- Patient form page should load within 2 seconds on a typical mobile data connection.  
- Form submission should complete (server-side processing) within 1 second on average.  
- Dashboard should display a practice’s daily submissions without noticeable lag (e.g., up to 300 submissions/day).  

## 2.3 Reliability & Availability
- Target system availability: ≥ 99.5% (conceptual, exact SLO can be refined later).  
- System must degrade gracefully during partial outages, providing clear error messages.  
- Data must not be lost during transient failures; retry patterns should be considered.  

## 2.4 Usability
- Patient form UX must be simple, clear, and mobile-first.  
- Labels, placeholders, and validation messages must be understandable by non-technical users.  
- Dashboard UX must be intuitive enough that reception/admin staff can use it with minimal training.  

## 2.5 Scalability
- System must support multiple independent practices (multi-tenant).  
- Architecture must allow adding more practices without re-architecting the system.  

---

# 3. User Stories

## 3.1 Patients
- *As a patient, I want to fill in my details quickly on my phone so that I don’t have to complete paper forms in the waiting room.*  
- *As a patient, I want to clearly understand what I am consenting to so that I feel safe sharing my personal and medical information.*  

## 3.2 Reception Staff
- *As a receptionist, I want to see completed patient forms digitally so that I don’t have to re-capture information into our systems.*  
- *As a receptionist, I want to quickly confirm that a patient has completed the form before the consultation starts.*  

## 3.3 Practice Admin / Billing
- *As an admin, I want reliable and complete patient details and consent stored in one place so that I can process billing and handle queries confidently.*  
- *As an admin, I want to export patient information into our billing or practice management system so that I can avoid duplication of work.*  

## 3.4 Founder / Product Owner
- *As the founder, I want a locally owned and maintainable implementation of Chkin so that I am not dependent on an external outsourced vendor.*  
- *As the founder, I want the rebuilt system to match or exceed the functionality of the current MVP at www.chkin.co.za.*  

---

# 4. Acceptance Criteria

## 4.1 Form Submission
- All required fields must be validated on the client side and/or server side.  
- Consent must be explicitly acknowledged; the form cannot be submitted without it.  
- Successful submission results in:
  - Data stored safely in the backend.  
  - A clear success message to the patient.  
- Practice staff can see the new submission appear in the dashboard shortly after submission.  

## 4.2 Dashboard
- Staff must provide valid credentials to access the dashboard.  
- Only submissions for that practice are visible to its staff.  
- Staff can open any listed submission and see all form fields as submitted.  
- Export to CSV or PDF provides complete and accurate data.  

## 4.3 Security
- Access control is enforced in a way that prevents cross-practice data exposure.  
- All access to patient submissions is logged (who accessed what and when), at least at the backend level.  
- Consent records are stored in a way that they cannot be silently altered after the fact (immutability or versioning strategy).  
