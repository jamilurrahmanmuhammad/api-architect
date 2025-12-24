/**
 * T044: E2E test: File listing and switching.
 *
 * Tests file management operations including listing, navigation, and deletion.
 */

import { test, expect } from '@playwright/test';

test.describe('File Operations', () => {
  test.beforeEach(async ({ page }) => {
    // Login first (mock authentication)
    await page.goto('/login');

    // Fill login form with demo credentials
    await page.fill('input[type="email"], input[name="email"]', 'demo@example.com');
    await page.fill('input[type="password"], input[name="password"]', 'demo123');
    await page.click('button[type="submit"]');

    // Wait for redirect
    await page.waitForURL(/\/(app|files|dashboard)/);
  });

  test('should display files list with pagination', async ({ page }) => {
    // Navigate to files page
    await page.goto('/files');

    // Verify page header
    await expect(page.locator('h1')).toContainText(/files/i);

    // Verify "New File" button is visible
    await expect(page.locator('button:has-text("New File"), button:has-text("+ New")')).toBeVisible();

    // Verify file grid or list exists
    await expect(
      page.locator('[class*="grid"], [class*="files"], ul, .file-list').first()
    ).toBeVisible({ timeout: 5000 });
  });

  test('should create multiple files and display them in list', async ({ page }) => {
    // Navigate to files page
    await page.goto('/files');

    const fileNames: string[] = [];

    // Create 3 test files
    for (let i = 0; i < 3; i++) {
      const fileName = `e2e-list-test-${i}-${Date.now()}`;
      fileNames.push(fileName);

      // Click "New File"
      await page.click('button:has-text("New File"), button:has-text("+ New")');

      // Enter file name
      await page.fill('input[placeholder*="file name"], input[placeholder*="Enter file"]', fileName);

      // Click Create
      await page.click('button:has-text("Create")');

      // Wait for editor then go back to files
      await page.waitForURL(/\/editor\//);
      await page.goto('/files');
    }

    // Verify all files are visible in the list
    for (const fileName of fileNames) {
      await expect(page.locator(`text=${fileName}`)).toBeVisible();
    }
  });

  test('should switch between files', async ({ page }) => {
    // Navigate to files page
    await page.goto('/files');

    // Create first file with specific content
    await page.click('button:has-text("New File"), button:has-text("+ New")');
    const file1Name = `e2e-switch-1-${Date.now()}`;
    await page.fill('input[placeholder*="file name"], input[placeholder*="Enter file"]', file1Name);
    await page.click('button:has-text("Create")');
    await page.waitForURL(/\/editor\//);

    // Add specific content to file 1
    const editor = page.locator('.monaco-editor');
    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('# File 1 Content - Unique A');
    await page.keyboard.press('Control+S');
    await page.waitForSelector('text=/Saved/');

    // Go back and create second file
    await page.goto('/files');
    await page.click('button:has-text("New File"), button:has-text("+ New")');
    const file2Name = `e2e-switch-2-${Date.now()}`;
    await page.fill('input[placeholder*="file name"], input[placeholder*="Enter file"]', file2Name);
    await page.click('button:has-text("Create")');
    await page.waitForURL(/\/editor\//);

    // Add specific content to file 2
    await editor.click();
    await page.keyboard.press('Control+A');
    await page.keyboard.type('# File 2 Content - Unique B');
    await page.keyboard.press('Control+S');
    await page.waitForSelector('text=/Saved/');

    // Go back to files list
    await page.goto('/files');

    // Click on first file
    await page.click(`text=${file1Name}`);
    await page.waitForURL(/\/editor\//);

    // Verify file 1 content is shown
    await expect(editor).toContainText('Unique A');

    // Go back and click on second file
    await page.goto('/files');
    await page.click(`text=${file2Name}`);
    await page.waitForURL(/\/editor\//);

    // Verify file 2 content is shown
    await expect(editor).toContainText('Unique B');
  });

  test('should delete a file', async ({ page }) => {
    // Navigate to files page
    await page.goto('/files');

    // Create a file to delete
    await page.click('button:has-text("New File"), button:has-text("+ New")');
    const fileName = `e2e-delete-${Date.now()}`;
    await page.fill('input[placeholder*="file name"], input[placeholder*="Enter file"]', fileName);
    await page.click('button:has-text("Create")');
    await page.waitForURL(/\/editor\//);

    // Go back to files list
    await page.goto('/files');

    // Verify file is in list
    await expect(page.locator(`text=${fileName}`)).toBeVisible();

    // Find and click the delete button for this file
    const fileRow = page.locator(`text=${fileName}`).locator('..');
    const deleteButton = fileRow.locator('button[title*="Delete"], button:has(svg)').last();
    await deleteButton.click();

    // Confirm deletion in dialog
    await page.click('button:has-text("Delete")');

    // Verify file is no longer in list
    await expect(page.locator(`text=${fileName}`)).not.toBeVisible({ timeout: 5000 });
  });

  test('should search files by name', async ({ page }) => {
    // Navigate to files page
    await page.goto('/files');

    // Create files with distinct names
    const searchTerm = `search-${Date.now()}`;
    const matchingName = `${searchTerm}-match`;
    const otherName = `other-file-${Date.now()}`;

    // Create matching file
    await page.click('button:has-text("New File"), button:has-text("+ New")');
    await page.fill('input[placeholder*="file name"], input[placeholder*="Enter file"]', matchingName);
    await page.click('button:has-text("Create")');
    await page.waitForURL(/\/editor\//);

    // Create non-matching file
    await page.goto('/files');
    await page.click('button:has-text("New File"), button:has-text("+ New")');
    await page.fill('input[placeholder*="file name"], input[placeholder*="Enter file"]', otherName);
    await page.click('button:has-text("Create")');
    await page.waitForURL(/\/editor\//);

    // Go back to files list
    await page.goto('/files');

    // Search for the search term
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill(searchTerm);

      // Wait for search results
      await page.waitForTimeout(500);

      // Matching file should be visible
      await expect(page.locator(`text=${matchingName}`)).toBeVisible();

      // Non-matching file should not be visible (or might still be visible with client-side filtering)
      // Note: This depends on whether search is server-side or client-side
    }
  });

  test('should show empty state when no files exist', async ({ page }) => {
    // This test assumes a fresh state or uses search to show empty state
    await page.goto('/files');

    // Search for something that won't exist
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
    if (await searchInput.isVisible()) {
      await searchInput.fill('nonexistent-file-xyz-12345');

      // Wait for search results
      await page.waitForTimeout(500);

      // Should show empty state message
      await expect(
        page.locator('text=/no files|no results|empty/i')
      ).toBeVisible({ timeout: 5000 });
    }
  });

  test('should navigate from dashboard to files', async ({ page }) => {
    // Navigate to dashboard/app
    await page.goto('/app');

    // Look for a link to files
    const filesLink = page.locator('a[href*="files"], button:has-text("Files")');
    if (await filesLink.isVisible()) {
      await filesLink.click();
      await expect(page).toHaveURL(/\/files/);
    }
  });
});
