import { createClient } from '@libsql/client';
import { drizzle } from 'drizzle-orm/libsql';
import { classes, students, studyGroups, groupAssignments, pairingMatrix } from './schema';
import { eq, and, inArray, sql } from 'drizzle-orm';
import { mkdirSync } from 'fs';

// Create data directory if it doesn't exist
mkdirSync('data', { recursive: true });

// Connect to SQLite database
const client = createClient({
      url: process.env.DATABASE_URL || 'file:data/grouper.db',
      authToken: process.env.DATABASE_AUTH_TOKEN
});

export const db = drizzle(client);

// Class operations
export async function addClass(name: string) {
      return await db.insert(classes).values({ name }).execute();
}

export async function getClasses() {
      return await db.select().from(classes);
}

// Student operations
export async function addStudents(
      classId: number,
      studentList: Array<{ firstName: string; lastName: string }>
) {
      return await db.insert(students)
            .values(studentList.map(student => ({
                  ...student,
                  classId
            })))
            .execute();
}

export async function getStudentsByClass(classId: number) {
      return await db.select({
            id: students.id,
            firstName: students.firstName,
            lastName: students.lastName,
            classId: students.classId
      })
            .from(students)
            .where(eq(students.classId, classId));
}

// Group operations
interface GroupScore {
      students: Array<{
            id: number;
            firstName: string;
            lastName: string;
      }>;
      score: number;
}

interface GroupConfiguration {
      groups: Array<number[]>;
      score: number;
}

export async function createGroups(
      classId: number,
      groupSize: number,
      studentIds: number[]
) {
      try {
            // Get pairing matrix using drizzle query builder
            const pairings = await db
                  .select()
                  .from(pairingMatrix)
                  .where(
                        and(
                              eq(pairingMatrix.classId, classId),
                              inArray(pairingMatrix.studentId1, studentIds),
                              inArray(pairingMatrix.studentId2, studentIds)
                        )
                  );

            // Build cost matrix for quick lookups
            const pairMatrix = new Map<string, number>();
            pairings.forEach(pair => {
                  const [id1, id2] = [pair.studentId1, pair.studentId2].sort((a, b) => a - b);
                  const key = `${id1}-${id2}`;
                  pairMatrix.set(key, pair.pairCount);
            });

            // Get student details
            const studentDetails = await db
                  .select()
                  .from(students)
                  .where(inArray(students.id, studentIds));

            const studentMap = new Map(
                  studentDetails.map(s => [s.id, { firstName: s.firstName, lastName: s.lastName }])
            );

            // Create groups
            const numGroups = Math.ceil(studentIds.length / groupSize);
            const groups = [];

            // Distribute students into groups
            const shuffledIds = [...studentIds].sort(() => Math.random() - 0.5);

            for (let i = 0; i < numGroups; i++) {
                  const groupStudents = shuffledIds
                        .slice(i * groupSize, Math.min((i + 1) * groupSize, shuffledIds.length))
                        .map(id => ({
                              id,
                              firstName: studentMap.get(id)!.firstName,
                              lastName: studentMap.get(id)!.lastName
                        }));

                  const result = await db
                        .insert(studyGroups)
                        .values({
                              name: `Group ${i + 1}`,
                              classId,
                              createdAt: new Date().toISOString()
                        })
                        .returning({ insertId: studyGroups.id });

                  groups.push({
                        id: result[0].insertId,
                        name: `Group ${i + 1}`,
                        students: groupStudents
                  });
            }

            return { groups, pairMatrix };
      } catch (error) {
            console.error('Error creating groups:', error);
            throw error;
      }
}

// Add this new function
export async function saveGroups(
      classId: number,
      groups: Array<{
            id: number;
            name: string;
            students: Array<{
                  id: number;
                  firstName: string;
                  lastName: string;
            }>;
      }>
) {
      try {
            const timestamp = new Date().toISOString();

            // First update the pairing matrix
            await updatePairingMatrix(classId, groups);

            // Then update student histories and group assignments
            for (const group of groups) {
                  // For each student in the group
                  for (const student of group.students) {
                        // Get their current grouping history
                        const historyResult = await db
                              .select({ groupingHistory: students.groupingHistory })
                              .from(students)
                              .where(eq(students.id, student.id))
                              .execute();

                        // Get all other students in this group
                        const groupmates = group.students.filter(s => s.id !== student.id);

                        // Parse current history with error handling
                        let currentHistory = [];
                        try {
                              const rawHistory = historyResult[0]?.groupingHistory;
                              currentHistory = typeof rawHistory === 'string' ? JSON.parse(rawHistory) : (rawHistory || []);
                        } catch (error) {
                              console.error('Error parsing history for student', student.id, error);
                              currentHistory = [];
                        }

                        // Add new groupmates to history
                        const updatedHistory = [
                              ...currentHistory,
                              ...groupmates.map(groupmate => ({
                                    groupmateId: groupmate.id,
                                    timestamp,
                                    groupId: group.id
                              }))
                        ];

                        // Update the student's history
                        await db
                              .update(students)
                              .set({ groupingHistory: JSON.stringify(updatedHistory) })
                              .where(eq(students.id, student.id))
                              .execute();
                  }

                  // Save the group assignments
                  await db
                        .insert(groupAssignments)
                        .values(
                              group.students.map(student => ({
                                    groupId: group.id,
                                    studentId: student.id,
                                    date: new Date().toISOString()
                              }))
                        )
                        .execute();
            }

            return { success: true };
      } catch (error) {
            console.error('Error saving groups:', error);
            throw error;
      }
}

// Add this function to get grouping history for a student
export async function getStudentGroupingHistory(studentId: number) {
      const [result] = await db.query(
            'SELECT grouping_history FROM students WHERE id = ?',
            [studentId]
      ) as [Array<{ grouping_history: string }>, any];

      return JSON.parse(result[0]?.grouping_history || '[]');
}

// Add this new function
export async function deleteStudent(studentId: number) {
      try {
            return await db.delete(students)
                  .where(eq(students.id, studentId))
                  .execute();
      } catch (error) {
            console.error('Error deleting student:', error);
            throw error;
      }
}

// Add this new function
export async function getStudentHistory(studentId: number, classId: number) {
      try {
            // Get student's non-standard groupings count
            const nonStandardResult = await db
                  .select({ nonStandardGroupings: students.nonStandardGroupings })
                  .from(students)
                  .where(eq(students.id, studentId))
                  .execute();

            // Get all students in the class
            const classmates = await db
                  .select({
                        id: students.id,
                        firstName: students.firstName,
                        lastName: students.lastName
                  })
                  .from(students)
                  .where(
                        and(
                              eq(students.classId, classId),
                              sql`${students.id} != ${studentId}`
                        )
                  )
                  .execute();

            // Get student's grouping history
            const historyResult = await db
                  .select({ groupingHistory: students.groupingHistory })
                  .from(students)
                  .where(eq(students.id, studentId))
                  .execute();

            // Parse history
            let history = [];
            try {
                  const rawHistory = historyResult[0]?.groupingHistory;
                  history = typeof rawHistory === 'string' ? JSON.parse(rawHistory) : (rawHistory || []);
            } catch (error) {
                  console.error('Error parsing history:', error);
                  history = [];
            }

            // Create a Set of previous groupmate IDs
            const previousGroupmates = new Set(history.map((entry: { groupmateId: number }) => entry.groupmateId));

            // Count groupings with each groupmate
            const groupingCounts = new Map<number, number>();
            history.forEach((entry: { groupmateId: number }) => {
                  if (entry?.groupmateId) {
                        groupingCounts.set(
                              entry.groupmateId,
                              (groupingCounts.get(entry.groupmateId) || 0) + 1
                        );
                  }
            });

            // Get all groups this student has been in
            const groupHistory = await db
                  .select({
                        groupId: studyGroups.id,
                        groupName: studyGroups.name,
                        createdAt: studyGroups.createdAt,
                        members: sql<string>`GROUP_CONCAT(DISTINCT ${students.firstName} || ' ' || ${students.lastName})`
                  })
                  .from(groupAssignments)
                  .innerJoin(studyGroups, eq(groupAssignments.groupId, studyGroups.id))
                  .innerJoin(students, eq(groupAssignments.studentId, students.id))
                  .where(eq(groupAssignments.studentId, studentId))
                  .groupBy(studyGroups.id, studyGroups.name, studyGroups.createdAt)
                  .orderBy(studyGroups.createdAt)
                  .execute();

            // Filter and sort students
            const neverGrouped = classmates
                  .filter(c => !previousGroupmates.has(c.id))
                  .map(c => ({
                        id: c.id,
                        firstName: c.firstName,
                        lastName: c.lastName,
                        groupCount: 0
                  }))
                  .sort((a, b) => `${a.lastName}, ${a.firstName}`.localeCompare(`${b.lastName}, ${b.firstName}`));

            const groupedStudents = classmates
                  .filter(c => previousGroupmates.has(c.id))
                  .map(c => ({
                        id: c.id,
                        firstName: c.firstName,
                        lastName: c.lastName,
                        groupCount: groupingCounts.get(c.id) || 0
                  }))
                  .sort((a, b) => a.groupCount - b.groupCount);

            return {
                  neverGrouped,
                  groupedStudents,
                  groupHistory: groupHistory.map(g => ({
                        id: g.groupId,
                        name: g.groupName,
                        date: g.createdAt,
                        members: g.members?.split(',').filter(Boolean) || []
                  })),
                  nonStandardGroupings: nonStandardResult[0]?.nonStandardGroupings ?? 0
            };
      } catch (error) {
            console.error('Error getting student history:', error);
            throw error;
      }
}

// Add this new function
export async function clearDatabase() {
      try {
            // Disable foreign key checks temporarily
            await db.query('SET FOREIGN_KEY_CHECKS=0');

            // Clear all tables
            await db.query('TRUNCATE TABLE group_assignments');
            await db.query('TRUNCATE TABLE study_groups');
            await db.query('TRUNCATE TABLE students');
            await db.query('TRUNCATE TABLE classes');

            // Re-enable foreign key checks
            await db.query('SET FOREIGN_KEY_CHECKS=1');

            return { success: true };
      } catch (error) {
            console.error('Error clearing database:', error);
            throw error;
      }
}

interface PairingData {
      studentId1: number;
      studentId2: number;
      pairCount: number;
      lastPaired: Date | null;
}

async function displayPairingMatrix(classId: number) {
      try {
            // Get all students in the class
            const [students] = await db.query(
                  'SELECT id, first_name, last_name FROM students WHERE class_id = ? ORDER BY last_name, first_name',
                  [classId]
            ) as [Array<{ id: number; first_name: string; last_name: string }>, any];

            // Get all pairings
            const [pairings] = await db.query(
                  'SELECT student_id_1, student_id_2, pair_count FROM pairing_matrix WHERE class_id = ?',
                  [classId]
            ) as [Array<{ student_id_1: number; student_id_2: number; pair_count: number }>, any];

            // Create matrix
            const matrix = new Map<string, number>();
            pairings.forEach(pair => {
                  const key1 = `${pair.student_id_1}-${pair.student_id_2}`;
                  const key2 = `${pair.student_id_2}-${pair.student_id_1}`;
                  matrix.set(key1, pair.pair_count);
                  matrix.set(key2, pair.pair_count);
            });

            // Create student lookup
            const studentMap = new Map(students.map(s => [s.id, `${s.last_name}, ${s.first_name}`]));

            // Print header
            console.log('\nPairing Matrix:');
            console.log('─'.repeat(120));

            // Print column headers (abbreviated names)
            process.stdout.write('              '); // Padding for row headers
            students.forEach(s => {
                  const abbrev = `${s.last_name.slice(0, 3)}${s.first_name[0]}`;
                  process.stdout.write(abbrev.padEnd(6));
            });
            console.log('\n' + '─'.repeat(120));

            // Print each row
            students.forEach(s1 => {
                  // Print row header (abbreviated name)
                  const rowHeader = `${s1.last_name.slice(0, 3)}${s1.first_name[0]}`;
                  process.stdout.write(rowHeader.padEnd(14));

                  // Print matrix values
                  students.forEach(s2 => {
                        const key = `${s1.id}-${s2.id}`;
                        const value = matrix.get(key) || 0;
                        const display = s1.id === s2.id ? '─' : value.toString();
                        process.stdout.write(display.padEnd(6));
                  });
                  console.log(); // New line
            });

            console.log('─'.repeat(120));

            // Print summary statistics
            const totalPairings = Array.from(matrix.values()).reduce((sum, count) => sum + count, 0) / 2;
            const maxPairings = Math.max(...Array.from(matrix.values()));
            const uniquePairings = new Set(Array.from(matrix.values()).filter(v => v > 0)).size;

            console.log('\nStatistics:');
            console.log(`Total Pairings: ${totalPairings}`);
            console.log(`Maximum Times Paired: ${maxPairings}`);
            console.log(`Unique Pairing Counts: ${uniquePairings}`);
            console.log('─'.repeat(120) + '\n');

      } catch (error) {
            console.error('Error displaying pairing matrix:', error);
      }
}

export async function updatePairingMatrix(classId: number, newGroups: Array<{ students: Array<{ id: number }> }>) {
      try {
            for (const group of newGroups) {
                  for (let i = 0; i < group.students.length; i++) {
                        for (let j = i + 1; j < group.students.length; j++) {
                              const [id1, id2] = [group.students[i].id, group.students[j].id].sort((a, b) => a - b);

                              await db
                                    .insert(pairingMatrix)
                                    .values({
                                          studentId1: id1,
                                          studentId2: id2,
                                          classId,
                                          pairCount: 1,
                                          lastPaired: new Date().toISOString()
                                    })
                                    .onConflictDoUpdate({
                                          target: [pairingMatrix.studentId1, pairingMatrix.studentId2, pairingMatrix.classId],
                                          set: {
                                                pairCount: sql`${pairingMatrix.pairCount} + 1`,
                                                lastPaired: new Date().toISOString()
                                          }
                                    })
                                    .execute();
                        }
                  }
            }
      } catch (error) {
            console.error('Error updating pairing matrix:', error);
            throw error;
      }
}

// Add this function to get pair count
export async function getPairCount(classId: number, studentId1: number, studentId2: number): Promise<number> {
      try {
            const [id1, id2] = [studentId1, studentId2].sort((a, b) => a - b);

            const result = await db
                  .select({ pairCount: pairingMatrix.pairCount })
                  .from(pairingMatrix)
                  .where(
                        and(
                              eq(pairingMatrix.classId, classId),
                              eq(pairingMatrix.studentId1, id1),
                              eq(pairingMatrix.studentId2, id2)
                        )
                  )
                  .execute();

            return result[0]?.pairCount ?? 0;
      } catch (error) {
            console.error('Error getting pair count:', error);
            return 0;
      }
}

export async function getOptimalGroups(classId: number, studentIds: number[], groupSize: number) {
      try {
            // Get pairing matrix for these students
            const [matrix] = await db.query(
                  `SELECT student_id_1, student_id_2, pair_count, last_paired 
            FROM pairing_matrix 
            WHERE class_id = ? 
            AND (student_id_1 IN (?) OR student_id_2 IN (?))`,
                  [classId, studentIds, studentIds]
            ) as [Array<PairingData>, any];

            // Convert to cost matrix (higher pair counts = higher costs)
            const costMatrix = new Map<string, number>();
            matrix.forEach(pair => {
                  const key = [pair.studentId1, pair.studentId2].sort().join('-');
                  // Consider both pair count and recency in cost
                  const recencyCost = pair.lastPaired
                        ? Math.max(0, 10 - Math.floor((Date.now() - pair.lastPaired.getTime()) / (1000 * 60 * 60 * 24)))
                        : 0;
                  costMatrix.set(key, (pair.pairCount * 10) + recencyCost);
            });

            // Helper function to calculate group cost
            function calculateGroupCost(students: number[]): number {
                  let cost = 0;
                  for (let i = 0; i < students.length; i++) {
                        for (let j = i + 1; j < students.length; j++) {
                              const key = [students[i], students[j]].sort().join('-');
                              cost += costMatrix.get(key) || 0;
                        }
                  }
                  return cost;
            }

            // Generate and evaluate multiple random configurations
            const attempts = 1000;
            let bestCost = Infinity;
            let bestGroups: number[][] = [];

            for (let i = 0; i < attempts; i++) {
                  const shuffled = [...studentIds].sort(() => Math.random() - 0.5);
                  const groups: number[][] = [];

                  for (let j = 0; j < shuffled.length; j += groupSize) {
                        groups.push(shuffled.slice(j, j + groupSize));
                  }

                  const totalCost = groups.reduce((sum, group) => sum + calculateGroupCost(group), 0);

                  if (totalCost < bestCost) {
                        bestCost = totalCost;
                        bestGroups = groups;
                  }
            }

            return bestGroups;
      } catch (error) {
            console.error('Error getting optimal groups:', error);
            throw error;
      }
}
