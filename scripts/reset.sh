#!/usr/bin/env bash
# Restores the repo to the demo's starting state (git tag: demo-baseline).
#
# The starting state is the naive MVP: src/classifier.js as it came out of a
# single "build what PRD.md describes" prompt, with no eval feedback.
#
# Deletes: everything the loop changed (src/ edits, commits made during the
#          demo, changes to tracked files) and the eval history (runs/).
# Keeps:   PRD.md, RUNBOOK.md, CLAUDE.md, eval/, scripts/, .claude/, and
#          gitignored files (node_modules, .env, .claude/settings.local.json).
#
# Usage:  npm run reset            (asks for confirmation)
#         npm run reset -- --yes   (no confirmation)
set -euo pipefail

cd "$(cd "$(dirname "$0")/.." && pwd)"

if [[ ! -f PRD.md || ! -d .git ]]; then
  echo "❌ This doesn't look like the demo repo root (PRD.md or .git missing). Aborting." >&2
  exit 1
fi
if ! git rev-parse -q --verify demo-baseline >/dev/null; then
  echo "❌ The 'demo-baseline' tag doesn't exist. Without that anchor there's no safe reset. Aborting." >&2
  exit 1
fi

echo "Restoring the repo to the demo's starting state (tag demo-baseline)."
echo
echo "— Changes to tracked files that will be discarded:"
git --no-pager diff --stat demo-baseline -- . || true
echo
echo "— Untracked files that will be deleted:"
git clean -nd | sed 's/^Would remove/  /' || true
[[ -d runs ]] && echo "  runs/ (eval history and dashboard)"
echo

if [[ "${1:-}" != "--yes" ]]; then
  read -r -p "Continue? [y/N] " answer
  [[ "$answer" == "y" || "$answer" == "Y" ]] || { echo "Cancelled."; exit 1; }
fi

git reset --hard demo-baseline --quiet
git clean -fd --quiet
rm -rf runs

echo "✅ Repo back at the starting state (naive MVP in src/). Ready for the demo."
echo "   Next: npm run eval   (shows where one-prompt vibe coding lands)"
