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
