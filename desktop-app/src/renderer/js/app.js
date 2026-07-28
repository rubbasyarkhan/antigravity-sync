/**
 * Main Renderer App Logic
 */
const SYNC_SERVER_URL = 'http://localhost:3000';

let state = {
  token: null,
  user: null,
  workspace: null,
  enabledSlugs: new Set(),
};

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
    window.electronAPI.onSyncStarted(() => updateSyncStatus('Syncing...'));
    window.electronAPI.onSyncCompleted((data) => {
      updateSyncStatus('Synced', data.time);
      if (data.workspace) {
        state.workspace = data.workspace;
        renderProjects();
      }
    });
    window.electronAPI.onSyncError((data) => updateSyncStatus('Error', data.time));
    window.electronAPI.onNewInvites((invites) => renderInvites(invites));
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
    showScreen('login');
  });

  const triggerSync = async () => {
    if (window.electronAPI) {
      updateSyncStatus('Syncing...');
      await window.electronAPI.syncNow();
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

    if (res.ok) {
      state.workspace = await res.json();
      state.enabledSlugs = new Set(state.workspace.enabled_slugs || []);
      renderProjects();
      renderInvites(state.workspace.pending_invites || []);
    }
  } catch (err) {
    console.error('Failed to fetch workspace:', err);
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
