import { json } from '@sveltejs/kit';
import { addStudents } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
      const { studentList } = await request.json() as { studentList: string };

      try {
            const students = studentList
                  .split('\n')
                  .map((line: string) => line.trim())
                  .filter((line: string) => line.length > 0)
                  .map((line: string) => {
                        const [firstName, lastName] = line.split(' ');
                        return { firstName, lastName };
                  });

            const result = await addStudents(parseInt(params.id), students);
            return json(result);
      } catch (error) {
            console.error('Error importing students:', error);
            return new Response(JSON.stringify({ error: 'Failed to import students' }), {
                  status: 500,
                  headers: {
                        'Content-Type': 'application/json'
                  }
            });
      }
}; 