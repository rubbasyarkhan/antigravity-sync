/**
 * Git engine module — executes repository cloning, dependency installation (Node.js & Python),
 * and Antigravity IDE workspace project provisioning into ~/Projects/
 */
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const PROJECTS_DIR = path.join(os.homedir(), 'Projects');

// Ensure ~/Projects/ root directory exists
if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

/**
 * Executes a shell command asynchronously in a spawned child process without blocking Electron UI
 */
function runShellCmd(command, args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, shell: true });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        resolve(stderr.trim() || `Command exited with code ${code}`);
      }
    });
  });
}

/**
 * Auto-installs Node.js & Python dependencies and provisions local .agents/ directory
 */
async function installDependenciesAndProvision(projectName, targetDir, onProgress = () => {}) {
  const installedTech = [];

  // 1. Provision local .agents/AGENTS.md for instant Antigravity AI conversation readiness
  const agentsDir = path.join(targetDir, '.agents');
  if (!fs.existsSync(agentsDir)) {
    fs.mkdirSync(agentsDir, { recursive: true });
  }

  const agentRulePath = path.join(agentsDir, 'AGENTS.md');
  if (!fs.existsSync(agentRulePath)) {
    const defaultAgentRules = `# ${projectName} — Project Guidelines & Antigravity Rules

- Maintain clean, optimizable, well-commented code.
- Follow repository patterns and conventions.
- Use OS Keychain for secret storage; never hardcode credentials.
`;
    fs.writeFileSync(agentRulePath, defaultAgentRules, 'utf-8');
    installedTech.push('.agents rules');
  }

  // 2. Node.js dependency installation (package.json)
  if (fs.existsSync(path.join(targetDir, 'package.json'))) {
    onProgress(projectName, 'installing npm dependencies...');
    await runShellCmd('npm', ['install', '--no-audit', '--no-fund'], targetDir);
    installedTech.push('npm packages');
  }

  // 3. Python dependency installation (requirements.txt)
  if (fs.existsSync(path.join(targetDir, 'requirements.txt'))) {
    onProgress(projectName, 'installing python requirements...');
    await runShellCmd('python', ['-m', 'pip', 'install', '-r', 'requirements.txt'], targetDir);
    installedTech.push('pip requirements');
  }

  return installedTech;
}

/**
 * Clone or pull an array of projects asynchronously, auto-installing dependencies & setting up Antigravity workspace
 * @param {Array<{name: string, repo_url: string}>} projects
 * @param {Function} onProgress
 */
async function cloneProjects(projects, onProgress = () => {}) {
  const results = [];

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const targetDir = path.join(PROJECTS_DIR, project.name);

    // Yield to Electron OS event loop
    await new Promise((r) => setTimeout(r, 100));

    try {
      let isUpdate = false;
      if (fs.existsSync(path.join(targetDir, '.git'))) {
        isUpdate = true;
        onProgress(project.name, 'pulling latest changes...', i + 1, projects.length);
        await runShellCmd('git', ['pull'], targetDir);
      } else {
        onProgress(project.name, 'cloning repository...', i + 1, projects.length);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        await runShellCmd('git', ['clone', project.repo_url, targetDir], PROJECTS_DIR);
      }

      // Auto-install dependencies (Node.js/npm & Python/pip) + provision .agents/
      onProgress(project.name, 'installing dependencies...', i + 1, projects.length);
      const techList = await installDependenciesAndProvision(project.name, targetDir, (name, step) => onProgress(name, step, i + 1, projects.length));

      const statusMsg = isUpdate
        ? `Updated & installed dependencies (${techList.join(', ') || 'ready'})`
        : `Cloned & installed dependencies (${techList.join(', ') || 'ready'})`;

      results.push({
        name: project.name,
        status: isUpdate ? 'pulled' : 'cloned',
        path: targetDir,
        installedTech,
        message: statusMsg
      });
      onProgress(project.name, 'done', i + 1, projects.length);
    } catch (err) {
      console.error(`Git engine error on project ${project.name}:`, err.message);
      results.push({ name: project.name, status: 'error', error: err.message, path: targetDir });
      onProgress(project.name, 'error', i + 1, projects.length);
    }

    await new Promise((r) => setTimeout(r, 100));
  }

  return results;
}

/**
 * Run git fetch on all cloned projects asynchronously
 */
async function fetchAllProjects() {
  if (!fs.existsSync(PROJECTS_DIR)) return [];

  const items = fs.readdirSync(PROJECTS_DIR, { withFileTypes: true });
  const results = [];

  for (const item of items) {
    if (item.isDirectory()) {
      const targetDir = path.join(PROJECTS_DIR, item.name);
      if (fs.existsSync(path.join(targetDir, '.git'))) {
        try {
          await runShellCmd('git', ['fetch'], targetDir);
          results.push({ path: targetDir, status: 'fetched' });
        } catch (err) {
          results.push({ path: targetDir, status: 'error', error: err.message });
        }
      }
    }
  }

  return results;
}

module.exports = { cloneProjects, fetchAllProjects, PROJECTS_DIR };
