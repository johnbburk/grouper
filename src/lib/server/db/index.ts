import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { classes, students, studyGroups, groupAssignments } from './schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Export the pool connection for migrations
export const poolConnection = mysql.createPool({
      host: process.env.DATABASE_HOST,
      user: process.env.DATABASE_USER,
      password: process.env.DATABASE_PASSWORD,
      database: process.env.DATABASE_NAME,
      socketPath: process.env.DATABASE_SOCKET,
      // Only use port if not using socket
      ...(process.env.DATABASE_SOCKET ? {} : { port: parseInt(process.env.DATABASE_PORT || '3306') })
});

export const db = drizzle(poolConnection);

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

export async function createGroups(
      classId: number,
      groupSize: number,
      studentIds: number[]
) {
      try {
            // 1. Get selected students and their grouping history
            const [students] = await poolConnection.query(
                  'SELECT id, first_name, last_name, class_id, COALESCE(grouping_history, "[]") as grouping_history FROM students WHERE class_id = ? AND id IN (?)',
                  [classId, studentIds]
            ) as [Array<{
                  id: number;
                  first_name: string;
                  last_name: string;
                  class_id: number;
                  grouping_history: string;
            }>, any];

            // 2. Build history matrix
            const historyMatrix = new Map<string, number>();
            students.forEach(student => {
                  try {
                        const history = JSON.parse(student.grouping_history);
                        history.forEach((entry: { groupmateId: number }) => {
                              const pairKey = [student.id, entry.groupmateId].sort().join('-');
                              historyMatrix.set(pairKey, (historyMatrix.get(pairKey) || 0) + 1);
                        });
                  } catch (error) {
                        console.error('Error parsing history:', error);
                  }
            });

            // 3. Function to calculate group score
            function calculateGroupScore(groupStudents: typeof students) {
                  let score = 0;
                  for (let i = 0; i < groupStudents.length; i++) {
                        for (let j = i + 1; j < groupStudents.length; j++) {
                              const pairKey = [groupStudents[i].id, groupStudents[j].id].sort().join('-');
                              score += historyMatrix.get(pairKey) || 0;
                        }
                  }
                  return score;
            }

            // 4. Generate multiple random configurations and pick the best
            const numberOfAttempts = 100;
            let bestGroups: GroupScore[] = [];
            let bestTotalScore = Infinity;

            for (let attempt = 0; attempt < numberOfAttempts; attempt++) {
                  const shuffled = [...students].sort(() => Math.random() - 0.5);
                  const currentGroups: GroupScore[] = [];
                  let currentTotalScore = 0;

                  // Create groups from this shuffle
                  for (let i = 0; i < Math.ceil(shuffled.length / groupSize); i++) {
                        const groupStudents = shuffled.slice(i * groupSize, (i + 1) * groupSize);
                        const score = calculateGroupScore(groupStudents);
                        currentGroups.push({
                              students: groupStudents.map(s => ({
                                    id: s.id,
                                    firstName: s.first_name,
                                    lastName: s.last_name
                              })),
                              score
                        });
                        currentTotalScore += score;
                  }

                  // Keep this configuration if it's better
                  if (currentTotalScore < bestTotalScore) {
                        bestGroups = currentGroups;
                        bestTotalScore = currentTotalScore;
                  }
            }

            // 5. Save the groups to the database with proper timestamps
            const createdGroups = [];
            const now = new Date();

            for (let i = 0; i < bestGroups.length; i++) {
                  const [groupResult] = await poolConnection.query(
                        'INSERT INTO study_groups (name, class_id, created_at) VALUES (?, ?, ?)',
                        [`Group ${i + 1}`, classId, now]
                  ) as [mysql.ResultSetHeader, any];

                  for (const student of bestGroups[i].students) {
                        await poolConnection.query(
                              'INSERT INTO group_assignments (student_id, group_id, date) VALUES (?, ?, ?)',
                              [student.id, groupResult.insertId, now]
                        );
                  }

                  createdGroups.push({
                        id: groupResult.insertId,
                        name: `Group ${i + 1}`,
                        students: bestGroups[i].students,
                        score: bestGroups[i].score,
                        createdAt: now
                  });
            }

            return { groups: createdGroups };
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
                        const [historyResult] = await poolConnection.query(
                              'SELECT COALESCE(grouping_history, "[]") as grouping_history FROM students WHERE id = ?',
                              [student.id]
                        ) as [Array<{ grouping_history: string }>, any];

                        // Get all other students in this group
                        const groupmates = group.students.filter(s => s.id !== student.id);

                        // Parse current history with error handling
                        let currentHistory = [];
                        try {
                              currentHistory = JSON.parse(historyResult[0]?.grouping_history || '[]');
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
                        await poolConnection.query(
                              'UPDATE students SET grouping_history = ? WHERE id = ?',
                              [JSON.stringify(updatedHistory), student.id]
                        );
                  }

                  // Save the group assignment
                  await poolConnection.query(
                        'INSERT INTO group_assignments (group_id, student_id, date) VALUES ?',
                        [group.students.map(student => [group.id, student.id, new Date()])]
                  );
            }

            // Display the updated matrix
            await displayPairingMatrix(classId);

            return { success: true };
      } catch (error) {
            console.error('Error saving groups:', error);
            throw error;
      }
}

// Add this function to get grouping history for a student
export async function getStudentGroupingHistory(studentId: number) {
      const [result] = await poolConnection.query(
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
            // Get all students in the class
            const [classmates] = await poolConnection.query(
                  'SELECT id, first_name, last_name FROM students WHERE class_id = ? AND id != ?',
                  [classId, studentId]
            ) as [Array<{ id: number; first_name: string; last_name: string }>, any];

            // Get student's grouping history
            const [historyResult] = await poolConnection.query(
                  'SELECT grouping_history FROM students WHERE id = ?',
                  [studentId]
            ) as [Array<{ grouping_history: any }>, any];

            // Parse history and get set of all previous groupmate IDs
            let history: Array<{ groupmateId: number }> = [];
            try {
                  // Handle both string and object cases
                  const rawHistory = historyResult[0]?.grouping_history;
                  if (typeof rawHistory === 'string') {
                        history = JSON.parse(rawHistory);
                  } else if (Array.isArray(rawHistory)) {
                        history = rawHistory;
                  } else if (rawHistory === null) {
                        history = [];
                  } else {
                        console.warn('Unexpected grouping_history format:', rawHistory);
                        history = [];
                  }
            } catch (error) {
                  console.error('Error parsing grouping history:', error);
                  history = [];
            }

            // Create a Set of previous groupmate IDs
            const previousGroupmates = new Set(
                  history.map((entry: { groupmateId: number }) => entry.groupmateId)
            );

            // Count groupings with each groupmate
            const groupingCounts = new Map<number, number>();
            history.forEach((entry: { groupmateId: number }) => {
                  if (entry && typeof entry.groupmateId === 'number') {
                        groupingCounts.set(
                              entry.groupmateId,
                              (groupingCounts.get(entry.groupmateId) || 0) + 1
                        );
                  }
            });

            // Get all groups this student has been in
            const [groupHistory] = await poolConnection.query(`
            SELECT 
                g.id as group_id,
                g.name as group_name,
                g.created_at,
                GROUP_CONCAT(DISTINCT CONCAT(s.first_name, ' ', s.last_name)) as group_members
            FROM group_assignments ga
            JOIN study_groups g ON ga.group_id = g.id
            JOIN group_assignments ga2 ON g.id = ga2.group_id
            JOIN students s ON ga2.student_id = s.id
            WHERE ga.student_id = ?
            GROUP BY g.id, g.name, g.created_at
            ORDER BY g.created_at DESC
        `, [studentId]) as [Array<{
                  group_id: number;
                  group_name: string;
                  created_at: Date;
                  group_members: string;
            }>, any];

            // Filter and sort students
            const neverGrouped = classmates
                  .filter(c => !previousGroupmates.has(c.id))
                  .map(c => ({
                        id: c.id,
                        firstName: c.first_name,
                        lastName: c.last_name,
                        groupCount: 0
                  }))
                  .sort((a, b) => `${a.lastName}, ${a.firstName}`.localeCompare(`${b.lastName}, ${b.firstName}`));

            const groupedStudents = classmates
                  .filter(c => previousGroupmates.has(c.id))
                  .map(c => ({
                        id: c.id,
                        firstName: c.first_name,
                        lastName: c.last_name,
                        groupCount: groupingCounts.get(c.id) || 0
                  }))
                  .sort((a, b) => a.groupCount - b.groupCount);

            return {
                  neverGrouped,
                  groupedStudents,
                  groupHistory: (groupHistory || []).map(g => ({
                        id: g.group_id,
                        name: g.group_name,
                        date: g.created_at,
                        members: (g.group_members || '').split('|').filter(Boolean)
                  }))
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
            await poolConnection.query('SET FOREIGN_KEY_CHECKS=0');

            // Clear all tables
            await poolConnection.query('TRUNCATE TABLE group_assignments');
            await poolConnection.query('TRUNCATE TABLE study_groups');
            await poolConnection.query('TRUNCATE TABLE students');
            await poolConnection.query('TRUNCATE TABLE classes');

            // Re-enable foreign key checks
            await poolConnection.query('SET FOREIGN_KEY_CHECKS=1');

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
            const [students] = await poolConnection.query(
                  'SELECT id, first_name, last_name FROM students WHERE class_id = ? ORDER BY last_name, first_name',
                  [classId]
            ) as [Array<{ id: number; first_name: string; last_name: string }>, any];

            // Get all pairings
            const [pairings] = await poolConnection.query(
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
            // Process new groups first to collect all pairs
            const pairUpdates = new Map<string, { id1: number; id2: number; }>();

            for (const group of newGroups) {
                  // Generate all pairs in this group
                  for (let i = 0; i < group.students.length; i++) {
                        for (let j = i + 1; j < group.students.length; j++) {
                              // Always store with smaller ID first
                              const [id1, id2] = [group.students[i].id, group.students[j].id].sort((a, b) => a - b);
                              const key = `${id1}-${id2}`;
                              pairUpdates.set(key, { id1, id2 });
                        }
                  }
            }

            // For each pair, insert or update
            for (const { id1, id2 } of pairUpdates.values()) {
                  await poolConnection.query(`
                        INSERT INTO pairing_matrix (student_id_1, student_id_2, class_id, pair_count, last_paired)
                        VALUES (?, ?, ?, 1, NOW())
                        ON DUPLICATE KEY UPDATE 
                              pair_count = pair_count + 1,
                              last_paired = NOW()
                  `, [id1, id2, classId]);
            }

            // After all updates are done, display the matrix
            await displayPairingMatrix(classId);

      } catch (error) {
            console.error('Error updating pairing matrix:', error);
            throw error;
      }
}

export async function getOptimalGroups(classId: number, studentIds: number[], groupSize: number) {
      try {
            // Get pairing matrix for these students
            const [matrix] = await poolConnection.query(
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
