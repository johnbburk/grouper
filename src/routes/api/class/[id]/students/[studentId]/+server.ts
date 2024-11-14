import { json } from '@sveltejs/kit';
import { deleteStudent } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = async ({ params }) => {
      try {
            await deleteStudent(parseInt(params.studentId));
            return json({ success: true });
      } catch (error) {
            console.error('Error deleting student:', error);
            return new Response(
                  JSON.stringify({ error: 'Failed to delete student' }),
                  {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                  }
            );
      }
}; 