import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import React, { useEffect } from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

import { UpdateCheckProvider, useUpdateCheckContext } from "~/update-check/UpdateCheckProvider";

describe("BUG-004: UpdateCheckProvider base path prefix resolution", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("static check: UpdateCheckProvider source contains no __PREFIX__ references", () => {
    const filePath = resolve(
      import.meta.dirname,
      "../../../app/update-check/UpdateCheckProvider.tsx",
    );
    const source = readFileSync(filePath, "utf-8");
    expect(source.includes("__PREFIX__")).toBe(false);
  });

  test("resolves update-check fetch URL relative to router basename", async () => {
    let capturedUrl = "";
    global.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          current: { commit: "abc1234" },
          updateAvailable: false,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    function TestConsumer() {
      const { checkNow, setVersionInfo } = useUpdateCheckContext();

      useEffect(() => {
        setVersionInfo({ headplaneCommit: "abc1234", headscaleVersion: "v0.29.6" });
        checkNow("manual");
      }, [setVersionInfo, checkNow]);

      return React.createElement("div", null, "Test");
    }

    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: React.createElement(
            UpdateCheckProvider,
            null,
            React.createElement(TestConsumer, null),
          ),
        },
      ],
      {
        basename: "/custom-prefix",
        initialEntries: ["/custom-prefix"],
      },
    );

    render(React.createElement(RouterProvider, { router }));

    await waitFor(() => {
      expect(capturedUrl).toContain("/custom-prefix/api/update-check?check=true");
    });
  });
});
