/**
 * Background Sync Engine module — Unlimited .gemini Asset Sync (Workflows, Memories, Rules, Configs)
 * Runs periodic background verification sync every 15 minutes + handles instant "Sync Now" & "Setup My Machine" requests.
 * Explicitly EXCLUDES chat logs (~/.gemini/antigravity/brain/) to keep sync payloads light and fast.
 */
const { BrowserWindow } = require('electron');
const fetch = require('node-fetch');
const path = require('path');
const os = require('os');
const { fetchAllProjects, PROJECTS_DIR } = require('./git');
const { writeAntigravityConfig } = require('./config-writer');
const { scanLocalGeminiConfig } = require('./gemini-scanner');

const SYNC_SERVER_URL = process.env.SYNC_SERVER_URL || 'http://localhost:3000';
const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 Minutes

let syncTimer = null;
let currentToken = null;
let isSyncing = false;
const syncLogs = []; // In-memory activity log store

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

  const projectNames = selectedProjects.map((p) => p.name).join(', ') || 'Global Rules & Workflows Only';

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
    summary: `Set up ${selectedProjects.length} enabled repo(s) [${projectNames}] & provisioned ${writtenFiles.length} config & workflow file(s)`,
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
    const headers = { Authorization: `Bearer ${currentToken}`, 'Content-Type': 'application/json' };

    // 1. Scan local .gemini/config/ (workflows, memories, rules, mcp)
    const localScan = scanLocalGeminiConfig();

    // 2. Post local updates to cloud server
    try {
      await fetch(`${SYNC_SERVER_URL}/gemini-config`, {
        method: 'POST',
        headers,
        body: JSON.stringify(localScan),
      });
    } catch (postErr) {
      console.warn('Could not upload local .gemini delta to server:', postErr.message);
    }

    // 3. Fetch latest workspace & Gemini cloud assets from server
    const [workspaceRes, geminiCloudRes] = await Promise.all([
      fetch(`${SYNC_SERVER_URL}/workspace`, { headers }),
      fetch(`${SYNC_SERVER_URL}/gemini-config`, { headers }),
    ]);

    if (!workspaceRes.ok) {
      throw new Error(`Sync server responded with HTTP status ${workspaceRes.status}`);
    }

    const workspace = await workspaceRes.json();
    let geminiCloudData = null;
    if (geminiCloudRes.ok) {
      geminiCloudData = await geminiCloudRes.json();
    }

    // 4. Dispatch pending invites to renderer UI if present
    if (workspace.pending_invites && workspace.pending_invites.length > 0) {
      sendToRenderer('invites:new', workspace.pending_invites);
    }

    // 5. Perform lightweight git fetch check across cloned repos
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

    // 6. ALWAYS provision ~/.gemini/config/ rules, skills, memories & workspace manifests
    const configRes = writeAntigravityConfig(workspace, activeProjects, geminiCloudData);
    const writtenFiles = configRes ? configRes.writtenFiles || [] : [];

    const projectNames = activeProjects.map((p) => p.name).join(', ');

    const activeSummary = activeProjects.length > 0
      ? `Synced ${activeProjects.length} enabled repo(s) [${projectNames}] & provisioned ${writtenFiles.length} .gemini asset file(s)`
      : `Provisioned ${writtenFiles.length} global .gemini asset file(s) (AGENTS.md, skills, memories, MCP) & verified workspace state`;

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
  // Clear any old/stale logs from previous sessions
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
