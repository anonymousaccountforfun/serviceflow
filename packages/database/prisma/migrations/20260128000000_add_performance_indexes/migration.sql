-- Add performance indexes for common query patterns

-- Job indexes for sorting/filtering by date
CREATE INDEX IF NOT EXISTS "Job_createdAt_idx" ON "Job"("createdAt");
CREATE INDEX IF NOT EXISTS "Job_updatedAt_idx" ON "Job"("updatedAt");

-- Appointment composite indexes for calendar queries
CREATE INDEX IF NOT EXISTS "Appointment_organizationId_assignedToId_scheduledAt_idx" ON "Appointment"("organizationId", "assignedToId", "scheduledAt");
CREATE INDEX IF NOT EXISTS "Appointment_assignedToId_scheduledAt_idx" ON "Appointment"("assignedToId", "scheduledAt");
