#!/usr/bin/env bash
set -euo pipefail

workspace_repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$workspace_repo_root/.obsidian/plugins/learning-research-workspace"

node -e 'if (Number(process.versions.node.split(".")[0]) < 22) { console.error("Node.js 22 or newer is required."); process.exit(1); }'

# Reuse the verified version when present; otherwise run it without sudo.
if command -v pnpm >/dev/null 2>&1 && [[ "$(pnpm --version)" == "11.25.0" ]]; then
  pnpm install --frozen-lockfile
else
  npm exec --yes --package=pnpm@11.25.0 -- pnpm install --frozen-lockfile
fi
