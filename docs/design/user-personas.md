# User Personas — Chkin

## Overview

Chkin has three distinct user types, each with different needs, technical sophistication, and goals. Understanding these personas is critical before designing any UI.

---

## Persona 1: Patient

### Who They Are
- **Name:** Thandi (representative)
- **Age:** 25-65 (broad range)
- **Role:** Patient checking into a healthcare practice
- **Technical Skill:** Variable — from smartphone-only users to tech-savvy professionals
- **Device:** Personal smartphone (Android or iOS)
- **Context:** Standing in a waiting room, possibly unwell, time-pressured

### Goals
1. Complete check-in form quickly
2. Understand what information is being collected and why
3. Provide consent knowingly
4. Get confirmation that submission succeeded

### Pain Points
- Unstable mobile network in waiting room
- Unfamiliar with the practice's systems
- May be feeling unwell or anxious
- Limited time before appointment
- Privacy concerns about personal health information

### Key Requirements
- **No login required** — Accessed via QR code, frictionless entry
- **Mobile-first** — Designed for phone screens
- **Offline-tolerant** — Should queue submissions if network drops
- **Clear consent** — POPIA-compliant, plain-language explanations
- **Fast** — Complete in under 3 minutes

### Authentication Model
**None required.** Patients access the form via a unique QR code link. The link contains a practice identifier. No account needed.

---

## Persona 2: Provider Staff

### Who They Are
- **Name:** Nomsa (representative)
- **Age:** 25-55
- **Role:** Receptionist, nurse, or administrative staff at a healthcare practice
- **Technical Skill:** Basic to moderate — comfortable with computers but not technical
- **Device:** Desktop computer or tablet at reception desk
- **Context:** Busy front desk, handling multiple patients, phone calls, admin tasks

### Goals
1. See new patient submissions as they arrive
2. Quickly identify which submissions need attention
3. Print or export patient information for clinical staff
4. Mark submissions as processed/reviewed

### Pain Points
- Interruptions — can't spend long on any one task
- Need to switch between multiple systems
- Not tech support — needs things to "just work"
- May share a workstation with colleagues

### Key Requirements
- **Simple login** — Email/password, nothing complex
- **Dashboard view** — At-a-glance summary of new submissions
- **Search/filter** — Find specific patients quickly
- **Clear status indicators** — What's new, what's processed
- **Works on desktop** — Not primarily mobile

### Authentication Model
**Email/password login.** Staff member accounts created by practice admin. Session persists for workday. No 2FA required for MVP (can add later).

---

## Persona 3: Provider Admin (Practice Manager)

### Who They Are
- **Name:** Dr. Mokoena (representative)
- **Age:** 35-60
- **Role:** Practice owner, office manager, or designated admin
- **Technical Skill:** Moderate — manages other systems, expects professional software
- **Device:** Desktop computer, occasionally tablet
- **Context:** Managing the practice, concerned with compliance, efficiency, patient experience

### Goals
1. Set up and configure Chkin for their practice
2. Manage staff access (add/remove users)
3. Customize the patient form for their practice
4. Generate QR codes for waiting room
5. Ensure POPIA compliance — audit trails, consent records
6. View analytics on submissions

### Pain Points
- Time-poor — wearing many hats
- Accountable for compliance failures
- Needs to train staff on new systems
- May not be present daily to troubleshoot

### Key Requirements
- **Secure login** — Email/password, clear session management
- **User management** — Add/remove staff, assign roles
- **Form customization** — Add fields relevant to their practice
- **QR code generation** — Download/print codes
- **Audit logs** — View who accessed what, when
- **Settings** — Practice name, logo, contact info

### Authentication Model
**Email/password login** with elevated privileges. Same login flow as staff, but role grants access to admin features. Consider 2FA for admin accounts in future.

---

## Persona 4: Platform Admin

### Who They Are
- **Name:** System Administrator (internal)
- **Age:** N/A (technical role)
- **Role:** Manages the Chkin platform itself — onboards new practices, technical support
- **Technical Skill:** High — developer or technical operations
- **Device:** Desktop
- **Context:** Internal operations, not customer-facing

### Goals
1. Onboard new practices
2. Monitor system health
3. Support troubleshooting
4. Manage platform-wide settings

### Key Requirements
- **Secure login** — Strong authentication
- **Multi-tenant view** — See all practices
- **Impersonation** — Debug issues as a specific practice (audit logged)
- **System metrics** — Usage, errors, performance

### Authentication Model
**Email/password** with mandatory 2FA (future). Platform admin is a special role, not tied to any practice.

---

## Summary: Login Requirements by Persona

| Persona | Login Required? | Method | Redirect After Login |
|---------|-----------------|--------|---------------------|
| **Patient** | No | QR code link | N/A — goes directly to form |
| **Provider Staff** | Yes | Email/password | `/provider` dashboard |
| **Provider Admin** | Yes | Email/password | `/provider` dashboard (with admin features) |
| **Platform Admin** | Yes | Email/password + 2FA (future) | `/admin` console |

---

## Key Insight: Patients Don't Login

The current implementation has a `/patient` portal that requires authentication (via middleware). This is **incorrect**.

**Patients should:**
1. Scan a QR code in the waiting room
2. Land on a form page directly (e.g., `/form/[practiceId]`)
3. Fill out and submit without creating an account
4. Optionally receive a confirmation email/SMS

**The `/patient` route should probably be removed or repurposed** — perhaps for returning patients who want to view their submission history (but this is not MVP).

---

## Next Steps

1. Document user flows for each persona
2. Create wireframes for:
   - Staff/Admin login (single login page, role determines features)
   - Patient form (QR → form → submit → confirmation)
   - Provider dashboard
3. Remove authentication requirement from patient flow
