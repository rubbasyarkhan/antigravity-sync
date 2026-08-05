/**
 * System Tray Manager
 */
const { Tray, Menu, nativeImage } = require('electron');
const path = require('path');
const { syncNow } = require('./sync');

let tray = null;

function createTray(mainWindow, appExitCallback) {
  try {
    const iconFileName = process.platform === 'win32' ? '../../assets/icon.ico' : '../../assets/icon.png';
    const iconPath = path.join(__dirname, iconFileName);
    let icon = nativeImage.createFromPath(iconPath);

    if (icon.isEmpty()) {
      icon = nativeImage.createFromDataURL('data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAABTSURBVDhPY/wPBAwUACYoTmpBqAGMDUxMTFDMwMCgABU0gDAIM6BqQAckYgBME8gAxgamAYsBqAYMGIyGADaNmE5qgA8jGQ5m0QpGweAGAEV9Cg43P+N6AAAAAElEQmCC');
    }

    tray = new Tray(icon);

    const contextMenu = Menu.buildFromTemplate([
      {
        label: 'Open Antigravity Sync',
        click: () => {
          if (mainWindow && !mainWindow.isDestroyed()) {
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
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    });

    return tray;
  } catch (err) {
    console.warn('Could not initialize system tray:', err.message);
    return null;
  }
}

module.exports = { createTray };
