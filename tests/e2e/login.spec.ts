import { expect, test } from "./fixtures";

test.describe("login", () => {
  test("shows an error for an invalid API key", async ({ page }) => {
    await page.goto("/admin/login");
    await page.getByRole("button", { name: "API Key" }).click();
    await page.getByPlaceholder("API Key").fill("invalid-api-key");
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page.getByText(/API key is invalid/i)).toBeVisible();
  });

  test("redirects to machines with a valid API key", async ({ page, apiKey }) => {
    await page.goto("/admin/login");
    await page.getByRole("button", { name: "API Key" }).click();
    await page.getByPlaceholder("API Key").fill(apiKey);
    await page.getByRole("button", { name: "Sign In" }).click();
    await expect(page).toHaveURL(/\/machines/);
  });

  test("shows password login by default", async ({ page }) => {
    await page.goto("/admin/login");
    await expect(page.getByPlaceholder("Password")).toBeVisible();
    await expect(page.getByPlaceholder("API Key")).not.toBeVisible();
  });

  test("keeps login controls disabled until hydration", async ({ baseURL, browser }) => {
    if (!baseURL) {
      throw new Error("Playwright baseURL is required for the server-rendering assertion");
    }

    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();

    try {
      await page.goto(new URL("/admin/login", baseURL).href);
      await expect(page.getByRole("button", { name: "Password" })).toBeDisabled();
      await expect(page.getByRole("button", { name: "API Key" })).toBeDisabled();
      await expect(page.getByRole("button", { name: "Show", exact: true })).toBeDisabled();
    } finally {
      await context.close();
    }
  });

  test("toggles between password and API key login", async ({ page }) => {
    await page.goto("/admin/login");

    // Password is default
    await expect(page.getByPlaceholder("Password")).toBeVisible();

    // Switch to API Key. Playwright waits for hydration to enable this control.
    const apiKeyTab = page.getByRole("button", { name: "API Key" });
    await expect(apiKeyTab).toBeEnabled();
    await apiKeyTab.click();
    await expect(page.getByPlaceholder("API Key")).toBeVisible();
    await expect(page.getByPlaceholder("Password")).not.toBeVisible();

    // Switch back to Password
    await page.getByRole("button", { name: "Password" }).click();
    await expect(page.getByPlaceholder("Password")).toBeVisible();
    await expect(page.getByPlaceholder("API Key")).not.toBeVisible();
  });

  test("shows/hides password when toggle is clicked", async ({ page }) => {
    await page.goto("/admin/login");
    const visibilityToggle = page.getByRole("button", { name: "Show", exact: true });

    // Initially hidden
    await expect(page.getByPlaceholder("Password")).toHaveAttribute("type", "password");

    await expect(visibilityToggle).toBeEnabled();
    await visibilityToggle.click();
    await expect(page.getByPlaceholder("Password")).toHaveAttribute("type", "text");

    await page.getByRole("button", { name: "Hide", exact: true }).click();
    await expect(page.getByPlaceholder("Password")).toHaveAttribute("type", "password");
  });

  test("password-only mode works when local admin is configured", async ({ page }) => {
    // When single-admin mode is active, password login should work
    await page.goto("/admin/login");

    // Password tab should be available
    await expect(page.getByRole("button", { name: "Password" })).toBeVisible();

    // API Key tab should also be available (for secondary auth)
    await expect(page.getByRole("button", { name: "API Key" })).toBeVisible();

    // Username and password fields should be visible by default
    await expect(page.getByPlaceholder("Username")).toBeVisible();
    await expect(page.getByPlaceholder("Password")).toBeVisible();

    // OIDC/proxy options should not be shown in single-admin mode
    // (This assumes OIDC is disabled when local admin is configured)
    await expect(page.getByText(/OIDC/i)).not.toBeVisible();
    await expect(page.getByText(/OAuth/i)).not.toBeVisible();
  });
});
