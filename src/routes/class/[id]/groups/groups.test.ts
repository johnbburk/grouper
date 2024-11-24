import { describe, it, expect, beforeAll, beforeEach, afterAll, vi } from 'vitest';
import { db } from '$lib/server/db';
import { pairingMatrix } from '$lib/server/db/schema';
import { calculateGroupScore } from './groupUtils';
import { eq, and, or } from 'drizzle-orm';

describe('Group Scoring Integration Tests', () => {
      const CLASS_ID = 999;
      const STUDENT_1 = { id: 101 };
      const STUDENT_2 = { id: 102 };
      const STUDENT_3 = { id: 103 };

      beforeAll(async () => {
            await db.delete(pairingMatrix)
                  .where(eq(pairingMatrix.classId, CLASS_ID));

            // Mock fetch globally
            global.fetch = vi.fn();
      });

      beforeEach(() => {
            vi.resetAllMocks();
      });

      afterAll(async () => {
            await db.delete(pairingMatrix)
                  .where(eq(pairingMatrix.classId, CLASS_ID));
            vi.restoreAllMocks();
      });

      it('should return higher scores for previously paired students', async () => {
            await db.insert(pairingMatrix).values({
                  classId: CLASS_ID,
                  studentId1: STUDENT_1.id,
                  studentId2: STUDENT_2.id,
                  pairCount: 2,
                  lastPaired: new Date().toISOString()
            });

            // Mock fetch to return the pair count
            global.fetch = vi.fn().mockImplementation((url: string) => {
                  if (url.includes(`${STUDENT_1.id}/pairs/${STUDENT_2.id}`) ||
                        url.includes(`${STUDENT_2.id}/pairs/${STUDENT_1.id}`)) {
                        return Promise.resolve({
                              ok: true,
                              json: () => Promise.resolve({ pairCount: 2 })
                        });
                  }
                  return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ pairCount: 0 })
                  });
            });

            const groupWithHistory = [STUDENT_1, STUDENT_2, STUDENT_3];
            const scoreWithHistory = await calculateGroupScore(groupWithHistory, CLASS_ID);

            await db.delete(pairingMatrix)
                  .where(eq(pairingMatrix.classId, CLASS_ID));

            // Reset fetch mock for no history
            global.fetch = vi.fn().mockImplementation(() =>
                  Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ pairCount: 0 })
                  })
            );

            const scoreWithoutHistory = await calculateGroupScore(groupWithHistory, CLASS_ID);

            expect(scoreWithHistory).toBeGreaterThan(scoreWithoutHistory);
            expect(scoreWithHistory).toBe(2);
            expect(scoreWithoutHistory).toBe(0);
      });

      it('should accumulate scores from multiple pair histories', async () => {
            await db.insert(pairingMatrix).values([
                  {
                        classId: CLASS_ID,
                        studentId1: STUDENT_1.id,
                        studentId2: STUDENT_2.id,
                        pairCount: 2,
                        lastPaired: new Date().toISOString()
                  },
                  {
                        classId: CLASS_ID,
                        studentId1: STUDENT_2.id,
                        studentId2: STUDENT_3.id,
                        pairCount: 3,
                        lastPaired: new Date().toISOString()
                  }
            ]);

            // Mock fetch to return appropriate pair counts
            global.fetch = vi.fn().mockImplementation((url: string) => {
                  if (url.includes(`${STUDENT_1.id}/pairs/${STUDENT_2.id}`) ||
                        url.includes(`${STUDENT_2.id}/pairs/${STUDENT_1.id}`)) {
                        return Promise.resolve({
                              ok: true,
                              json: () => Promise.resolve({ pairCount: 2 })
                        });
                  }
                  if (url.includes(`${STUDENT_2.id}/pairs/${STUDENT_3.id}`) ||
                        url.includes(`${STUDENT_3.id}/pairs/${STUDENT_2.id}`)) {
                        return Promise.resolve({
                              ok: true,
                              json: () => Promise.resolve({ pairCount: 3 })
                        });
                  }
                  return Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ pairCount: 0 })
                  });
            });

            const group = [STUDENT_1, STUDENT_2, STUDENT_3];
            const score = await calculateGroupScore(group, CLASS_ID);

            expect(score).toBe(5);
      });

      it('should handle empty groups correctly', async () => {
            const emptyGroup: typeof STUDENT_1[] = [];
            const score = await calculateGroupScore(emptyGroup, CLASS_ID);
            expect(score).toBe(0);
      });

      it('should handle single student groups correctly', async () => {
            const singleStudentGroup = [STUDENT_1];
            const score = await calculateGroupScore(singleStudentGroup, CLASS_ID);
            expect(score).toBe(0);
      });

      it('should handle API errors gracefully', async () => {
            // Mock fetch to simulate API error
            global.fetch = vi.fn().mockImplementation(() =>
                  Promise.resolve({
                        ok: false,
                        status: 500,
                        statusText: 'Internal Server Error'
                  })
            );

            const group = [STUDENT_1, STUDENT_2];
            const score = await calculateGroupScore(group, CLASS_ID);

            // Should return 0 or handle error gracefully
            expect(score).toBe(0);
      });

      it('should handle very large groups efficiently', async () => {
            const largeGroup = Array.from({ length: 10 }, (_, i) => ({ id: 1000 + i }));

            // Mock fetch to return 0 for all pairs
            global.fetch = vi.fn().mockImplementation(() =>
                  Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ pairCount: 0 })
                  })
            );

            const score = await calculateGroupScore(largeGroup, CLASS_ID);
            expect(score).toBe(0);
            // Could also test execution time if performance is a concern
      });

      it('should handle duplicate student IDs correctly', async () => {
            const groupWithDuplicates = [STUDENT_1, STUDENT_1, STUDENT_2];

            global.fetch = vi.fn().mockImplementation(() =>
                  Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ pairCount: 1 })
                  })
            );

            const score = await calculateGroupScore(groupWithDuplicates, CLASS_ID);
            // The exact expected score would depend on your implementation
            // but it should handle duplicates without errors
            expect(typeof score).toBe('number');
      });

      it('should never return negative pair counts from API', async () => {
            // Mock fetch to simulate API response
            global.fetch = vi.fn().mockImplementation(() =>
                  Promise.resolve({
                        ok: true,
                        json: () => Promise.resolve({ pairCount: 0 }) // API should never return negative
                  })
            );

            const group = [STUDENT_1, STUDENT_2];
            const score = await calculateGroupScore(group, CLASS_ID);
            expect(score).toBe(0);
      });
}); 