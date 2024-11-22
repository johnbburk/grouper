import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { students } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { createRandomGroups } from '$lib/utils/groupUtils';

export const POST: RequestHandler = async ({ request, params }) => {
      try {
            const body = await request.json();
            console.log('Received request body:', body);

            const { groupSize = 2, studentIds = [], considerNonStandard = true, preferOversizeGroups = false } = body;

            if (!Array.isArray(studentIds)) {
                  throw error(400, 'studentIds must be an array');
            }

            const studentDetails = await db
                  .select()
                  .from(students)
                  .where(eq(students.classId, parseInt(params.id)));

            const studentMap = new Map(studentDetails.map(s => [s.id, s]));
            const groups = createRandomGroups(studentIds, groupSize, preferOversizeGroups, studentMap);

            return json({ groups });
      } catch (error) {
            console.error('Error creating groups:', error);
            return json({ error: 'Failed to create groups' }, { status: 500 });
      }
}; 