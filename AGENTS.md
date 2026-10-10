# Personal Learning & Research Workspace

This repository is an Obsidian Vault, not a web application. Read `99 System/Documentation/HANDOFF.md` before continuing development; it records the current implementation, research-reference scope and validation limits.

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

The research-design reference is source material, not authorization to replace the current architecture or add task management. The user subsequently authorized a Home Markdown task list and explicit Project progress percentages, updated manually or by AI. Keep these portable; do not infer completion or progress from activity. See AI_WORKFLOW.md. A scheduled automation has not been configured.

## Validation

Automated tests mock Obsidian APIs; passing them does not establish that the plugin loads. The `Uninitialized` / `找不到檔案：undefined` failure was traced to an `open` lifecycle name collision and fixed; keep custom entry actions named `openEntry`. See `VALIDATION.md` for the exact desktop checks observed. Record headless checks separately from actual Obsidian GUI validation. Do not claim desktop or mobile UI validation without observing it in that application.

## AI-assisted daily use

The user wants AI to actively help write notes, organize material, and update project/repository content from their descriptions—not just hand them text to copy. For an authorized capture or update request, find the relevant existing files, perform the appropriate local edits, preserve personal text and unknown metadata, and report the changes briefly. Use Inbox when categorization is uncertain. Distinguish source facts, user statements, and AI suggestions. Do not infer completed work or percentages without evidence. Read `99 System/Documentation/AI_WORKFLOW.md` for these conventions. The user explicitly deferred scheduling; do not create recurring automations unless asked again.
