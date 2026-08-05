/**
 * Environment Detector & Tech Stack Auto-Provisioner
 * Detects framework stacks (React Native, Node.js, Python) and executes full dependency & environment setup automatically.
 */
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

/**
 * Detect tech stack signature of a project directory
 * @param {string} projectDir 
 */
function detectTechStack(projectDir) {
  const stack = {
    isReactNative: false,
    isNode: false,
    isPython: false,
    hasSetupScript: false,
    packageManager: 'npm',
    setupScriptPath: null,
  };

  if (!fs.existsSync(projectDir)) return stack;

  // Check package.json
  const pkgPath = path.join(projectDir, 'package.json');
  if (fs.existsSync(pkgPath)) {
    stack.isNode = true;
    try {
      const pkgContent = fs.readFileSync(pkgPath, 'utf-8');
      if (pkgContent.includes('react-native')) {
        stack.isReactNative = true;
      }
    } catch (e) {
      // ignore
    }

    // Determine package manager
    if (fs.existsSync(path.join(projectDir, 'pnpm-lock.yaml'))) {
      stack.packageManager = 'pnpm';
    } else if (fs.existsSync(path.join(projectDir, 'yarn.lock'))) {
      stack.packageManager = 'yarn';
    }
  }

  // Check Python (pyproject.toml / requirements.txt)
  if (
    fs.existsSync(path.join(projectDir, 'pyproject.toml')) ||
    fs.existsSync(path.join(projectDir, 'requirements.txt'))
  ) {
    stack.isPython = true;
  }

  // Check custom setup scripts
  const batScript = path.join(projectDir, 'setup.bat');
  const shScript = path.join(projectDir, 'setup.sh');
  if (process.platform === 'win32' && fs.existsSync(batScript)) {
    stack.hasSetupScript = true;
    stack.setupScriptPath = batScript;
  } else if (fs.existsSync(shScript)) {
    stack.hasSetupScript = true;
    stack.setupScriptPath = shScript;
  }

  return stack;
}

/**
 * Execute automated environment setup for a project
 * @param {string} projectDir 
 * @param {string} projectName 
 */
async function setupProjectEnvironment(projectDir, projectName) {
  const stack = detectTechStack(projectDir);
  const logMessages = [];

  logMessages.push(`🔍 Tech Stack Scan for [${projectName}]: ${JSON.stringify(stack)}`);

  // 1. Setup Node / React Native dependencies
  if (stack.isNode) {
    logMessages.push(`📦 Installing Node.js dependencies using ${stack.packageManager}...`);
    try {
      const installCmd = `${stack.packageManager} install`;
      await execAsync(installCmd, { cwd: projectDir });
      logMessages.push(`✅ Dependencies installed via ${stack.packageManager}`);
    } catch (err) {
      logMessages.push(`⚠️ Package install notice: ${err.message}`);
    }
  }

  // 2. Setup React Native specific environment
  if (stack.isReactNative) {
    logMessages.push(`📱 React Native app detected. Provisioning React Native environment...`);
    try {
      // Pre-create .agents/AGENTS.md with React Native rules if not present
      const agentsDir = path.join(projectDir, '.agents');
      if (!fs.existsSync(agentsDir)) fs.mkdirSync(agentsDir, { recursive: true });

      const rnRulesPath = path.join(agentsDir, 'AGENTS.md');
      if (!fs.existsSync(rnRulesPath)) {
        const rnRules = `# React Native Mobile Application Guidelines

- Use TypeScript for all components and navigation screens.
- Follow React Native performance guidelines (useMemo, useCallback, FlatList optimization).
- Maintain clean navigation state with React Navigation.
`;
        fs.writeFileSync(rnRulesPath, rnRules, 'utf-8');
        logMessages.push(`✅ Created React Native project rules in .agents/AGENTS.md`);
      }
    } catch (rnErr) {
      logMessages.push(`⚠️ React Native setup notice: ${rnErr.message}`);
    }
  }

  // 3. Setup Python environment (uv / pip)
  if (stack.isPython) {
    logMessages.push(`🐍 Python project detected. Setting up Python dependencies...`);
    try {
      if (fs.existsSync(path.join(projectDir, 'pyproject.toml'))) {
        await execAsync('uv sync', { cwd: projectDir });
        logMessages.push(`✅ Python environment synced using uv`);
      } else if (fs.existsSync(path.join(projectDir, 'requirements.txt'))) {
        await execAsync('pip install -r requirements.txt', { cwd: projectDir });
        logMessages.push(`✅ Python packages installed via pip`);
      }
    } catch (pyErr) {
      logMessages.push(`⚠️ Python setup notice: ${pyErr.message}`);
    }
  }

  // 4. Run custom setup scripts
  if (stack.hasSetupScript && stack.setupScriptPath) {
    logMessages.push(`📜 Executing repository setup script: ${path.basename(stack.setupScriptPath)}...`);
    try {
      const runCmd = process.platform === 'win32'
        ? `cmd /c "${stack.setupScriptPath}"`
        : `bash "${stack.setupScriptPath}"`;
      await execAsync(runCmd, { cwd: projectDir });
      logMessages.push(`✅ Setup script executed successfully`);
    } catch (scriptErr) {
      logMessages.push(`⚠️ Setup script notice: ${scriptErr.message}`);
    }
  }

  return { stack, logMessages };
}

module.exports = { detectTechStack, setupProjectEnvironment };
