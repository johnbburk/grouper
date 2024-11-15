import { json } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { classes } from '$lib/server/db/schema';

export async function POST({ request }) {
      try {
            const { name } = await request.json();

            const result = await db.insert(classes)
                  .values({
                        name
                  })
                  .returning();

            return json({ success: true, class: result[0] });
      } catch (error) {
            console.error('Error adding class:', error);
            return json({ error: 'Failed to add class' }, { status: 500 });
      }
}

export async function GET() {
      try {
            const classList = await db.select().from(classes);
            return json(classList);
      } catch (error) {
            console.error('Error fetching classes:', error);
            return json({ error: 'Failed to fetch classes' }, { status: 500 });
      }
} 