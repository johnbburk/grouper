import { test, expect } from '@playwright/test';
import { faker } from '@faker-js/faker';
import { db } from '$lib/server/db';
import { classes, students } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

test.describe('Roster Management', () => {
      const CLASS_ID = '1';

      // Clean up before and after all tests
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

      test.afterAll(async () => {
            console.log('Cleaning up after tests...');
            await db.delete(students).where(eq(students.classId, parseInt(CLASS_ID)));
            await db.delete(classes).where(eq(classes.id, parseInt(CLASS_ID)));
      });

      test('should import roster of 20 students', async ({ page }) => {
            // Generate 20 fake students
            const fakeStudents = Array.from({ length: 20 }, () => ({
                  firstName: faker.person.firstName(),
                  lastName: faker.person.lastName()
            }));

            // Create the student list as text
            const studentList = fakeStudents
                  .map(s => `${s.firstName} ${s.lastName}`)
                  .join('\n');

            // Navigate to roster page
            console.log('Navigating to roster page...');
            await page.goto(`/class/${CLASS_ID}/roster`);
            await page.waitForLoadState('networkidle');

            // Paste student list and import
            console.log('Importing students...');
            await page.getByPlaceholder('Enter student names (one per line): FirstName LastName').fill(studentList);
            await page.getByRole('button', { name: /Import Students/i }).click();

            // Wait for and verify students in the list
            console.log('Verifying students appear in list...');
            const rosterList = page.locator('ul').first(); // Renamed to avoid conflict

            for (const student of fakeStudents) {
                  const studentName = `${student.lastName}, ${student.firstName}`;
                  await expect(
                        rosterList.getByText(studentName, { exact: true })
                  ).toBeVisible({ timeout: 10000 });
            }

            // Verify final count in database
            console.log('Verifying database...');
            const dbStudents = await db.select().from(students)
                  .where(eq(students.classId, parseInt(CLASS_ID)));
            expect(dbStudents.length).toBe(20);
      });
}); 