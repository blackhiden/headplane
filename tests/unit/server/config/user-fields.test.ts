import { type } from "arktype";
import { describe, it, expect } from "vitest";

describe("Config Schema - User Fields", () => {
  // Avatar can be either a full URL or a path starting with /
  const avatarType = type("string")
    .narrow((s, ctx) => {
      // Allow full URLs
      try {
        new URL(s);
        return true;
      } catch {
        // Allow paths starting with /
        if (s.startsWith("/")) {
          return true;
        }
        return ctx.mustBe("a URL or a path starting with /");
      }
    })
    .optional();

  it("should validate user config with name and avatar URL", () => {
    const userConfig = type({
      username: "string",
      password: "string",
      name: "string?",
      avatar: avatarType,
    });

    const validUser = {
      username: "admin",
      password: "$2a$10$abcdefghijklmnopqrstuv",
      name: "Administrator",
      avatar: "https://example.com/avatar.png",
    };

    const result = userConfig(validUser);
    expect(result).toEqual(validUser);
  });

  it("should validate user config with avatar path", () => {
    const userConfig = type({
      username: "string",
      password: "string",
      name: "string?",
      avatar: avatarType,
    });

    const validUser = {
      username: "admin",
      password: "$2a$10$abcdefghijklmnopqrstuv",
      name: "Administrator",
      avatar: "/avatars/admin.png",
    };

    const result = userConfig(validUser);
    expect(result).toEqual(validUser);
  });

  it("should validate user config without optional fields", () => {
    const userConfig = type({
      username: "string",
      password: "string",
      name: "string?",
      avatar: avatarType,
    });

    const validUser = {
      username: "admin",
      password: "$2a$10$abcdefghijklmnopqrstuv",
    };

    const result = userConfig(validUser);
    expect(result).toEqual(validUser);
  });

  it("should reject invalid avatar (not URL or path)", () => {
    const userConfig = type({
      username: "string",
      password: "string",
      name: "string?",
      avatar: avatarType,
    });

    const invalidUser = {
      username: "admin",
      password: "$2a$10$abcdefghijklmnopqrstuv",
      avatar: "not-a-url-or-path",
    };

    const result = userConfig(invalidUser);
    expect(result instanceof type.errors).toBe(true);
  });

  it("should validate partial user config", () => {
    const partialUserConfig = type({
      username: "string?",
      password: "string?",
      name: "string?",
      avatar: avatarType,
    });

    const partialUpdate = {
      name: "New Name",
      avatar: "https://example.com/new-avatar.png",
    };

    const result = partialUserConfig(partialUpdate);
    expect(result).toEqual(partialUpdate);
  });
});
