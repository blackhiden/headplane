import { describe, expect, test } from "vitest";

import { loader } from "~/root";
import { headscaleContext } from "~/server/context";

describe("BUG-003: root loader version metadata", () => {
  test("defines __COMMIT_HASH__ and __BUILD_TIME__ globals and loader does not throw ReferenceError", async () => {
    // Assert globals are defined
    expect(typeof __COMMIT_HASH__).toBe("string");
    expect(typeof __BUILD_TIME__).toBe("string");
    expect(__COMMIT_HASH__).not.toBe("");
    expect(__BUILD_TIME__).not.toBe("");

    // Test calling the root loader
    const mockRequest = new Request("http://localhost/admin/machines");
    const mockContext = {
      get: (ctx: unknown) => {
        if (ctx === headscaleContext) {
          return {
            version: {
              raw: "0.29.2",
            },
          };
        }
        return undefined;
      },
    };

    const result = await loader({
      request: mockRequest,
      context: mockContext,
      params: {},
    } as any);

    expect(result).toBeDefined();
    expect(result.versionInfo).toBeDefined();
    expect(result.versionInfo.headplaneCommit).toBe("test");
    expect(result.versionInfo.headplaneBuildTime).toBe("test");
    expect(result.versionInfo.headscaleVersion).toBe("0.29.2");
  });
});
