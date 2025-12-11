# CLAUDE.md — Context for AI Coding Assistants

This file provides all context needed for Claude Code to continue building Chkin.

## Session Continuity (READ FIRST)

**Before starting any work, check for active session state:**

1. **Check `.handoff.md`** in project root (if exists)
   - If `Last Updated` < 4 hours ago → Offer to continue previous session
   - If stale → Summarise what was in progress, ask if still relevant

2. **Check recent git history**
   ```bash
   git log --oneline -10
   git status
   ```

3. **When ending a session**, update `.handoff.md` with:
   - What was accomplished
   - What's in progress
   - Files modified
   - Next steps

4. **Check `GAP-ANALYSIS.md`** for tracked improvements
   - If you completed any items listed there, update the document
   - Mark completed items with ✅ and date
   - Update the "Overall Score" if significant progress was made
   - Check GitHub Issues for tracked gaps: `gh issue list --label "gap"`

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

# 5. Constraints & Guidelines

## 5.1 Regulatory
- POPIA compliance
- Sensitive personal information (PHI) must be handled securely
- Consent must be explicit and logged
- Access to patient data must be auditable

## 5.2 Operational
- Practices have minimal IT sophistication
- Must work on unstable mobile networks
- QR onboarding must work instantly

### 5.3 Must Do
- Run tests before deploying changes
- Commit with meaningful messages (feat:, fix:, docs:, chore:)
- Update this file when adding significant features

### 5.4 Must Not Do
- Commit `.env` or secrets
- Push directly to production without testing
- Modify database schema without migration plan

### 5.5 Sensitive Data
- `.env` contains API keys — never commit
- Database contains personal transaction data
- Card numbers partially visible in `users` table

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
---

## Development Standards (14-Point Checklist)

All development on this project must adhere to these principles:

### 1. Plan Before Programming
- No coding without clear requirements
- Document decisions in this file or docs/
- Create architecture sketches before implementation

### 2. Keep It Simple (KISS)
- Prefer simple solutions over clever ones
- New developers should understand code in < 30 mins
- Avoid unnecessary abstractions

### 3. Don't Repeat Yourself (DRY)
- Extract common logic into shared utilities
- Centralise configuration
- Single source of truth for constants

### 4. You Aren't Gonna Need It (YAGNI)
- Only build what's immediately needed
- No "future-proofing" without clear requirements
- Remove dead code promptly

### 5. SOLID Principles
- **Single Responsibility:** One reason to change per module
- **Open/Closed:** Extend via composition, not modification
- **Liskov Substitution:** Subtypes must honor parent contracts
- **Interface Segregation:** Small, focused interfaces
- **Dependency Inversion:** Depend on abstractions

### 6. Version Control
- Meaningful commit messages (feat:, fix:, docs:, chore:)
- Feature branches for new work
- Never commit secrets or credentials

### 7. Automated Testing
- Write tests for new features
- Minimum: happy path + major edge cases
- Tests must pass before merging

### 8. Clean, Readable Code
- Meaningful names for variables, functions, files
- Functions < 50 lines
- Consistent formatting (use project linters)

### 9. Security First
- Validate all inputs
- Secrets in environment variables only
- PHI/PII handling per compliance requirements
- Regular dependency updates

### 10. Performance Awareness
- No N+1 queries
- Pagination for large datasets
- Cache where appropriate
- Profile before optimising

### 11. Continuous Refactoring
- Leave code better than you found it
- Track tech debt in TODO.md
- Regular cleanup sprints

### 12. Error Handling
- Graceful error handling, no crashes
- Helpful error messages
- Structured logging
- Log context for debugging

### 13. CI/CD
- Automated tests on push
- Linting enforced
- Automated deployments (when ready)

### 14. Documentation
- README.md: Getting started
- CLAUDE.md: AI assistant context
- API documentation
- Update docs when code changes

---

## Code Review Checklist

Before committing, verify:
- [ ] Does this follow KISS? Is there a simpler way?
- [ ] Any duplicated code that should be extracted?
- [ ] Am I building something not yet needed?
- [ ] Are there tests for new functionality?
- [ ] Are error cases handled?
- [ ] Is this secure? Inputs validated? No hardcoded secrets?
- [ ] Is the code readable without comments explaining "what"?
- [ ] Documentation updated if needed?