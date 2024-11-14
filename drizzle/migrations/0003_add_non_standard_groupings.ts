import { mysqlTable, int } from 'drizzle-orm/mysql-core';
import { sql } from 'drizzle-orm';

export async function up(db: any) {
      // First disable foreign key checks
      await db.execute(sql`SET FOREIGN_KEY_CHECKS=0;`);

      try {
            // Add the new column without truncating
            await db.execute(sql`
                  ALTER TABLE students 
                  ADD COLUMN IF NOT EXISTS non_standard_groupings INT DEFAULT 0;
            `);

            // Update existing records to have default value
            await db.execute(sql`
                  UPDATE students 
                  SET non_standard_groupings = 0 
                  WHERE non_standard_groupings IS NULL;
            `);
      } finally {
            // Re-enable foreign key checks
            await db.execute(sql`SET FOREIGN_KEY_CHECKS=1;`);
      }
}

export async function down(db: any) {
      // First disable foreign key checks
      await db.execute(sql`SET FOREIGN_KEY_CHECKS=0;`);

      try {
            // Remove the column if it exists
            await db.execute(sql`
                  ALTER TABLE students 
                  DROP COLUMN IF EXISTS non_standard_groupings;
            `);
      } finally {
            // Re-enable foreign key checks
            await db.execute(sql`SET FOREIGN_KEY_CHECKS=1;`);
      }
} 