# Authentication Flows — Chkin

**Status:** Approved
**Last Updated:** 2025-12-11

---

## Overview

Chkin has three portals with two distinct registration paths, unified by a single login page.

### Portals
| Portal | Route | Users |
|--------|-------|-------|
| User Portal | `/patient` | Patients, general users |
| Provider Portal | `/provider` | Healthcare practices (approved) |
| System Admin Portal | `/admin` | Platform administrators |

### Registration Paths
| Path | Route | Approval Required | Email Verification |
|------|-------|-------------------|-------------------|
| Standard User | `/register` | No | Yes |
| Provider | `/provider/register` | Yes (by system admin) | Yes |

---

## Flow 1: Standard User Registration

### Route: `/register`

```
[User visits /register]
         │
         ▼
┌─────────────────────────────────────────┐
│  User Registration                      │
│  ─────────────────────────────────────  │
│  Full Name: [________________]          │
│  Email: [________________]              │
│                                         │
│  [Create Account]                       │
│                                         │
│  "Already have an account? Sign in"     │
│  "Are you a healthcare provider?        │
│   Register your practice"               │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Check Your Email                       │
│  ─────────────────────────────────────  │
│  "We've sent a verification link to     │
│   [email@example.com]"                  │
│                                         │
│  "Click the link to set your password   │
│   and complete registration."           │
│                                         │
│  [Resend Email]                         │
└─────────────────────────────────────────┘
         │
         │ User clicks email link
         ▼
┌─────────────────────────────────────────┐
│  Set Your Password                      │
│  ─────────────────────────────────────  │
│  Password: [________________]           │
│  Confirm Password: [________________]   │
│                                         │
│  • Minimum 12 characters                │
│                                         │
│  [Complete Registration]                │
└────────┬────────────────────────────────┘
         │
         ▼
[Account created, auto-login]
[Redirect to /patient]
```

### Database Records Created
- `User` record (emailVerified: true)
- `Account` record (credential provider)
- `Session` record

---

## Flow 2: Provider Registration

### Route: `/provider/register`

```
[Provider visits /provider/register]
         │
         ▼
┌─────────────────────────────────────────┐
│  Provider Registration                  │
│  ─────────────────────────────────────  │
│  "Join the Chkin platform to            │
│   streamline patient data collection"   │
│                                         │
│  Practice Name *: [________________]    │
│  Practice Number: [________________]    │
│                                         │
│  Email Address *: [________________]    │
│  Phone Number *: [________________]     │
│                                         │
│  Industry Type *: [Select Industry ▼]   │
│    - General Practice                   │
│    - Specialist                         │
│    - Dental                             │
│    - Pharmacy                           │
│    - Other                              │
│                                         │
│  Address *: [________________] (autocomplete)
│  City *: [________________]             │
│  Postal Code *: [________________]      │
│                                         │
│  Website: [________________]            │
│                                         │
│  [Submit Registration]                  │
│                                         │
│  "Already registered? Sign in"          │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Check Your Email                       │
│  ─────────────────────────────────────  │
│  "We've sent a verification link to     │
│   [email@practice.com]"                 │
│                                         │
│  "Click the link to verify your email   │
│   and set your password."               │
│                                         │
│  [Resend Email]                         │
└─────────────────────────────────────────┘
         │
         │ User clicks email link
         ▼
┌─────────────────────────────────────────┐
│  Set Your Password                      │
│  ─────────────────────────────────────  │
│  Password: [________________]           │
│  Confirm Password: [________________]   │
│                                         │
│  • Minimum 12 characters                │
│                                         │
│  [Complete Registration]                │
└────────┬────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────┐
│  Registration Submitted                 │
│  ─────────────────────────────────────  │
│  ✓ Your account has been created        │
│                                         │
│  "Your practice registration is         │
│   pending approval by our team.         │
│   You'll receive an email once          │
│   approved."                            │
│                                         │
│  "You can sign in to check your         │
│   approval status."                     │
│                                         │
│  [Go to Sign In]                        │
└─────────────────────────────────────────┘
```

### Provider Pending State

When a provider logs in before approval:

```
┌─────────────────────────────────────────┐
│  Approval Pending                       │
│  ─────────────────────────────────────  │
│  ⏳ Your practice registration is       │
│     under review                        │
│                                         │
│  Practice: [Practice Name]              │
│  Submitted: [Date]                      │
│                                         │
│  "Our team is reviewing your            │
│   registration. You'll receive an       │
│   email once approved."                 │
│                                         │
│  "Need help? Contact support@chkin.co.za"
│                                         │
│  [Sign Out]                             │
└─────────────────────────────────────────┘
```

### Database Records Created
- `User` record (emailVerified: true)
- `Account` record (credential provider)
- `Organization` record (status: pending)
- `Member` record (role: provider_admin, userId, organizationId)

---

## Flow 3: Login (All Users)

### Route: `/login`

```
[User visits /login]
         │
         ▼
┌─────────────────────────────────────────┐
│  Sign In                                │
│  ─────────────────────────────────────  │
│  Chkin logo                             │
│                                         │
│  Email: [________________]              │
│  Password: [________________]           │
│                                         │
│  [Sign In]                              │
│                                         │
│  "Forgot password?"                     │
│                                         │
│  ─────────────────────────────────────  │
│  "Don't have an account?"               │
│  [Register as User] | [Register Practice]
└────────┬────────────────────────────────┘
         │
         ├─── Invalid credentials ──→ "Invalid email or password"
         │
         ├─── Email not verified ──→ "Please verify your email first"
         │                           [Resend verification]
         │
         ▼ (Success)
         │
         ├─── User is provider (pending) ──→ /provider/pending
         │
         ├─── User is provider (approved) ──→ /provider
         │
         ├─── User is system admin ──→ /patient (with admin nav option)
         │
         └─── User is regular user ──→ /patient
```

### Post-Login Redirect Logic
```typescript
function getRedirectPath(user: User, member?: Member): string {
  // Check if user is a provider
  if (member?.role === 'provider_admin' || member?.role === 'provider_staff') {
    const org = member.organization;
    if (org.status === 'pending') {
      return '/provider/pending';
    }
    if (org.status === 'approved') {
      return '/provider';
    }
    if (org.status === 'rejected') {
      return '/provider/rejected';
    }
  }

  // Regular users go to patient portal
  return '/patient';
}
```

---

## Flow 4: System Admin — Provider Approval

### Route: `/admin/providers`

```
[Admin logs in → sees notification badge]
         │
         ▼
┌─────────────────────────────────────────┐
│  System Admin Dashboard                 │
│  ─────────────────────────────────────  │
│  [Providers (3)] ← notification badge   │
│  [Users]                                │
│  [Settings]                             │
└────────┬────────────────────────────────┘
         │ Click Providers
         ▼
┌─────────────────────────────────────────┐
│  Provider Management                    │
│  ─────────────────────────────────────  │
│  [Pending (3)] [Approved] [Rejected]    │
│                                         │
│  ┌─────────────────────────────────┐   │
│  │ City Medical Practice           │   │
│  │ General Practice | Cape Town    │   │
│  │ Submitted: 2024-12-11           │   │
│  │ [View] [Approve] [Reject]       │   │
│  └─────────────────────────────────┘   │
│  ┌─────────────────────────────────┐   │
│  │ Health First Dental             │   │
│  │ Dental | Johannesburg           │   │
│  │ Submitted: 2024-12-10           │   │
│  │ [View] [Approve] [Reject]       │   │
│  └─────────────────────────────────┘   │
└─────────────────────────────────────────┘
```

### Approval Actions
- **Approve** → Organization status = 'approved', email sent to provider
- **Reject** → Organization status = 'rejected', email sent with reason

---

## Email Templates Required

| Email | Trigger | Content |
|-------|---------|---------|
| Verify Email | Registration (both paths) | Link to set password |
| Provider Pending | Provider registration complete | "Under review" confirmation |
| Provider Approved | Admin approves | "You're approved, sign in" |
| Provider Rejected | Admin rejects | "Rejected" + reason |
| New Provider Notification | Provider registers | To admin: "New provider to review" |
| Password Reset | User requests | Link to reset password |

---

## Address Autocomplete

Use **Nominatim (OpenStreetMap)** for zero-cost address autocomplete.

- API: `https://nominatim.openstreetmap.org/search`
- Limit to South Africa: `&countrycodes=za`
- Free, no API key required
- Rate limit: 1 request/second (add debounce)

---

## Database Schema Changes Required

### Organization Model (update)
```prisma
model Organization {
  // ... existing fields
  status        String   @default("pending") // pending, approved, rejected
  practiceNumber String?
  phone         String?
  industryType  String?
  address       String?
  city          String?
  postalCode    String?
  website       String?
  rejectionReason String?
  approvedAt    DateTime?
  approvedBy    String?  // userId of admin who approved
}
```

### User Model (update)
```prisma
model User {
  // ... existing fields
  isSystemAdmin Boolean @default(false)
}
```

---

## Implementation Priority

1. **Phase 1: Registration & Login**
   - [ ] User registration (`/register`)
   - [ ] Provider registration (`/provider/register`)
   - [ ] Email verification flow
   - [ ] Set password page
   - [ ] Login page (`/login`)
   - [ ] Post-login redirect logic

2. **Phase 2: Provider Status**
   - [ ] Provider pending page (`/provider/pending`)
   - [ ] Provider rejected page (`/provider/rejected`)

3. **Phase 3: Admin Approval**
   - [ ] Admin provider list (`/admin/providers`)
   - [ ] Approve/reject actions
   - [ ] Email notifications

4. **Phase 4: Address Autocomplete**
   - [ ] Nominatim integration
   - [ ] Autocomplete component
