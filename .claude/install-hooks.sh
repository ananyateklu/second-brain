#!/bin/bash

# Install Claude Memory System Git Hooks
# Usage: ./.claude/install-hooks.sh

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

echo -e "${BLUE}🔧 Installing Claude Memory System Git Hooks${NC}"
echo ""

cd "$PROJECT_ROOT"

# Check if .git directory exists
if [ ! -d ".git" ]; then
  echo -e "${YELLOW}⚠️  Warning: Not a git repository${NC}"
  echo "Run this script from the project root with a .git directory"
  exit 1
fi

# Install post-commit hook
if [ -f ".git/hooks/post-commit" ]; then
  echo -e "${YELLOW}⚠️  Post-commit hook already exists. Backup created.${NC}"
  cp .git/hooks/post-commit .git/hooks/post-commit.backup
fi

cp .claude/hooks/post-commit .git/hooks/post-commit
chmod +x .git/hooks/post-commit
echo -e "${GREEN}✅ Installed post-commit hook${NC}"

# Install pre-push hook
if [ -f ".git/hooks/pre-push" ]; then
  echo -e "${YELLOW}⚠️  Pre-push hook already exists. Backup created.${NC}"
  cp .git/hooks/pre-push .git/hooks/pre-push.backup
fi

cp .claude/hooks/pre-push .git/hooks/pre-push
chmod +x .git/hooks/pre-push
echo -e "${GREEN}✅ Installed pre-push hook${NC}"

echo ""
echo -e "${BLUE}📚 Hooks Installed:${NC}"
echo "  - post-commit: Auto-updates context after commits"
echo "  - pre-push: Generates fresh context before pushing"
echo ""
echo -e "${GREEN}✨ Installation complete!${NC}"
echo ""
echo -e "${YELLOW}Test the hooks:${NC}"
echo "  git commit --allow-empty -m \"test: hooks\""
echo ""
