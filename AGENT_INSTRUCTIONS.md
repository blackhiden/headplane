# Agent Instructions — Task BUG-004-02: TechnicalInfoSection Base Path Resolution

## Task

Task ID: `BUG-004-02`
Associated Bug: `BUG-004` (Admin Technical Info references `__PREFIX__` which is no longer defined)
Branch: `bugfix/tech-info-prefix`
Worktree: `/home/denny/Project/headscale-project/headscale/headplane-bugfix-tech-info-prefix`

## Objective

Remove the dangling `__PREFIX__` reference from `app/routes/admin/components/technical-info-section.tsx` and resolve the server-info endpoint at runtime using `useHref("/api/admin/server-info")`.

## Verified Root Cause

Upstream replaced build-time `__PREFIX__` with runtime `server.base_path` (`CHANGELOG.md:9`). `app/routes/admin/components/technical-info-section.tsx` still referenced `__PREFIX__`, causing `ReferenceError: __PREFIX__ is not defined` and `TS2304: Cannot find name '__PREFIX__'`.

## Files to Modify

- `app/routes/admin/components/technical-info-section.tsx`

## Implementation Details

1. Import `useHref` from `react-router`.
2. Inside `TechnicalInfoSection` component, compute the URL with `useHref("/api/admin/server-info")`.
3. Use this resolved URL in `fetch(serverInfoUrl)`.
4. Ensure no references to `__PREFIX__` remain.

## Acceptance Criteria

1. `grep -rn "__PREFIX__" app/routes/admin/components/technical-info-section.tsx` returns no matches.
2. `pnpm exec tsc --noEmit` reports no errors in `technical-info-section.tsx`.
3. The server-info URL correctly resolves through the router basename.
