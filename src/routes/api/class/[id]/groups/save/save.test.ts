import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from './+server';
import { db } from '$lib/server/db';

vi.mock('$lib/server/db', () => ({
      db: {
            select: vi.fn(() => ({
                  from: vi.fn(() => ({
                        where: vi.fn(() => ({
                              limit: vi.fn(() => [])
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

      it('should handle saving new group pairings', async () => {
            const mockRequest = new Request('http://localhost', {
                  method: 'POST',
                  body: JSON.stringify({
                        groups: [{
                              id: 1,
                              name: 'Group 1',
                              students: [
                                    { id: 1, firstName: 'John', lastName: 'Doe' },
                                    { id: 2, firstName: 'Jane', lastName: 'Smith' }
                              ]
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