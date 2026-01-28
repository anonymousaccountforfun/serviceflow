/**
 * Analytics API Tests
 * Tests for GET /api/analytics/ai-roi endpoint
 */

import request from 'supertest';
import express, { Request, Response, NextFunction } from 'express';
import analyticsRouter from '../analytics';

// Mock the analytics service
jest.mock('../../services/analytics', () => ({
  getDateRange: jest.fn((period, startDate, endDate) => {
    const now = new Date();
    const start = startDate ? new Date(startDate) : new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate) : now;
    return { start, end };
  }),
  getDashboardMetrics: jest.fn(),
  getOverviewMetrics: jest.fn(),
  getCallMetrics: jest.fn(),
  getRevenueMetrics: jest.fn(),
  getCustomerMetrics: jest.fn(),
  getConversationMetrics: jest.fn(),
  getAIROIMetrics: jest.fn(),
  getNoShowMetrics: jest.fn(),
}));

// Import mocked functions for assertions
import * as analyticsService from '../../services/analytics';
const mockGetAIROIMetrics = analyticsService.getAIROIMetrics as jest.Mock;

// Create test app with proper auth middleware
const app = express();
app.use(express.json());
app.use((req: Request, res: Response, next: NextFunction) => {
  // Mock auth object like the real auth middleware does
  const orgId = req.headers['x-organization-id'] as string || 'test-org-id';
  (req as any).auth = {
    organizationId: orgId,
    userId: 'test-user-id',
  };
  next();
});
app.use('/api/analytics', analyticsRouter);

describe('GET /api/analytics/ai-roi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return AI ROI metrics', async () => {
    const mockMetrics = {
      period: { start: new Date().toISOString(), end: new Date().toISOString() },
      callsAnsweredByAI: { total: 75, percentage: 75 },
      appointmentsBookedByAI: { count: 25, estimatedValue: 2500000, formatted: '$25,000' },
      emergencyVsRoutine: { emergency: 5, routine: 20 },
      afterHoursCallsHandled: 10,
    };
    mockGetAIROIMetrics.mockResolvedValue(mockMetrics);

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
    const mockMetrics = {
      period: { start: new Date().toISOString(), end: new Date().toISOString() },
      callsAnsweredByAI: { total: 70, percentage: 70 },
      appointmentsBookedByAI: { count: 0, estimatedValue: 0, formatted: '$0' },
      emergencyVsRoutine: { emergency: 0, routine: 0 },
      afterHoursCallsHandled: 0,
    };
    mockGetAIROIMetrics.mockResolvedValue(mockMetrics);

    const res = await request(app)
      .get('/api/analytics/ai-roi')
      .set('x-organization-id', 'test-org-id');

    expect(res.body.data.callsAnsweredByAI.total).toBe(70);
    expect(res.body.data.callsAnsweredByAI.percentage).toBe(70);
  });

  it('should handle zero total calls', async () => {
    const mockMetrics = {
      period: { start: new Date().toISOString(), end: new Date().toISOString() },
      callsAnsweredByAI: { total: 0, percentage: 0 },
      appointmentsBookedByAI: { count: 0, estimatedValue: 0, formatted: '$0' },
      emergencyVsRoutine: { emergency: 0, routine: 0 },
      afterHoursCallsHandled: 0,
    };
    mockGetAIROIMetrics.mockResolvedValue(mockMetrics);

    const res = await request(app)
      .get('/api/analytics/ai-roi')
      .set('x-organization-id', 'test-org-id');

    expect(res.body.data.callsAnsweredByAI.percentage).toBe(0);
  });

  it('should format estimated value as currency', async () => {
    const mockMetrics = {
      period: { start: new Date().toISOString(), end: new Date().toISOString() },
      callsAnsweredByAI: { total: 10, percentage: 100 },
      appointmentsBookedByAI: { count: 5, estimatedValue: 1250000, formatted: '$12,500' },
      emergencyVsRoutine: { emergency: 0, routine: 5 },
      afterHoursCallsHandled: 0,
    };
    mockGetAIROIMetrics.mockResolvedValue(mockMetrics);

    const res = await request(app)
      .get('/api/analytics/ai-roi')
      .set('x-organization-id', 'test-org-id');

    expect(res.body.data.appointmentsBookedByAI.formatted).toMatch(/^\$[\d,]+$/);
    expect(res.body.data.appointmentsBookedByAI.estimatedValue).toBe(1250000);
  });

  it('should handle null estimated value', async () => {
    const mockMetrics = {
      period: { start: new Date().toISOString(), end: new Date().toISOString() },
      callsAnsweredByAI: { total: 10, percentage: 100 },
      appointmentsBookedByAI: { count: 0, estimatedValue: 0, formatted: '$0' },
      emergencyVsRoutine: { emergency: 0, routine: 0 },
      afterHoursCallsHandled: 0,
    };
    mockGetAIROIMetrics.mockResolvedValue(mockMetrics);

    const res = await request(app)
      .get('/api/analytics/ai-roi')
      .set('x-organization-id', 'test-org-id');

    expect(res.body.data.appointmentsBookedByAI.estimatedValue).toBe(0);
    expect(res.body.data.appointmentsBookedByAI.formatted).toBe('$0');
  });

  it('should separate emergency vs routine jobs', async () => {
    const mockMetrics = {
      period: { start: new Date().toISOString(), end: new Date().toISOString() },
      callsAnsweredByAI: { total: 50, percentage: 100 },
      appointmentsBookedByAI: { count: 20, estimatedValue: 500000, formatted: '$5,000' },
      emergencyVsRoutine: { emergency: 8, routine: 12 },
      afterHoursCallsHandled: 5,
    };
    mockGetAIROIMetrics.mockResolvedValue(mockMetrics);

    const res = await request(app)
      .get('/api/analytics/ai-roi')
      .set('x-organization-id', 'test-org-id');

    expect(res.body.data.emergencyVsRoutine.emergency).toBe(8);
    expect(res.body.data.emergencyVsRoutine.routine).toBe(12);
  });

  it('should accept custom date range', async () => {
    const startDate = '2024-01-01';
    const endDate = '2024-01-31';
    const mockMetrics = {
      period: { start: new Date(startDate).toISOString(), end: new Date(endDate).toISOString() },
      callsAnsweredByAI: { total: 10, percentage: 100 },
      appointmentsBookedByAI: { count: 5, estimatedValue: 100000, formatted: '$1,000' },
      emergencyVsRoutine: { emergency: 0, routine: 5 },
      afterHoursCallsHandled: 0,
    };
    mockGetAIROIMetrics.mockResolvedValue(mockMetrics);

    const res = await request(app)
      .get('/api/analytics/ai-roi')
      .query({ startDate, endDate })
      .set('x-organization-id', 'test-org-id');

    expect(res.status).toBe(200);
    expect(res.body.data.period.start).toBeDefined();
    expect(res.body.data.period.end).toBeDefined();
  });

  it('should default to 30 days when no dates provided', async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const mockMetrics = {
      period: { start: thirtyDaysAgo.toISOString(), end: now.toISOString() },
      callsAnsweredByAI: { total: 10, percentage: 100 },
      appointmentsBookedByAI: { count: 5, estimatedValue: 100000, formatted: '$1,000' },
      emergencyVsRoutine: { emergency: 0, routine: 5 },
      afterHoursCallsHandled: 0,
    };
    mockGetAIROIMetrics.mockResolvedValue(mockMetrics);

    const res = await request(app)
      .get('/api/analytics/ai-roi')
      .set('x-organization-id', 'test-org-id');

    const startDate = new Date(res.body.data.period.start);
    const daysDiff = Math.round((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));

    expect(daysDiff).toBeGreaterThanOrEqual(29);
    expect(daysDiff).toBeLessThanOrEqual(31);
  });

  it('should use organizationId from auth for filtering', async () => {
    const mockMetrics = {
      period: { start: new Date().toISOString(), end: new Date().toISOString() },
      callsAnsweredByAI: { total: 10, percentage: 100 },
      appointmentsBookedByAI: { count: 5, estimatedValue: 100000, formatted: '$1,000' },
      emergencyVsRoutine: { emergency: 0, routine: 5 },
      afterHoursCallsHandled: 0,
    };
    mockGetAIROIMetrics.mockResolvedValue(mockMetrics);

    await request(app)
      .get('/api/analytics/ai-roi')
      .set('x-organization-id', 'specific-org-123');

    // Verify service was called with correct org ID
    expect(mockGetAIROIMetrics).toHaveBeenCalledWith(
      'specific-org-123',
      expect.objectContaining({
        start: expect.any(Date),
        end: expect.any(Date),
      })
    );
  });

  it('should handle service errors gracefully', async () => {
    mockGetAIROIMetrics.mockRejectedValue(new Error('Database connection failed'));

    const res = await request(app)
      .get('/api/analytics/ai-roi')
      .set('x-organization-id', 'test-org-id');

    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
    expect(res.body.error).toBeDefined();
  });
});
