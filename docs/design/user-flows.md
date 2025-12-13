# User Flows — Chkin

## Overview

This document describes the step-by-step flows for each user type. These flows should be approved before implementation.

---

## Flow 1: Patient Check-in (MVP Core Feature)

### Context
Patient is in the waiting room, scans a QR code on a poster/stand.

### Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     PATIENT CHECK-IN FLOW                        │
└─────────────────────────────────────────────────────────────────┘

[Physical QR Code in Waiting Room]
         │
         ▼
┌─────────────────┐
│  Scan QR Code   │ ← Phone camera app
│  (No app needed)│
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Landing Page: /form/[practiceSlug]     │
│  ─────────────────────────────────────  │
│  "Welcome to [Practice Name]"           │
│  "Please complete your check-in form"   │
│                                         │
│  [Start Check-in] button                │
│                                         │
│  Practice logo, contact info            │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 1: Personal Details               │
│  ─────────────────────────────────────  │
│  • Full name (required)                 │
│  • ID number / Passport (required)      │
│  • Date of birth (required)             │
│  • Phone number (required)              │
│  • Email (optional)                     │
│                                         │
│  [Next] button                          │
│  Progress: ●○○○                         │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 2: Medical Aid (if applicable)    │
│  ─────────────────────────────────────  │
│  • Do you have medical aid? [Yes/No]    │
│                                         │
│  If Yes:                                │
│  • Medical aid name                     │
│  • Plan/option                          │
│  • Member number                        │
│  • Main member name (if dependent)      │
│                                         │
│  [Back] [Next]                          │
│  Progress: ●●○○                         │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 3: Next of Kin / Emergency        │
│  ─────────────────────────────────────  │
│  • Contact name (required)              │
│  • Relationship (required)              │
│  • Phone number (required)              │
│                                         │
│  [Back] [Next]                          │
│  Progress: ●●●○                         │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Step 4: Consent                        │
│  ─────────────────────────────────────  │
│  POPIA Notice (expandable):             │
│  "We collect your information to..."    │
│                                         │
│  □ I consent to the collection and      │
│    processing of my personal info...    │
│                                         │
│  □ I confirm the information I have     │
│    provided is accurate                 │
│                                         │
│  [Back] [Submit]                        │
│  Progress: ●●●●                         │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Confirmation Screen                    │
│  ─────────────────────────────────────  │
│  ✓ Check-in Complete                    │
│                                         │
│  "Thank you, [Name]"                    │
│  "Your information has been submitted"  │
│  "Please wait to be called"             │
│                                         │
│  Reference: CHK-2024-XXXXX              │
│                                         │
│  [Done] ← closes/redirects              │
└─────────────────────────────────────────┘
```

### Error States

| Scenario | Handling |
|----------|----------|
| Invalid QR / practice not found | "This link is invalid. Please ask reception for assistance." |
| Network error during form | Save locally, retry submission automatically |
| Submission fails | "We couldn't submit your form. [Retry] or ask reception." |
| Validation errors | Inline errors below each field, scroll to first error |

### Loading States

| Scenario | Display |
|----------|---------|
| Page loading | Skeleton with practice branding |
| Submitting form | Button shows spinner, "Submitting..." |
| Network retry | Toast: "Reconnecting..." |

---

## Flow 2: Staff Login & Dashboard

### Context
Receptionist arrives at work, opens Chkin on their desktop to view patient submissions.

### Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                     STAFF LOGIN FLOW                             │
└─────────────────────────────────────────────────────────────────┘

[Staff navigates to chkin.co.za/login]
         │
         ▼
┌─────────────────────────────────────────┐
│  Login Page                             │
│  ─────────────────────────────────────  │
│  Chkin logo                             │
│                                         │
│  Email: [________________]              │
│  Password: [________________]           │
│                                         │
│  [Sign in] button                       │
│                                         │
│  "Forgot password?" link                │
│                                         │
│  ─────────────────────────────────────  │
│  "Healthcare staff only. Patients       │
│   check in via QR code in the           │
│   waiting room."                        │
└────────┬────────────────────────────────┘
         │
         ├─── Invalid credentials ──→ "Invalid email or password"
         │                            [Retry]
         │
         ├─── Account locked ──→ "Account locked. Contact admin."
         │
         ▼ (Success)
┌─────────────────────────────────────────┐
│  Provider Dashboard                     │
│  ─────────────────────────────────────  │
│  Header: Chkin | [Practice Name] | [Nomsa ▼]
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ Today's Submissions        [12] │   │
│  │ ─────────────────────────────── │   │
│  │ ● New    Thandi M.    09:45    │   │
│  │ ● New    John S.      09:32    │   │
│  │ ○ Viewed  Sarah K.    09:15    │   │
│  │ ...                             │   │
│  └─────────────────────────────────┘   │
│                                         │
│  [Search] [Filter: All/New/Viewed]      │
└─────────────────────────────────────────┘
```

### Session Handling

| Scenario | Behavior |
|----------|----------|
| Session valid | Skip login, go directly to dashboard |
| Session expired | Redirect to login with message "Session expired" |
| Remember me | Session lasts 30 days (cookie) |
| Logout | Clear session, redirect to login |

### Error States

| Scenario | Handling |
|----------|----------|
| Wrong password | "Invalid email or password" (generic for security) |
| 5 failed attempts | Lock account for 15 minutes |
| Network error | "Unable to connect. Check your internet connection." |
| Server error | "Something went wrong. Please try again." |

---

## Flow 3: Provider Admin — User Management

### Context
Practice manager needs to add a new staff member.

### Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                 ADMIN: ADD STAFF MEMBER                          │
└─────────────────────────────────────────────────────────────────┘

[Admin logged in, navigates to Settings > Team]
         │
         ▼
┌─────────────────────────────────────────┐
│  Team Management                        │
│  ─────────────────────────────────────  │
│  [+ Invite Team Member]                 │
│                                         │
│  Current Team:                          │
│  ┌─────────────────────────────────┐   │
│  │ Dr. Mokoena    Admin    Active  │   │
│  │ Nomsa M.       Staff    Active  │   │
│  │ John D.        Staff    Pending │   │
│  └─────────────────────────────────┘   │
└────────┬────────────────────────────────┘
         │ Click [+ Invite]
         ▼
┌─────────────────────────────────────────┐
│  Invite Team Member (Modal)             │
│  ─────────────────────────────────────  │
│  Email: [________________]              │
│  Role:  [Staff ▼]                       │
│         • Staff — View submissions      │
│         • Admin — Full access           │
│                                         │
│  [Cancel] [Send Invitation]             │
└────────┬────────────────────────────────┘
         │
         ▼
[Email sent to invitee]
[Invitee clicks link → Registration page]
[Sets password → Logged in to dashboard]
```

---

## Flow 4: Platform Admin — Practice Onboarding

### Context
Chkin internal admin onboarding a new healthcare practice.

### Flow (Simplified)

```
[Platform Admin logs in to /admin]
         │
         ▼
┌─────────────────────────────────────────┐
│  Platform Admin Console                 │
│  ─────────────────────────────────────  │
│  Practices: 47 active                   │
│  [+ Add Practice]                       │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ City Medical     Active   45 sub│   │
│  │ Health First     Active   23 sub│   │
│  │ ...                             │   │
│  └─────────────────────────────────┘   │
└────────┬────────────────────────────────┘
         │ Click [+ Add Practice]
         ▼
┌─────────────────────────────────────────┐
│  Create Practice                        │
│  ─────────────────────────────────────  │
│  Practice Name: [________________]      │
│  Slug: [________________] (auto-gen)    │
│  Admin Email: [________________]        │
│                                         │
│  [Cancel] [Create & Invite Admin]       │
└─────────────────────────────────────────┘
         │
         ▼
[Practice created]
[Invitation email sent to practice admin]
```

---

## Key Decisions to Confirm

Before implementing, please confirm:

1. **Patient flow has NO login** — Correct?
2. **Single login page for staff/admin** — Role determines what they see?
3. **Invitation-based registration** — Staff don't self-register?
4. **Platform admin is separate** — Different console at `/admin`?
5. **Forgot password flow** — Email-based reset?

---

## Wireframe Requirements

Based on these flows, we need wireframes for:

1. **Patient Form** (multi-step)
   - Landing/welcome screen
   - Each form step
   - Confirmation screen
   - Error states

2. **Login Page**
   - Email/password form
   - Error states
   - "Forgot password" flow

3. **Provider Dashboard**
   - Submission list
   - Submission detail view
   - Search/filter

4. **Admin Settings**
   - Team management
   - Practice settings
   - QR code generation

5. **Platform Admin Console** (lower priority)
   - Practice list
   - Create practice form
