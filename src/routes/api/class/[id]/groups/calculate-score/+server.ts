import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPairCount } from '$lib/server/db';

export const POST: RequestHandler = async ({ params, request }) => {
      const { studentIds, pairMatrix } = await request.json();
      let score = 0;

      console.log('Calculating score for group:', studentIds);

      // Calculate score based on all pairs in the group
      for (let i = 0; i < studentIds.length; i++) {
            for (let j = i + 1; j < studentIds.length; j++) {
                  const [id1, id2] = [studentIds[i], studentIds[j]].sort((a, b) => a - b);
                  const key = `${id1}-${id2}`;
                  const pairCount = pairMatrix.get(key) || 0;

                  console.log(`Checking pair: ${id1} with ${id2}, pair count: ${pairCount}`);
                  score += pairCount;
            }
      }

      console.log('Final score for group:', score);
      return json({ score });
}; 