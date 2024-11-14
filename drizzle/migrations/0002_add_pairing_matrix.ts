import { sql } from 'drizzle-orm';

export async function up(db: any) {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS pairing_matrix (
            student_id_1 BIGINT UNSIGNED NOT NULL,
            student_id_2 BIGINT UNSIGNED NOT NULL,
            class_id BIGINT UNSIGNED NOT NULL,
            pair_count INT NOT NULL DEFAULT 0,
            last_paired DATETIME(6),
            PRIMARY KEY (student_id_1, student_id_2, class_id),
            FOREIGN KEY (student_id_1) REFERENCES students(id) ON DELETE CASCADE,
            FOREIGN KEY (student_id_2) REFERENCES students(id) ON DELETE CASCADE,
            FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
        );
    `);
}

export async function down(db: any) {
      await db.execute(sql`DROP TABLE IF EXISTS pairing_matrix;`);
} 