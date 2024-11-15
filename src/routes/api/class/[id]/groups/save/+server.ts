import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { students, pairingMatrix } from '$lib/server/db/schema';
import { eq, and } from 'drizzle-orm';
import type { RequestEvent } from './$types';

interface SaveGroupsRequest {
      groups: Array<{
            id: number;
            name: string;
            students: Array<{
                  id: number;
                  firstName: string;
                  lastName: string;
            }>;
      }>;
      nonStandardStudentIds: number[];
}

export async function POST({ params, request }: RequestEvent) {
      const classId = parseInt(params.id);
      const { groups, nonStandardStudentIds } = await request.json() as SaveGroupsRequest;

      try {
            // Update pairing matrix for each group
            for (const group of groups) {
                  const groupStudents = group.students;

                  // Update pair counts for each pair of students in the group
                  for (let i = 0; i < groupStudents.length; i++) {
                        for (let j = i + 1; j < groupStudents.length; j++) {
                              const student1Id = groupStudents[i].id;
                              const student2Id = groupStudents[j].id;

                              // Try to find existing pair record
                              const [existingPair] = await db
                                    .select()
                                    .from(pairingMatrix)
                                    .where(
                                          and(
                                                eq(pairingMatrix.classId, classId),
                                                eq(pairingMatrix.studentId1, student1Id),
                                                eq(pairingMatrix.studentId2, student2Id)
                                          )
                                    );

                              if (existingPair) {
                                    // Update existing pair
                                    await db
                                          .update(pairingMatrix)
                                          .set({
                                                pairCount: existingPair.pairCount + 1,
                                                lastPaired: new Date().toISOString()
                                          })
                                          .where(eq(pairingMatrix.id, existingPair.id));
                              } else {
                                    // Check reverse order
                                    const [reversePair] = await db
                                          .select()
                                          .from(pairingMatrix)
                                          .where(
                                                and(
                                                      eq(pairingMatrix.classId, classId),
                                                      eq(pairingMatrix.studentId1, student2Id),
                                                      eq(pairingMatrix.studentId2, student1Id)
                                                )
                                          );

                                    if (reversePair) {
                                          // Update reverse pair
                                          await db
                                                .update(pairingMatrix)
                                                .set({
                                                      pairCount: reversePair.pairCount + 1,
                                                      lastPaired: new Date().toISOString()
                                                })
                                                .where(eq(pairingMatrix.id, reversePair.id));
                                    } else {
                                          // Create new pair record
                                          await db
                                                .insert(pairingMatrix)
                                                .values({
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
            }

            // Update non-standard grouping counts
            if (nonStandardStudentIds.length > 0) {
                  for (const studentId of nonStandardStudentIds) {
                        const [student] = await db
                              .select()
                              .from(students)
                              .where(eq(students.id, studentId));

                        if (student) {
                              await db
                                    .update(students)
                                    .set({
                                          nonStandardGroupings: (student.nonStandardGroupings || 0) + 1
                                    })
                                    .where(eq(students.id, studentId));
                        }
                  }
            }

            return json({ success: true });
      } catch (error) {
            console.error('Error saving groups:', error);
            return json({ error: 'Failed to save groups' }, { status: 500 });
      }
} 