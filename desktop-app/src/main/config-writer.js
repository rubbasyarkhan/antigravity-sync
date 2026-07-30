/**
 * Config Writer — Provisions ~/.gemini/config/ rules, skills, plugins, MCP servers, and project manifests
 * Registers cloned repositories with Antigravity IDE for instant AI chat conversation readiness.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');

const GEMINI_DIR = path.join(os.homedir(), '.gemini');
const CONFIG_DIR = path.join(GEMINI_DIR, 'config');
const SKILLS_DIR = path.join(CONFIG_DIR, 'skills');
const PLUGINS_DIR = path.join(CONFIG_DIR, 'plugins');
const PROJECTS_DIR_MANIFESTS = path.join(CONFIG_DIR, 'projects');

function ensureDirectories() {
  [GEMINI_DIR, CONFIG_DIR, SKILLS_DIR, PLUGINS_DIR, PROJECTS_DIR_MANIFESTS].forEach((dir) => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
}

/**
 * Provisions global & project-level Antigravity configs and returns detailed file logs & diffs
 * @param {Object} workspaceData
 * @param {Array} activeProjects
 */
function writeAntigravityConfig(workspaceData = {}, activeProjects = []) {
  ensureDirectories();
  const writtenFiles = [];

  // 1. Write AGENTS.md global standards rule file
  const baseRuleContent = `# Antigravity Company Standards & Guidelines

- Maintain clean, optimizable, well-commented code.
- Follow team-specific patterns and repository rules in .agents/.
- Use OS Keychain for secret storage; never hardcode credentials.
`;

  const agentsPath = path.join(CONFIG_DIR, 'AGENTS.md');
  fs.writeFileSync(agentsPath, baseRuleContent, 'utf-8');
  writtenFiles.push({
    file: agentsPath,
    type: 'Global Rules File (AGENTS.md)',
    action: 'PROVISIONED',
    sizeBytes: Buffer.byteLength(baseRuleContent, 'utf-8'),
    diff: baseRuleContent.split('\n').map((l) => (l ? `+ ${l}` : '')).join('\n'),
    updatedAt: new Date().toISOString()
  });

  // 2. Write mcp_config.json
  const mcpConfig = {
    mcpServers: {}
  };

  const mcpPath = path.join(CONFIG_DIR, 'mcp_config.json');
  const mcpStr = JSON.stringify(mcpConfig, null, 2);
  fs.writeFileSync(mcpPath, mcpStr, 'utf-8');
  writtenFiles.push({
    file: mcpPath,
    type: 'MCP Server Config (mcp_config.json)',
    action: 'PROVISIONED',
    sizeBytes: Buffer.byteLength(mcpStr, 'utf-8'),
    diff: mcpStr.split('\n').map((l) => (l ? `+ ${l}` : '')).join('\n'),
    updatedAt: new Date().toISOString()
  });

  // 3. Register active project manifests in ~/.gemini/config/projects/ for Antigravity IDE auto-detection
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
      updated_at: new Date().toISOString()
    };

    const manifestStr = JSON.stringify(manifest, null, 2);
    fs.writeFileSync(manifestPath, manifestStr, 'utf-8');
    writtenFiles.push({
      file: manifestPath,
      type: `Project Manifest (${proj.name})`,
      action: 'REGISTERED',
      sizeBytes: Buffer.byteLength(manifestStr, 'utf-8'),
      diff: manifestStr.split('\n').map((l) => (l ? `+ ${l}` : '')).join('\n'),
      updatedAt: new Date().toISOString()
    });
  });

  return { success: true, configDir: CONFIG_DIR, writtenFiles };
}

module.exports = { writeAntigravityConfig };
