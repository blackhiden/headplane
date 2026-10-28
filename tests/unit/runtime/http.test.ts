import type { IncomingMessage } from "node:http";

import { describe, expect, test, vi } from "vitest";

import { alignOriginScheme, composeListener } from "../../../runtime/http";

function request(headers: Record<string, string>, encrypted = false) {
  return { headers, socket: encrypted ? { encrypted } : {} } as unknown as IncomingMessage;
}

describe("alignOriginScheme", () => {
  test("rewrites https origin to http behind a TLS-terminating proxy", () => {
    const req = request({ host: "hp.example.com", origin: "https://hp.example.com" });
    alignOriginScheme(req);
    expect(req.headers.origin).toBe("http://hp.example.com");
  });

  test("rewrites http origin to https on a TLS socket", () => {
    const req = request(
      { host: "hp.example.com:3000", origin: "http://hp.example.com:3000" },
      true,
    );
    alignOriginScheme(req);
    expect(req.headers.origin).toBe("https://hp.example.com:3000");
  });

  test("matches hosts case-insensitively", () => {
    const req = request({ host: "HP.example.com", origin: "https://hp.example.com" });
    alignOriginScheme(req);
    expect(req.headers.origin).toBe("http://hp.example.com");
  });

  test("leaves cross-host origins alone", () => {
    const req = request({ host: "hp.example.com", origin: "https://evil.example.com" });
    alignOriginScheme(req);
    expect(req.headers.origin).toBe("https://evil.example.com");
  });

  test("leaves a different port alone", () => {
    const req = request({ host: "hp.example.com:3000", origin: "https://hp.example.com" });
    alignOriginScheme(req);
    expect(req.headers.origin).toBe("https://hp.example.com");
  });

  test("ignores missing, null, and invalid origins", () => {
    for (const origin of [undefined, "null", "not a url"]) {
      const headers: Record<string, string> = { host: "hp.example.com" };
      if (origin) headers.origin = origin;

      const req = request(headers);
      alignOriginScheme(req);
      expect(req.headers.origin).toBe(origin);
    }
  });
});

describe("composeListener", () => {
  test("redirects basename to basename/ with 302", () => {
    const listener = composeListener({
      basename: "/admin",
      requestListener: vi.fn(),
    });

    const req = { url: "/admin", headers: {} } as any;
    let location = "";
    const res = {
      statusCode: 0,
      setHeader: (k: string, v: string) => {
        if (k.toLowerCase() === "location") location = v;
      },
      end: () => {},
    } as any;

    listener(req, res);
    expect(res.statusCode).toBe(302);
    expect(location).toBe("/admin/");
  });

  test("redirects /api/* and /healthz without basename prefix with 307", () => {
    const listener = composeListener({
      basename: "/admin",
      requestListener: vi.fn(),
    });

    for (const path of ["/api/admin/server-info", "/api/update-check", "/healthz"]) {
      let location = "";
      const req = { url: path, headers: {} } as any;
      const res = {
        statusCode: 0,
        setHeader: (k: string, v: string) => {
          if (k.toLowerCase() === "location") location = v;
        },
        end: () => {},
      } as any;

      listener(req, res);
      expect(res.statusCode).toBe(307);
      expect(location).toBe(`/admin${path}`);
    }
  });

  test("delegates requests with basename to downstream requestListener", () => {
    const downstream = vi.fn();
    const listener = composeListener({
      basename: "/admin",
      requestListener: downstream,
    });

    const req = { url: "/admin/api/admin/server-info", headers: {} } as any;
    const res = { statusCode: 0, setHeader: vi.fn(), end: vi.fn() } as any;

    listener(req, res);
    expect(downstream).toHaveBeenCalledWith(req, res);
  });
});
