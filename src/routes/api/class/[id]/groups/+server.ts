import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { studyGroups, groupAssignments, students, groupingRules } from '$lib/server/db/schema';
import { eq, sql, and, or } from 'drizzle-orm';
import type { RequestEvent } from './$types';

interface GroupRequest {
      groupSize: number;
      studentIds?: number[];
      considerNonStandard?: boolean;
      preferOversizeGroups: boolean;
}

export async function POST({ params, request }: RequestEvent) {
      const classId = parseInt(params.id);
      const { groupSize, studentIds = [], preferOversizeGroups } = await request.json() as GroupRequest;

      try {
            // Get all grouping rules for this class
            const rules = await db
                  .select()
                  .from(groupingRules)
                  .where(eq(groupingRules.classId, classId));

            // Get selected students or all students if none specified
            const studentList = await db
                  .select()
                  .from(students)
                  .where(
                        studentIds.length > 0
                              ? sql`${students.classId} = ${classId} AND ${students.id} IN ${studentIds}`
                              : eq(students.classId, classId)
                  );

            // Function to check if two students can be grouped together
            function canBeGrouped(student1Id: number, student2Id: number): boolean {
                  return !rules.some(rule =>
                        (rule.student1Id === student1Id && rule.student2Id === student2Id) ||
                        (rule.student1Id === student2Id && rule.student2Id === student1Id)
                  );
            }

            // Function to validate a group against all rules
            function isValidGroup(group: typeof studentList): boolean {
                  for (let i = 0; i < group.length; i++) {
                        for (let j = i + 1; j < group.length; j++) {
                              if (!canBeGrouped(group[i].id, group[j].id)) {
                                    return false;
                              }
                        }
                  }
                  return true;
            }

            // Try to create valid groups (up to 10 attempts)
            let validGroups: typeof studentList[] = [];
            let attempts = 0;
            const maxAttempts = 10;

            while (attempts < maxAttempts) {
                  // Shuffle students randomly
                  const shuffledStudents = [...studentList].sort(() => Math.random() - 0.5);

                  // Calculate groups based on preferOversizeGroups setting
                  const totalStudents = shuffledStudents.length;
                  const baseGroupCount = Math.floor(totalStudents / groupSize);
                  const remainingStudents = totalStudents % groupSize;

                  let tempGroups: typeof studentList[] = [];
                  let currentIndex = 0;
                  let isValid = true;

                  if (preferOversizeGroups && remainingStudents > 0) {
                        const studentsPerLargeGroup = groupSize + 1;
                        const numberOfLargeGroups = remainingStudents;
                        const numberOfNormalGroups = baseGroupCount - remainingStudents;

                        // Create larger groups
                        for (let i = 0; i < numberOfLargeGroups; i++) {
                              const group = shuffledStudents.slice(currentIndex, currentIndex + studentsPerLargeGroup);
                              if (!isValidGroup(group)) {
                                    isValid = false;
                                    break;
                              }
                              tempGroups.push(group);
                              currentIndex += studentsPerLargeGroup;
                        }

                        // Create normal sized groups
                        if (isValid) {
                              for (let i = 0; i < numberOfNormalGroups; i++) {
                                    const group = shuffledStudents.slice(currentIndex, currentIndex + groupSize);
                                    if (!isValidGroup(group)) {
                                          isValid = false;
                                          break;
                                    }
                                    tempGroups.push(group);
                                    currentIndex += groupSize;
                              }
                        }
                  } else {
                        // Traditional grouping
                        for (let i = 0; i < shuffledStudents.length; i += groupSize) {
                              const group = shuffledStudents.slice(i, Math.min(i + groupSize, shuffledStudents.length));
                              if (!isValidGroup(group)) {
                                    isValid = false;
                                    break;
                              }
                              tempGroups.push(group);
                        }
                  }

                  if (isValid) {
                        validGroups = tempGroups;
                        break;
                  }

                  attempts++;
            }

            if (validGroups.length === 0) {
                  return json({
                        error: 'Unable to create groups that satisfy all rules. Try removing some rules or changing the group size.'
                  }, { status: 400 });
            }

            // Return the groups without saving them
            return json({
                  success: true,
                  groups: validGroups.map((students, index) => ({
                        id: index + 1,
                        name: `Group ${index + 1}`,
                        students: students.map(s => ({
                              id: s.id,
                              firstName: s.firstName,
                              lastName: s.lastName
                        }))
                  }))
            });
      } catch (error) {
            console.error('Error creating groups:', error);
            return json({ error: 'Failed to create groups' }, { status: 500 });
      }
}

export async function GET({ params }: RequestEvent) {
      const classId = parseInt(params.id);

      try {
            // Get the most recent group
            const [latestGroup] = await db
                  .select()
                  .from(studyGroups)
                  .where(eq(studyGroups.classId, classId))
                  .orderBy(sql`created_at DESC`)
                  .limit(1);

            if (!latestGroup) {
                  return json({ groups: [] });
            }

            // Get assignments for this group
            const assignments = await db
                  .select()
                  .from(groupAssignments)
                  .where(eq(groupAssignments.groupId, latestGroup.id));

            // Get student details for each assignment
            const studentDetails = await Promise.all(
                  assignments.map(async (assignment) => {
                        const [student] = await db
                              .select()
                              .from(students)
                              .where(eq(students.id, assignment.studentId!));
                        return {
                              ...assignment,
                              student
                        };
                  })
            );

            return json({
                  groupId: latestGroup.id,
                  assignments: studentDetails
            });
      } catch (error) {
            console.error('Error fetching groups:', error);
            return json({ error: 'Failed to fetch groups' }, { status: 500 });
      }
} 