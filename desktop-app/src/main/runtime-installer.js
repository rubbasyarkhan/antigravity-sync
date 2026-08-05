/**
 * Runtime Installer — Pre-flight System Verification & Automated Prerequisites Installer
 * Auto-detects and installs missing system runtimes: Antigravity CLI, Python package manager (uv), Node.js, and Git.
 */
const { exec } = require('child_process');
const util = require('util');
const execAsync = util.promisify(exec);

/**
 * Check if a command is executable on the system PATH
 * @param {string} command 
 */
async function isCommandAvailable(command) {
  try {
    const checkCmd = process.platform === 'win32' ? `where ${command}` : `which ${command}`;
    await execAsync(checkCmd);
    return true;
  } catch (err) {
    return false;
  }
}

/**
 * Perform complete system runtime verification & auto-installation
 */
async function verifyAndInstallRuntimes() {
  const status = {
    git: false,
    node: false,
    uv: false,
    antigravity: false,
    installed: [],
    errors: [],
  };

  // 1. Verify Git
  status.git = await isCommandAvailable('git');

  // 2. Verify Node.js
  status.node = await isCommandAvailable('node');

  // 3. Verify Python package manager (uv)
  status.uv = await isCommandAvailable('uv');
  if (!status.uv) {
    console.log('⚡ uv Python package manager not found. Initiating auto-installation...');
    try {
      if (process.platform === 'win32') {
        await execAsync('powershell -ExecutionPolicy Bypass -Command "irm https://astral.sh/uv/install.ps1 | iex"');
      } else {
        await execAsync('curl -LsSf https://astral.sh/uv/install.sh | sh');
      }
      status.uv = true;
      status.installed.push('uv (Python Package Manager)');
    } catch (uvErr) {
      console.warn('Could not auto-install uv:', uvErr.message);
      status.errors.push(`uv installation warning: ${uvErr.message}`);
    }
  }

  // 4. Verify Antigravity CLI (agy / antigravity)
  const hasAgy = await isCommandAvailable('agy');
  const hasAntigravity = await isCommandAvailable('antigravity');
  status.antigravity = hasAgy || hasAntigravity;

  if (!status.antigravity && status.node) {
    console.log('🚀 Antigravity CLI not found. Initiating auto-installation...');
    try {
      await execAsync('npm install -g @google/antigravity');
      status.antigravity = true;
      status.installed.push('Antigravity CLI (@google/antigravity)');
    } catch (agyErr) {
      console.warn('Could not auto-install Antigravity CLI via npm:', agyErr.message);
      status.errors.push(`Antigravity installation warning: ${agyErr.message}`);
    }
  }

  return status;
}

module.exports = { isCommandAvailable, verifyAndInstallRuntimes };
