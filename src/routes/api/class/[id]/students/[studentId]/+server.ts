import { json } from '@sveltejs/kit';
import { db, deleteStudent } from '$lib/server/db';
import type { RequestHandler } from './$types';
import { students } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

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