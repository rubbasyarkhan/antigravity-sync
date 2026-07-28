/**
 * Portal Website OS Auto-Detection Engine
 */
document.addEventListener('DOMContentLoaded', () => {
  const downloadBtn = document.getElementById('hero-download-btn');
  const btnLabel = document.getElementById('btn-label');
  const btnSub = document.getElementById('btn-sub');

  const ua = navigator.userAgent;

  let os = 'windows';
  if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'mac';
  } else if (/Linux/i.test(ua)) {
    os = 'linux';
  }

  if (os === 'mac') {
    btnLabel.textContent = 'Download for Mac';
    btnSub.textContent = '.dmg Installer • Auto-detected for macOS';
    downloadBtn.href = 'releases/AntigravitySync.dmg';
  } else if (os === 'linux') {
    btnLabel.textContent = 'Download for Linux';
    btnSub.textContent = '.AppImage • Auto-detected for Linux';
    downloadBtn.href = 'releases/AntigravitySync.AppImage';
  } else {
    btnLabel.textContent = 'Download for Windows';
    btnSub.textContent = '.exe Installer • Auto-detected for Windows';
    downloadBtn.href = 'releases/AntigravitySync-Setup.exe';
  }
});
