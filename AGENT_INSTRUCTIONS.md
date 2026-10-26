# Agent Instructions — Admin API Key Management UI

## Task

Implement the "Admin API Key Management UI" feature as described in `docs/ROADMAP.md`.

## Roadmap Item

- **Admin API key management UI** — allow the local administrator to view and
  update the configured Headscale API key (`headscale.api_key`) directly from
  the `/admin` page, eliminating the need to edit the config file or use the CLI.

## Description

The Headscale API key (`headscale.api_key`) is currently configured only via
the YAML config file or environment variables. In single local-administrator
mode, the admin UI at `/admin` provides password reset and Headscale API key
management (create/delete), but there is no way to update the **configured
service key** that Headplane itself uses to talk to Headscale. This feature
adds an input field and Save button to `/admin` so the administrator can view
and update the configured API key without opening a terminal or editing the
config file.

## Objective

Implement the feature end-to-end: backend action handler, loader fields,
frontend UI, documentation, and tests.

## Worktree

`/home/denny/Project/headscale-project/headscale/headplane`

## Branch

`feature/admin-api-key-management`

## Relevant Documentation

- `docs/ROADMAP.md` — feature plan (FEAT-APIKEY-001 through FEAT-APIKEY-005)
- `docs/ARCHITECTURE.md` — system architecture
- `docs/SPECIFICATION.md` — requirements and acceptance criteria
- `docs/configuration/index.md` — configuration docs
- `docs/configuration/common-issues.md` — common issues docs
- `config.example.yaml` — authoritative config sample
- `CHANGELOG.md` — user-facing changelog
- `session.md` — current working context

## Expected Files/Modules

- `app/routes/admin/route.tsx` — action handler, loader fields, UI card
- `app/server/config/config-schema.ts` — add `api_key_path` to headscale schema
- `app/server/config/write.ts` — handle `api_key_path` removal on key update
- `config.example.yaml` — add comment about `/admin` UI
- `docs/configuration/index.md` — document the new UI
- `docs/configuration/common-issues.md` — mention the new UI
- `CHANGELOG.md` — add entry under `# Next`
- `docs/ROADMAP.md` — move feature from Planned to In Progress
- `tests/unit/routes/admin-api-keys.test.ts` — add unit tests
- `tests/unit/config/write.test.ts` — add api_key_path removal test
- `tests/e2e/admin-api-keys.spec.ts` — add E2E tests

## Dependencies

None (all tasks are implemented together in this single branch).

## Acceptance Criteria

1. The `/admin` page displays the configured Headscale API key in a masked
   input field with a Save button.
2. Saving a new key updates the YAML config file atomically with a backup.
3. The UI shows a clear message that a restart is required for the change to
   take effect.
4. The full key value is never exposed in the loader response or the DOM.
5. Only administrators in single local-admin mode can access the feature.
6. When `headscale.api_key_path` is in use, the field is disabled with a
   notice explaining the key is managed externally.
7. All existing tests pass and the feature is covered by new unit tests.

## Testing Requirements

- Run `pnpm exec vitest run --project unit tests/unit/routes/admin-api-keys.test.ts tests/unit/config/write.test.ts`
- Run `pnpm run typecheck` (no new errors)
- Run `pnpm run lint` (no new warnings)
- Run `pnpm run build` (build succeeds)
- Run `pnpm run docs:build` (docs build succeeds)

## Constraints

- Follow the existing architecture, conventions, and design system.
- Reuse existing components (Card, Notice, Button, Eye/EyeOff icons).
- Do not modify unrelated code or documentation.
- Do not introduce new dependencies.
- Preserve existing functionality.
- Use `ActionError` for action error states.
- Never expose the full API key in the loader or DOM.
