import { getClasses } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
      const classes = await getClasses();
      return { classes };
}; 