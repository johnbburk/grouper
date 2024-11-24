import { sql } from 'drizzle-orm';
import { migrate } from '../migrate';

export async function preventNegativePairs() {
      await migrate(
            'prevent-negative-pairs',
            sql`ALTER TABLE pairing_matrix ADD CONSTRAINT positive_pair_count CHECK (pair_count >= 0)`
      );
}

export async function revertPreventNegativePairs() {
      await migrate(
            'revert-prevent-negative-pairs',
            sql`ALTER TABLE pairing_matrix DROP CONSTRAINT positive_pair_count`
      );
} 