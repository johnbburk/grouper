import { drizzle } from 'drizzle-orm/mysql2';
import { migrate } from 'drizzle-orm/mysql2/migrator';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';

dotenv.config();

async function main() {
      const connection = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            database: 'grouper',
            multipleStatements: true
      });

      const db = drizzle(connection);

      // Create migrations table if it doesn't exist
      await connection.execute(`
            CREATE TABLE IF NOT EXISTS \`drizzle_migrations\` (
                  \`id\` int NOT NULL AUTO_INCREMENT,
                  \`hash\` varchar(255) NOT NULL,
                  \`created_at\` bigint,
                  PRIMARY KEY (\`id\`)
            );
      `);

      console.log('Running migrations...');

      try {
            await migrate(db, {
                  migrationsFolder: './drizzle/migrations',
                  migrationsTable: 'drizzle_migrations'
            });
            console.log('Migrations complete!');
      } catch (error) {
            // If error is about existing tables, we can ignore it
            if (error instanceof Error && !error.message.includes('already exists')) {
                  throw error;
            }
            console.log('Some tables already exist, continuing with migrations...');
      }

      await connection.end();
}

main().catch((err) => {
      console.error('Migration failed!');
      console.error(err);
      process.exit(1);
}); 