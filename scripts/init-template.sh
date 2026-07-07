#!/usr/bin/env bash
# init-template.sh — Konfiguriert das Web-Dev-Multi-Agent-Template für ein konkretes Projekt.
#
# Ersetzt {{PROJECT_NAME}}, {{PROJECT_ROOT_ABS}} und die Stack-Command-Placeholder in
# allen .claude/-Files, BACKLOG.md, ROADMAP.md, CLAUDE.md, settings.local.json und
# start-dev-session.command. Idempotent — kann mehrfach laufen, Re-Runs sind harmlos.
#
# Nutzung:
#   bash scripts/init-template.sh
#
set -euo pipefail

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
REPO_ROOT="$( cd -- "$SCRIPT_DIR/.." &> /dev/null && pwd )"

cd "$REPO_ROOT"

echo "==> Web-Dev-Multi-Agent-Template Setup für $REPO_ROOT"
echo ""

# Preflight zuerst — zeigt, ob Node/Chrome/gh/Remote da sind.
if [[ -f scripts/preflight.sh ]]; then
    bash scripts/preflight.sh || {
        echo ""
        read -r -p "Preflight meldet eine harte Voraussetzung als fehlend. Trotzdem fortfahren? [y/N] " PF_CONT
        case "$PF_CONT" in y|Y|yes|YES|Yes) ;; *) echo "Abgebrochen."; exit 1 ;; esac
    }
fi
GH_READY="$(cat .claude/.preflight-github-ready 2>/dev/null || echo 0)"
echo ""

read -r -p "Projekt-Name (z.B. acme-shop, my-saas): " PROJECT_NAME
if [[ -z "$PROJECT_NAME" ]]; then
    echo "❌ Projekt-Name darf nicht leer sein."
    exit 1
fi

read -r -p "Absoluter Pfad zum Projekt-Root [Default: $REPO_ROOT]: " PROJECT_ROOT_ABS
PROJECT_ROOT_ABS="${PROJECT_ROOT_ABS:-$REPO_ROOT}"

echo ""
echo "==> Stack-Commands (Enter = Default in [Klammern]). Passe an deinen Stack an."
read -r -p "Install-Command [pnpm install]: " INSTALL_CMD
INSTALL_CMD="${INSTALL_CMD:-pnpm install}"
read -r -p "Build-Command (Hard Gate) [pnpm build]: " BUILD_CMD
BUILD_CMD="${BUILD_CMD:-pnpm build}"
read -r -p "Typecheck-Command [pnpm typecheck]: " TYPECHECK_CMD
TYPECHECK_CMD="${TYPECHECK_CMD:-pnpm typecheck}"
read -r -p "Lint-Command [pnpm lint]: " LINT_CMD
LINT_CMD="${LINT_CMD:-pnpm lint}"
read -r -p "Test-Command [pnpm test]: " TEST_CMD
TEST_CMD="${TEST_CMD:-pnpm test}"
read -r -p "Dev-Server-Command [pnpm dev]: " DEV_SERVER_CMD
DEV_SERVER_CMD="${DEV_SERVER_CMD:-pnpm dev}"
read -r -p "Dev-Server-URL [http://localhost:5173]: " DEV_SERVER_URL
DEV_SERVER_URL="${DEV_SERVER_URL:-http://localhost:5173}"
read -r -p "DB-Migrate-Command (leer lassen wenn kein Backend) []: " DB_MIGRATE_CMD
DB_MIGRATE_CMD="${DB_MIGRATE_CMD:-}"

# GitHub-Tracking-Frage — Default richtet sich nach dem Preflight.
echo ""
if [[ "$GH_READY" == "1" ]]; then
    read -r -p "GitHub-Tracking (Issues/Labels/Milestones via project-manager) aktivieren? [Y/n] " GH_WANT
    case "$GH_WANT" in n|N|no|NO|No) GITHUB_MODE="disabled" ;; *) GITHUB_MODE="enabled" ;; esac
else
    echo "Hinweis: Preflight fand kein authentifiziertes gh + GitHub-Remote — GitHub-Tracking wird auf 'disabled' gesetzt."
    echo "        (Du kannst es später in CLAUDE.md auf 'github: enabled' stellen, sobald gh + Remote da sind.)"
    GITHUB_MODE="disabled"
fi

echo ""
echo "==> Werde ersetzen:"
echo "    {{PROJECT_NAME}}      → $PROJECT_NAME"
echo "    {{PROJECT_ROOT_ABS}}  → $PROJECT_ROOT_ABS"
echo "    {{INSTALL_CMD}}       → $INSTALL_CMD"
echo "    {{BUILD_CMD}}         → $BUILD_CMD"
echo "    {{TYPECHECK_CMD}}     → $TYPECHECK_CMD"
echo "    {{LINT_CMD}}          → $LINT_CMD"
echo "    {{TEST_CMD}}          → $TEST_CMD"
echo "    {{DEV_SERVER_CMD}}    → $DEV_SERVER_CMD"
echo "    {{DEV_SERVER_URL}}    → $DEV_SERVER_URL"
echo "    {{DB_MIGRATE_CMD}}    → ${DB_MIGRATE_CMD:-(leer)}"
echo ""
read -r -p "Fortfahren? [y/N] " CONFIRM
case "$CONFIRM" in
    y|Y|yes|YES|Yes) ;;
    *) echo "Abgebrochen."; exit 0 ;;
esac

# Liste der Files die durch sed laufen
TARGETS=(
    .claude/agents/orchestrator.md
    .claude/agents/planner.md
    .claude/agents/developer.md
    .claude/agents/qa-tester.md
    .claude/agents/code-reviewer.md
    .claude/agents/committer.md
    .claude/agents/idea-generator.md
    .claude/agents/live-qa-analyst.md
    .claude/agents/design-researcher.md
    .claude/agents/design-reviewer.md
    .claude/agents/design-system-guardian.md
    .claude/agents/backend-db-architect.md
    .claude/agents/project-manager.md
    CLAUDE.md
    BACKLOG.md
    ROADMAP.md
    .mcp.json
)

# settings.local.json aus Example kopieren falls noch nicht vorhanden
if [[ ! -f .claude/settings.local.json && -f .claude/settings.local.json.example ]]; then
    cp .claude/settings.local.json.example .claude/settings.local.json
    echo "==> .claude/settings.local.json aus Example angelegt."
    TARGETS+=(.claude/settings.local.json)
elif [[ -f .claude/settings.local.json ]]; then
    TARGETS+=(.claude/settings.local.json)
fi

for file in "${TARGETS[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo "    ⊘ $file (nicht vorhanden, übersprungen)"
        continue
    fi
    # macOS sed braucht -i '' für In-Place ohne Backup
    sed -i '' \
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
    echo "    ✓ $file"
done

# GitHub-Schalter in CLAUDE.md setzen (Default im Template ist 'github: enabled')
if [[ "$GITHUB_MODE" == "disabled" && -f CLAUDE.md ]]; then
    sed -i '' -e "s|github: enabled|github: disabled|g" CLAUDE.md
    echo "    ✓ CLAUDE.md: github: disabled gesetzt"
fi

echo ""
echo "==> Fertig. (Stack: $PROJECT_NAME · GitHub-Tracking: $GITHUB_MODE)"
echo ""
echo "Nächste Schritte:"
echo "  1. Editiere CLAUDE.md mit deinen Architektur-Details (Subsysteme, Patterns, Konventionen)."
echo "  2. Lege initiale Backlog-Einträge in BACKLOG.md an (Section ## Open)."
echo "  3. Stelle sicher, dass Chrome/Chromium installiert ist (Chrome DevTools MCP nutzt es)."
echo "  4. (Einmalig) GitHub-Labels anlegen: siehe docs/github-issues-setup.md"
echo "  5. Starte eine Session: bash start-dev-session.command  (oder doppelklicken)"
echo ""
