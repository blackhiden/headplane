import { render } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, test, vi, beforeEach } from "vitest";

// Mock react-router's useFetcher so ActionDialog can render without a router.
const mockFetcher = {
  data: undefined as { ok?: boolean; errors?: Record<string, string> } | undefined,
  state: "idle",
  submit: vi.fn(),
  Form: ({ children }: { children: ReactNode }) => <form>{children}</form>,
};

vi.mock("react-router", async () => {
  const actual = await vi.importActual("react-router");
  return {
    ...actual,
    useFetcher: () => mockFetcher,
  };
});

import ActionDialog from "~/components/action-dialog";

describe("ActionDialog", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetcher.data = undefined;
    mockFetcher.state = "idle";
  });

  test("renders a non-destructive dialog without throwing", () => {
    expect(() =>
      render(<ActionDialog intent="register" submitLabel="Register" title="Register a machine" />),
    ).not.toThrow();
  });

  test("renders a destructive dialog without throwing", () => {
    // Regression test: `AlertDialog` was the namespace object of all
    // alert-dialog parts, which is not a valid JSX element type and threw
    // React error #130 ("Element type is invalid ... but got: object").
    expect(() =>
      render(
        <ActionDialog intent="delete" isDestructive submitLabel="Remove" title="Remove machine?" />,
      ),
    ).not.toThrow();
  });
});
