#!/bin/bash
# Setup AI Skills for spotiarr development
# Configures AI coding assistants that follow agentskills.io standard:
#   - Claude Code:    .claude/skills/ symlink + CLAUDE.md symlink
#   - Gemini CLI:     .gemini/skills/ symlink + GEMINI.md symlink
#   - Codex (OpenAI): .codex/skills/ symlink + AGENTS.md (native)
#   - GitHub Copilot: .github/copilot-instructions.md symlink
#   - Opencode:       .agents/skills/ symlink + AGENTS.md (native)
#
# Usage:
#   ./skills/setup.sh              # Interactive mode (select AI assistants)
#   ./skills/setup.sh --all        # Configure all AI assistants
#   ./skills/setup.sh --claude     # Configure only Claude Code
#   ./skills/setup.sh --gemini     # Configure only Gemini CLI
#   ./skills/setup.sh --codex      # Configure only Codex
#   ./skills/setup.sh --copilot    # Configure only GitHub Copilot
#   ./skills/setup.sh --opencode   # Configure only Opencode

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(dirname "$SCRIPT_DIR")"
SKILLS_SOURCE="$SCRIPT_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SETUP_CLAUDE=false
SETUP_GEMINI=false
SETUP_CODEX=false
SETUP_COPILOT=false
SETUP_OPENCODE=false

make_symlink() {
  local source="$1"
  local target="$2"
  local description="$3"

  if [ -L "$target" ]; then
    rm "$target"
  elif [ -e "$target" ]; then
    echo -e "${YELLOW}  ⚠ $target exists and is not a symlink — skipping${NC}"
    return
  fi

  mkdir -p "$(dirname "$target")"
  ln -s "$source" "$target"
  echo -e "${GREEN}  ✓ Linked $description${NC}"
}

setup_claude() {
  echo -e "\n${BLUE}${BOLD}Claude Code${NC}"
  make_symlink "../AGENTS.md" "$REPO_ROOT/CLAUDE.md" "CLAUDE.md → AGENTS.md"
  mkdir -p "$REPO_ROOT/.claude"
  make_symlink "../skills" "$REPO_ROOT/.claude/skills" ".claude/skills → skills/"
  echo -e "${GREEN}  Claude Code configured.${NC}"
}

setup_gemini() {
  echo -e "\n${BLUE}${BOLD}Gemini CLI${NC}"
  make_symlink "../AGENTS.md" "$REPO_ROOT/GEMINI.md" "GEMINI.md → AGENTS.md"
  mkdir -p "$REPO_ROOT/.gemini"
  make_symlink "../skills" "$REPO_ROOT/.gemini/skills" ".gemini/skills → skills/"
  echo -e "${GREEN}  Gemini CLI configured.${NC}"
}

setup_codex() {
  echo -e "\n${BLUE}${BOLD}Codex (OpenAI)${NC}"
  mkdir -p "$REPO_ROOT/.codex"
  make_symlink "../skills" "$REPO_ROOT/.codex/skills" ".codex/skills → skills/"
  echo -e "${GREEN}  Codex configured (AGENTS.md is native).${NC}"
}

setup_copilot() {
  echo -e "\n${BLUE}${BOLD}GitHub Copilot${NC}"
  mkdir -p "$REPO_ROOT/.github"
  make_symlink "../AGENTS.md" "$REPO_ROOT/.github/copilot-instructions.md" ".github/copilot-instructions.md → AGENTS.md"
  echo -e "${GREEN}  GitHub Copilot configured.${NC}"
}

setup_opencode() {
  echo -e "\n${BLUE}${BOLD}Opencode${NC}"
  mkdir -p "$REPO_ROOT/.agents"
  make_symlink "../skills" "$REPO_ROOT/.agents/skills" ".agents/skills → skills/"
  echo -e "${GREEN}  Opencode configured (AGENTS.md is native).${NC}"
}

show_help() {
  echo "Usage: $0 [OPTIONS]"
  echo ""
  echo "Configure AI coding assistants for spotiarr development."
  echo ""
  echo "Options:"
  echo "  --all       Configure all AI assistants"
  echo "  --claude    Configure Claude Code"
  echo "  --gemini    Configure Gemini CLI"
  echo "  --codex     Configure Codex (OpenAI)"
  echo "  --copilot   Configure GitHub Copilot"
  echo "  --opencode  Configure Opencode"
  echo "  --help      Show this help message"
}

interactive_mode() {
  echo -e "${BOLD}${CYAN}Spotiarr — AI Assistant Setup${NC}"
  echo ""
  echo "Select AI assistants to configure (space to toggle, enter to confirm):"
  echo ""

  local options=("Claude Code" "Gemini CLI" "Codex (OpenAI)" "GitHub Copilot" "Opencode")
  local selected=(true false false false false)

  # Simple non-interactive fallback: just ask y/n for each
  for i in "${!options[@]}"; do
    read -r -p "  Configure ${options[$i]}? [y/N] " answer
    case "$answer" in
      [yY]*) selected[$i]=true ;;
    esac
  done

  [ "${selected[0]}" = true ] && SETUP_CLAUDE=true
  [ "${selected[1]}" = true ] && SETUP_GEMINI=true
  [ "${selected[2]}" = true ] && SETUP_CODEX=true
  [ "${selected[3]}" = true ] && SETUP_COPILOT=true
  [ "${selected[4]}" = true ] && SETUP_OPENCODE=true
}

# Parse args
if [ $# -eq 0 ]; then
  interactive_mode
else
  for arg in "$@"; do
    case "$arg" in
      --all)      SETUP_CLAUDE=true; SETUP_GEMINI=true; SETUP_CODEX=true; SETUP_COPILOT=true; SETUP_OPENCODE=true ;;
      --claude)   SETUP_CLAUDE=true ;;
      --gemini)   SETUP_GEMINI=true ;;
      --codex)    SETUP_CODEX=true ;;
      --copilot)  SETUP_COPILOT=true ;;
      --opencode) SETUP_OPENCODE=true ;;
      --help)     show_help; exit 0 ;;
      *) echo -e "${RED}Unknown option: $arg${NC}"; show_help; exit 1 ;;
    esac
  done
fi

echo -e "\n${BOLD}${CYAN}Configuring AI assistants...${NC}"

$SETUP_CLAUDE   && setup_claude
$SETUP_GEMINI   && setup_gemini
$SETUP_CODEX    && setup_codex
$SETUP_COPILOT  && setup_copilot
$SETUP_OPENCODE && setup_opencode

echo -e "\n${GREEN}${BOLD}Done!${NC} Run 'bash skills/setup.sh --all' anytime to reconfigure.\n"
