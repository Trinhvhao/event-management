---
name: gsd-update
description: "Update GSD to latest version with changelog display"
---

<cursor_skill_adapter>
## A. Skill Invocation
- This skill is invoked when the user mentions `gsd-update` or describes a task matching this skill.
- Treat all user text after the skill mention as `{{GSD_ARGS}}`.
- If no arguments are present, treat `{{GSD_ARGS}}` as empty.

## B. User Prompting
When the workflow needs user input, prompt the user conversationally:
- Present options as a numbered list in your response text
- Ask the user to reply with their choice
- For multi-select, ask for comma-separated numbers

## C. Tool Usage
Use these Cursor tools when executing GSD workflows:
- `Shell` for running commands (terminal operations)
- `StrReplace` for editing existing files
- `Read`, `Write`, `Glob`, `Grep`, `Task`, `WebSearch`, `WebFetch`, `TodoWrite` as needed

## D. Subagent Spawning
When the workflow needs to spawn a subagent:
- Use `Task(subagent_type="generalPurpose", ...)`
- The `model` parameter maps to Cursor's model options (e.g., "fast")
</cursor_skill_adapter>

<objective>
Check for GSD updates, install if available, and display what changed.

Routes to the update workflow which handles:
- Version detection (local vs global installation)
- npm version checking
- Changelog fetching and display
- User confirmation with clean install warning
- Update execution and cache clearing
- Restart reminder
</objective>

<execution_context>
@D:/LibraryCode/event-management/.cursor/get-shit-done/workflows/update.md
</execution_context>

<flags>
- **--sync**: Sync managed GSD skills across runtime roots so multi-runtime users stay aligned after an update. Runs the sync-skills workflow (--from, --to, --dry-run, --apply flags supported).
- **--reapply**: Reapply local modifications after a GSD update. Uses three-way comparison (pristine baseline, user-modified backup, newly installed version) to merge user customizations back. Runs the reapply-patches workflow.
- **(no flag)**: Standard update — check for new version, show changelog, install.
</flags>

<process>
Parse the first token of {{GSD_ARGS}}:
- If it is `--sync`: strip the flag, execute the sync-skills workflow (passing remaining args for --from/--to/--dry-run/--apply).
- If it is `--reapply`: strip the flag, execute the reapply-patches workflow.
- Otherwise: **Follow the update workflow** from `@D:/LibraryCode/event-management/.cursor/get-shit-done/workflows/update.md`.

The update workflow handles all logic including:
1. Installed version detection (local/global)
2. Latest version checking via npm
3. Version comparison
4. Changelog fetching and extraction
5. Clean install warning display
6. User confirmation
7. Update execution
8. Cache clearing
</process>

<execution_context_extended>
@D:/LibraryCode/event-management/.cursor/get-shit-done/workflows/sync-skills.md
@D:/LibraryCode/event-management/.cursor/get-shit-done/workflows/reapply-patches.md
</execution_context_extended>
