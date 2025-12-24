# Second Brain UI Upgrade Status

> **Last Updated:** December 24, 2025
> **Status:** Complete
> **Branch:** `cleanup`

## Executive Summary

This document tracks the comprehensive UI upgrade initiative to migrate from custom UI components to **shadcn/ui** with Radix primitives, fix architectural anti-patterns, and establish a scalable design system.

### Progress Overview

| Category | Status | Progress |
|----------|--------|----------|
| **Foundation Setup** | Complete | 100% |
| **Core Primitives Migration** | Complete | 100% |
| **Additional Primitives** | Complete | 100% |
| **CSS Variable Syntax Fix** | Complete | 100% |
| **IndexingButton Split** | Complete | 100% |
| **UserMenu Split** | Complete | 100% |
| **IndexingStats Split** | Complete | 100% |
| **TauriApiKeysManager Split** | Complete | 100% |
| **ContextUsageIndicator Split** | Complete | 100% |
| **SummaryNotification Split** | Complete | 100% |
| **CombinedModelSelector Split** | Complete | 100% |
| **IndexingNotification Split** | Complete | 100% |
| **Icons Split** | Complete | 100% |
| **Inline Hover Cleanup** | Complete | 100% |
| **Hard-coded Colors Fix** | Complete | 100% |
| **Legacy Component Removal** | Complete | 100% |
| **Modal → Dialog Migration** | Complete | 100% |

---

## Phase 1: Foundation Setup (COMPLETE)

### 1.1 Dependencies Installed

```bash
pnpm add clsx tailwind-merge class-variance-authority
pnpm add @radix-ui/react-slot @radix-ui/react-dialog @radix-ui/react-dropdown-menu
pnpm add @radix-ui/react-tooltip @radix-ui/react-switch @radix-ui/react-tabs
pnpm add @radix-ui/react-popover @radix-ui/react-select @radix-ui/react-slider
pnpm add @radix-ui/react-checkbox @radix-ui/react-radio-group @radix-ui/react-label
pnpm add @radix-ui/react-scroll-area @radix-ui/react-separator
```

### 1.2 Utility Function Created

**File:** `frontend/src/lib/utils.ts`

```typescript
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

### 1.3 shadcn Configuration

**File:** `frontend/components.json`

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "default",
  "rsc": false,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/index.css",
    "baseColor": "neutral",
    "cssVariables": true
  },
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

### 1.4 Theme Token Bridge

**File:** `frontend/src/styles/globals/theme/shadcn-bridge.css`

Maps existing CSS variables to shadcn expected tokens:

| Existing Token | shadcn Token |
|----------------|--------------|
| `--surface-card` | `--card` |
| `--text-primary` | `--card-foreground` |
| `--surface-elevated` | `--popover` |
| `--color-brand-600` | `--primary` |
| `--color-error` | `--destructive` |
| `--border` | `--border` |
| `--input-focus-ring` | `--ring` |

---

## Phase 2: Core Primitives Migration (COMPLETE)

### Components Refactored

| Component | Lines | Changes |
|-----------|-------|---------|
| **Button.tsx** | 151 | CVA variants, CSS hover classes, removed inline handlers |
| **Input.tsx** | ~150 | cn() utility, CSS focus classes |
| **Textarea.tsx** | ~140 | cn() utility, CSS focus classes |
| **Tooltip.tsx** | ~120 | Replaced 176 lines with Radix primitive |

### Button Variants (CVA)

```typescript
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-3xl font-semibold transition-all duration-200...",
  {
    variants: {
      variant: {
        primary: [...],    // Green brand button
        secondary: [...],  // Transparent with border
        danger: [...],     // Red destructive
        ghost: [...],      // Minimal, transparent
        outline: [...],    // Border only
        link: [...],       // Text link style
      },
      size: { sm, md, lg, icon },
    },
  }
);
```

---

## Phase 3: Additional Primitives (COMPLETE)

### New shadcn Components Created

| Component | File | Description |
|-----------|------|-------------|
| **Dialog** | Dialog.tsx | Modal/overlay using Radix Dialog |
| **Label** | Label.tsx | Form label primitive |
| **Switch** | Switch.tsx | Toggle switch using Radix Switch |
| **Tabs** | Tabs.tsx | Tab navigation using Radix Tabs |
| **Card** | Card.tsx | Card container with header/content/footer |
| **Badge** | Badge.tsx | Status badges with variants |
| **Popover** | Popover.tsx | Floating content using Radix Popover |
| **Skeleton** | Skeleton.tsx | Loading placeholder |
| **Select** | Select.tsx | Dropdown select using Radix Select |
| **DropdownMenu** | DropdownMenu.tsx | Context menu using Radix DropdownMenu |
| **Checkbox** | Checkbox.tsx | Checkbox using Radix Checkbox |
| **RadioGroup** | RadioGroup.tsx | Radio buttons using Radix RadioGroup |
| **ScrollArea** | ScrollArea.tsx | Custom scrollbar using Radix ScrollArea |
| **Separator** | Separator.tsx | Divider line |
| **Slider** | Slider.tsx | Range input using Radix Slider |
| **Avatar** | Avatar.tsx | User avatar with fallback |
| **Alert** | Alert.tsx | Alert banners with variants |
| **Progress** | Progress.tsx | Progress bar |

### Barrel Export

**File:** `frontend/src/components/ui/index.ts`

All 49 UI components exported for easy importing:

```typescript
import { Button, Input, Dialog, DialogContent } from '@/components/ui';
```

---

## Phase 4: CSS Variable Syntax Fix (COMPLETE)

### Issue Identified

Tailwind v4 arbitrary value syntax `[--variable]` wasn't working consistently. The codebase standard is `[var(--variable)]`.

### Pattern Changed

```css
/* Before (broken) */
bg-[--muted] text-[--text-primary] border-[--border]

/* After (working) */
bg-[var(--muted)] text-[var(--text-primary)] border-[var(--border)]
```

### Files Fixed (21 total)

- Button.tsx, Skeleton.tsx, Slider.tsx
- Progress.tsx, Alert.tsx, Avatar.tsx, Separator.tsx
- ScrollArea.tsx, RadioGroup.tsx, Checkbox.tsx
- DropdownMenu.tsx, Select.tsx, Tooltip.tsx
- Textarea.tsx, Popover.tsx, Badge.tsx
- Card.tsx, Tabs.tsx, Switch.tsx
- Dialog.tsx, Label.tsx, Input.tsx

---

## Phase 5: IndexingButton Split (COMPLETE)

### Original State
- **File:** `components/ui/IndexingButton.tsx`
- **Lines:** 773
- **Issues:** Monolithic, mixed concerns, inline hover handlers

### New Structure

```
features/rag/components/indexing/
├── index.ts                      # Barrel exports
├── types.ts                      # Shared types (~120 lines)
├── IndexingButton.tsx            # Orchestrator (~100 lines)
├── VectorStoreSelector.tsx       # Vector store pills (~85 lines)
├── EmbeddingProviderSelector.tsx # Provider pills (~85 lines)
├── EmbeddingModelSelector.tsx    # Model pills (~105 lines)
├── DimensionSlider.tsx           # Dimension slider (~115 lines)
├── StartIndexingButton.tsx       # Start button (~70 lines)
└── hooks/
    └── use-indexing-state.ts     # State management (~300 lines)
```

### Improvements
- **93% reduction** in main component size (773 → ~100 lines)
- **Eliminated** all inline hover handlers (replaced with CSS `hover:` classes)
- **Uses** new shadcn primitives (Button, Slider, Skeleton)
- **Backwards compatible** via re-export in old location

---

## Phase 6: UserMenu Split (COMPLETE)

**Previous State:**
- **File:** `components/ui/UserMenu.tsx`
- **Lines:** 499
- **Inline Hover Handlers:** 9 instances

**New Structure:**
```
components/composite/user-menu/
├── index.tsx               # Main orchestrator using DropdownMenu
├── types.ts                # Shared types
├── UserAvatar.tsx          # Avatar component (reusable)
├── ApiKeySection.tsx       # API key display with copy button
├── ApiKeyModal.tsx         # Modal using shadcn Dialog
└── hooks/
    └── use-api-key.ts      # API key generation logic
```

**Improvements:**
- **90% reduction** in main component size (499 → ~50 lines in old file)
- **Eliminated** all 9 inline hover handlers (replaced with CSS `hover:` classes)
- **Uses** shadcn DropdownMenu and Dialog primitives
- **Backwards compatible** via re-export in old location
- **Reusable** UserAvatar component

---

## Phase 7: IndexingStats Split (COMPLETE)

**Previous State:**
- **File:** `components/ui/IndexingStats.tsx`
- **Lines:** 677
- **Inline Hover Handlers:** 5 instances
- **Hard-coded Colors:** 4 instances (`#f59e0b`)

**New Structure:**
```
components/data-display/stats-card/
├── index.ts                # Barrel exports
├── types.ts                # Shared types
├── StatsCard.tsx           # Main stats card (~200 lines)
├── StatsCardGrid.tsx       # Stats grid layout
├── StatsCardFooter.tsx     # Metadata footer
├── StatsCardSkeleton.tsx   # Loading skeleton
├── HealthIndicator.tsx     # Reusable health dot
├── DeleteButton.tsx        # Delete button with CSS hover
└── PineconeSetupCard.tsx   # Pinecone not configured state
```

**Improvements:**
- **85% reduction** in main component size (677 → ~100 lines)
- **Eliminated** all 5 inline hover handlers (replaced with CSS `hover:` classes)
- **Fixed** 4 hard-coded `#f59e0b` colors → `var(--color-warning)`
- **Reusable** components (HealthIndicator, StatsCardGrid, StatsCardFooter)
- **Separated** concerns (loading, empty state, setup state)

---

## Phase 8: TauriApiKeysManager Split (COMPLETE)

**Previous State:**
- **File:** `components/ui/TauriApiKeysManager.tsx`
- **Lines:** 632
- **Hard-coded Colors:** 2 instances (`#10b981`)

**New Structure:**

```
components/composite/api-keys-manager/
├── index.ts                        # Barrel exports
├── types.ts                        # Types and interfaces (~60 lines)
├── constants.ts                    # Provider keys and field configs (~100 lines)
├── ConfiguredBadge.tsx             # "Configured" badge component (~15 lines)
├── VisibilityToggle.tsx            # Eye icon for password visibility (~40 lines)
├── SaveButtons.tsx                 # Save/Restart buttons (~50 lines)
├── ApiKeyInput.tsx                 # Single API key input field (~70 lines)
├── TauriProviderApiKeyInput.tsx    # Single provider input modal (~90 lines)
├── TauriApiKeysManager.tsx         # Full API keys manager (~120 lines)
└── hooks/
    └── use-secrets.ts              # Secrets loading/saving hooks (~200 lines)
```

**Improvements:**

- **81% reduction** in main component size (632 → ~120 lines)
- **Fixed** 2 hard-coded `#10b981` colors → `var(--color-success)`
- **Reusable** hooks (useSecrets, useSingleSecret)
- **Reusable** components (ConfiguredBadge, VisibilityToggle, SaveButtons)
- **Backwards compatible** via re-export in old location

---

## Phase 9: ContextUsageIndicator Split (COMPLETE)

**Previous State:**
- **File:** `components/ui/ContextUsageIndicator.tsx`
- **Lines:** 377
- **Inline Hover Handlers:** 1 instance

**New Structure:**

```
components/composite/context-usage/
├── index.tsx                 # Main ContextUsageIndicator (~150 lines)
├── types.ts                  # Shared types and interfaces
├── ContextProgressBar.tsx    # Progress bar visualization
├── ContextBreakdownIcons.tsx # Icon components for context types
└── ContextBreakdownItem.tsx  # Individual breakdown item
```

**Improvements:**

- **60% reduction** in main component size (377 → ~150 lines)
- **Eliminated** 1 inline hover handler (replaced with CSS `hover:` class)
- **Reusable** progress bar and breakdown components
- **Backwards compatible** via re-export in old location

---

## Phase 10: SummaryNotification Split (COMPLETE)

**Previous State:**
- **File:** `components/ui/SummaryNotification.tsx`
- **Lines:** 397
- **Issues:** Monolithic structure, mixed concerns

**New Structure:**

```
components/composite/summary-notification/
├── index.tsx              # Main SummaryNotification (~180 lines)
├── types.ts               # Shared types and interfaces
├── SummaryIcons.tsx       # Icon components for statuses
├── SummaryProgress.tsx    # Progress indicator component
└── SummaryStatus.tsx      # Status display component
```

**Improvements:**

- **55% reduction** in main component size (397 → ~180 lines)
- **Separated** icon, progress, and status concerns
- **Reusable** status components
- **Backwards compatible** via re-export in old location

---

## Phase 11: CombinedModelSelector Split (COMPLETE)

**Previous State:**
- **File:** `components/ui/CombinedModelSelector.tsx`
- **Lines:** ~400
- **Issues:** Complex keyboard navigation, mixed concerns

**New Structure:**

```
components/composite/model-selector/
├── index.tsx                           # Main CombinedModelSelector (~120 lines)
├── types.ts                            # Shared types and interfaces
├── ModelSelectorTrigger.tsx            # Dropdown trigger button
├── ProviderTabs.tsx                    # Provider tab navigation
├── ModelsList.tsx                      # Models list with virtualization
├── RefreshButton.tsx                   # Refresh models button
└── hooks/
    └── use-model-selector-keyboard.ts  # Keyboard navigation logic
```

**Improvements:**

- **70% reduction** in main component size (~400 → ~120 lines)
- **Extracted** keyboard navigation to dedicated hook
- **Separated** trigger, tabs, and list concerns
- **Reusable** components across different selectors
- **Backwards compatible** via re-export in old location

---

## Phase 12: IndexingNotification Split (COMPLETE)

**Previous State:**
- **File:** `components/ui/IndexingNotification.tsx`
- **Lines:** 510
- **Issues:** Monolithic structure, local icon definitions, mixed concerns

**New Structure:**

```
components/ui/indexing-notification/
├── index.tsx                      # Main IndexingNotification (~174 lines)
├── types.ts                       # Shared types (~16 lines)
├── IndexingNotificationIcons.tsx  # Local icons (~88 lines)
└── JobCard.tsx                    # Individual job card (~239 lines)
```

**Improvements:**

- **66% reduction** in main component size (510 → ~174 lines)
- **Separated** job card logic into dedicated component
- **Extracted** icons to dedicated file (8 icons)
- **Reusable** JobCard component
- **Backwards compatible** via re-export in old location

---

## Phase 13: Icons Split (COMPLETE)

**Previous State:**
- **File:** `components/ui/Icons.tsx`
- **Lines:** 458
- **Issues:** Single large file with 30 icon definitions

**New Structure:**

```
components/ui/icons/
├── index.ts       # Re-exports + Icons namespace (~71 lines)
├── types.ts       # IconProps, defaultProps (~16 lines)
├── navigation.tsx # Chevrons, Menu (5 icons, ~69 lines)
├── action.tsx     # Check, Trash, X, Plus, etc. (10 icons, ~115 lines)
├── status.tsx     # Spinner, Info, Warning, etc. (5 icons, ~68 lines)
└── feature.tsx    # Settings, Folder, User, etc. (10 icons, ~133 lines)
```

**Icon Categories:**

| Category | Icons |
|----------|-------|
| **Navigation** | ChevronDown, ChevronUp, ChevronRight, ChevronLeft, Menu |
| **Action** | Check, Trash, X, Plus, Minus, Search, Copy, Edit, Send, Refresh |
| **Status** | Spinner, Info, Warning, Error, Success |
| **Feature** | Settings, Document, Folder, Archive, Unarchive, Chat, User, Eye, EyeOff, ExternalLink |

**Improvements:**

- **Tree-shakable** individual icon imports
- **Organized** by semantic category
- **Namespace export** for convenient access (`Icons.Check`)
- **Shared** defaultProps for consistency
- **Deleted** original Icons.tsx (replaced by icons/ folder)

---

## Phase 14: Legacy Component Removal (COMPLETE)

### Deleted Components

| File | Reason |
|------|--------|
| `Modal.tsx` | Replaced by shadcn Dialog |
| `Modal.test.tsx` | Test for deleted component |
| `Dropdown.tsx` | Replaced by shadcn Select/DropdownMenu |
| `Icons.tsx` (original) | Replaced by icons/ folder |

### Deleted Backward Compat Re-exports

These files were reduced to simple re-exports pointing to composite components, then deleted to enforce direct imports:

| Deleted File | New Location |
|--------------|--------------|
| `UserMenu.tsx` | `composite/user-menu/` |
| `TauriApiKeysManager.tsx` | `composite/api-keys-manager/` |
| `ContextUsageIndicator.tsx` | `composite/context-usage/` |
| `SummaryNotification.tsx` | `composite/summary-notification/` |
| `CombinedModelSelector.tsx` | `composite/model-selector/` |
| `IndexingButton.tsx` | `features/rag/components/indexing/` |

---

## Phase 15: Modal → Dialog Migration (COMPLETE)

All Modal usages migrated to shadcn Dialog:

| File | Changes |
|------|---------|
| `EditNoteModal.tsx` | Modal → Dialog |
| `CreateNoteModal.tsx` | Modal → Dialog |
| `ProviderDetailsModal.tsx` | Modal → Dialog |
| `TauriPineconeSetupModal.tsx` | Modal → Dialog |
| `NoteVersionDiffViewer.tsx` | Modal → Dialog |
| `App.tsx` (AboutModal) | Modal → Dialog |
| `ApiKeyModal.tsx` | Modal → Dialog |

**Migration Pattern:**

```tsx
// Before (Modal)
<Modal isOpen={isOpen} onClose={onClose} title="Edit Note">
  <content />
</Modal>

// After (Dialog)
<Dialog open={isOpen} onOpenChange={onClose}>
  <DialogContent>
    <DialogHeader>
      <DialogTitle>Edit Note</DialogTitle>
    </DialogHeader>
    <content />
  </DialogContent>
</Dialog>
```

---

## Phase 16: Inline Hover Handler Cleanup (COMPLETE)

### Summary

**Total Fixed:** 116+ occurrences across 26+ files

All inline hover handlers have been replaced with CSS `hover:` classes.

**Pattern Applied:**

```typescript
// Before (anti-pattern)
onMouseEnter={(e) => {
  e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
}}
onMouseLeave={(e) => {
  e.currentTarget.style.backgroundColor = 'transparent';
}}

// After (CSS-driven)
className="bg-transparent hover:bg-[var(--hover-bg)] transition-colors"

// For color-mix (underscores replace spaces in Tailwind)
className="hover:bg-[color-mix(in_srgb,var(--color-error)_10%,transparent)]"
```

### Files Fixed by Category

**Notes (7 files):**
- NotesFilter.tsx (12 handlers)
- NoteCard.tsx (2 handlers)
- NoteListItem.tsx (2 handlers)
- NoteVersionHistoryPanel.tsx (2 handlers)
- NoteVersionTimeline.tsx (2 handlers)
- FolderSidebar.tsx (3 handlers)
- EditNoteModal.tsx (4 handlers)

**Chat/RAG (2 files):**
- ConversationListItem.tsx (2 handlers)
- QueryLogsTable.tsx (2 handlers)

**Dashboard (3 files):**
- ChatUsageChart.tsx (1 handler)
- NotesChart.tsx (1 handler)
- ModelUsageSection.tsx (2 handlers)

**Git/GitHub (6 files):**
- GitHubCodeBrowser.tsx (2 handlers)
- CodeViewer.tsx (1 handler)
- FileSearchInput.tsx (1 handler)
- GitStatusPanel.tsx (1 handler)
- GitSettingsPanel.tsx (1 handler)
- GitEmptyState.tsx (2 handlers)

**Layout/UI (4 files):**
- ViewModeToggle.tsx (2 handlers)
- NotesPageControls.tsx (1 handler)
- Header.tsx (2 handlers)
- Sidebar.tsx (3 handlers)

**Settings (4 files):**
- AISettings.tsx (1 handler)
- IndexingSettings.tsx (1 handler)
- ProviderDetailsModal.tsx (1 handler)
- ProviderCard.tsx (2 handlers)

---

## Phase 17: Hard-coded Colors Fix (COMPLETE)

### Colors Replaced

| Hard-coded Value | Replaced With | Files |
|------------------|---------------|-------|
| `rgb(239,68,68)` | `var(--color-error)` | StreamingIndicator, ChatSidebar, ConversationListItem |
| `rgba(239,68,68,*)` | `color-mix(in srgb, var(--color-error) N%, transparent)` | Multiple files |
| `#ffffff` | `var(--btn-primary-text)` or `var(--text-inverse)` | BulkActionsBar, ViewModeToggle |
| `#f59e0b` | `var(--color-warning)` | IndexingStats |
| `#10b981` | `var(--color-success)` | TauriApiKeysManager, ProviderCard |

### Files Fixed (8 total)

| File | Changes |
|------|---------|
| `StreamingIndicator.tsx` | Error states → CSS variables |
| `ChatSidebar.tsx` | Delete button → CSS variables |
| `GrokSearchSourcesCard.tsx` | News source type → CSS variables |
| `ConversationListItem.tsx` | Delete hover → color-mix() |
| `BulkActionsBar.tsx` | Button colors → CSS variables |
| `NoteImageAttachment.tsx` | Error background → color-mix() |
| `context-usage/index.tsx` | Warning glow → color-mix() |
| `ProviderCard.tsx` | Status indicators → CSS variables with fallbacks |

**Justified Instances (no action needed):**

- `rgba(0,0,0,0.9)` in ChatLightbox.tsx (dark overlay)
- `rgba(0,0,0,0.7)` in ChatAttachmentGallery.tsx (image gradient)

---

## Component Inventory

### UI Components Directory

**Location:** `frontend/src/components/ui/`
**Total Files:** 49
**Total Lines:** ~8,998

#### By Size Category

| Category | Count | Examples |
|----------|-------|----------|
| **Micro** (< 50 lines) | 7 | Separator, Skeleton, Label |
| **Small** (50-150 lines) | 24 | Button, Input, Switch, Tooltip |
| **Medium** (150-300 lines) | 13 | Dialog, Select, DropdownMenu |
| **Large** (300-500 lines) | 0 | None (all refactored to composite/) |
| **XL** (500+ lines) | 0 | None (all refactored) |

#### New shadcn Components (20)

All using Radix primitives + cn() utility + CSS variables:
- Dialog, Label, Switch, Tabs, Card, Badge
- Popover, Skeleton, Select, DropdownMenu
- Checkbox, RadioGroup, ScrollArea, Separator
- Slider, Avatar, Alert, Progress
- Button (refactored), Tooltip (refactored)

#### Legacy Components (29)

Original components, some refactored:

- Modal, Dropdown, MultiSelectDropdown, Pagination
- TauriApiKeysManager (refactored → api-keys-manager/)
- ContextUsageIndicator (refactored → context-usage/)
- SummaryNotification (refactored → summary-notification/)
- CombinedModelSelector (refactored → model-selector/)
- IndexingNotification, and others...

#### Composite Components (NEW)

Extracted from monolithic components:

- `components/composite/user-menu/` - UserMenu split (6 files)
- `components/composite/api-keys-manager/` - TauriApiKeysManager split (10 files)
- `components/composite/context-usage/` - ContextUsageIndicator split (5 files)
- `components/composite/summary-notification/` - SummaryNotification split (5 files)
- `components/composite/model-selector/` - CombinedModelSelector split (7 files)
- `components/data-display/stats-card/` - IndexingStats split (9 files)
- `features/rag/components/indexing/` - IndexingButton split (8 files)

---

## Architecture Decisions

### CSS Variable System

All new components use CSS variables from the theme system:

```css
/* Surface tokens */
--surface-card, --surface-elevated, --surface-base

/* Brand colors */
--color-brand-50 through --color-brand-950

/* Semantic colors */
--color-success, --color-warning, --color-error

/* Text colors */
--text-primary, --text-secondary, --text-tertiary, --text-muted

/* shadcn bridge tokens */
--primary, --secondary, --muted, --accent, --destructive
--card, --popover, --border, --ring
```

### Component Patterns

1. **Use `cn()` for class merging** - Combines clsx + tailwind-merge
2. **Use CVA for variants** - Type-safe component variants
3. **Use CSS `hover:` classes** - No inline event handlers
4. **Use `var()` wrapper** - `bg-[var(--token)]` not `bg-[--token]`
5. **Use Radix primitives** - For accessible, unstyled components

### File Organization

```
components/
├── ui/                    # shadcn primitives (atomic)
│   ├── Button.tsx
│   ├── Dialog.tsx
│   └── ...
├── composite/             # App-specific combinations
│   ├── user-menu/
│   └── model-selector/
├── data-display/          # Data visualization
│   ├── stats-card/
│   └── pagination.tsx
└── layout/                # Layout components
```

---

## Testing Checklist

### Before Each PR

- [ ] `pnpm build` succeeds with no TypeScript errors
- [ ] All three themes work (dark, light, blue)
- [ ] Hover states work via CSS (no inline handlers)
- [ ] Focus states visible for accessibility
- [ ] No hard-coded colors (use CSS variables)
- [ ] Components under 300 lines

### Visual Regression Points

- [ ] IndexingButton - All pill selections work
- [ ] UserMenu - Dropdown opens, API keys display
- [ ] IndexingStats - Health indicators, stats grid
- [ ] Edit Note Modal - History/Archive buttons
- [ ] Chat - Model selector, message bubbles

---

## Quick Reference

### Import Paths

```typescript
// New shadcn components
import { Button, Dialog, Select } from '@/components/ui';

// IndexingButton (new location)
import { IndexingButton } from '@/features/rag/components/indexing';

// Utility
import { cn } from '@/lib/utils';
```

### Adding New Components

1. Create in `components/ui/` for primitives
2. Use `cn()` for all className props
3. Use `var()` wrapper for CSS variables
4. Use CVA for variants
5. Export from `components/ui/index.ts`
6. Keep under 300 lines (split if larger)

---

## Timeline & Priorities

### Completed (December 24, 2024)

- [x] Split UserMenu.tsx into 6 components
- [x] Split IndexingStats.tsx into 9 components
- [x] Split TauriApiKeysManager.tsx into 10 components
- [x] Split ContextUsageIndicator.tsx into 5 components
- [x] Split SummaryNotification.tsx into 5 components
- [x] Split CombinedModelSelector.tsx into 7 components
- [x] Fix all 15 inline hover handlers (14 original + 1 in ContextUsageIndicator)
- [x] Fix 4 hard-coded `#f59e0b` colors in IndexingStats
- [x] Fix 2 hard-coded `#10b981` colors in TauriApiKeysManager

### Short-term (Next Session)

- [ ] Add ESLint rule for inline style mutations
- [ ] Document component patterns in CLAUDE.md
- [ ] Review remaining legacy components for deprecation

### Long-term (This Month)

- [ ] Complete migration of all legacy components
- [ ] Remove deprecated Modal component (use Dialog)
- [ ] Remove deprecated Dropdown (use Select/DropdownMenu)
- [ ] Full visual regression testing

---

## Success Criteria

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| Components over 500 lines | 0 | 0 | ✅ Complete |
| Components 300-500 lines | 0 | 0 | ✅ Complete |
| Inline hover handlers | 0 | 0 | ✅ Complete |
| Hard-coded colors | 0 | 0 | ✅ Complete |
| CSS variable compliance | 100% | 100% | ✅ Complete |
| shadcn primitives adopted | 20 | 20 | ✅ Complete |
| Full theme support | Yes | Yes | ✅ Complete |
| Composite component folders | 7 | 7 | ✅ Complete |

---

## Related Documentation

- [Plan File](/.claude/plans/witty-hatching-hedgehog.md) - Original upgrade plan
- [CLAUDE.md](/CLAUDE.md) - Project documentation
- [Frontend Performance Guide](/docs/FRONTEND_PERFORMANCE_GUIDE.md)
- [RAG Tuning Guide](/docs/RAG_TUNING_GUIDE.md)
