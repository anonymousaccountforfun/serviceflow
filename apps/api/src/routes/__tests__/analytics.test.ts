/**
 * Analytics API Tests
 * Tests for GET /api/analytics/ai-roi endpoint
 */

import { jest, describe, it, expect, beforeEach } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import analyticsRouter from '../analytics';
import { mockPrisma } from '../../tests/mocks/database';

// Create test app
const app = express();
app.use(express.json());
app.use((req, res, next) => {
  // Mock auth middleware - set org ID from header
  req.headers['x-organization-id'] = req.headers['x-organization-id'] || 'test-org-id';
  next();
});
app.use('/api/analytics', analyticsRouter);

describe('GET /api/analytics/ai-roi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return AI ROI metrics', async () => {
    // Setup mocks
    mockPrisma.call.count
      .mockResolvedValueOnce(100) // totalCalls
      .mockResolvedValueOnce(75); // aiCalls

    mockPrisma.job.count
      .mockResolvedValueOnce(25) // aiJobs
      .mockResolvedValueOnce(5); // emergencyJobs

    mockPrisma.job.aggregate.mockResolvedValue({
      _sum: { estimatedValue: 2500000 }, // $25,000 in cents
    });

    const res = await request(app)
      .get('/api/analytics/ai-roi')
      .set('x-organization-id', 'test-org-id');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('callsAnsweredByAI');
    expect(res.body.data).toHaveProperty('appointmentsBookedByAI');
    expect(res.body.data).toHaveProperty('emergencyVsRoutine');
    expect(res.body.data).toHaveProperty('afterHoursCallsHandled');
  });

  it('should calculate correct AI call percentage', async () => {
    mockPrisma.call.count
      .mockResolvedValueOnce(100) // totalCalls
      .mockResolvedValueOnce(70); // aiCalls (70%)

    mockPrisma.job.count.mockResolvedValue(0);
    mockPrisma.job.aggregate.mockResolvedValue({ _sum: { estimatedValue: null } });

    const res = await request(app)
      .get('/api/analytics/ai-roi')
      .set('x-organization-id', 'test-org-id');

    expect(res.body.data.callsAnsweredByAI.total).toBe(70);
    expect(res.body.data.callsAnsweredByAI.percentage).toBe(70);
  });

  it('should handle zero total calls', async () => {
    mockPrisma.call.count.mockResolvedValue(0);
    mockPrisma.job.count.mockResolvedValue(0);
    mockPrisma.job.aggregate.mockResolvedValue({ _sum: { estimatedValue: null } });

    const res = await request(app)
      .get('/api/analytics/ai-roi')
      .set('x-organization-id', 'test-org-id');

    expect(res.body.data.callsAnsweredByAI.percentage).toBe(0);
  });

  it('should format estimated value as currency', async () => {
    mockPrisma.call.count.mockResolvedValue(10);
    mockPrisma.job.count.mockResolvedValue(5);
    mockPrisma.job.aggregate.mockResolvedValue({
      _sum: { estimatedValue: 1250000 }, // $12,500 in cents
    });

    const res = await request(app)
      .get('/api/analytics/ai-roi')
      .set('x-organization-id', 'test-org-id');

    expect(res.body.data.appointmentsBookedByAI.formatted).toMatch(/^\$[\d,]+$/);
    expect(res.body.data.appointmentsBookedByAI.estimatedValue).toBe(1250000);
  });

  it('should handle null estimated value', async () => {
    mockPrisma.call.count.mockResolvedValue(10);
    mockPrisma.job.count.mockResolvedValue(0);
    mockPrisma.job.aggregate.mockResolvedValue({ _sum: { estimatedValue: null } });

    const res = await request(app)
      .get('/api/analytics/ai-roi')
      .set('x-organization-id', 'test-org-id');

    expect(res.body.data.appointmentsBookedByAI.estimatedValue).toBe(0);
    expect(res.body.data.appointmentsBookedByAI.formatted).toBe('$0');
  });

  it('should separate emergency vs routine jobs', async () => {
    mockPrisma.call.count.mockResolvedValue(50);
    mockPrisma.job.count
      .mockResolvedValueOnce(20) // aiJobs total
      .mockResolvedValueOnce(8); // emergencyJobs

    mockPrisma.job.aggregate.mockResolvedValue({ _sum: { estimatedValue: 500000 } });

    const res = await request(app)
      .get('/api/analytics/ai-roi')
      .set('x-organization-id', 'test-org-id');

    expect(res.body.data.emergencyVsRoutine.emergency).toBe(8);
    expect(res.body.data.emergencyVsRoutine.routine).toBe(12); // 20 - 8
  });

  it('should accept custom date range', async () => {
    mockPrisma.call.count.mockResolvedValue(10);
    mockPrisma.job.count.mockResolvedValue(5);
    mockPrisma.job.aggregate.mockResolvedValue({ _sum: { estimatedValue: 100000 } });

    const res = await request(app)
      .get('/api/analytics/ai-roi')
      .query({ startDate: '2024-01-01', endDate: '2024-01-31' })
      .set('x-organization-id', 'test-org-id');

    expect(res.status).toBe(200);
    expect(res.body.data.period.start).toBeDefined();
    expect(res.body.data.period.end).toBeDefined();
  });

  it('should default to 30 days when no dates provided', async () => {
    mockPrisma.call.count.mockResolvedValue(10);
    mockPrisma.job.count.mockResolvedValue(5);
    mockPrisma.job.aggregate.mockResolvedValue({ _sum: { estimatedValue: 100000 } });

    const res = await request(app)
      .get('/api/analytics/ai-roi')
      .set('x-organization-id', 'test-org-id');

    const startDate = new Date(res.body.data.period.start);
    const now = new Date();
    const daysDiff = Math.round((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    expect(daysDiff).toBeGreaterThanOrEqual(29);
    expect(daysDiff).toBeLessThanOrEqual(31);
  });

  it('should use organizationId from header for filtering', async () => {
    mockPrisma.call.count.mockResolvedValue(10);
    mockPrisma.job.count.mockResolvedValue(5);
    mockPrisma.job.aggregate.mockResolvedValue({ _sum: { estimatedValue: 100000 } });

    await request(app)
      .get('/api/analytics/ai-roi')
      .set('x-organization-id', 'specific-org-123');

    // Verify the first call.count was called with the correct org ID
    expect(mockPrisma.call.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'specific-org-123',
        }),
      })
    );
  });

  it('should filter AI calls by aiHandled: true', async () => {
    mockPrisma.call.count.mockResolvedValue(10);
    mockPrisma.job.count.mockResolvedValue(5);
    mockPrisma.job.aggregate.mockResolvedValue({ _sum: { estimatedValue: 100000 } });

    await request(app)
      .get('/api/analytics/ai-roi')
      .set('x-organization-id', 'test-org-id');

    // Second call.count should have aiHandled: true
    expect(mockPrisma.call.count).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: expect.objectContaining({
          aiHandled: true,
        }),
      })
    );
  });

  it('should filter AI jobs by customer source: phone_ai', async () => {
    mockPrisma.call.count.mockResolvedValue(10);
    mockPrisma.job.count.mockResolvedValue(5);
    mockPrisma.job.aggregate.mockResolvedValue({ _sum: { estimatedValue: 100000 } });

    await request(app)
      .get('/api/analytics/ai-roi')
      .set('x-organization-id', 'test-org-id');

    // job.count should filter by customer source
    expect(mockPrisma.job.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          customer: expect.objectContaining({
            source: 'phone_ai',
          }),
        }),
      })
    );
  });

  it('should handle database errors gracefully', async () => {
    mockPrisma.call.count.mockRejectedValue(new Error('Database connection failed'));

    const res = await request(app)
      .get('/api/analytics/ai-roi')
      .set('x-organization-id', 'test-org-id');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });
});
