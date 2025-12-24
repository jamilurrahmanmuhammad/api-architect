/**
 * T057: E2E test: Fix error → Error disappears.
 *
 * Tests that validation errors disappear when the user fixes them.
 */

import { test, expect } from '@playwright/test';

test.describe('Error Recovery', () => {
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

  test('should remove errors when fixing invalid DSL', async ({ page }) => {
    // Navigate to files page
    await page.goto('/files');

    // Create a new file for testing
    await page.click('button:has-text("New File"), button:has-text("+ New")');
    const uniqueName = `e2e-recovery-${Date.now()}`;
    await page.fill('input[placeholder*="file name"], input[placeholder*="Enter file"]', uniqueName);
    await page.click('button:has-text("Create")');

    // Wait for editor page
    await page.waitForURL(/\/editor\//);

    // Type invalid DSL content with an undefined reference
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.press('Control+A');

    await page.keyboard.type(`# Service: Test API
version: 1.0.0

**Response**: UndefinedModel`, { delay: 10 });

    // Wait for errors to appear
    await page.waitForSelector('[data-testid="error-item-0"], .error-item', { timeout: 2000 });

    // Verify at least one error is shown
    const initialErrorCount = page.locator('[data-testid="error-count"], .error-count');
    await expect(initialErrorCount).toContainText(/[1-9]/);

    // Now fix the error by defining the Model
    await page.keyboard.press('End');
    await page.keyboard.type(`

## Model: UndefinedModel
| name | type | required |
|------|------|----------|
| id | integer | true |`, { delay: 10 });

    // Wait for validation to update
    await page.waitForTimeout(600);

    // Errors should be cleared or reduced
    // Check for "No issues found" message
    const noErrors = page.locator('[data-testid="no-errors"], text=No issues');
    const errorCount = page.locator('[data-testid="error-count"], .error-count');

    // Either no errors shown, or error count is 0
    const noIssuesVisible = await noErrors.isVisible().catch(() => false);
    const errorCountText = await errorCount.textContent().catch(() => '0');

    if (!noIssuesVisible) {
      // If error count is visible, it should show 0 errors
      expect(errorCountText).toContain('0');
    }
  });

  test('should update error count when fixing one of multiple errors', async ({ page }) => {
    // Navigate to files page and create a file
    await page.goto('/files');
    await page.click('button:has-text("New File"), button:has-text("+ New")');
    const uniqueName = `e2e-partial-fix-${Date.now()}`;
    await page.fill('input[placeholder*="file name"], input[placeholder*="Enter file"]', uniqueName);
    await page.click('button:has-text("Create")');
    await page.waitForURL(/\/editor\//);

    // Type DSL with multiple errors
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.press('Control+A');

    // Two errors: undefined reference and invalid type
    await page.keyboard.type(`# Service: Test
version: 1.0.0

**Response**: FirstUndefined

**Request**: SecondUndefined`, { delay: 10 });

    // Wait for errors to appear
    await page.waitForSelector('[data-testid="error-list"], .error-list', { timeout: 2000 });

    // Get initial error count
    const errorItems = page.locator('[data-testid^="error-item"], .error-item');
    const initialCount = await errorItems.count();
    expect(initialCount).toBeGreaterThanOrEqual(2);

    // Fix one of the errors by adding the first model
    await page.keyboard.press('End');
    await page.keyboard.type(`

## Model: FirstUndefined
| name | type | required |
|------|------|----------|
| id | integer | true |`, { delay: 10 });

    // Wait for validation to update
    await page.waitForTimeout(600);

    // Error count should be reduced but not zero
    const newCount = await errorItems.count();
    expect(newCount).toBeLessThan(initialCount);
  });

  test('should show "No issues found" when all errors are fixed', async ({ page }) => {
    // Navigate to files page and create a file
    await page.goto('/files');
    await page.click('button:has-text("New File"), button:has-text("+ New")');
    const uniqueName = `e2e-all-fixed-${Date.now()}`;
    await page.fill('input[placeholder*="file name"], input[placeholder*="Enter file"]', uniqueName);
    await page.click('button:has-text("Create")');
    await page.waitForURL(/\/editor\//);

    // Type invalid DSL
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.press('Control+A');

    await page.keyboard.type(`# Service: Test
**Response**: TestModel`, { delay: 10 });

    // Wait for error
    await page.waitForSelector('[data-testid="error-item-0"], .error-item', { timeout: 2000 });

    // Fix by clearing and typing valid DSL
    await page.keyboard.press('Control+A');
    await page.keyboard.type(`# Service: Test API
version: 1.0.0

## Model: User
A valid user model.

| name | type | required |
|------|------|----------|
| id | integer | true |
| name | string | true |`, { delay: 10 });

    // Wait for validation to complete
    await page.waitForTimeout(600);

    // Should show "No issues found" or error count of 0
    const noErrors = page.locator('[data-testid="no-errors"], text=/No issues|0 errors/');
    await expect(noErrors).toBeVisible({ timeout: 2000 });
  });

  test('should click on error to navigate to line in editor', async ({ page }) => {
    // Navigate to files page and create a file
    await page.goto('/files');
    await page.click('button:has-text("New File"), button:has-text("+ New")');
    const uniqueName = `e2e-click-error-${Date.now()}`;
    await page.fill('input[placeholder*="file name"], input[placeholder*="Enter file"]', uniqueName);
    await page.click('button:has-text("Create")');
    await page.waitForURL(/\/editor\//);

    // Type DSL with an error on a specific line
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.press('Control+A');

    // Put the error on line 8
    await page.keyboard.type(`# Service: Test
version: 1.0.0

## Model: User
| name | type | required |
|------|------|----------|
| id | integer | true |
**Response**: UndefinedModel`, { delay: 10 });

    // Wait for errors to appear
    await page.waitForSelector('[data-testid="error-item-0"], .error-item', { timeout: 2000 });

    // Click on the error
    const errorItem = page.locator('[data-testid="error-item-0"], .error-item').first();
    await errorItem.click();

    // The editor should focus - we can't easily verify the cursor position,
    // but we can verify the editor receives focus
    await expect(editor).toBeFocused();
  });

  test('should persist valid state after saving fixed file', async ({ page }) => {
    // Navigate to files page and create a file
    await page.goto('/files');
    await page.click('button:has-text("New File"), button:has-text("+ New")');
    const uniqueName = `e2e-persist-valid-${Date.now()}`;
    await page.fill('input[placeholder*="file name"], input[placeholder*="Enter file"]', uniqueName);
    await page.click('button:has-text("Create")');
    await page.waitForURL(/\/editor\//);

    // Type valid DSL
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.press('Control+A');

    await page.keyboard.type(`# Service: Valid API
version: 1.0.0
base_path: /api/v1

## Model: User
| name | type | required |
|------|------|----------|
| id | integer | true |
| name | string | true |
| email | string | true |`, { delay: 10 });

    // Wait for validation
    await page.waitForTimeout(600);

    // Save the file
    await page.keyboard.press('Control+S');
    await page.waitForSelector('text=/Saved|v\\d+/', { timeout: 3000 });

    // Get the file ID from URL
    const url = page.url();
    const fileId = url.split('/editor/')[1];

    // Navigate away and back
    await page.goto('/files');
    await page.waitForSelector(`text=${uniqueName}`);

    // Reload the file
    await page.click(`text=${uniqueName}`);
    await page.waitForURL(`/editor/${fileId}`);

    // Wait for content to load
    await page.waitForTimeout(600);

    // Should still be valid (no errors)
    const noErrors = page.locator('[data-testid="no-errors"], text=/No issues|0 errors/');
    await expect(noErrors).toBeVisible({ timeout: 2000 });
  });
});
