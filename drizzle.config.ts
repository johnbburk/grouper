import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

const { DATABASE_HOST, DATABASE_USER, DATABASE_NAME } = process.env;

if (!DATABASE_HOST || !DATABASE_USER || !DATABASE_NAME) {
	throw new Error('Missing required database environment variables');
}

export default {
	schema: './src/lib/server/db/schema.ts',
	out: './drizzle/migrations',
	dialect: 'mysql',
	dbCredentials: {
		host: DATABASE_HOST,
		user: DATABASE_USER,
		database: DATABASE_NAME,
	},
	verbose: true,
	strict: true,
	breakpoints: true,
	tablesOrder: ['classes', 'students', 'study_groups', 'group_assignments'],
} satisfies Config;
