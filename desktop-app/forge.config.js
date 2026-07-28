module.exports = {
  packagerConfig: {
    name: 'Antigravity Sync',
    executableName: 'antigravity-sync',
    icon: './assets/icon',
    asar: true,
  },
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: { name: 'antigravity_sync' },
    },
    {
      name: '@electron-forge/maker-dmg',
      config: { format: 'ULFO' },
    },
    {
      name: '@electron-forge/maker-zip',
      platforms: ['linux'],
    },
  ],
};
