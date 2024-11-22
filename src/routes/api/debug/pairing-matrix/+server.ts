import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { pairingMatrix } from '$lib/server/db/schema';

export const GET: RequestHandler = async () => {
      try {
            const matrix = await db.select().from(pairingMatrix);
            return json({
                  count: matrix.length,
                  entries: matrix
            });
      } catch (e) {
            console.error('Error fetching pairing matrix:', e);
            return json({ error: 'Failed to fetch pairing matrix' }, { status: 500 });
      }
}; 