#!/bin/bash

# Claude Memory CLI - Manage user memory and session context
# Usage: ./.claude/memory-cli.sh [command] [args]

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

MEMORY_FILE="$SCRIPT_DIR/memory.md"
SESSION_FILE="$SCRIPT_DIR/session.md"
AUTO_CONTEXT_SCRIPT="$SCRIPT_DIR/auto-context.sh"
AUTO_CONTEXT_FILE="$SCRIPT_DIR/auto-context.md"

# ============================================================================
# COMMANDS
# ============================================================================

show_help() {
  cat << EOF
${CYAN}Claude Memory CLI${NC}
Manage user memory and session context for Second Brain project

${YELLOW}Usage:${NC}
  ./memory-cli.sh [command] [args]

${YELLOW}Commands:${NC}
  ${GREEN}status${NC}              Show memory system status
  ${GREEN}update-session${NC}      Update session.md with current work
  ${GREEN}start-session${NC}       Start a new work session
  ${GREEN}end-session${NC}         End current session and save summary
  ${GREEN}auto-context${NC}        Generate auto-context from git/files
  ${GREEN}view [file]${NC}         View memory, session, or auto-context
  ${GREEN}edit [file]${NC}         Edit memory or session file
  ${GREEN}add-note${NC}            Add a quick note to session
  ${GREEN}add-learning${NC}        Add a learning to memory.md
  ${GREEN}show-todos${NC}          Show all TODOs from session
  ${GREEN}clean${NC}               Clean up old session data
  ${GREEN}export${NC}              Export all context to single file
  ${GREEN}help${NC}                Show this help message

${YELLOW}Examples:${NC}
  ./memory-cli.sh status
  ./memory-cli.sh update-session "Working on RAG optimization"
  ./memory-cli.sh add-note "Remember to test with large datasets"
  ./memory-cli.sh view session
  ./memory-cli.sh auto-context

${YELLOW}Files:${NC}
  memory.md          Long-term preferences and learnings
  session.md         Current work session state
  auto-context.md    Auto-generated context from git/files

EOF
}

show_status() {
  echo -e "${CYAN}📊 Memory System Status${NC}"
  echo ""

  # Check if files exist
  echo -e "${YELLOW}Files:${NC}"
  [ -f "$MEMORY_FILE" ] && echo -e "  ✅ memory.md ($(wc -l < "$MEMORY_FILE") lines)" || echo -e "  ❌ memory.md (missing)"
  [ -f "$SESSION_FILE" ] && echo -e "  ✅ session.md ($(wc -l < "$SESSION_FILE") lines)" || echo -e "  ❌ session.md (missing)"
  [ -f "$AUTO_CONTEXT_FILE" ] && echo -e "  ✅ auto-context.md ($(wc -l < "$AUTO_CONTEXT_FILE") lines)" || echo -e "  ⚠️  auto-context.md (not generated yet)"

  echo ""

  # Session info
  if [ -f "$SESSION_FILE" ]; then
    echo -e "${YELLOW}Current Session:${NC}"
    CURRENT_BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
    LAST_UPDATED=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M" "$SESSION_FILE" 2>/dev/null || echo "unknown")
    echo -e "  Branch: $CURRENT_BRANCH"
    echo -e "  Last Updated: $LAST_UPDATED"

    # Extract current focus from session.md (supports **Focus**: and **Working On**: with optional > prefix)
    if grep -q "\*\*Focus\*\*:\|\*\*Working On\*\*:" "$SESSION_FILE" 2>/dev/null; then
      CURRENT_FOCUS=$(grep -E "\*\*Focus\*\*:|\*\*Working On\*\*:" "$SESSION_FILE" | head -1 | sed 's/.*\*\*: //')
      echo -e "  Focus: $CURRENT_FOCUS"
    fi
  fi

  echo ""

  # Git status
  echo -e "${YELLOW}Git Status:${NC}"
  MODIFIED_COUNT=$(git diff --name-only | wc -l | tr -d ' ')
  STAGED_COUNT=$(git diff --cached --name-only | wc -l | tr -d ' ')
  echo -e "  Modified: $MODIFIED_COUNT files"
  echo -e "  Staged: $STAGED_COUNT files"
}

update_session() {
  local focus_text="$1"

  if [ -z "$focus_text" ]; then
    echo -e "${RED}Error: Please provide what you're working on${NC}"
    echo -e "Usage: ./memory-cli.sh update-session \"Description of work\""
    exit 1
  fi

  echo -e "${BLUE}📝 Updating session...${NC}"

  # Update timestamp and focus in session.md
  local timestamp=$(date +"%Y-%m-%d %H:%M:%S")
  local current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")

  # Create backup
  cp "$SESSION_FILE" "$SESSION_FILE.bak"

  # Update the session file
  sed -i.tmp "s/^> \*\*Last Updated\*\*:.*/> **Last Updated**: $timestamp/" "$SESSION_FILE"
  sed -i.tmp "s/^\*\*Branch\*\*:.*/\*\*Branch\*\*: $current_branch/" "$SESSION_FILE"
  sed -i.tmp "s/^\*\*Working On\*\*:.*/\*\*Working On\*\*: $focus_text/" "$SESSION_FILE"
  rm -f "$SESSION_FILE.tmp"

  echo -e "${GREEN}✅ Session updated: $focus_text${NC}"
}

start_session() {
  echo -e "${BLUE}🚀 Starting new session...${NC}"

  # Get current branch
  local current_branch=$(git branch --show-current 2>/dev/null || echo "unknown")

  # Prompt for focus
  echo -e "${YELLOW}What are you working on?${NC}"
  read -p "> " focus_text

  if [ -z "$focus_text" ]; then
    echo -e "${RED}Error: Focus cannot be empty${NC}"
    exit 1
  fi

  # Update session
  update_session "$focus_text"

  # Generate auto-context
  echo -e "${BLUE}🔄 Generating auto-context...${NC}"
  "$AUTO_CONTEXT_SCRIPT"

  echo -e "${GREEN}✅ Session started!${NC}"
  echo -e "${CYAN}Focus: $focus_text${NC}"
  echo -e "${CYAN}Branch: $current_branch${NC}"
}

end_session() {
  echo -e "${BLUE}🏁 Ending session...${NC}"

  # Get session duration (approximate)
  if [ -f "$SESSION_FILE" ]; then
    local last_updated=$(stat -f "%Sm" -t "%Y-%m-%d %H:%M:%S" "$SESSION_FILE" 2>/dev/null || echo "unknown")
    echo -e "${CYAN}Session duration: Check time tracking in session.md${NC}"
  fi

  # Prompt for summary
  echo -e "${YELLOW}Session summary (optional):${NC}"
  read -p "> " summary_text

  if [ -n "$summary_text" ]; then
    # Add summary to session file
    echo "" >> "$SESSION_FILE"
    echo "### Session Summary ($(date +"%Y-%m-%d %H:%M"))" >> "$SESSION_FILE"
    echo "$summary_text" >> "$SESSION_FILE"
    echo "" >> "$SESSION_FILE"
  fi

  echo -e "${GREEN}✅ Session ended${NC}"
  echo ""
  echo -e "${YELLOW}💡 Next steps:${NC}"
  echo -e "  1. Review changes: ${CYAN}git status${NC}"
  echo -e "  2. Commit manually: ${CYAN}git add .claude/session.md && git commit -m \"docs: update session\"${NC}"
  echo -e "  3. Push when ready: ${CYAN}git push${NC}"
}

view_file() {
  local file_type="$1"

  case "$file_type" in
    memory|mem)
      if [ -f "$MEMORY_FILE" ]; then
        less "$MEMORY_FILE"
      else
        echo -e "${RED}Error: memory.md not found${NC}"
      fi
      ;;
    session|sess)
      if [ -f "$SESSION_FILE" ]; then
        less "$SESSION_FILE"
      else
        echo -e "${RED}Error: session.md not found${NC}"
      fi
      ;;
    auto|context)
      if [ -f "$AUTO_CONTEXT_FILE" ]; then
        less "$AUTO_CONTEXT_FILE"
      else
        echo -e "${RED}Error: auto-context.md not found${NC}"
        echo -e "${YELLOW}Run: ./memory-cli.sh auto-context${NC}"
      fi
      ;;
    *)
      echo -e "${RED}Error: Unknown file type${NC}"
      echo -e "Valid options: memory, session, auto"
      exit 1
      ;;
  esac
}

edit_file() {
  local file_type="$1"

  case "$file_type" in
    memory|mem)
      ${EDITOR:-vim} "$MEMORY_FILE"
      ;;
    session|sess)
      ${EDITOR:-vim} "$SESSION_FILE"
      ;;
    *)
      echo -e "${RED}Error: Can only edit memory or session${NC}"
      exit 1
      ;;
  esac
}

add_note() {
  echo -e "${YELLOW}Quick note:${NC}"
  read -p "> " note_text

  if [ -z "$note_text" ]; then
    echo -e "${RED}Error: Note cannot be empty${NC}"
    exit 1
  fi

  # Add to session file
  echo "" >> "$SESSION_FILE"
  echo "- **$(date +"%H:%M")**: $note_text" >> "$SESSION_FILE"

  echo -e "${GREEN}✅ Note added to session${NC}"
}

add_learning() {
  echo -e "${YELLOW}What did you learn?${NC}"
  read -p "> " learning_text

  if [ -z "$learning_text" ]; then
    echo -e "${RED}Error: Learning cannot be empty${NC}"
    exit 1
  fi

  # Add to memory file under Learning Log
  local date_str=$(date +"%Y-%m-%d")

  # Check if Learning Log section exists
  if grep -q "### Recently Learned" "$MEMORY_FILE"; then
    # Add after "Recently Learned" line
    sed -i.bak "/### Recently Learned/a\\
- $learning_text ($date_str)
" "$MEMORY_FILE"
    rm -f "$MEMORY_FILE.bak"
  else
    echo -e "${YELLOW}⚠️  Learning Log section not found in memory.md${NC}"
    echo -e "Adding to end of file..."
    echo "" >> "$MEMORY_FILE"
    echo "### Recently Learned ($date_str)" >> "$MEMORY_FILE"
    echo "- $learning_text" >> "$MEMORY_FILE"
  fi

  echo -e "${GREEN}✅ Learning added to memory${NC}"
}

show_todos() {
  echo -e "${CYAN}📋 TODOs from session.md:${NC}"
  echo ""

  if [ -f "$SESSION_FILE" ]; then
    grep -E "^\s*-\s*\[[ x]\]" "$SESSION_FILE" || echo -e "${YELLOW}No TODOs found${NC}"
  else
    echo -e "${RED}Error: session.md not found${NC}"
  fi
}

clean_old_data() {
  echo -e "${BLUE}🧹 Cleaning old session data...${NC}"

  # Remove backup files
  rm -f "$SESSION_FILE.bak"
  rm -f "$MEMORY_FILE.bak"

  # Remove temp files
  rm -f "$SCRIPT_DIR"/*.tmp

  echo -e "${GREEN}✅ Cleanup complete${NC}"
}

export_all() {
  local output_file="$SCRIPT_DIR/full-context.md"

  echo -e "${BLUE}📦 Exporting all context...${NC}"

  cat > "$output_file" << EOF
# Second Brain - Full Context Export
> Generated: $(date +"%Y-%m-%d %H:%M:%S")

---

EOF

  # Append memory
  if [ -f "$MEMORY_FILE" ]; then
    echo "# User Memory" >> "$output_file"
    echo "" >> "$output_file"
    tail -n +4 "$MEMORY_FILE" >> "$output_file"
    echo "" >> "$output_file"
    echo "---" >> "$output_file"
    echo "" >> "$output_file"
  fi

  # Append session
  if [ -f "$SESSION_FILE" ]; then
    echo "# Current Session" >> "$output_file"
    echo "" >> "$output_file"
    tail -n +4 "$SESSION_FILE" >> "$output_file"
    echo "" >> "$output_file"
    echo "---" >> "$output_file"
    echo "" >> "$output_file"
  fi

  # Append auto-context
  if [ -f "$AUTO_CONTEXT_FILE" ]; then
    echo "# Auto-Generated Context" >> "$output_file"
    echo "" >> "$output_file"
    tail -n +4 "$AUTO_CONTEXT_FILE" >> "$output_file"
  fi

  echo -e "${GREEN}✅ Exported to: $output_file${NC}"
  echo -e "${CYAN}Lines: $(wc -l < "$output_file")${NC}"
}

# ============================================================================
# MAIN
# ============================================================================

# Change to project root
cd "$PROJECT_ROOT"

case "${1:-}" in
  status)
    show_status
    ;;
  update-session|update)
    update_session "${2:-}"
    ;;
  start-session|start)
    start_session
    ;;
  end-session|end)
    end_session
    ;;
  auto-context|auto)
    "$AUTO_CONTEXT_SCRIPT"
    ;;
  view)
    view_file "${2:-session}"
    ;;
  edit)
    edit_file "${2:-session}"
    ;;
  add-note|note)
    add_note
    ;;
  add-learning|learn)
    add_learning
    ;;
  show-todos|todos)
    show_todos
    ;;
  clean)
    clean_old_data
    ;;
  export)
    export_all
    ;;
  help|--help|-h)
    show_help
    ;;
  *)
    echo -e "${RED}Error: Unknown command '${1:-}'${NC}"
    echo ""
    show_help
    exit 1
    ;;
esac
