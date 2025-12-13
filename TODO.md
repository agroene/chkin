# Technical Debt & Future Work

This file tracks known technical debt, incomplete features, and future improvements.

---

## High Priority

### Security
- [ ] Resolve npm audit high severity vulnerability (detected 2025-12-13)
- [ ] Add rate limiting to auth endpoints
- [ ] Implement CSRF protection validation
- [ ] Add input sanitization middleware
- [ ] Set up Content Security Policy headers

### Testing
- [ ] Set up Jest/Vitest test framework
- [ ] Add unit tests for auth-utils.ts functions
- [ ] Add integration tests for auth flows
- [ ] Add E2E tests for critical user journeys

### CI/CD
- [ ] Add GitHub Actions workflow for linting
- [ ] Add GitHub Actions workflow for type checking
- [ ] Add GitHub Actions workflow for tests
- [ ] Set up pre-commit hooks (Husky + lint-staged)

---

## Medium Priority

### Authentication Enhancements
- [ ] Implement password reset flow
- [ ] Add session revocation endpoint
- [ ] Add account lockout after failed attempts

### Audit & Compliance
- [ ] Integrate audit logging into all mutations
- [ ] Add IP address and user agent capture to audit logs
- [ ] Implement data retention policies
- [ ] Add consent withdrawal flow

### Developer Experience
- [ ] Add API documentation (OpenAPI/Swagger)
- [ ] Add database seeding scripts
- [ ] Create development environment setup script
- [ ] Add structured logging (replace console.error)
- [ ] Fix sessionStorage limitation in provider registration (form data lost if email verified in different browser/device)
- [ ] Resolve multiple lockfile warnings (Turbopack root configuration)
- [ ] Migrate middleware to "proxy" convention (Next.js 16 deprecation)

---

## Low Priority

### Performance
- [ ] Add Redis caching layer
- [ ] Implement database query optimization
- [ ] Add response compression
- [ ] Set up CDN for static assets

### Monitoring
- [ ] Add health check endpoints
- [ ] Set up error tracking (Sentry or similar)
- [ ] Add performance monitoring
- [ ] Create operational dashboards

---

## Known Issues

1. **Middleware doesn't validate session tokens** — Currently only checks cookie existence, not validity. Detailed auth checks happen in API routes.

2. **Audit logging not integrated** — `logAuditEvent` function exists but not called from mutations yet.

3. **sessionStorage data loss in provider registration** — Form data stored in sessionStorage (line 146 in provider/register/page.tsx) is lost if user verifies email in different browser/device. Consider storing in database instead.

4. **Multiple lockfiles warning** — Turbopack detects multiple `package-lock.json` files causing build warnings. Need to consolidate or set `turbopack.root` in next.config.js.

5. **Next.js middleware deprecation** — Middleware file convention is deprecated. Next.js 16+ recommends using "proxy" instead (see warning at build time).

---

## Completed

- [x] Consolidate database code (single source of truth in db.ts)
- [x] Add BETTER_AUTH_SECRET to auth configuration
- [x] Fix edge runtime compatibility in middleware
- [x] Add comprehensive JSDoc to auth utilities
- [x] Implement Resend email service for verification emails (2025-12-13)
