/**
 * Dashboard & Project List Rendering Engine with Real-Time Search Filtering
 */
let searchQuery = '';

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('project-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      renderProjects();
    });
  }
});

function renderProjects() {
  const companyContainer = document.getElementById('company-projects-list');
  const personalContainer = document.getElementById('personal-projects-list');

  if (!state.workspace) return;

  let assigned = state.workspace.assigned_projects || [];
  let personal = state.workspace.personal_repos || [];

  // Filter projects based on real-time search query
  if (searchQuery) {
    assigned = assigned.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(searchQuery)) ||
        (p.description && p.description.toLowerCase().includes(searchQuery)) ||
        (p.team && p.team.toLowerCase().includes(searchQuery))
    );

    personal = personal.filter(
      (p) =>
        (p.name && p.name.toLowerCase().includes(searchQuery)) ||
        (p.repo_url && p.repo_url.toLowerCase().includes(searchQuery))
    );
  }

  // 1. Render Company Assigned Projects
  if (assigned.length === 0) {
    companyContainer.innerHTML = `<div class="empty-state">${
      searchQuery
        ? `No company projects match "${escapeHtml(searchQuery)}".`
        : `No company projects assigned to @${state.user.github_login} yet.`
    }</div>`;
  } else {
    companyContainer.innerHTML = assigned
      .map((proj) => {
        const isEnabled = state.enabledSlugs.has(proj.slug) || state.enabledSlugs.size === 0;
        return `
        <div class="project-card">
          <div class="project-details">
            <h4>${escapeHtml(proj.name)}</h4>
            <p>${escapeHtml(proj.description || 'No description')} • <span class="team-tag">${escapeHtml(proj.team || 'General')}</span></p>
          </div>
          <label class="switch">
            <input type="checkbox" data-slug="${proj.slug}" ${isEnabled ? 'checked' : ''} onchange="handleToggleChange(this)">
            <span class="slider"></span>
          </label>
        </div>
      `;
      })
      .join('');

    // Append Setup Machine button
    companyContainer.innerHTML += `
      <button class="btn-primary" style="margin-top:16px" onclick="handleSetupMachine()">
        🚀 Set Up My Machine
      </button>
    `;
  }

  // 2. Render Personal Projects
  if (personal.length === 0) {
    personalContainer.innerHTML = `<div class="empty-state">${
      searchQuery
        ? `No personal projects match "${escapeHtml(searchQuery)}".`
        : 'No personal projects added.'
    }</div>`;
  } else {
    personalContainer.innerHTML = personal
      .map(
        (proj) => `
        <div class="project-card">
          <div class="project-details">
            <h4>${escapeHtml(proj.name)}</h4>
            <p>Personal Project • ${escapeHtml(proj.repo_url)}</p>
          </div>
          <button class="btn-secondary" onclick="openShareModal('${proj.slug}', '${proj.repo_url}')">👥 Share</button>
        </div>
      `
      )
      .join('');
  }
}

async function handleToggleChange(checkbox) {
  const slug = checkbox.dataset.slug;
  if (checkbox.checked) {
    state.enabledSlugs.add(slug);
  } else {
    state.enabledSlugs.delete(slug);
  }

  // Persist updated toggles to sync server
  try {
    await fetch(`${SYNC_SERVER_URL}/workspace`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${state.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        enabled_slugs: Array.from(state.enabledSlugs),
        personal_repos: state.workspace.personal_repos || [],
      }),
    });
  } catch (err) {
    console.error('Failed to save toggle state:', err);
  }
}

async function handleSetupMachine() {
  const assigned = state.workspace.assigned_projects || [];
  const selectedProjects = assigned.filter(
    (p) => state.enabledSlugs.has(p.slug) || state.enabledSlugs.size === 0
  );

  if (selectedProjects.length === 0) {
    alert('Please enable at least one project to set up your machine.');
    return;
  }

  if (window.electronAPI) {
    const res = await window.electronAPI.setupMachine(selectedProjects, state.workspace);
    alert(`🎉 Setup complete! ${selectedProjects.length} project(s) provisioned into ~/Projects/ and ~/.gemini/config/`);
  }
}

function renderInvites(invites = []) {
  const invitesContainer = document.getElementById('invites-list');
  const badge = document.getElementById('invite-badge');

  if (invites.length > 0) {
    badge.textContent = invites.length;
    badge.classList.remove('hidden');

    invitesContainer.innerHTML = invites
      .map(
        (inv) => `
        <div class="project-card">
          <div class="project-details">
            <h4>Shared Project from @${escapeHtml(inv.from_login)}</h4>
            <p>Project: ${escapeHtml(inv.project_slug)} • ${escapeHtml(inv.repo_url)}</p>
          </div>
          <div style="display:flex; gap:8px">
            <button class="btn-primary" onclick="handleInviteAction(${inv.id}, 'accept')">Accept & Sync</button>
            <button class="btn-secondary" onclick="handleInviteAction(${inv.id}, 'decline')">Decline</button>
          </div>
        </div>
      `
      )
      .join('');
  } else {
    badge.classList.add('hidden');
    invitesContainer.innerHTML = '<div class="empty-state">No pending invitations.</div>';
  }
}

async function handleInviteAction(inviteId, action) {
  try {
    const res = await fetch(`${SYNC_SERVER_URL}/invites/${inviteId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${state.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action }),
    });

    if (res.ok) {
      fetchWorkspace();
    }
  } catch (err) {
    console.error('Failed to update invite:', err);
  }
}

function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
