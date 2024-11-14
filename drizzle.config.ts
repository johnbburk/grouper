import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

console.log('Database Config:', {
	host: process.env.DATABASE_HOST,
	user: process.env.DATABASE_USERNAME,
	database: process.env.DATABASE_NAME,
});

export default {
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle/migrations',
	dialect: 'mysql',
	dbCredentials: {
		host: '127.0.0.1',
		user: 'root',
		database: 'grouper',
		port: 3306
	},
} satisfies Config;
