/**
 * E2E Tests for API Builder
 * T047: Create New API Spec
 * T048: Import Complex OAS & Edit
 * T049: CSV Round-Trip
 */

import { test, expect } from "@playwright/test";

test.describe("T047: Create New API Spec", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/api-builder");
    await expect(page.getByTestId("api-builder")).toBeVisible();
  });

  test("should display API Builder page", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /api builder/i })).toBeVisible();
    await expect(page.getByTestId("tab-info")).toBeVisible();
    await expect(page.getByTestId("tab-models")).toBeVisible();
    await expect(page.getByTestId("tab-operations")).toBeVisible();
    await expect(page.getByTestId("tab-export")).toBeVisible();
  });

  test("should fill API info fields", async ({ page }) => {
    // Fill title
    const titleInput = page.getByLabel(/title/i);
    await titleInput.fill("My Test API");

    // Fill version
    const versionInput = page.getByLabel(/version/i);
    await versionInput.fill("1.0.0");

    // Fill description
    const descriptionInput = page.getByLabel(/description/i);
    await descriptionInput.fill("A test API for E2E testing");

    // Verify values persisted
    await expect(titleInput).toHaveValue("My Test API");
    await expect(versionInput).toHaveValue("1.0.0");
  });

  test("should add a model/schema", async ({ page }) => {
    // Navigate to Models tab
    await page.getByTestId("tab-models").click();

    // Click Add Model button
    await page.getByRole("button", { name: /add model/i }).click();

    // Fill model name
    const modelNameInput = page.getByLabel(/model name/i).first();
    await modelNameInput.fill("User");

    // Verify model appears in list
    await expect(page.getByText("User")).toBeVisible();
  });

  test("should add an operation/endpoint", async ({ page }) => {
    // Navigate to Operations tab
    await page.getByTestId("tab-operations").click();

    // Click Add Operation button
    await page.getByRole("button", { name: /add operation/i }).click();

    // Fill path
    const pathInput = page.getByLabel(/path/i).first();
    await pathInput.fill("/users");

    // Select method
    const methodSelect = page.getByLabel(/method/i).first();
    await methodSelect.selectOption("GET");

    // Fill summary
    const summaryInput = page.getByLabel(/summary/i).first();
    await summaryInput.fill("Get all users");

    // Verify operation appears
    await expect(page.getByText("/users")).toBeVisible();
    await expect(page.getByText(/get/i)).toBeVisible();
  });

  test("should show validation panel", async ({ page }) => {
    // Validation panel should be visible
    await expect(page.getByText(/validation/i)).toBeVisible();
  });

  test("should export to OAS YAML", async ({ page }) => {
    // Fill minimum required fields
    await page.getByLabel(/title/i).fill("Export Test API");
    await page.getByLabel(/version/i).fill("1.0.0");

    // Navigate to Export tab
    await page.getByTestId("tab-export").click();

    // OAS preview should be visible
    await expect(page.getByText(/openapi/i)).toBeVisible();
    await expect(page.getByText(/Export Test API/)).toBeVisible();
  });

  test("should undo and redo changes", async ({ page }) => {
    // Make a change
    const titleInput = page.getByLabel(/title/i);
    await titleInput.fill("Original Title");

    // Make another change
    await titleInput.fill("Changed Title");
    await expect(titleInput).toHaveValue("Changed Title");

    // Click undo
    await page.getByRole("button", { name: /undo/i }).click();

    // Should revert to original
    await expect(titleInput).toHaveValue("Original Title");

    // Click redo
    await page.getByRole("button", { name: /redo/i }).click();

    // Should restore change
    await expect(titleInput).toHaveValue("Changed Title");
  });

  test("should change profile level", async ({ page }) => {
    // Find profile selector
    const profileSelector = page.getByLabel(/profile/i);

    // Change to Advanced
    await profileSelector.selectOption("advanced");

    // Verify selection
    await expect(profileSelector).toHaveValue("advanced");
  });
});

test.describe("T048: Import Complex OAS & Edit", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/api-builder");
    await expect(page.getByTestId("api-builder")).toBeVisible();
  });

  test("should open OAS import dialog", async ({ page }) => {
    await page.getByTestId("import-oas-button").click();

    // Dialog should appear
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/import openapi/i)).toBeVisible();
  });

  test("should import OAS file via paste", async ({ page }) => {
    // Open import dialog
    await page.getByTestId("import-oas-button").click();

    // Find textarea and paste OAS content
    const textarea = page.getByRole("textbox");
    const oasContent = JSON.stringify({
      openapi: "3.0.3",
      info: { title: "Imported API", version: "2.0.0", description: "An imported API" },
      paths: {
        "/items": {
          get: {
            operationId: "getItems",
            summary: "Get all items",
            responses: { "200": { description: "OK" } },
          },
        },
      },
    });

    await textarea.fill(oasContent);

    // Click import button
    await page.getByRole("button", { name: /^import$/i }).click();

    // Verify imported data appears
    await expect(page.getByLabel(/title/i)).toHaveValue("Imported API");
    await expect(page.getByLabel(/version/i)).toHaveValue("2.0.0");
  });

  test("should edit imported API info", async ({ page }) => {
    // Import some data first
    await page.getByTestId("import-oas-button").click();

    const textarea = page.getByRole("textbox");
    await textarea.fill(
      JSON.stringify({
        openapi: "3.0.3",
        info: { title: "Edit Test API", version: "1.0.0" },
        paths: {},
      })
    );

    await page.getByRole("button", { name: /^import$/i }).click();

    // Now edit the title
    const titleInput = page.getByLabel(/title/i);
    await titleInput.clear();
    await titleInput.fill("Modified API Title");

    // Verify change
    await expect(titleInput).toHaveValue("Modified API Title");

    // Go to export tab and verify the change appears
    await page.getByTestId("tab-export").click();
    await expect(page.getByText(/Modified API Title/)).toBeVisible();
  });
});

test.describe("T049: CSV Round-Trip", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/api-builder");
    await expect(page.getByTestId("api-builder")).toBeVisible();
  });

  test("should open CSV import dialog", async ({ page }) => {
    await page.getByTestId("import-csv-button").click();

    // Dialog should appear
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByText(/import csv/i)).toBeVisible();
  });

  test("should show CSV export options", async ({ page }) => {
    // Navigate to Export tab
    await page.getByTestId("tab-export").click();

    // CSV export should be visible
    await expect(page.getByText(/download csv/i)).toBeVisible();
    await expect(page.getByLabel(/profile/i)).toBeVisible();
  });

  test("should change CSV export profile", async ({ page }) => {
    // Add some data first
    await page.getByLabel(/title/i).fill("CSV Test API");
    await page.getByLabel(/version/i).fill("1.0.0");

    // Navigate to Operations tab and add an operation
    await page.getByTestId("tab-operations").click();
    await page.getByRole("button", { name: /add operation/i }).click();
    await page.getByLabel(/path/i).first().fill("/test");

    // Navigate to Export tab
    await page.getByTestId("tab-export").click();

    // Find the profile selector for CSV export
    const csvProfileSelector = page.locator('[id="csv-profile"]');
    await csvProfileSelector.selectOption("advanced");

    // Verify selection
    await expect(csvProfileSelector).toHaveValue("advanced");
  });

  test("should show PDF export option", async ({ page }) => {
    // Navigate to Export tab
    await page.getByTestId("tab-export").click();

    // PDF export button should be visible
    await expect(page.getByRole("button", { name: /generate pdf/i })).toBeVisible();
  });
});
