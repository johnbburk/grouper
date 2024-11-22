import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { students } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
      try {
            const classStudents = await db
                  .select()
                  .from(students)
                  .where(eq(students.classId, parseInt(params.id)));

            return json(classStudents);
      } catch (error) {
            console.error('Error fetching students:', error);
            return json({ error: 'Failed to fetch students' }, { status: 500 });
      }
};

export async function POST({ params, request }) {
      try {
            const { studentList } = await request.json();
            const classId = parseInt(params.id);

            // Split the input into lines and process each line
            const studentNames = studentList.split('\n')
                  .map(line => line.trim())
                  .filter(line => line.length > 0);

            // Process each student name
            for (const fullName of studentNames) {
                  const [firstName, lastName] = fullName.split(' ').map(s => s.trim());
                  if (firstName && lastName) {
                        await db.insert(students).values({
                              firstName,
                              lastName,
                              classId,
                              groupingHistory: '[]',
                              nonStandardGroupings: 0
                        });
                  }
            }

            return json({ success: true });
      } catch (error) {
            console.error('Error importing students:', error);
            return json({ error: 'Failed to import students' }, { status: 500 });
      }
}

export async function DELETE({ params }) {
      const studentId = parseInt(params.studentId);

      try {
            await db.delete(students)
                  .where(eq(students.id, studentId));

            return json({ success: true });
      } catch (error) {
            console.error('Error deleting student:', error);
            return json({ error: 'Failed to delete student' }, { status: 500 });
      }
} 