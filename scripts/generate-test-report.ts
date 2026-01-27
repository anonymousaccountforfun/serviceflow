#!/usr/bin/env npx tsx

/**
 * Test Requirements Report Generator
 *
 * Generates markdown and JSON reports from the test requirements registry.
 *
 * Usage:
 *   pnpm test:requirements      - Generate report
 *   pnpm test:requirements:ci   - Generate report and fail if not launch-ready
 */

import * as fs from 'fs';
import * as path from 'path';

// Import the registry (this loads all feature requirements)
import {
  registry,
  RequirementsReport,
  RequirementStatus,
  RequirementPriority,
} from '../packages/shared/src/testing';

function generateMarkdown(report: RequirementsReport): string {
  const {
    generatedAt,
    totalRequirements,
    byStatus,
    byPriority,
    requirements,
    readyForLaunch,
  } = report;

  const statusEmoji: Record<RequirementStatus, string> = {
    not_started: '⬜',
    written: '📝',
    passing: '✅',
    manual_verified: '✔️',
    blocked: '🚫',
  };

  const priorityLabel: Record<RequirementPriority, string> = {
    P0: '🔴 P0 (Critical)',
    P1: '🟡 P1 (High)',
    P2: '🟢 P2 (Medium)',
  };

  let md = `# Pre-Launch Test Requirements Report

> Generated: ${new Date(generatedAt).toLocaleString()}

## Summary

| Metric | Value |
|--------|-------|
| Total Requirements | ${totalRequirements} |
| Ready for Launch | ${readyForLaunch ? '✅ YES' : '❌ NO'} |

### By Status

| Status | Count |
|--------|-------|
`;

  for (const [status, count] of Object.entries(byStatus)) {
    md += `| ${statusEmoji[status as RequirementStatus] || ''} ${status} | ${count} |\n`;
  }

  md += `
### By Priority

| Priority | Count |
|----------|-------|
`;

  for (const [priority, count] of Object.entries(byPriority)) {
    md += `| ${priorityLabel[priority as RequirementPriority] || priority} | ${count} |\n`;
  }

  md += `
---

## Requirements by Feature

`;

  // Group by feature
  const byFeature = new Map<string, typeof requirements>();
  for (const req of requirements) {
    const list = byFeature.get(req.feature) || [];
    list.push(req);
    byFeature.set(req.feature, list);
  }

  for (const [feature, reqs] of byFeature) {
    md += `### ${feature}\n\n`;
    md += `| ID | Title | Priority | Status | Test File |\n`;
    md += `|----|-------|----------|--------|----------|\n`;

    for (const req of reqs.sort((a, b) => a.priority.localeCompare(b.priority))) {
      const status = `${statusEmoji[req.status]} ${req.status}`;
      const testFile = req.testFile ? `\`${path.basename(req.testFile)}\`` : '-';
      md += `| ${req.id} | ${req.title} | ${req.priority} | ${status} | ${testFile} |\n`;
    }
    md += '\n';
  }

  // Detailed requirements
  md += `---

## Detailed Requirements

`;

  for (const req of requirements) {
    md += `### ${req.id}: ${req.title}

- **Feature:** ${req.feature}
- **Priority:** ${priorityLabel[req.priority]}
- **Category:** ${req.category}
- **Status:** ${statusEmoji[req.status]} ${req.status}
`;
    if (req.testFile) md += `- **Test File:** \`${req.testFile}\`\n`;
    if (req.verifiedAt)
      md += `- **Verified:** ${req.verifiedAt}${req.verifiedBy ? ` by ${req.verifiedBy}` : ''}\n`;
    if (req.blockedReason) md += `- **Blocked:** ${req.blockedReason}\n`;
    md += `
${req.description}

`;
  }

  return md;
}

// Generate report
const report = registry.generateReport();
const markdown = generateMarkdown(report);

// Determine output directory (run from repo root)
const repoRoot = path.resolve(__dirname, '..');
const outputPath = path.join(repoRoot, 'docs', 'TEST_REQUIREMENTS.md');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, markdown);

console.log(`✅ Report generated: ${outputPath}`);
console.log(`   Total: ${report.totalRequirements} requirements`);
console.log(`   Ready for launch: ${report.readyForLaunch ? 'YES' : 'NO'}`);

// Also output JSON for CI
const jsonPath = path.join(repoRoot, 'docs', 'test-requirements.json');
fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
console.log(`   JSON: ${jsonPath}`);

// Exit with error if not ready for launch (for CI)
if (process.argv.includes('--ci') && !report.readyForLaunch) {
  console.error('\n❌ Not ready for launch - P0 requirements not met');
  const p0NotPassing = report.requirements.filter(
    (r) =>
      r.priority === 'P0' &&
      r.status !== 'passing' &&
      r.status !== 'manual_verified'
  );
  console.error('\nP0 requirements not passing:');
  for (const req of p0NotPassing) {
    console.error(`  - ${req.id}: ${req.title} (${req.status})`);
  }
  process.exit(1);
}
