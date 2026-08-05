/**
 * Gemini Scanner — Scans ~/.gemini/config/ for rules, memories, skills, plugins, and MCP server configs
 * Explicitly EXCLUDES ~/.gemini/antigravity/brain/ (chat logs), scratch/, and cache/.
 */
const path = require('path');
const os = require('os');
const fs = require('fs');
const crypto = require('crypto');

const GEMINI_DIR = path.join(os.homedir(), '.gemini');
const CONFIG_DIR = path.join(GEMINI_DIR, 'config');

function calculateHash(content) {
  return crypto.createHash('sha256').update(content || '').digest('hex');
}

/**
 * Recursively read directory files
 */
function readDirectoryRecursive(dirPath, relativeBase = '') {
  const results = [];
  if (!fs.existsSync(dirPath)) return results;

  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    const relPath = path.join(relativeBase, entry.name).replace(/\\/g, '/');

    if (entry.isDirectory()) {
      results.push(...readDirectoryRecursive(fullPath, relPath));
    } else if (entry.isFile()) {
      try {
        const content = fs.readFileSync(fullPath, 'utf-8');
        results.push({
          path: relPath,
          fullPath,
          name: entry.name,
          content,
          hash: calculateHash(content),
          sizeBytes: Buffer.byteLength(content, 'utf-8'),
        });
      } catch (err) {
        console.warn(`Could not read file ${fullPath}:`, err.message);
      }
    }
  }
  return results;
}

/**
 * Scan local ~/.gemini/config/ assets
 */
function scanLocalGeminiConfig() {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  // 1. Memories (~/.gemini/config/memory/*.json)
  const memoryDir = path.join(CONFIG_DIR, 'memory');
  const memories = readDirectoryRecursive(memoryDir).map((item) => {
    let parsedData = {};
    try {
      parsedData = JSON.parse(item.content);
    } catch (e) {
      parsedData = { raw: item.content };
    }
    return {
      filename: item.name,
      relPath: item.path,
      content: item.content,
      data: parsedData,
      hash: item.hash,
    };
  });

  // 2. Personal Skills (~/.gemini/config/skills/*)
  const skillsDir = path.join(CONFIG_DIR, 'skills');
  const skillsFiles = readDirectoryRecursive(skillsDir);
  const personalSkills = [];

  // Group by skill folder
  const skillGroups = {};
  skillsFiles.forEach((file) => {
    const parts = file.path.split('/');
    const skillSlug = parts[0] || 'default';
    if (!skillGroups[skillSlug]) skillGroups[skillSlug] = [];
    skillGroups[skillSlug].push({
      filePath: file.path,
      content: file.content,
      hash: file.hash,
    });
  });

  Object.keys(skillGroups).forEach((slug) => {
    personalSkills.push({
      slug,
      files: skillGroups[slug],
    });
  });

  // 3. AGENTS.md Global Rules
  const agentsPath = path.join(CONFIG_DIR, 'AGENTS.md');
  let personalRules = '';
  if (fs.existsSync(agentsPath)) {
    personalRules = fs.readFileSync(agentsPath, 'utf-8');
  }

  // 4. mcp_config.json
  const mcpPath = path.join(CONFIG_DIR, 'mcp_config.json');
  let mcpConfig = {};
  if (fs.existsSync(mcpPath)) {
    try {
      mcpConfig = JSON.parse(fs.readFileSync(mcpPath, 'utf-8'));
    } catch (e) {
      mcpConfig = {};
    }
  }

  // 5. hooks.json
  const hooksPath = path.join(CONFIG_DIR, 'hooks.json');
  let hooksConfig = {};
  if (fs.existsSync(hooksPath)) {
    try {
      hooksConfig = JSON.parse(fs.readFileSync(hooksPath, 'utf-8'));
    } catch (e) {
      hooksConfig = {};
    }
  }

  return {
    memories,
    personal_skills: personalSkills,
    personal_rules: personalRules,
    mcp_config: mcpConfig,
    hooks_config: hooksConfig,
  };
}

module.exports = { scanLocalGeminiConfig, calculateHash };
