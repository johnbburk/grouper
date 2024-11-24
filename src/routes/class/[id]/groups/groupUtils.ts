interface Student {
      id: number;
      firstName: string;
      lastName: string;
      nonStandardGroupings?: number;
}

interface Group {
      id: number;
      name: string;
      students: Student[];
      score?: number;
}

export function isNonStandardGroup(group: { students: Array<any> }, targetSize: number): boolean {
      return group.students.length !== targetSize;
}

export async function calculateGroupScore(students: Array<{ id: number }>, classId: number = 1) {
      if (!students || students.length < 2) return 0;

      try {
            let score = 0;
            for (let i = 0; i < students.length; i++) {
                  for (let j = i + 1; j < students.length; j++) {
                        const url = `/api/class/${classId}/students/${students[i].id}/pairs/${students[j].id}`;
                        const response = await fetch(url);

                        if (!response.ok) {
                              console.error('Failed to fetch pair score:', {
                                    status: response.status,
                                    statusText: response.statusText,
                                    url
                              });
                              continue;
                        }

                        const data = await response.json();
                        const pairCount = Math.max(0, data.pairCount);
                        score += pairCount || 0;
                  }
            }
            return score;
      } catch (error) {
            console.error('Error calculating group score:', error);
            return 0;
      }
}

export function checkForDuplicates(currentGroups: Group[] | null | undefined) {
      if (!currentGroups) return;

      const allStudents = new Set();
      let duplicates: Array<{
            studentId: number;
            studentName: string;
            groupIndex: number;
      }> = [];

      currentGroups.forEach((group, groupIndex) => {
            group.students.forEach(student => {
                  if (allStudents.has(student.id)) {
                        duplicates.push({
                              studentId: student.id,
                              studentName: `${student.lastName}, ${student.firstName}`,
                              groupIndex
                        });
                  } else {
                        allStudents.add(student.id);
                  }
            });
      });

      if (duplicates.length > 0) {
            console.warn('Found duplicate students:', duplicates);
      }
} 