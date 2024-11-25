import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { db } from '$lib/server/db';
import { classes, students } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

test.setTimeout(60000); // Set timeout to 60 seconds

test.describe('Roster Management', () => {
      const CLASS_ID = '1';
      let fakeStudents: { firstName: string; lastName: string; }[];

      test.beforeAll(async () => {
            console.log('Cleaning up test data...');
            await db.delete(students).where(eq(students.classId, parseInt(CLASS_ID)));
            await db.delete(classes).where(eq(classes.id, parseInt(CLASS_ID)));

            console.log('Creating test class...');
            await db.insert(classes).values({
                  id: parseInt(CLASS_ID),
                  name: 'Test Class'
            });
      });

      test.beforeEach(async ({ page }) => {
            // Generate 20 fake students
            fakeStudents = Array.from({ length: 20 }, () => ({
                  firstName: faker.person.firstName(),
                  lastName: faker.person.lastName()
            }));

            const studentList = fakeStudents
                  .map(s => `${s.firstName} ${s.lastName}`)
                  .join('\n');

            // Import students
            await page.goto(`/class/${CLASS_ID}/roster`);
            await page.waitForLoadState('networkidle');

            await page.getByPlaceholder('Enter student names (one per line): FirstName LastName').fill(studentList);
            await page.getByRole('button', { name: /Import Students/i }).click();

            // Wait for first student to appear
            const firstStudent = `${fakeStudents[0].lastName}, ${fakeStudents[0].firstName}`;
            await page.locator('ul').first()
                  .getByText(firstStudent, { exact: true })
                  .waitFor({ state: 'visible', timeout: 10000 });
      });

      test.afterAll(async () => {
            console.log('Cleaning up after tests...');
            await db.delete(students).where(eq(students.classId, parseInt(CLASS_ID)));
            await db.delete(classes).where(eq(classes.id, parseInt(CLASS_ID)));
      });

      test('should import roster of 20 students', async ({ page }) => {
            const rosterList = page.locator('ul').first();

            // Verify all students are visible
            for (const student of fakeStudents) {
                  const studentName = `${student.lastName}, ${student.firstName}`;
                  await expect(
                        rosterList.getByText(studentName, { exact: true })
                  ).toBeVisible();
            }

            // Verify database count
            const dbStudents = await db.select().from(students)
                  .where(eq(students.classId, parseInt(CLASS_ID)));
            expect(dbStudents.length).toBe(20);
      });

      test('should create and clear groupings', async ({ page }) => {
            // Navigate to groups page
            await page.goto(`/class/${CLASS_ID}/groups`);
            await page.waitForLoadState('networkidle');

            // Create initial random groups
            const createRandomButton = page.getByRole('button', { name: 'Create Random Groups' });
            await expect(createRandomButton).toBeVisible({ timeout: 10000 });
            await createRandomButton.click();

            // Wait for groups to be displayed
            await expect(page.getByText('Current Groups')).toBeVisible({ timeout: 10000 });
            await expect(page.getByRole('heading', { name: 'Group 1', exact: true })).toBeVisible({ timeout: 10000 });

            // Save first group set
            const saveButton = page.getByRole('button', { name: 'Save Groups' });
            await expect(saveButton).toBeVisible({ timeout: 10000 });
            await expect(saveButton).toBeEnabled({ timeout: 10000 });
            await saveButton.click();
            await expect(page.getByText('Groups saved successfully!')).toBeVisible();

            // Re-randomize groups
            const reRandomizeButton = page.getByRole('button', { name: 'Re-Randomize Groups' });
            await expect(reRandomizeButton).toBeVisible({ timeout: 10000 });
            await expect(reRandomizeButton).toBeEnabled({ timeout: 10000 });
            await reRandomizeButton.click();

            // Save second group set
            await expect(saveButton).toBeVisible({ timeout: 10000 });
            await expect(saveButton).toBeEnabled({ timeout: 10000 });
            await saveButton.click();
            await expect(page.getByText('Groups saved')).toBeVisible();

            // Clear groupings from roster page
            console.log('Navigating back to roster page...');
            await page.goto(`/class/${CLASS_ID}/roster`);
            await page.waitForLoadState('networkidle');

            // Handle the confirmation dialog
            page.once('dialog', async dialog => {
                  expect(dialog.message()).toBe('Are you sure you want to clear all previous groups? This cannot be undone.');
                  await dialog.accept();
            });

            // Wait for and click the clear button
            const clearButton = page.getByRole('button', { name: 'Clear All Previous Groups' });
            await expect(clearButton).toBeVisible({ timeout: 10000 });
            await expect(clearButton).toBeEnabled({ timeout: 10000 });
            await clearButton.click();

            // Handle the success dialog
            page.once('dialog', async dialog => {
                  expect(dialog.message()).toBe('Group history cleared successfully');
                  await dialog.accept();
            });

            // Now navigate to groups page
            await page.goto(`/class/${CLASS_ID}/groups`);
            await page.waitForLoadState('networkidle');

            // Wait for the student list to be visible
            const firstStudent = `${fakeStudents[0].lastName}, ${fakeStudents[0].firstName}`;
            await expect(page.getByText(firstStudent)).toBeVisible({ timeout: 10000 });

            // Click on first student's history link
            await page.getByText('History').first().click();

            // Wait for and verify modal content
            await expect(page.getByText(/History for/)).toBeVisible({ timeout: 10000 });
            await expect(page.getByText('Times in non-standard groups: 0')).toBeVisible();
            await expect(page.getByText('Never Grouped With:')).toBeVisible();
            await expect(page.getByText('Previous Groupmates:')).not.toBeVisible();
      });
}); 