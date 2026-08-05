/**
 * Gemini Merger — Performs 3-way section-demarcated merging for AGENTS.md,
 * line-by-line delta patching, and merging of memories & skills.
 */
const { calculateHash } = require('./gemini-scanner');

/**
 * Calculates a line-by-line diff between oldContent and newContent
 * Returns a readable array of diff lines (+ green, - red, space unchanged)
 */
function computeLineDiff(oldContent = '', newContent = '') {
  const oldLines = oldContent ? oldContent.split('\n') : [];
  const newLines = newContent ? newContent.split('\n') : [];

  const diffResult = [];
  const maxLines = Math.max(oldLines.length, newLines.length);

  for (let i = 0; i < maxLines; i++) {
    const oldLine = oldLines[i];
    const newLine = newLines[i];

    if (oldLine === newLine) {
      if (oldLine !== undefined) diffResult.push(`  ${oldLine}`);
    } else {
      if (oldLine !== undefined) diffResult.push(`- ${oldLine}`);
      if (newLine !== undefined) diffResult.push(`+ ${newLine}`);
    }
  }

  return diffResult.join('\n');
}

/**
 * Merge AGENTS.md rules with section demarcation for Team & Personal guidelines
 */
function mergeRulesContent(localRules = '', remotePersonalRules = '', teamRulesList = []) {
  const teamSection = teamRulesList
    .map((tr) => `### 🏢 Team Rules (${tr.team})\n${tr.rules}`)
    .join('\n\n');

  const mergedText = `<!-- ANTIGRAVITY_SYNC: TEAM_RULES_START -->
# 🏢 Company & Team Standards
${teamSection || '- Maintain clean, well-documented, testable code.\n- Follow team repository patterns.'}
<!-- ANTIGRAVITY_SYNC: TEAM_RULES_END -->

<!-- ANTIGRAVITY_SYNC: PERSONAL_RULES_START -->
# 👤 Personal Developer Guidelines
${remotePersonalRules || localRules || '- Personal habit preferences & workflows.'}
<!-- ANTIGRAVITY_SYNC: PERSONAL_RULES_END -->
`;

  return mergedText;
}

/**
 * Merge memory files (remote vs local)
 */
function mergeMemories(localMemories = [], remoteMemories = []) {
  const merged = new Map();

  // Load local
  localMemories.forEach((mem) => {
    merged.set(mem.filename, mem);
  });

  // Merge remote (remote updates newer files)
  remoteMemories.forEach((mem) => {
    const existing = merged.get(mem.filename);
    if (!existing || existing.hash !== mem.hash) {
      merged.set(mem.filename, mem);
    }
  });

  return Array.from(merged.values());
}

/**
 * Merge skills (remote personal + team skills + local skills)
 */
function mergeSkills(localSkills = [], remotePersonalSkills = [], teamSkills = []) {
  const mergedMap = new Map();

  // Helper to add skill
  const addSkill = (skill, source) => {
    const slug = skill.slug;
    if (!mergedMap.has(slug)) {
      mergedMap.set(slug, { ...skill, source });
    } else {
      // Merge files within skill
      const existing = mergedMap.get(slug);
      const fileMap = new Map();
      (existing.files || []).forEach((f) => fileMap.set(f.filePath, f));
      (skill.files || []).forEach((f) => fileMap.set(f.filePath, f));
      existing.files = Array.from(fileMap.values());
    }
  };

  localSkills.forEach((s) => addSkill(s, 'local'));
  remotePersonalSkills.forEach((s) => addSkill(s, 'personal-cloud'));
  teamSkills.forEach((s) => addSkill(s, `team-${s.team || 'org'}`));

  return Array.from(mergedMap.values());
}

module.exports = { computeLineDiff, mergeRulesContent, mergeMemories, mergeSkills };
