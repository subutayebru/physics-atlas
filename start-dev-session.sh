#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
cd "$SCRIPT_DIR"

bash scripts/preflight.sh --quiet || echo "⚠️  Preflight reports a blocker — see above."
echo ""

PROMPT="Read .claude/agents/orchestrator.md and follow that playbook. Dispatch planner/developer/reviewer/committer/live-qa as subagents from this session."

echo "🚀 Autonomous dev session — Physics Atlas"
echo ""

exec claude --dangerously-skip-permissions "$PROMPT"
