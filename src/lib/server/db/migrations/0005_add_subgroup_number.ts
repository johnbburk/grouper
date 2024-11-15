import { sql } from 'drizzle-orm';

export async function up(db: any) {
      await db.run(sql`
        ALTER TABLE group_assignments 
        ADD COLUMN subgroup_number INTEGER NOT NULL DEFAULT 1;
    `);
}

export async function down(db: any) {
      // SQLite doesn't support dropping columns
      // You'd need to recreate the table to remove a column
} 