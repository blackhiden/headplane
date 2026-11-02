# Initial Prompt — Task BUG-004-03: Admin Users Sign-out Base Path Resolution

You are assigned to resolve BUG-004-03 in `app/routes/admin/admin/users/route.tsx`.

## Instructions

1. Change directory to `/home/denny/Project/headscale-project/headscale/headplane-bugfix-admin-users-signout`
2. Confirm branch is `bugfix/admin-users-signout`
3. Read `AGENT_INSTRUCTIONS.md`
4. Replace `__PREFIX__` in `app/routes/admin/admin/users/route.tsx` with runtime base path via `useHref("/login?s=logout")`.
5. Verify with typecheck and static grep.
6. Commit the change with message: `fix(BUG-004): resolve sign-out URL with useHref instead of __PREFIX__`
