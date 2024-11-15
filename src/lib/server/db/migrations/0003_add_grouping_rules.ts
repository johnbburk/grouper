import { sqliteTable, integer, text } from 'drizzle-orm/sqlite-core';

export async function up(db: any) {
      await db.run(`
    CREATE TABLE grouping_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
      student1_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      student2_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);
}

export async function down(db: any) {
      await db.run('DROP TABLE grouping_rules;');
} 