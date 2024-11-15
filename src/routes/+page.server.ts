import { db } from '$lib/server/db';
import { classes } from '$lib/server/db/schema';

export async function load() {
      try {
            const classList = await db.select().from(classes);
            return {
                  classes: classList
            };
      } catch (error) {
            console.error('Error loading classes:', error);
            return {
                  classes: []
            };
      }
} 