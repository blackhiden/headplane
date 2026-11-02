# Agent Instructions — Phase 18: Frontend Admin Info Section UI (Headplane)

## Task

Implement the Admin Technical Info section at `/admin/admin` in Headplane, displaying server and system details for both Headscale and Headplane.

## Worktree

- **Worktree:** `/home/denny/Project/headscale-project/headplane-admin-techinfo-ui`
- **Branch:** `feature/admin-techinfo-ui`
- **Base commit:** `70caba2992365d2258bd1112a8d7a02b6219ad85`

## Objective

Add a new section to the Headplane admin page (`/admin/admin`) that displays technical specifications of the Headscale control server and the Headplane server. The section shows data such as CPU, RAM, storage, OS, runtime version, Docker status/version, public IP, and tailnet network info.

## Files to Create/Modify

### New files:

- `app/routes/api/admin/server-info.ts` — Admin-only API endpoint that returns merged server info
- `app/components/server-info-card.tsx` — Reusable card component for displaying server info
- `app/routes/admin/components/technical-info-section.tsx` — The technical info section component

### Modified files:

- `app/routes/admin/route.tsx` — Add the technical info section to the admin page
- `app/server/headscale/api/index.ts` — Add `serverInfo()` method to the Headscale client
- `app/server/headscale/api/resources/server-info.ts` — New resource for the server-info API

## Implementation Details

### 1. Headplane Server Info API

Create `app/routes/api/admin/server-info.ts` following the pattern of `app/routes/api/admin/apikeys.ts`:

- `GET /api/admin/server-info` — Returns merged JSON with both Headplane and Headscale info
- Requires admin authentication (use `isAdmin` check)
- Gathers Headplane info from Node.js runtime (`node:os` module):
  - Node.js version, OS, architecture
  - CPU count, RAM total, storage total
  - Deployment mode (native vs Docker)
  - Public IP (when determinable)
  - Headplane version from package.json or build info
- Proxies Headscale `/api/v1/server-info` through the Headplane backend
- Handles Headscale being unreachable gracefully (returns partial data)

### 2. Headscale API Client

Add a `serverInfo()` method to the Headscale client in `app/server/headscale/api/index.ts`:

```typescript
serverInfo(apiKey: string): Promise<ServerInfoResponse>;
```

Create `app/server/headscale/api/resources/server-info.ts` following the pattern of `derp.ts`.

### 3. Technical Info Section Component

Create `app/routes/admin/components/technical-info-section.tsx`:

- Uses the existing `Card` component
- Displays two separate cards within the same section:
  - One for Headscale server info
  - One for Headplane server info
- Handles loading, error, and partial-data states
- Shows "Unavailable" for missing fields rather than failing the section
- Responsive on desktop, tablet, and mobile

### 4. Admin Page Integration

Modify `app/routes/admin/route.tsx` to include the technical info section.

### 5. Server Info Card Component

Create `app/components/server-info-card.tsx` as a reusable component:

- Accepts a `ServerInfo` prop
- Displays fields in a structured, readable format with clear labels
- Uses the existing design system (Card, Text, etc.)

## Testing

Add tests following the existing test patterns:

- Unit tests for the server-info API endpoint
- Component tests for the technical info section
- Integration tests for the proxy endpoint

## Validation

Run these commands to validate:

```bash
cd /home/denny/Project/headscale-project/headplane-admin-techinfo-ui
pnpm install
npx tsc --noEmit
npx oxlint
npx vitest run tests/unit
npx vitest run tests/component
```

## Constraints

- Do NOT modify any files outside the scope listed above.
- Do NOT modify the main headscale repo (only the headplane submodule).
- Do NOT modify database schema or migrations.
- Do NOT modify existing API endpoints or their behavior.
- Follow the existing code conventions (see `AGENTS.md` in the repo root).
- Use the existing design system and components.
- No sensitive information (API keys, passwords, tokens, private keys) may be exposed.
- Commit with message format: `admin: add technical info section to admin page`

## Acceptance Criteria

1. `/admin/admin` shows a new section with technical details for both Headscale and Headplane.
2. Info includes: CPU, RAM, storage, OS, runtime version, Docker status/version, public IP, tailnet network.
3. Works for both native and Docker deployments.
4. No sensitive info is exposed.
5. UI handles missing/unavailable data gracefully.
6. All tests pass.
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
