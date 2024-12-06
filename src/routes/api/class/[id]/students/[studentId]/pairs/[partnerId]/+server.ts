import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { pairingMatrix } from '$lib/server/db/schema';
import { and, or, eq } from 'drizzle-orm';

export async function GET({ params }) {
      try {
            const { id: classId, studentId, partnerId } = params;

            const pairs = await db
                  .select()
                  .from(pairingMatrix)
                  .where(
                        or(
                              and(
                                    eq(pairingMatrix.classId, parseInt(classId)),
                                    eq(pairingMatrix.studentId1, parseInt(studentId)),
                                    eq(pairingMatrix.studentId2, parseInt(partnerId))
                              ),
                              and(
                                    eq(pairingMatrix.classId, parseInt(classId)),
                                    eq(pairingMatrix.studentId1, parseInt(partnerId)),
                                    eq(pairingMatrix.studentId2, parseInt(studentId))
                              )
                        )
                  )
                  .get();

            if (!pairs) {
                  return json({ pairCount: 0, lastPaired: null });
            }

            return json({
                  pairCount: Math.max(0, pairs.pairCount),
                  lastPaired: pairs.lastPaired
            });
      } catch (e) {
            console.error('Error fetching pair data:', e);
            return json({ pairCount: 0, lastPaired: null }, { status: 500 });
      }
} 