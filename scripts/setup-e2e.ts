#!/usr/bin/env node
/**
 * Setup script for E2E tests in CI environments.
 *
 * This script:
 * 1. Starts a Headscale container using Docker
 * 2. Creates an API key
 * 3. Writes the .e2e-state.json file
 * 4. Writes the Headplane and Headscale config files
 *
 * In CI, this runs before the Playwright tests to ensure the test environment
 * is ready. Locally, Playwright's global-setup.ts handles this via testcontainers.
 */

import { execSync } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

const E2E_DIR = join(process.cwd(), "tests", "e2e");
const STATE_FILE = join(E2E_DIR, ".e2e-state.json");
const CONFIG_FILE = join(E2E_DIR, ".headplane-e2e.yaml");
const HS_CONFIG_FILE = join(E2E_DIR, ".headscale-e2e.yaml");

const HEADSCALE_VERSION = "latest";
const CONTAINER_NAME = "headscale-e2e";
const HEADSCALE_PORT = 8080;

async function main() {
  console.log("Setting up E2E test environment...");

  // Ensure the e2e directory exists
  await mkdir(E2E_DIR, { recursive: true });

  // Stop and remove any existing container
  try {
    execSync(`docker rm -f ${CONTAINER_NAME}`, { stdio: "ignore" });
  } catch {
    // Container doesn't exist, that's fine
  }

  // Create a minimal Headscale config
  const headscaleConfig = `
server_url: http://127.0.0.1:${HEADSCALE_PORT}
listen_addr: 0.0.0.0:${HEADSCALE_PORT}
metrics_listen_addr: 0.0.0.0:9090
prefixes:
  v4: 100.64.0.0/10
  allocation: sequential
derp:
  server:
    enabled: true
    region_id: 999
    region_code: "blackhiden"
    region_name: "Blackhiden DERP"
    stun_listen_addr: "0.0.0.0:63478"
    private_key_path: /var/lib/headscale/derp_server_private.key
    automatically_add_embedded_derp_region: true
    auto_update_enabled: true
    update_frequency: 3h
grpc_listen_addr: 0.0.0.0:50443

private_key_path: /tmp/private.key
noise:
  private_key_path: /tmp/noise_private.key

ip_prefixes:
  - fd7a:115c:a1e0::/48
  - 100.64.0.0/10

dns:
  magic_dns: true
  base_domain: example.com
  nameservers:
    global:
      - 1.1.1.1
  search_domains: []
  extra_records: []

database:
  type: sqlite
  sqlite:
    path: /tmp/headscale.db
`;

  // Write Headscale config to a temp file
  const tempConfigPath = join(E2E_DIR, ".headscale-container-config.yaml");
  await writeFile(tempConfigPath, headscaleConfig);

  console.log(`Starting Headscale ${HEADSCALE_VERSION} container...`);

  // Start the Headscale container
  execSync(
    `docker run -d \
      --name ${CONTAINER_NAME} \
      --network host \
      -p ${HEADSCALE_PORT}:${HEADSCALE_PORT} \
      -v "${tempConfigPath}:/etc/headscale/config.yaml" \
      ghcr.io/blackhiden/headscale:${HEADSCALE_VERSION} serve`,
    { stdio: "inherit" },
  );

  // Wait for Headscale to be healthy
  console.log("Waiting for Headscale to be ready...");
  let retries = 30;
  let isReady = false;

  while (retries > 0 && !isReady) {
    try {
      execSync(`curl -f http://localhost:${HEADSCALE_PORT}/health`, {
        stdio: "ignore",
        timeout: 2000,
      });
      isReady = true;
      console.log("Headscale is ready!");
    } catch {
      retries--;
      if (retries === 0) {
        throw new Error("Headscale failed to start within 30 seconds");
      }
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  // Create an API key
  console.log("Creating API key...");
  const apiKeyOutput = execSync(`docker exec ${CONTAINER_NAME} headscale apikeys create -o json`, {
    encoding: "utf-8",
  });

  const apiKey = JSON.parse(apiKeyOutput.trim());
  console.log(`API key created: ${apiKey.substring(0, 20)}...`);

  // Write the state file
  const apiUrl = `http://localhost:${HEADSCALE_PORT}`;
  await writeFile(STATE_FILE, JSON.stringify({ apiUrl, apiKey }, null, 2));
  console.log(`State file written to ${STATE_FILE}`);

  // Write the Headplane config
  const hpConfig = `server:
  host: "127.0.0.1"
  port: 3100
  base_url: "http://127.0.0.1:3100"
  data_path: "${E2E_DIR}/data"
  cookie_secret: "0123456789abcdef0123456789abcdef"
  cookie_secure: false
headscale:
  url: "${apiUrl}"
  config_path: "${HS_CONFIG_FILE}"
`;
  await writeFile(CONFIG_FILE, hpConfig);
  console.log(`Headplane config written to ${CONFIG_FILE}`);

  // Write the minimal Headscale config for DNS reading
  const hsConfig = `dns:
  magic_dns: true
  base_domain: example.com
  nameservers:
    global:
      - 1.1.1.1
  search_domains: []
  extra_records: []
`;
  await writeFile(HS_CONFIG_FILE, hsConfig);
  console.log(`Headscale config written to ${HS_CONFIG_FILE}`);

  console.log("\nE2E environment setup complete!");
  console.log(`Container: ${CONTAINER_NAME}`);
  console.log(`API URL: ${apiUrl}`);
  console.log("\nTo stop the container after tests:");
  console.log(`  docker rm -f ${CONTAINER_NAME}`);
}

main().catch((error) => {
  console.error("Failed to setup E2E environment:", error);
  process.exit(1);
});
