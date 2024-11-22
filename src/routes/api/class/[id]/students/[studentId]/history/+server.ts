import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { students, pairingMatrix } from '$lib/server/db/schema';
import { eq, and, or } from 'drizzle-orm';

export const GET: RequestHandler = async ({ params }) => {
      try {
            const { id: classId, studentId } = params;
            const parsedClassId = parseInt(classId);
            const parsedStudentId = parseInt(studentId);

            const studentData = await db
                  .select()
                  .from(students)
                  .where(
                        and(
                              eq(students.id, parsedStudentId),
                              eq(students.classId, parsedClassId)
                        )
                  )
                  .limit(1);

            if (!studentData.length) {
                  throw error(404, 'Student not found');
            }

            const classStudents = await db
                  .select()
                  .from(students)
                  .where(eq(students.classId, parsedClassId));

            const pairings = await db
                  .select()
                  .from(pairingMatrix)
                  .where(
                        and(
                              eq(pairingMatrix.classId, parsedClassId),
                              or(
                                    eq(pairingMatrix.studentId1, parsedStudentId),
                                    eq(pairingMatrix.studentId2, parsedStudentId)
                              )
                        )
                  );

            const history = JSON.parse(studentData[0].groupingHistory || '[]');
            const groupedStudentIds = new Set();

            pairings.forEach(pair => {
                  const otherId = pair.studentId1 === parsedStudentId ? pair.studentId2 : pair.studentId1;
                  groupedStudentIds.add(otherId);
            });

            const neverGrouped = classStudents.filter(s =>
                  s.id !== parsedStudentId && !groupedStudentIds.has(s.id)
            ).map(s => ({
                  id: s.id,
                  firstName: s.firstName,
                  lastName: s.lastName,
                  groupCount: 0
            }));

            const groupedStudents = Array.from(groupedStudentIds).map(id => {
                  const student = classStudents.find(s => s.id === id);
                  const pairData = pairings.find(p =>
                        (p.studentId1 === id && p.studentId2 === parsedStudentId) ||
                        (p.studentId2 === id && p.studentId1 === parsedStudentId)
                  );
                  return {
                        id,
                        firstName: student?.firstName || '',
                        lastName: student?.lastName || '',
                        groupCount: pairData?.pairCount || 0
                  };
            });

            const filteredHistory = history.filter((group: any) => {
                  return group.allMembers?.some((member: any) => member.id === parsedStudentId);
            });

            return json({
                  neverGrouped,
                  groupedStudents,
                  groupHistory: filteredHistory,
                  nonStandardGroupings: studentData[0].nonStandardGroupings || 0
            });
      } catch (e) {
            console.error('Error fetching student history:', e);
            throw error(500, 'Failed to fetch student history');
      }
}; 