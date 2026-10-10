# Personal Learning & Research Workspace

This repository is an Obsidian Vault, not a web application. Read `99 System/Documentation/HANDOFF.md` before continuing development; it records the current runtime failure and the unresolved scope of the user's research-design reference.

## Development

The TypeScript plugin lives in the hidden directory `.obsidian/plugins/learning-research-workspace`. Include hidden files when searching. The repository root has no package.json.

- Runtime for development: Node.js 22 or newer.
- Package manager: pnpm 11.25.0 (the version used to verify this checkpoint).
- Prepare dependencies from the repository root: `bash .codex/setup.sh`.
- In the plugin directory, run `pnpm test` and `pnpm run build`. If pnpm is not on PATH, use `npm exec --yes --package=pnpm@11.25.0 -- pnpm test` and the equivalent build command.
- Build runs TypeScript checking and produces the committed `main.js`. Rebuild it after source changes. Preserve the lockfile unless dependencies intentionally change.
- No application server, database, API keys or external AI provider are required.

## Product constraints

Keep primary information in ordinary Markdown/YAML and local attachments. Use Obsidian's public APIs for files, editing, links, search and PDF viewing. Do not create a separate web dashboard or background activity tracking. Keep Traditional Chinese primary labels with English category names.

Preserve user files and unknown metadata. Test fixtures belong only in `99 System/Demo/` and must be removed before delivery. Do not add fake courses or papers to the real content folders.

The research-design reference is source material, not authorization to replace the current architecture or add task management. Follow the user's subsequent scope decision.

## Validation

Automated tests mock Obsidian APIs; passing them does not establish that the plugin loads. The current checkpoint has an unresolved `Uninitialized` / `找不到檔案：undefined` failure in Obsidian 1.14.4. Record headless checks separately from actual Obsidian GUI validation. Do not claim desktop or mobile UI validation without observing it in that application.
