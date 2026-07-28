/**
 * Config Writer — Provisions ~/.gemini/config/ rules, skills, plugins, MCP servers, and project manifests
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
 * Provisions global & project-level Antigravity configs
 * @param {Object} workspaceData
 * @param {Array} activeProjects
 */
function writeAntigravityConfig(workspaceData = {}, activeProjects = []) {
  ensureDirectories();

  // 1. Write AGENTS.md global standards rule file
  const baseRuleContent = `# Antigravity Company Standards & Guidelines

- Maintain clean, optimizable, well-commented code.
- Follow team-specific patterns and repository rules in .agents/.
- Use OS Keychain for secret storage; never hardcode credentials.
`;

  fs.writeFileSync(path.join(CONFIG_DIR, 'AGENTS.md'), baseRuleContent, 'utf-8');

  // 2. Write company-mcp-server.js (valid JSON-RPC stdio MCP server)
  const mcpServerScriptPath = path.join(CONFIG_DIR, 'company-mcp-server.js');
  const mcpServerCode = `/**
 * Company Backend MCP Stdio Server — Antigravity Integration
 */
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

rl.on('line', (line) => {
  if (!line.trim()) return;
  try {
    const msg = JSON.parse(line);
    if (msg.method === 'initialize') {
      console.log(JSON.stringify({
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {} },
          serverInfo: { name: 'company-backend', version: '1.0.0' }
        }
      }));
    } else if (msg.method === 'tools/list') {
      console.log(JSON.stringify({
        jsonrpc: '2.0',
        id: msg.id,
        result: { tools: [] }
      }));
    } else if (msg.id !== undefined) {
      console.log(JSON.stringify({
        jsonrpc: '2.0',
        id: msg.id,
        result: {}
      }));
    }
  } catch (e) {}
});
`;

  fs.writeFileSync(mcpServerScriptPath, mcpServerCode, 'utf-8');

  // 3. Write mcp_config.json pointing to the absolute path of company-mcp-server.js
  const mcpConfig = {
    mcpServers: {
      "company-backend": {
        command: "node",
        args: [mcpServerScriptPath],
        env: {
          SYNC_MODE: "active"
        }
      }
    }
  };

  fs.writeFileSync(path.join(CONFIG_DIR, 'mcp_config.json'), JSON.stringify(mcpConfig, null, 2), 'utf-8');

  // 4. Register active project manifests in ~/.gemini/config/projects/
  activeProjects.forEach((proj) => {
    const manifestPath = path.join(PROJECTS_DIR_MANIFESTS, `${proj.slug || proj.name}.json`);
    const manifest = {
      name: proj.name,
      slug: proj.slug || proj.name,
      path: path.join(os.homedir(), 'Documents', 'Projects', proj.name),
      repo_url: proj.repo_url,
      team: proj.team || 'Personal',
      updated_at: new Date().toISOString()
    };
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  });

  return { success: true, configDir: CONFIG_DIR };
}

module.exports = { writeAntigravityConfig };
