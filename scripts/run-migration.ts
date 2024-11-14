import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as dotenv from 'dotenv';
import { up } from '../drizzle/migrations/0002_add_pairing_matrix';

dotenv.config();

async function main() {
      const connection = await mysql.createConnection({
            host: process.env.DATABASE_HOST,
            user: process.env.DATABASE_USER,
            database: process.env.DATABASE_NAME,
      });

      const db = drizzle(connection);

      console.log('Running pairing matrix migration...');
      await up(db);
      console.log('Migration complete!');

      await connection.end();
}

main().catch(console.error); 