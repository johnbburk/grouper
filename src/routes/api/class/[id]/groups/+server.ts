import { json } from '@sveltejs/kit';
import { createGroups } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
      try {
            const { groupSize, studentIds } = await request.json();
            console.log('Received request:', { groupSize, studentIds });

            if (!studentIds.length) {
                  return json({ error: 'No students selected' }, { status: 400 });
            }

            const result = await createGroups(parseInt(params.id), groupSize, studentIds);
            console.log('Created groups:', result);
            return json(result);
      } catch (error) {
            console.error('Error creating groups:', error);
            return new Response(
                  JSON.stringify({
                        error: 'Failed to create groups',
                        details: error instanceof Error ? error.message : 'Unknown error'
                  }),
                  {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                  }
            );
      }
}; 