# Initial Prompt — Admin API Key Management UI

You are tasked with implementing the "Admin API Key Management UI" feature for
Headplane, as described in `docs/ROADMAP.md`.

## Context

Headplane is a web UI for Headscale. The Headscale API key (`headscale.api_key`)
is currently configured only via the YAML config file or environment variables.
In single local-administrator mode, the admin UI at `/admin` provides password
reset and Headscale API key management (create/delete), but there is no way to
update the **configured service key** that Headplane itself uses to talk to
Headscale.

## What to Do

1. Read `docs/ROADMAP.md` (the feature plan section), `docs/ARCHITECTURE.md`,
   `docs/SPECIFICATION.md`, `session.md`, and `AGENT_INSTRUCTIONS.md`.
2. Read the relevant source code: `app/routes/admin/route.tsx`,
   `app/server/config/config-schema.ts`, `app/server/config/write.ts`,
   `app/server/context.ts`, `app/components/callout.tsx`,
   `app/components/notice.tsx`, `app/components/card.tsx`,
   `app/components/button.tsx`.
3. Implement the feature:

   **Backend action handler** (`app/routes/admin/route.tsx`):
   - Add a new action type `update-apikey` to the `action` function.
   - Add a `handleUpdateApiKey` function that:
     - Reads `api_key` from the form data.
     - Validates it is a non-empty string.
     - Checks that `headscale.api_key_path` is not set (reject if it is).
     - Calls `updateConfig(configPath, { headscale: { api_key } }, { backup: true })`.
     - Returns `{ success: true, message: "API key updated. Restart Headplane for the change to take effect." }` on success.
     - Handles `CONFIG_WRITE_FAILED`/`EACCES`/`EPERM` errors with a clear "config file is read-only" message.

   **Loader fields** (`app/routes/admin/route.tsx`):
   - Add `hasConfiguredApiKey: boolean` (true when `configuredApiKey` is non-empty).
   - Add `apiKeyManagedExternally: boolean` (true when `config.headscale.api_key_path` is set).
   - Never expose the full key value.

   **Config schema** (`app/server/config/config-schema.ts`):
   - Add `api_key_path: "string?"` to both `headscaleConfig` and `partialHeadscaleConfig`.

   **Config write** (`app/server/config/write.ts`):
   - Update `removeSupersededSecretPaths` to also remove `headscale.api_key_path`
     when `headscale.api_key` is updated.

   **Frontend UI** (`app/routes/admin/route.tsx`):
   - Add a new `<Card>` between the "Reset Password" card and the `<ApiKeyManagement>` component.
   - The card should contain: `<Card.Title>` "Headscale API Key", `<Card.Text>`,
     a masked `<input type="password">` with show/hide toggle (using `Eye`/`EyeOff`
     icons from `lucide-react`), a Save button, and `<Notice>` for success/error feedback.
   - When `apiKeyManagedExternally` is true, show a notice and disable the input.
   - When `hasConfiguredApiKey` is true, show a masked placeholder (e.g., `service-********`).
   - Use `useFetcher` for the form submission.

   **Tests**:
   - Update `tests/unit/routes/admin-api-keys.test.ts` with tests for:
     - Loader returns `hasConfiguredApiKey` and `apiKeyManagedExternally`.
     - Successful API key update.
     - Empty key rejection.
     - `api_key_path` conflict rejection.
     - Read-only config error handling.
   - Update `tests/unit/config/write.test.ts` with a test for `api_key_path` removal.
   - Update `tests/e2e/admin-api-keys.spec.ts` with tests for the new UI card.

   **Documentation**:
   - Update `docs/configuration/index.md` with a "Headscale API key" section.
   - Update `docs/configuration/common-issues.md` to mention the new UI.
   - Update `config.example.yaml` with a comment about the `/admin` UI.
   - Add a CHANGELOG entry under `# Next`.
   - Update `docs/ROADMAP.md` to move the feature from Planned to In Progress.

4. Run validation:
   - `pnpm exec vitest run --project unit tests/unit/routes/admin-api-keys.test.ts tests/unit/config/write.test.ts`
   - `pnpm run typecheck` (no new errors)
   - `pnpm run lint` (no new warnings)
   - `pnpm run build`
   - `pnpm run docs:build`

5. Commit the completed work to the `feature/admin-api-key-management` branch.

## Constraints

- Follow the existing architecture, conventions, and design system.
- Reuse existing components (Card, Notice, Button, Eye/EyeOff icons).
- Do not modify unrelated code or documentation.
- Do not introduce new dependencies.
- Preserve existing functionality.
- Never expose the full API key in the loader or DOM.
