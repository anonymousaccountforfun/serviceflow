/**
 * Test Requirements Registry
 *
 * Central registry for managing pre-launch test requirements.
 * Features can add requirements, update their status, and generate reports.
 */

import {
  TestRequirement,
  RequirementsReport,
  RequirementStatus,
  RequirementPriority,
} from './requirements';

export class TestRequirementsRegistry {
  private requirements: Map<string, TestRequirement> = new Map();

  /**
   * Add a new requirement to the registry
   */
  add(req: Omit<TestRequirement, 'addedAt'> & { addedAt?: string }): this {
    const requirement: TestRequirement = {
      ...req,
      addedAt: req.addedAt || new Date().toISOString(),
    };

    if (this.requirements.has(req.id)) {
      console.warn(`Requirement ${req.id} already exists, updating...`);
    }

    this.requirements.set(req.id, requirement);
    return this;
  }

  /**
   * Update the status of an existing requirement
   */
  updateStatus(
    id: string,
    status: RequirementStatus,
    metadata?: {
      verifiedAt?: string;
      verifiedBy?: string;
      blockedReason?: string;
      testFile?: string;
    }
  ): this {
    const req = this.requirements.get(id);
    if (!req) {
      throw new Error(`Requirement ${id} not found`);
    }

    req.status = status;
    if (metadata?.verifiedAt) req.verifiedAt = metadata.verifiedAt;
    if (metadata?.verifiedBy) req.verifiedBy = metadata.verifiedBy;
    if (metadata?.blockedReason) req.blockedReason = metadata.blockedReason;
    if (metadata?.testFile) req.testFile = metadata.testFile;

    return this;
  }

  /**
   * Get all requirements
   */
  getAll(): TestRequirement[] {
    return Array.from(this.requirements.values());
  }

  /**
   * Get requirements by feature
   */
  getByFeature(feature: string): TestRequirement[] {
    return this.getAll().filter((r) => r.feature === feature);
  }

  /**
   * Get requirements by status
   */
  getByStatus(status: RequirementStatus): TestRequirement[] {
    return this.getAll().filter((r) => r.status === status);
  }

  /**
   * Get requirements by priority
   */
  getByPriority(priority: RequirementPriority): TestRequirement[] {
    return this.getAll().filter((r) => r.priority === priority);
  }

  /**
   * Get a single requirement by ID
   */
  get(id: string): TestRequirement | undefined {
    return this.requirements.get(id);
  }

  /**
   * Check if ready for launch (all P0 requirements passing/verified)
   */
  isReadyForLaunch(): boolean {
    const p0Requirements = this.getByPriority('P0');
    return p0Requirements.every(
      (r) => r.status === 'passing' || r.status === 'manual_verified'
    );
  }

  /**
   * Generate a full requirements report
   */
  generateReport(): RequirementsReport {
    const all = this.getAll();
    const byStatus = {} as Record<RequirementStatus, number>;
    const byPriority = {} as Record<RequirementPriority, number>;

    for (const req of all) {
      byStatus[req.status] = (byStatus[req.status] || 0) + 1;
      byPriority[req.priority] = (byPriority[req.priority] || 0) + 1;
    }

    return {
      generatedAt: new Date().toISOString(),
      totalRequirements: all.length,
      byStatus,
      byPriority,
      requirements: all,
      readyForLaunch: this.isReadyForLaunch(),
    };
  }

  /**
   * Clear all requirements (useful for testing)
   */
  clear(): this {
    this.requirements.clear();
    return this;
  }
}

// Singleton instance for the application
export const registry = new TestRequirementsRegistry();
export default registry;
