# Chkin — Architecture (Conceptual Draft)

No technical decisions have been finalized; this document captures *conceptual structure* only.

---

# 1. System Components (Conceptual)

## 1.1 Patient Interface
- Mobile-first web app for patients.  
- Entry via QR code placed at the practice reception.  
- Responsible for rendering the digital form, collecting input, and submitting to the backend.  

## 1.2 Application Backend
- Receives and validates form submissions.  
- Stores consent and patient information.  
- Provides authenticated endpoints for the practice dashboard.  
- Enforces business rules (e.g., required consent before submission is accepted).  

## 1.3 Practice Dashboard
- Web-based UI for practice staff.  
- Provides authentication and session management.  
- Displays list of submissions and allows users to drill down into detail views.  
- Provides export functionality (CSV/PDF).  

## 1.4 Data Storage Layer
- Stores patient submissions, consent records, practice profiles, and user accounts.  
- Must support per-practice data isolation (multi-tenancy).  
- Design of schema and storage technology is TBD.  

---

# 2. Data Flow (Conceptual)

```
Patient → QR → Onboarding Form → Application Backend → Data Store → Practice Dashboard → Staff
```

1. Patient scans the QR code for a specific practice.  
2. Patient’s device loads the patient-facing web form associated with that practice.  
3. Patient fills in form fields and accepts consent.  
4. Form is submitted to the backend via a secure API call.  
5. Backend validates, persists data, and associates it with the correct practice.  
6. Practice staff authenticate into the dashboard and request the list of submissions.  
7. Backend returns submissions limited to that practice.  
8. Staff may export or download a view of the data.  

---

# 3. Technology Choices (All TBD)

Claude (and the future team) must propose options for:

- **Backend:** e.g., Node.js (Express, NestJS), Python (FastAPI, Django), Go (Gin, Echo), etc.  
- **Frontend (Patient + Dashboard):** e.g., React, Vue, Svelte, Angular, or others.  
- **Mobile Strategy:** PWA-based or a shared React Native / Flutter codebase if native is needed.  
- **Database:** e.g., PostgreSQL, MySQL, or a cloud-managed database.  
- **Authentication Provider:** DIY auth vs. provider (Auth0, Cognito, etc.).  
- **Hosting:** Cloud provider (AWS/Azure/GCP/other) or PaaS (Render, Fly.io, etc.).  
- **Export Mechanism:** PDF generation service, library, or microservice.  
- **Multi-tenancy Strategy:** 
  - Row-based tenant keys in shared tables, or  
  - Schema-per-tenant (if necessary), or  
  - Hybrid strategy.  

Any final architecture should be:
- Maintainable by a small team.  
- Cost-effective for early-stage scale.  
- Secure and compliant.  
- Flexible enough to evolve as requirements grow.  

---

# 4. Security Architecture (High-Level)

Regardless of the eventual tech stack, the security model must support:

## 4.1 Tenant Isolation
- Each practice must only see its own data.  
- Staff accounts must be tied to a specific practice (or explicit multi-practice roles if needed).  

## 4.2 Access Control & Audit
- All access to patient data must be authenticated and authorized.  
- Access events should be logged with user identity, timestamp, and action.  

## 4.3 Consent Immutability
- Consent should not be silently modified after capture.  
- Changes to consent wording should be versioned and linked to when the patient accepted it.  

## 4.4 Data Protection
- Sensitive fields (e.g., ID numbers) should be protected using appropriate techniques (e.g., encryption at rest, masking in some views).  
- Transport security (HTTPS/TLS) is mandatory.  

Implementation details (e.g., which library or cloud service) will depend on the chosen architecture and are explicitly **TBD** at this stage.
