import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import { classes, students, studyGroups, groupAssignments } from './schema';
import { eq } from 'drizzle-orm';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Initialize the database connection
const poolConnection = mysql.createPool({
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
      return await db.select()
            .from(students)
            .where(eq(students.classId, classId));
}

// Group operations
export async function createGroups(
      classId: number,
      groupSize: number,
      studentIds: number[]
) {
      try {
            // 1. Get selected students
            const [classStudents] = await poolConnection.query(
                  'SELECT * FROM students WHERE class_id = ? AND id IN (?)',
                  [classId, studentIds]
            ) as [Array<{
                  id: number;
                  first_name: string;
                  last_name: string;
                  class_id: number;
            }>, any];

            console.log('Selected students:', classStudents.length);

            // 2. Shuffle students
            const shuffled = [...classStudents].sort(() => Math.random() - 0.5);

            // 3. Calculate groups
            const numberOfGroups = Math.ceil(shuffled.length / groupSize);
            console.log('Number of groups:', numberOfGroups);
            const createdGroups = [];

            // 4. Create groups and assign students
            for (let i = 0; i < numberOfGroups; i++) {
                  // Get students for this group
                  const startIdx = i * groupSize;
                  const endIdx = Math.min(startIdx + groupSize, shuffled.length);
                  const groupStudents = shuffled.slice(startIdx, endIdx);

                  console.log(`Group ${i + 1} size:`, groupStudents.length);

                  // Create group
                  const [groupResult] = await poolConnection.query<mysql.ResultSetHeader>(
                        'INSERT INTO study_groups (name, class_id) VALUES (?, ?)',
                        [`Group ${i + 1}`, classId]
                  );

                  // Create assignments for this group
                  for (const student of groupStudents) {
                        await poolConnection.query(
                              'INSERT INTO group_assignments (student_id, group_id, date) VALUES (?, ?, ?)',
                              [student.id, groupResult.insertId, new Date()]
                        );
                  }

                  // Add to result array
                  createdGroups.push({
                        id: groupResult.insertId,
                        name: `Group ${i + 1}`,
                        students: groupStudents.map(student => ({
                              id: student.id,
                              firstName: student.first_name,
                              lastName: student.last_name
                        }))
                  });
            }

            console.log('Created groups:', createdGroups.length);
            return { groups: createdGroups };
      } catch (error) {
            console.error('Error creating groups:', error);
            throw error;
      }
}
