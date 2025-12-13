# Chkin Design System

Mobile-first component library for the Chkin healthcare platform.

## Principles

1. **Mobile-first** - Base styles target mobile, enhance for larger screens
2. **Touch-friendly** - Minimum 44px touch targets for interactive elements
3. **Accessible** - ARIA labels, keyboard navigation, sufficient contrast
4. **Consistent** - Reusable components with predictable behavior

## Breakpoints

Using Tailwind's default breakpoints:

| Prefix | Min Width | Common Devices |
|--------|-----------|----------------|
| (none) | 0px | Mobile phones |
| `sm:` | 640px | Large phones, small tablets |
| `md:` | 768px | Tablets |
| `lg:` | 1024px | Laptops, desktops |
| `xl:` | 1280px | Large desktops |

## Folder Structure

```
src/
├── components/
│   ├── ui/                    # Design system primitives
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── DataTable.tsx
│   │   ├── EmptyState.tsx
│   │   ├── Input.tsx
│   │   ├── Modal.tsx
│   │   ├── StatusBadge.tsx
│   │   └── index.ts           # Barrel file
│   ├── layout/                # Layout components
│   │   ├── app-shell.tsx
│   │   ├── mobile-nav.tsx
│   │   ├── page-header.tsx
│   │   ├── sidebar-overlay.tsx
│   │   └── index.ts
│   ├── admin/                 # Admin-specific components
│   └── provider/              # Provider-specific components
├── hooks/
│   ├── use-mobile.ts
│   ├── use-sidebar.ts
│   └── index.ts
```

## Components

### Layout Components

#### AppShell

Main layout wrapper with responsive sidebar navigation.

```tsx
import { AppShell } from "@/components/layout";
import MySidebar from "./MySidebar";

<AppShell sidebar={<MySidebar />} mobileTitle="Dashboard">
  <PageContent />
</AppShell>
```

**Props:**
- `sidebar` - Sidebar content (ReactNode)
- `mobileTitle` - Title shown in mobile header (string)
- `children` - Page content

**Behavior:**
- Mobile: Hamburger menu, sidebar as drawer overlay
- Desktop (lg+): Fixed sidebar, content beside it

#### PageHeader

Consistent page header with title, description, and actions.

```tsx
import { PageHeader } from "@/components/layout";

<PageHeader
  title="Provider Management"
  description="Review and manage registrations"
>
  <Button>Add Provider</Button>
</PageHeader>
```

**Props:**
- `title` - Page title (string, required)
- `description` - Subtitle text (string)
- `children` - Action buttons
- `breadcrumb` - Breadcrumb navigation

### UI Components

#### Button

```tsx
import { Button } from "@/components/ui";

<Button variant="primary" size="md" loading={false}>
  Save Changes
</Button>
```

**Props:**
- `variant`: `"primary"` | `"secondary"` | `"danger"` | `"ghost"`
- `size`: `"sm"` | `"md"` | `"lg"`
- `loading`: boolean
- `fullWidth`: boolean
- All standard button HTML attributes

**Touch Targets:**
- `sm`: 36px height
- `md`: 44px height (default)
- `lg`: 48px height

#### Card

Container for content sections.

```tsx
import { Card } from "@/components/ui";

<Card title="Settings" description="Manage preferences" actions={<Button>Edit</Button>}>
  <Content />
</Card>
```

**Props:**
- `title` - Card header title
- `description` - Card header subtitle
- `actions` - Header action buttons
- `noPadding` - Remove body padding (for tables)
- `className` - Additional classes

#### DataTable

Responsive data display - cards on mobile, table on desktop.

```tsx
import { DataTable, type Column } from "@/components/ui";

const columns: Column<Provider>[] = [
  {
    key: "name",
    header: "Provider",
    mobileTitle: true,  // Shows as card title on mobile
    render: (item) => <strong>{item.name}</strong>,
  },
  {
    key: "email",
    header: "Email",
    mobileSubtitle: true,  // Shows under title on mobile
  },
  {
    key: "createdAt",
    header: "Created",
    hideOnMobile: true,  // Hidden in card view
  },
];

<DataTable
  columns={columns}
  data={providers}
  keyExtractor={(p) => p.id}
  onRowClick={(p) => router.push(`/providers/${p.id}`)}
  loading={isLoading}
  emptyMessage="No providers found"
/>
```

**Column Options:**
- `key` - Unique identifier
- `header` - Column header text
- `render` - Custom render function
- `mobileTitle` - Use as card title on mobile
- `mobileSubtitle` - Use as card subtitle on mobile
- `hideOnMobile` - Hide in mobile card view
- `className` - Additional classes

#### Input

Form text input with label and error support.

```tsx
import { Input } from "@/components/ui";

<Input
  label="Email"
  type="email"
  error={errors.email}
  hint="We'll never share your email"
  required
/>
```

**Props:**
- `label` - Input label
- `error` - Error message
- `hint` - Help text
- All standard input HTML attributes

#### Modal

Accessible modal dialog.

```tsx
import { Modal, Button } from "@/components/ui";

<Modal
  isOpen={showModal}
  onClose={() => setShowModal(false)}
  title="Confirm Action"
  description="This cannot be undone"
  size="md"
  footer={
    <>
      <Button variant="secondary" onClick={() => setShowModal(false)}>
        Cancel
      </Button>
      <Button variant="danger" onClick={handleDelete}>
        Delete
      </Button>
    </>
  }
>
  <p>Are you sure you want to delete this item?</p>
</Modal>
```

**Props:**
- `isOpen` - Control visibility
- `onClose` - Close callback
- `title` - Modal title
- `description` - Subtitle
- `size`: `"sm"` | `"md"` | `"lg"`
- `footer` - Footer buttons
- `children` - Modal body

**Behavior:**
- Mobile: Full-width, slides up from bottom
- Desktop: Centered dialog

#### StatusBadge

Color-coded status indicator.

```tsx
import { StatusBadge } from "@/components/ui";

<StatusBadge status="pending" />
<StatusBadge status="approved" label="Active" size="md" />
```

**Props:**
- `status`: `"pending"` | `"approved"` | `"rejected"` | `"active"` | `"inactive"` | `"info"`
- `label` - Custom label (default: status name)
- `size`: `"sm"` | `"md"`

#### EmptyState

Placeholder for empty data states.

```tsx
import { EmptyState, Button } from "@/components/ui";

<EmptyState
  icon={<BuildingIcon />}
  title="No providers"
  description="Get started by adding your first provider"
  action={<Button>Add Provider</Button>}
/>
```

### Hooks

#### useMobile

Detect mobile viewport.

```tsx
import { useMobile } from "@/hooks";

const isMobile = useMobile();
// true when viewport < 1024px (lg breakpoint)
```

#### useSidebar

Manage sidebar state with auto-close behaviors.

```tsx
import { useSidebar } from "@/hooks";

const { isOpen, open, close, toggle } = useSidebar();
// Auto-closes on route change and Escape key
```

## Color Palette

**Primary:** Teal (`teal-600`, `teal-700`)

**Status Colors:**
- Pending: Yellow (`yellow-100`, `yellow-800`)
- Approved/Active: Green (`green-100`, `green-800`)
- Rejected/Error: Red (`red-100`, `red-800`)
- Info: Blue (`blue-100`, `blue-800`)
- Inactive: Gray (`gray-100`, `gray-800`)

## Usage Guidelines

### Mobile-First CSS

Always write base styles for mobile, then enhance:

```tsx
// Good
className="p-4 sm:p-6 lg:p-8"

// Bad (desktop-first)
className="p-8 sm:p-6 lg:p-4"
```

### Touch Targets

Ensure interactive elements are at least 44px:

```tsx
// Button with 44px minimum height
className="min-h-[44px] px-4 py-2"
```

### Responsive Tables

Use DataTable for data lists - it automatically shows cards on mobile:

```tsx
// Instead of raw <table>, use DataTable
<DataTable
  columns={columns}
  data={data}
  keyExtractor={(item) => item.id}
/>
```

### Forms on Mobile

Stack form elements vertically, use full-width inputs:

```tsx
<form className="flex flex-col gap-4 sm:flex-row">
  <Input className="flex-1" />
  <Button>Submit</Button>
</form>
```
