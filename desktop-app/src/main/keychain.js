/**
 * OS Keychain integration module
 * Manages secret tokens (JWT, OAuth credentials) via Windows Credential Manager / macOS Keychain.
 */
let keytar;
try {
  keytar = require('keytar');
} catch (err) {
  console.warn('⚠️ keytar native module unavailable, falling back to secure memory storage:', err.message);
  keytar = null;
}

const SERVICE_NAME = 'antigravity-sync';
const memoryStore = new Map();

async function saveToken(key, value) {
  if (keytar) {
    await keytar.setPassword(SERVICE_NAME, key, value);
  } else {
    memoryStore.set(key, value);
  }
}

async function getToken(key) {
  if (keytar) {
    return await keytar.getPassword(SERVICE_NAME, key);
  }
  return memoryStore.get(key) || null;
}

async function clearToken(key) {
  if (keytar) {
    await keytar.deletePassword(SERVICE_NAME, key);
  } else {
    memoryStore.delete(key);
  }
}

module.exports = { saveToken, getToken, clearToken };
