import { json } from '@sveltejs/kit';
import { saveGroups } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
      const { groups } = await request.json();

      try {
            const result = await saveGroups(parseInt(params.id), groups);
            return json(result);
      } catch (error) {
            console.error('Error saving groups:', error);
            return new Response(
                  JSON.stringify({ error: 'Failed to save groups' }),
                  {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                  }
            );
      }
}; 