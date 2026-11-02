# Initial Prompt — Task BUG-004-01: UpdateCheckProvider Base Path Resolution

You are assigned to resolve BUG-004-01 in `app/update-check/UpdateCheckProvider.tsx`.

## Instructions

1. Change directory to `/home/denny/Project/headscale-project/headscale/headplane-bugfix-update-check-prefix`
2. Confirm branch is `bugfix/update-check-prefix`
3. Read `AGENT_INSTRUCTIONS.md`
4. Replace `__PREFIX__` in `app/update-check/UpdateCheckProvider.tsx` with runtime base path via `useHref("/api/update-check")`.
5. Verify with typecheck and static grep.
6. Commit the change with message: `fix(BUG-004): resolve update-check URL with useHref instead of __PREFIX__`
