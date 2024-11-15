import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { groupingRules } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

export async function POST({ params, request }) {
      const { student1Id, student2Id } = await request.json();

      try {
            await db.insert(groupingRules).values({
                  classId: parseInt(params.id),
                  student1Id,
                  student2Id,
                  createdAt: new Date().toISOString()
            });

            return json({ success: true });
      } catch (error) {
            console.error('Error adding rule:', error);
            return json({ error: 'Failed to add rule' }, { status: 500 });
      }
}

export async function DELETE({ params, url }) {
      const ruleId = url.searchParams.get('ruleId');

      if (!ruleId) {
            return json({ error: 'Rule ID is required' }, { status: 400 });
      }

      try {
            await db.delete(groupingRules)
                  .where(eq(groupingRules.id, parseInt(ruleId)));

            return json({ success: true });
      } catch (error) {
            console.error('Error deleting rule:', error);
            return json({ error: 'Failed to delete rule' }, { status: 500 });
      }
} 