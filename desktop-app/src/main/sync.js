/**
 * Background Sync Engine module
 * Runs periodic background verification sync every 15 minutes + handles instant "Sync Now" requests.
 * Records detailed sync activity logs with target filepaths and sync types (Auto vs Manual).
 */
const { BrowserWindow } = require('electron');
const fetch = require('node-fetch');
const path = require('path');
const os = require('os');
const { fetchAllProjects, PROJECTS_DIR } = require('./git');

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
 * Execute sync and record activity log
 * @param {string} triggerType - 'Manual (Sync Now)' or 'Automatic (15-Min Timer)'
 */
async function performSync(triggerType = 'Automatic (15-Min Timer)') {
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

    const companyCount = (workspace.assigned_projects || []).length;
    const personalCount = (workspace.personal_repos || []).length;
    const inviteCount = (workspace.pending_invites || []).length;

    const logEntry = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      timestamp: timestampDisplay,
      timeIso: new Date().toISOString(),
      triggerType,
      status: 'Success',
      targetPath: PROJECTS_DIR,
      configPath: configPath,
      companyCount,
      personalCount,
      inviteCount,
      summary: `Synced ${companyCount} company & ${personalCount} personal repos to ${PROJECTS_DIR}`,
      gitResults
    };

    // Store in activity logs (max 50 entries)
    syncLogs.unshift(logEntry);
    if (syncLogs.length > 50) syncLogs.pop();

    sendToRenderer('sync:completed', {
      time: logEntry.timeIso,
      invite_count: inviteCount,
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
      error: err.message
    };
    syncLogs.unshift(errorEntry);
    sendToRenderer('sync:error', { error: err.message, time: timestampIso, logEntry: errorEntry, logs: syncLogs });
  } finally {
    isSyncing = false;
  }
}

function startSyncEngine(token) {
  currentToken = token;
  // Trigger immediate initial sync
  performSync('Automatic (Initial Auth Sync)');

  // Schedule recurring 15-minute sync interval
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
  console.log('⏹️  Background sync engine stopped');
}

async function syncNow() {
  await performSync('Manual (Sync Now)');
  return { success: true, logs: syncLogs };
}

function getSyncLogs() {
  return syncLogs;
}

module.exports = { startSyncEngine, stopSyncEngine, syncNow, getSyncLogs };
