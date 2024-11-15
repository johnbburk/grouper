import { db } from '$lib/server/db';
import { students, classes } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function load({ params }) {
      const classId = parseInt(params.id);

      try {
            // Get the class details
            const [classData] = await db
                  .select()
                  .from(classes)
                  .where(eq(classes.id, classId));

            // Get all students in this class
            const studentList = await db
                  .select()
                  .from(students)
                  .where(eq(students.classId, classId));

            return {
                  class: classData,
                  students: studentList
            };
      } catch (error) {
            console.error('Error loading class data:', error);
            return {
                  class: null,
                  students: []
            };
      }
} 