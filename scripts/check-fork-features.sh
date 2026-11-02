#!/usr/bin/env bash
# scripts/check-fork-features.sh
#
# Verifies that all fork-specific features and their critical integration points
# are present and have not been removed during an upstream merge.
#
# Referenced in docs/MERGE-PRESERVATION.md and executed during pre-commit & CI.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

FAILED=0

fail() {
  echo "❌ ERROR: $1" >&2
  FAILED=1
}

pass() {
  echo "✅ $1"
}

echo "🔍 Checking fork-specific features and merge preservation..."

# 1. Check fork-specific directories
for dir in "app/update-check" "app/components/qr-scanner" "docs"; do
  if [ -d "$dir" ]; then
    pass "Directory exists: $dir"
  else
    fail "Directory missing: $dir"
  fi
done

# 2. Check standalone fork-specific files
for file in \
  "app/server/auth/local-admin.ts" \
  "app/server/auth/bcrypt-utils.ts" \
  "cmd/headplane-hash-password.ts" \
  "cmd/headplane-reset-local-admin-password.ts" \
  "cmd/headplane-migrate-local-admin.ts" \
  "app/routes/admin/admin/users/route.tsx" \
  "CODE_GRAPH.md" \
  "SCHEMA.md" \
  "docs/MERGE-PRESERVATION.md"; do
  if [ -f "$file" ]; then
    pass "File exists: $file"
  else
    fail "File missing: $file"
  fi
done

# 3. Check Local Administrator integration in shared files
# 3a. Login Action (app/routes/auth/login/action.ts)
LOGIN_ACTION="app/routes/auth/login/action.ts"
if grep -q "localAdminContext" "$LOGIN_ACTION" && grep -q "createPasswordSession" "$LOGIN_ACTION"; then
  pass "Login action contains Local Admin password authentication ($LOGIN_ACTION)"
else
  fail "Login action is missing Local Admin password authentication logic ($LOGIN_ACTION)"
fi

# 3b. Login Page (app/routes/auth/login/page.tsx)
LOGIN_PAGE="app/routes/auth/login/page.tsx"
if grep -q "loginMethod" "$LOGIN_PAGE" && grep -q "name=\"password\"" "$LOGIN_PAGE" && grep -q "isHydrated" "$LOGIN_PAGE"; then
  pass "Login page contains Local Admin password UI ($LOGIN_PAGE)"
else
  fail "Login page is missing Local Admin password UI ($LOGIN_PAGE)"
fi

# 3c. Context Container (app/server/context.ts)
CONTEXT="app/server/context.ts"
if grep -q "localAdminContext" "$CONTEXT" && grep -q "buildLocalAdmin" "$CONTEXT" && grep -q "path: config.server.base_path" "$CONTEXT"; then
  pass "Context container exposes localAdminContext and base_path cookie scoping ($CONTEXT)"
else
  fail "Context container is missing localAdminContext or base_path cookie scoping ($CONTEXT)"
fi

# 3d. Database Schema (app/server/db/schema.ts)
DB_SCHEMA="app/server/db/schema.ts"
if grep -q "authSessions" "$DB_SCHEMA" && grep -q "'password'" "$DB_SCHEMA"; then
  pass "Database schema supports password sessions ($DB_SCHEMA)"
else
  fail "Database schema is missing password session support ($DB_SCHEMA)"
fi

# 3e. Auth Service (app/server/web/auth.ts)
AUTH_SERVICE="app/server/web/auth.ts"
if grep -q "createPasswordSession" "$AUTH_SERVICE" && grep -q "invalidatePasswordSessions" "$AUTH_SERVICE"; then
  pass "Auth service provides password session operations ($AUTH_SERVICE)"
else
  fail "Auth service is missing password session operations ($AUTH_SERVICE)"
fi

# 4. Check Build Defines (vite.config.ts)
VITE_CONFIG="vite.config.ts"
if grep -q "__COMMIT_HASH__" "$VITE_CONFIG" && grep -q "__BUILD_TIME__" "$VITE_CONFIG"; then
  pass "Vite config contains fork build defines ($VITE_CONFIG)"
else
  fail "Vite config is missing __COMMIT_HASH__ or __BUILD_TIME__ ($VITE_CONFIG)"
fi

if [ "$FAILED" -eq 1 ]; then
  echo ""
  echo "🚨 Fork feature preservation check FAILED!" >&2
  echo "   Refer to docs/MERGE-PRESERVATION.md for restoration instructions." >&2
  exit 1
fi

echo ""
echo "🎉 All fork-specific features and integration points verified successfully."
exit 0
