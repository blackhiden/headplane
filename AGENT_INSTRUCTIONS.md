# Agent Instructions — Task BUG-004-03: Admin Users Sign-out Base Path Resolution

## Task

Task ID: `BUG-004-03`
Associated Bug: `BUG-004` (Admin Users Sign-out references `__PREFIX__` which is no longer defined)
Branch: `bugfix/admin-users-signout`
Worktree: `/home/denny/Project/headscale-project/headscale/headplane-bugfix-admin-users-signout`

## Objective

Remove the dangling `__PREFIX__` reference from `app/routes/admin/admin/users/route.tsx` and resolve the logout destination at runtime using `useHref("/login?s=logout")`.

## Verified Root Cause

Upstream replaced build-time `__PREFIX__` with runtime `server.base_path` (`CHANGELOG.md:9`). `app/routes/admin/admin/users/route.tsx` still referenced `__PREFIX__`, causing `ReferenceError: __PREFIX__ is not defined` and `TS2304: Cannot find name '__PREFIX__'`.

## Files to Modify

- `app/routes/admin/admin/users/route.tsx`

## Implementation Details

1. Import `useHref` from `react-router` in `app/routes/admin/admin/users/route.tsx`.
2. Inside the component `UserProfilePage`, compute `logoutUrl = useHref("/login?s=logout")`.
3. In the `requiresLogout` timer callback, assign `window.location.href = logoutUrl;` to preserve the hard navigation that clears client state.
4. Ensure no references to `__PREFIX__` remain.

## Acceptance Criteria

1. `grep -rn "__PREFIX__" app/routes/admin/admin/users/route.tsx` returns no matches.
2. `pnpm exec tsc --noEmit` reports no errors in `route.tsx`.
3. The sign-out redirect correctly targets the runtime base path (e.g. `/admin/login?s=logout`).
