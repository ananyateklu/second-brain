# Claude Code Context System

Intelligent context management for Second Brain development with Claude Code.

> **🔒 Important**: This system operates in **READ-ONLY mode** for git operations.
> All commits, pushes, and git modifications must be done manually by the developer.
> See `GITHUB_INTEGRATION.md` for details.

## System Architecture

```text
.claude/
├── CLAUDE.md (root)          # Navigation hub → points to everything below
│
├── rules/                    # 📚 KNOWLEDGE BASE (auto-loaded by Claude Code)
│   ├── backend/              # Architecture, AI providers, agents, voice
│   ├── frontend/             # React patterns, components, state
│   ├── database/             # Schema, queries, migrations
│   ├── workflows.md          # Adding features, endpoints, preferences
│   ├── features.md           # RAG, Focus, GitHub, Tauri systems
│   ├── configuration.md      # Env vars, ports, types
│   └── testing.md            # Test patterns, curl examples
│
├── agents/                   # 🤖 SPECIALIZED WORKERS (process-focused)
│   ├── backend.md            # ASP.NET Core specialist
│   ├── frontend.md           # React/TypeScript specialist
│   ├── database.md           # PostgreSQL/EF Core specialist
│   ├── tauri.md              # Rust/Desktop specialist
│   └── debug-test.md         # Debugging/testing specialist
│
├── memory.md                 # 🧠 LONG-TERM MEMORY (user preferences, learnings)
├── session.md                # 📍 CURRENT SESSION (work focus, blockers)
├── auto-context.md           # 🔄 AUTO-GENERATED (git status, recent activity)
└── memory-cli.sh             # 🛠️ CLI TOOL (manage memory system)
```

## How It All Works Together

| Component | Purpose | When Used |
|-----------|---------|-----------|
| **rules/** | Technical documentation, patterns, architecture | Always loaded as context |
| **agents/** | Specialized subagents for specific domains | Spawned for domain tasks |
| **memory.md** | User preferences, gotchas, learnings | Referenced for personalization |
| **session.md** | Current work focus, blockers, notes | Track ongoing work |
| **auto-context.md** | Git status, recent commits, file activity | Fresh context on demand |

### Data Flow

```text
User Request → Claude reads CLAUDE.md
                    ↓
            Loads rules/ for knowledge
                    ↓
            Spawns agent/ for specialized work
                    ↓
            References memory.md for preferences
                    ↓
            Uses session.md for current context
```

## Quick Start

```bash
# Check status
./.claude/memory-cli.sh status

# Start a new session
./.claude/memory-cli.sh start-session

# Update current session
./.claude/memory-cli.sh update-session "Working on RAG optimization"

# Generate auto-context
./.claude/memory-cli.sh auto-context

# View files
./.claude/memory-cli.sh view memory     # View memory.md
./.claude/memory-cli.sh view session    # View session.md
./.claude/memory-cli.sh view auto       # View auto-context.md

# Add notes
./.claude/memory-cli.sh add-note        # Quick note to session
./.claude/memory-cli.sh add-learning    # Learning to memory

# Export everything
./.claude/memory-cli.sh export          # Creates full-context.md
```

## File Structure

```text
.claude/
├── README.md              # This file - system overview
├── GETTING_STARTED.md     # First-time setup guide
├── GITHUB_INTEGRATION.md  # Git policy documentation
│
├── rules/                 # 📚 Knowledge base (auto-loaded)
│   ├── backend/
│   │   ├── architecture.md   # Clean Architecture, CQRS, patterns
│   │   ├── ai-providers.md   # Provider capabilities, circuit breaker
│   │   ├── agents.md         # Streaming strategies, plugins
│   │   └── voice.md          # Voice I/O system
│   ├── frontend/
│   │   ├── architecture.md   # Zustand, TanStack Query, SSE
│   │   └── components.md     # Component patterns
│   ├── database/
│   │   ├── schema.md         # 29 tables, PostgreSQL 18
│   │   └── queries.md        # MCP tools, query patterns
│   ├── workflows.md          # Adding features, endpoints
│   ├── features.md           # RAG, Focus, GitHub, Tauri
│   ├── configuration.md      # Env vars, ports, types
│   └── testing.md            # Test patterns, ADRs
│
├── agents/                # 🤖 Specialized workers
│   ├── backend.md            # ASP.NET Core specialist
│   ├── frontend.md           # React/TypeScript specialist
│   ├── database.md           # PostgreSQL specialist
│   ├── tauri.md              # Rust/Desktop specialist
│   └── debug-test.md         # Debugging specialist
│
├── memory.md              # 🧠 Long-term preferences (commit)
├── session.md             # 📍 Current session (commit)
├── auto-context.md        # 🔄 Auto-generated (gitignore)
├── auto-context.sh        # Context generator script
├── memory-cli.sh          # CLI management tool
├── .claudeignore          # Files to exclude from context
└── hooks/                 # Git hooks (optional)
    ├── post-commit        # Auto-update session
    └── pre-push           # Generate final context
```

## Usage

### Starting a Work Session

```bash
./.claude/memory-cli.sh start-session
# Prompts for focus, generates auto-context
```

### During Development

```bash
# Quick notes
./.claude/memory-cli.sh add-note
# "Remember to test with 10k+ notes"

# Update focus
./.claude/memory-cli.sh update-session "Implementing batch processing"

# Regenerate context
./.claude/memory-cli.sh auto-context
```

### End of Session

```bash
./.claude/memory-cli.sh end-session
# Prompts for summary, offers to commit
```

### Adding to Long-term Memory

Edit `memory.md` directly or use:

```bash
# Add a learning
./.claude/memory-cli.sh add-learning
# "Batch size of 50 is optimal for RAG indexing"

# Edit memory file
./.claude/memory-cli.sh edit memory
```

## Auto-Context Generator

The `auto-context.sh` script generates context from:

- **Git status**: Branch, commits ahead/behind, uncommitted changes
- **Recent commits**: Last 10 commits
- **File activity**: Most edited files in last 7 days
- **TODOs**: Open TODO/FIXME comments
- **Test status**: Backend and frontend test counts
- **Database**: Migration status
- **Docker**: Running containers
- **Environment**: Node, .NET, PostgreSQL versions

Run manually or via CLI:

```bash
./.claude/auto-context.sh
# OR
./.claude/memory-cli.sh auto-context
```

## Git Hooks (Optional)

Set up automatic context updates:

### Post-commit Hook

Auto-updates session.md after each commit:

```bash
#!/bin/bash
./.claude/auto-context.sh
```

### Pre-push Hook

Generates fresh context before pushing:

```bash
#!/bin/bash
./.claude/memory-cli.sh auto-context
echo "✅ Auto-context updated"
```

Install hooks:

```bash
cp .claude/hooks/post-commit .git/hooks/post-commit
cp .claude/hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/post-commit .git/hooks/pre-push
```

## Integration with CLAUDE.md

The main `CLAUDE.md` references this memory system:

```markdown
# Second Brain - Developer Documentation

> 📝 **Personalized Context**: See `.claude/memory.md` for user preferences
> 🔄 **Session Context**: Auto-loaded from `.claude/auto-context.md`
```

## .claudeignore

Controls which files are excluded from Claude's context. Uses `.gitignore` syntax.

**Excluded by default**:

- Build outputs (bin/, obj/, dist/)
- Dependencies (node_modules/)
- Test coverage
- Large media files
- IDE files
- Secrets (.env files)

## Best Practices

### What Goes Where

| Type | Location | Example |
|------|----------|---------|
| **Architecture patterns** | `rules/` | Clean Architecture, CQRS patterns |
| **Domain processes** | `agents/` | "When adding a controller, do X then Y" |
| **User preferences** | `memory.md` | "Prefers detailed logging", "Always use Result<T>" |
| **Gotchas/quirks** | `memory.md` | "PostgreSQL port is 5433 on desktop" |
| **Current work** | `session.md` | "Optimizing RAG query expansion" |
| **Git/file context** | `auto-context.md` | Recent commits, modified files |

### Rules vs Agents vs Memory

| Aspect | rules/ | agents/ | memory.md |
|--------|--------|---------|-----------|
| **Content** | Technical docs | Process workflows | Personal preferences |
| **Scope** | Project-wide patterns | Domain-specific tasks | User-specific learnings |
| **Loading** | Auto-loaded by Claude | Spawned on demand | Referenced for context |
| **Updates** | When architecture changes | When workflows change | Continuously as you learn |
| **Examples** | "Here's the schema" | "Here's how to add a table" | "User prefers X approach" |

### When to Update

- **memory.md**: When you learn something new, discover a pattern, or find a quirk
- **session.md**: At start of work, when changing focus, at end of day
- **auto-context.md**: Before asking Claude for help, after significant changes

### Committing

- ✅ **Commit**: `memory.md`, `session.md`
- ❌ **Gitignore**: `auto-context.md`, `full-context.md`, `*.bak`

## Advanced Usage

### Export All Context

Create a single file with everything:

```bash
./.claude/memory-cli.sh export
# Creates .claude/full-context.md
```

Useful for:

- Sharing context with team
- Debugging context issues
- Archiving session state

### Clean Up

Remove backup and temp files:

```bash
./.claude/memory-cli.sh clean
```

### Custom Context Scripts

Add your own scripts to `.claude/`:

```bash
# Example: Check API health
.claude/check-health.sh

# Example: Summarize recent work
.claude/summarize-week.sh
```

## Troubleshooting

**Q: Auto-context not generating?**

```bash
chmod +x ./.claude/auto-context.sh
./.claude/auto-context.sh
```

**Q: Memory CLI not working?**

```bash
chmod +x ./.claude/memory-cli.sh
./.claude/memory-cli.sh help
```

**Q: Session file corrupted?**

```bash
# Restore from backup
cp ./.claude/session.md.bak ./.claude/session.md
```

**Q: Want to reset everything?**

```bash
# Backup first!
cp ./.claude/memory.md ~/memory-backup.md

# Regenerate templates
# (Use the creation scripts from initial setup)
```

## Future Enhancements

- [ ] VS Code extension for memory management
- [ ] AI-powered context summarization
- [ ] Automatic learning extraction from commits
- [ ] Integration with GitHub Issues/PRs
- [ ] Time tracking per feature
- [ ] Context compression for large codebases
- [ ] Multi-developer session tracking
- [ ] Slack/Discord integration for team context

## Contributing

Improve the memory system:

1. Add new context sources to `auto-context.sh`
2. Enhance `memory-cli.sh` with new commands
3. Create custom hooks for your workflow
4. Share learnings in `memory.md`

## License

Part of the Second Brain project. See main LICENSE file.
