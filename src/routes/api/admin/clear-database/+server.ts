import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { classes, students, studyGroups, groupAssignments, pairingMatrix, groupingRules } from '$lib/server/db/schema';
import type { RequestEvent } from './$types';

export async function POST({ request }: RequestEvent) {
      try {
            // Delete all data in reverse order of dependencies
            await db.delete(groupAssignments);
            await db.delete(pairingMatrix);
            await db.delete(groupingRules);
            await db.delete(studyGroups);
            await db.delete(students);
            await db.delete(classes);

            return json({ success: true });
      } catch (error) {
            console.error('Error clearing database:', error);
            return json({ error: 'Failed to clear database' }, { status: 500 });
      }
} 