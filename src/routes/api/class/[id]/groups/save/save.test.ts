import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import { db } from '$lib/server/db';

vi.mock('$lib/server/db', () => ({
      db: {
            select: vi.fn(() => ({
                  from: vi.fn(() => ({
                        where: vi.fn(() => ({
                              get: vi.fn(() => ({
                                    pairCount: 2,
                                    lastPaired: new Date()
                              }))
                        }))
                  }))
            })),
            insert: vi.fn(() => ({
                  values: vi.fn(() => Promise.resolve())
            })),
            update: vi.fn(() => ({
                  set: vi.fn(() => ({
                        where: vi.fn(() => Promise.resolve())
                  }))
            }))
      }
}));

describe('Groups Save Endpoint', () => {
      beforeEach(() => {
            vi.clearAllMocks();
      });

      it('should handle saving new group pairings and calculate scores', async () => {
            // Mock the select query for pairing data
            const mockGet = vi.fn().mockImplementation(() => ({
                  pairCount: 2,
                  lastPaired: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
            }));

            const mockWhere = vi.fn(() => ({ get: mockGet }));
            const mockFrom = vi.fn(() => ({ where: mockWhere }));
            const mockSelect = vi.fn(() => ({ from: mockFrom }));

            vi.spyOn(db, 'select').mockImplementation(mockSelect);

            const mockRequest = new Request('http://localhost', {
                  method: 'POST',
                  body: JSON.stringify({
                        groups: [{
                              id: 1,
                              name: 'Group 1',
                              students: [
                                    { id: 1, firstName: 'John', lastName: 'Doe' },
                                    { id: 2, firstName: 'Jane', lastName: 'Smith' }
                              ],
                              score: 0 // Initial score
                        }],
                        nonStandardStudentIds: []
                  })
            });

            const response = await POST({
                  params: { id: '1' },
                  request: mockRequest
            } as any);

            expect(response.status).toBe(200);
            const data = await response.json();
            expect(data.success).toBe(true);

            // Verify that select was called
            expect(mockSelect).toHaveBeenCalled();
            expect(mockGet).toHaveBeenCalled();

            // Verify that the group score was calculated
            expect(data.groups[0].score).toBeGreaterThan(0);
      });

      it('should handle errors gracefully', async () => {
            vi.spyOn(db, 'select').mockImplementationOnce(() => {
                  throw new Error('Database error');
            });

            const mockRequest = new Request('http://localhost', {
                  method: 'POST',
                  body: JSON.stringify({
                        groups: [],
                        nonStandardStudentIds: []
                  })
            });

            try {
                  await POST({
                        params: { id: '1' },
                        request: mockRequest
                  } as any);
            } catch (e: any) {
                  expect(e.status).toBe(500);
            }
      });
}); 