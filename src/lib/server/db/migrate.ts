import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { migrate } from 'drizzle-orm/libsql/migrator';
import * as dotenv from 'dotenv';

dotenv.config();

const runMigrations = async () => {
      const client = createClient({
            url: process.env.DATABASE_URL!,
            authToken: process.env.DATABASE_AUTH_TOKEN,
      });

      const db = drizzle(client);

      console.log('Running migrations...');

      await migrate(db, {
            migrationsFolder: 'src/lib/server/db/migrations',
      });

      console.log('Migrations completed!');
      process.exit(0);
};

runMigrations().catch((err) => {
      console.error('Error running migrations:', err);
      process.exit(1);
}); 