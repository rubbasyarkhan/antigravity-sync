/**
 * Portal Website OS Auto-Detection Engine
 */
document.addEventListener('DOMContentLoaded', () => {
  const downloadBtn = document.getElementById('hero-download-btn');
  const btnLabel = document.getElementById('btn-label');
  const btnSub = document.getElementById('btn-sub');
  const iconContainer = document.getElementById('btn-icon-container');

  const ua = navigator.userAgent;

  let os = 'windows';
  if (/Macintosh|Mac OS X/i.test(ua)) {
    os = 'mac';
  } else if (/Linux/i.test(ua)) {
    os = 'linux';
  }

  const windowsSvg = `<svg class="platform-svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M0 3.449L9.75 2.1v9.451H0m0 1.05h9.75v9.451L0 20.699M10.8 1.95L24 0v11.4H10.8m0 1.2H24V24l-13.2-1.95"/></svg>`;
  const macSvg = `<svg class="platform-svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.3c.66-.8 1.11-1.92.99-3.04-.96.04-2.12.64-2.8 1.44-.61.71-1.14 1.86-1 2.97 1.08.08 2.16-.57 2.81-1.37z"/></svg>`;
  const linuxSvg = `<svg class="platform-svg" width="28" height="28" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/></svg>`;

  if (os === 'mac') {
    btnLabel.textContent = 'Download for Mac';
    btnSub.textContent = 'Package (.zip) • Auto-detected for macOS';
    downloadBtn.href = 'releases/AntigravitySync-macOS.zip';
    downloadBtn.setAttribute('download', 'AntigravitySync-macOS.zip');
    if (iconContainer) iconContainer.innerHTML = macSvg;
  } else if (os === 'linux') {
    btnLabel.textContent = 'Download for Linux';
    btnSub.textContent = 'Package (.zip) • Auto-detected for Linux';
    downloadBtn.href = 'releases/AntigravitySync-Linux.zip';
    downloadBtn.setAttribute('download', 'AntigravitySync-Linux.zip');
    if (iconContainer) iconContainer.innerHTML = linuxSvg;
  } else {
    btnLabel.textContent = 'Download for Windows';
    btnSub.textContent = 'Package (.zip) • Auto-detected for Windows';
    downloadBtn.href = 'releases/AntigravitySync-Windows.zip';
    downloadBtn.setAttribute('download', 'AntigravitySync-Windows.zip');
    if (iconContainer) iconContainer.innerHTML = windowsSvg;
  }
});
