import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { mkdirSync } from 'fs';

// Create data directory if it doesn't exist
mkdirSync('data', { recursive: true });

async function main() {
      const sqlite = new Database('data/grouper.db');
      const db = drizzle(sqlite);

      console.log('Creating tables...');

      // Create tables directly
      sqlite.exec(`
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

      console.log('Tables created successfully!');
      sqlite.close();
}

main().catch((err) => {
      console.error('Migration failed!');
      console.error(err);
      process.exit(1);
}); 