/**
 * Secure Preload Script
 * Exposes specific electronAPI methods to the renderer process via contextBridge.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Authentication IPC
  login: () => ipcRenderer.invoke('auth:login'),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getToken: () => ipcRenderer.invoke('auth:getToken'),

  // Sync IPC
  syncNow: () => ipcRenderer.invoke('sync:now'),

  // Git & Provisioning IPC
  cloneProject: (repoUrl, projectName) =>
    ipcRenderer.invoke('git:clone', { repoUrl, projectName }),
  setupMachine: (projects, workspaceData) =>
    ipcRenderer.invoke('setup:machine', { projects, workspaceData }),

  checkLocalExist: (projectName) =>
    ipcRenderer.invoke('git:checkLocalExist', projectName),

  // System Shell IPC
  openFolder: (folderPath) => ipcRenderer.invoke('shell:openFolder', folderPath),

  // Push Event Subscribers (Main -> Renderer)
  onAuthSuccess: (callback) =>
    ipcRenderer.on('auth:success', (_e, token) => callback(token)),
  onSyncStarted: (callback) =>
    ipcRenderer.on('sync:started', (_e, data) => callback(data)),
  onSyncCompleted: (callback) =>
    ipcRenderer.on('sync:completed', (_e, data) => callback(data)),
  onSyncError: (callback) =>
    ipcRenderer.on('sync:error', (_e, data) => callback(data)),
  onNewInvites: (callback) =>
    ipcRenderer.on('invites:new', (_e, invites) => callback(invites)),
});
