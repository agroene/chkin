# DocuSeal Integration - Implementation Plan

## Overview

Integrate self-hosted DocuSeal to enable providers to:
1. Upload PDF forms and configure field mappings
2. Auto-populate forms with patient data from Chkin submissions
3. Collect legally binding e-signatures from patients

## Architecture

### Deployment Model
- **Self-hosted** DocuSeal instance (Docker)
- **Single platform account** for all providers
- **Per-form configuration** by providers when creating forms

### Data Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                          PROVIDER FLOW                               │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Provider creates form in Chkin Form Builder                      │
│                     │                                                │
│                     ▼                                                │
│  2. Provider enables "PDF Document" option                           │
│                     │                                                │
│                     ▼                                                │
│  3. DocuSeal Builder embeds (upload PDF, place signature fields)     │
│                     │                                                │
│                     ▼                                                │
│  4. Provider maps Chkin fields → DocuSeal placeholders               │
│                     │                                                │
│                     ▼                                                │
│  5. FormTemplate saved with docusealTemplateId + mappings            │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│                          PATIENT FLOW                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  1. Patient scans QR, fills Chkin form fields                        │
│                     │                                                │
│                     ▼                                                │
│  2. If form has PDF: show DocuSeal Form embed                        │
│                     │                                                │
│                     ▼                                                │
│  3. Chkin API creates DocuSeal submission with pre-filled values     │
│                     │                                                │
│                     ▼                                                │
│  4. Patient reviews pre-filled PDF, signs                            │
│                     │                                                │
│                     ▼                                                │
│  5. DocuSeal webhook notifies Chkin of completion                    │
│                     │                                                │
│                     ▼                                                │
│  6. Chkin stores signed PDF URL in Submission record                 │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Phase 1: Infrastructure Setup

### 1.1 Docker Compose Update

Add DocuSeal service to `app/docker-compose.yml`:

```yaml
services:
  docuseal:
    image: docuseal/docuseal:latest
    container_name: chkin-docuseal
    ports:
      - "3001:3000"
    environment:
      - DATABASE_URL=postgresql://postgres:postgres@db:5432/docuseal
      - SECRET_KEY_BASE=${DOCUSEAL_SECRET_KEY}
    depends_on:
      - db
    volumes:
      - docuseal_data:/data

volumes:
  docuseal_data:
```

### 1.2 Environment Variables

Add to `.env.example`:

```bash
# DocuSeal Configuration
DOCUSEAL_URL=http://localhost:3001
DOCUSEAL_API_KEY=your_api_key_here
DOCUSEAL_SECRET_KEY=generate_with_openssl_rand_hex_64
DOCUSEAL_WEBHOOK_SECRET=your_webhook_secret
```

### 1.3 Package Installation

```bash
npm install @docuseal/react jose
```

- `@docuseal/react` - React components for embedding
- `jose` - JWT generation for embed authentication

---

## Phase 2: Database Schema

### 2.1 FormTemplate Model Updates

Add fields to `prisma/schema.prisma`:

```prisma
model FormTemplate {
  // ... existing fields ...

  // DocuSeal Integration
  pdfEnabled          Boolean  @default(false)
  docusealTemplateId  Int?                        // DocuSeal's template ID
  pdfFieldMappings    Json?                       // Map Chkin fields → DocuSeal fields
  // Example: { "firstName": "patient_first_name", "lastName": "patient_last_name" }
}
```

### 2.2 Submission Model Updates

Add fields to track signed documents:

```prisma
model Submission {
  // ... existing fields ...

  // DocuSeal Signature
  docusealSubmissionId  Int?                      // DocuSeal's submission ID
  signedDocumentUrl     String?                   // URL to signed PDF
  signedAt              DateTime?                 // When signature completed
}
```

### 2.3 Migration

```bash
npx prisma migrate dev --name add_docuseal_integration
```

---

## Phase 3: API Routes

### 3.1 DocuSeal JWT Generator

**File**: `app/src/lib/docuseal.ts`

```typescript
import * as jose from 'jose';

const DOCUSEAL_URL = process.env.DOCUSEAL_URL;
const DOCUSEAL_API_KEY = process.env.DOCUSEAL_API_KEY;

export async function generateDocuSealToken(payload: {
  templateId?: number;
  submissionId?: number;
  email: string;
}): Promise<string> {
  const secret = new TextEncoder().encode(DOCUSEAL_API_KEY);

  return await new jose.SignJWT({
    user_email: payload.email,
    integration_email: payload.email,
    template_id: payload.templateId,
    submission_id: payload.submissionId,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(secret);
}

export async function createDocuSealSubmission(
  templateId: number,
  email: string,
  fieldValues: Record<string, string>
): Promise<{ submissionId: number; embedUrl: string }> {
  const response = await fetch(`${DOCUSEAL_URL}/api/submissions`, {
    method: 'POST',
    headers: {
      'X-Auth-Token': DOCUSEAL_API_KEY!,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      template_id: templateId,
      send_email: false,
      submitters: [{
        email,
        fields: Object.entries(fieldValues).map(([name, value]) => ({
          name,
          default_value: value,
        })),
      }],
    }),
  });

  const data = await response.json();
  return {
    submissionId: data[0].submission_id,
    embedUrl: data[0].embed_src,
  };
}
```

### 3.2 Provider: Get Builder Token

**File**: `app/src/app/api/provider/docuseal/builder-token/route.ts`

```typescript
// POST /api/provider/docuseal/builder-token
// Returns JWT for embedding DocuSeal Builder
// Body: { templateId?: number } (optional, for editing existing)
```

### 3.3 Provider: Save Template Mapping

**File**: `app/src/app/api/provider/forms/[id]/docuseal/route.ts`

```typescript
// PUT /api/provider/forms/[id]/docuseal
// Updates FormTemplate with DocuSeal config
// Body: { docusealTemplateId, pdfFieldMappings }
```

### 3.4 Patient: Create Submission

**File**: `app/src/app/api/patient/submissions/[id]/docuseal/route.ts`

```typescript
// POST /api/patient/submissions/[id]/docuseal
// Creates DocuSeal submission with pre-filled values
// Returns: { submissionId, token } for embedding
```

### 3.5 Webhook: Signature Completed

**File**: `app/src/app/api/webhooks/docuseal/route.ts`

```typescript
// POST /api/webhooks/docuseal
// Called by DocuSeal when signature is completed
// Updates Submission with signedDocumentUrl, signedAt
```

---

## Phase 4: Provider UI Components

### 4.1 PDF Document Tab

**File**: `app/src/components/provider/form-builder/PdfDocumentTab.tsx`

Features:
- Toggle to enable/disable PDF for form
- DocuSeal Builder embed for template creation
- Field mapping interface (Chkin field → DocuSeal placeholder)
- Preview of current template

UI Layout:
```
┌─────────────────────────────────────────────────────────────────┐
│ PDF Document Configuration                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│ [✓] Enable PDF document signing                                  │
│                                                                  │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │                                                             │ │
│ │              DocuSeal Builder (embedded)                    │ │
│ │                                                             │ │
│ │  - Upload PDF                                               │ │
│ │  - Place signature field                                    │ │
│ │  - Add text fields for auto-fill                            │ │
│ │                                                             │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                  │
│ Field Mapping                                                    │
│ ┌──────────────────┬──────────────────────────────────────────┐ │
│ │ Chkin Field      │ DocuSeal Field                           │ │
│ ├──────────────────┼──────────────────────────────────────────┤ │
│ │ firstName        │ [patient_first_name      ▼]              │ │
│ │ lastName         │ [patient_last_name       ▼]              │ │
│ │ idNumber         │ [id_number               ▼]              │ │
│ │ email            │ [patient_email           ▼]              │ │
│ └──────────────────┴──────────────────────────────────────────┘ │
│                                                                  │
│                                    [Save PDF Configuration]      │
└─────────────────────────────────────────────────────────────────┘
```

### 4.2 DocuSeal Builder Wrapper

**File**: `app/src/components/provider/DocuSealBuilder.tsx`

```typescript
'use client';

import { DocusealBuilder } from '@docuseal/react';

interface Props {
  token: string;
  templateId?: number;
  onSave: (templateId: number) => void;
}

export function DocuSealBuilder({ token, templateId, onSave }: Props) {
  return (
    <DocusealBuilder
      token={token}
      templateId={templateId}
      onSave={(data) => onSave(data.id)}
      withTitle={false}
      withSendButton={false}
      withSignYourselfButton={false}
    />
  );
}
```

---

## Phase 5: Patient UI Components

### 5.1 Signature Step

**File**: `app/src/components/patient/SignatureStep.tsx`

Shown after form fields are completed, before final submission.

```typescript
'use client';

import { DocusealForm } from '@docuseal/react';

interface Props {
  submissionId: number;
  token: string;
  onComplete: () => void;
}

export function SignatureStep({ submissionId, token, onComplete }: Props) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold">Sign Document</h2>
      <p className="text-gray-600">
        Please review and sign the document below.
      </p>
      <DocusealForm
        submissionId={submissionId}
        token={token}
        onComplete={onComplete}
        withTitle={false}
        withDownloadButton={true}
      />
    </div>
  );
}
```

### 5.2 Public Form Flow Update

**File**: `app/src/components/patient/PublicFormRenderer.tsx`

Add signature step to form submission flow:

```
Current Flow:
[Form Fields] → [Submit]

New Flow (if PDF enabled):
[Form Fields] → [Sign Document] → [Submit]
```

---

## Phase 6: Provider Submissions View

### 6.1 Signed Document Column

Update submissions table to show signature status:
- No PDF: "-"
- Pending: "Awaiting signature"
- Signed: "View signed PDF" link

### 6.2 Submission Detail

Add signed document viewer/download in submission detail page.

---

## Implementation Checklist

### Infrastructure
- [ ] Add DocuSeal to docker-compose.yml
- [ ] Configure environment variables
- [ ] Install npm packages
- [ ] Create DocuSeal database

### Database
- [ ] Add fields to FormTemplate model
- [ ] Add fields to Submission model
- [ ] Run migration

### API Routes
- [ ] `/api/provider/docuseal/builder-token` - JWT for builder
- [ ] `/api/provider/forms/[id]/docuseal` - Save template config
- [ ] `/api/patient/submissions/[id]/docuseal` - Create submission
- [ ] `/api/webhooks/docuseal` - Handle completion webhook

### Provider UI
- [ ] PdfDocumentTab component
- [ ] DocuSealBuilder wrapper
- [ ] Field mapping interface
- [ ] Integration into form builder

### Patient UI
- [ ] SignatureStep component
- [ ] Update PublicFormRenderer flow
- [ ] Success confirmation with download

### Provider Submissions
- [ ] Signature status column
- [ ] Signed PDF viewer in detail page

### Testing
- [ ] Provider: Create template, map fields
- [ ] Patient: Complete form, sign document
- [ ] Webhook: Verify completion updates database
- [ ] Download: Verify signed PDF accessible

---

## Security Considerations

1. **JWT Expiration**: Tokens expire in 1 hour
2. **Webhook Verification**: Validate webhook secret
3. **Access Control**: Only form owner can configure DocuSeal
4. **Signed PDF Storage**: Consider storing PDFs in own storage vs. DocuSeal

---

## Rollback Plan

If DocuSeal integration needs to be disabled:

1. Set `pdfEnabled = false` on all FormTemplates
2. Patient flow automatically skips signature step
3. Existing signed documents remain accessible
4. No data loss

---

## Future Enhancements

1. **Multiple signers**: Patient + witness, or patient + provider
2. **Template library**: Pre-built common medical forms
3. **Bulk sending**: Send forms to multiple patients
4. **Audit trail**: Full signature verification history
5. **Custom branding**: Provider logo on PDF header
