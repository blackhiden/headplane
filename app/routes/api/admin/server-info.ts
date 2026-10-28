import { existsSync } from "node:fs";
import { arch, cpus, platform, release, totalmem, type as osType } from "node:os";

import { data } from "react-router";

import { appConfigContext, authContext, headscaleContext } from "~/server/context";
import { isAdmin, createUnauthorizedResponse } from "~/utils/auth";
import log from "~/utils/log";

import type { Route } from "./+types/server-info";

interface HeadplaneServerInfo {
  version: string;
  nodeVersion: string;
  os: string;
  osRelease: string;
  platform: string;
  architecture: string;
  cpuCount: number;
  totalMemory: number;
  deploymentMode: string;
}

interface HeadscaleServerInfo {
  version?: string;
  buildTime?: string;
  commit?: string;
  goVersion?: string;
  platform?: string;
  architecture?: string;
  cpuCount?: number;
  totalMemory?: number;
  totalStorage?: number;
  deploymentMode?: string;
  dockerVersion?: string;
  publicIp?: string;
}

interface ServerInfoResponse {
  headplane: HeadplaneServerInfo;
  headscale: HeadscaleServerInfo | null;
  error?: string;
}

/**
 * GET /api/admin/server-info
 * Returns merged technical info for both Headplane and Headscale servers
 */
export async function loader({ request, context }: Route.LoaderArgs) {
  const auth = context.get(authContext);
  const headscale = context.get(headscaleContext);
  const config = context.get(appConfigContext);

  // Require authentication
  const principal = await auth.require(request);

  // Require admin privileges
  if (!isAdmin(auth, principal)) {
    throw createUnauthorizedResponse(
      principal,
      "You do not have permission to access server information. Only administrators can access this resource.",
    );
  }

  // Gather Headplane server info
  const headplaneInfo: HeadplaneServerInfo = {
    version:
      typeof __VERSION__ !== "undefined"
        ? __VERSION__
        : process.env.HEADPLANE_VERSION || "development",
    nodeVersion: process.version,
    os: osType(),
    osRelease: release(),
    platform: platform(),
    architecture: arch(),
    cpuCount: cpus().length,
    totalMemory: totalmem(),
    deploymentMode: determineDeploymentMode(config),
  };

  // Try to fetch Headscale server info
  let headscaleInfo: HeadscaleServerInfo | null = null;
  let error: string | undefined;

  let apiKey: string | undefined;
  try {
    apiKey = auth.getHeadscaleApiKey(principal);
  } catch (err) {
    log.warn("server-info", "No Headscale API key available: %s", String(err));
    error = "No Headscale API key configured";
  }

  if (apiKey) {
    try {
      const hsData = (await headscale.client(apiKey).serverInfo.get()) as any;
      headscaleInfo = {
        version: hsData.version,
        buildTime: hsData.buildTime,
        commit: hsData.commit,
        goVersion: hsData.go?.version ?? hsData.goVersion,
        platform: hsData.os ?? hsData.platform,
        architecture: hsData.arch ?? hsData.architecture,
        cpuCount: hsData.cpu?.count,
        totalMemory: hsData.memory?.total,
        totalStorage: hsData.storage?.total,
        deploymentMode: hsData.deployment?.mode,
        dockerVersion: hsData.deployment?.dockerVersion,
        publicIp: hsData.publicIp,
      };
    } catch (err) {
      log.warn("server-info", "Failed to fetch Headscale server info: %s", String(err));
      error = "Headscale server info unavailable";
    }
  }

  const response: ServerInfoResponse = {
    headplane: headplaneInfo,
    headscale: headscaleInfo,
  };

  if (error) {
    response.error = error;
  }

  return data(response, { status: 200 });
}

function determineDeploymentMode(config: any): string {
  // Check if Docker integration is enabled
  if (config.integration?.docker?.enabled || config.headscale?.integration?.docker?.enabled) {
    return "docker";
  }

  // Check if proc integration is enabled
  if (config.integration?.proc?.enabled || config.headscale?.integration?.proc?.enabled) {
    return "native";
  }

  // Check if Kubernetes integration is enabled
  if (
    config.integration?.kubernetes?.enabled ||
    config.headscale?.integration?.kubernetes?.enabled
  ) {
    return "kubernetes";
  }

  // Check filesystem indicators
  try {
    if (existsSync("/.dockerenv") || existsSync("/run/.containerenv")) {
      return "docker";
    }
  } catch {}

  return "native";
}
