import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { startHeadscale } from "../integration/setup/start-headscale";

const E2E_DIR = join(process.cwd(), "tests", "e2e");
const STATE_FILE = join(E2E_DIR, ".e2e-state.json");
const CONFIG_FILE = join(E2E_DIR, ".headplane-e2e.yaml");
const HS_CONFIG_FILE = join(E2E_DIR, ".headscale-e2e.yaml");

async function hasPreparedEnvironment(): Promise<boolean> {
  try {
    await Promise.all([access(STATE_FILE), access(CONFIG_FILE), access(HS_CONFIG_FILE)]);

    const state = JSON.parse(await readFile(STATE_FILE, "utf-8")) as { apiUrl?: unknown };
    if (typeof state.apiUrl !== "string") {
      return false;
    }

    const response = await fetch(new URL("/health", state.apiUrl), {
      signal: AbortSignal.timeout(5_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Global setup for the Playwright e2e suite.
 *
 * Reuses a Docker-based environment prepared by `scripts/setup-e2e.ts` when
 * its state and configuration files exist. This is the CI path and avoids
 * Testcontainers' independent Headscale bootstrap.
 *
 * Without prepared state (the normal local path), starts a real Headscale
 * container via testcontainers, creates an API key, and writes a Headplane
 * config, a minimal Headscale config, and a state file. The returned teardown
 * stops that local Testcontainer after the run.
 */
export default async function globalSetup() {
  if (await hasPreparedEnvironment()) {
    console.log("Using E2E environment prepared by scripts/setup-e2e.ts");
    return;
  }

  const env = await startHeadscale("0.29.1");

  await mkdir(E2E_DIR, { recursive: true });

  // A minimal Headscale config so Headplane can read DNS settings.
  const hsConfig = [
    "dns:",
    "  magic_dns: true",
    "  base_domain: example.com",
    "  nameservers:",
    "    global:",
    "      - 1.1.1.1",
    "  search_domains: []",
    "  extra_records: []",
    "",
  ].join("\n");
  await writeFile(HS_CONFIG_FILE, hsConfig);

  const hpConfig = [
    "server:",
    '  host: "127.0.0.1"',
    "  port: 3100",
    '  base_url: "http://127.0.0.1:3100"',
    `  data_path: "${E2E_DIR}/data"`,
    '  cookie_secret: "0123456789abcdef0123456789abcdef"',
    "  cookie_secure: false",
    "headscale:",
    `  url: "${env.apiUrl}"`,
    `  config_path: "${HS_CONFIG_FILE}"`,
    "",
  ].join("\n");
  await writeFile(CONFIG_FILE, hpConfig);

  await writeFile(STATE_FILE, JSON.stringify({ apiUrl: env.apiUrl, apiKey: env.apiKey }));

  return async () => {
    await env.container.stop({ remove: true, removeVolumes: true });
  };
}
