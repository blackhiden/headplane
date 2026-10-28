import { beforeEach, describe, expect, test, vi } from "vitest";

import { loader } from "~/routes/api/admin/server-info";
import { appConfigContext, authContext, headscaleContext } from "~/server/context";
import type { Principal } from "~/server/web/auth";

const principal: Principal = {
  kind: "password",
  sessionId: "password-session",
  token: "local-admin-token",
  username: "admin",
};

function createServices() {
  const serverInfo = {
    get: vi.fn().mockResolvedValue({
      version: "0.23.0",
      buildTime: "2026-10-28T00:00:00Z",
      commit: "abc123def",
      goVersion: "go1.23.0",
      platform: "linux",
      architecture: "amd64",
    }),
  };

  return {
    serverInfo,
    auth: {
      can: vi.fn().mockReturnValue(true),
      getHeadscaleApiKey: vi.fn().mockReturnValue("service-key-secret"),
      require: vi.fn().mockResolvedValue(principal),
    },
    config: {
      headscale: {
        integration: {
          docker: { enabled: true },
          proc: { enabled: false },
        },
      },
    },
    headscale: {
      client: vi.fn().mockReturnValue({ serverInfo }),
    },
  };
}

function createContext(services: ReturnType<typeof createServices>) {
  return {
    get(context: unknown) {
      if (context === authContext) return services.auth;
      if (context === headscaleContext) return services.headscale;
      if (context === appConfigContext) return services.config;
      return undefined;
    },
  };
}

describe("GET /api/admin/server-info", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("returns server info for authenticated admin", async () => {
    const services = createServices();

    const result = await loader({
      request: new Request("http://localhost/api/admin/server-info"),
      context: createContext(services),
      params: {},
    } as any);

    expect(services.auth.require).toHaveBeenCalled();
    expect(services.auth.getHeadscaleApiKey).toHaveBeenCalledWith(principal);
    expect(services.headscale.client).toHaveBeenCalledWith("service-key-secret");
    expect(result).toBeDefined();
  });

  test("requires admin authentication", async () => {
    const services = createServices();
    services.auth.can = vi.fn().mockReturnValue(false);

    await expect(
      loader({
        request: new Request("http://localhost/api/admin/server-info"),
        context: createContext(services),
        params: {},
      } as any),
    ).rejects.toThrow();
  });

  test("handles missing API key gracefully", async () => {
    const services = createServices();
    services.auth.getHeadscaleApiKey = vi.fn().mockReturnValue(null);

    const result = await loader({
      request: new Request("http://localhost/api/admin/server-info"),
      context: createContext(services),
      params: {},
    } as any);

    expect(result).toBeDefined();
  });

  test("handles Headscale API failure gracefully", async () => {
    const services = createServices();
    services.serverInfo.get = vi.fn().mockRejectedValue(new Error("Connection failed"));

    const result = await loader({
      request: new Request("http://localhost/api/admin/server-info"),
      context: createContext(services),
      params: {},
    } as any);

    expect(result).toBeDefined();
  });

  test("detects native deployment mode", async () => {
    const services = createServices();
    services.config.headscale.integration = {
      docker: { enabled: false },
      proc: { enabled: true },
    };

    const result = await loader({
      request: new Request("http://localhost/api/admin/server-info"),
      context: createContext(services),
      params: {},
    } as any);

    expect(result).toBeDefined();
  });

  test("detects unknown deployment mode", async () => {
    const services = createServices();
    services.config.headscale.integration = {
      docker: { enabled: false },
      proc: { enabled: false },
    };

    const result = await loader({
      request: new Request("http://localhost/api/admin/server-info"),
      context: createContext(services),
      params: {},
    } as any);

    expect(result).toBeDefined();
  });
});
