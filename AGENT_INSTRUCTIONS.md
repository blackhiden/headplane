# Agent Instructions — Task BUG-004-01: UpdateCheckProvider Base Path Resolution

## Task

Task ID: `BUG-004-01`
Associated Bug: `BUG-004` (Update Check references `__PREFIX__` which is no longer defined)
Branch: `bugfix/update-check-prefix`
Worktree: `/home/denny/Project/headscale-project/headscale/headplane-bugfix-update-check-prefix`

## Objective

Remove the dangling `__PREFIX__` reference from `app/update-check/UpdateCheckProvider.tsx` and resolve the update-check endpoint at runtime using `useHref("/api/update-check")`.

## Verified Root Cause

Upstream replaced build-time `__PREFIX__` with runtime `server.base_path` (`CHANGELOG.md:9`). `app/update-check/UpdateCheckProvider.tsx` still referenced `__PREFIX__`, causing `ReferenceError: __PREFIX__ is not defined` and `TS2304: Cannot find name '__PREFIX__'`.

## Files to Modify

- `app/update-check/UpdateCheckProvider.tsx`

## Implementation Details

1. Import `useHref` from `react-router`.
2. Inside `UpdateCheckProvider` component, compute the check endpoint using `useHref("/api/update-check")`.
3. Pass the resolved check endpoint into `performCheck(..., checkEndpoint)` and then `fetchHeadscaleUpdate(checkEndpoint)`.
4. Inside `fetchHeadscaleUpdate(checkEndpoint: string)`, build the URL as `${checkEndpoint}?check=true`.
5. Ensure no references to `__PREFIX__` remain in `app/update-check/UpdateCheckProvider.tsx`.

## Acceptance Criteria

1. `grep -rn "__PREFIX__" app/update-check/` returns no matches.
2. `pnpm exec tsc --noEmit` reports no errors in `app/update-check/UpdateCheckProvider.tsx`.
3. The check URL correctly uses the router basename (e.g. `/admin/api/update-check?check=true`).
