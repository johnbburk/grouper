import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { pairingMatrix, students as studentsTable } from '$lib/server/db/schema';
import { eq, and, or } from 'drizzle-orm';

export const POST: RequestHandler = async ({ params, request }) => {
      try {
            const { groups, nonStandardStudentIds } = await request.json();
            const classId = parseInt(params.id);
            const timestamp = new Date().toISOString();

            for (const group of groups) {
                  const groupStudents = group.students;

                  for (const student of groupStudents) {
                        const currentStudent = await db
                              .select()
                              .from(studentsTable)
                              .where(eq(studentsTable.id, student.id))
                              .limit(1);

                        if (currentStudent.length > 0) {
                              const history = JSON.parse(currentStudent[0].groupingHistory || '[]');

                              // Create a more detailed group history entry
                              const groupEntry = {
                                    id: group.id,
                                    name: group.name,
                                    date: timestamp,
                                    members: groupStudents
                                          .filter(s => s.id !== student.id)
                                          .map(s => `${s.lastName}, ${s.firstName}`),
                                    allMembers: groupStudents.map(s => ({
                                          id: s.id,
                                          name: `${s.lastName}, ${s.firstName}`
                                    })),
                                    size: groupStudents.length
                              };

                              history.push(groupEntry);

                              await db
                                    .update(studentsTable)
                                    .set({ groupingHistory: JSON.stringify(history) })
                                    .where(eq(studentsTable.id, student.id));
                        }
                  }

                  // Update pairing matrix
                  for (let i = 0; i < groupStudents.length; i++) {
                        for (let j = i + 1; j < groupStudents.length; j++) {
                              const student1Id = groupStudents[i].id;
                              const student2Id = groupStudents[j].id;

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
                                                lastPaired: timestamp
                                          })
                                          .where(eq(pairingMatrix.id, existingEntry[0].id));
                              } else {
                                    await db.insert(pairingMatrix).values({
                                          classId,
                                          studentId1: student1Id,
                                          studentId2: student2Id,
                                          pairCount: 1,
                                          lastPaired: timestamp
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