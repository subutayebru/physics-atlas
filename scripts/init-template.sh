#!/usr/bin/env bash
# init-template.sh — configures the agent-system template for a concrete project.
#
# Replaces {{PROJECT_NAME}}, {{PROJECT_ROOT_ABS}} and the stack-command placeholders in
# all .claude/ files, BACKLOG.md, ROADMAP.md, CLAUDE.md and settings.local.json.
# Idempotent — can run multiple times, re-runs are harmless.
#
# Usage:
#   bash scripts/init-template.sh
#
set -euo pipefail

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
REPO_ROOT="$( cd -- "$SCRIPT_DIR/.." &> /dev/null && pwd )"

cd "$REPO_ROOT"

echo "==> Agent-system template setup for $REPO_ROOT"
echo ""

# Preflight first — shows whether Node/Chrome/gh/remote are present.
if [[ -f scripts/preflight.sh ]]; then
    bash scripts/preflight.sh || {
        echo ""
        read -r -p "Preflight reports a missing hard prerequisite. Continue anyway? [y/N] " PF_CONT
        case "$PF_CONT" in y|Y|yes|YES|Yes) ;; *) echo "Aborted."; exit 1 ;; esac
    }
fi
echo ""

read -r -p "Project name (e.g. acme-shop, my-saas): " PROJECT_NAME
if [[ -z "$PROJECT_NAME" ]]; then
    echo "❌ Project name must not be empty."
    exit 1
fi

read -r -p "Absolute path to the project root [default: $REPO_ROOT]: " PROJECT_ROOT_ABS
PROJECT_ROOT_ABS="${PROJECT_ROOT_ABS:-$REPO_ROOT}"

echo ""
echo "==> Stack commands (Enter = default in [brackets]). Adjust to your stack."
read -r -p "Install command [pnpm install]: " INSTALL_CMD
INSTALL_CMD="${INSTALL_CMD:-pnpm install}"
read -r -p "Build command (hard gate) [pnpm build]: " BUILD_CMD
BUILD_CMD="${BUILD_CMD:-pnpm build}"
read -r -p "Typecheck command [pnpm typecheck]: " TYPECHECK_CMD
TYPECHECK_CMD="${TYPECHECK_CMD:-pnpm typecheck}"
read -r -p "Lint command [pnpm lint]: " LINT_CMD
LINT_CMD="${LINT_CMD:-pnpm lint}"
read -r -p "Test command [pnpm test]: " TEST_CMD
TEST_CMD="${TEST_CMD:-pnpm test}"
read -r -p "Dev server command [pnpm dev]: " DEV_SERVER_CMD
DEV_SERVER_CMD="${DEV_SERVER_CMD:-pnpm dev}"
read -r -p "Dev server URL [http://localhost:5173]: " DEV_SERVER_URL
DEV_SERVER_URL="${DEV_SERVER_URL:-http://localhost:5173}"
read -r -p "DB migrate command (leave empty if there's no backend) []: " DB_MIGRATE_CMD
DB_MIGRATE_CMD="${DB_MIGRATE_CMD:-}"

echo ""
echo "==> Will replace:"
echo "    {{PROJECT_NAME}}      → $PROJECT_NAME"
echo "    {{PROJECT_ROOT_ABS}}  → $PROJECT_ROOT_ABS"
echo "    {{INSTALL_CMD}}       → $INSTALL_CMD"
echo "    {{BUILD_CMD}}         → $BUILD_CMD"
echo "    {{TYPECHECK_CMD}}     → $TYPECHECK_CMD"
echo "    {{LINT_CMD}}          → $LINT_CMD"
echo "    {{TEST_CMD}}          → $TEST_CMD"
echo "    {{DEV_SERVER_CMD}}    → $DEV_SERVER_CMD"
echo "    {{DEV_SERVER_URL}}    → $DEV_SERVER_URL"
echo "    {{DB_MIGRATE_CMD}}    → ${DB_MIGRATE_CMD:-(empty)}"
echo ""
read -r -p "Continue? [y/N] " CONFIRM
case "$CONFIRM" in
    y|Y|yes|YES|Yes) ;;
    *) echo "Aborted."; exit 0 ;;
esac

# Files that go through sed
TARGETS=(
    .claude/agents/orchestrator.md
    .claude/agents/planner.md
    .claude/agents/developer.md
    .claude/agents/reviewer.md
    .claude/agents/committer.md
    .claude/agents/live-qa.md
    CLAUDE.md
    BACKLOG.md
    ROADMAP.md
    .mcp.json
)

# Copy settings.local.json from the example if it doesn't exist yet
if [[ ! -f .claude/settings.local.json && -f .claude/settings.local.json.example ]]; then
    cp .claude/settings.local.json.example .claude/settings.local.json
    echo "==> Created .claude/settings.local.json from the example."
    TARGETS+=(.claude/settings.local.json)
elif [[ -f .claude/settings.local.json ]]; then
    TARGETS+=(.claude/settings.local.json)
fi

for file in "${TARGETS[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo "    ⊘ $file (missing, skipped)"
        continue
    fi
    # -i.bak + rm works with both GNU and BSD/macOS sed
    sed -i.bak \
        -e "s|{{PROJECT_NAME}}|$PROJECT_NAME|g" \
        -e "s|{{PROJECT_ROOT_ABS}}|$PROJECT_ROOT_ABS|g" \
        -e "s|{{INSTALL_CMD}}|$INSTALL_CMD|g" \
        -e "s|{{BUILD_CMD}}|$BUILD_CMD|g" \
        -e "s|{{TYPECHECK_CMD}}|$TYPECHECK_CMD|g" \
        -e "s|{{LINT_CMD}}|$LINT_CMD|g" \
        -e "s|{{TEST_CMD}}|$TEST_CMD|g" \
        -e "s|{{DEV_SERVER_CMD}}|$DEV_SERVER_CMD|g" \
        -e "s|{{DEV_SERVER_URL}}|$DEV_SERVER_URL|g" \
        -e "s|{{DB_MIGRATE_CMD}}|$DB_MIGRATE_CMD|g" \
        "$file"
    rm -f "$file.bak"
    echo "    ✓ $file"
done

echo ""
echo "==> Done. (Project: $PROJECT_NAME)"
echo ""
echo "Next steps:"
echo "  1. Edit CLAUDE.md with your architecture details (subsystems, patterns, conventions)."
echo "  2. Add initial backlog entries to BACKLOG.md (section ## Open)."
echo "  3. Make sure Chrome/Chromium is installed (Chrome DevTools MCP uses it)."
echo "  4. Start a session: ./start-dev-session.sh"
echo ""
