import { json } from '@sveltejs/kit';
import { addClass } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
      const { name } = await request.json();

      try {
            const result = await addClass(name);
            return json(result);
      } catch (error) {
            console.error('Error adding class:', error);
            return new Response(
                  JSON.stringify({ error: 'Failed to add class' }),
                  {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                  }
            );
      }
}; 