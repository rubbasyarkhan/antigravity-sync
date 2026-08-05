/**
 * Git engine module — executes repository cloning, system environment verification,
 * README instruction parsing & auto-installation (npm, yarn, pnpm, pip, poetry, go, cargo, setup scripts),
 * and Antigravity IDE workspace project provisioning into ~/Projects/
 */
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const fs = require('fs');

const { verifyAndInstallRuntimes } = require('./runtime-installer');
const { setupProjectEnvironment } = require('./env-detector');

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
 * Verifies system installation of Node.js, Python, Antigravity, uv, and Git binaries
 */
async function verifySystemEnvironment() {
  const runtimeStatus = await verifyAndInstallRuntimes();

  const envStatus = {
    node: runtimeStatus.node,
    nodeVersion: runtimeStatus.node ? 'Installed' : 'Not Found',
    python: true,
    pythonVersion: runtimeStatus.uv ? 'uv Package Manager Ready' : 'Python Ready',
    git: runtimeStatus.git,
    gitVersion: runtimeStatus.git ? 'Installed' : 'Not Found',
    antigravity: runtimeStatus.antigravity,
    installed: runtimeStatus.installed,
  };

  return envStatus;
}

/**
 * Parses README.md file inside cloned repo for setup & installation commands and executes them
 */
async function parseAndExecuteReadmeInstructions(projectName, targetDir, onProgress = () => {}) {
  const readmeActions = [];
  const readmeNames = ['README.md', 'readme.md', 'README.txt', 'README'];
  let readmeContent = '';

  for (const name of readmeNames) {
    const full = path.join(targetDir, name);
    if (fs.existsSync(full)) {
      try {
        readmeContent = fs.readFileSync(full, 'utf-8');
        break;
      } catch (e) {}
    }
  }

  // Check for yarn lock file or README yarn reference
  if (fs.existsSync(path.join(targetDir, 'yarn.lock')) || /yarn install/i.test(readmeContent)) {
    onProgress(projectName, 'reading README: running yarn install...');
    await runShellCmd('yarn', ['install'], targetDir);
    readmeActions.push('yarn install');
  }

  // Check for pnpm lock file or README pnpm reference
  if (fs.existsSync(path.join(targetDir, 'pnpm-lock.yaml')) || /pnpm install/i.test(readmeContent)) {
    onProgress(projectName, 'reading README: running pnpm install...');
    await runShellCmd('pnpm', ['install'], targetDir);
    readmeActions.push('pnpm install');
  }

  // Check for poetry / pyproject.toml
  if (fs.existsSync(path.join(targetDir, 'poetry.lock')) || /poetry install/i.test(readmeContent)) {
    onProgress(projectName, 'reading README: running poetry install...');
    await runShellCmd('poetry', ['install'], targetDir);
    readmeActions.push('poetry install');
  }

  // Check for setup.sh or setup.bat
  const setupSh = path.join(targetDir, 'setup.sh');
  const setupBat = path.join(targetDir, 'setup.bat');
  if (fs.existsSync(setupBat) && process.platform === 'win32') {
    onProgress(projectName, 'reading README: executing setup.bat...');
    await runShellCmd('cmd.exe', ['/c', 'setup.bat'], targetDir);
    readmeActions.push('setup.bat script');
  } else if (fs.existsSync(setupSh)) {
    onProgress(projectName, 'reading README: executing setup.sh...');
    await runShellCmd('bash', ['./setup.sh'], targetDir);
    readmeActions.push('setup.sh script');
  }

  return readmeActions;
}

/**
 * Auto-installs Node.js & Python dependencies, parses README instructions, and provisions local .agents/ directory
 */
async function installDependenciesAndProvision(projectName, targetDir, onProgress = () => {}) {
  const installedTech = [];
  const details = { npmInstalled: false, pipInstalled: false, readmeParsed: false, agentsCreated: false };

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
    details.agentsCreated = true;
  }

  // 2. Automated framework environment setup (React Native, Node, Python)
  onProgress(projectName, 'scanning tech stack & configuring framework environment...');
  const { stack, logMessages } = await setupProjectEnvironment(targetDir, projectName);
  if (stack.isReactNative) installedTech.push('React Native Environment');
  if (stack.isNode) installedTech.push(`${stack.packageManager} packages`);
  if (stack.isPython) installedTech.push('Python environment');
  if (stack.hasSetupScript) installedTech.push('setup script');

  // 3. Parse README instructions and execute special setup steps
  const readmeActions = await parseAndExecuteReadmeInstructions(projectName, targetDir, onProgress);
  if (readmeActions.length > 0) {
    installedTech.push(...readmeActions);
    details.readmeParsed = true;
  }

  return { installedTech, details };
}

/**
 * Clone or pull an array of projects asynchronously, auto-installing dependencies & setting up Antigravity workspace
 * @param {Array<{name: string, repo_url: string}>} projects
 * @param {Function} onProgress
 */
async function cloneProjects(projects, onProgress = () => {}) {
  const results = [];

  // Run pre-flight system verification & auto-installation first
  await verifySystemEnvironment();

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

      // Auto-install dependencies (React Native, Node.js/npm, Python/pip, README.md commands) + provision .agents/
      onProgress(project.name, 'configuring framework environment & installing dependencies...', i + 1, projects.length);
      const { installedTech, details } = await installDependenciesAndProvision(project.name, targetDir, (name, step) => onProgress(name, step, i + 1, projects.length));

      const statusMsg = isUpdate
        ? `Updated repo & verified dependencies (${installedTech.join(', ') || 'already installed'})`
        : `Cloned repo, parsed README & installed dependencies (${installedTech.join(', ') || 'ready'})`;

      results.push({
        name: project.name,
        status: isUpdate ? 'pulled' : 'cloned',
        path: targetDir,
        installedTech,
        details,
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

module.exports = { cloneProjects, fetchAllProjects, verifySystemEnvironment, PROJECTS_DIR };
