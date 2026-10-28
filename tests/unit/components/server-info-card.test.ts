import { describe, expect, test } from "vitest";

import { formatBytes, formatDeploymentMode } from "~/components/server-info-card";

describe("ServerInfoCard utilities", () => {
  describe("formatBytes", () => {
    test("formats 0 bytes", () => {
      expect(formatBytes(0)).toBe("0 B");
    });

    test("formats bytes", () => {
      expect(formatBytes(512)).toBe("512 B");
    });

    test("formats kilobytes", () => {
      expect(formatBytes(1024)).toBe("1 KB");
      expect(formatBytes(2048)).toBe("2 KB");
    });

    test("formats megabytes", () => {
      expect(formatBytes(1024 * 1024)).toBe("1 MB");
      expect(formatBytes(5 * 1024 * 1024)).toBe("5 MB");
    });

    test("formats gigabytes", () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe("1 GB");
      expect(formatBytes(8 * 1024 * 1024 * 1024)).toBe("8 GB");
    });

    test("formats terabytes", () => {
      expect(formatBytes(1024 * 1024 * 1024 * 1024)).toBe("1 TB");
    });

    test("formats with decimals", () => {
      expect(formatBytes(1536)).toBe("1.5 KB");
      expect(formatBytes(1024 * 1024 * 1.5)).toBe("1.5 MB");
    });
  });

  describe("formatDeploymentMode", () => {
    test("formats docker mode", () => {
      expect(formatDeploymentMode("docker")).toBe("Docker");
    });

    test("formats native mode", () => {
      expect(formatDeploymentMode("native")).toBe("Native");
    });

    test("formats kubernetes mode", () => {
      expect(formatDeploymentMode("kubernetes")).toBe("Kubernetes");
    });

    test("formats unknown mode", () => {
      expect(formatDeploymentMode("unknown")).toBe("Unknown");
      expect(formatDeploymentMode("something-else")).toBe("Unknown");
    });
  });
});
