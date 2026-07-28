/**
 * System Tray Manager
 */
const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { syncNow } = require('./sync');

let tray = null;

function createTray(mainWindow, appExitCallback) {
  const iconPath = path.join(__dirname, '../../assets/icon.png');
  let icon = nativeImage.createFromPath(iconPath);

  if (icon.isEmpty()) {
    icon = nativeImage.createEmpty();
  }

  tray = new Tray(icon);

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Open Antigravity Sync',
      click: () => {
        if (mainWindow) {
          mainWindow.show();
          mainWindow.focus();
        }
      },
    },
    {
      label: 'Sync Now',
      click: async () => {
        await syncNow();
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        if (appExitCallback) appExitCallback();
      },
    },
  ]);

  tray.setToolTip('Antigravity Sync');
  tray.setContextMenu(contextMenu);

  tray.on('double-click', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.focus();
    }
  });

  return tray;
}

module.exports = { createTray };
