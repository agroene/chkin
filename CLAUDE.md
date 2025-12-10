# CLAUDE.md — Context for AI Coding Assistants

This file provides all context needed for Claude Code to continue building Chkin.

---

# 1. Project Overview
Chkin is a healthcare digital onboarding system. The main function is to allow patients to submit personal details, medical-aid information, consent, and next-of-kin information via a mobile-friendly digital form, accessed primarily through a QR code in the waiting room.

A practice-facing dashboard allows staff to view submitted forms.

---

# 2. Current State

## 2.1 What's Built
- **Next.js 16** app with TypeScript, Tailwind CSS, ESLint
- **Three-portal route structure**: `/patient`, `/provider`, `/admin`
- **PostgreSQL + Prisma** configured (schema empty, ready for models)
- **Docker** configuration for portable deployment
- Landing page with portal navigation
- GitHub repo: https://github.com/agroene/chkin

## 2.2 Project Structure
```
app/
├── src/app/
│   ├── (admin)/admin/page.tsx      # Admin Console placeholder
│   ├── (patient)/patient/page.tsx  # Patient Portal placeholder
│   ├── (provider)/provider/page.tsx # Provider Portal placeholder
│   ├── layout.tsx                   # Root layout
│   ├── page.tsx                     # Landing page
│   └── globals.css
├── prisma/schema.prisma             # Empty, ready for models
├── docker-compose.yml               # PostgreSQL service
├── Dockerfile                       # Production build
└── .env.example                     # Environment template
```

## 2.3 Tech Stack (Decided)
| Layer     | Choice                   |
|-----------|--------------------------|
| Runtime   | Node.js + TypeScript     |
| Framework | Next.js 16 (App Router)  |
| Database  | PostgreSQL               |
| ORM       | Prisma                   |
| Styling   | Tailwind CSS             |
| Auth      | TBD (evaluating options) |

---

# 3. Next Steps

## 3.1 Immediate: Authentication
Evaluate open source auth providers. Requirements:
- Multi-tenant (multiple practices)
- Role-based (admin, provider staff, provider admin)
- POPIA-compliant (audit logs)
- Self-hosted option (no vendor lock-in)
- No custom auth code

Options to evaluate:
- Better Auth
- Auth.js (NextAuth)
- Keycloak
- Supabase Auth

## 3.2 After Auth
1. Static patient form submission → stored in DB
2. Provider dashboard → view submissions
3. Dynamic form builder (admin field library)
4. QR code generation
5. Consent management with audit logging

---

# 4. Key Design Decisions

## 4.1 Decided
- Rebuild from scratch (no access to original MVP code)
- Replicate functionality of MVP at **www.chkin.co.za**
- POPIA-compliant handling is non-negotiable
- Dynamic field library (admin can define new fields for providers)
- Database schema grows incrementally with features

## 4.2 Architecture Principles
- Monorepo: Single Next.js app with route groups for portals
- Dynamic fields via JSONB in PostgreSQL
- Static core tables for users, providers, consents, audit logs
- API routes within Next.js (can extract later if needed)

---

# 5. Constraints

## 5.1 Regulatory
- POPIA compliance
- Sensitive personal information (PHI) must be handled securely
- Consent must be explicit and logged
- Access to patient data must be auditable

## 5.2 Operational
- Practices have minimal IT sophistication
- Must work on unstable mobile networks
- QR onboarding must work instantly

---

# 6. Reference Documentation
- `docs/mvp-analysis.md` — Comprehensive analysis of existing MVP
- `.handoff.md` — Original project handoff context

---

# 7. Commands

```bash
# Start PostgreSQL (requires Docker)
cd app && docker-compose up db -d

# Run dev server
cd app && npm run dev

# Build for production
cd app && npm run build
```
