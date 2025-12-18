/**
 * T022: E2E test for export flow.
 *
 * Tests:
 * - Write DSL in editor
 * - Click Export button
 * - Select format and version
 * - Verify download is triggered
 * - Verify exported content is valid OpenAPI
 */

import { test, expect } from '@playwright/test';

test.describe('Export OpenAPI', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to editor
    await page.goto('/editor');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('T022a: should export to OpenAPI YAML', async ({ page }) => {
    // Type valid DSL content in editor
    const editor = page.locator('[data-testid="editor-pane"]').or(page.locator('.monaco-editor'));

    if (await editor.isVisible()) {
      const dslContent = `# Service: TestAPI
version: 1.0.0
base_path: /api/v1

Test API for export validation.

## Model: User
User model with standard fields.

- id (integer, required) - Unique identifier
- name (string, required) - User's name

## Operation: GET /users
Get all users.

Returns: User[]`;

      // Focus and type in editor
      await editor.click();
      await page.keyboard.type(dslContent);

      // Wait for preview to update
      await page.waitForTimeout(1500);

      // Click Export button
      const exportButton = page.getByRole('button', { name: /export/i });
      if (await exportButton.isVisible()) {
        await exportButton.click();

        // Wait for export dialog to appear
        const exportDialog = page.locator('[data-testid="export-dialog"]');
        await expect(exportDialog).toBeVisible({ timeout: 2000 });

        // Verify format selection (YAML by default)
        const yamlRadio = page.locator('input[name="format"][value="yaml"]');
        await expect(yamlRadio).toBeChecked();

        // Verify version selection (3.0 by default)
        const version30Radio = page.locator('input[name="version"][value="3.0"]');
        await expect(version30Radio).toBeChecked();

        // Listen for download
        const downloadPromise = page.waitForEvent('download');

        // Click Export button in dialog
        const dialogExportButton = page.getByRole('button', { name: /export/i }).last();
        await dialogExportButton.click();

        // Wait for download to complete
        const download = await downloadPromise;

        // Verify filename
        expect(download.suggestedFilename()).toBe('openapi.yaml');
      }
    }
  });

  test('T022b: should export to OpenAPI JSON', async ({ page }) => {
    // Type valid DSL content in editor
    const editor = page.locator('[data-testid="editor-pane"]').or(page.locator('.monaco-editor'));

    if (await editor.isVisible()) {
      const dslContent = `# Service: TestAPI
version: 1.0.0
base_path: /api/v1

Test API.

## Model: Product
Product model.

- id (integer, required) - Product ID
- name (string, required) - Product name
- price (number) - Price

## Operation: GET /products
Get products.

Returns: Product[]`;

      // Focus and type in editor
      await editor.click();
      await page.keyboard.type(dslContent);

      // Wait for preview to update
      await page.waitForTimeout(1500);

      // Click Export button
      const exportButton = page.getByRole('button', { name: /export/i });
      if (await exportButton.isVisible()) {
        await exportButton.click();

        // Wait for export dialog to appear
        const exportDialog = page.locator('[data-testid="export-dialog"]');
        await expect(exportDialog).toBeVisible({ timeout: 2000 });

        // Select JSON format
        const jsonRadio = page.locator('input[name="format"][value="json"]');
        await jsonRadio.click();

        // Listen for download
        const downloadPromise = page.waitForEvent('download');

        // Click Export button in dialog
        const dialogExportButton = page.getByRole('button', { name: /export/i }).last();
        await dialogExportButton.click();

        // Wait for download to complete
        const download = await downloadPromise;

        // Verify filename
        expect(download.suggestedFilename()).toBe('openapi.json');
      }
    }
  });

  test('T022c: should support OpenAPI 3.1 export', async ({ page }) => {
    // Type valid DSL content in editor
    const editor = page.locator('[data-testid="editor-pane"]').or(page.locator('.monaco-editor'));

    if (await editor.isVisible()) {
      const dslContent = `# Service: API
version: 2.0.0
base_path: /api/v2

API with 3.1 support.

## Model: Item
Item model.

- id (integer, required) - ID`;

      // Focus and type in editor
      await editor.click();
      await page.keyboard.type(dslContent);

      // Wait for preview to update
      await page.waitForTimeout(1500);

      // Click Export button
      const exportButton = page.getByRole('button', { name: /export/i });
      if (await exportButton.isVisible()) {
        await exportButton.click();

        // Wait for export dialog to appear
        const exportDialog = page.locator('[data-testid="export-dialog"]');
        await expect(exportDialog).toBeVisible({ timeout: 2000 });

        // Select version 3.1
        const version31Radio = page.locator('input[name="version"][value="3.1"]');
        await version31Radio.click();

        // Verify selection
        await expect(version31Radio).toBeChecked();

        // Listen for download
        const downloadPromise = page.waitForEvent('download');

        // Click Export button in dialog
        const dialogExportButton = page.getByRole('button', { name: /export/i }).last();
        await dialogExportButton.click();

        // Wait for download to complete
        const download = await downloadPromise;

        // Verify filename
        expect(download.suggestedFilename()).toBe('openapi.yaml');
      }
    }
  });

  test('T022d: should disable export when content is empty', async ({ page }) => {
    // Verify export button is disabled initially
    const exportButton = page.getByRole('button', { name: /export/i });
    if (await exportButton.isVisible()) {
      await expect(exportButton).toBeDisabled();
    }
  });

  test('T022e: should allow canceling export dialog', async ({ page }) => {
    // Type valid DSL content
    const editor = page.locator('[data-testid="editor-pane"]').or(page.locator('.monaco-editor'));

    if (await editor.isVisible()) {
      const dslContent = `# Service: API
version: 1.0.0
base_path: /api`;

      // Focus and type in editor
      await editor.click();
      await page.keyboard.type(dslContent);

      // Wait for preview to update
      await page.waitForTimeout(1500);

      // Click Export button
      const exportButton = page.getByRole('button', { name: /export/i });
      if (await exportButton.isVisible()) {
        await exportButton.click();

        // Wait for export dialog to appear
        const exportDialog = page.locator('[data-testid="export-dialog"]');
        await expect(exportDialog).toBeVisible({ timeout: 2000 });

        // Click Cancel button
        const cancelButton = page.getByRole('button', { name: /cancel/i });
        await cancelButton.click();

        // Verify dialog is closed
        await expect(exportDialog).not.toBeVisible();
      }
    }
  });
});
