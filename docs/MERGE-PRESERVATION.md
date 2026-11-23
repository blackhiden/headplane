<!--
FORK-OWNED FILE: docs/MERGE-PRESERVATION.md

This file is not upstream documentation. During an upstream merge, keep every
line between the document start and end markers, including all feature blocks.
Never accept an upstream version that deletes or rewrites this file.
-->

# Merge Preservation

<!-- HEADPLANE-FORK-DOC:START -->

This document describes how Headplane preserves fork-specific features when merging
changes from upstream Headscale.

## Overview

Headplane is a fork of the upstream Headscale web UI that regularly synchronizes
with upstream changes to benefit from improvements and bug fixes. However, the
fork contains significant additional features and architectural changes that must
not be lost during these merges.

**Key principle:** Every upstream merge must explicitly preserve all fork-specific
features, components, and documentation.

## Document Contract

This file is fork-owned. The document start/end markers define the region that
must survive every upstream merge. Inside it, each protected feature has its own
start/end marker pair with a stable feature id. The merge guard
(`pnpm run check:fork`) fails if a marker is missing, duplicated, out of order,
or if a feature block no longer contains its required path or token.

When resolving an upstream merge:

1. Keep this entire file from the fork side when upstream deletes or rewrites it.
2. Keep every feature block, even when the surrounding section is rewritten.
3. Add a new feature block and a matching guard entry when adding a fork feature.
4. Never move a feature outside the document markers.

## Why This Matters

- **Both projects are forks** that regularly merge upstream changes.
- **Upstream merges can delete or overwrite** fork-specific features, either
  through direct file conflicts or by replacing entire directories.
- **Silent data loss** can occur when upstream renames, moves, or deletes files
  that contain fork-specific functionality.
- **CI protection** and explicit documentation help catch accidental removals
  before they reach production.

## Protected Features and Components

The following features and components are fork-specific and must survive all
upstream merges:

<!-- HEADPLANE-FORK-FEATURE:START update-check -->

### 1. Update Check Feature (`app/update-check/`)

**Status:** Critical fork feature — DO NOT REMOVE

The in-app update checker compares the running Docker image's embedded commit
hash against the latest commit on the remote `main` branch for both Headplane
and Headscale.

- **Location:** `app/update-check/`
- **Files:** `index.ts`, `types.ts`, `git-api.ts`, `useUpdateCheck.ts`,
  `UpdateCheckProvider.tsx`, `UpdateCheckModal.tsx`, `README.md`
- **Protection:** Directory isolation with dedicated README explaining preservation
- **CI Check:** Should verify `app/update-check/` exists
- **Restoration:** If removed, copy the directory back from the last known good commit

See `app/update-check/README.md` for complete documentation.

<!-- HEADPLANE-FORK-FEATURE:END update-check -->

<!-- HEADPLANE-FORK-FEATURE:START qr-scanner -->

### 2. QR Scanner Component (`app/components/qr-scanner/`)

**Status:** Critical fork feature — DO NOT REMOVE

A reusable QR code scanner component with browser camera integration that enables
machine registration via QR code scanning. This feature provides a modern,
user-friendly alternative to manual registration workflows.

- **Location:** `app/components/qr-scanner/`
- **Files:** `index.ts`, `qr-scanner.tsx`, `README.md`
- **Used by:** `app/routes/machines/scan-qr.tsx` (machine registration page)
- **Tests:** `tests/component/qr-scanner.test.tsx`, `tests/component/scan-qr.test.tsx`
- **Dependencies:** Uses `html5-qrcode` library for QR decoding
- **Features:** Camera permission handling, error states, validation, 10 FPS scanning
- **Protection:** Directory isolation with dedicated README and comprehensive test coverage
- **CI Check:** Should verify `app/components/qr-scanner/` exists
- **Restoration:** If removed, copy the directory back from the last known good commit

See `app/components/qr-scanner/README.md` for complete documentation.

<!-- HEADPLANE-FORK-FEATURE:END qr-scanner -->

<!-- HEADPLANE-FORK-FEATURE:START local-admin -->

### 3. Local Administrator Authentication (`app/server/auth/local-admin.ts`)

**Status:** Critical fork feature — DO NOT REMOVE

Enables administrative authentication using a username and password instead of requiring a raw Headscale API key or external OIDC single sign-on provider. This feature provides a standalone, secure login mechanism for self-hosted deployments. It includes bcrypt cost-12 hash enforcement, brute-force rate limiting, profile management, and automatic session invalidation.

- **Location & Key Files:**
  - `app/server/auth/local-admin.ts` — `createLocalAdminService` factory and `LocalAdminService` interface managing username/password verification, rate limiting (max 5 failed attempts per 15-minute sliding window per username), and dynamic credential updates.
  - `app/server/auth/bcrypt-utils.ts` — Bcrypt utilities enforcing cost-12 hashes (`validateBcryptHash`), password verification (`verifyPassword`), and hashing (`hashPassword`).
  - `app/server/context.ts` — Dependency injection container exposing `localAdminContext`, building `LocalAdminService` when `config.user` is defined, and enforcing mutual exclusivity (disabling OIDC and proxy authentication when local admin mode is active).
  - `app/server/config/config-schema.ts` & `app/server/config/load.ts` — ArkType schema and config loader validating `user.username`, `user.password` (bcrypt cost 12), `user.password_path`, `user.name`, and `user.avatar`.
  - `app/server/config/write.ts` — `updateConfig` helper writing configuration changes atomically with private timestamped backups (`.bak.<timestamp>`) and atomic file replacement.
  - `app/server/db/schema.ts` & `app/server/web/auth.ts` — Database schema supporting `authSessions` with `kind = 'password'`, `createPasswordSession`, and `invalidatePasswordSessions()` which revokes all active password sessions upon credential changes.
  - `app/routes/auth/login/action.ts` & `app/routes/auth/login/page.tsx` — Login interface offering username/password authentication alongside API key login.
  - `app/routes/admin/admin/users/route.tsx` — Local administrator profile administration UI allowing username, name, avatar, and password updates.
  - `app/routes/admin/route.tsx` — Administration panel exposing masked Headscale API key view/edit for local administrators.
  - CLI management tools:
    - `cmd/headplane-hash-password.ts` — CLI tool generating bcrypt cost-12 hashes from stdin (`headplane hash-password --password-stdin`).
    - `cmd/headplane-reset-local-admin-password.ts` — CLI tool resetting administrator passwords when config is read-only or in headless environments.
    - `cmd/headplane-migrate-local-admin.ts` — CLI tool migrating legacy Headscale database users to `config.yaml`.
- **Tests:**
  - `tests/unit/auth/local-admin.test.ts` — Rate limiting, credential validation, update verification.
  - `tests/unit/auth/bcrypt-utils.test.ts` — Bcrypt cost-12 validation and password verification.
  - `tests/unit/auth/password-login-action.test.ts` — Login action handling, error handling, session cookie issuance.
  - `tests/unit/auth/session-invalidation.test.ts` — Password session revocation in SQLite.
  - `tests/unit/routes/admin-users.test.ts` — Admin profile loader, profile action, password action.
  - `tests/unit/server/config/user-fields.test.ts` — Configuration schema validation for user fields.
  - `tests/integration/cli/reset-password.test.ts` — CLI reset tool execution and config updates.
  - `tests/integration/cli/migrate-local-admin.test.ts` — CLI migration from legacy database.
- **Why It Is Vulnerable During Upstream Merges:**
  - Upstream Headscale web UI does not support username/password authentication (only API keys and OIDC).
  - Merging upstream updates into shared files (`app/server/context.ts`, `app/routes/auth/login/action.ts`, `app/routes/auth/login/page.tsx`, `app/server/web/auth.ts`) can silently discard the `localAdmin` context, login form toggle, or `kind = 'password'` session handling.
  - Standalone fork files (`app/server/auth/local-admin.ts`, `app/server/auth/bcrypt-utils.ts`, `cmd/headplane-*.ts`) can be orphaned or accidentally deleted if not protected.
- **Protection:**
  - Explicit file and context preservation across all upstream merges.
  - Comprehensive unit and integration test coverage verifying authentication, session lifecycle, and CLI utilities.
- **CI & Pre-Commit Check:**
  - Automated check script: `scripts/check-fork-features.sh` (or `pnpm run check:fork`).
  - Unit test: `tests/unit/auth/merge-preservation.test.ts` (runs in `pnpm test:unit`).
  - Pre-commit hook: Configured in `lefthook.yml` under `check_fork`.
  - CI Workflow: Runs `scripts/check-fork-features.sh` in `.github/workflows/build.yaml`.
  - Verifies existence of:
    - `app/server/auth/local-admin.ts`
    - `app/server/auth/bcrypt-utils.ts`
    - `cmd/headplane-hash-password.ts`
    - `cmd/headplane-reset-local-admin-password.ts`
    - `cmd/headplane-migrate-local-admin.ts`
    - `app/routes/admin/admin/users/route.tsx`
  - Verifies presence of password authentication in shared files:
    - `app/routes/auth/login/action.ts` (`localAdminContext`, `createPasswordSession`)
    - `app/routes/auth/login/page.tsx` (`loginMethod`, `name="password"`, `isHydrated`)
    - `app/server/context.ts` (`localAdminContext`, `buildLocalAdmin`)
    - `app/server/db/schema.ts` (`authSessions` with `'password'`)
    - `app/server/web/auth.ts` (`createPasswordSession`, `invalidatePasswordSessions`)
- **Restoration:**
  If accidentally removed or overwritten during an upstream merge:
  ```bash
  git checkout <last-good-commit> -- \
    app/server/auth/local-admin.ts \
    app/server/auth/bcrypt-utils.ts \
    cmd/headplane-hash-password.ts \
    cmd/headplane-reset-local-admin-password.ts \
    cmd/headplane-migrate-local-admin.ts \
    app/routes/admin/admin/users/route.tsx \
    app/routes/auth/login/action.ts \
    app/routes/auth/login/page.tsx
  ```
  And re-verify integration in `app/server/context.ts` and `app/server/web/auth.ts`. Run `pnpm run check:fork` to validate.

See `docs/configuration/index.md#local-administrator-profile` for complete documentation.

<!-- HEADPLANE-FORK-FEATURE:END local-admin -->

<!-- HEADPLANE-FORK-FEATURE:START docs -->

### 4. Documentation

Fork-specific documentation that must be preserved:

- **`CODE_GRAPH.md`** — High-level codebase structure and architecture map
  (deleted upstream, kept locally)
- **`SCHEMA.md`** — Database and configuration schema documentation
- **`docs/MERGE-PRESERVATION.md`** — This document
- **`session.md`** — Session continuity and working context
- **`ROADMAP.md`** — Fork-specific roadmap and feature tracking

<!-- HEADPLANE-FORK-FEATURE:END docs -->

<!-- HEADPLANE-FORK-FEATURE:START navigation -->

### 5. Navigation and Routes

Additional navigation tabs and routes not present in upstream:

- `/routes` — Routes management page
- `/topology` — Network topology visualization
- `/derp` — DERP server status and configuration
- `/instances` — Multi-instance dashboard
- `/audit` — Audit log viewer
- `/admin` — Administration panel with API key management
- `/admin/admin/users` — Local administrator profile and password management

<!-- HEADPLANE-FORK-FEATURE:END navigation -->

<!-- HEADPLANE-FORK-FEATURE:START ui-components -->

### 6. UI Components

Fork-specific UI components in `app/components/`:

- `empty-state.tsx` — Empty state display component
- `error-banner.tsx` — Error notification banner
- `loading-spinner.tsx` — Loading state indicator
- `table-list.tsx` — Enhanced table/list component
- `server-info-card.tsx` — Server information display

Note: The `qr-scanner/` component is documented separately above as a critical feature.

<!-- HEADPLANE-FORK-FEATURE:END ui-components -->

<!-- HEADPLANE-FORK-FEATURE:START design-system -->

### 7. Design System Enhancements

Fork-specific design tokens and theme system:

- Semantic color tokens (canvas, surface, raised, subtle, hover, line, fg, muted,
  faint, accent, ok, warn, bad, danger)
- Enhanced dark mode support
- Backdrop blur effects on header and footer
- Sticky header with active pill indicators

<!-- HEADPLANE-FORK-FEATURE:END design-system -->

<!-- HEADPLANE-FORK-FEATURE:START backend -->

### 8. Backend Features

Fork-specific backend functionality:

- `/api/admin/server-info` — Merged server info endpoint
- `/api/v1/derp` — DERP status endpoint (fork-only, returns 404 on upstream)
- Enhanced authentication and session management (local admin and password sessions)
- Config file atomic updates with backup

<!-- HEADPLANE-FORK-FEATURE:END backend -->

<!-- HEADPLANE-FORK-FEATURE:START agent -->

### 9. Agent Enhancements

Fork-specific Headplane Agent improvements:

- Fault tolerance and retry logic
- Enhanced caching and periodic sync model
- Extended integration tests

<!-- HEADPLANE-FORK-FEATURE:END agent -->

<!-- HEADPLANE-FORK-FEATURE:START build-defines -->

### 10. Build Defines (`vite.config.ts`, `vitest.config.ts`)

**Status:** Critical fork feature — DO NOT REMOVE

The update checker and version reporting depend on build-time globals. Upstream
syncs repeatedly rewrite the Vite configuration, so these defines must be
restored in both the app and test configs after every merge.

- **Required defines:** `__COMMIT_HASH__`, `__BUILD_TIME__`
- **App config:** `vite.config.ts`
- **Test config:** `vitest.config.ts`
- **Consumers:** `app/root.tsx`, `app/routes/util/info.ts`, `app/update-check/`
- **CI Check:** `pnpm run check:fork` verifies both defines in `vite.config.ts`
- **Restoration:** Re-add the derive blocks and `define` entries from the last
  known good commit, then run `pnpm run check:fork` and `pnpm run build`.

<!-- HEADPLANE-FORK-FEATURE:END build-defines -->

## Merge Preservation Strategy

### Before Merging

1. **Document the current state** in `session.md`:
   - Current commit hash
   - List of all protected features and files
   - Any known conflicts or areas of concern

2. **Review upstream changes**:
   - Check the upstream changelog and commit history
   - Identify files that have been moved, renamed, or deleted upstream
   - Look for conflicts with fork-specific features

3. **Create a backup branch**:
   ```bash
   git checkout -b backup/pre-merge-$(date +%Y%m%d)
   git push origin backup/pre-merge-$(date +%Y%m%d)
   ```

### During Merge

1. **Fetch upstream changes**:

   ```bash
   git fetch upstream
   git merge upstream/main
   ```

2. **Resolve conflicts with preservation priority**:
   - For fork-specific files: **always keep the fork version**
   - For shared files: **manually merge, preserving fork features**
   - For deleted files: **restore if they contain fork features**
   - For this document: **keep every marker-delimited block from the fork side**

3. **Check for silent deletions and integration integrity**:

   ```bash
   # Run automated fork preservation check
   pnpm run check:fork
   ```

   The automated script verifies all protected directories, standalone files, and
   critical integration points in shared files (`action.ts`, `page.tsx`, `context.ts`,
   `schema.ts`, `auth.ts`, `vite.config.ts`).

4. **Verify protected features**:
   - Check that all navigation routes still exist
   - Verify UI components are present and functional
   - Confirm backend endpoints respond correctly
   - Run tests to catch regressions

### After Merge

1. **Update documentation**:
   - Add entry to `CHANGELOG.md` under `# Next` section
   - Update `session.md` with merge details and decisions
   - Note any upstream changes that were accepted or rejected

2. **Run full test suite**:

   ```bash
   pnpm run typecheck
   pnpm run lint
   pnpm run test
   pnpm run test:component
   pnpm run test:integration
   ```

3. **Manual verification**:
   - Test update checker functionality
   - Verify all navigation tabs are accessible
   - Check that fork-specific endpoints work
   - Confirm UI components render correctly

4. **Document preserved features in changelog**:
   ```markdown
   ## Changes

   - Synchronized with upstream Headscale main branch (commit XXXXXX),
     incorporating latest upstream improvements while preserving all local features
   - Accepted upstream infrastructure updates: [list]
   - Accepted upstream component improvements: [list]
   - Preserved all local features: [list]
   - Maintained backward compatibility with existing local configuration and
     deployment patterns
   ```

## Code-Level Protection

### Document Markers

`docs/MERGE-PRESERVATION.md` is the source of truth for fork-owned state. Its
document markers protect the whole file, and each feature marker protects one
feature block. `pnpm run check:fork` verifies the markers, their order, and the
required path or token inside every block. A merge that removes a block fails
the check before it can be committed or built in CI.

### Inline Comments for Critical Features

Add comments to critical fork-specific code that might be vulnerable during merges:

```typescript
/**
 * FORK-SPECIFIC FEATURE: User avatar display
 *
 * This component displays the configured `user.avatar` image in the header's
 * user menu button. It is documented in:
 * - docs/SPECIFICATION.md (avatar feature spec)
 * - CHANGELOG.md v1.0.8 (avatar feature announcement)
 * - tests/component/user-avatar.test.tsx (4 tests validating behavior)
 *
 * If this is removed during upstream merge, the user menu will lose
 * the avatar display, breaking the documented functionality.
 */
```

### Directory Isolation

Isolate fork-specific features in dedicated directories with their own README files:

```
app/update-check/
├── README.md          # "DO NOT REMOVE" documentation
├── index.ts
├── types.ts
├── git-api.ts
├── useUpdateCheck.ts
├── UpdateCheckProvider.tsx
└── UpdateCheckModal.tsx
```

### CI and Pre-Commit Checks

Automated checks verify critical fork features, shared file integration points, and the preservation document's marker contract before every commit and in CI:

```bash
# Run automated fork preservation check
pnpm run check:fork
# or directly:
bash scripts/check-fork-features.sh
```

In `.github/workflows/build.yaml`:

```yaml
- name: Check fork features
  run: bash scripts/check-fork-features.sh
```

In `lefthook.yml` (pre-commit hook):

```yaml
pre-commit:
  commands:
    check_fork:
      run: bash scripts/check-fork-features.sh
```

And in Vitest unit test suite (`pnpm test:unit`):
`tests/unit/auth/merge-preservation.test.ts` asserts that all standalone fork files and integration points in `action.ts`, `page.tsx`, `context.ts`, `schema.ts`, and `auth.ts` are intact.

## Historical Merge Record

### 1.0.17 (November 2, 2026)

- **Upstream commit:** 6dd699e / 34059a3
- **Incident:** During upstream 1.0.17 merge, `app/routes/auth/login/action.ts` and `app/routes/auth/login/page.tsx` were replaced with upstream versions, dropping username/password authentication logic and login UI toggle.
- **Resolution:** Restored password authentication in `action.ts` and login UI in `page.tsx`. Added `scripts/check-fork-features.sh` (`pnpm run check:fork`), automated pre-commit hook in `lefthook.yml`, CI verification step in `.github/workflows/build.yaml`, and Vitest unit test `tests/unit/auth/merge-preservation.test.ts` to ensure the feature cannot be removed in future merges.
- **Status:** ✅ All features restored and protected with multi-layer guards

### v1.0.10 (October 19, 2026)

- **Upstream commit:** b19c638
- **Accepted:** GitHub Actions workflows, Dockerfile, build configurations,
  component improvements (action-dialog, avatar, callout, field, filter-dropdown,
  list, logo-mark, page-header, section, table), agent integration tests
- **Preserved:** CODE_GRAPH.md, navigation tabs, local UI components, design system
- **Status:** ✅ All features preserved

### v0.8.14 (October 1, 2026)

- **Upstream commit:** 1976754
- **Accepted:** Vitest test infrastructure updates, removed sequential suite API fix
- **Preserved:** All existing fork features
- **Status:** ✅ All features preserved

### v0.8.13 (September 30, 2026)

- **Upstream commit:** cde64cd
- **Accepted:** Various upstream improvements
- **Preserved:** OIDC enhancements, update checker, all fork features
- **Status:** ✅ All features preserved

## Recovery Procedures

### If a Fork Feature is Accidentally Removed

1. **Identify the last known good commit**:

   ```bash
   git log --all --oneline --graph -- app/update-check/
   ```

2. **Restore the feature**:

   ```bash
   git checkout <last-good-commit> -- app/update-check/
   git add app/update-check/
   git commit -m "restore: Recover accidentally removed update-check feature"
   ```

3. **Verify restoration**:
   - Run tests
   - Check functionality manually
   - Update documentation

4. **Document the incident**:
   - Add entry to `session.md`
   - Update `CHANGELOG.md` if released
   - Review merge process to prevent recurrence

### If Documentation is Lost

Critical documentation can be recovered from:

- Previous commits in git history
- Backup branches created before merges
- GitHub releases (for released versions)

## Best Practices

1. **Never fast-forward merge from upstream** — always create a merge commit
   to preserve the full history.

2. **Review every file change** — don't blindly accept upstream deletions.

3. **Test immediately after merge** — catch issues before they compound.

4. **Document everything** — update `CHANGELOG.md` and `session.md` after
   every merge.

5. **Use backup branches** — create safety branches before risky merges.

6. **Keep this document updated** — add new protected features as they're created.

7. **Run CI checks** — verify fork features exist before considering a merge complete.

## Checklist for Upstream Merges

- [ ] Document current state in `session.md`
- [ ] Create backup branch
- [ ] Fetch and review upstream changes
- [ ] Perform merge with conflict resolution
- [ ] Run `pnpm run check:fork` to verify all fork features, integrations, and marker blocks exist
- [ ] Verify `app/update-check/` exists
- [ ] Verify `app/components/qr-scanner/` exists
- [ ] Verify `app/server/auth/local-admin.ts` and `bcrypt-utils.ts` exist
- [ ] Verify `cmd/headplane-hash-password.ts` and CLI tools exist
- [ ] Verify `app/routes/auth/login/action.ts` and `page.tsx` have password login
- [ ] Verify `CODE_GRAPH.md` and `SCHEMA.md` exist
- [ ] Verify all navigation routes work (including `/admin/admin/users`)
- [ ] Run `pnpm run typecheck`
- [ ] Run `pnpm run lint`
- [ ] Run `pnpm run test`
- [ ] Run `pnpm run test:component`
- [ ] Run `pnpm run test:integration`
- [ ] Manual testing of fork-specific features (password login, update check, QR scan)
- [ ] Update `CHANGELOG.md` with preserved features list
- [ ] Update `session.md` with merge details
- [ ] Commit and push changes

## Questions or Issues

If you encounter problems during an upstream merge:

1. Check this document for guidance
2. Review `session.md` for recent merge history
3. Consult `CHANGELOG.md` for previous merge patterns
4. Check `app/update-check/README.md` for the canonical preservation example
5. Use `git log` to review the history of affected files

## Maintenance

This document should be reviewed and updated:

- After every upstream merge
- When adding new fork-specific features
- When changing the merge preservation strategy
- At least once per release cycle

When adding a new fork feature, add its marker block here and to the guard's
feature list in `scripts/check-fork-features.sh` and
`tests/unit/auth/merge-preservation.test.ts`.

---

**Last Updated:** November 23, 2026

<!-- HEADPLANE-FORK-DOC:END -->
