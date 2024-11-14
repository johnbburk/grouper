import { poolConnection } from '../index';

export async function addGroupingHistoryColumn() {
      try {
            await poolConnection.query(`
            ALTER TABLE students 
            ADD COLUMN grouping_history JSON DEFAULT (JSON_ARRAY())
        `);
            console.log('Successfully added grouping_history column');
      } catch (error) {
            console.error('Error adding grouping_history column:', error);
            throw error;
      }
} 