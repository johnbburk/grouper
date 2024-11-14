import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getPairCount } from '$lib/server/db';

export const GET: RequestHandler = async ({ params }) => {
      const pairCount = await getPairCount(
            parseInt(params.id),
            parseInt(params.studentId),
            parseInt(params.partnerId)
      );

      return json({ pairCount });
}; 