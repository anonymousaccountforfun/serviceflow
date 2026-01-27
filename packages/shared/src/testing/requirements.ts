/**
 * Test Requirements Types
 *
 * Defines the structure for tracking pre-launch test requirements.
 * Used by the registry to manage and report on test coverage.
 */

export type RequirementStatus =
  | 'not_started'      // No test exists
  | 'written'          // Test exists but not verified passing
  | 'passing'          // Automated test passes
  | 'manual_verified'  // Manual verification completed
  | 'blocked';         // Cannot test (dependency issue)

export type RequirementPriority = 'P0' | 'P1' | 'P2';

export type RequirementCategory =
  | 'api'
  | 'ui'
  | 'integration'
  | 'security'
  | 'performance'
  | 'accessibility';

export interface TestRequirement {
  /** Unique ID, e.g., "AI-VOICE-001" */
  id: string;
  /** Feature area, e.g., "AI Voice V1" */
  feature: string;
  /** Short description */
  title: string;
  /** Detailed requirement */
  description: string;
  /** Priority level */
  priority: RequirementPriority;
  /** Category of test */
  category: RequirementCategory;
  /** Current verification status */
  status: RequirementStatus;
  /** Path to test file if exists */
  testFile?: string;
  /** ISO date when last verified */
  verifiedAt?: string;
  /** Who verified (for manual) */
  verifiedBy?: string;
  /** Why blocked */
  blockedReason?: string;
  /** When requirement was added */
  addedAt: string;
  /** Who added it (commit author) */
  addedBy: string;
}

export interface RequirementsReport {
  /** When report was generated */
  generatedAt: string;
  /** Total number of requirements */
  totalRequirements: number;
  /** Count by status */
  byStatus: Record<RequirementStatus, number>;
  /** Count by priority */
  byPriority: Record<RequirementPriority, number>;
  /** All requirements */
  requirements: TestRequirement[];
  /** True if all P0 requirements are passing/verified */
  readyForLaunch: boolean;
}
