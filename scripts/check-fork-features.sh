#!/usr/bin/env bash
# scripts/check-fork-features.sh
#
# Verifies that all fork-specific features, their critical integration points,
# and the marker contract in the merge preservation document are present and
# have not been removed during an upstream merge.
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

# 5. Check merge preservation document contract
PRESERVATION_DOC="docs/MERGE-PRESERVATION.md"
DOC_START="HEADPLANE-FORK-DOC:START"
DOC_END="HEADPLANE-FORK-DOC:END"

if [ -f "$PRESERVATION_DOC" ]; then
  doc_start_count=$(grep -Fc -- "$DOC_START" "$PRESERVATION_DOC" || true)
  doc_end_count=$(grep -Fc -- "$DOC_END" "$PRESERVATION_DOC" || true)
  doc_start_line=$(awk -v marker="$DOC_START" 'index($0, marker) { print NR; exit }' "$PRESERVATION_DOC")
  doc_end_line=$(awk -v marker="$DOC_END" 'index($0, marker) { print NR; exit }' "$PRESERVATION_DOC")

  if [ "$doc_start_count" -eq 1 ] && [ "$doc_end_count" -eq 1 ] && [ -n "$doc_start_line" ] && [ -n "$doc_end_line" ] && [ "$doc_start_line" -lt "$doc_end_line" ]; then
    pass "Merge preservation document has ordered start/end markers ($PRESERVATION_DOC)"

    protected_doc=$(awk -v start="$DOC_START" -v end="$DOC_END" '
      index($0, start) { inside = 1; next }
      index($0, end) { inside = 0 }
      inside { print }
    ' "$PRESERVATION_DOC")

    feature_entries=(
      "update-check|app/update-check/"
      "qr-scanner|app/components/qr-scanner/"
      "local-admin|app/server/auth/local-admin.ts"
      "docs|CODE_GRAPH.md"
      "navigation|/routes"
      "ui-components|empty-state.tsx"
      "design-system|Semantic color tokens"
      "backend|/api/admin/server-info"
      "agent|Fault tolerance and retry logic"
      "build-defines|__COMMIT_HASH__;__BUILD_TIME__"
    )

    for entry in "${feature_entries[@]}"; do
      feature_id="${entry%%|*}"
      feature_tokens="${entry#*|}"
      start_marker="HEADPLANE-FORK-FEATURE:START $feature_id"
      end_marker="HEADPLANE-FORK-FEATURE:END $feature_id"
      start_count=$(printf '%s\n' "$protected_doc" | grep -Fc -- "$start_marker" || true)
      end_count=$(printf '%s\n' "$protected_doc" | grep -Fc -- "$end_marker" || true)
      start_line=$(printf '%s\n' "$protected_doc" | awk -v marker="$start_marker" 'index($0, marker) { print NR; exit }')
      end_line=$(printf '%s\n' "$protected_doc" | awk -v marker="$end_marker" 'index($0, marker) { print NR; exit }')
      feature_block=$(printf '%s\n' "$protected_doc" | awk -v start="$start_marker" -v end="$end_marker" '
        index($0, start) { inside = 1; next }
        index($0, end) { inside = 0 }
        inside { print }
      ')

      tokens_ok=1
      IFS=';' read -ra required_tokens <<< "$feature_tokens"
      for token in "${required_tokens[@]}"; do
        if ! printf '%s\n' "$feature_block" | grep -Fq -- "$token"; then
          tokens_ok=0
        fi
      done

      if [ "$start_count" -eq 1 ] && [ "$end_count" -eq 1 ] && [ -n "$start_line" ] && [ -n "$end_line" ] && [ "$start_line" -lt "$end_line" ] && [ -n "$feature_block" ] && [ "$tokens_ok" -eq 1 ]; then
        pass "Merge preservation feature block is intact: $feature_id"
      else
        fail "Merge preservation feature block is missing or incomplete: $feature_id"
      fi
    done

    feature_heading_count=$(printf '%s\n' "$protected_doc" | awk '
      /^## Protected Features and Components/ { in_section = 1; next }
      /^## / { in_section = 0 }
      in_section && /^### / { count++ }
      END { print count + 0 }
    ')
    feature_marker_count=$(printf '%s\n' "$protected_doc" | grep -Fc "HEADPLANE-FORK-FEATURE:START " || true)
    if [ "$feature_heading_count" -eq "$feature_marker_count" ]; then
      pass "Every protected feature heading has a marker block"
    else
      fail "Protected feature headings ($feature_heading_count) do not match marker blocks ($feature_marker_count)"
    fi
  else
    fail "Merge preservation document markers are missing, duplicated, or out of order ($PRESERVATION_DOC)"
  fi
else
  fail "Merge preservation document missing: $PRESERVATION_DOC"
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
