/**
 * Background Sync Engine module
 * Runs periodic background verification sync every 15 minutes + handles instant "Sync Now" & "Setup My Machine" requests.
 * Records accurate, detailed sync activity logs with exact file diffs and selected project manifests.
 */
const { BrowserWindow } = require('electron');
const fetch = require('node-fetch');
const path = require('path');
const os = require('os');
const { fetchAllProjects, PROJECTS_DIR } = require('./git');
const { writeAntigravityConfig } = require('./config-writer');

const SYNC_SERVER_URL = process.env.SYNC_SERVER_URL || 'http://localhost:3000';
const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 Minutes

let syncTimer = null;
let currentToken = null;
let isSyncing = false;
const syncLogs = []; // In-memory activity log store (max 50)

function sendToRenderer(channel, data) {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  });
}

/**
 * Record a dedicated log entry when user clicks "Set Up My Machine"
 */
function addSetupLogEntry(selectedProjects = [], writtenFiles = []) {
  const configPath = path.join(os.homedir(), '.gemini', 'config');
  const timestampDisplay = new Date().toLocaleString();
  const timestampIso = new Date().toISOString();

  const projectNames = selectedProjects.map((p) => p.name).join(', ') || 'Global Rules';

  const logEntry = {
    id: Date.now() + Math.random().toString(36).substr(2, 4),
    timestamp: timestampDisplay,
    timeIso: timestampIso,
    triggerType: 'MANUAL (Setup My Machine)',
    status: 'Success',
    targetPath: PROJECTS_DIR,
    configPath: configPath,
    companyCount: selectedProjects.filter((p) => p.team && p.team !== 'Personal').length,
    personalCount: selectedProjects.filter((p) => !p.team || p.team === 'Personal').length,
    inviteCount: 0,
    summary: `Set up ${selectedProjects.length} selected project(s) [${projectNames}] & provisioned ${writtenFiles.length} config file(s)`,
    syncedFiles: writtenFiles.map((f) => ({
      path: f.file,
      name: path.basename(f.file),
      type: f.type,
      action: f.action,
      diff: f.diff || `+ File ${path.basename(f.file)} provisioned into ${configPath}`
    }))
  };

  syncLogs.unshift(logEntry);
  if (syncLogs.length > 50) syncLogs.pop();

  sendToRenderer('sync:completed', {
    time: logEntry.timeIso,
    logEntry,
    logs: syncLogs
  });
}

/**
 * Execute background or manual sync and record activity log
 * @param {string} triggerType - 'Manual (Sync Now)' or 'Automatic (15-Min Timer)'
 * @param {Array} activeProjectsOverride - Optional list of projects toggled ON in renderer
 */
async function performSync(triggerType = 'Automatic (15-Min Timer)', activeProjectsOverride = null) {
  if (isSyncing || !currentToken) return;
  isSyncing = true;

  const startTime = new Date();
  const timestampIso = startTime.toISOString();
  const timestampDisplay = startTime.toLocaleString();
  const configPath = path.join(os.homedir(), '.gemini', 'config');

  sendToRenderer('sync:started', { time: timestampIso, triggerType });

  try {
    // 1. Fetch latest workspace & invitations from server
    const res = await fetch(`${SYNC_SERVER_URL}/workspace`, {
      headers: { Authorization: `Bearer ${currentToken}` },
    });

    if (!res.ok) {
      throw new Error(`Sync server responded with HTTP status ${res.status}`);
    }

    const workspace = await res.json();

    // 2. Dispatch invites to renderer UI if present
    if (workspace.pending_invites && workspace.pending_invites.length > 0) {
      sendToRenderer('invites:new', workspace.pending_invites);
    }

    // 3. Perform lightweight git fetch check across cloned repos
    const gitResults = await fetchAllProjects();

    let activeProjects = [];
    if (Array.isArray(activeProjectsOverride)) {
      activeProjects = activeProjectsOverride;
    } else {
      const enabledSlugs = new Set(workspace.enabled_slugs || []);
      const assignedProjects = workspace.assigned_projects || [];
      const personalRepos = workspace.personal_repos || [];

      const activeAssigned = assignedProjects.filter((p) => enabledSlugs.has(p.slug));
      const activePersonal = personalRepos.filter((p) => enabledSlugs.has(p.slug || p.name));
      activeProjects = [...activeAssigned, ...activePersonal];
    }

    // 4. Always provision ~/.gemini/config/ files on every sync execution
    const configRes = writeAntigravityConfig(workspace, activeProjects);
    const writtenFiles = configRes ? configRes.writtenFiles || [] : [];

    const projectNames = activeProjects.map((p) => p.name).join(', ');

    const activeSummary = activeProjects.length > 0
      ? `Synced ${activeProjects.length} enabled project(s) [${projectNames}] & provisioned ${writtenFiles.length} config file(s)`
      : `Provisioned ${writtenFiles.length} global config file(s) (AGENTS.md, mcp_config.json) & verified workspace state`;

    const logEntry = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      timestamp: timestampDisplay,
      timeIso: new Date().toISOString(),
      triggerType,
      status: 'Success',
      targetPath: PROJECTS_DIR,
      configPath: configPath,
      companyCount: activeProjects.filter(p => p.team && p.team !== 'Personal').length,
      personalCount: activeProjects.filter(p => !p.team || p.team === 'Personal').length,
      inviteCount: (workspace.pending_invites || []).length,
      summary: activeSummary,
      gitResults,
      syncedFiles: writtenFiles.map((f) => ({
        path: f.file,
        name: path.basename(f.file),
        type: f.type,
        action: f.action,
        diff: f.diff || `+ File ${path.basename(f.file)} provisioned into ${configPath}`
      }))
    };

    // Store in activity logs (max 50 entries)
    syncLogs.unshift(logEntry);
    if (syncLogs.length > 50) syncLogs.pop();

    sendToRenderer('sync:completed', {
      time: logEntry.timeIso,
      invite_count: logEntry.inviteCount,
      workspace,
      logEntry,
      logs: syncLogs
    });
  } catch (err) {
    console.error('Background sync error:', err.message);
    const errorEntry = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      timestamp: timestampDisplay,
      timeIso: timestampIso,
      triggerType,
      status: 'Error',
      targetPath: PROJECTS_DIR,
      configPath: configPath,
      summary: `Sync failed: ${err.message}`,
      error: err.message,
      syncedFiles: []
    };
    syncLogs.unshift(errorEntry);
    sendToRenderer('sync:error', { error: err.message, time: timestampIso, logEntry: errorEntry, logs: syncLogs });
  } finally {
    isSyncing = false;
  }
}

function startSyncEngine(token) {
  currentToken = token;
  // Wipe stale in-memory logs on initial login session start
  syncLogs.length = 0;
  performSync('Automatic (Initial Auth Sync)');

  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(() => performSync('Automatic (15-Min Timer)'), SYNC_INTERVAL_MS);
  console.log('🔄 Background sync engine activated (15-minute interval)');
}

function stopSyncEngine() {
  if (syncTimer) {
    clearInterval(syncTimer);
    syncTimer = null;
  }
  currentToken = null;
  syncLogs.length = 0;
  console.log('⏹️  Background sync engine stopped');
}

async function syncNow(activeProjectsOverride = null) {
  await performSync('Manual (Sync Now)', activeProjectsOverride);
  return { success: true, logs: syncLogs };
}

function getSyncLogs() {
  return syncLogs;
}

module.exports = { startSyncEngine, stopSyncEngine, syncNow, getSyncLogs, addSetupLogEntry };
