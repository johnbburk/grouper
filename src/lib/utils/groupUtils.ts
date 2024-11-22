export function createRandomGroups(
      studentIds: number[],
      groupSize: number,
      preferOversizeGroups: boolean,
      studentMap: Map<number, any>
) {
      if (!Array.isArray(studentIds) || studentIds.length === 0) {
            return [];
      }

      const students = [...studentIds];
      const groups = [];
      let groupCounter = 1;

      // Fisher-Yates shuffle
      for (let i = students.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [students[i], students[j]] = [students[j], students[i]];
      }

      while (students.length > 0) {
            // Calculate remaining students and groups
            const remainingStudents = students.length;
            const remainingGroups = Math.ceil(remainingStudents / groupSize);
            const studentsPerRemainingGroup = remainingStudents / remainingGroups;

            // Determine if this group should be oversized
            const shouldOversizeThisGroup = preferOversizeGroups &&
                  studentsPerRemainingGroup > groupSize &&
                  remainingStudents % groupSize !== 0;

            const currentSize = shouldOversizeThisGroup ?
                  Math.min(groupSize + 1, students.length) :
                  Math.min(groupSize, students.length);

            const groupStudents = students.splice(0, currentSize).map(id => {
                  const student = studentMap.get(id);
                  return {
                        id,
                        firstName: student?.firstName || '',
                        lastName: student?.lastName || ''
                  };
            });

            groups.push({
                  id: groupCounter,
                  name: `Group ${groupCounter}`,
                  students: groupStudents
            });
            groupCounter++;
      }

      return groups;
} 