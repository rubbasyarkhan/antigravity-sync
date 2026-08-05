/**
 * Main Renderer App Logic — With Sync Inspection Diff Modal & Single-Scrollbar UX Architecture
 */
const SYNC_SERVER_URL = 'http://localhost:3000';

let state = {
  token: null,
  user: null,
  workspace: null,
  enabledSlugs: new Set(),
  enabledPersonalSlugs: new Set(),
};

let showAllLogs = false;
let currentLogsCache = [];

// UI Element References
const screenLogin = document.getElementById('screen-login');
const screenDashboard = document.getElementById('screen-dashboard');
const btnLogin = document.getElementById('btn-login');
const btnLogout = document.getElementById('btn-logout');
const btnSyncNow = document.getElementById('btn-sync-now');
const btnSyncNow2 = document.getElementById('btn-sync-now-2');
const btnOpenFolder = document.getElementById('btn-open-folder');

// Initialize application
document.addEventListener('DOMContentLoaded', async () => {
  setupNavigation();
  setupEventListeners();

  const btnDiffClose = document.getElementById('btn-diff-modal-close');
  if (btnDiffClose) {
    btnDiffClose.addEventListener('click', () => {
      document.getElementById('modal-log-details').classList.add('hidden');
    });
  }

  // Check for saved JWT token in OS Keychain
  if (window.electronAPI) {
    const savedToken = await window.electronAPI.getToken();
    if (savedToken) {
      handleAuthentication(savedToken);
    } else {
      showScreen('login');
    }

    // Subscribe to IPC events push from main process
    window.electronAPI.onAuthSuccess((token) => handleAuthentication(token));
    window.electronAPI.onSyncStarted((data) => updateSyncStatus('Syncing...'));
    window.electronAPI.onSyncCompleted((data) => {
      updateSyncStatus('Synced', data.time);
      if (data.workspace) {
        state.workspace = data.workspace;
        renderProjects();
      }
      if (data.logs) {
        renderSyncLogs(data.logs);
      }
    });
    window.electronAPI.onSyncError((data) => {
      updateSyncStatus('Error', data.time);
      if (data.logs) {
        renderSyncLogs(data.logs);
      }
    });
    window.electronAPI.onNewInvites((invites) => renderInvites(invites));

    // Load initial sync logs
    if (window.electronAPI.getSyncLogs) {
      const logs = await window.electronAPI.getSyncLogs();
      renderSyncLogs(logs);
    }
  }
});

function showScreen(name) {
  screenLogin.classList.remove('active');
  screenDashboard.classList.remove('active');

  if (name === 'login') {
    screenLogin.classList.add('active');
  } else {
    screenDashboard.classList.add('active');
  }
}

function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const tabContents = document.querySelectorAll('.tab-content');

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const tabName = item.dataset.tab;

      navItems.forEach((n) => n.classList.remove('active'));
      tabContents.forEach((t) => t.classList.remove('active'));

      item.classList.add('active');
      document.getElementById(`tab-${tabName}`).classList.add('active');
    });
  });
}

function setupEventListeners() {
  btnLogin.addEventListener('click', () => {
    if (window.electronAPI) {
      window.electronAPI.login();
    }
  });

  btnLogout.addEventListener('click', async () => {
    if (window.electronAPI) {
      await window.electronAPI.logout();
    }
    state.token = null;
    state.user = null;
    state.workspace = null;
    showScreen('login');
  });

  const triggerSync = async () => {
    if (window.electronAPI) {
      updateSyncStatus('Syncing...');
      const assigned = state.workspace ? (state.workspace.assigned_projects || []) : [];
      const personal = state.workspace ? (state.workspace.personal_repos || []) : [];
      const activeCompany = assigned.filter((p) => state.enabledSlugs && state.enabledSlugs.has(p.slug));
      const activePersonal = personal.filter((p) => state.enabledPersonalSlugs && state.enabledPersonalSlugs.has(p.slug || p.name));
      const selectedProjects = [...activeCompany, ...activePersonal];

      const res = await window.electronAPI.syncNow(selectedProjects);
      if (res && res.logs) {
        renderSyncLogs(res.logs);
      }
      await fetchWorkspace();
    }
  };

  btnSyncNow.addEventListener('click', triggerSync);
  btnSyncNow2.addEventListener('click', triggerSync);

  btnOpenFolder.addEventListener('click', () => {
    if (window.electronAPI) {
      window.electronAPI.openFolder('~/Projects/');
    }
  });
}

async function handleAuthentication(token) {
  state.token = token;
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    state.user = payload;
    updateUserProfile(payload);
    await fetchWorkspace();
    showScreen('dashboard');
  } catch (err) {
    console.error('Failed to parse token:', err);
    showScreen('login');
  }
}

function updateUserProfile(user) {
  document.getElementById('user-avatar').src = user.avatar_url || '';
  document.getElementById('user-name').textContent = user.name || user.github_login;
  document.getElementById('user-login').textContent = `@${user.github_login}`;
  document.getElementById('settings-login').textContent = `@${user.github_login}`;
}

async function fetchWorkspace() {
  if (!state.token) return;

  try {
    const res = await fetch(`${SYNC_SERVER_URL}/workspace`, {
      headers: { Authorization: `Bearer ${state.token}` },
    });

    if (res.status === 401) {
      console.warn('Session expired, clearing token and redirecting to login...');
      if (window.electronAPI) await window.electronAPI.logout();
      state.token = null;
      showScreen('login');
      return;
    }

    if (res.ok) {
      state.workspace = await res.json();
      state.enabledSlugs = new Set(state.workspace.enabled_slugs || []);
      state.enabledPersonalSlugs = new Set();
      renderProjects();
      renderInvites(state.workspace.pending_invites || []);
    } else {
      console.error('Workspace fetch error status:', res.status);
    }
  } catch (err) {
    console.error('Failed to fetch workspace from server:', err);
  }
}

function updateSyncStatus(statusText, timeIso) {
  const label = document.getElementById('sync-status-label');
  const timeLabel = document.getElementById('sync-last-time');

  label.textContent = statusText;
  if (statusText === 'Synced') {
    label.className = 'status-badge synced';
  } else {
    label.className = 'status-badge';
  }

  if (timeIso) {
    timeLabel.textContent = new Date(timeIso).toLocaleTimeString();
  }
}

function toggleShowAllLogs() {
  showAllLogs = !showAllLogs;
  if (window.electronAPI && window.electronAPI.getSyncLogs) {
    window.electronAPI.getSyncLogs().then((logs) => renderSyncLogs(logs));
  }
}

function openLogDetailsModal(logId) {
  const log = currentLogsCache.find((l) => String(l.id) === String(logId));
  if (!log) return;

  const modal = document.getElementById('modal-log-details');
  const title = document.getElementById('diff-modal-title');
  const subtitle = document.getElementById('diff-modal-subtitle');
  const diffContainer = document.getElementById('diff-file-list');

  title.textContent = `Sync Inspection: ${log.triggerType || 'Activity Log'}`;
  subtitle.textContent = `Execution Time: ${log.timestamp} • Target: ${log.configPath}`;

  const files = log.syncedFiles || [];
  if (files.length === 0) {
    diffContainer.innerHTML = '<div class="empty-state">No individual file diffs recorded for this sync run.</div>';
  } else {
    diffContainer.innerHTML = files
      .map((f) => {
        const diffLines = (f.diff || '')
          .split('\n')
          .map((line) => {
            if (line.startsWith('+')) {
              return `<div style="background: rgba(22, 163, 74, 0.2); color: #4ade80; padding: 2px 6px;">${escapeHtml(line)}</div>`;
            } else if (line.startsWith('-')) {
              return `<div style="background: rgba(220, 38, 38, 0.2); color: #f87171; padding: 2px 6px;">${escapeHtml(line)}</div>`;
            }
            return `<div style="color: #cbd5e1; padding: 2px 6px;">${escapeHtml(line)}</div>`;
          })
          .join('');

        return `
        <div style="border: 1px solid var(--border-color); border-radius: 8px; margin-bottom: 12px; overflow: hidden; background: #060911;">
          <div style="background: #1e293b; padding: 8px 12px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border-color);">
            <strong style="color: #f8fafc; font-size: 13px;">${escapeHtml(f.name)}</strong>
            <span style="background: #2563eb; color: #ffffff; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold;">${escapeHtml(f.action)}</span>
          </div>
          <div style="padding: 6px 12px; font-size: 11px; color: var(--text-muted); border-bottom: 1px dashed var(--border-color);">
            Path: <span style="color:#ffffff;">${escapeHtml(f.path)}</span>
          </div>
          <div style="padding: 8px; font-family: monospace; font-size: 11px; line-height: 1.4;">
            ${diffLines}
          </div>
        </div>
      `;
      })
      .join('');
  }

  modal.classList.remove('hidden');
}

function renderSyncLogs(logs = []) {
  currentLogsCache = logs;
  const container = document.getElementById('sync-activity-logs');
  if (!container) return;

  if (logs.length === 0) {
    container.innerHTML = '<div class="empty-state">No sync activity logged yet.</div>';
    return;
  }

  const visibleLogs = showAllLogs ? logs : logs.slice(0, 5);

  let html = visibleLogs
    .map((log) => {
      const isError = log.status === 'Error';
      const isManual = log.triggerType && log.triggerType.includes('Manual');
      const badgeColor = isManual ? '#2563eb' : '#7c3aed';
      const typeLabel = isManual ? 'MANUAL' : 'AUTOMATIC';
      const fileCount = (log.syncedFiles || []).length;

      return `
      <div style="border-bottom: 1px solid var(--border-color); padding: 14px 0; font-size: 12px; font-family: monospace;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
          <span style="background:${badgeColor}; color:#ffffff; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: bold;">${typeLabel}</span>
          <span style="color: var(--text-muted); font-size: 11px;">Time: ${log.timestamp}</span>
        </div>
        <div style="color: ${isError ? '#f87171' : '#4ade80'}; font-weight: 600; margin-bottom: 4px;">${escapeHtml(log.summary)}</div>
        <div style="color: var(--text-muted); font-size: 11px;">Projects Directory: <span style="color:#ffffff;">${escapeHtml(log.targetPath)}</span></div>
        <div style="color: var(--text-muted); font-size: 11px;">Config Directory: <span style="color:#ffffff;">${escapeHtml(log.configPath)}</span></div>
        <div style="margin-top: 8px; display:flex; justify-content:space-between; align-items:center;">
          <span style="font-size: 11px; color: #60a5fa;">Synced ${fileCount} Config & Manifest File(s)</span>
          <button class="btn-secondary" onclick="openLogDetailsModal('${log.id}')" style="font-size: 11px; padding: 4px 10px;">
            Inspect Synced File Changes (${fileCount})
          </button>
        </div>
      </div>
    `;
    })
    .join('');

  if (logs.length > 5) {
    html += `
      <div style="text-align: center; margin-top: 14px;">
        <button class="btn-secondary" onclick="toggleShowAllLogs()" style="font-size: 12px; padding: 6px 14px;">
          ${showAllLogs ? 'Collapse Activity Logs' : `View All ${logs.length} Log Entries`}
        </button>
      </div>
    `;
  }

  container.innerHTML = html;
}
