import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { students, pairingMatrix } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ params }) => {
      try {
            const classId = parseInt(params.id);

            // First, clear all pairing matrix entries for this class
            await db
                  .delete(pairingMatrix)
                  .where(eq(pairingMatrix.classId, classId));

            // Get all students in the class
            const classStudents = await db
                  .select()
                  .from(students)
                  .where(eq(students.classId, classId));

            // Reset each student's history individually
            for (const student of classStudents) {
                  await db
                        .update(students)
                        .set({
                              groupingHistory: '[]',
                              nonStandardGroupings: 0
                        })
                        .where(eq(students.id, student.id));
            }

            // Verify the clear operation
            const verifyStudents = await db
                  .select()
                  .from(students)
                  .where(eq(students.classId, classId));

            const verifyMatrix = await db
                  .select()
                  .from(pairingMatrix)
                  .where(eq(pairingMatrix.classId, classId));

            console.log('Clear operation results:', {
                  studentsCleared: verifyStudents.every(s => s.groupingHistory === '[]'),
                  matrixCleared: verifyMatrix.length === 0
            });

            return json({
                  success: true,
                  cleared: {
                        students: classStudents.length,
                        pairingMatrix: true
                  }
            });
      } catch (e) {
            console.error('Error clearing group history:', e);
            throw error(500, 'Failed to clear group history');
      }
}; 