# Getting Started with Claude Memory System

Welcome to the Claude Memory System for Second Brain! This guide will help you set up and use the intelligent context management system.

> **🔒 Important Security Notice**
>
> This memory system operates in **READ-ONLY mode** for git operations.
> - ✅ **CAN**: Read git status, history, branches, commits
> - ❌ **CANNOT**: Create commits, push, modify git history, or perform any write operations
> - 📋 **Why**: Safety, control, transparency - you maintain full control over version control
>
> **All git commits and pushes must be done manually by you.**
> See `.claude/GITHUB_INTEGRATION.md` for detailed GitHub workflow guide.

## 🎯 What is This?

The Claude Memory System helps Claude Code maintain context across development sessions by organizing information into three layers:

1. **Long-term Memory** (`memory.md`) - Your preferences, patterns, and learnings
2. **Session State** (`session.md`) - What you're currently working on
3. **Auto-generated Context** (`auto-context.md`) - Fresh data from git, files, and tests

## 🚀 Quick Setup (5 minutes)

### Step 1: Verify Installation

Check that all files were created:

```bash
ls -la .claude/
```

You should see:
- ✅ `memory.md` - Long-term preferences template
- ✅ `session.md` - Current session template
- ✅ `auto-context.sh` - Context generator script
- ✅ `memory-cli.sh` - Management CLI tool
- ✅ `README.md` - Documentation
- ✅ `hooks/` - Git hooks directory

### Step 2: Make Scripts Executable

```bash
chmod +x .claude/*.sh
chmod +x .claude/hooks/*
```

### Step 3: Install Git Hooks (Optional)

```bash
./.claude/install-hooks.sh
```

This installs:
- **post-commit**: Auto-updates context after commits
- **pre-push**: Generates fresh context before pushing

### Step 4: Start Your First Session

```bash
./.claude/memory-cli.sh start-session
```

This will:
1. Prompt you for what you're working on
2. Update `session.md` with your focus
3. Generate `auto-context.md` from your git state

✨ **You're ready to go!**

---

## 📚 Core Concepts

### The Three Layers

#### 1. memory.md - Long-term Knowledge

**Purpose**: Store preferences, patterns, and learnings that persist across sessions

**What goes here:**
- Code style preferences ("always use arrow functions")
- Project quirks ("Desktop PostgreSQL uses port 5433")
- Custom patterns you've discovered
- Performance optimizations learned
- Common gotchas and solutions

**When to update:**
- Found a useful pattern → Add to "Custom Patterns"
- Discovered a bug/quirk → Add to "Common Gotchas"
- Learned something new → Add to "Learning Log"
- Changed your preferences → Update "Developer Preferences"

**Example entry:**
```markdown
### Common Gotchas

#### Issue: EF Core not saving changes
**Cause**: Repository doesn't copy properties to tracked entity
**Solution**: Always copy all properties in UpdateAsync()
```

#### 2. session.md - Current Work

**Purpose**: Track what you're doing right now

**What goes here:**
- Current focus/goal
- Active tasks (TODO list)
- Files you're modifying
- Quick notes and discoveries
- Time tracking

**When to update:**
- Start of work day
- When changing focus
- End of work session
- Adding quick notes

**Example update:**
```bash
./.claude/memory-cli.sh update-session "Optimizing RAG query expansion"
./.claude/memory-cli.sh add-note "Batch size of 50 is optimal"
```

#### 3. auto-context.md - Fresh Data

**Purpose**: Auto-generated context from your codebase state

**What it includes:**
- Git status (branch, uncommitted changes)
- Recent commits (last 10)
- File activity (last 7 days)
- Open TODOs in code
- Test status
- Database migration state
- Docker container status
- Environment info

**When to generate:**
- Before asking Claude for help
- After significant changes
- Before commits (via git hooks)

**Generate:**
```bash
./.claude/memory-cli.sh auto-context
```

---

## 🛠️ Common Workflows

### Starting Your Work Day

```bash
# 1. Start a session
./.claude/memory-cli.sh start-session
# Prompts: "What are you working on?"
# You: "Implementing background summary generation"

# 2. Check status
./.claude/memory-cli.sh status

# 3. View your focus
./.claude/memory-cli.sh view session
```

### During Development

```bash
# Quick note about something important
./.claude/memory-cli.sh add-note
# Prompts: "Quick note:"
# You: "Remember to test with 10k+ notes"

# Update focus when switching tasks
./.claude/memory-cli.sh update-session "Fixing batch processing bug"

# Regenerate context after big changes
./.claude/memory-cli.sh auto-context
```

### When You Learn Something

```bash
# Add to long-term memory
./.claude/memory-cli.sh add-learning
# Prompts: "What did you learn?"
# You: "Batch size of 50 is optimal for RAG indexing"

# OR edit memory.md directly
./.claude/memory-cli.sh edit memory
```

### End of Work Day

```bash
# End session with summary
./.claude/memory-cli.sh end-session
# Prompts: "Session summary (optional):"
# You: "Implemented batch processing, added tests, ready for review"

# Tool shows next steps (manual git operations):
# 💡 Next steps:
#   1. Review changes: git status
#   2. Commit manually: git add .claude/session.md && git commit -m "docs: update session"
#   3. Push when ready: git push

# You manually commit
git add .claude/session.md
git commit -m "docs: session summary - batch processing ready for review"
```

### Before Asking Claude for Help

```bash
# Generate fresh context
./.claude/memory-cli.sh auto-context

# Check what Claude will see
./.claude/memory-cli.sh view auto

# OR export everything to one file
./.claude/memory-cli.sh export
# Creates: .claude/full-context.md
```

---

## 🎨 Customization

### Personalizing memory.md

Edit the template to match your preferences:

```bash
./.claude/memory-cli.sh edit memory
```

**Sections to customize:**

1. **Developer Preferences** - Your code style, testing approach
2. **Project-Specific Knowledge** - Database ports, environment setup
3. **Custom Patterns** - Your discovered patterns and conventions
4. **Common Gotchas** - Problems you've solved
5. **Quick Reference Commands** - Commands you use frequently

### Adding Custom Context

Create your own scripts in `.claude/`:

**Example: Health check script**
```bash
# .claude/check-health.sh
#!/bin/bash
echo "## Health Status"
curl -s http://localhost:5001/health | jq .
```

**Example: Week summary**
```bash
# .claude/summarize-week.sh
#!/bin/bash
git log --since="7 days ago" --pretty=format:"%h %s" > .claude/week-summary.txt
```

### Customizing Auto-Context

Edit `.claude/auto-context.sh` to:
- Add new sections
- Change what's included
- Filter specific files
- Add custom metrics

---

## 🔍 Advanced Usage

### Viewing Context

```bash
# View memory
./.claude/memory-cli.sh view memory

# View session
./.claude/memory-cli.sh view session

# View auto-context
./.claude/memory-cli.sh view auto
```

### Editing Files

```bash
# Edit memory in your editor ($EDITOR)
./.claude/memory-cli.sh edit memory

# Edit session
./.claude/memory-cli.sh edit session
```

### Managing TODOs

```bash
# Show all TODOs from session
./.claude/memory-cli.sh show-todos

# Edit session to add/remove TODOs
./.claude/memory-cli.sh edit session
```

### Cleanup

```bash
# Remove backup and temp files
./.claude/memory-cli.sh clean
```

### Export Everything

```bash
# Create single file with all context
./.claude/memory-cli.sh export

# View exported file
cat .claude/full-context.md
```

---

## 💡 Best Practices

### DO ✅

- **Update session at start of work** - Helps you and Claude stay focused
- **Add learnings to memory** - Build up your knowledge base over time
- **Regenerate auto-context before asking for help** - Fresh context = better answers
- **Commit memory.md and session.md** - Share knowledge with team
- **Use TODOs in session.md** - Track progress visually

### DON'T ❌

- **Don't commit auto-context.md** - It's auto-generated (gitignored)
- **Don't duplicate CLAUDE.md content** - Reference it instead
- **Don't add secrets to memory** - Use 1Password or .env
- **Don't let session.md get stale** - Update when changing focus
- **Don't skip learnings** - Future you will thank present you

### Tips 💡

1. **Use descriptive focus text**
   - ❌ "Working on stuff"
   - ✅ "Implementing background summary generation with retry logic"

2. **Add context to learnings**
   - ❌ "Batch size: 50"
   - ✅ "Batch size of 50 is optimal for RAG indexing (tested with 10k notes)"

3. **Keep memory.md organized**
   - Use clear headings
   - Group related items
   - Remove outdated entries

4. **Review session.md weekly**
   - Archive completed sessions
   - Extract learnings to memory.md
   - Clean up old TODOs

---

## 🐛 Troubleshooting

### Scripts Not Executable

```bash
chmod +x .claude/*.sh
chmod +x .claude/hooks/*
```

### Auto-Context Not Generating

```bash
# Check script exists
ls -la .claude/auto-context.sh

# Make executable
chmod +x .claude/auto-context.sh

# Run manually
./.claude/auto-context.sh
```

### Git Hooks Not Working

```bash
# Reinstall
./.claude/install-hooks.sh

# Check installed
ls -la .git/hooks/post-commit .git/hooks/pre-push

# Test
git commit --allow-empty -m "test: hooks"
```

### Session File Corrupted

```bash
# Restore from backup
cp .claude/session.md.bak .claude/session.md

# OR regenerate from template
# (Contact team for fresh template)
```

### Memory CLI Command Not Found

```bash
# Use full path
./.claude/memory-cli.sh help

# OR add to PATH
export PATH="$PATH:$PWD/.claude"
memory-cli.sh help
```

---

## 📖 Examples

### Example Session Flow

```bash
# Morning - Start session
$ ./.claude/memory-cli.sh start-session
What are you working on?
> Implementing background summary generation

✅ Session started!
Focus: Implementing background summary generation
Branch: feature/summary-improvements

# During work - Add notes
$ ./.claude/memory-cli.sh add-note
Quick note:
> Need to handle cancellation tokens properly

✅ Note added to session

# Found a pattern - Add to memory
$ ./.claude/memory-cli.sh add-learning
What did you learn?
> Use CancellationTokenSource.CreateLinkedTokenSource for nested cancellation

✅ Learning added to memory

# End of day - End session
$ ./.claude/memory-cli.sh end-session
Session summary (optional):
> Implemented background generation, added tests, ready for review

✅ Session ended

💡 Next steps:
  1. Review changes: git status
  2. Commit manually: git add .claude/session.md && git commit -m "docs: update session"
  3. Push when ready: git push

# MANUALLY commit (you do this)
$ git add .claude/session.md .claude/memory.md
$ git commit -m "docs: update session and learnings"
[feature/summary-improvements abc123] docs: update session and learnings
 2 files changed, 15 insertions(+), 2 deletions(-)
```

### Example Memory Entry

```markdown
## Custom Patterns & Conventions

### Backend

#### CancellationToken Pattern
```csharp
// For nested operations, link cancellation tokens
using var linkedCts = CancellationTokenSource.CreateLinkedTokenSource(
    parentCt,
    operationCt
);

await DoWorkAsync(linkedCts.Token);
```

**Why**: Allows cancellation from multiple sources (parent timeout, user cancellation)
**Learned**: 2025-01-15 during background summary implementation
```

---

## 🎓 Learning Path

### Week 1: Basics
- [ ] Set up memory system
- [ ] Install git hooks
- [ ] Start/end sessions daily
- [ ] Add 3+ learnings to memory

### Week 2: Workflows
- [ ] Use quick notes during work
- [ ] Update focus when switching tasks
- [ ] Export context before asking Claude
- [ ] Review and clean session weekly

### Week 3: Advanced
- [ ] Customize memory.md sections
- [ ] Create custom context scripts
- [ ] Share learnings with team
- [ ] Optimize auto-context for your workflow

---

## 🤝 Team Usage

### Sharing Knowledge

**Commit to Git:**
- ✅ `memory.md` - Team patterns and learnings
- ✅ `session.md` - Current work (helps collaboration)
- ❌ `auto-context.md` - Auto-generated (gitignored)

**Team Memory Section:**
```markdown
## Team Learnings

### Database
- Port 5433 for desktop dev (M1/M2 Macs)
- Run migrate.sh after pulling main
- VACUUM needed for 10k+ notes

### Testing
- Backend tests in `Tests.Unit/`
- Run before PR: `dotnet test && pnpm test`
```

### Multi-Developer Sessions

Each developer maintains their own `session.md`:
- Use branches for isolation
- Merge memory learnings to main
- Share patterns via PR reviews

---

## 📚 Further Reading

- `.claude/README.md` - Full system documentation
- `CLAUDE.md` - Main codebase documentation
- `docs/adr/` - Architecture decision records
- `.claude/memory.md` - Your personalized memory (customize it!)

---

## 🎉 You're Ready!

Start your first session:

```bash
./.claude/memory-cli.sh start-session
```

Questions? Check `.claude/README.md` or run:

```bash
./.claude/memory-cli.sh help
```

Happy coding! 🚀
