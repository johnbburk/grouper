import { json } from '@sveltejs/kit';
import { clearDatabase } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async () => {
      try {
            await clearDatabase();
            return json({ success: true });
      } catch (error) {
            console.error('Error clearing database:', error);
            return new Response(
                  JSON.stringify({ error: 'Failed to clear database' }),
                  {
                        status: 500,
                        headers: { 'Content-Type': 'application/json' }
                  }
            );
      }
}; 