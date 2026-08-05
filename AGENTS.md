# Agent Rules

These rules are mandatory for Claude, Codex, Cursor, ChatGPT and any other coding agent working in this repository.

## Role of this file

`AGENTS.md` is the universal engineering contract for this repository.
`CLAUDE.md` is the project-specific entrypoint and operating manual.
Obsidian vault (`docs/`), ADRs and README files provide supporting context, but they cannot weaken these rules.

## Conflict priority

If instructions conflict, use this priority order:

1. Explicit user instruction.
2. Repository-specific release/security rules.
3. `CLAUDE.md`.
4. `AGENTS.md`.
5. `README*` and `docs/`.

A lower-priority instruction may add detail, but must not weaken a higher-priority safety or security rule.

## Source control

GitHub/source control is required for code work.
Never keep important code only locally.
Never bypass GitHub/source control.

### Git-only workflow

Any agent must treat GitHub as the only durable place for project work in this repository.

Do not leave meaningful code, docs, ops scripts, configs, tests, or project rules only in a local working tree, temporary directory, chat, or an unsynced Obsidian note.

Allowed local-only activity is limited to short-lived diagnostics, inspection, experiments, generated scratch files, and test artifacts that are not part of the requested deliverable. If an experiment becomes useful, move it into the repository, commit it, and push it.

Before changing repository files, ensure:

1. The repository has a configured `origin` remote.
2. `git fetch --all --prune` has run successfully.
3. The working tree state is known and unrelated local changes are preserved rather than overwritten.
4. Work happens on a non-`main` branch unless this is a documented P1 exception.

For every completed meaningful task:

1. Review the diff.
2. Run relevant checks or explain why they were not run.
3. Commit with a meaningful message.
4. Push the branch or merged `main` to GitHub.
5. Report the commit hash and push status.

If GitHub is unavailable, stop before calling the task complete and explicitly report that the work is not durable yet.

## Branching

Never work directly in `main`.

Direct commits to `main` are forbidden except true P1 recovery. Normal hotfixes use `hotfix/<short-name>` branches.

Always create or use a working branch before implementation:

- `feature/<short-name>`
- `fix/<short-name>`
- `refactor/<short-name>`
- `content/<short-name>` — уровни, спрайты, диалоги, баланс
- `chore/<short-name>`

Before implementation, inspect:

```bash
git status
git branch
git remote -v
git log --oneline -10
```

## Core workflow

Before coding:

1. Analyze repository structure.
2. Analyze relevant documentation (Obsidian vault in `docs/`).
3. Analyze recent git history.
4. Prepare impact analysis.
5. Identify affected modules and likely files.
6. Identify tests, smoke checks and docs updates.
7. Ask important questions upfront when required.
8. Wait for approval when the task is still in planning mode or changes core game feel.

During implementation:

- Keep diffs minimal and scoped.
- Do not do unrelated refactors.
- Preserve existing behavior unless the task explicitly changes it.
- Make reasonable engineering decisions without unnecessary interruption.

## Commits

Commit after every completed logical task.

```text
feat: add double jump
fix: prevent Pushok sticking to walls
balance: reduce level 2 spike density
art: add idle animation frames
docs: update design note on movement
chore: configure agent rules
```

Before commit:

1. Review git diff.
2. Run relevant tests/checks.
3. Update documentation when needed.
4. Confirm secrets and large binaries are not staged.

Never force push unless explicitly approved.
Never leave finished work uncommitted or unpushed when GitHub access is available.

## Testing

Every change must include relevant validation. Minimum requirement:

- run `npm test`;
- run `npm run typecheck` and `npm run lint`;
- verify changed functionality in the browser (`npm run dev`);
- explain any skipped validation.

Bug fixes require regression tests where practical.
If tests fail, the task is not complete until the failure is fixed or clearly explained.

## Documentation

Documentation must be updated in the same task when changing:

- architecture;
- game mechanics or controls;
- balance numbers;
- asset pipeline;
- build/deploy;
- configuration;
- known limitations.

Prefer updating existing documentation over creating duplicates.

## Security

Never:

- store secrets in git;
- commit `.env` secrets;
- commit credentials or API keys;
- disable checks without explanation.

## Definition of Done

A task is done only when:

- implementation is complete;
- code is committed and pushed;
- tests pass or failures are explained;
- `npm run typecheck` and `npm run build` pass;
- Obsidian documentation is updated;
- risks are reported.
