import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { students, groupAssignments, studyGroups, pairingMatrix } from '$lib/server/db/schema';
import { eq, and, sql } from 'drizzle-orm';
import type { RequestEvent } from './$types';

export async function GET({ params }: RequestEvent) {
      const classId = parseInt(params.id);
      const studentId = parseInt(params.studentId);

      try {
            // Get all students in the class
            const classmates = await db
                  .select()
                  .from(students)
                  .where(eq(students.classId, classId));

            // Get all pairing data for this student
            const pairings = await db
                  .select()
                  .from(pairingMatrix)
                  .where(
                        sql`(${pairingMatrix.studentId1} = ${studentId} OR ${pairingMatrix.studentId2} = ${studentId}) 
                    AND ${pairingMatrix.classId} = ${classId}`
                  );

            // Get student's group history
            const groupHistory = await db
                  .select({
                        groupId: studyGroups.id,
                        name: studyGroups.name,
                        createdAt: studyGroups.createdAt
                  })
                  .from(groupAssignments)
                  .innerJoin(studyGroups, eq(groupAssignments.groupId, studyGroups.id))
                  .where(eq(groupAssignments.studentId, studentId))
                  .orderBy(sql`created_at DESC`);

            // Process the data
            const groupedStudents = classmates
                  .filter(c => c.id !== studentId)
                  .map(classmate => {
                        const pairData = pairings.find(p =>
                              (p.studentId1 === classmate.id && p.studentId2 === studentId) ||
                              (p.studentId1 === studentId && p.studentId2 === classmate.id)
                        );
                        return {
                              id: classmate.id,
                              firstName: classmate.firstName,
                              lastName: classmate.lastName,
                              groupCount: pairData?.pairCount ?? 0
                        };
                  })
                  .filter(s => s.groupCount > 0)
                  .sort((a, b) => b.groupCount - a.groupCount);

            const neverGrouped = classmates
                  .filter(c => c.id !== studentId)
                  .filter(c => !groupedStudents.some(g => g.id === c.id))
                  .map(c => ({
                        id: c.id,
                        firstName: c.firstName,
                        lastName: c.lastName,
                        groupCount: 0
                  }));

            // Get the student's non-standard grouping count
            const [student] = await db
                  .select()
                  .from(students)
                  .where(eq(students.id, studentId));

            // For each group, get only the students who were in the same group
            const groupsWithMembers = await Promise.all(
                  groupHistory.map(async (group) => {
                        // First get this student's subgroup number
                        const [studentAssignment] = await db
                              .select()
                              .from(groupAssignments)
                              .where(
                                    and(
                                          eq(groupAssignments.groupId, group.groupId),
                                          eq(groupAssignments.studentId, studentId)
                                    )
                              );

                        // Then get all students in the same subgroup
                        const groupMembers = await db
                              .select({
                                    student: students
                              })
                              .from(groupAssignments)
                              .innerJoin(students, eq(groupAssignments.studentId, students.id))
                              .where(
                                    and(
                                          eq(groupAssignments.groupId, group.groupId),
                                          eq(groupAssignments.subgroupNumber, studentAssignment.subgroupNumber)
                                    )
                              );

                        return {
                              id: group.groupId,
                              name: `Group ${studentAssignment.subgroupNumber}`,
                              date: new Date(group.createdAt).toLocaleString(),
                              members: groupMembers
                                    .map(m => `${m.student.lastName}, ${m.student.firstName}`)
                                    .sort((a, b) => a.localeCompare(b))
                        };
                  })
            );

            return json({
                  neverGrouped,
                  groupedStudents,
                  groupHistory: groupsWithMembers,
                  nonStandardGroupings: student?.nonStandardGroupings ?? 0
            });
      } catch (error) {
            console.error('Error getting student history:', error);
            return json({ error: 'Failed to get student history' }, { status: 500 });
      }
} 