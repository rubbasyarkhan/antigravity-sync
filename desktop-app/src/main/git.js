/**
 * Git engine module — executes non-blocking repository cloning & pulling into ~/Projects/
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
 * Executes a git command asynchronously in a spawned child process without blocking Electron UI
 */
function runGitCmd(args, cwd) {
  return new Promise((resolve, reject) => {
    const child = spawn('git', args, { cwd, shell: true });
    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => { stdout += data.toString(); });
    child.stderr.on('data', (data) => { stderr += data.toString(); });

    child.on('error', (err) => reject(err));
    child.on('close', (code) => {
      if (code === 0) {
        resolve(stdout.trim());
      } else {
        reject(new Error(stderr.trim() || `Git exited with code ${code}`));
      }
    });
  });
}

/**
 * Clone or pull an array of projects asynchronously without blocking OS message loop
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
      if (fs.existsSync(path.join(targetDir, '.git'))) {
        onProgress(project.name, 'pulling', i + 1, projects.length);
        await runGitCmd(['pull'], targetDir);
        results.push({ name: project.name, status: 'pulled', path: targetDir, message: `Updated project in ${PROJECTS_DIR}` });
        onProgress(project.name, 'done', i + 1, projects.length);
      } else {
        onProgress(project.name, 'cloning', i + 1, projects.length);
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        await runGitCmd(['clone', project.repo_url, targetDir], PROJECTS_DIR);
        results.push({ name: project.name, status: 'cloned', path: targetDir, message: `Initialized project in ${PROJECTS_DIR}` });
        onProgress(project.name, 'done', i + 1, projects.length);
      }
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
          await runGitCmd(['fetch'], targetDir);
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
