import { db } from './index';
import { sql } from 'drizzle-orm';

async function setup() {
      console.log('Setting up database...');

      try {
            await db.run(sql`
              CREATE TABLE IF NOT EXISTS grouping_rules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                class_id INTEGER REFERENCES classes(id) ON DELETE CASCADE,
                student1_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                student2_id INTEGER REFERENCES students(id) ON DELETE CASCADE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
              );
            `);

            console.log('Database setup complete!');
      } catch (error) {
            console.error('Error setting up database:', error);
            process.exit(1);
      }
      process.exit(0);
}

setup(); 