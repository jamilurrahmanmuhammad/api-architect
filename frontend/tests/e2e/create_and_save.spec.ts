/**
 * T043: E2E test: Create file → Type DSL → Save → Reload.
 *
 * Tests the complete authoring workflow for requirement files.
 */

import { test, expect } from '@playwright/test';

test.describe('Create and Save File Workflow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first (mock authentication)
    await page.goto('/login');

    // Fill login form with demo credentials
    await page.fill('input[type="email"], input[name="email"]', 'demo@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'demo123');
    await page.click('button[type="submit"]');

    // Wait for redirect to dashboard
    await page.waitForURL(/\/(app|files|dashboard)/);
  });

  test('should create a new file, type DSL content, save, and reload', async ({ page }) => {
    // Navigate to files page
    await page.goto('/files');

    // Click "New File" button
    await page.click('button:has-text("New File"), button:has-text("+ New")');

    // Enter file name in the dialog
    const uniqueName = `e2e-test-${Date.now()}`;
    await page.fill('input[placeholder*="file name"], input[placeholder*="Enter file"]', uniqueName);

    // Click "Create" button
    await page.click('button:has-text("Create")');

    // Wait for redirect to editor
    await page.waitForURL(/\/editor\//);

    // Verify file name is displayed
    await expect(page.locator('text=' + uniqueName)).toBeVisible();

    // Type DSL content in the Monaco editor
    const dslContent = `# Service: E2E Test API
version: 1.0.0
base_path: /api/v1

## Model: TestEntity
A test entity for E2E testing.

| name | type | required |
|------|------|----------|
| id | integer | true |
| title | string | true |`;

    // Focus the Monaco editor and type content
    const editor = page.locator('.monaco-editor');
    await editor.click();

    // Select all existing content and replace
    await page.keyboard.press('Control+A');
    await page.keyboard.type(dslContent);

    // Verify unsaved changes indicator is shown
    await expect(page.locator('[title*="Unsaved"], .bg-yellow-500')).toBeVisible();

    // Save with Ctrl+S
    await page.keyboard.press('Control+S');

    // Wait for save to complete
    await page.waitForSelector('text=/Saved|v\\d+/');

    // Verify unsaved changes indicator is hidden
    await expect(page.locator('[title*="Unsaved"]:visible')).not.toBeVisible({
      timeout: 5000,
    });

    // Get the file ID from URL
    const url = page.url();
    const fileId = url.split('/editor/')[1];

    // Navigate away and back to verify persistence
    await page.goto('/files');
    await page.waitForSelector(`text=${uniqueName}`);

    // Click on the file to reload
    await page.click(`text=${uniqueName}`);
    await page.waitForURL(`/editor/${fileId}`);

    // Verify content was persisted
    await expect(editor).toContainText('E2E Test API');
    await expect(editor).toContainText('TestEntity');
  });

  test('should show warning when leaving with unsaved changes', async ({ page }) => {
    // Navigate to files page
    await page.goto('/files');

    // Create a new file
    await page.click('button:has-text("New File"), button:has-text("+ New")');
    const uniqueName = `e2e-unsaved-${Date.now()}`;
    await page.fill('input[placeholder*="file name"], input[placeholder*="Enter file"]', uniqueName);
    await page.click('button:has-text("Create")');

    // Wait for editor page
    await page.waitForURL(/\/editor\//);

    // Type some content
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('# Unsaved content');

    // Set up dialog handler
    page.on('dialog', async (dialog) => {
      expect(dialog.message()).toContain('unsaved');
      await dialog.dismiss(); // Stay on page
    });

    // Try to navigate away using the Back button
    await page.click('button:has-text("Back"), a:has-text("Back")');

    // Should still be on editor page after dismissing dialog
    await expect(page).toHaveURL(/\/editor\//);
  });

  test('should increment version on each save', async ({ page }) => {
    // Navigate to files page
    await page.goto('/files');

    // Create a new file
    await page.click('button:has-text("New File"), button:has-text("+ New")');
    const uniqueName = `e2e-version-${Date.now()}`;
    await page.fill('input[placeholder*="file name"], input[placeholder*="Enter file"]', uniqueName);
    await page.click('button:has-text("Create")');

    // Wait for editor page
    await page.waitForURL(/\/editor\//);

    // Initial version should be 1
    await expect(page.locator('text=/v1/')).toBeVisible();

    // Make 3 edits and save each
    for (let i = 2; i <= 4; i++) {
      const editor = page.locator('.monaco-editor');
      await editor.click();
      await page.keyboard.press('End');
      await page.keyboard.type(`\n# Version ${i} edit`);

      // Save with Ctrl+S
      await page.keyboard.press('Control+S');

      // Wait for save and version update
      await page.waitForSelector(`text=/v${i}/`);
    }

    // Final version should be 4
    await expect(page.locator('text=/v4/')).toBeVisible();
  });
});
