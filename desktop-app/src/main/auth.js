/**
 * GitHub OAuth authentication helper for Electron main process.
 */
const { shell } = require('electron');

const SYNC_SERVER_URL = process.env.SYNC_SERVER_URL || 'https://antigravity-sync-three.vercel.app';

async function startGitHubLogin() {
  const loginUrl = `${SYNC_SERVER_URL}/auth/github`;
  await shell.openExternal(loginUrl);
  return { started: true, loginUrl };
}

module.exports = { startGitHubLogin, SYNC_SERVER_URL };
