import { sql } from 'drizzle-orm';

export async function up(db: any) {
      await db.execute(sql`
    CREATE TABLE IF NOT EXISTS grouping_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
      student1_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      student2_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function down(db: any) {
      await db.execute(sql`DROP TABLE IF EXISTS grouping_rules;`);
} 