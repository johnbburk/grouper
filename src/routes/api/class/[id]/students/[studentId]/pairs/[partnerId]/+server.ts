import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { pairingMatrix } from '$lib/server/db/schema';
import { and, eq } from 'drizzle-orm';
import type { RequestEvent } from './$types';

export async function GET({ params }: RequestEvent) {
      const classId = parseInt(params.id);
      const student1Id = parseInt(params.studentId);
      const student2Id = parseInt(params.partnerId);

      try {
            // Try to find the pair count in either direction
            const [pairData] = await db
                  .select()
                  .from(pairingMatrix)
                  .where(
                        and(
                              eq(pairingMatrix.classId, classId),
                              eq(pairingMatrix.studentId1, student1Id),
                              eq(pairingMatrix.studentId2, student2Id)
                        )
                  );

            // If no record exists, check the reverse order
            if (!pairData) {
                  const [reversePairData] = await db
                        .select()
                        .from(pairingMatrix)
                        .where(
                              and(
                                    eq(pairingMatrix.classId, classId),
                                    eq(pairingMatrix.studentId1, student2Id),
                                    eq(pairingMatrix.studentId2, student1Id)
                              )
                        );

                  return json({
                        pairCount: reversePairData?.pairCount ?? 0,
                        lastPaired: reversePairData?.lastPaired ?? null
                  });
            }

            return json({
                  pairCount: pairData.pairCount,
                  lastPaired: pairData.lastPaired
            });
      } catch (error) {
            console.error('Error getting pair count:', error);
            return json({ error: 'Failed to get pair count' }, { status: 500 });
      }
} 