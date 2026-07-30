/**
 * Dashboard & Project List Rendering Engine with Real-Time Search, Pagination & Non-blocking Local Cloned Check
 */
let searchQuery = '';
let companyPage = 1;
let personalPage = 1;
const ITEMS_PER_PAGE = 6;
const localClonedMap = new Map(); // Cache local existence check per project
let isCheckingLocal = false;

document.addEventListener('DOMContentLoaded', () => {
  const searchInput = document.getElementById('project-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      searchQuery = e.target.value.trim().toLowerCase();
      companyPage = 1;
      personalPage = 1;
      renderProjects();
    });
  }

  const btnSetupMain = document.getElementById('btn-setup-machine-main');
  if (btnSetupMain) {
    btnSetupMain.addEventListener('click', handleSetupMachine);
  }

  const btnProgressClose = document.getElementById('btn-progress-close');
  if (btnProgressClose) {
    btnProgressClose.addEventListener('click', () => {
      document.getElementById('modal-progress').classList.add('hidden');
      if (window.electronAPI) {
        window.electronAPI.openFolder('~/Documents/Projects/');
      }
    });
  }
});

function checkProjectLocalStatusAsync(projects = []) {
  if (!window.electronAPI || !window.electronAPI.checkLocalExist || isCheckingLocal) return;

  isCheckingLocal = true;
  const uncached = projects.filter((p) => p && p.name && !localClonedMap.has(p.name));

  if (uncached.length === 0) {
    isCheckingLocal = false;
    return;
  }

  Promise.all(
    uncached.map(async (proj) => {
      try {
        const exists = await window.electronAPI.checkLocalExist(proj.name);
        localClonedMap.set(proj.name, exists);
      } catch (e) {
        localClonedMap.set(proj.name, false);
      }
    })
  ).then(() => {
    isCheckingLocal = false;
    renderProjects(true); // Re-render badges silently once checked
  });
}

function renderProjects(skipLocalCheck = false) {
  const companyContainer = document.getElementById('company-projects-list');
  const personalContainer = document.getElementById('personal-projects-list');
  const companyPagContainer = document.getElementById('company-pagination');
  const personalPagContainer = document.getElementById('personal-pagination');

  if (!state || !state.workspace) return;

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

  // 1. Render Company Assigned Projects (Paginated)
  const totalCompanyPages = Math.ceil(assigned.length / ITEMS_PER_PAGE) || 1;
  companyPage = Math.min(companyPage, totalCompanyPages);
  const startCompany = (companyPage - 1) * ITEMS_PER_PAGE;
  const paginatedCompany = assigned.slice(startCompany, startCompany + ITEMS_PER_PAGE);

  if (assigned.length === 0) {
    companyContainer.innerHTML = `<div class="empty-state">${
      searchQuery
        ? `No company projects match "${escapeHtml(searchQuery)}".`
        : `No company projects assigned to @${state.user ? state.user.github_login : ''} yet.`
    }</div>`;
    companyPagContainer.innerHTML = '';
  } else {
    companyContainer.innerHTML = paginatedCompany
      .map((proj) => {
        const isEnabled = state.enabledSlugs ? state.enabledSlugs.has(proj.slug) : false;
        const isCloned = localClonedMap.get(proj.name);
        const localBadge = isCloned
          ? `<span class="badge-local" style="background-color: rgba(35, 134, 54, 0.2); color: #3fb950; border: 1px solid rgba(35, 134, 54, 0.4); font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 600; margin-left: 8px;">✅ Already Cloned</span>`
          : '';

        return `
        <div class="project-card">
          <div class="project-details">
            <h4>${escapeHtml(proj.name)} ${localBadge}</h4>
            <p>${escapeHtml(proj.description || 'No description')} • <span class="team-tag">${escapeHtml(proj.team || 'General')}</span></p>
          </div>
          <label class="switch">
            <input type="checkbox" data-type="company" data-slug="${proj.slug}" ${isEnabled ? 'checked' : ''} onchange="handleToggleChange(this)">
            <span class="slider"></span>
          </label>
        </div>
      `;
      })
      .join('');

    renderPaginationControls(companyPagContainer, companyPage, totalCompanyPages, (newPage) => {
      companyPage = newPage;
      renderProjects(true);
    });
  }

  // 2. Render Personal Projects (Paginated)
  const totalPersonalPages = Math.ceil(personal.length / ITEMS_PER_PAGE) || 1;
  personalPage = Math.min(personalPage, totalPersonalPages);
  const startPersonal = (personalPage - 1) * ITEMS_PER_PAGE;
  const paginatedPersonal = personal.slice(startPersonal, startPersonal + ITEMS_PER_PAGE);

  if (personal.length === 0) {
    personalContainer.innerHTML = `<div class="empty-state">${
      searchQuery
        ? `No personal projects match "${escapeHtml(searchQuery)}".`
        : 'No personal projects added.'
    }</div>`;
    personalPagContainer.innerHTML = '';
  } else {
    personalContainer.innerHTML = paginatedPersonal
      .map((proj) => {
        const slug = proj.slug || proj.name;
        const isEnabled = state.enabledPersonalSlugs ? state.enabledPersonalSlugs.has(slug) : false;
        const isCloned = localClonedMap.get(proj.name);
        const localBadge = isCloned
          ? `<span class="badge-local" style="background-color: rgba(35, 134, 54, 0.2); color: #3fb950; border: 1px solid rgba(35, 134, 54, 0.4); font-size: 11px; padding: 2px 8px; border-radius: 10px; font-weight: 600; margin-left: 8px;">✅ Already Cloned</span>`
          : '';

        return `
        <div class="project-card">
          <div class="project-details">
            <h4>${escapeHtml(proj.name)} ${localBadge}</h4>
            <p>Personal Project • ${escapeHtml(proj.repo_url)}</p>
          </div>
          <div style="display:flex; align-items:center; gap:12px">
            <button class="btn-secondary" onclick="openShareModal('${slug}', '${proj.repo_url}')">👥 Share</button>
            <label class="switch">
              <input type="checkbox" data-type="personal" data-slug="${slug}" ${isEnabled ? 'checked' : ''} onchange="handleToggleChange(this)">
              <span class="slider"></span>
            </label>
          </div>
        </div>
      `;
      })
      .join('');

    renderPaginationControls(personalPagContainer, personalPage, totalPersonalPages, (newPage) => {
      personalPage = newPage;
      renderProjects(true);
    });
  }

  // Trigger non-blocking async disk checks
  if (!skipLocalCheck) {
    checkProjectLocalStatusAsync([...assigned, ...personal]);
  }
}

function renderPaginationControls(container, currentPage, totalPages, onPageChange) {
  if (totalPages <= 1) {
    container.innerHTML = '';
    return;
  }

  container.innerHTML = `
    <button class="btn-secondary" ${currentPage === 1 ? 'disabled style="opacity:0.4; cursor:not-allowed"' : ''} id="btn-prev-${container.id}">◀ Previous</button>
    <span style="font-size: 13px; color: var(--text-muted);">Page ${currentPage} of ${totalPages}</span>
    <button class="btn-secondary" ${currentPage === totalPages ? 'disabled style="opacity:0.4; cursor:not-allowed"' : ''} id="btn-next-${container.id}">Next ▶</button>
  `;

  const btnPrev = document.getElementById(`btn-prev-${container.id}`);
  const btnNext = document.getElementById(`btn-next-${container.id}`);

  if (btnPrev && currentPage > 1) {
    btnPrev.onclick = () => onPageChange(currentPage - 1);
  }

  if (btnNext && currentPage < totalPages) {
    btnNext.onclick = () => onPageChange(currentPage + 1);
  }
}

async function handleToggleChange(checkbox) {
  const slug = checkbox.dataset.slug;
  const type = checkbox.dataset.type;

  if (type === 'personal') {
    if (!state.enabledPersonalSlugs) state.enabledPersonalSlugs = new Set();
    if (checkbox.checked) {
      state.enabledPersonalSlugs.add(slug);
    } else {
      state.enabledPersonalSlugs.delete(slug);
    }
  } else {
    if (!state.enabledSlugs) state.enabledSlugs = new Set();
    if (checkbox.checked) {
      state.enabledSlugs.add(slug);
    } else {
      state.enabledSlugs.delete(slug);
    }
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
  const assigned = state.workspace ? (state.workspace.assigned_projects || []) : [];
  const personal = state.workspace ? (state.workspace.personal_repos || []) : [];

  const selectedCompany = assigned.filter(
    (p) => state.enabledSlugs && state.enabledSlugs.has(p.slug)
  );

  const selectedPersonal = personal.filter(
    (p) => state.enabledPersonalSlugs && state.enabledPersonalSlugs.has(p.slug || p.name)
  );

  const allSelected = [...selectedCompany, ...selectedPersonal];

  if (allSelected.length === 0) {
    alert('Please toggle ON at least one project to set up your machine.');
    return;
  }

  // Open Progress Modal Overlay
  const modalProgress = document.getElementById('modal-progress');
  const progressBarFill = document.getElementById('progress-bar-fill');
  const progressStepText = document.getElementById('progress-step-text');
  const progressLogList = document.getElementById('progress-log-list');
  const btnProgressClose = document.getElementById('btn-progress-close');

  modalProgress.classList.remove('hidden');
  btnProgressClose.classList.add('hidden');
  progressBarFill.style.width = '5%';
  progressStepText.textContent = '⚡ Initializing setup engine...';
  progressLogList.innerHTML = '<div>> Target directory: Documents/Projects/</div>';

  if (window.electronAPI) {
    try {
      let completedCount = 0;

      for (let i = 0; i < allSelected.length; i++) {
        const proj = allSelected[i];
        const pct = Math.round(((i + 1) / allSelected.length) * 90);
        progressBarFill.style.width = `${pct}%`;

        progressStepText.textContent = `📦 Processing (${i + 1}/${allSelected.length}): ${proj.name}...`;

        // Execute Git operation (clones if new, pulls if already exists in Documents/Projects/)
        const result = await window.electronAPI.cloneProject(proj.repo_url, proj.name);
        completedCount++;

        const resItem = result && result[0] ? result[0] : { status: 'done' };
        const isUpdate = resItem.status === 'pulled';
        const isError = resItem.status === 'error';

        const statusIcon = isError ? '❌' : isUpdate ? '🔄' : '✅';
        const statusMsg = isError
          ? `Error: ${resItem.error}`
          : isUpdate
          ? `Already cloned — updated in Documents/Projects/${proj.name}`
          : `Initialized in Documents/Projects/${proj.name}`;

        localClonedMap.set(proj.name, true);
        progressLogList.innerHTML += `<div style="color:${isError ? '#f87171' : isUpdate ? '#60a5fa' : '#4ade80'}">${statusIcon} ${proj.name}: ${statusMsg}</div>`;
        progressLogList.scrollTop = progressLogList.scrollHeight;
      }

      // Provision ~/.gemini/config/
      progressBarFill.style.width = '100%';
      progressStepText.textContent = '✅ Provisioning ~/.gemini/config/ rules & manifests...';
      await window.electronAPI.setupMachine(allSelected, state.workspace);

      progressStepText.textContent = '🎉 All selected projects set up successfully!';
      progressLogList.innerHTML += `<div style="color:#4ade80; font-weight:bold; margin-top:8px">> Setup complete! ${completedCount} project(s) ready in Documents/Projects/</div>`;
      btnProgressClose.classList.remove('hidden');

      // Re-render UI to update local badges
      renderProjects(true);
    } catch (err) {
      console.error('Setup machine error:', err);
      progressStepText.textContent = '❌ Setup encountered an error.';
      progressLogList.innerHTML += `<div style="color:#f87171">> Error: ${err.message}</div>`;
      btnProgressClose.classList.remove('hidden');
    }
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
