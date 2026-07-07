#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

LOCK_FILE=".claude/agent-session.lock"

if [[ -f "$LOCK_FILE" ]]; then
    LOCK_AGE_MIN=$(( ($(date +%s) - $(stat -f %m "$LOCK_FILE")) / 60 ))
    if (( LOCK_AGE_MIN < 30 )); then
        echo "❌ Eine andere Session läuft bereits (Lock $LOCK_AGE_MIN min alt)."
        echo ""
        cat "$LOCK_FILE"
        echo ""
        echo "Wenn du sicher bist, dass keine andere Session läuft:"
        echo "  rm \"$SCRIPT_DIR/$LOCK_FILE\""
        echo ""
        read -n 1 -s -r -p "Beliebige Taste zum Schließen…"
        exit 1
    else
        echo "⚠️  Stale Lock gefunden ($LOCK_AGE_MIN min alt) — Orchestrator wird ihn beim Start aufräumen."
    fi
fi

# Preflight (warn-only) — zeigt fehlende Verbindungen, blockiert aber nicht.
if [[ -f scripts/preflight.sh ]]; then
    bash scripts/preflight.sh --quiet || echo "⚠️  Preflight meldet einen Blocker — siehe oben."
    echo ""
fi

PROMPT="Read .claude/agents/orchestrator.md and follow that playbook. Dispatch planner/developer/code-reviewer/design-researcher/design-reviewer/design-system-guardian/backend-db-architect/qa-tester/live-qa-analyst/committer/project-manager/idea-generator as subagents from this session."

echo "🚀 Starte autonome Web-Dev-Session in $SCRIPT_DIR"
echo ""

exec claude --dangerously-skip-permissions "$PROMPT"
