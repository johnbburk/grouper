import { json } from '@sveltejs/kit';
import { createGroups } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
      const { groupSize, studentIds } = await request.json();

      try {
            const result = await createGroups(parseInt(params.id), groupSize, studentIds);
            return json(result);
      } catch (error) {
            console.error('Error creating groups:', error);
            return new Response(
                  JSON.stringify({ error: 'Failed to create groups' }),
                  {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                  }
            );
      }
}; 