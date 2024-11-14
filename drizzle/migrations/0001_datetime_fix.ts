import { sql } from 'drizzle-orm';

export async function up(db: any) {
      await db.execute(sql`
        ALTER TABLE study_groups 
        MODIFY created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP;
    `);

      await db.execute(sql`
        ALTER TABLE group_assignments 
        MODIFY date DATETIME NOT NULL;
    `);
}

export async function down(db: any) {
      await db.execute(sql`
        ALTER TABLE study_groups 
        MODIFY created_at DATE NOT NULL;
    `);

      await db.execute(sql`
        ALTER TABLE group_assignments 
        MODIFY date DATE NOT NULL;
    `);
} 