import { getStudentsByClass } from '$lib/server/db';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params }) => {
      const students = await getStudentsByClass(parseInt(params.id));
      return { students };
}; 