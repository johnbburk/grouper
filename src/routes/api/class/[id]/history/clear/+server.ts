import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { students, studyGroups, groupAssignments, pairingMatrix } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import type { RequestEvent } from './$types';

export async function POST({ params }: RequestEvent) {
      const classId = parseInt(params.id);

      try {
            // Delete all group assignments for this class's groups
            await db.delete(groupAssignments)
                  .where(
                        eq(groupAssignments.groupId,
                              db.select({ id: studyGroups.id })
                                    .from(studyGroups)
                                    .where(eq(studyGroups.classId, classId))
                                    .limit(1)
                        )
                  );

            // Delete all study groups for this class
            await db.delete(studyGroups)
                  .where(eq(studyGroups.classId, classId));

            // Delete all pairing matrix entries for this class
            await db.delete(pairingMatrix)
                  .where(eq(pairingMatrix.classId, classId));

            // Reset non-standard groupings count for all students in this class
            await db.update(students)
                  .set({ nonStandardGroupings: 0 })
                  .where(eq(students.classId, classId));

            return json({ success: true });
      } catch (error) {
            console.error('Error clearing class history:', error);
            return json({ error: 'Failed to clear class history' }, { status: 500 });
      }
} 