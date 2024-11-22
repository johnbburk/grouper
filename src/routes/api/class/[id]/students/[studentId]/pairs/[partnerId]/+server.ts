import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { eq, and, or } from 'drizzle-orm';
import { pairingMatrix } from '$lib/server/db/schema';

export const GET: RequestHandler = async ({ params }) => {
      try {
            const { id: classId, studentId, partnerId } = params;

            // Query the pairing matrix - need to check both directions since 
            // the pair could be stored as (student1, student2) or (student2, student1)
            const pairs = await db
                  .select({
                        pairCount: pairingMatrix.pairCount
                  })
                  .from(pairingMatrix)
                  .where(
                        and(
                              eq(pairingMatrix.classId, parseInt(classId)),
                              or(
                                    and(
                                          eq(pairingMatrix.studentId1, parseInt(studentId)),
                                          eq(pairingMatrix.studentId2, parseInt(partnerId))
                                    ),
                                    and(
                                          eq(pairingMatrix.studentId1, parseInt(partnerId)),
                                          eq(pairingMatrix.studentId2, parseInt(studentId))
                                    )
                              )
                        )
                  );

            // Get the pair count directly from the matrix
            const pairCount = pairs[0]?.pairCount ?? 0;
            console.log('Found pair count:', {
                  classId,
                  studentId,
                  partnerId,
                  pairCount
            });

            return json({ pairCount });
      } catch (e) {
            console.error('Error fetching pair count:', e);
            throw error(500, 'Failed to fetch pair count');
      }
}; 