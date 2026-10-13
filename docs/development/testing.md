---
title: Testing
description: How Headplane is tested — unit, integration, e2e, accessibility, and performance.
outline: [2, 3]
---

# Testing

Headplane is tested at four levels. All commands run from the repository root
with `pnpm`.

## Unit tests

Service logic, config loading, and utilities are tested with Vitest:

```bash
pnpm run test:unit
```

Unit tests live in `tests/unit/` and follow the patterns in
[Architecture](./architecture#testing): create a fresh service instance per
test with the exact config you need — no mocking frameworks required.

## Integration tests

API flows against real Headscale containers (via `testcontainers`) live in
`tests/integration/`:

```bash
pnpm run test:integration
```

These start Headscale and Tailscale containers for a matrix of supported
versions and exercise the server-side API client end-to-end. They require
Docker.

## End-to-end tests (Playwright)

Browser-level tests for the critical flows — login, machine management, ACL
editing, and DNS settings — live in `tests/e2e/`:

```bash
pnpm run test:e2e
```

The suite:

1. In CI, runs `scripts/setup-e2e.ts` before Playwright. The script starts the
   Docker Headscale environment, creates an API key, and writes the Headplane,
   Headscale, and E2E state files; the workflow prints them with secrets redacted.
2. Boots the dev server (`pnpm dev:app:e2e`) via Playwright's `webServer`, using
   Vite's `/@vite/client` endpoint as its readiness probe. This confirms Vite is
   listening without initializing Headplane before test setup is ready.
3. Reuses the prepared Docker environment in `tests/e2e/global-setup.ts`. When
   no prepared state exists, such as a normal local run, global setup instead
   starts a real Headscale Testcontainer and writes the same runtime files.
4. Drives the UI in Chromium. Login-method and password-visibility controls are
   disabled until React hydrates, so Playwright waits for the API Key tab or Show
   button to become enabled before clicking it.

Install the browser once with `pnpm run test:e2e:install`. The suite requires
Docker and runs with a single worker (the container and server are shared).

### Manual E2E Environment Setup and Verification

For local debugging or when troubleshooting the E2E environment, you can manually
run the setup script and verify the test infrastructure. This is normally handled
automatically by the test runner and CI, but running it manually is useful for
inspecting the generated configuration files or diagnosing failures.

Prerequisites: Docker, Node.js, `jq` (for JSON parsing).

```bash
# Clean up any existing test artifacts
rm -rf tests/e2e/.e2e-state.json tests/e2e/.headplane-e2e.yaml tests/e2e/.headscale-e2e.yaml
docker rm -f headscale-e2e 2>/dev/null || true

# Run the setup script
node --import tsx scripts/setup-e2e.ts

# Verify outputs
echo "=== Checking generated files ==="
ls -lh tests/e2e/.e2e-state.json tests/e2e/.headplane-e2e.yaml tests/e2e/.headscale-e2e.yaml

echo ""
echo "=== API Key (first 20 chars) ==="
cat tests/e2e/.e2e-state.json | jq -r '.apiKey' | cut -c1-20

echo ""
echo "=== Container status ==="
docker ps | grep headscale-e2e

echo ""
echo "=== Headscale health check ==="
curl -f http://localhost:8080/health && echo "✓ Healthy" || echo "✗ Failed"
```

The setup script creates:

- `tests/e2e/.e2e-state.json` — API key and connection details
- `tests/e2e/.headplane-e2e.yaml` — Headplane test configuration
- `tests/e2e/.headscale-e2e.yaml` — Headscale test configuration
- `headscale-e2e` Docker container running on port 8080

## Accessibility tests (axe-core)

`tests/e2e/a11y.spec.ts` scans the main routes with axe-core and fails on any
critical or serious violation:

```bash
pnpm run test:a11y
```

The a11y tests are part of the full e2e run and are wired into CI.

## Performance

- **Bundle-size analysis** — `pnpm run analyze:bundle` reads the Vite build
  output and fails when any JS chunk exceeds 1 MB (gzipped) or the total
  exceeds 2.5 MB. The per-chunk budget is generous because the lazy SSH route
  chunk includes the `restty` terminal emulator; tighten both after capturing a
  baseline. Budgets are overridable via `HEADPLANE_BUNDLE_CHUNK_BUDGET` and
  `HEADPLANE_BUNDLE_TOTAL_BUDGET`.
- **Lighthouse CI** — `pnpm run lighthouse:ci` measures the login page against
  performance, accessibility, best-practices, and SEO budgets
  (`lighthouserc.cjs`). The budgets are initial values; tighten them after
  capturing a baseline.
- **WASM SSH payload** — `hp_ssh.wasm` is excluded from the client bundle and
  fetched at runtime only when the SSH page is opened.

## CI

The `build.yaml` workflow runs the unit, integration, and e2e suites, the
bundle-size analysis, and Lighthouse CI on every push and pull request. The
`nix` job runs `nix flake check`.
