import { json } from '@sveltejs/kit';
import { getStudentHistory } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
      try {
            const history = await getStudentHistory(
                  parseInt(params.studentId),
                  parseInt(params.id)
            );
            return json(history);
      } catch (error) {
            console.error('Error getting student history:', error);
            return new Response(
                  JSON.stringify({ error: 'Failed to get student history' }),
                  {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                  }
            );
      }
}; 