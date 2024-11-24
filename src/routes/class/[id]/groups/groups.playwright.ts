import { test, expect } from '@playwright/test';
import { db } from '$lib/server/db';
import { students, classes } from '$lib/server/db/schema';

test.describe('Group Management', () => {
      const CLASS_ID = '1';

      // Set up test data in the actual database
      test.beforeAll(async () => {
            await db.insert(classes).values({
                  id: parseInt(CLASS_ID),
                  name: 'Test Class'
            });

            await db.insert(students).values([
                  { id: 1, firstName: 'John', lastName: 'Doe', classId: parseInt(CLASS_ID) },
                  { id: 2, firstName: 'Jane', lastName: 'Smith', classId: parseInt(CLASS_ID) },
                  { id: 3, firstName: 'Bob', lastName: 'Johnson', classId: parseInt(CLASS_ID) }
            ]);
      });

      // Clean up after tests
      test.afterAll(async () => {
            await db.delete(students).where(eq(students.classId, parseInt(CLASS_ID)));
            await db.delete(classes).where(eq(classes.id, parseInt(CLASS_ID)));
      });

      test.beforeEach(async ({ page }) => {
            // Just navigate to the page - no mocking needed
            await page.goto(`/class/${CLASS_ID}/groups`);

            // Wait for students to be visible
            const checkboxes = await page.locator('input[type="checkbox"]').count();
            expect(checkboxes).toBeGreaterThan(0);
      });

      test('should create a new group', async ({ page }) => {
            // Debug: Verify roster is loaded using checkboxes
            const studentCount = await page.locator('input[type="checkbox"]').count();
            expect(studentCount).toBeGreaterThan(0);

            // Now check the button
            const createButton = page.getByRole('button', { name: /create/i });
            console.log('Button state before wait:', await createButton.isEnabled());

            // Wait for button with longer timeout and debug info
            await expect(createButton).toBeEnabled({ timeout: 10000 });

            await createButton.click();

            // Fill in group details
            await page.getByLabel(/name/i).fill('Test Group 1');
            await page.getByRole('button', { name: /save/i }).click();

            // Verify the group was created
            await expect(page.getByText('Test Group 1')).toBeVisible();
      });

      test('should display empty state when no groups exist', async ({ page }) => {
            // Mock empty groups response
            await page.route('**/api/class/*/groups', (route) => {
                  route.fulfill({
                        status: 200,
                        body: JSON.stringify([])
                  });
            });

            // Reload to get the empty state
            await page.reload();
            await page.waitForLoadState('networkidle');

            // Check for empty state message (adjust the text to match your actual UI)
            await expect(page.getByText(/no groups/i)).toBeVisible();
      });

      test('should allow dragging students between groups', async ({ page }) => {
            // Create first group
            await page.getByRole('button', { name: /create/i }).click();
            await page.getByLabel(/name/i).fill('Group A');
            await page.getByRole('button', { name: /save/i }).click();

            // Create second group
            await page.getByRole('button', { name: /create/i }).click();
            await page.getByLabel(/name/i).fill('Group B');
            await page.getByRole('button', { name: /save/i }).click();

            // Wait for students to be loaded (using checkboxes)
            await page.waitForSelector('input[type="checkbox"]');

            // Get first student checkbox and its label
            const studentCheckbox = page.locator('input[type="checkbox"]').first();
            const targetGroup = page.locator('.group-container').nth(1);

            // Store student name for verification
            const studentLabel = await studentCheckbox.locator('xpath=..').textContent();

            // Perform drag and drop
            await studentCheckbox.dragTo(targetGroup);

            // Verify student is in new group
            await expect(targetGroup.getByText(studentLabel || '')).toBeVisible();
      });

      test('should show group score indicator', async ({ page }) => {
            // Create a group with multiple students
            await page.getByRole('button', { name: /create group/i }).click();
            // Add students to group...

            // Verify score indicator is visible
            await expect(page.locator('.group-score')).toBeVisible();
      });

      test('should allow quick group creation', async ({ page }) => {
            await page.getByRole('button', { name: /quick groups/i }).click();
            await page.getByLabel('Number of Groups').fill('3');
            await page.getByRole('button', { name: /generate/i }).click();

            // Verify 3 groups were created
            await expect(page.locator('.group-container')).toHaveCount(3);
      });

      test('should show warning for uneven groups', async ({ page }) => {
            await page.getByRole('button', { name: /quick groups/i }).click();
            // Create uneven groups...

            await expect(page.getByText(/groups are uneven/i)).toBeVisible();
      });

      test('should persist groups after page reload', async ({ page }) => {
            // Create a group
            await page.getByRole('button', { name: /create group/i }).click();
            await page.getByLabel('Group Name').fill('Persistent Group');
            await page.getByRole('button', { name: /save/i }).click();

            // Reload page
            await page.reload();

            // Verify group still exists
            await expect(page.getByText('Persistent Group')).toBeVisible();
      });

      test('should handle error states gracefully', async ({ page }) => {
            // Create a group first
            await page.getByRole('button', { name: /create/i }).click();
            await page.getByLabel(/name/i).fill('Test Group');
            await page.getByRole('button', { name: /save/i }).click();

            // Mock error response for saving groups
            await page.route('**/api/class/*/groups/save', route => route.abort());

            // Try to save groups
            const saveButton = page.getByRole('button', { name: /save groups/i });
            await expect(saveButton).toBeEnabled();
            await saveButton.click();

            // Verify error message
            await expect(page.getByText(/error.*saving/i)).toBeVisible();
      });

      test('should show loading states', async ({ page }) => {
            // Slow down API response
            await page.route('**/api/class/*/groups', async route => {
                  await new Promise(resolve => setTimeout(resolve, 1000));
                  await route.continue();
            });

            await page.getByRole('button', { name: /save groups/i }).click();

            // Verify loading indicator is shown
            await expect(page.getByRole('progressbar')).toBeVisible();
      });
}); 