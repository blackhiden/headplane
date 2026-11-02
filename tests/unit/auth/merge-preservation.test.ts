import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * Regression & merge preservation test.
 *
 * Ensures that fork-specific features (especially Local Administrator Authentication)
 * are never silently removed during upstream merges.
 * Documented in docs/MERGE-PRESERVATION.md.
 */
describe("Merge Preservation: Local Administrator Authentication", () => {
  const rootDir = resolve(__dirname, "../../..");

  it("preserves all standalone local admin and fork files", () => {
    const requiredFiles = [
      "app/server/auth/local-admin.ts",
      "app/server/auth/bcrypt-utils.ts",
      "cmd/headplane-hash-password.ts",
      "cmd/headplane-reset-local-admin-password.ts",
      "cmd/headplane-migrate-local-admin.ts",
      "app/routes/admin/admin/users/route.tsx",
      "CODE_GRAPH.md",
      "SCHEMA.md",
      "docs/MERGE-PRESERVATION.md",
    ];

    for (const file of requiredFiles) {
      expect(existsSync(resolve(rootDir, file)), `Expected file to exist: ${file}`).toBe(true);
    }
  });

  it("preserves password authentication logic in login action", () => {
    const actionPath = resolve(rootDir, "app/routes/auth/login/action.ts");
    const content = readFileSync(actionPath, "utf-8");

    expect(content).toContain("localAdminContext");
    expect(content).toContain("createPasswordSession");
    expect(content).toContain("local-admin-token");
    expect(content).toContain("Username cannot be empty");
    expect(content).toContain("Password cannot be empty");
  });

  it("preserves password authentication UI in login page", () => {
    const pagePath = resolve(rootDir, "app/routes/auth/login/page.tsx");
    const content = readFileSync(pagePath, "utf-8");

    expect(content).toContain("loginMethod");
    expect(content).toContain("isHydrated");
    expect(content).toContain('name="username"');
    expect(content).toContain('name="password"');
    expect(content).toContain('placeholder="Username"');
    expect(content).toContain('placeholder="Password"');
    expect(content).toContain('placeholder="API Key"');
  });

  it("preserves localAdminContext in server context container", () => {
    const contextPath = resolve(rootDir, "app/server/context.ts");
    const content = readFileSync(contextPath, "utf-8");

    expect(content).toContain("localAdminContext");
    expect(content).toContain("buildLocalAdmin");
    expect(content).toContain("createLocalAdminService");
    expect(content).toContain("path: config.server.base_path");
    expect(content).toContain("basePath: config.server.base_path");
  });

  it("preserves password session support in SQLite schema and auth service", () => {
    const schemaPath = resolve(rootDir, "app/server/db/schema.ts");
    const schemaContent = readFileSync(schemaPath, "utf-8");
    expect(schemaContent).toContain("authSessions");
    expect(schemaContent).toContain("'password'");

    const authPath = resolve(rootDir, "app/server/web/auth.ts");
    const authContent = readFileSync(authPath, "utf-8");
    expect(authContent).toContain("createPasswordSession");
    expect(authContent).toContain("invalidatePasswordSessions");
  });
});
