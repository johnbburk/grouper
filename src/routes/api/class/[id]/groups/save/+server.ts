import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { studyGroups, groupAssignments } from '$lib/server/db/schema';
import type { RequestEvent } from './$types';

export async function POST({ params, request }: RequestEvent) {
      const classId = parseInt(params.id);
      const { groups, nonStandardStudentIds = [] } = await request.json();

      try {
            // Create a new study group
            const [groupResult] = await db
                  .insert(studyGroups)
                  .values({
                        classId,
                        name: `Group ${new Date().toLocaleTimeString()}`,
                        createdAt: new Date().toISOString()
                  })
                  .returning();

            // Create group assignments with subgroup numbers
            await Promise.all(
                  groups.map(async (group, groupIndex) => {
                        const subgroupNumber = groupIndex + 1;
                        const groupAssignmentPromises = group.students.map(student =>
                              db.insert(groupAssignments)
                                    .values({
                                          groupId: groupResult.id,
                                          studentId: student.id,
                                          date: new Date().toISOString(),
                                          subgroupNumber
                                    })
                        );
                        return Promise.all(groupAssignmentPromises);
                  })
            );

            return json({ success: true });
      } catch (error) {
            console.error('Error saving groups:', error);
            return json({ error: 'Failed to save groups' }, { status: 500 });
      }
} 