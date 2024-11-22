import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { pairingMatrix, studentPairs } from '$lib/server/db/schema';
import { eq, and, or } from 'drizzle-orm';

export const POST: RequestHandler = async ({ params, request }) => {
      try {
            const { groups, nonStandardStudentIds } = await request.json();
            const classId = parseInt(params.id);

            for (const group of groups) {
                  const students = group.students;

                  for (let i = 0; i < students.length; i++) {
                        for (let j = i + 1; j < students.length; j++) {
                              const student1Id = students[i].id;
                              const student2Id = students[j].id;

                              const existingEntry = await db
                                    .select()
                                    .from(pairingMatrix)
                                    .where(
                                          and(
                                                eq(pairingMatrix.classId, classId),
                                                or(
                                                      and(
                                                            eq(pairingMatrix.studentId1, student1Id),
                                                            eq(pairingMatrix.studentId2, student2Id)
                                                      ),
                                                      and(
                                                            eq(pairingMatrix.studentId1, student2Id),
                                                            eq(pairingMatrix.studentId2, student1Id)
                                                      )
                                                )
                                          )
                                    )
                                    .limit(1);

                              if (existingEntry.length > 0) {
                                    await db
                                          .update(pairingMatrix)
                                          .set({
                                                pairCount: existingEntry[0].pairCount + 1,
                                                lastPaired: new Date().toISOString()
                                          })
                                          .where(eq(pairingMatrix.id, existingEntry[0].id));
                              } else {
                                    await db.insert(pairingMatrix).values({
                                          classId,
                                          studentId1: student1Id,
                                          studentId2: student2Id,
                                          pairCount: 1,
                                          lastPaired: new Date().toISOString()
                                    });
                              }
                        }
                  }
            }

            return json({ success: true });
      } catch (e) {
            console.error('Error saving groups:', e);
            throw error(500, 'Failed to save groups');
      }
}; 