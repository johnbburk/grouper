import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createGroups } from '$lib/server/db';
import { db } from '$lib/server/db';
import { eq, and, sql, inArray } from 'drizzle-orm';
import { students, studyGroups } from '$lib/server/db/schema';
import type { MySqlDatabase } from 'drizzle-orm/mysql-core';

interface Student {
      id: number;
      firstName: string;
      lastName: string;
      nonStandardGroupings: number;
}

interface DbStudent {
      id: number;
      first_name: string;
      last_name: string;
      non_standard_groupings: number | null;
}

export const POST: RequestHandler = async ({ params, request }) => {
      const { groupSize, studentIds, considerNonStandard, preferOversizeGroups } = await request.json();

      const result = await createGroups(
            parseInt(params.id),
            groupSize,
            studentIds,
            preferOversizeGroups
      );

      return json(result);
};

export const PUT: RequestHandler = async ({ params, request }) => {
      const { groups, nonStandardStudentIds } = await request.json();

      // Update nonStandardGroupings count for affected students
      if (nonStandardStudentIds.length > 0) {
            await db
                  .update(students)
                  .set({
                        nonStandardGroupings: sql`non_standard_groupings + 1`
                  })
                  .where(
                        and(
                              eq(students.classId, parseInt(params.id)),
                              inArray(students.id, nonStandardStudentIds)
                        )
                  );
      }

      return json({ success: true });
}; 