/**
 * Electron Main Process Entry Point
 */
require('dotenv').config();

const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const os = require('os');

const { startGitHubLogin } = require('./auth');
const { saveToken, getToken, clearToken } = require('./keychain');
const { cloneProjects } = require('./git');
const { startSyncEngine, stopSyncEngine, syncNow } = require('./sync');
const { createTray } = require('./tray');
const { writeAntigravityConfig } = require('./config-writer');

let mainWindow = null;
let trayInstance = null;

// Register custom deep link protocol: antigravity-sync://auth?token=...
if (process.defaultApp) {
  if (process.argv.length >= 2) {
    app.setAsDefaultProtocolClient('antigravity-sync', process.execPath, [path.resolve(process.argv[1])]);
  }
} else {
  app.setAsDefaultProtocolClient('antigravity-sync');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 980,
    height: 700,
    minWidth: 840,
    minHeight: 600,
    title: 'Antigravity Sync',
    backgroundColor: '#0d1117',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('close', (e) => {
    e.preventDefault();
    mainWindow.hide();
  });
}

// IPC Protocol & Auth event listener
function handleAuthUrl(url) {
  if (!url || !url.startsWith('antigravity-sync://')) return;

  try {
    const parsedUrl = new URL(url);
    const token = parsedUrl.searchParams.get('token');
    if (token) {
      saveToken('jwt', token).then(() => {
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('auth:success', token);
          mainWindow.show();
        }
        startSyncEngine(token);
      });
    }
  } catch (err) {
    console.error('Failed to parse protocol URL:', url, err);
  }
}

// Setup IPC Communications
function setupIPC() {
  ipcMain.handle('auth:login', async () => {
    return startGitHubLogin();
  });

  ipcMain.handle('auth:logout', async () => {
    await clearToken('jwt');
    stopSyncEngine();
    return { success: true };
  });

  ipcMain.handle('auth:getToken', async () => {
    return await getToken('jwt');
  });

  ipcMain.handle('sync:now', async () => {
    return await syncNow();
  });

  ipcMain.handle('sync:getLogs', async () => {
    const { getSyncLogs } = require('./sync');
    return getSyncLogs();
  });

  ipcMain.handle('git:clone', async (_event, { repoUrl, projectName }) => {
    return await cloneProjects([{ name: projectName, repo_url: repoUrl }]);
  });

  ipcMain.handle('setup:machine', async (_event, projects, workspaceData) => {
    // Write configs into ~/.gemini/config/
    const configResult = writeAntigravityConfig(workspaceData, projects);

    // Record accurate activity log for Machine Setup
    const { addSetupLogEntry } = require('./sync');
    if (configResult && configResult.writtenFiles) {
      addSetupLogEntry(projects, configResult.writtenFiles);
    }

    return { configResult };
  });

  ipcMain.handle('git:checkLocalExist', async (_event, projectName) => {
    const targetDir = path.join(os.homedir(), 'Projects', projectName);
    return fs.existsSync(path.join(targetDir, '.git'));
  });

  ipcMain.handle('system:verifyEnv', async () => {
    const { verifySystemEnvironment } = require('./git');
    return await verifySystemEnvironment();
  });

  ipcMain.handle('shell:openFolder', async (_event, folderPath) => {
    if (folderPath) {
      const resolvedPath = folderPath.startsWith('~')
        ? path.join(os.homedir(), folderPath.slice(1))
        : folderPath;
      await shell.openPath(resolvedPath);
    }
  });
}

// Deep linking protocol handlers for macOS & Windows
app.on('open-url', (event, url) => {
  event.preventDefault();
  handleAuthUrl(url);
});

app.on('second-instance', (_event, argv) => {
  const url = argv.find((arg) => arg.startsWith('antigravity-sync://'));
  if (url) {
    handleAuthUrl(url);
  }
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.show();
    mainWindow.focus();
  }
});

// Enforce single instance lock
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  app.quit();
} else {
  app.whenReady().then(async () => {
    setupIPC();
    createWindow();
    trayInstance = createTray(mainWindow, () => {
      stopSyncEngine();
      app.exit(0);
    });

    // Handle initial launch deep-link on Windows
    const initialUrl = process.argv.find((arg) => arg.startsWith('antigravity-sync://'));
    if (initialUrl) {
      handleAuthUrl(initialUrl);
    } else {
      // Auto-start sync engine if JWT token exists in OS Keychain
      const token = await getToken('jwt');
      if (token) {
        startSyncEngine(token);
      }
    }
  });
}

app.on('window-all-closed', (e) => {
  e.preventDefault();
});
