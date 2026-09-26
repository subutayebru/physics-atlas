#!/usr/bin/env bash
# preflight.sh — connectivity/prerequisite check ("doctor") for the Physics Atlas agent system.
#
# Checks that everything the agents need is present:
#   - Node + npx (stack commands, Chrome DevTools MCP via npx)
#   - Chrome/Chromium (Chrome DevTools MCP drives a real browser)
#   - Chrome DevTools MCP registered (.mcp.json present)
#   - git repo + (optional) GitHub remote + authenticated gh CLI (for manual GitHub work)
#
# Usage:
#   bash scripts/preflight.sh             # full report
#   bash scripts/preflight.sh --quiet     # only WARN/FAIL lines + final line (for the start script)
#
# Exit code: 0 if there are no hard blockers (Node/npx), 1 if a hard blocker is missing.
# GitHub issues are NEVER hard blockers — the system also runs purely locally.
set -uo pipefail

QUIET=0
[[ "${1:-}" == "--quiet" ]] && QUIET=1

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
REPO_ROOT="$( cd -- "$SCRIPT_DIR/.." &> /dev/null && pwd )"
cd "$REPO_ROOT"

HARD_FAIL=0
GITHUB_READY=1   # 1 = gh + remote present

say()  { [[ $QUIET -eq 0 ]] && echo "$@"; return 0; }
ok()   { echo "  ✅ $*"; }
warn() { echo "  ⚠️  $*"; }
fail() { echo "  ❌ $*"; }

say ""
say "==> Preflight check for $REPO_ROOT"
say ""

# --- Node + npx --------------------------------------------------------------
say "Node / npx:"
if command -v node >/dev/null 2>&1; then
    ok "node $(node --version)"
else
    fail "node not found — the stack commands (build/dev/validate) need Node. Install Node.js."
    HARD_FAIL=1
fi
if command -v npx >/dev/null 2>&1; then
    ok "npx present (Chrome DevTools MCP is loaded via npx)"
else
    fail "npx not found — Chrome DevTools MCP is loaded via 'npx chrome-devtools-mcp'."
    HARD_FAIL=1
fi

# --- Chrome / Chromium -------------------------------------------------------
say ""
say "Browser (for Chrome DevTools MCP):"
CHROME_FOUND=0
for c in \
    "${CHROME_BIN:-}" \
    "/usr/bin/google-chrome" \
    "/usr/bin/google-chrome-stable" \
    "/usr/bin/chromium" \
    "/usr/bin/chromium-browser" \
    "/snap/bin/chromium" \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    "/Applications/Chromium.app/Contents/MacOS/Chromium"; do
    [[ -x "$c" ]] && { ok "found: $c"; CHROME_FOUND=1; break; }
done
if [[ $CHROME_FOUND -eq 0 ]]; then
    if command -v google-chrome >/dev/null 2>&1 || command -v chromium >/dev/null 2>&1 || command -v chromium-browser >/dev/null 2>&1; then
        ok "Chrome/Chromium found in PATH"
    else
        warn "No Chrome/Chromium found. Chrome DevTools MCP can download an instance on first run, but an installed Chrome is safer."
    fi
fi

# --- Chrome DevTools MCP registered -----------------------------------------
say ""
say "Chrome DevTools MCP:"
if [[ -f ".mcp.json" ]] && grep -q "chrome-devtools" ".mcp.json"; then
    ok ".mcp.json registers the chrome-devtools server"
else
    warn ".mcp.json is missing or has no chrome-devtools server — the live-qa agent will have no browser tools."
fi

# --- git + GitHub ------------------------------------------------------------
say ""
say "Git / remote (the committer commits locally; pushing is done by hand):"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    ok "git repo detected"
else
    warn "no git repo — the committer needs one. (git init?)"
    GITHUB_READY=0
fi

if command -v gh >/dev/null 2>&1; then
    ok "gh CLI present ($(gh --version | head -1))"
    if gh auth status >/dev/null 2>&1; then
        ok "gh authenticated"
    else
        warn "gh not authenticated — run 'gh auth login' if you work with GitHub by hand."
    fi
else
    warn "gh CLI not found — only relevant if you work with GitHub by hand. The agent system doesn't need it."
fi

if git remote get-url origin >/dev/null 2>&1 && git remote get-url origin 2>/dev/null | grep -q github.com; then
    ok "origin points to GitHub ($(git remote get-url origin))"
else
    warn "no github.com origin — the agent system still runs; it never pushes anyway."
    GITHUB_READY=0
fi

# --- Summary -----------------------------------------------------------------
say ""
if [[ $HARD_FAIL -eq 1 ]]; then
    echo "==> Preflight: ❌ Hard prerequisite missing (Node/npx). Please fix."
elif [[ $GITHUB_READY -eq 1 ]]; then
    echo "==> Preflight: ✅ Ready. Remote present — pushing stays manual."
else
    echo "==> Preflight: ✅ Ready (local only). No GitHub remote — commits stay local."
fi

# Store GITHUB_READY for calling scripts
echo "$GITHUB_READY" > "$REPO_ROOT/.claude/.preflight-github-ready" 2>/dev/null || true

[[ $HARD_FAIL -eq 1 ]] && exit 1 || exit 0
