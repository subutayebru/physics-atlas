#!/usr/bin/env bash
# preflight.sh — Verbindungs-/Voraussetzungs-Check ("Doctor") für das Web-Dev-Multi-Agent-Template.
#
# Prüft, ob alles da ist, was die Agents brauchen:
#   - Node + npx (Stack-Commands, Chrome DevTools MCP via npx)
#   - Chrome/Chromium (Chrome DevTools MCP steuert einen echten Browser)
#   - Chrome DevTools MCP registriert (.mcp.json vorhanden)
#   - git-Repo + (optional) GitHub-Remote + gh CLI authentifiziert (für PM-Integration)
#
# Nutzung:
#   bash scripts/preflight.sh             # voller Report
#   bash scripts/preflight.sh --quiet     # nur WARN/FAIL-Zeilen + Schlusszeile (für Start-Hook)
#
# Exit-Code: 0 wenn keine harten Blocker (Node/Chrome), 1 wenn ein harter Blocker fehlt.
# GitHub-Themen sind NIE harte Blocker — das System läuft auch rein lokal.
set -uo pipefail

QUIET=0
[[ "${1:-}" == "--quiet" ]] && QUIET=1

SCRIPT_DIR="$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
REPO_ROOT="$( cd -- "$SCRIPT_DIR/.." &> /dev/null && pwd )"
cd "$REPO_ROOT"

HARD_FAIL=0
GITHUB_READY=1   # 1 = gh + remote da

say()  { [[ $QUIET -eq 0 ]] && echo "$@"; return 0; }
ok()   { echo "  ✅ $*"; }
warn() { echo "  ⚠️  $*"; }
fail() { echo "  ❌ $*"; }

say ""
say "==> Preflight-Check für $REPO_ROOT"
say ""

# --- Node + npx --------------------------------------------------------------
say "Node / npx:"
if command -v node >/dev/null 2>&1; then
    ok "node $(node --version)"
else
    fail "node nicht gefunden — die Stack-Commands (build/dev/test) brauchen Node. Installiere Node.js."
    HARD_FAIL=1
fi
if command -v npx >/dev/null 2>&1; then
    ok "npx vorhanden (Chrome DevTools MCP wird via npx geladen)"
else
    fail "npx nicht gefunden — Chrome DevTools MCP wird per 'npx chrome-devtools-mcp' geladen."
    HARD_FAIL=1
fi

# --- Chrome / Chromium -------------------------------------------------------
say ""
say "Browser (für Chrome DevTools MCP):"
CHROME_FOUND=0
for c in \
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
    "/Applications/Chromium.app/Contents/MacOS/Chromium" \
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge"; do
    [[ -x "$c" ]] && { ok "gefunden: $c"; CHROME_FOUND=1; break; }
done
if [[ $CHROME_FOUND -eq 0 ]]; then
    if command -v google-chrome >/dev/null 2>&1 || command -v chromium >/dev/null 2>&1 || command -v chromium-browser >/dev/null 2>&1; then
        ok "Chrome/Chromium im PATH gefunden"
    else
        warn "Kein Chrome/Chromium/Edge gefunden. Chrome DevTools MCP kann beim ersten Lauf eine Instanz herunterladen, sicherer ist eine installierte Chrome-Version."
    fi
fi

# --- Chrome DevTools MCP registriert ----------------------------------------
say ""
say "Chrome DevTools MCP:"
if [[ -f ".mcp.json" ]] && grep -q "chrome-devtools" ".mcp.json"; then
    ok ".mcp.json registriert den chrome-devtools-Server"
else
    warn ".mcp.json fehlt oder enthält keinen chrome-devtools-Server — die QA-Agents haben dann keine Browser-Tools."
fi

# --- git + GitHub ------------------------------------------------------------
say ""
say "Git / GitHub (für project-manager-Integration, optional):"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
    ok "git-Repo erkannt"
else
    warn "kein git-Repo — der committer braucht ein Repo. (git init?)"
    GITHUB_READY=0
fi

if command -v gh >/dev/null 2>&1; then
    ok "gh CLI vorhanden ($(gh --version | head -1))"
    if gh auth status >/dev/null 2>&1; then
        ok "gh authentifiziert"
    else
        warn "gh nicht authentifiziert — 'gh auth login' für GitHub-Tracking."
        GITHUB_READY=0
    fi
else
    warn "gh CLI nicht gefunden — GitHub-Tracking (Issues/Labels/Milestones) ist dann aus. Installiere die GitHub CLI für volle Nachvollziehbarkeit."
    GITHUB_READY=0
fi

if git remote get-url origin >/dev/null 2>&1 && git remote get-url origin 2>/dev/null | grep -q github.com; then
    ok "origin zeigt auf GitHub ($(git remote get-url origin))"
else
    warn "origin zeigt nicht auf github.com — ohne GitHub-Remote läuft das System lokal (github: disabled)."
    GITHUB_READY=0
fi

# --- Fazit -------------------------------------------------------------------
say ""
if [[ $HARD_FAIL -eq 1 ]]; then
    echo "==> Preflight: ❌ Harte Voraussetzung fehlt (Node/npx). Bitte beheben."
elif [[ $GITHUB_READY -eq 1 ]]; then
    echo "==> Preflight: ✅ Bereit. GitHub-Tracking verfügbar (empfohlen: github: enabled)."
else
    echo "==> Preflight: ✅ Lauffähig (lokal). GitHub-Tracking NICHT verfügbar → github: disabled."
fi

# GITHUB_READY für aufrufende Scripts hinterlegen (init-template.sh liest das)
echo "$GITHUB_READY" > "$REPO_ROOT/.claude/.preflight-github-ready" 2>/dev/null || true

[[ $HARD_FAIL -eq 1 ]] && exit 1 || exit 0
