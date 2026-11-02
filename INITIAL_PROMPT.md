# Initial Prompt — Task BUG-004-02: TechnicalInfoSection Base Path Resolution

You are assigned to resolve BUG-004-02 in `app/routes/admin/components/technical-info-section.tsx`.

## Instructions

1. Change directory to `/home/denny/Project/headscale-project/headscale/headplane-bugfix-tech-info-prefix`
2. Confirm branch is `bugfix/tech-info-prefix`
3. Read `AGENT_INSTRUCTIONS.md`
4. Replace `__PREFIX__` in `app/routes/admin/components/technical-info-section.tsx` with runtime base path via `useHref("/api/admin/server-info")`.
5. Verify with typecheck and static grep.
6. Commit the change with message: `fix(BUG-004): resolve server-info URL with useHref instead of __PREFIX__`
