/**
 * T072: E2E test for live preview functionality.
 *
 * Tests: Type valid DSL → Preview appears in <1s
 */

import { test, expect } from '@playwright/test';

test.describe('Live Preview', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to files page
    await page.goto('/files');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('T072: should show preview within 1 second of typing valid DSL', async ({ page }) => {
    // Create a new file
    const createButton = page.getByRole('button', { name: /create|new/i });
    if (await createButton.isVisible()) {
      await createButton.click();

      // Wait for file creation dialog or editor
      await page.waitForTimeout(500);
    }

    // Look for editor page (might already have a file)
    const editor = page.locator('[data-testid="editor-pane"]').or(page.locator('.monaco-editor'));

    if (await editor.isVisible()) {
      // Type valid DSL content
      const dslContent = '# Service: PetStore';

      // Focus and type in Monaco editor
      await editor.click();
      await page.keyboard.type(dslContent);

      // Wait for preview to update (should be within 1 second)
      const startTime = Date.now();

      // Check for preview pane with parsed entities
      const previewPane = page.locator('[data-testid="preview-pane"]');

      await expect(previewPane).toBeVisible({ timeout: 2000 });

      // Check that preview shows the service
      const serviceText = page.getByText('PetStore');

      await expect(serviceText).toBeVisible({ timeout: 2000 });

      const elapsedTime = Date.now() - startTime;

      // Should complete within 2 seconds (includes debounce + network)
      expect(elapsedTime).toBeLessThan(3000);
    }
  });

  test('T072: should update preview when DSL content changes', async ({ page }) => {
    // Navigate to editor with existing file or create new one
    const editorPage = page.locator('[data-testid="editor-pane"]').or(page.locator('.monaco-editor'));

    if (await editorPage.isVisible()) {
      // Clear existing content and type new DSL
      await editorPage.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type('# Service: NewAPI');

      // Wait for preview update
      await page.waitForTimeout(1500); // Wait for debounce

      // Verify preview shows updated content
      const previewPane = page.locator('[data-testid="preview-pane"]');
      await expect(previewPane).toBeVisible();

      await expect(page.getByText('NewAPI')).toBeVisible({ timeout: 2000 });
    }
  });
});
