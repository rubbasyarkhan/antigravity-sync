/**
 * Background Sync Engine module
 * Runs periodic background verification sync every 15 minutes + handles instant "Sync Now" requests.
 */
const { BrowserWindow } = require('electron');
const fetch = require('node-fetch');
const { fetchAllProjects } = require('./git');

const SYNC_SERVER_URL = process.env.SYNC_SERVER_URL || 'http://localhost:3000';
const SYNC_INTERVAL_MS = 15 * 60 * 1000; // 15 Minutes

let syncTimer = null;
let currentToken = null;
let isSyncing = false;

function sendToRenderer(channel, data) {
  BrowserWindow.getAllWindows().forEach((win) => {
    if (!win.isDestroyed()) {
      win.webContents.send(channel, data);
    }
  });
}

async function performSync() {
  if (isSyncing || !currentToken) return;
  isSyncing = true;

  const timestamp = new Date().toISOString();
  sendToRenderer('sync:started', { time: timestamp });

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
    await fetchAllProjects();

    sendToRenderer('sync:completed', {
      time: new Date().toISOString(),
      invite_count: workspace.pending_invites ? workspace.pending_invites.length : 0,
      workspace,
    });
  } catch (err) {
    console.error('Background sync error:', err.message);
    sendToRenderer('sync:error', { error: err.message, time: timestamp });
  } finally {
    isSyncing = false;
  }
}

function startSyncEngine(token) {
  currentToken = token;
  // Trigger immediate initial sync
  performSync();

  // Schedule recurring 15-minute sync interval
  if (syncTimer) clearInterval(syncTimer);
  syncTimer = setInterval(performSync, SYNC_INTERVAL_MS);
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
  await performSync();
  return { success: true };
}

module.exports = { startSyncEngine, stopSyncEngine, syncNow };
