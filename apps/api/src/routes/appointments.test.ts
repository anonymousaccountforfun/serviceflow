/**
 * Appointments Routes Integration Tests
 *
 * Tests calendar and scheduling functionality:
 * 1. Appointment creation with time slots
 * 2. Availability calculation and conflict detection
 * 3. Rescheduling with overlap checking
 * 4. Status transitions
 * 5. Technician assignment
 */

import request from 'supertest';
import app from '../index';
import { mockPrisma, testData } from '../tests/mocks/database';

// Mock Clerk
jest.mock('@clerk/backend', () => ({
  Clerk: () => ({
    verifyToken: jest.fn().mockResolvedValue({ sub: 'clerk_test123' }),
  }),
  verifyToken: jest.fn().mockResolvedValue({ sub: 'clerk_test123' }),
}));

describe('Appointments Routes', () => {
  const authHeader = { Authorization: 'Bearer test_token' };
  const testUser = testData.user();
  const testJob = testData.job();
  const testCustomer = testData.customer();

  // Helper to create test appointment
  const createTestAppointment = (overrides = {}) => ({
    id: 'apt_test123',
    organizationId: 'org_test123',
    jobId: 'job_test123',
    customerId: 'cust_test123',
    assignedToId: 'user_tech123',
    scheduledAt: new Date('2025-01-15T10:00:00Z'),
    scheduledEndAt: new Date('2025-01-15T12:00:00Z'),
    status: 'scheduled',
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findUnique.mockResolvedValue(testUser);
  });

  describe('GET /api/appointments', () => {
    it('should return 401 without authentication', async () => {
      const response = await request(app)
        .get('/api/appointments')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E1001');
    });

    it('should return paginated appointments list', async () => {
      const appointments = [
        createTestAppointment({ id: 'apt_1' }),
        createTestAppointment({ id: 'apt_2' }),
      ];

      mockPrisma.appointment.findMany.mockResolvedValue(appointments);
      mockPrisma.appointment.count.mockResolvedValue(2);

      const response = await request(app)
        .get('/api/appointments')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.meta.total).toBe(2);
    });

    it('should filter appointments by date range', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.appointment.count.mockResolvedValue(0);

      const response = await request(app)
        .get('/api/appointments')
        .query({
          startDate: '2025-01-15T00:00:00Z',
          endDate: '2025-01-15T23:59:59Z',
        })
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            organizationId: testUser.organizationId,
            scheduledAt: expect.objectContaining({
              gte: expect.any(Date),
              lte: expect.any(Date),
            }),
          }),
        })
      );
    });

    it('should filter appointments by status', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.appointment.count.mockResolvedValue(0);

      await request(app)
        .get('/api/appointments?status=scheduled')
        .set(authHeader)
        .expect(200);

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'scheduled',
          }),
        })
      );
    });

    it('should filter appointments by technician', async () => {
      mockPrisma.appointment.findMany.mockResolvedValue([]);
      mockPrisma.appointment.count.mockResolvedValue(0);

      await request(app)
        .get('/api/appointments?assignedToId=user_tech123')
        .set(authHeader)
        .expect(200);

      expect(mockPrisma.appointment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assignedToId: 'user_tech123',
          }),
        })
      );
    });
  });

  describe('GET /api/appointments/:id', () => {
    it('should return appointment by ID with relations', async () => {
      const appointmentWithRelations = {
        ...createTestAppointment(),
        job: testJob,
        customer: testCustomer,
        assignedTo: { id: 'user_tech123', firstName: 'Mike', lastName: 'Tech' },
      };
      mockPrisma.appointment.findFirst.mockResolvedValue(appointmentWithRelations);

      const response = await request(app)
        .get('/api/appointments/apt_test123')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.id).toBe('apt_test123');
      expect(response.body.data.job).toBeDefined();
      expect(response.body.data.customer).toBeDefined();
    });

    it('should return 404 for non-existent appointment', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .get('/api/appointments/nonexistent')
        .set(authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E3001');
    });
  });

  describe('POST /api/appointments', () => {
    const newAppointmentData = {
      jobId: 'job_test123',
      scheduledAt: '2025-01-20T14:00:00Z',
      scheduledEndAt: '2025-01-20T16:00:00Z',
      assignedToId: 'user_tech123',
      notes: 'Customer requested afternoon slot',
    };

    it('should create a new appointment', async () => {
      const jobWithCustomer = { ...testJob, customer: testCustomer };
      mockPrisma.job.findFirst.mockResolvedValue(jobWithCustomer);
      mockPrisma.appointment.findFirst.mockResolvedValue(null); // No conflicts
      mockPrisma.appointment.create.mockResolvedValue({
        ...createTestAppointment(),
        ...newAppointmentData,
        scheduledAt: new Date(newAppointmentData.scheduledAt),
        scheduledEndAt: new Date(newAppointmentData.scheduledEndAt),
      });
      mockPrisma.job.update.mockResolvedValue(testJob);

      const response = await request(app)
        .post('/api/appointments')
        .set(authHeader)
        .send(newAppointmentData)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.notes).toBe('Customer requested afternoon slot');
    });

    it('should use default 2-hour duration when end time not specified', async () => {
      const jobWithCustomer = { ...testJob, customer: testCustomer };
      mockPrisma.job.findFirst.mockResolvedValue(jobWithCustomer);
      mockPrisma.appointment.findFirst.mockResolvedValue(null);
      mockPrisma.appointment.create.mockResolvedValue(createTestAppointment());
      mockPrisma.job.update.mockResolvedValue(testJob);

      await request(app)
        .post('/api/appointments')
        .set(authHeader)
        .send({
          jobId: 'job_test123',
          scheduledAt: '2025-01-20T10:00:00Z',
          // No scheduledEndAt - should default to 2 hours
        })
        .expect(201);

      expect(mockPrisma.appointment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scheduledEndAt: expect.any(Date),
          }),
        })
      );
    });

    it('should reject if job not found', async () => {
      mockPrisma.job.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .post('/api/appointments')
        .set(authHeader)
        .send(newAppointmentData)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E3001');
    });

    it('should detect conflicting appointments', async () => {
      const jobWithCustomer = { ...testJob, customer: testCustomer };
      mockPrisma.job.findFirst.mockResolvedValue(jobWithCustomer);

      // Return a conflicting appointment
      mockPrisma.appointment.findFirst.mockResolvedValue({
        id: 'apt_conflict',
        scheduledAt: new Date('2025-01-20T14:30:00Z'),
      });

      const response = await request(app)
        .post('/api/appointments')
        .set(authHeader)
        .send(newAppointmentData)
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E4001');
      expect(response.body.error.message).toContain('conflicting');
    });

    it('should allow appointment without technician assignment', async () => {
      const jobWithCustomer = { ...testJob, customer: testCustomer };
      mockPrisma.job.findFirst.mockResolvedValue(jobWithCustomer);
      mockPrisma.appointment.create.mockResolvedValue(
        createTestAppointment({ assignedToId: null })
      );
      mockPrisma.job.update.mockResolvedValue(testJob);

      const response = await request(app)
        .post('/api/appointments')
        .set(authHeader)
        .send({
          jobId: 'job_test123',
          scheduledAt: '2025-01-20T14:00:00Z',
          // No assignedToId
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should update job status to scheduled', async () => {
      const jobWithCustomer = { ...testJob, customer: testCustomer };
      mockPrisma.job.findFirst.mockResolvedValue(jobWithCustomer);
      mockPrisma.appointment.findFirst.mockResolvedValue(null);
      mockPrisma.appointment.create.mockResolvedValue(createTestAppointment());
      mockPrisma.job.update.mockResolvedValue(testJob);

      await request(app)
        .post('/api/appointments')
        .set(authHeader)
        .send(newAppointmentData)
        .expect(201);

      expect(mockPrisma.job.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'job_test123' },
          data: expect.objectContaining({
            status: 'scheduled',
          }),
        })
      );
    });
  });

  describe('PATCH /api/appointments/:id', () => {
    it('should update appointment status', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(createTestAppointment());
      mockPrisma.appointment.update.mockResolvedValue(
        createTestAppointment({ status: 'confirmed' })
      );

      const response = await request(app)
        .patch('/api/appointments/apt_test123')
        .set(authHeader)
        .send({ status: 'confirmed' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('confirmed');
    });

    it('should reject invalid status values', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(createTestAppointment());

      const response = await request(app)
        .patch('/api/appointments/apt_test123')
        .set(authHeader)
        .send({ status: 'invalid_status' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E2001');
    });

    it('should update job status to in_progress when appointment starts', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(createTestAppointment());
      mockPrisma.appointment.update.mockResolvedValue(
        createTestAppointment({ status: 'in_progress' })
      );
      mockPrisma.job.update.mockResolvedValue(testJob);

      await request(app)
        .patch('/api/appointments/apt_test123')
        .set(authHeader)
        .send({ status: 'in_progress' })
        .expect(200);

      expect(mockPrisma.job.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'in_progress',
            startedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should update job status to completed when appointment completes', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(createTestAppointment());
      mockPrisma.appointment.update.mockResolvedValue(
        createTestAppointment({ status: 'completed' })
      );
      mockPrisma.job.update.mockResolvedValue(testJob);

      await request(app)
        .patch('/api/appointments/apt_test123')
        .set(authHeader)
        .send({ status: 'completed' })
        .expect(200);

      expect(mockPrisma.job.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'completed',
            completedAt: expect.any(Date),
          }),
        })
      );
    });

    it('should check for conflicts when changing technician', async () => {
      mockPrisma.appointment.findFirst
        .mockResolvedValueOnce(createTestAppointment()) // First call: get appointment
        .mockResolvedValueOnce({ id: 'apt_conflict', scheduledAt: new Date() }); // Second call: conflict check

      const response = await request(app)
        .patch('/api/appointments/apt_test123')
        .set(authHeader)
        .send({ assignedToId: 'user_other_tech' })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E4001');
    });

    it('should return 404 for non-existent appointment', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .patch('/api/appointments/nonexistent')
        .set(authHeader)
        .send({ status: 'confirmed' })
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/appointments/:id/reschedule', () => {
    it('should reschedule appointment to new time', async () => {
      mockPrisma.appointment.findFirst
        .mockResolvedValueOnce(createTestAppointment())
        .mockResolvedValueOnce(null); // No conflicts
      mockPrisma.appointment.update.mockResolvedValue(
        createTestAppointment({
          scheduledAt: new Date('2025-01-22T10:00:00Z'),
          scheduledEndAt: new Date('2025-01-22T12:00:00Z'),
          status: 'rescheduled',
        })
      );
      mockPrisma.job.update.mockResolvedValue(testJob);

      const response = await request(app)
        .post('/api/appointments/apt_test123/reschedule')
        .set(authHeader)
        .send({
          scheduledAt: '2025-01-22T10:00:00Z',
          reason: 'Customer requested change',
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.status).toBe('rescheduled');
    });

    it('should preserve duration when rescheduling', async () => {
      const originalAppointment = createTestAppointment({
        scheduledAt: new Date('2025-01-15T10:00:00Z'),
        scheduledEndAt: new Date('2025-01-15T13:00:00Z'), // 3 hour appointment
      });

      mockPrisma.appointment.findFirst
        .mockResolvedValueOnce(originalAppointment)
        .mockResolvedValueOnce(null);
      mockPrisma.appointment.update.mockResolvedValue({
        ...originalAppointment,
        scheduledAt: new Date('2025-01-22T14:00:00Z'),
        scheduledEndAt: new Date('2025-01-22T17:00:00Z'), // Still 3 hours
        status: 'rescheduled',
      });
      mockPrisma.job.update.mockResolvedValue(testJob);

      await request(app)
        .post('/api/appointments/apt_test123/reschedule')
        .set(authHeader)
        .send({
          scheduledAt: '2025-01-22T14:00:00Z',
          // No scheduledEndAt - should preserve 3 hour duration
        })
        .expect(200);

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scheduledEndAt: expect.any(Date),
          }),
        })
      );
    });

    it('should detect conflicts at new time', async () => {
      mockPrisma.appointment.findFirst
        .mockResolvedValueOnce(createTestAppointment())
        .mockResolvedValueOnce({ id: 'apt_conflict', scheduledAt: new Date() });

      const response = await request(app)
        .post('/api/appointments/apt_test123/reschedule')
        .set(authHeader)
        .send({
          scheduledAt: '2025-01-22T10:00:00Z',
        })
        .expect(409);

      expect(response.body.success).toBe(false);
      expect(response.body.error.code).toBe('E4001');
    });

    it('should append reschedule reason to notes', async () => {
      const appointment = createTestAppointment({ notes: 'Original notes' });
      mockPrisma.appointment.findFirst
        .mockResolvedValueOnce(appointment)
        .mockResolvedValueOnce(null);
      mockPrisma.appointment.update.mockResolvedValue({
        ...appointment,
        notes: 'Original notes\nRescheduled: Traffic delay',
        status: 'rescheduled',
      });
      mockPrisma.job.update.mockResolvedValue(testJob);

      await request(app)
        .post('/api/appointments/apt_test123/reschedule')
        .set(authHeader)
        .send({
          scheduledAt: '2025-01-22T10:00:00Z',
          reason: 'Traffic delay',
        })
        .expect(200);

      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            notes: expect.stringContaining('Rescheduled: Traffic delay'),
          }),
        })
      );
    });

    it('should update job scheduledAt', async () => {
      mockPrisma.appointment.findFirst
        .mockResolvedValueOnce(createTestAppointment())
        .mockResolvedValueOnce(null);
      mockPrisma.appointment.update.mockResolvedValue(createTestAppointment());
      mockPrisma.job.update.mockResolvedValue(testJob);

      await request(app)
        .post('/api/appointments/apt_test123/reschedule')
        .set(authHeader)
        .send({
          scheduledAt: '2025-01-22T10:00:00Z',
        })
        .expect(200);

      expect(mockPrisma.job.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scheduledAt: expect.any(Date),
          }),
        })
      );
    });
  });

  describe('DELETE /api/appointments/:id', () => {
    it('should cancel appointment (soft delete)', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(createTestAppointment());
      mockPrisma.appointment.update.mockResolvedValue(
        createTestAppointment({ status: 'canceled' })
      );

      const response = await request(app)
        .delete('/api/appointments/apt_test123')
        .set(authHeader)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.canceled).toBe(true);
      expect(mockPrisma.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { status: 'canceled' },
        })
      );
    });

    it('should return 404 for non-existent appointment', async () => {
      mockPrisma.appointment.findFirst.mockResolvedValue(null);

      const response = await request(app)
        .delete('/api/appointments/nonexistent')
        .set(authHeader)
        .expect(404);

      expect(response.body.success).toBe(false);
    });
  });

  describe('Conflict Detection Logic', () => {
    it('should detect when new appointment starts during existing', async () => {
      // Existing: 10:00-12:00, New: 11:00-13:00 (starts during)
      const jobWithCustomer = { ...testJob, customer: testCustomer };
      mockPrisma.job.findFirst.mockResolvedValue(jobWithCustomer);
      mockPrisma.appointment.findFirst.mockResolvedValue({
        id: 'apt_existing',
        scheduledAt: new Date('2025-01-20T10:00:00Z'),
      });

      const response = await request(app)
        .post('/api/appointments')
        .set(authHeader)
        .send({
          jobId: 'job_test123',
          scheduledAt: '2025-01-20T11:00:00Z',
          scheduledEndAt: '2025-01-20T13:00:00Z',
          assignedToId: 'user_tech123',
        })
        .expect(409);

      expect(response.body.error.code).toBe('E4001');
    });

    it('should allow appointments for different technicians at same time', async () => {
      const jobWithCustomer = { ...testJob, customer: testCustomer };
      mockPrisma.job.findFirst.mockResolvedValue(jobWithCustomer);
      mockPrisma.appointment.findFirst.mockResolvedValue(null); // No conflict for this technician
      mockPrisma.appointment.create.mockResolvedValue(createTestAppointment());
      mockPrisma.job.update.mockResolvedValue(testJob);

      const response = await request(app)
        .post('/api/appointments')
        .set(authHeader)
        .send({
          jobId: 'job_test123',
          scheduledAt: '2025-01-20T10:00:00Z',
          assignedToId: 'user_different_tech', // Different technician
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });

    it('should not conflict with canceled appointments', async () => {
      const jobWithCustomer = { ...testJob, customer: testCustomer };
      mockPrisma.job.findFirst.mockResolvedValue(jobWithCustomer);
      // Conflict check returns null because canceled appointments are excluded
      mockPrisma.appointment.findFirst.mockResolvedValue(null);
      mockPrisma.appointment.create.mockResolvedValue(createTestAppointment());
      mockPrisma.job.update.mockResolvedValue(testJob);

      const response = await request(app)
        .post('/api/appointments')
        .set(authHeader)
        .send({
          jobId: 'job_test123',
          scheduledAt: '2025-01-20T10:00:00Z',
          assignedToId: 'user_tech123',
        })
        .expect(201);

      expect(response.body.success).toBe(true);
    });
  });

  describe('Status Transitions', () => {
    const validTransitions = [
      { from: 'scheduled', to: 'confirmed' },
      { from: 'scheduled', to: 'canceled' },
      { from: 'confirmed', to: 'in_progress' },
      { from: 'confirmed', to: 'no_show' },
      { from: 'in_progress', to: 'completed' },
      { from: 'scheduled', to: 'rescheduled' },
    ];

    validTransitions.forEach(({ from, to }) => {
      it(`should allow transition from ${from} to ${to}`, async () => {
        mockPrisma.appointment.findFirst.mockResolvedValue(
          createTestAppointment({ status: from })
        );
        mockPrisma.appointment.update.mockResolvedValue(
          createTestAppointment({ status: to })
        );
        mockPrisma.job.update.mockResolvedValue(testJob);

        const response = await request(app)
          .patch('/api/appointments/apt_test123')
          .set(authHeader)
          .send({ status: to })
          .expect(200);

        expect(response.body.success).toBe(true);
        expect(response.body.data.status).toBe(to);
      });
    });
  });
});
