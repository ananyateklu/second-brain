#!/bin/bash

# Auto-Context Generator for Second Brain Project
# Generates context from git, files, and test results
# Usage: ./.claude/auto-context.sh

set -e

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
OUTPUT_FILE="$SCRIPT_DIR/auto-context.md"

cd "$PROJECT_ROOT"

echo -e "${BLUE}🔄 Generating auto-context...${NC}"

# Get current timestamp
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S")

# Start output file
cat > "$OUTPUT_FILE" << EOF
# Auto-Generated Context

> **Auto-generated** by \`.claude/auto-context.sh\`
> **Last Updated**: $TIMESTAMP
> **Generated From**: Git status, recent commits, file changes, test results

---

EOF

# ============================================================================
# GIT STATUS
# ============================================================================

echo -e "${YELLOW}📊 Analyzing git status...${NC}"

cat >> "$OUTPUT_FILE" << 'EOF'
## 🌿 Git Status

EOF

# Current branch
CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "detached HEAD")
cat >> "$OUTPUT_FILE" << EOF
**Branch**: \`$CURRENT_BRANCH\`

EOF

# Commit position
AHEAD=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo "0")
BEHIND=$(git rev-list --count HEAD..@{u} 2>/dev/null || echo "0")

if [ "$AHEAD" -gt 0 ] || [ "$BEHIND" -gt 0 ]; then
  cat >> "$OUTPUT_FILE" << EOF
**Position**: Ahead by $AHEAD commit(s), behind by $BEHIND commit(s)

EOF
else
  cat >> "$OUTPUT_FILE" << EOF
**Position**: Up to date with remote

EOF
fi

# Uncommitted changes
MODIFIED_COUNT=$(git diff --name-only | wc -l | tr -d ' ')
STAGED_COUNT=$(git diff --cached --name-only | wc -l | tr -d ' ')
UNTRACKED_COUNT=$(git ls-files --others --exclude-standard | wc -l | tr -d ' ')

cat >> "$OUTPUT_FILE" << EOF
**Uncommitted Changes**:
- Modified: $MODIFIED_COUNT file(s)
- Staged: $STAGED_COUNT file(s)
- Untracked: $UNTRACKED_COUNT file(s)

EOF

# Show modified files if any
if [ "$MODIFIED_COUNT" -gt 0 ]; then
  cat >> "$OUTPUT_FILE" << 'EOF'
**Modified Files**:
```
EOF
  git diff --name-only | head -20 >> "$OUTPUT_FILE"
  cat >> "$OUTPUT_FILE" << 'EOF'
```

EOF
fi

# Show staged files if any
if [ "$STAGED_COUNT" -gt 0 ]; then
  cat >> "$OUTPUT_FILE" << 'EOF'
**Staged Files**:
```
EOF
  git diff --cached --name-only | head -20 >> "$OUTPUT_FILE"
  cat >> "$OUTPUT_FILE" << 'EOF'
```

EOF
fi

# ============================================================================
# RECENT COMMITS
# ============================================================================

echo -e "${YELLOW}📝 Analyzing recent commits...${NC}"

cat >> "$OUTPUT_FILE" << 'EOF'
---

## 📝 Recent Commits (Last 10)

EOF

git log --pretty=format:"- **%h** - %s (%ar) - %an" -10 >> "$OUTPUT_FILE"

cat >> "$OUTPUT_FILE" << 'EOF'


EOF

# ============================================================================
# FILE ACTIVITY (Last 7 days)
# ============================================================================

echo -e "${YELLOW}📂 Analyzing file activity...${NC}"

cat >> "$OUTPUT_FILE" << 'EOF'
---

## 📂 File Activity (Last 7 Days)

EOF

# Most edited files
cat >> "$OUTPUT_FILE" << 'EOF'
**Most Edited Files**:
```
EOF

git log --since="7 days ago" --pretty=format: --name-only | \
  grep -v '^$' | \
  sort | uniq -c | sort -rn | head -15 >> "$OUTPUT_FILE"

cat >> "$OUTPUT_FILE" << 'EOF'
```

EOF

# Changes by directory
cat >> "$OUTPUT_FILE" << 'EOF'
**Changes by Directory**:
```
EOF

git log --since="7 days ago" --pretty=format: --name-only | \
  grep -v '^$' | \
  sed 's|/[^/]*$||' | \
  sort | uniq -c | sort -rn | head -10 >> "$OUTPUT_FILE"

cat >> "$OUTPUT_FILE" << 'EOF'
```

EOF

# ============================================================================
# TODO COMMENTS
# ============================================================================

echo -e "${YELLOW}📋 Scanning for TODOs...${NC}"

cat >> "$OUTPUT_FILE" << 'EOF'
---

## 📋 Open TODOs & FIXMEs

EOF

# Find TODOs in backend
TODO_COUNT_BACKEND=$(grep -r "// TODO\|// FIXME" backend/src --include="*.cs" 2>/dev/null | wc -l | tr -d ' ')
# Find TODOs in frontend
TODO_COUNT_FRONTEND=$(grep -r "// TODO\|// FIXME\|\/\/ @ts-expect-error" frontend/src --include="*.ts" --include="*.tsx" 2>/dev/null | wc -l | tr -d ' ')

cat >> "$OUTPUT_FILE" << EOF
**Summary**:
- Backend: $TODO_COUNT_BACKEND TODO/FIXME comments
- Frontend: $TODO_COUNT_FRONTEND TODO/FIXME comments

EOF

# Show top 10 TODOs
cat >> "$OUTPUT_FILE" << 'EOF'
**Top Priority TODOs**:
```
EOF

# Backend TODOs
grep -rn "// TODO\|// FIXME" backend/src --include="*.cs" 2>/dev/null | head -5 >> "$OUTPUT_FILE" || echo "(none)" >> "$OUTPUT_FILE"

# Frontend TODOs
grep -rn "// TODO\|// FIXME" frontend/src --include="*.ts" --include="*.tsx" 2>/dev/null | head -5 >> "$OUTPUT_FILE" || echo "(none)" >> "$OUTPUT_FILE"

cat >> "$OUTPUT_FILE" << 'EOF'
```

EOF

# ============================================================================
# TEST STATUS
# ============================================================================

echo -e "${YELLOW}🧪 Checking test status...${NC}"

cat >> "$OUTPUT_FILE" << 'EOF'
---

## 🧪 Test Status

EOF

# Backend tests
cat >> "$OUTPUT_FILE" << 'EOF'
**Backend Tests**:
EOF

if [ -d "backend" ]; then
  cd backend

  # Check if tests exist
  if dotnet test --list-tests --no-build > /dev/null 2>&1; then
    TEST_COUNT=$(dotnet test --list-tests --no-build 2>/dev/null | grep -c "^\s*" || echo "unknown")
    cat >> "$OUTPUT_FILE" << EOF
- Total tests: $TEST_COUNT
- Last run: Check \`dotnet test\` output
- Status: Run \`dotnet test\` to verify

EOF
  else
    cat >> "$OUTPUT_FILE" << 'EOF'
- Status: Build required before running tests

EOF
  fi

  cd "$PROJECT_ROOT"
else
  cat >> "$OUTPUT_FILE" << 'EOF'
- Status: Backend directory not found

EOF
fi

# Frontend tests
cat >> "$OUTPUT_FILE" << 'EOF'
**Frontend Tests**:
EOF

if [ -d "frontend" ] && [ -f "frontend/package.json" ]; then
  cd frontend

  # Check if test script exists
  if grep -q '"test"' package.json; then
    cat >> "$OUTPUT_FILE" << 'EOF'
- Status: Run `bun test` to execute tests
- Coverage: Check `bun run test:coverage` for details

EOF
  else
    cat >> "$OUTPUT_FILE" << 'EOF'
- Status: No test script configured

EOF
  fi

  cd "$PROJECT_ROOT"
else
  cat >> "$OUTPUT_FILE" << 'EOF'
- Status: Frontend directory not found

EOF
fi

# ============================================================================
# DATABASE STATUS
# ============================================================================

echo -e "${YELLOW}🗄️  Checking database status...${NC}"

cat >> "$OUTPUT_FILE" << 'EOF'
---

## 🗄️ Database Status

EOF

if [ -f "database/migrate.sh" ]; then
  cat >> "$OUTPUT_FILE" << 'EOF'
**Migration Status**:
- Run `./database/migrate.sh status` to check migration state
- Run `./database/migrate.sh diff` to compare Docker vs Desktop schemas

EOF

  # Count SQL files
  SQL_FILE_COUNT=$(ls -1 database/*.sql 2>/dev/null | wc -l | tr -d ' ')
  cat >> "$OUTPUT_FILE" << EOF
**SQL Scripts**: $SQL_FILE_COUNT file(s) in \`database/\`

EOF
else
  cat >> "$OUTPUT_FILE" << 'EOF'
**Migration Status**: Database migration script not found

EOF
fi

# ============================================================================
# DOCKER STATUS
# ============================================================================

echo -e "${YELLOW}🐳 Checking Docker status...${NC}"

cat >> "$OUTPUT_FILE" << 'EOF'
---

## 🐳 Docker Status

EOF

if command -v docker &> /dev/null; then
  if docker ps &> /dev/null; then
    RUNNING_CONTAINERS=$(docker ps --format "{{.Names}}" | wc -l | tr -d ' ')
    cat >> "$OUTPUT_FILE" << EOF
**Containers Running**: $RUNNING_CONTAINERS

EOF

    if [ "$RUNNING_CONTAINERS" -gt 0 ]; then
      cat >> "$OUTPUT_FILE" << 'EOF'
**Active Containers**:
```
EOF
      docker ps --format "{{.Names}} ({{.Status}})" >> "$OUTPUT_FILE"
      cat >> "$OUTPUT_FILE" << 'EOF'
```

EOF
    fi
  else
    cat >> "$OUTPUT_FILE" << 'EOF'
**Status**: Docker daemon not running

EOF
  fi
else
  cat >> "$OUTPUT_FILE" << 'EOF'
**Status**: Docker not installed

EOF
fi

# ============================================================================
# ENVIRONMENT INFO
# ============================================================================

echo -e "${YELLOW}💻 Gathering environment info...${NC}"

cat >> "$OUTPUT_FILE" << 'EOF'
---

## 💻 Environment Info

EOF

# Node version
if command -v node &> /dev/null; then
  NODE_VERSION=$(node --version)
  cat >> "$OUTPUT_FILE" << EOF
- **Node**: $NODE_VERSION
EOF
fi

# .NET version
if command -v dotnet &> /dev/null; then
  DOTNET_VERSION=$(dotnet --version 2>/dev/null || echo "unknown")
  cat >> "$OUTPUT_FILE" << EOF
- **\.NET**: $DOTNET_VERSION
EOF
fi

# PostgreSQL version
if command -v psql &> /dev/null; then
  POSTGRES_VERSION=$(psql --version | awk '{print $3}')
  cat >> "$OUTPUT_FILE" << EOF
- **PostgreSQL**: $POSTGRES_VERSION
EOF
fi

# Git version
if command -v git &> /dev/null; then
  GIT_VERSION=$(git --version | awk '{print $3}')
  cat >> "$OUTPUT_FILE" << EOF
- **Git**: $GIT_VERSION
EOF
fi

cat >> "$OUTPUT_FILE" << 'EOF'

EOF

# ============================================================================
# QUICK ACTIONS
# ============================================================================

cat >> "$OUTPUT_FILE" << 'EOF'
---

## ⚡ Quick Actions

```bash
# Development
bun dev                           # Start frontend (port 3000)
dotnet watch run                  # Start backend (port 5001)
docker-compose up -d              # Start Docker services

# Testing
dotnet test                       # Run backend tests
bun test                          # Run frontend tests

# Database
./database/migrate.sh status      # Check migrations
./database/migrate.sh diff        # Compare schemas

# Git
git status                        # Check working tree
git log -10                       # Recent commits
git diff                          # View changes
```

---

**Remember**: This file is auto-generated. Run `.claude/auto-context.sh` to refresh.
EOF

echo -e "${GREEN}✅ Auto-context generated: $OUTPUT_FILE${NC}"
echo -e "${BLUE}📝 Lines: $(wc -l < "$OUTPUT_FILE")${NC}"

# Make the script executable
chmod +x "$SCRIPT_DIR/auto-context.sh"
