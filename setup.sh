#!/usr/bin/env bash
# setup.sh — initialize and push Pulse Health to GitHub.
# Run once from inside the unzipped pulse_health/ directory.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/companion1517/pulse_health.git}"
BRANCH="${BRANCH:-main}"

echo "==> Pulse Health setup"
echo "    Remote : $REPO_URL"
echo "    Branch : $BRANCH"
echo

# --- sanity checks ---------------------------------------------------------
if [[ ! -f index.html ]] || [[ ! -f manifest.webmanifest ]]; then
  echo "!! Run this script from the repo root (where index.html lives)." >&2
  exit 1
fi

for cmd in git curl; do
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "!! Missing required command: $cmd" >&2
    exit 1
  fi
done

# --- fetch canonical GPL-3.0 text -----------------------------------------
echo "==> Fetching canonical GPL-3.0 text into LICENSE"
tmp_license="$(mktemp)"
if curl -fsSL "https://www.gnu.org/licenses/gpl-3.0.txt" -o "$tmp_license"; then
  # Prepend our project copyright line so the authorship is clear,
  # then include the canonical text verbatim (required by the CI check).
  {
    cat <<'EOF'
Pulse Health
Copyright (C) 2026 Pulse Health contributors

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

================================================================================
                    GNU GENERAL PUBLIC LICENSE
================================================================================

EOF
    cat "$tmp_license"
  } > LICENSE
  rm -f "$tmp_license"
  echo "    LICENSE updated ($(wc -l < LICENSE) lines)"
else
  echo "!! Could not download GPL text from gnu.org. Leaving placeholder LICENSE." >&2
  rm -f "$tmp_license"
fi

# --- git init / remote -----------------------------------------------------
if [[ ! -d .git ]]; then
  echo "==> git init (branch: $BRANCH)"
  git init -b "$BRANCH" >/dev/null
else
  echo "==> .git already exists, skipping init"
fi

if git remote | grep -qx origin; then
  current="$(git remote get-url origin)"
  if [[ "$current" != "$REPO_URL" ]]; then
    echo "==> Updating origin: $current -> $REPO_URL"
    git remote set-url origin "$REPO_URL"
  else
    echo "==> origin already set to $REPO_URL"
  fi
else
  echo "==> Adding origin -> $REPO_URL"
  git remote add origin "$REPO_URL"
fi

# --- git identity (only if not set globally) ------------------------------
if ! git config user.name  >/dev/null; then git config user.name  "Pulse Health"; fi
if ! git config user.email >/dev/null; then git config user.email "pulse@local"; fi

# --- commit & push ---------------------------------------------------------
echo "==> Staging files"
git add .

if git diff --cached --quiet; then
  echo "==> Nothing to commit."
else
  echo "==> Creating commit"
  git commit -m "Initial commit: Pulse Health v1.0.0" >/dev/null
fi

# Make sure the local branch name matches what we want to push
current_branch="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "")"
if [[ "$current_branch" != "$BRANCH" ]]; then
  git branch -M "$BRANCH"
fi

echo "==> Pushing to $REPO_URL ($BRANCH)"
echo "    If prompted, enter your GitHub username and a Personal Access Token"
echo "    (classic PAT or fine-grained token with 'contents: write' on this repo)."
echo
git push -u origin "$BRANCH"

echo
echo "✔ Done. Repo pushed to: $REPO_URL"
echo "  GitHub Pages will publish automatically once the Pages source is set to"
echo "  'GitHub Actions' in Settings → Pages. The 'Deploy web app' workflow runs"
echo "  on every push to $BRANCH."
