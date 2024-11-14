import { sql } from 'drizzle-orm';

export async function up(db: any) {
      // 1. Create tables in correct order
      await db.execute(sql`
    CREATE TABLE IF NOT EXISTS classes (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL
    );
  `);

      await db.execute(sql`
    CREATE TABLE IF NOT EXISTS students (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(255) NOT NULL,
      last_name VARCHAR(255) NOT NULL,
      class_id BIGINT UNSIGNED,
      grouping_history JSON DEFAULT (JSON_ARRAY()),
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    );
  `);

      await db.execute(sql`
    CREATE TABLE IF NOT EXISTS study_groups (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255),
      class_id BIGINT UNSIGNED,
      created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
      FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
    );
  `);

      await db.execute(sql`
    CREATE TABLE IF NOT EXISTS group_assignments (
      id SERIAL PRIMARY KEY,
      group_id BIGINT UNSIGNED,
      student_id BIGINT UNSIGNED,
      date DATETIME(6) NOT NULL,
      FOREIGN KEY (group_id) REFERENCES study_groups(id) ON DELETE CASCADE,
      FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE
    );
  `);
}

export async function down(db: any) {
      // Drop tables in reverse order
      await db.execute(sql`DROP TABLE IF EXISTS group_assignments;`);
      await db.execute(sql`DROP TABLE IF EXISTS study_groups;`);
      await db.execute(sql`DROP TABLE IF EXISTS students;`);
      await db.execute(sql`DROP TABLE IF EXISTS classes;`);
} 