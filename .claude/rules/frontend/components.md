# Frontend Components

## Agent Streaming Components

Components for displaying AI agent activity:

| Component | Purpose |
|-----------|---------|
| `ThinkingStepCard` | Expandable reasoning display |
| `ToolExecutionCard` | Tool calls with input/output |
| `GroundingSourcesCard` | Gemini web search sources |
| `GrokSearchSourcesCard` | Grok live search results |
| `CodeExecutionCard` | Code execution results |
| `RetrievedContextCard` | RAG-retrieved notes |

## Chat Input Composition

14-component input subsystem with composition pattern:

```text
ChatInput → ChatInputRoot → ChatInputContainer
  ├── ChatInputTextArea
  ├── ChatFormattingToolbar
  ├── ChatInputActions
  ├── ChatAttachmentGallery
  └── ChatMentionsDropdown
```

## Focus Dashboard Components

Location: `features/focus/` (20 files)

| Component | Purpose |
|-----------|---------|
| `CurrentFocusCard` | Active task with timer |
| `TodaysPlanList` | Scheduled tasks for today |
| `BacklogSection` | Priority-filtered backlog (P1/P2/P3) |
| `FocusSuggestionsPanel` | AI-generated suggestions |
| `QuickCaptureModal` | Rapid task creation |
| `FocusTimer` | Pomodoro-style time tracking |

## GitHub Integration Components

Location: `features/github/` (31+ files)

| Component | Purpose |
|-----------|---------|
| `GitHubRepoSelector` | Repository picker |
| `GitHubBranchesList` | Branch history view |
| `GitHubCommitsList` | Commit history view |
| `GitHubPullRequestList` | PR management |
| `GitHubIssuesList` | Issue management |
| `GitHubActionsPanel` | Workflow runs |
| `FileTreeView` | Code browser tree |
| `CodeViewer` | Syntax highlighted code |
| `FileSearchInput` | File search |

## Voice Components

Location: `features/voice/` (18 files)

| Component | Purpose |
|-----------|---------|
| `VoiceOrb` | Interactive voice activation |
| `VoiceControls` | Mic, mute, settings |
| `VoiceTranscript` | Real-time transcript |
| `VoiceAgentActivityPanel` | Tool executions, thinking |

## Insights Dashboard

Location: `features/insights/` (8 files)

Multi-tab analytics:
- **Overview Tab** - Overall statistics
- **RAG Tab** - Query performance, topic clustering
- **Chat Tab** - Conversation analytics
- **Agent Tab** - Tool execution metrics

## Notes Components

Location: `features/notes/` (27 files)

Key components:
- `NoteVersionHistoryPanel.tsx` - Slide-out timeline for version history
- Version hooks: `use-note-versions.ts` (history, diff, restore)
