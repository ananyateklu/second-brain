# Current Session Context

> **Last Updated**: 2026-01-04
> **Focus**: Blue Theme Frosted Glass UI Implementation Guide

---

## Overview

The Notes Directory page has been fully updated with frosted glass styling for the blue theme. Use this as the reference implementation for styling other pages and components.

---

## Frosted Glass Implementation Guide

### Core Principles

1. **Transparency over opacity** - Use `color-mix()` for semi-transparent tints instead of solid backgrounds
2. **Backdrop blur** - Add `backdrop-blur: 20px` to floating/overlay elements
3. **Consistent tint levels** - Follow the standard percentages below
4. **Brand colors for selections** - Use solid `var(--color-brand-600)` for active/selected states

---

### Standard Color-Mix Values

```css
/* Button & Input Backgrounds */
background-color: color-mix(in srgb, var(--text-primary) 8%, transparent);

/* Hover States */
background-color: color-mix(in srgb, var(--text-primary) 10%, transparent);

/* Borders & Dividers */
border-color: color-mix(in srgb, var(--text-primary) 15%, transparent);

/* Floating Containers (dropdowns, modals, floating bars) */
background-color: var(--glass-bg);
backdrop-filter: blur(20px) saturate(180%);
-webkit-backdrop-filter: blur(20px) saturate(180%);

/* Error/Destructive Actions */
background-color: color-mix(in srgb, var(--color-error) 20%, transparent);
color: var(--color-error);
border: 1px solid color-mix(in srgb, var(--color-error) 30%, transparent);

/* Selected/Active States */
background-color: var(--color-brand-600);
color: #ffffff;
```

### Glass CSS Variables (`surfaces.css`)

```css
--glass-bg: color-mix(in srgb, var(--color-blue-900) 60%, transparent);
--glass-header: color-mix(in srgb, var(--color-blue-900) 40%, transparent);
--glass-body: color-mix(in srgb, var(--color-blue-900) 30%, transparent);
```

---

## Reference Implementations

### Floating Bars (Pagination, Bulk Actions)

**File**: `NotesDirectoryPage.tsx`, `BulkActionsBar.tsx`

```tsx
<div
  className="fixed z-40 px-6 py-3 rounded-2xl border shadow-2xl"
  style={{
    backgroundColor: 'var(--glass-bg)',
    borderColor: 'color-mix(in srgb, var(--text-primary) 15%, transparent)',
    boxShadow: 'var(--shadow-xl), 0 0 60px -20px var(--color-primary-alpha)',
    backdropFilter: 'blur(20px) saturate(180%)',
    WebkitBackdropFilter: 'blur(20px) saturate(180%)',
  }}
>
```

### Toggle Buttons (Grid/List)

**File**: `ViewModeToggle.tsx`

```tsx
// Container - transparent, border only
<div
  className="flex items-center rounded-xl border overflow-hidden"
  style={{ borderColor: 'var(--border)' }}
>
  {/* Each button gets its own background */}
  <button
    style={{
      backgroundColor: isActive
        ? 'var(--color-brand-600)'
        : 'color-mix(in srgb, var(--text-primary) 8%, transparent)',
      color: isActive ? '#ffffff' : 'var(--text-secondary)',
    }}
  />

  {/* Full-height separator */}
  <div
    className="w-px self-stretch"
    style={{ backgroundColor: 'color-mix(in srgb, var(--text-primary) 15%, transparent)' }}
  />
</div>
```

### Dropdown Menus

**File**: `NotesFilter.tsx`, `DirectoryPageControls.tsx`, `user-menu/index.tsx`

```tsx
<div
  className="absolute rounded-xl border overflow-hidden"
  style={{
    backgroundColor: 'var(--glass-bg)',
    borderColor: 'color-mix(in srgb, var(--text-primary) 15%, transparent)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
  }}
>
  {/* Menu items */}
  <button
    className="hover:bg-[color-mix(in_srgb,var(--text-primary)_10%,transparent)]"
    style={{
      backgroundColor: 'transparent',
      color: 'var(--text-primary)',
    }}
  />
</div>
```

### Standard Buttons/Inputs

**File**: `NotesFilter.tsx`, `Pagination.tsx`

```tsx
<button
  style={{
    backgroundColor: 'color-mix(in srgb, var(--text-primary) 8%, transparent)',
    borderColor: 'color-mix(in srgb, var(--text-primary) 15%, transparent)',
    color: 'var(--text-primary)',
  }}
/>
```

### Destructive/Error Buttons

**File**: `BulkActionsBar.tsx`

```tsx
<button
  style={{
    backgroundColor: isEnabled
      ? 'color-mix(in srgb, var(--color-error) 20%, transparent)'
      : 'color-mix(in srgb, var(--text-primary) 8%, transparent)',
    color: isEnabled ? 'var(--color-error)' : 'var(--text-tertiary)',
    border: isEnabled
      ? '1px solid color-mix(in srgb, var(--color-error) 30%, transparent)'
      : 'none',
  }}
/>
```

### Modals/Dialogs

**File**: `Dialog.tsx`, `EditNoteModal.tsx`

```tsx
// Dialog content
<div className="bg-[var(--glass-bg)] backdrop-blur-xl">
  {/* Header */}
  <div className="bg-[var(--glass-header)]" />

  {/* Body */}
  <div className="bg-[var(--glass-body)]" />
</div>
```

### Badges/Pills

**File**: `NotesDirectoryPage.tsx`

```tsx
<span
  style={{
    backgroundColor: 'color-mix(in srgb, var(--text-primary) 10%, transparent)',
    color: 'var(--text-secondary)',
  }}
/>
```

---

## Components Fully Updated ✅

| Component | File |
|-----------|------|
| Note Cards | `NoteCard.tsx`, `NoteListItem.tsx` |
| Edit Note Modal | `EditNoteModal.tsx`, `Dialog.tsx` |
| Rich Text Editor | `RichTextEditor.tsx` |
| Version History | `NoteVersionHistoryPanel.tsx`, `NoteVersionTimeline.tsx`, `NoteVersionDiffViewer.tsx` |
| Notes Filter | `NotesFilter.tsx` |
| View Mode Toggle | `ViewModeToggle.tsx` |
| Directory Controls | `DirectoryPageControls.tsx` |
| Pagination | `Pagination.tsx` |
| Bulk Actions Bar | `BulkActionsBar.tsx` |
| User Menu | `user-menu/index.tsx`, `ApiKeySection.tsx` |
| Floating Pagination | `NotesDirectoryPage.tsx` |

---

## Components To Update

Use the patterns above to update these:

- [ ] Chat page components
- [ ] Focus page components
- [ ] Settings page components
- [ ] Dashboard components
- [ ] Insights page components
- [ ] GitHub integration components
- [ ] Voice components
- [ ] Other dropdowns and modals

---

## Tips

1. **Replace `var(--surface-elevated)`** with `color-mix(in srgb, var(--text-primary) 8%, transparent)`
2. **Replace `var(--surface-hover)`** with `color-mix(in srgb, var(--text-primary) 10%, transparent)`
3. **Replace `var(--border)`** with `color-mix(in srgb, var(--text-primary) 15%, transparent)` for floating elements
4. **Replace `var(--color-success)`** with `var(--color-brand-500)` for consistency
5. **Add backdrop-blur** to any floating/overlay element
6. **Use `self-stretch`** for full-height separators in flex containers

---

**Remember**: This file is for current session work. Long-term learnings are in `.claude/memory.md`.
