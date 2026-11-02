// @vitest-environment jsdom
import "@testing-library/jest-dom/vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { render, screen } from "@testing-library/react";
import React from "react";
import { createMemoryRouter, RouterProvider, useHref } from "react-router";
import { describe, expect, test, vi, beforeEach, afterEach } from "vitest";

import AdminUsersProfileRoute from "~/routes/admin/admin/users/route";

describe("BUG-004: AdminUsersProfileRoute signout base path resolution", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  test("static check: AdminUsersProfileRoute source contains no __PREFIX__ references", () => {
    const filePath = resolve(
      import.meta.dirname,
      "../../../app/routes/admin/admin/users/route.tsx",
    );
    const source = readFileSync(filePath, "utf-8");
    expect(source.includes("__PREFIX__")).toBe(false);
  });

  test("useHref resolves logout URL relative to router basename", () => {
    let capturedUrl = "";

    function HrefProbe() {
      capturedUrl = useHref("/login?s=logout");
      return null;
    }

    const routerAdmin = createMemoryRouter(
      [{ path: "/", element: React.createElement(HrefProbe) }],
      {
        basename: "/admin",
        initialEntries: ["/admin"],
      },
    );
    render(React.createElement(RouterProvider, { router: routerAdmin }));
    expect(capturedUrl).toBe("/admin/login?s=logout");

    const routerCustom = createMemoryRouter(
      [{ path: "/", element: React.createElement(HrefProbe) }],
      {
        basename: "/console",
        initialEntries: ["/console"],
      },
    );
    render(React.createElement(RouterProvider, { router: routerCustom }));
    expect(capturedUrl).toBe("/console/login?s=logout");
  });

  test("renders AdminUsersProfileRoute without ReferenceError under custom basename", () => {
    const loaderData = {
      profile: {
        username: "admin",
        name: "Administrator",
        avatar: "",
      },
    };

    const router = createMemoryRouter(
      [
        {
          path: "/",
          element: React.createElement(AdminUsersProfileRoute, {
            loaderData,
            params: {},
            matches: [],
          } as any),
        },
      ],
      {
        basename: "/console",
        initialEntries: ["/console"],
      },
    );

    render(React.createElement(RouterProvider, { router }));
    expect(screen.getByText("User Profile")).toBeInTheDocument();
  });
});
