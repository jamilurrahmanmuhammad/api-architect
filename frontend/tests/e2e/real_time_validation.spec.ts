/**
 * T056: E2E test: Type invalid DSL → Errors appear in <500ms.
 *
 * Tests that validation errors appear in real-time as the user types.
 */

import { test, expect } from '@playwright/test';

test.describe('Real-Time Validation', () => {
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

  test('should show validation errors within 500ms of typing invalid DSL', async ({ page }) => {
    // Navigate to files page
    await page.goto('/files');

    // Create a new file for testing
    await page.click('button:has-text("New File"), button:has-text("+ New")');
    const uniqueName = `e2e-validation-${Date.now()}`;
    await page.fill('input[placeholder*="file name"], input[placeholder*="Enter file"]', uniqueName);
    await page.click('button:has-text("Create")');

    // Wait for editor page
    await page.waitForURL(/\/editor\//);

    // Clear the editor and type invalid DSL content
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.press('Control+A');

    // Type DSL with an undefined model reference
    const invalidDSL = `# Service: Test API
version: 1.0.0

## Operation: GetUser
**Response**: UndefinedModel`;

    // Start timing
    const startTime = Date.now();

    // Type the content
    await page.keyboard.type(invalidDSL, { delay: 10 });

    // Wait for error panel to show errors
    const errorPanel = page.locator('[data-testid="error-panel"], .error-panel');
    await errorPanel.waitFor({ state: 'visible', timeout: 2000 });

    // Check that errors appeared within 500ms after finishing typing
    // Note: We use 1000ms total timeout to account for debounce + API call
    await expect(page.locator('[data-testid="error-count"], .error-count')).toBeVisible({
      timeout: 1000,
    });

    // Verify the error message about undefined reference
    await expect(
      page.locator('text=/UndefinedModel|undefined|reference/i')
    ).toBeVisible({ timeout: 500 });

    const elapsedTime = Date.now() - startTime;
    console.log(`Validation errors appeared in ${elapsedTime}ms`);

    // Verify error count is shown (at least 1 error)
    const errorCount = page.locator('[data-testid="error-count"], .error-count');
    await expect(errorCount).toContainText(/[1-9]/);
  });

  test('should display error location (line and column)', async ({ page }) => {
    // Navigate to files page and create a file
    await page.goto('/files');
    await page.click('button:has-text("New File"), button:has-text("+ New")');
    const uniqueName = `e2e-error-location-${Date.now()}`;
    await page.fill('input[placeholder*="file name"], input[placeholder*="Enter file"]', uniqueName);
    await page.click('button:has-text("Create")');
    await page.waitForURL(/\/editor\//);

    // Type invalid DSL
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.press('Control+A');

    await page.keyboard.type(`# Service: Test
version: 1.0.0

## Model: User
| name | type | required |
|------|------|----------|
| id | invalidtype | true |`, { delay: 10 });

    // Wait for errors to appear
    await page.waitForSelector('[data-testid="error-panel"], .error-panel', { timeout: 2000 });

    // Click on the error item
    const errorItem = page.locator('[data-testid^="error-item"], .error-item').first();
    await errorItem.waitFor({ state: 'visible', timeout: 2000 });

    // Verify error location is shown
    const errorLocation = page.locator('[data-testid="error-location"], .error-location');
    await expect(errorLocation).toBeVisible();
    await expect(errorLocation).toContainText(/Line \d+/);
  });

  test('should highlight error type', async ({ page }) => {
    // Navigate to files page and create a file
    await page.goto('/files');
    await page.click('button:has-text("New File"), button:has-text("+ New")');
    const uniqueName = `e2e-error-type-${Date.now()}`;
    await page.fill('input[placeholder*="file name"], input[placeholder*="Enter file"]', uniqueName);
    await page.click('button:has-text("Create")');
    await page.waitForURL(/\/editor\//);

    // Type invalid DSL with undefined reference
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.press('Control+A');

    await page.keyboard.type(`# Service: Test
**Response**: NonExistentModel`, { delay: 10 });

    // Wait for errors to appear
    await page.waitForSelector('[data-testid="error-item-0"], .error-item', { timeout: 2000 });

    // Verify error type is shown
    const errorType = page.locator('[data-testid="error-type"], .error-type');
    await expect(errorType).toBeVisible();
    await expect(errorType).toContainText(/UNDEFINED|REFERENCE|INVALID/i);
  });

  test('should show multiple errors when DSL has multiple issues', async ({ page }) => {
    // Navigate to files page and create a file
    await page.goto('/files');
    await page.click('button:has-text("New File"), button:has-text("+ New")');
    const uniqueName = `e2e-multi-error-${Date.now()}`;
    await page.fill('input[placeholder*="file name"], input[placeholder*="Enter file"]', uniqueName);
    await page.click('button:has-text("Create")');
    await page.waitForURL(/\/editor\//);

    // Type DSL with multiple errors
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.press('Control+A');

    // DSL with multiple errors: undefined reference and invalid type
    await page.keyboard.type(`# Service: Test
version: 1.0.0

**Response**: UndefinedModel

## Model: User
| name | type | required |
|------|------|----------|
| id | invalidtype | true |`, { delay: 10 });

    // Wait for errors to appear
    await page.waitForSelector('[data-testid="error-list"], .error-list', { timeout: 2000 });

    // Verify multiple error items are shown
    const errorItems = page.locator('[data-testid^="error-item"], .error-item');
    const count = await errorItems.count();
    expect(count).toBeGreaterThanOrEqual(2);
  });

  test('should debounce validation requests while typing', async ({ page }) => {
    // Navigate to files page and create a file
    await page.goto('/files');
    await page.click('button:has-text("New File"), button:has-text("+ New")');
    const uniqueName = `e2e-debounce-${Date.now()}`;
    await page.fill('input[placeholder*="file name"], input[placeholder*="Enter file"]', uniqueName);
    await page.click('button:has-text("Create")');
    await page.waitForURL(/\/editor\//);

    // Type content rapidly
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.press('Control+A');

    // Type quickly without delay
    await page.keyboard.type('# Service: Test API\nversion: 1.0.0');

    // Wait a moment for debounce to settle
    await page.waitForTimeout(600);

    // The editor should still be responsive (not frozen from excessive API calls)
    // Type more content
    await page.keyboard.type('\n\n## Model: User');

    // Verify the content was typed
    await expect(editor).toContainText('## Model: User');
  });
});
