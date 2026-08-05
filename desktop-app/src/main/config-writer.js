/**
 * Config Writer — Provisions ~/.gemini/config/ rules, skills, plugins, MCP servers, and project manifests
 * Registers cloned repositories with Antigravity IDE for instant AI chat conversation readiness.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

const { scanLocalGeminiConfig } = require('./gemini-scanner');
const { mergeRulesContent, computeLineDiff } = require('./gemini-merger');

const GEMINI_DIR = path.join(os.homedir(), '.gemini');
const CONFIG_DIR = path.join(GEMINI_DIR, 'config');
const SKILLS_DIR = path.join(CONFIG_DIR, 'skills');
const MEMORY_DIR = path.join(CONFIG_DIR, 'memory');
const PLUGINS_DIR = path.join(CONFIG_DIR, 'plugins');
const PROJECTS_DIR_MANIFESTS = path.join(CONFIG_DIR, 'projects');

function ensureDirectories() {
  [GEMINI_DIR, CONFIG_DIR, SKILLS_DIR, MEMORY_DIR, PLUGINS_DIR, PROJECTS_DIR_MANIFESTS].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Provisions global & project-level Antigravity configs and returns detailed file logs & diffs
 * @param {Object} workspaceData
 * @param {Array} activeProjects
 * @param {Object} geminiCloudData - Personal & team .gemini cloud config fetched from server
 */
function writeAntigravityConfig(workspaceData = {}, activeProjects = [], geminiCloudData = null) {
  ensureDirectories();
  const writtenFiles = [];
  const localScan = scanLocalGeminiConfig();

  // 1. Write AGENTS.md (Section-Demarcated Rules)
  const agentsPath = path.join(CONFIG_DIR, 'AGENTS.md');
  const existingRules = fs.existsSync(agentsPath) ? fs.readFileSync(agentsPath, 'utf-8') : '';

  const remotePersonalRules = geminiCloudData?.personal?.personal_rules || '';
  const teamRulesList = geminiCloudData?.team?.team_rules || [];

  const mergedRulesContent = mergeRulesContent(existingRules, remotePersonalRules, teamRulesList);

  if (mergedRulesContent !== existingRules) {
    fs.writeFileSync(agentsPath, mergedRulesContent, 'utf-8');
    const ruleDiff = computeLineDiff(existingRules, mergedRulesContent);
    writtenFiles.push({
      file: agentsPath,
      type: 'Global Rules File (AGENTS.md)',
      action: 'MERGED & PROVISIONED',
      sizeBytes: Buffer.byteLength(mergedRulesContent, 'utf-8'),
      diff: ruleDiff || `+ AGENTS.md rule file provisioned into ${agentsPath}`,
      updatedAt: new Date().toISOString(),
    });
  }

  // 2. Write Memories (~/.gemini/config/memory/*.json)
  const remoteMemories = geminiCloudData?.personal?.memories || [];
  remoteMemories.forEach((mem) => {
    const memFileName = mem.filename || `memory_${Date.now()}.json`;
    const memPath = path.join(MEMORY_DIR, memFileName);
    const existingContent = fs.existsSync(memPath) ? fs.readFileSync(memPath, 'utf-8') : '';
    const memStr = typeof mem.content === 'string' ? mem.content : JSON.stringify(mem.content || mem.data || {}, null, 2);

    if (memStr !== existingContent) {
      fs.writeFileSync(memPath, memStr, 'utf-8');
      writtenFiles.push({
        file: memPath,
        type: `User Memory File (${memFileName})`,
        action: 'SYNCED (PERSONAL)',
        sizeBytes: Buffer.byteLength(memStr, 'utf-8'),
        diff: computeLineDiff(existingContent, memStr) || `+ Memory file ${memFileName} written to memory directory`,
        updatedAt: new Date().toISOString(),
      });
    }
  });

  // 3. Write Skills (~/.gemini/config/skills/<slug>/...)
  const remotePersonalSkills = geminiCloudData?.personal?.personal_skills || [];
  const remoteTeamSkills = geminiCloudData?.team?.team_skills || [];
  const allRemoteSkills = [...remotePersonalSkills, ...remoteTeamSkills];

  allRemoteSkills.forEach((skill) => {
    const skillSlug = skill.slug || 'custom-skill';
    const skillTargetDir = path.join(SKILLS_DIR, skillSlug);
    if (!fs.existsSync(skillTargetDir)) {
      fs.mkdirSync(skillTargetDir, { recursive: true });
    }

    (skill.files || []).forEach((fileItem) => {
      const targetFilePath = path.join(CONFIG_DIR, fileItem.filePath || `skills/${skillSlug}/SKILL.md`);
      const fileDir = path.dirname(targetFilePath);
      if (!fs.existsSync(fileDir)) fs.mkdirSync(fileDir, { recursive: true });

      const existingContent = fs.existsSync(targetFilePath) ? fs.readFileSync(targetFilePath, 'utf-8') : '';
      const newContent = fileItem.content || '';

      if (newContent !== existingContent) {
        fs.writeFileSync(targetFilePath, newContent, 'utf-8');
        writtenFiles.push({
          file: targetFilePath,
          type: `Workflow Skill File (${skillSlug})`,
          action: 'SYNCED',
          sizeBytes: Buffer.byteLength(newContent, 'utf-8'),
          diff: computeLineDiff(existingContent, newContent) || `+ Skill file ${path.basename(targetFilePath)} updated`,
          updatedAt: new Date().toISOString(),
        });
      }
    });
  });

  // 4. Write mcp_config.json
  const mcpConfig = geminiCloudData?.personal?.mcp_config || { mcpServers: {} };
  const mcpPath = path.join(CONFIG_DIR, 'mcp_config.json');
  const existingMcp = fs.existsSync(mcpPath) ? fs.readFileSync(mcpPath, 'utf-8') : '';
  const mcpStr = JSON.stringify(mcpConfig, null, 2);

  if (mcpStr !== existingMcp) {
    fs.writeFileSync(mcpPath, mcpStr, 'utf-8');
    writtenFiles.push({
      file: mcpPath,
      type: 'MCP Server Config (mcp_config.json)',
      action: 'PROVISIONED',
      sizeBytes: Buffer.byteLength(mcpStr, 'utf-8'),
      diff: computeLineDiff(existingMcp, mcpStr) || `+ mcp_config.json written`,
      updatedAt: new Date().toISOString(),
    });
  }

  // 5. Register active project manifests in ~/.gemini/config/projects/ for Antigravity IDE auto-detection
  activeProjects.forEach((proj) => {
    const manifestPath = path.join(PROJECTS_DIR_MANIFESTS, `${proj.slug || proj.name}.json`);
    const projectPath = path.join(os.homedir(), 'Projects', proj.name);
    const manifest = {
      name: proj.name,
      slug: proj.slug || proj.name,
      path: projectPath,
      repo_url: proj.repo_url,
      team: proj.team || 'Personal',
      auto_provisioned: true,
      antigravity_ready: true,
      updated_at: new Date().toISOString(),
    };

    const manifestStr = JSON.stringify(manifest, null, 2);
    const existingManifest = fs.existsSync(manifestPath) ? fs.readFileSync(manifestPath, 'utf-8') : '';

    if (manifestStr !== existingManifest) {
      fs.writeFileSync(manifestPath, manifestStr, 'utf-8');
      writtenFiles.push({
        file: manifestPath,
        type: `Project Manifest (${proj.name})`,
        action: 'REGISTERED',
        sizeBytes: Buffer.byteLength(manifestStr, 'utf-8'),
        diff: computeLineDiff(existingManifest, manifestStr) || `+ Manifest for ${proj.name} registered`,
        updatedAt: new Date().toISOString(),
      });
    }
  });

  return { success: true, configDir: CONFIG_DIR, writtenFiles };
}

module.exports = { writeAntigravityConfig };
