import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import { sql } from 'drizzle-orm';
import Database from 'better-sqlite3';

const runMigrations = async () => {
      const sqlite = new Database('sqlite.db', {
            verbose: console.log,
            fileMustExist: false
      });

      const db = drizzle(sqlite);

      console.log('Running migrations...');

      try {
            // Drop existing tables if they exist
            await db.run(sql`DROP TABLE IF EXISTS group_assignments`);
            await db.run(sql`DROP TABLE IF EXISTS grouping_rules`);
            await db.run(sql`DROP TABLE IF EXISTS pairing_matrix`);
            await db.run(sql`DROP TABLE IF EXISTS study_groups`);
            await db.run(sql`DROP TABLE IF EXISTS students`);
            await db.run(sql`DROP TABLE IF EXISTS classes`);

            // Run migrations to recreate tables
            await migrate(db, {
                  migrationsFolder: 'src/lib/server/db/migrations'
            });
            console.log('Migrations completed!');
      } catch (error) {
            console.error('Error running migrations:', error);
            throw error;
      } finally {
            sqlite.close();
      }
};

runMigrations().catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
}); 