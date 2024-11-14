import { addGroupingHistoryColumn } from './add_grouping_history';

async function runMigrations() {
      try {
            await addGroupingHistoryColumn();
            console.log('All migrations completed successfully');
      } catch (error) {
            console.error('Error running migrations:', error);
      }
}

runMigrations(); 