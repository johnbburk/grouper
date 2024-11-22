import { json } from '@sveltejs/kit';
import { deleteStudent } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
      try {
            const studentId = parseInt(params.studentId);
            const success = await deleteStudent(studentId);

            if (success) {
                  return json({ success: true });
            } else {
                  return json({ error: 'Failed to delete student' }, { status: 500 });
            }
      } catch (error) {
            console.error('Error deleting student:', error);
            return json({ error: 'Failed to delete student' }, { status: 500 });
      }
}; 