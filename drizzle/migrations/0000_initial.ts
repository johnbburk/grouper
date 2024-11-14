import { sql } from 'drizzle-orm';

export async function up(db: any) {
      await db.execute(sql`
    PRAGMA foreign_keys = ON;

    CREATE TABLE IF NOT EXISTS classes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS students (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      first_name TEXT NOT NULL,
      last_name TEXT NOT NULL,
      class_id INTEGER REFERENCES classes(id),
      grouping_history TEXT DEFAULT '[]',
      non_standard_groupings INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS study_groups (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      class_id INTEGER REFERENCES classes(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS group_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id INTEGER REFERENCES study_groups(id),
      student_id INTEGER REFERENCES students(id),
      date TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pairing_matrix (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_id_1 INTEGER REFERENCES students(id),
      student_id_2 INTEGER REFERENCES students(id),
      class_id INTEGER REFERENCES classes(id),
      pair_count INTEGER NOT NULL DEFAULT 0,
      last_paired TEXT
    );

    CREATE UNIQUE INDEX IF NOT EXISTS idx_pairing_matrix_unique 
    ON pairing_matrix(student_id_1, student_id_2, class_id);
  `);
}

export async function down(db: any) {
      await db.execute(sql`
    PRAGMA foreign_keys = OFF;
    
    DROP TABLE IF EXISTS pairing_matrix;
    DROP TABLE IF EXISTS group_assignments;
    DROP TABLE IF EXISTS study_groups;
    DROP TABLE IF EXISTS students;
    DROP TABLE IF EXISTS classes;
    
    PRAGMA foreign_keys = ON;
  `);
} 