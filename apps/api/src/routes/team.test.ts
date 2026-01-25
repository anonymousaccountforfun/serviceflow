/**
 * Team Routes Integration Tests
 */

import request from 'supertest';
import app from '../index';
import { mockPrisma, testData } from '../tests/mocks/database';

// Mock Clerk
jest.mock('@clerk/backend', () => ({
  createClerkClient: () => ({
    verifyToken: jest.fn().mockResolvedValue({ sub: 'clerk_test123' }),
    invitations: {
      createInvitation: jest.fn().mockResolvedValue({
        id: 'inv_test123',
        emailAddress: 'newuser@example.com',
        status: 'pending',
      }),
    },
  }),
}));

describe('Team Routes', () => {
  const authHeader = { Authorization: 'Bearer test_token' };
  const testOwner = testData.user({ role: 'owner' });
  const testAdmin = testData.user({ id: 'user_admin', role: 'admin', email: 'admin@example.com' });
  const testTechnician = testData.user({ id: 'user_tech', role: 'technician', email: 'tech@example.com' });

  beforeEach(() => {
    jest.clearAllMocks();
    // Default to owner user for most tests
    mockPrisma.user.findUnique.mockResolvedValue(testOwner);
  });

  describe('GET /api/team', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/team')
        .expect(401);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for technician role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(testTechnician);

      const response = await request(app)
        .get('/api/team')
        .set(authHeader)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E1006');
    });

    it('should return team members with job counts for owner', async () => {
      const teamMembers = [
        { ...testOwner, _count: { assignedJobs: 5 } },
        { ...testAdmin, _count: { assignedJobs: 3 } },
        { ...testTechnician, _count: { assignedJobs: 8 } },
      ];

      mockPrisma.user.findMany.mockResolvedValue(teamMembers);

      const response = await request(app)
        .get('/api/team')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.members).toHaveLength(3);
      expect(response.body.data.members[0].jobCount).toBe(5);
    });

    it('should return team members for admin role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(testAdmin);
      mockPrisma.user.findMany.mockResolvedValue([
        { ...testAdmin, _count: { assignedJobs: 3 } },
      ]);

      const response = await request(app)
        .get('/api/team')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('POST /api/team/invite', () => {
    it('should invite a new team member', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null); // No existing user
      mockPrisma.organization.findUnique.mockResolvedValue(testData.organization());

      const response = await request(app)
        .post('/api/team/invite')
        .set(authHeader)
        .send({ email: 'newuser@example.com', role: 'technician' })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.email).toBe('newuser@example.com');
      expect(response.body.data.role).toBe('technician');
      expect(response.body.data.status).toBe('pending');
    });

    it('should reject existing team member email', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testTechnician);

      const response = await request(app)
        .post('/api/team/invite')
        .set(authHeader)
        .send({ email: 'tech@example.com', role: 'technician' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E4001');
    });

    it('should reject invalid email', async () => {
      const response = await request(app)
        .post('/api/team/invite')
        .set(authHeader)
        .send({ email: 'not-an-email', role: 'technician' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E4002');
    });

    it('should reject invalid role', async () => {
      const response = await request(app)
        .post('/api/team/invite')
        .set(authHeader)
        .send({ email: 'valid@example.com', role: 'superadmin' })
        .expect(400);

      expect(response.body.success).toBe(false);
    });

    it('should return 403 for technician role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(testTechnician);

      const response = await request(app)
        .post('/api/team/invite')
        .set(authHeader)
        .send({ email: 'newuser@example.com', role: 'technician' })
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });

  describe('PATCH /api/team/:id', () => {
    it('should update team member role', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testTechnician);
      mockPrisma.user.update.mockResolvedValue({
        ...testTechnician,
        role: 'admin',
      });

      const response = await request(app)
        .patch(`/api/team/${testTechnician.id}`)
        .set(authHeader)
        .send({ role: 'admin' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.role).toBe('admin');
    });

    it('should return 404 for non-existent team member', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/team/nonexistent')
        .set(authHeader)
        .send({ role: 'admin' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E3001');
    });

    it('should prevent changing owner role', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testOwner);

      const response = await request(app)
        .patch(`/api/team/${testOwner.id}`)
        .set(authHeader)
        .send({ role: 'admin' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('owner');
    });

    it('should prevent users from changing their own role', async () => {
      // Owner trying to change their own role
      mockPrisma.user.findFirst.mockResolvedValue({
        ...testAdmin,
        id: testOwner.id, // Same ID as current user
      });

      const response = await request(app)
        .patch(`/api/team/${testOwner.id}`)
        .set(authHeader)
        .send({ role: 'technician' })
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('your own role');
    });
  });

  describe('DELETE /api/team/:id', () => {
    it('should remove team member without active jobs', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testTechnician);
      mockPrisma.job.count.mockResolvedValue(0); // No active jobs
      mockPrisma.user.update.mockResolvedValue({ ...testTechnician, isActive: false });

      const response = await request(app)
        .delete(`/api/team/${testTechnician.id}`)
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.deleted).toBe(true);
    });

    it('should prevent removing member with active jobs', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(testTechnician);
      mockPrisma.job.count.mockResolvedValue(3); // Has active jobs

      const response = await request(app)
        .delete(`/api/team/${testTechnician.id}`)
        .set(authHeader)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E4003');
      expect(response.body.error.activeJobCount).toBe(3);
    });

    it('should prevent removing the owner', async () => {
      // Create a different owner for this test
      const otherOwner = testData.user({ id: 'other_owner', role: 'owner' });
      mockPrisma.user.findFirst.mockResolvedValue(otherOwner);

      const response = await request(app)
        .delete(`/api/team/${otherOwner.id}`)
        .set(authHeader)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('owner');
    });

    it('should prevent self-removal', async () => {
      // User trying to delete themselves
      mockPrisma.user.findFirst.mockResolvedValue({
        ...testAdmin,
        id: testOwner.id, // Same ID as current user
      });

      const response = await request(app)
        .delete(`/api/team/${testOwner.id}`)
        .set(authHeader)
        .expect(403);

      expect(response.body.success).toBe(false);
      expect(response.body.error.message).toContain('yourself');
    });

    it('should return 404 for non-existent team member', async () => {
      mockPrisma.user.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/team/nonexistent')
        .set(authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('GET /api/team/workload', () => {
    it('should return workload data for technicians', async () => {
      const technicians = [
        { id: 'tech1', firstName: 'John', lastName: 'Doe', avatarUrl: null, role: 'technician' },
        { id: 'tech2', firstName: 'Jane', lastName: 'Smith', avatarUrl: null, role: 'technician' },
      ];

      mockPrisma.user.findMany.mockResolvedValue(technicians);
      mockPrisma.job.groupBy
        .mockResolvedValueOnce([
          { assignedToId: 'tech1', _count: { id: 2 } },
          { assignedToId: 'tech2', _count: { id: 5 } },
        ]) // Today's jobs
        .mockResolvedValueOnce([
          { assignedToId: 'tech1', _count: { id: 10 } },
          { assignedToId: 'tech2', _count: { id: 15 } },
        ]); // Week's jobs

      const response = await request(app)
        .get('/api/team/workload')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.technicians).toHaveLength(2);

      // Sorted by today's workload (lowest first)
      expect(response.body.data.technicians[0].todayJobs).toBe(2);
      expect(response.body.data.technicians[0].weekJobs).toBe(10);
      expect(response.body.data.technicians[0].status).toBe('available');

      expect(response.body.data.technicians[1].todayJobs).toBe(5);
      expect(response.body.data.technicians[1].status).toBe('busy');

      // Check period data is included
      expect(response.body.data.period.today).toBeDefined();
      expect(response.body.data.period.week).toBeDefined();
    });

    it('should return correct status based on workload', async () => {
      const technicians = [
        { id: 'tech1', firstName: 'Low', lastName: 'Load', avatarUrl: null, role: 'technician' },
        { id: 'tech2', firstName: 'Med', lastName: 'Load', avatarUrl: null, role: 'technician' },
        { id: 'tech3', firstName: 'High', lastName: 'Load', avatarUrl: null, role: 'technician' },
      ];

      mockPrisma.user.findMany.mockResolvedValue(technicians);
      mockPrisma.job.groupBy
        .mockResolvedValueOnce([
          { assignedToId: 'tech1', _count: { id: 2 } },  // available (<=3)
          { assignedToId: 'tech2', _count: { id: 5 } },  // busy (4-6)
          { assignedToId: 'tech3', _count: { id: 8 } },  // overloaded (>=7)
        ])
        .mockResolvedValueOnce([]);

      const response = await request(app)
        .get('/api/team/workload')
        .set(authHeader)
        .expect(200);

      const techs = response.body.data.technicians;
      expect(techs.find((t: any) => t.id === 'tech1').status).toBe('available');
      expect(techs.find((t: any) => t.id === 'tech2').status).toBe('busy');
      expect(techs.find((t: any) => t.id === 'tech3').status).toBe('overloaded');
    });

    it('should return 403 for technician role', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(testTechnician);

      const response = await request(app)
        .get('/api/team/workload')
        .set(authHeader)
        .expect(403);

      expect(response.body.success).toBe(false);
    });
  });
});
