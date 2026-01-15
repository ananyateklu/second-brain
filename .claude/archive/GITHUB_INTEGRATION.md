# GitHub Integration Guide

> **Important**: The Claude Memory System operates in **READ-ONLY mode** for git operations.
> All commits, pushes, and git modifications must be done manually by you, the developer.

---

## 🔒 Read-Only Git Policy

### What the Memory System CAN Do (Read Operations)

✅ **Allowed:**
- Read git status (`git status`, `git branch`)
- Read git history (`git log`, `git diff`)
- Read file changes (`git diff --name-only`)
- Count commits (`git rev-list --count`)
- List branches (`git branch --show-current`)
- Check remote status (`git rev-list --count @{u}..HEAD`)

### What the Memory System CANNOT Do (Write Operations)

❌ **Prohibited:**
- Create commits (`git commit`)
- Push to remote (`git push`)
- Create branches (`git checkout -b`)
- Stage files (`git add`)
- Modify git config (`git config`)
- Rebase or amend (`git rebase`, `git commit --amend`)
- Tag commits (`git tag`)
- Force push (`git push --force`)

### Why Read-Only?

1. **Safety**: Prevents accidental commits or pushes
2. **Control**: You maintain full control over git history
3. **Transparency**: All git operations are explicit and visible
4. **Auditability**: No automated changes to version control
5. **Best Practice**: Automated tools should observe, not modify

---

## 🔄 Recommended Git Workflow

### Daily Workflow

```bash
# Morning - Start your session
./.claude/memory-cli.sh start-session

# Work on features...
# (memory system observes git status)

# Check what changed
git status
git diff

# Stage and commit MANUALLY
git add .
git commit -m "feat: implement background summary generation"

# Session observes your commit (post-commit hook)
# Auto-context is regenerated (read-only)

# Push MANUALLY when ready
git push origin feature/summary-improvements
```

### Creating a Feature

```bash
# 1. Create branch manually
git checkout -b feature/new-feature

# 2. Start session with focus
./.claude/memory-cli.sh start-session
# "Implementing new feature X"

# 3. Work on code...

# 4. Check auto-context before asking Claude
./.claude/memory-cli.sh auto-context

# 5. Commit manually
git add .
git commit -m "feat: add new feature"

# 6. Push manually
git push -u origin feature/new-feature

# 7. End session
./.claude/memory-cli.sh end-session
```

### Reviewing Changes

```bash
# See what you've done
git log --oneline -10

# See uncommitted changes
git status
git diff

# See staged changes
git diff --cached

# Auto-context includes all this info
./.claude/memory-cli.sh view auto
```

---

## 📋 Git Hooks (Read-Only)

### Post-Commit Hook

**What it does:**
- ✅ Regenerates auto-context after each commit
- ✅ Updates file activity tracking
- ✅ Shows reminder to commit session changes

**What it does NOT do:**
- ❌ Create commits
- ❌ Modify git history
- ❌ Stage files

**Install:**
```bash
./.claude/install-hooks.sh
```

**Manual install:**
```bash
cp .claude/hooks/post-commit .git/hooks/post-commit
chmod +x .git/hooks/post-commit
```

### Pre-Push Hook

**What it does:**
- ✅ Regenerates auto-context before push
- ✅ Shows current branch and commit count
- ✅ Confirms push will proceed

**What it does NOT do:**
- ❌ Prevent or cancel pushes
- ❌ Modify commits
- ❌ Change remote state

**Install:**
```bash
./.claude/install-hooks.sh
```

---

## 🌿 Branch Management

### Creating Branches

```bash
# Manual branch creation
git checkout -b feature/description

# Update session
./.claude/memory-cli.sh update-session "Working on feature/description"

# Auto-context will show new branch
./.claude/memory-cli.sh auto-context
```

### Switching Branches

```bash
# Switch manually
git checkout main

# Update session focus
./.claude/memory-cli.sh update-session "Reviewing main branch"
```

### Merging

```bash
# All merges are manual
git checkout main
git merge feature/description

# Resolve conflicts manually
# Commit merge manually
git commit -m "Merge feature/description"
```

---

## 📤 Committing & Pushing

### Commit Session Changes

```bash
# After updating session
git status
git add .claude/session.md
git commit -m "docs: update session context"
```

### Commit Memory Changes

```bash
# After adding learnings to memory
git status
git add .claude/memory.md
git commit -m "docs: add learnings about RAG optimization"
```

### Commit Both

```bash
# Commit session and memory together
git add .claude/session.md .claude/memory.md
git commit -m "docs: update session and memory"
```

### Push to Remote

```bash
# Push current branch
git push

# Push new branch (first time)
git push -u origin feature/new-feature

# Push with lease (safer)
git push --force-with-lease
```

---

## 🔍 GitHub Integration

### Pull Requests

**Before Creating PR:**
```bash
# 1. Generate fresh context
./.claude/memory-cli.sh auto-context

# 2. Review changes
git diff main...HEAD

# 3. Check commit history
git log main..HEAD --oneline

# 4. End session with summary
./.claude/memory-cli.sh end-session
# Summary: "Ready for PR - implemented X, added tests, updated docs"

# 5. Commit session
git add .claude/session.md
git commit -m "docs: session summary for PR"

# 6. Push
git push
```

**Create PR manually:**
- Use GitHub web interface
- OR use GitHub CLI: `gh pr create`

**PR Description Template:**
```markdown
## Summary
[Auto-generated from session.md or write manually]

## Changes
- Feature A
- Bug fix B
- Documentation C

## Testing
- [x] Backend tests pass
- [x] Frontend tests pass
- [x] Manual testing completed

## Session Context
See `.claude/session.md` for detailed development notes

## Related
- Closes #123
```

### Code Review

**For Reviewers:**
```bash
# Check out PR branch
git checkout pr-branch

# Generate context for PR branch
./.claude/memory-cli.sh auto-context

# Review session notes
cat .claude/session.md

# Review memory for patterns used
grep -A 5 "Pattern Name" .claude/memory.md
```

---

## 🤝 Team Collaboration

### Sharing Context

**What to commit to git:**
- ✅ `.claude/memory.md` - Team patterns and learnings
- ✅ `.claude/session.md` - Current work (helps collaboration)
- ✅ `.claude/README.md` - Documentation
- ✅ `.claude/GETTING_STARTED.md` - Onboarding guide
- ✅ `CLAUDE.md` - Main codebase documentation

**What NOT to commit:**
- ❌ `.claude/auto-context.md` - Auto-generated (gitignored)
- ❌ `.claude/full-context.md` - Export files (gitignored)
- ❌ `.claude/*.bak` - Backup files (gitignored)

### Pulling Updates

```bash
# Pull latest changes
git pull origin main

# Check if database migrations changed
./.claude/memory-cli.sh auto-context
grep "Migration Status" .claude/auto-context.md

# OR check directly
./database/migrate.sh status

# Update session
./.claude/memory-cli.sh update-session "Syncing with main"
```

### Merge Conflicts in Memory Files

**If `.claude/memory.md` has conflicts:**
```bash
# Open memory file
./.claude/memory-cli.sh edit memory

# Manually merge learnings from both branches
# Keep all unique learnings, remove duplicates

# Mark as resolved
git add .claude/memory.md
git commit -m "docs: merge memory learnings"
```

**If `.claude/session.md` has conflicts:**
```bash
# Usually keep YOUR session (current work)
git checkout --ours .claude/session.md

# OR keep THEIRS if collaborating on same feature
git checkout --theirs .claude/session.md

# OR manually merge
./.claude/memory-cli.sh edit session
```

---

## 🔐 Security Best Practices

### Never Commit Secrets

```bash
# Check for secrets before committing
grep -r "sk-" .claude/  # API keys
grep -r "password" .claude/
grep -r "token" .claude/

# If found, remove immediately
./.claude/memory-cli.sh edit memory
# Remove sensitive data

# Use .env for secrets instead
echo "OPENAI_API_KEY=sk-..." >> .env
# (.env is gitignored)
```

### GitHub Tokens

**For GitHub CLI:**
```bash
# Store token securely
gh auth login
# Follow prompts

# Do NOT add to memory.md
# Do NOT add to session.md
```

**For GitHub API:**
```bash
# Use environment variable
export GITHUB_TOKEN=ghp_...

# OR use 1Password
op read "op://Dev/GitHub Token/credential"
```

---

## 📊 Monitoring Git Activity

### Auto-Context Tracks

The `auto-context.md` file automatically includes:

```markdown
## Git Status
**Branch**: feature/new-feature
**Position**: Ahead by 3 commits, behind by 0

**Uncommitted Changes**:
- Modified: 5 files
- Staged: 2 files
- Untracked: 1 file

## Recent Commits (Last 10)
- abc123 - feat: implement feature (2 hours ago)
- def456 - fix: resolve bug (3 hours ago)
...

## File Activity (Last 7 Days)
Most Edited Files:
     12 backend/Services/RAG/RagService.cs
      8 frontend/features/chat/hooks/use-chat.ts
```

### View Git Context

```bash
# See full git context
./.claude/memory-cli.sh view auto

# OR export everything
./.claude/memory-cli.sh export
cat .claude/full-context.md
```

---

## 🚨 Troubleshooting

### Hook Not Running

```bash
# Check hook exists
ls -la .git/hooks/post-commit .git/hooks/pre-push

# Make executable
chmod +x .git/hooks/post-commit .git/hooks/pre-push

# Test manually
.git/hooks/post-commit
```

### Accidental Git Operation

**If you accidentally committed:**
```bash
# Undo last commit (keep changes)
git reset --soft HEAD~1

# Review what you were committing
git status

# Recommit manually with correct message
```

**If you accidentally pushed:**
```bash
# Contact team immediately
# Discuss revert strategy

# Force push is dangerous - avoid unless critical
# git push --force-with-lease (use with caution)
```

### Merge Conflicts

```bash
# View conflicted files
git status

# For memory/session conflicts, manually edit
./.claude/memory-cli.sh edit memory
./.claude/memory-cli.sh edit session

# Mark resolved
git add .claude/memory.md .claude/session.md
git commit -m "docs: resolve merge conflicts"
```

---

## 📖 Git Commands Reference

### Safe Read Commands (Used by Memory System)

```bash
git status                    # Check working tree
git branch --show-current     # Current branch name
git log --oneline -10         # Recent commits
git diff --name-only          # Changed files
git rev-list --count HEAD     # Commit count
git diff main...HEAD          # Compare with main
```

### Manual Write Commands (You Do These)

```bash
git add .                     # Stage changes
git commit -m "message"       # Create commit
git push                      # Push to remote
git checkout -b feature/x     # Create branch
git merge feature/x           # Merge branch
git tag v1.0.0                # Create tag
```

---

## ✅ Best Practices Checklist

### Before Committing

- [ ] Run tests: `dotnet test && bun test`
- [ ] Check auto-context: `./.claude/memory-cli.sh auto-context`
- [ ] Review changes: `git status && git diff`
- [ ] Update session: `./.claude/memory-cli.sh update-session`
- [ ] Write clear commit message (conventional commits)

### Before Pushing

- [ ] Pull latest: `git pull --rebase`
- [ ] Run tests again
- [ ] Generate fresh context: `./.claude/memory-cli.sh auto-context`
- [ ] Review commit history: `git log -5`
- [ ] Push: `git push`

### Before PR

- [ ] End session with summary: `./.claude/memory-cli.sh end-session`
- [ ] Commit session: `git add .claude/session.md && git commit`
- [ ] Rebase on main: `git rebase main`
- [ ] Force push: `git push --force-with-lease`
- [ ] Create PR (GitHub UI or `gh pr create`)

### After Merging PR

- [ ] Switch to main: `git checkout main`
- [ ] Pull: `git pull`
- [ ] Delete feature branch: `git branch -d feature/x`
- [ ] Delete remote: `git push origin --delete feature/x`
- [ ] Start new session: `./.claude/memory-cli.sh start-session`

---

## 🎓 Learning Resources

### Git Best Practices

- [Conventional Commits](https://www.conventionalcommits.org/)
- [GitHub Flow](https://guides.github.com/introduction/flow/)
- [Git Rebase Guide](https://git-scm.com/book/en/v2/Git-Branching-Rebasing)

### GitHub CLI

```bash
# Install GitHub CLI
brew install gh

# Authenticate
gh auth login

# Useful commands (all manual)
gh pr create                  # Create PR
gh pr view                    # View PR
gh pr review                  # Review PR
gh pr merge                   # Merge PR
```

---

## 📝 Summary

### Remember

1. **All git writes are MANUAL** - No automated commits or pushes
2. **Memory system is READ-ONLY** - Only observes, never modifies
3. **Git hooks are informational** - They don't prevent or modify operations
4. **Commit session/memory manually** - Share context with team
5. **Use conventional commits** - Clear, consistent commit messages

### Quick Commands

```bash
# Review before commit
git status && git diff

# Commit session
git add .claude/session.md && git commit -m "docs: session update"

# Generate context
./.claude/memory-cli.sh auto-context

# View git info
./.claude/memory-cli.sh view auto | grep "Git Status" -A 20
```

---

**Questions?** See `.claude/README.md` or run `./.claude/memory-cli.sh help`
