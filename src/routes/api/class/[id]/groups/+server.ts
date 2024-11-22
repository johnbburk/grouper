import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { students } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, params }) => {
      try {
            const { groupSize, studentIds, considerNonStandard, preferOversizeGroups } = await request.json();
            console.log('Received request:', { groupSize, studentIds, considerNonStandard, preferOversizeGroups });

            // Fetch student details from the database
            const studentDetails = await db
                  .select()
                  .from(students)
                  .where(eq(students.classId, parseInt(params.id)));

            console.log('Found student details:', studentDetails);

            // Create a map of student details by ID
            const studentMap = new Map(studentDetails.map(s => [s.id, s]));

            // Create groups with full student information
            const groups = createGroups(studentIds, groupSize, preferOversizeGroups, studentMap);
            console.log('Created groups:', groups);

            return json({ groups });
      } catch (error) {
            console.error('Error creating groups:', error);
            return json({ error: 'Failed to create groups' }, { status: 500 });
      }
};

function createGroups(
      studentIds: number[],
      groupSize: number,
      preferOversizeGroups: boolean,
      studentMap: Map<number, any>
) {
      const students = [...studentIds];
      const groups = [];
      let groupCounter = 1;

      // Shuffle the students array
      for (let i = students.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [students[i], students[j]] = [students[j], students[i]];
      }

      while (students.length > 0) {
            const currentSize = preferOversizeGroups ?
                  Math.min(groupSize + 1, students.length) :
                  Math.min(groupSize, students.length);

            const groupStudents = students.splice(0, currentSize).map(id => {
                  const student = studentMap.get(id);
                  return {
                        id,
                        firstName: student?.firstName || '',
                        lastName: student?.lastName || ''
                  };
            });

            groups.push({
                  id: groupCounter,
                  name: `Group ${groupCounter}`,
                  students: groupStudents
            });
            groupCounter++;
      }

      return groups;
} 