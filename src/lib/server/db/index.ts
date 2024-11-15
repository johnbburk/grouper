import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

// Create the database file if it doesn't exist
const sqlite = new Database('sqlite.db', { verbose: console.log });
export const db = drizzle(sqlite);
