import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// @vitest-environment jsdom
import { render, waitFor } from "@testing-library/react";
import React from "react";
import { createMemoryRouter, RouterProvider } from "react-router";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

import TechnicalInfoSection from "~/routes/admin/components/technical-info-section";

describe("BUG-004: TechnicalInfoSection base path prefix resolution", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("static check: TechnicalInfoSection source contains no __PREFIX__ references", () => {
    const filePath = resolve(
      import.meta.dirname,
      "../../../app/routes/admin/components/technical-info-section.tsx",
    );
    const source = readFileSync(filePath, "utf-8");
    expect(source.includes("__PREFIX__")).toBe(false);
  });

  test("resolves server-info fetch URL relative to router basename", async () => {
    let capturedUrl = "";
    global.fetch = vi.fn().mockImplementation(async (url: string | URL | Request) => {
      capturedUrl = String(url);
      return new Response(
        JSON.stringify({
          headplane: {
            version: "1.0.17",
            nodeVersion: "v24.2.0",
            os: "Linux",
            osRelease: "6.0",
            platform: "linux",
            architecture: "x64",
            cpuCount: 4,
            totalMemory: 8589934592,
            deploymentMode: "native",
          },
          headscale: null,
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    });

    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: React.createElement(TechnicalInfoSection, null),
        },
      ],
      {
        basename: "/custom-prefix",
        initialEntries: ["/custom-prefix"],
      },
    );

    render(React.createElement(RouterProvider, { router }));

    await waitFor(() => {
      expect(capturedUrl).toBe("/custom-prefix/api/admin/server-info");
    });
  });
});
