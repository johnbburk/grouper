import type { Config } from 'drizzle-kit';
import * as dotenv from 'dotenv';
dotenv.config();

export default {
	schema: './src/lib/server/db/schema.ts',
	out: './src/lib/server/db/migrations',
	driver: 'better-sqlite',
	dbCredentials: {
		url: 'sqlite.db'
	},
} satisfies Config;
