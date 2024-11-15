import { db } from '$lib/server/db';
import { classes, students, groupingRules } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function load({ params }) {
      const classId = parseInt(params.id);

      const [classData] = await db
            .select()
            .from(classes)
            .where(eq(classes.id, classId));

      const studentsList = await db
            .select()
            .from(students)
            .where(eq(students.classId, classId));

      const rulesList = await db
            .select()
            .from(groupingRules)
            .where(eq(groupingRules.classId, classId));

      return {
            class: classData,
            students: studentsList,
            rules: rulesList
      };
} 