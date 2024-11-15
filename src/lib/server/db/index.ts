import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

// Create the database file if it doesn't exist with write permissions
const sqlite = new Database('sqlite.db', {
      verbose: console.log,
      fileMustExist: false,  // Allow creating new database file
      readonly: false        // Allow write operations
});

// Enable foreign keys support
sqlite.exec('PRAGMA foreign_keys = ON;');

export const db = drizzle(sqlite);
