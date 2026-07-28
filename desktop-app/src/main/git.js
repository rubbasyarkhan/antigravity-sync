/**
 * Git engine module — executes repository cloning and pulling into ~/Projects/
 */
const simpleGit = require('simple-git');
const path = require('path');
const os = require('os');
const fs = require('fs');

const PROJECTS_DIR = path.join(os.homedir(), 'Projects');

// Ensure ~/Projects/ root directory exists
if (!fs.existsSync(PROJECTS_DIR)) {
  fs.mkdirSync(PROJECTS_DIR, { recursive: true });
}

/**
 * Clone or pull an array of projects
 * @param {Array<{name: string, repo_url: string}>} projects
 * @param {Function} onProgress
 */
async function cloneProjects(projects, onProgress = () => {}) {
  const results = [];

  for (const project of projects) {
    const targetDir = path.join(PROJECTS_DIR, project.name);

    try {
      if (fs.existsSync(path.join(targetDir, '.git'))) {
        onProgress(project.name, 'pulling');
        const git = simpleGit(targetDir);
        await git.pull();
        results.push({ name: project.name, status: 'pulled', path: targetDir });
        onProgress(project.name, 'done');
      } else {
        onProgress(project.name, 'cloning');
        fs.mkdirSync(targetDir, { recursive: true });
        await simpleGit().clone(project.repo_url, targetDir);
        results.push({ name: project.name, status: 'cloned', path: targetDir });
        onProgress(project.name, 'done');
      }
    } catch (err) {
      console.error(`Git engine error on project ${project.name}:`, err.message);
      results.push({ name: project.name, status: 'error', error: err.message });
      onProgress(project.name, 'error');
    }
  }

  return results;
}

/**
 * Run git fetch on all cloned projects inside ~/Projects/
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
          await simpleGit(targetDir).fetch();
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
