import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { pairingMatrix } from '$lib/server/db/schema';
import { and, or, eq } from 'drizzle-orm';

export async function GET({ params }) {
      const { id: classId, studentId, partnerId } = params;

      const pairs = await db.query.pairingMatrix.findFirst({
            where: or(
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
      });

      // Ensure we never return a negative value
      const pairCount = pairs ? Math.max(0, pairs.pairCount) : 0;

      return json({ pairCount });
} 