import { json } from '@sveltejs/kit';
import { getPairCount } from '$lib/server/db';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ params, request }) => {
      try {
            const { studentIds } = await request.json();
            let score = 0;

            // Calculate score based on pair counts
            for (let i = 0; i < studentIds.length; i++) {
                  for (let j = i + 1; j < studentIds.length; j++) {
                        const pairCount = await getPairCount(
                              parseInt(params.id),
                              studentIds[i],
                              studentIds[j]
                        );
                        score += pairCount;
                  }
            }

            return json({ score });
      } catch (error) {
            console.error('Error calculating group score:', error);
            return json({ error: 'Failed to calculate score' }, { status: 500 });
      }
}; 