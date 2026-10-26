import { beforeEach, describe, expect, test, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  updateConfig: vi.fn(),
}));

vi.mock("~/server/config/write", () => ({ updateConfig: mocks.updateConfig }));

import { action, loader } from "~/routes/admin/route";
import {
  appConfigContext,
  auditContext,
  authContext,
  headscaleApiKeyContext,
  headscaleContext,
  localAdminContext,
} from "~/server/context";
import type { Principal } from "~/server/web/auth";

const principal: Principal = {
  kind: "password",
  sessionId: "password-session",
  token: "local-admin-token",
  username: "admin",
};

function createServices() {
  const apiKeys = {
    create: vi.fn(),
    delete: vi.fn(),
    list: vi.fn().mockResolvedValue([
      {
        id: "service-key",
        prefix: "service-********",
        expiration: null,
        createdAt: "2026-10-08T00:00:00.000Z",
      },
    ]),
  };

  return {
    apiKeys,
    audit: { record: vi.fn().mockResolvedValue(undefined) },
    auth: {
      can: vi.fn().mockReturnValue(true),
      getHeadscaleApiKey: vi.fn().mockReturnValue("service-key-secret"),
      require: vi.fn().mockResolvedValue(principal),
    },
    config: {
      headscale: {
        api_key_path: undefined as string | undefined,
      },
    },
    headscale: { client: vi.fn().mockReturnValue({ apiKeys }) },
    localAdmin: { getUsername: vi.fn().mockReturnValue("admin") },
  };
}

function createContext(services: ReturnType<typeof createServices>) {
  return {
    get(context: unknown) {
      if (context === appConfigContext) return services.config;
      if (context === auditContext) return services.audit;
      if (context === authContext) return services.auth;
      if (context === headscaleApiKeyContext) return "service-key-secret";
      if (context === headscaleContext) return services.headscale;
      if (context === localAdminContext) {
        return { state: "enabled" as const, value: services.localAdmin };
      }
      return undefined;
    },
  };
}

function requestWithForm(form: FormData) {
  return new Request("http://headplane.test/admin", { method: "POST", body: form });
}

describe("admin API key management", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateConfig.mockResolvedValue(undefined);
  });

  test("returns only the configured service key prefix from the loader", async () => {
    const services = createServices();

    const result = await loader({
      request: new Request("http://headplane.test/admin"),
      context: createContext(services),
      params: {},
    } as never);

    expect(result).toMatchObject({
      configuredApiKeyPrefix: "service-",
      hasConfiguredApiKey: true,
      apiKeyManagedExternally: false,
      apiKeys: [{ id: "service-key" }],
    });
    expect(JSON.stringify(result)).not.toContain("service-key-secret");
  });

  test("reports apiKeyManagedExternally when api_key_path is set", async () => {
    const services = createServices();
    services.config.headscale.api_key_path = "/secrets/headscale-api-key";

    const result = await loader({
      request: new Request("http://headplane.test/admin"),
      context: createContext(services),
      params: {},
    } as never);

    expect(result).toMatchObject({
      hasConfiguredApiKey: true,
      apiKeyManagedExternally: true,
    });
  });

  test("reports hasConfiguredApiKey false when no key is configured", async () => {
    const services = createServices();
    const context = createContext(services);
    context.get = (ctx: unknown) => {
      if (ctx === headscaleApiKeyContext) return undefined;
      return createContext(services).get(ctx);
    };

    const result = await loader({
      request: new Request("http://headplane.test/admin"),
      context,
      params: {},
    } as never);

    expect(result).toMatchObject({
      hasConfiguredApiKey: false,
      configuredApiKeyPrefix: undefined,
    });
  });

  test("blocks crafted deletion requests for the configured service key", async () => {
    const services = createServices();
    const form = new FormData();
    form.set("_action", "delete-apikey");
    form.set("prefix", "service-********");

    const result = await action({
      request: requestWithForm(form),
      context: createContext(services),
      params: {},
    } as never);

    expect(result).toEqual({ success: false, error: "Cannot delete configured service key" });
    expect(services.apiKeys.delete).not.toHaveBeenCalled();
  });

  test("updates the API key in the config file", async () => {
    const services = createServices();
    const form = new FormData();
    form.set("_action", "update-apikey");
    form.set("api_key", "new-service-key-secret");

    const result = await action({
      request: requestWithForm(form),
      context: createContext(services),
      params: {},
    } as never);

    expect(result).toEqual({
      success: true,
      message: "API key updated. Restart Headplane for the change to take effect.",
    });
  });

  test("rejects empty API key", async () => {
    const services = createServices();
    const form = new FormData();
    form.set("_action", "update-apikey");
    form.set("api_key", "");

    const result = await action({
      request: requestWithForm(form),
      context: createContext(services),
      params: {},
    } as never);

    expect(result).toEqual({ success: false, error: "API key is required" });
  });

  test("rejects update when api_key_path is in use", async () => {
    const services = createServices();
    services.config.headscale.api_key_path = "/secrets/headscale-api-key";
    const form = new FormData();
    form.set("_action", "update-apikey");
    form.set("api_key", "new-service-key-secret");

    const result = await action({
      request: requestWithForm(form),
      context: createContext(services),
      params: {},
    } as never);

    expect(result).toEqual({
      success: false,
      error: "API key is managed externally via api_key_path. Update the secret file instead.",
    });
  });

  test("surfaces read-only config errors clearly", async () => {
    const services = createServices();
    mocks.updateConfig.mockRejectedValue(Object.assign(new Error("EACCES"), { code: "EACCES" }));
    const form = new FormData();
    form.set("_action", "update-apikey");
    form.set("api_key", "new-service-key-secret");

    const result = await action({
      request: requestWithForm(form),
      context: createContext(services),
      params: {},
    } as never);

    expect(result).toEqual({
      success: false,
      error: "Config file is read-only. Update the API key manually in the config file.",
    });
  });

  test("surfaces CONFIG_WRITE_FAILED errors as read-only", async () => {
    const services = createServices();
    mocks.updateConfig.mockRejectedValue(
      Object.assign(new Error("Failed to write"), { code: "CONFIG_WRITE_FAILED" }),
    );
    const form = new FormData();
    form.set("_action", "update-apikey");
    form.set("api_key", "new-service-key-secret");

    const result = await action({
      request: requestWithForm(form),
      context: createContext(services),
      params: {},
    } as never);

    expect(result).toEqual({
      success: false,
      error: "Config file is read-only. Update the API key manually in the config file.",
    });
  });
});
