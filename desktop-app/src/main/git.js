/**
 * Git engine module — executes repository cloning and pulling into Documents/Projects/
 */
const simpleGit = require('simple-git');
const path = require('path');
const os = require('os');
const fs = require('fs');

const PROJECTS_DIR = path.join(os.homedir(), 'Documents', 'Projects');

// Ensure Documents/Projects/ root directory exists
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

  for (let i = 0; i < projects.length; i++) {
    const project = projects[i];
    const targetDir = path.join(PROJECTS_DIR, project.name);

    try {
      if (fs.existsSync(path.join(targetDir, '.git'))) {
        // Project already exists in Documents/Projects/<Project Name>/
        onProgress(project.name, 'pulling', i + 1, projects.length);
        const git = simpleGit(targetDir);
        await git.pull();
        results.push({ name: project.name, status: 'pulled', path: targetDir, message: 'Updated existing project in Documents/Projects/' });
        onProgress(project.name, 'done', i + 1, projects.length);
      } else {
        // Fresh clone
        onProgress(project.name, 'cloning', i + 1, projects.length);
        fs.mkdirSync(targetDir, { recursive: true });
        await simpleGit().clone(project.repo_url, targetDir);
        results.push({ name: project.name, status: 'cloned', path: targetDir, message: 'Initialized new project in Documents/Projects/' });
        onProgress(project.name, 'done', i + 1, projects.length);
      }
    } catch (err) {
      console.error(`Git engine error on project ${project.name}:`, err.message);
      results.push({ name: project.name, status: 'error', error: err.message, path: targetDir });
      onProgress(project.name, 'error', i + 1, projects.length);
    }
  }

  return results;
}

/**
 * Run git fetch on all cloned projects inside Documents/Projects/
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
