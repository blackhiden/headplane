# Roadmap

This document tracks the high-level direction of Headplane: what is currently
in progress, what is planned, and what is intentionally deferred. It is
maintained alongside the implementation and kept aligned with the actual
project state.

> For a detailed list of past changes, see the
> [CHANGELOG](./CHANGELOG.md). For the service architecture patterns that
> guide ongoing development, see [Architecture](./development/architecture.md).

## Core Tenets

Every roadmap item must support these project tenets:

1. **Simple starts** — easy to set up and use, while staying powerful for
   advanced users.
2. **No breaking changes** — backward compatibility is preserved, and any
   unavoidable breaking change ships with a clear migration path.
3. **Documentation** — features are only complete when their documentation is.

## In Progress

- **Structured ACL editor** — a structured editor for ACL rules, tags, and
  groups (landed as a UI feature, iterated on with feedback from the
  [#608](https://github.com/tale/headplane/pull/608) PR).
- **Agent hardening** — improving the Headplane Agent's Tailscale integration,
  including opt-outs for problematic routing-loop socket handling and safer
  fallback behavior when the agent cannot join the Tailnet.
- **Indestructible update checker** — a self-contained, isolated domain
  (`app/update-check/`) that checks for updates on every page load for both
  Headplane and Headscale by comparing the embedded build commit hash against
  the remote `main` branch. Protected from accidental removal during upstream
  merges.

## Planned

- **Admin API key management UI** — allow the local administrator to view and
  update the configured Headscale API key (`headscale.api_key`) directly from
  the `/admin` page, eliminating the need to edit the config file or use the
  CLI. See the detailed plan below.
- **Machine management parity** — close gaps between the Tailscale admin
  console and Headplane. Key rotation and a route overview page are
  implemented; device posture remains deferred (requires significant policy
  engine changes).
- **Improved OIDC workflows** — finer-grained role mapping, better sync
  behavior for groups and roles, and per-provider troubleshooting docs.
- **DNS management improvements** — better provisioning of DNS records into
  Headscale. `extra_records_path` visibility, CNAME record support, and IP
  address validation are implemented.

## Deferred

These items are deliberately out of scope for now and should not be
implemented until the current tasks require them:

- Alternative frontend frameworks (a prior Svelte branch was explored and
  shelved; the current React Router 7 setup is authoritative).
- A plugin/extension system for third-party UI components.
- Multi-Headscale-instance management from a single dashboard.

---

## Feature Plan: Admin API Key Management UI

### Overview

The Headscale API key (`headscale.api_key`) is currently configured only via
the YAML config file or environment variables. In single local-administrator
mode, the admin UI at `/admin` provides password reset and Headscale API key
management (create/delete), but there is no way to update the **configured
service key** that Headplane itself uses to talk to Headscale. This feature
adds an input field and Save button to `/admin` so the administrator can view
and update the configured API key without opening a terminal or editing the
config file.

### Requirements

**Confirmed requirements:**

- The configured Headscale API key must be editable from the `/admin` page.
- The key must be displayed in an input field with a Save button.
- Only administrators (single local-admin mode) can view and update the key.
- The update must persist to the YAML config file atomically with a backup.
- The UI must provide clear success and error feedback.

**Implementation decisions:**

- The input field will be masked by default with a show/hide toggle, matching
  the password field pattern already used on the admin page.
- The full key will **not** be exposed in the loader response. The loader will
  return only the key prefix (first 8 characters) and a boolean indicating
  whether a key is configured. The input field will show a masked placeholder
  (e.g., `service-********`) when a key is configured.
- The backend will add a new action (`update-apikey`) to the existing admin
  route (`app/routes/admin/route.tsx`), following the same pattern as
  `reset-password`.
- The config update will use the existing `updateConfig` function from
  `app/server/config/write.ts` with `{ backup: true }`.
- After saving, the UI will inform the user that a restart is required for the
  new key to take effect (the in-memory auth service captures the key at
  startup).
- If `headscale.api_key_path` is in use, the UI will show a notice that the
  key is managed externally and the field will be disabled.

**Open questions:**

- Should the update take effect immediately without a restart? This would
  require adding a runtime key-update mechanism to the auth service and
  context. The current plan documents the restart requirement; a follow-up
  enhancement could add hot-reload.
- Should the UI support clearing the key (setting it to empty)? The current
  plan requires a non-empty value; clearing would require additional
  validation and edge-case handling.

### Phase 1: Backend — Config Update Action

**Objective:** Add a server-side action to update `headscale.api_key` in the
config file atomically with backup.

#### Task FEAT-APIKEY-001: Add `update-apikey` action handler

| Field | Value |
|---|---|
| **Status** | Pending |
| **Objective** | Implement the backend action that validates and persists a new Headscale API key to the config file. |
| **Files affected** | `app/routes/admin/route.tsx` |
| **Implementation details** | Add a new action type `update-apikey` to the `action` function in `app/routes/admin/route.tsx`. Add a `handleUpdateApiKey` function that: (1) reads `api_key` from the form data, (2) validates it is a non-empty string, (3) checks that `HEADPLANE_CONFIG_PATH` is set (or falls back to `/etc/headplane/config.yaml`), (4) calls `updateConfig(configPath, { headscale: { api_key } }, { backup: true })`, (5) returns `{ success: true, message: "API key updated. Restart Headplane for the change to take effect." }` on success, or `{ success: false, error }` on failure. Handle `EACCES`/`EPERM` errors with a clear "config file is read-only" message. |
| **Dependencies** | None |
| **Acceptance criteria** | A POST to `/admin` with `_action=update-apikey` and a valid `api_key` updates the config file atomically with a backup and returns success. Invalid or empty keys are rejected. Read-only config errors are surfaced clearly. |
| **Tests** | Add unit tests in `tests/unit/routes/admin-api-keys.test.ts` covering: successful update, empty key rejection, read-only config error, and non-admin rejection. |
| **Verification** | `pnpm run test:unit` passes; `pnpm run typecheck` is clean. |
| **Risks** | None significant. |

#### Task FEAT-APIKEY-002: Update loader to expose key configuration state

| Field | Value |
|---|---|
| **Status** | Pending |
| **Objective** | Extend the admin loader to return whether a key is configured and whether it is managed via `api_key_path`, without exposing the full key. |
| **Files affected** | `app/routes/admin/route.tsx`, `app/server/context.ts` |
| **Implementation details** | In the loader, add `hasConfiguredApiKey: boolean` (true when `configuredApiKey` is non-empty) and `apiKeyManagedExternally: boolean` (true when `config.headscale.api_key_path` is set). The `headscaleApiKeyContext` already provides the resolved key; the loader already computes `configuredApiKeyPrefix`. Add the new fields to the loader return object. |
| **Dependencies** | FEAT-APIKEY-001 |
| **Acceptance criteria** | The loader returns `hasConfiguredApiKey` and `apiKeyManagedExternally` without exposing the full key value. |
| **Tests** | Update `tests/unit/routes/admin-api-keys.test.ts` to assert the new loader fields. |
| **Verification** | `pnpm run test:unit` passes; `pnpm run typecheck` is clean. |
| **Risks** | None significant. |

### Phase 2: Frontend — Admin UI

**Objective:** Add the API key input field and Save button to the `/admin` page.

#### Task FEAT-APIKEY-003: Add API key input field and Save button to `/admin`

| Field | Value |
|---|---|
| **Status** | Pending |
| **Objective** | Render an input field (masked by default) with a Save button on the `/admin` page, plus success/error feedback. |
| **Files affected** | `app/routes/admin/route.tsx` |
| **Implementation details** | In the `AdminRoute` component, add a new `<Card>` between the "Reset Password" card and the `<ApiKeyManagement>` component. The card should contain: (1) a `<Card.Title>` "Headscale API Key", (2) a `<Card.Text>` explaining the key is used to connect to Headscale, (3) an `<input type="password">` (or `type="text"` when revealed) with a show/hide toggle button (using `Eye`/`EyeOff` icons from `lucide-react`, matching the pattern in `app/routes/admin/admin/users/route.tsx`), (4) a Save button, (5) a `<Notice>` for success/error feedback from `actionData`. When `loaderData.apiKeyManagedExternally` is true, show a notice that the key is managed via `api_key_path` and disable the input. When `loaderData.hasConfiguredApiKey` is true, show a masked placeholder (e.g., `service-********`). Use a `useFetcher` for the form submission (matching the `ApiKeyManagement` component pattern) or the existing `Form` + `useActionData` pattern. |
| **Dependencies** | FEAT-APIKEY-001, FEAT-APIKEY-002 |
| **Acceptance criteria** | The `/admin` page renders the API key input field with a Save button. The field is masked by default with a show/hide toggle. Success and error messages are displayed. The field is disabled when the key is managed externally. |
| **Tests** | Add component tests or update existing admin route tests to verify the UI renders correctly. |
| **Verification** | `pnpm run typecheck` is clean; manual verification in the browser at `/admin`. |
| **Risks** | None significant. |

### Phase 3: Documentation

**Objective:** Update documentation to reflect the new UI capability.

#### Task FEAT-APIKEY-004: Update configuration and admin documentation

| Field | Value |
|---|---|
| **Status** | Pending |
| **Objective** | Document the new API key management UI in the configuration docs and the admin page docs. |
| **Files affected** | `docs/configuration/index.md`, `docs/configuration/common-issues.md`, `config.example.yaml`, `CHANGELOG.md` |
| **Implementation details** | In `docs/configuration/index.md`, add a section under "Local administrator profile" describing that the Headscale API key can be updated from `/admin`. In `docs/configuration/common-issues.md`, update the "Password login redirects back to the login page" section to mention the new UI. In `config.example.yaml`, add a comment near `headscale.api_key` noting it can be updated from `/admin`. Add a line to the `# Next` section of `CHANGELOG.md` under `## Changes`. |
| **Dependencies** | FEAT-APIKEY-003 |
| **Acceptance criteria** | Documentation reflects the new UI capability. |
| **Tests** | N/A (documentation only). |
| **Verification** | Review the updated docs for accuracy. |
| **Risks** | None significant. |

### Phase 4: Integration and Regression Testing

**Objective:** Verify the feature works end-to-end and does not break existing functionality.

#### Task FEAT-APIKEY-005: Integration and regression testing

| Field | Value |
|---|---|
| **Status** | Pending |
| **Objective** | Run the full test suite and verify the feature works end-to-end. |
| **Files affected** | None (testing only). |
| **Implementation details** | Run `pnpm run test:unit`, `pnpm run typecheck`, and `pnpm run lint`. If E2E tests exist for the admin page, add a test that updates the API key and verifies the config file is updated. |
| **Dependencies** | FEAT-APIKEY-001 through FEAT-APIKEY-004 |
| **Acceptance criteria** | All tests pass. The feature works end-to-end: admin can view, edit, and save the API key from `/admin`, and the change is persisted to the config file. |
| **Tests** | Full test suite. |
| **Verification** | `pnpm run test:unit`, `pnpm run typecheck`, `pnpm run lint` all pass. |
| **Risks** | None significant. |

### Task Dependency Graph

```
FEAT-APIKEY-001 (backend action)
    ↓
FEAT-APIKEY-002 (loader fields) ──→ FEAT-APIKEY-003 (frontend UI)
                                        ↓
                                   FEAT-APIKEY-004 (docs)
                                        ↓
                                   FEAT-APIKEY-005 (integration testing)
```

### Acceptance Criteria (Feature-Level)

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

## Tracking

- Day-to-day work is tracked via
  [GitHub issues](https://github.com/tale/headplane/issues) with labels such
  as "Needs Triage", "Needs Info", "Bug", and "Enhancement".
- Long-horizon items live here. When an item moves from Planned to In
  Progress, update this document in the same change as the implementation.
- Completed items are removed from this document and recorded in the
  [CHANGELOG](./CHANGELOG.md) instead.
