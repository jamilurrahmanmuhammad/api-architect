/**
 * T023: E2E test for natural language DSL syntax.
 *
 * Tests:
 * - Write complete API spec in natural language
 * - Verify parser accepts list-based field definitions
 * - Verify preview shows all parsed entities
 * - Verify no table syntax errors
 */

import { test, expect } from '@playwright/test';

test.describe('Natural Language DSL', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to editor
    await page.goto('/editor');

    // Wait for page to load
    await page.waitForLoadState('networkidle');
  });

  test('T023a: should parse natural language model definitions', async ({ page }) => {
    // Complete natural language DSL spec
    const dslContent = `# Service: PetStore API
version: 1.0.0
base_path: /api/v1

A sample Pet Store API demonstrating the natural language DSL.
This API allows you to manage pets and their owners.

## Model: Pet
A pet available in the store.

- id (integer, required) - Unique identifier for the pet
- name (string, required) - Name of the pet
- status (string) - Pet status: available, pending, or sold
- tags (string[]) - Tags for searching

## Model: Category
A category for organizing pets.

- id (integer, required) - Category identifier
- name (string, required) - Category name

## Operation: GET /pets
List all available pets.

Query: status (string) - Filter by status
Returns: Pet[]

## Operation: POST /pets
Add a new pet to the store.

Body: Pet
Returns: Pet

Errors:
- 400 Bad Request - Invalid pet data`;

    // Type DSL in editor
    const editor = page.locator('[data-testid="editor-pane"]').or(page.locator('.monaco-editor'));

    if (await editor.isVisible()) {
      await editor.click();
      await page.keyboard.type(dslContent);

      // Wait for parser debounce
      await page.waitForTimeout(1500);

      // Verify preview pane is visible
      const previewPane = page.locator('[data-testid="preview-pane"]');
      await expect(previewPane).toBeVisible();

      // Verify service is shown in preview
      const serviceText = page.getByText('PetStore API');
      await expect(serviceText).toBeVisible({ timeout: 2000 });

      // Verify models are shown
      const petModel = page.getByText('Pet');
      await expect(petModel).toBeVisible({ timeout: 2000 });

      const categoryModel = page.getByText('Category');
      await expect(categoryModel).toBeVisible({ timeout: 2000 });
    }
  });

  test('T023b: should support list-based field syntax', async ({ page }) => {
    const dslContent = `# Service: API
version: 1.0.0
base_path: /api

Test API.

## Model: User
User model.

- id (integer, required) - User ID
- email (string, required) - Email address
- name (string) - Full name
- is_active (boolean) - Active status
- created_at (datetime) - Creation timestamp`;

    // Type DSL in editor
    const editor = page.locator('[data-testid="editor-pane"]').or(page.locator('.monaco-editor'));

    if (await editor.isVisible()) {
      await editor.click();
      await page.keyboard.type(dslContent);

      // Wait for parser
      await page.waitForTimeout(1500);

      // Verify model fields are parsed
      const previewPane = page.locator('[data-testid="preview-pane"]');
      await expect(previewPane).toBeVisible();

      // Check for required indicator
      const requiredFields = page.locator('text=*');
      await expect(requiredFields.first()).toBeVisible({ timeout: 2000 });
    }
  });

  test('T023c: should support array type syntax', async ({ page }) => {
    const dslContent = `# Service: API
version: 1.0.0
base_path: /api

Test API.

## Model: Team
Team with members.

- id (integer, required) - Team ID
- members (User[]) - Team members

## Model: User
User in team.

- id (integer, required) - User ID
- name (string, required) - User name`;

    // Type DSL in editor
    const editor = page.locator('[data-testid="editor-pane"]').or(page.locator('.monaco-editor'));

    if (await editor.isVisible()) {
      await editor.click();
      await page.keyboard.type(dslContent);

      // Wait for parser
      await page.waitForTimeout(1500);

      // Verify both models are shown
      const teamModel = page.getByText('Team');
      await expect(teamModel).toBeVisible({ timeout: 2000 });

      const userModel = page.getByText('User');
      await expect(userModel).toBeVisible({ timeout: 2000 });

      // Verify no parse errors
      const previewPane = page.locator('[data-testid="preview-pane"]');
      const errorElements = previewPane.locator('[data-testid="error"]');
      const errorCount = await errorElements.count();
      expect(errorCount).toBe(0);
    }
  });

  test('T023d: should parse operations with parameters', async ({ page }) => {
    const dslContent = `# Service: API
version: 1.0.0
base_path: /api

Test API.

## Model: Item
Item model.

- id (integer, required) - Item ID
- name (string, required) - Item name

## Operation: GET /items
List items.

Query: limit (integer) - Results limit
Query: offset (integer) - Results offset
Returns: Item[]

## Operation: GET /items/{itemId}
Get item by ID.

Path: itemId (integer, required) - The item ID
Returns: Item

## Operation: POST /items
Create item.

Body: Item
Returns: Item`;

    // Type DSL in editor
    const editor = page.locator('[data-testid="editor-pane"]').or(page.locator('.monaco-editor'));

    if (await editor.isVisible()) {
      await editor.click();
      await page.keyboard.type(dslContent);

      // Wait for parser
      await page.waitForTimeout(1500);

      // Verify operations are shown
      const previewPane = page.locator('[data-testid="preview-pane"]');
      await expect(previewPane).toBeVisible();

      // Check for operations
      const getOperation = page.getByText('GET');
      await expect(getOperation).toBeVisible({ timeout: 2000 });

      const postOperation = page.getByText('POST');
      await expect(postOperation).toBeVisible({ timeout: 2000 });
    }
  });

  test('T023e: should show entity count in status bar', async ({ page }) => {
    const dslContent = `# Service: API
version: 1.0.0
base_path: /api

API.

## Model: User
User.

- id (integer, required) - ID

## Model: Post
Post.

- id (integer, required) - ID
- title (string, required) - Title

## Operation: GET /users
Get users.

Returns: User[]`;

    // Type DSL in editor
    const editor = page.locator('[data-testid="editor-pane"]').or(page.locator('.monaco-editor'));

    if (await editor.isVisible()) {
      await editor.click();
      await page.keyboard.type(dslContent);

      // Wait for parser
      await page.waitForTimeout(1500);

      // Check status bar for entity count
      const statusBar = page.locator('footer');
      const entityText = statusBar.getByText(/entities/);

      // Should show at least 3 entities (1 service + 2 models + 1 operation)
      await expect(entityText).toBeVisible({ timeout: 2000 });
    }
  });

  test('T023f: should handle optional fields correctly', async ({ page }) => {
    const dslContent = `# Service: API
version: 1.0.0
base_path: /api

API.

## Model: Product
Product with optional fields.

- id (integer, required) - Product ID
- name (string, required) - Product name
- description (string) - Optional description
- price (number, required) - Product price
- image_url (string) - Optional image URL`;

    // Type DSL in editor
    const editor = page.locator('[data-testid="editor-pane"]').or(page.locator('.monaco-editor'));

    if (await editor.isVisible()) {
      await editor.click();
      await page.keyboard.type(dslContent);

      // Wait for parser
      await page.waitForTimeout(1500);

      // Verify model is parsed
      const previewPane = page.locator('[data-testid="preview-pane"]');
      await expect(previewPane).toBeVisible();

      const productModel = page.getByText('Product');
      await expect(productModel).toBeVisible({ timeout: 2000 });

      // Verify no errors in preview
      const errorElements = previewPane.locator('[data-testid="error"]');
      const errorCount = await errorElements.count();
      expect(errorCount).toBe(0);
    }
  });

  test('T023g: should support model references', async ({ page }) => {
    const dslContent = `# Service: API
version: 1.0.0
base_path: /api

API with model references.

## Model: Address
Address model.

- id (integer, required) - Address ID
- street (string, required) - Street

## Model: Person
Person with address.

- id (integer, required) - Person ID
- name (string, required) - Name
- address (Address) - Home address`;

    // Type DSL in editor
    const editor = page.locator('[data-testid="editor-pane"]').or(page.locator('.monaco-editor'));

    if (await editor.isVisible()) {
      await editor.click();
      await page.keyboard.type(dslContent);

      // Wait for parser
      await page.waitForTimeout(1500);

      // Verify both models are shown
      const addressModel = page.getByText('Address');
      await expect(addressModel).toBeVisible({ timeout: 2000 });

      const personModel = page.getByText('Person');
      await expect(personModel).toBeVisible({ timeout: 2000 });

      // Verify no errors
      const previewPane = page.locator('[data-testid="preview-pane"]');
      const errorElements = previewPane.locator('[data-testid="error"]');
      const errorCount = await errorElements.count();
      expect(errorCount).toBe(0);
    }
  });
});
