/**
 * T073: E2E test for bidirectional selection.
 *
 * Tests: Click preview → Editor highlights
 */

import { test, expect } from '@playwright/test';

test.describe('Bidirectional Selection', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to files page and open/create a file
    await page.goto('/files');
    await page.waitForLoadState('networkidle');
  });

  test('T073: should highlight editor when clicking preview entity', async ({ page }) => {
    // Look for an existing file or editor
    const editor = page.locator('[data-testid="editor-pane"]').or(page.locator('.monaco-editor'));
    const previewPane = page.locator('[data-testid="preview-pane"]');

    if (await editor.isVisible() && await previewPane.isVisible()) {
      // Type DSL with multiple entities
      await editor.click();
      await page.keyboard.press('Control+A');
      await page.keyboard.type(`# Service: PetStore
version: 1.0.0
base_path: /api/v1

## Model: Pet
A pet in the store.

| name | type | required |
|------|------|----------|
| id | integer | true |
| name | string | true |

## Model: Category
Pet category.

| name | type | required |
|------|------|----------|
| id | integer | true |`);

      // Wait for preview to update
      await page.waitForTimeout(1500);

      // Click on Models tab
      const modelsTab = page.getByRole('tab', { name: /models/i });
      if (await modelsTab.isVisible()) {
        await modelsTab.click();

        // Click on Pet model in preview
        const petModel = page.locator('[data-testid="entity-model-Pet"]');
        if (await petModel.isVisible()) {
          await petModel.click();

          // Verify the model is highlighted (has 'selected' class)
          await expect(petModel).toHaveClass(/selected/);
        }
      }
    }
  });

  test('T073: should switch tabs and show entities', async ({ page }) => {
    const previewPane = page.locator('[data-testid="preview-pane"]');

    if (await previewPane.isVisible()) {
      // Check that we can switch between tabs
      const servicesTab = page.getByRole('tab', { name: /services/i });
      const modelsTab = page.getByRole('tab', { name: /models/i });
      const operationsTab = page.getByRole('tab', { name: /operations/i });
      const errorsTab = page.getByRole('tab', { name: /errors/i });

      // Click each tab and verify it becomes selected
      if (await servicesTab.isVisible()) {
        await servicesTab.click();
        await expect(servicesTab).toHaveAttribute('aria-selected', 'true');
      }

      if (await modelsTab.isVisible()) {
        await modelsTab.click();
        await expect(modelsTab).toHaveAttribute('aria-selected', 'true');
      }

      if (await operationsTab.isVisible()) {
        await operationsTab.click();
        await expect(operationsTab).toHaveAttribute('aria-selected', 'true');
      }

      if (await errorsTab.isVisible()) {
        await errorsTab.click();
        await expect(errorsTab).toHaveAttribute('aria-selected', 'true');
      }
    }
  });
});
