# Current Session Context

> **Last Updated**: 2026-01-04
> **Focus**: Subtle Frosted Glass UI - Dashboard, Notes Directory, Chat Page, and Insights Page Complete

---

## Overview

The Dashboard (Focus) page, Notes Directory page, **Chat page**, and **Insights page** have been fully updated with **subtle** frosted glass styling. The styling is now consistent across all three themes (light, dark, blue).

---

## Subtle Frosted Glass Implementation Guide

### Core Principles

1. **Subtle transparency** - Use very low `color-mix()` percentages for a refined look
2. **Backdrop blur** - Add `backdrop-blur-xl` to sidebar and floating elements
3. **Consistent tint levels** - Follow the refined percentages below
4. **Brand colors for selections** - Use solid `var(--color-brand-600)` for active/selected states

---

### Standard Color-Mix Values (SUBTLE)

```css
/* Card/Container Backgrounds */
background-color: color-mix(in srgb, var(--text-primary) 2%, transparent);

/* Button & Input Backgrounds */
background-color: color-mix(in srgb, var(--text-primary) 4%, transparent);

/* Hover States */
background-color: color-mix(in srgb, var(--text-primary) 3%, transparent);

/* Borders & Dividers */
border-color: color-mix(in srgb, var(--text-primary) 6%, transparent);

/* Blockquote/Stronger Borders */
border-color: color-mix(in srgb, var(--text-primary) 10%, transparent);

/* Floating Containers (dropdowns, modals) */
background-color: color-mix(in srgb, var(--background) 90%, transparent);
backdrop-filter: blur(20px) saturate(180%);
-webkit-backdrop-filter: blur(20px) saturate(180%);

/* Sidebar with Blur */
background-color: color-mix(in srgb, var(--background) 85%, transparent);
backdrop-filter: blur(24px);

/* Selected/Active States */
background-color: var(--color-brand-600);
color: #ffffff;
```

---

## Reference Implementations

### Note Cards

**File**: `NoteCard.tsx`, `NoteListItem.tsx`

```tsx
// Default state
style={{
  backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
  borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
}}

// Hover state - brand color border
borderColor: 'var(--color-brand-500)'
```

### Header Controls (Buttons, Inputs, Badges)

**File**: `DirectoryPageControls.tsx`, `FocusDashboardControls.tsx`

```tsx
// Button/Input background
backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
border: '1px solid color-mix(in srgb, var(--text-primary) 6%, transparent)',
```

### Toggle Components (View Mode, Theme)

**File**: `ViewModeToggle.tsx`, `ThemeToggle.tsx`

```tsx
// Container border
borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',

// Inactive button
backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',

// Active button
backgroundColor: 'var(--color-brand-600)',
color: '#ffffff',
```

### Sidebar

**File**: `Sidebar.tsx`

```tsx
// Main sidebar with blur
style={{
  backgroundColor: 'color-mix(in srgb, var(--background) 85%, transparent)',
  borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
  boxShadow: '0 8px 32px -8px color-mix(in srgb, var(--text-primary) 10%, transparent)',
}}
className="backdrop-blur-xl"

// Nav link hover (non-active)
backgroundColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
```

### Dropdown Menus

**File**: `NotesFilter.tsx`, `DirectoryPageControls.tsx`

```tsx
style={{
  backgroundColor: 'color-mix(in srgb, var(--background) 90%, transparent)',
  borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
  backdropFilter: 'blur(20px) saturate(180%)',
}}
```

### Dashboard Cards

**File**: `CurrentFocusCard.tsx`, `TodaysPlanList.tsx`, `BacklogSection.tsx`, etc.

```tsx
style={{
  backgroundColor: 'color-mix(in srgb, var(--text-primary) 2%, transparent)',
  borderColor: 'color-mix(in srgb, var(--text-primary) 6%, transparent)',
}}

// Internal borders/dividers
borderColor: 'color-mix(in srgb, var(--text-primary) 4%, transparent)',
```

---

## Components Fully Updated ✅

### Notes Directory Page

| Component | File |
|-----------|------|
| Note Cards | `NoteCard.tsx`, `NoteListItem.tsx` |
| Notes Filter | `NotesFilter.tsx` |
| View Mode Toggle | `ViewModeToggle.tsx` |
| Directory Controls | `DirectoryPageControls.tsx` |
| Pagination | `Pagination.tsx` |
| Bulk Actions Bar | `BulkActionsBar.tsx` |

### Dashboard (Focus) Page

| Component | File |
|-----------|------|
| Current Focus Card | `CurrentFocusCard.tsx` |
| Today's Plan List | `TodaysPlanList.tsx` |
| Backlog Section | `BacklogSection.tsx` |
| Focus Suggestions Panel | `FocusSuggestionsPanel.tsx` |
| Progress Summary | `ProgressSummary.tsx` |
| Claude Session Card | `ClaudeSessionCard.tsx` |
| Dashboard Controls | `FocusDashboardControls.tsx` |
| Dashboard Page (error state) | `DashboardPage.tsx` |

### Global Components

| Component | File |
|-----------|------|
| Sidebar | `Sidebar.tsx` |
| Theme Toggle | `ThemeToggle.tsx` |

### Chat Page ✅

| Component | File |
|-----------|------|
| Chat Sidebar | `ChatSidebar.tsx` (fully transparent) |
| Chat Header | `ChatHeader.tsx` |
| Conversation List Item | `ConversationListItem.tsx` (brand color selection) |
| Chat Page Controls | `ChatPageControls.tsx` (bulk actions) |
| Model Selector | `model-selector/index.tsx`, `ModelSelectorTrigger.tsx`, `ProviderTabs.tsx`, `ModelsList.tsx`, `RefreshButton.tsx` |
| Feature Mode Pill | `FeatureModePill.tsx` (RAG/Agent toggles) |
| Agent Settings Popover | `AgentSettingsPopover.tsx` (subtle green) |
| Context Usage Indicator | `context-usage/index.tsx`, `ContextBreakdownItem.tsx` (token counter) |
| Message Bubble | `MessageBubble.tsx` |
| Process Timeline | `ProcessTimeline.tsx` |
| Retrieved Notes Card | `RetrievedNotesCard.tsx` |
| Streaming Indicator | `StreamingIndicator.tsx` |
| Image Generation Panel | `ImageGenerationPanel.tsx` |
| Chat Mentions Dropdown | `ChatMentionsDropdown.tsx` |
| Chat Formatting Toolbar | `ChatFormattingToolbar.tsx` |
| Chat Smart Prompts | `ChatInputSmartPrompts.tsx` |
| Thinking Step Card | `ThinkingStepCard.tsx` |
| Tool Execution Card | `ToolExecutionCard.tsx` |
| Chat Attachment Gallery | `ChatAttachmentGallery.tsx` |
| Chat Toolbar Buttons | `ChatInputToolbarButton.tsx` |
| Chat Error Message | `ChatErrorMessage.tsx` |
| Chat Input CSS Module | `chat-input.module.css` |

**Additional Changes:**
- Hidden Cohere from provider list (`use-chat-provider-selection.ts`)

### Insights Page ✅

| Component | File |
|-----------|------|
| Stat Card | `StatCard.tsx` (shared dashboard card) |
| Chat Tab | `ChatTab.tsx` (skeletons, tooltips, progress bars, model cards) |
| Agent Tab | `AgentTab.tsx` (skeletons, tooltips, tables) |
| Overview Tab | `OverviewTab.tsx` (error state) |
| Analytics Tab Bar | `AnalyticsTabBar.tsx` (RAG sub-tab navigation) |
| RAG Stats Cards | `RagStatsCards.tsx` |
| Score Correlation Card | `ScoreCorrelationCard.tsx` |
| Feedback Summary Card | `FeedbackSummaryCard.tsx` |
| Topic Distribution Card | `TopicDistributionCard.tsx` |
| Query Logs Table | `QueryLogsTable.tsx` (headers, rows, expanded view, pagination) |

---

## Components To Update

Use the patterns above to update these:

- [x] ~~Chat page components~~ (completed)
- [x] ~~Insights page components~~ (completed)
- [ ] **Settings page components** ← NEXT
- [ ] GitHub integration components
- [ ] Voice components
- [ ] Other modals and dialogs

---

## Quick Reference: Old → New Values

| Old Value | New Value |
|-----------|-----------|
| `8%` (buttons/inputs) | `4%` |
| `10%` (hover) | `3%` |
| `15%` (borders) | `6%` |
| `var(--border)` | `color-mix(in srgb, var(--text-primary) 6%, transparent)` |
| `var(--surface-elevated)` | `color-mix(in srgb, var(--text-primary) 4%, transparent)` |
| `var(--surface-hover)` | `color-mix(in srgb, var(--text-primary) 4%, transparent)` |
| `transparent` (cards) | `color-mix(in srgb, var(--text-primary) 2%, transparent)` |

---

**Remember**: This file is for current session work. Long-term learnings are in `.claude/memory.md`.
