import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import { eq } from 'drizzle-orm';
import { students } from './schema';

const sqlite = new Database('sqlite.db');
export const db = drizzle(sqlite);

export async function deleteStudent(studentId: number) {
      try {
            await db
                  .delete(students)
                  .where(eq(students.id, studentId));
            return true;
      } catch (error) {
            console.error('Error deleting student:', error);
            return false;
      }
}

export async function getStudentsByClass(classId: number) {
      try {
            const classStudents = await db
                  .select()
                  .from(students)
                  .where(eq(students.classId, classId));
            return classStudents;
      } catch (error) {
            console.error('Error fetching students:', error);
            return [];
      }
}
