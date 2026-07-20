import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.beforeEach(async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
});

test("public shell is mobile-ready and accessible", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Sprout/);
  const manifest = await page.locator('link[rel="manifest"]').getAttribute("href");
  expect(manifest).toBe("/manifest.webmanifest");

  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
});

test("protected routes redirect to sign in", async ({ page }) => {
  await page.goto("/budgets");
  await expect(page).toHaveURL(/\/signin/);
});

test.describe("authenticated envelope journey", () => {
  test.skip(!process.env.E2E_FULL, "Set E2E_FULL=1 with a disposable migrated database");

  test("creates budgets, allocates income, and visualizes goal impact", async ({ page }) => {
    const email = `sprout-e2e-${Date.now()}@example.com`;
    await page.goto("/signup");
    await page.getByLabel("Name").fill("Sprout Test");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password", { exact: true }).fill("test-password-123");
    await page.getByLabel("Confirm Password").fill("test-password-123");
    await page.getByRole("button", { name: "Create Account" }).click();
    await expect(page).toHaveURL(/\/dashboard/);

    await page.goto("/settings");
    await page.getByRole("button", { name: "Add account" }).click();
    await page.getByLabel("Account name").fill("Main checking");
    await page.getByLabel("Current balance").fill("2000");
    await page.getByRole("button", { name: "Create account" }).click();

    await page.goto("/budgets");
    await page.getByRole("button", { name: "New envelope" }).click();
    await page.getByLabel("Name").fill("Groceries");
    await page.getByLabel("Monthly target").fill("500");
    await page.getByRole("button", { name: "Create envelope" }).click();
    await page.getByRole("button", { name: "New envelope" }).click();
    await page.getByLabel("Type").selectOption("GOAL");
    await page.getByLabel("Name").fill("New phone");
    await page.getByLabel("Goal amount").fill("1000");
    await page.getByRole("button", { name: "Create envelope" }).click();
    await page.getByRole("button", { name: "Make focus" }).click();

    await page.goto("/income");
    await page.getByRole("button", { name: "Add allocation rule" }).click();
    await page.getByLabel("Amount").first().fill("300");
    await page.getByRole("button", { name: "Save plan" }).click();
    await page.getByLabel("Amount").first().fill("1200");
    await page.getByRole("button", { name: "Record and assign income" }).click();
    await expect(page.getByText("Income assigned")).toBeVisible();

    await page.goto("/dashboard");
    await page.getByRole("button", { name: "Add expense" }).click();
    await page.getByLabel("What did you spend on?").fill("Dinner");
    await page.getByLabel("Amount").fill("60");
    await expect(page.getByText("Your saved goal progress will not change.")).toBeVisible();
    await page.getByRole("button", { name: "Add expense" }).last().click();

    await page.goto("/reports");
    await expect(page.getByText("Hypothetical spending impact")).toBeVisible();
    await expect(page.getByText("$60.00")).toBeVisible();

    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
